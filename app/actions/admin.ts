'use server'

import { createAdminClient } from '@/lib/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { isAdmin } from '@/lib/utils/admin'
import { OPTION_LABELS, type QuestionType } from '@/lib/admin-dashboard'
import { ExcelQuestionsSchema, QuestionFormSchema, VoucherFormSchema, TryoutEventFormSchema, TryoutEventCodeSchema } from '@/lib/validations/admin'
import { validateCsrf } from '@/lib/csrf'
import { logger } from '@/lib/logger'

interface TryoutConfigurationPayload {
    id: string
    type: string
    sub_category: string
    question_count: number
    sort_order: number
    is_active: boolean
}

interface QuestionFormPayload {
    type: QuestionType
    content: string
    category: string
    explanation: string
    correctAnswer: string
    imageUrl: string | null
}

function readQuestionFormPayload(formData: FormData): QuestionFormPayload {
    return {
        type: formData.get('type') as QuestionType,
        content: String(formData.get('content') || '').trim(),
        category: String(formData.get('category') || '').trim(),
        explanation: String(formData.get('explanation') || '').trim(),
        correctAnswer: String(formData.get('correct_answer') || '').trim(),
        imageUrl: String(formData.get('image_url') || '').trim() || null,
    }
}

function buildOptionRows(questionId: string, formData: FormData, type: QuestionType, correctAnswer: string) {
    return OPTION_LABELS.map((label) => {
        const content = String(formData.get(`option_${label.toLowerCase()}`) || '').trim()
        const imageUrl = String(formData.get(`option_${label.toLowerCase()}_image_url`) || '').trim() || null
        const score = Number(formData.get(`score_${label.toLowerCase()}`) || 0)

        if (!content && !imageUrl) {
            throw new Error(`Pilihan ${label} harus punya teks atau gambar`)
        }

        if (type === 'TKP' && (!Number.isInteger(score) || score < 1 || score > 5)) {
            throw new Error(`Poin pilihan ${label} harus 1 sampai 5`)
        }

        return {
            question_id: questionId,
            content,
            image_url: imageUrl,
            is_correct: label === correctAnswer,
            score_value: type === 'TKP' ? score : (label === correctAnswer ? 1 : 0),
        }
    })
}

export async function deleteQuestion(id: string) {
    try { await validateCsrf() } catch { return { success: false, message: 'Invalid request' } }

    const isUserAdmin = await isAdmin()
    if (!isUserAdmin) {
        return { success: false, message: 'Unauthorized' }
    }

    // Use admin client to bypass RLS for cleanup
    const supabase = await createAdminClient()

    // 1. Delete associations first to avoid FK violations
    // we use individual checks to ensure each step succeeds or logs correctly
    const { error: err1 } = await supabase.from('test_answers').delete().eq('question_id', id)
    if (err1 && err1.code !== 'PGRST116') { // Ignore "no rows found" if any
        logger.warn('Error deleting test_answers', { error: err1 })
    }
    
    const { error: err2 } = await supabase.from('options').delete().eq('question_id', id)
    if (err2 && err2.code !== 'PGRST116') {
        logger.warn('Error deleting options', { error: err2 })
    }
    
    // 2. Finally delete the question
    const { error: qErr } = await supabase
        .from('questions')
        .delete()
        .eq('id', id)

    if (qErr) {
        logger.warn('Final delete error', { error: qErr })
        return { success: false, message: `Gagal menghapus soal: ${qErr.message}` }
    }

    revalidatePath('/cpns/admin')
    return { success: true, message: 'Soal berhasil dihapus' }
}

export async function createQuestion(formData: FormData) {
    try { await validateCsrf() } catch { return { success: false, message: 'Invalid request' } }

    const isUserAdmin = await isAdmin()
    if (!isUserAdmin) {
        return { success: false, message: 'Unauthorized' }
    }

    const rawPayload = readQuestionFormPayload(formData)
    const parsed = QuestionFormSchema.safeParse(rawPayload)
    if (!parsed.success) {
        return { success: false, message: parsed.error.issues[0].message }
    }
    const payload = parsed.data

    const supabase = await createAdminClient()

    // 1. Insert Question
    const { data: question, error: qError } = await supabase
        .from('questions')
        .insert({
            type: payload.type,
            content: payload.content,
            category: payload.category,
            sub_category: payload.category,
            explanation: payload.explanation,
            image_url: payload.imageUrl
        })
        .select()
        .single()

    if (qError) return { success: false, message: qError.message }

    let optionsToInsert
    try {
        optionsToInsert = buildOptionRows(question.id, formData, payload.type, payload.correctAnswer)
    } catch (error) {
        await supabase.from('questions').delete().eq('id', question.id)
        return { success: false, message: error instanceof Error ? error.message : 'Pilihan jawaban tidak valid' }
    }

    // 3. Insert Options
    const { error: oError } = await supabase
        .from('options')
        .insert(optionsToInsert)

    if (oError) {
        // Cleanup question if options fail?
        await supabase.from('questions').delete().eq('id', question.id)
        return { success: false, message: oError.message }
    }

    revalidatePath('/cpns/admin')
    return { success: true, message: 'Soal baru berhasil dibuat' }
}

export async function updateQuestion(id: string, formData: FormData) {
    try { await validateCsrf() } catch { return { success: false, message: 'Invalid request' } }

    const isUserAdmin = await isAdmin()
    if (!isUserAdmin) {
        return { success: false, message: 'Unauthorized' }
    }

    const rawPayload = readQuestionFormPayload(formData)
    const parsed = QuestionFormSchema.safeParse(rawPayload)
    if (!parsed.success) {
        return { success: false, message: parsed.error.issues[0].message }
    }
    const payload = parsed.data

    let optionsToInsert
    try {
        optionsToInsert = buildOptionRows(id, formData, payload.type, payload.correctAnswer)
    } catch (error) {
        return { success: false, message: error instanceof Error ? error.message : 'Pilihan jawaban tidak valid' }
    }

    const supabase = await createAdminClient()

    const { error: qError } = await supabase
        .from('questions')
        .update({
            type: payload.type,
            content: payload.content,
            category: payload.category,
            sub_category: payload.category,
            explanation: payload.explanation,
            image_url: payload.imageUrl
        })
        .eq('id', id)

    if (qError) return { success: false, message: qError.message }

    // 2. Get existing option IDs for this question (to clean up test_answers references)
    const { data: existingOptions } = await supabase
        .from('options')
        .select('id')
        .eq('question_id', id)

    // 3. Nullify test_answers referencing old options (prevents FK violation)
    if (existingOptions && existingOptions.length > 0) {
        const optionIds = existingOptions.map(o => o.id)
        await supabase
            .from('test_answers')
            .update({ option_id: null })
            .in('option_id', optionIds)
    }

    // 4. Delete Existing Options
    const { error: dError } = await supabase
        .from('options')
        .delete()
        .eq('question_id', id)

    if (dError) return { success: false, message: dError.message }

    const { error: oError } = await supabase
        .from('options')
        .insert(optionsToInsert)

    if (oError) return { success: false, message: oError.message }

    revalidatePath('/cpns/admin')
    return { success: true, message: 'Soal berhasil diupdate' }
}

// =============================================
// EXCEL BULK IMPORT
// =============================================

interface ExcelQuestion {
    type: 'TWK' | 'TIU' | 'TKP'
    sub_category: string
    content: string
    explanation: string
    image_url?: string // NEW FIELD
    option_a: string
    option_a_image_url?: string
    option_b: string
    option_b_image_url?: string
    option_c: string
    option_c_image_url?: string
    option_d: string
    option_d_image_url?: string
    option_e: string
    option_e_image_url?: string
    correct_answer?: string  // A/B/C/D/E for TWK & TIU
    score_a?: number  // For TKP (1-5)
    score_b?: number
    score_c?: number
    score_d?: number
    score_e?: number
}

export async function importQuestionsFromExcel(questions: ExcelQuestion[]) {
    try { await validateCsrf() } catch { return { success: false, message: 'Invalid request' } }

    const isUserAdmin = await isAdmin()
    if (!isUserAdmin) {
        return { success: false, message: 'Unauthorized' }
    }

    if (!questions || questions.length === 0) {
        return { success: false, message: 'Tidak ada data soal untuk diimport' }
    }

    const parsed = ExcelQuestionsSchema.safeParse(questions)
    if (!parsed.success) {
        const firstIssue = parsed.error.issues[0]
        const row = typeof firstIssue.path[0] === 'number' ? Number(firstIssue.path[0]) + 1 : null
        return {
            success: false,
            message: row ? `Baris ${row}: ${firstIssue.message}` : firstIssue.message,
        }
    }

    const supabase = await createAdminClient()
    const validatedQuestions = parsed.data
    let successCount = 0
    let failCount = 0
    const failedRows: number[] = []

    // Process in batches of 50 to avoid overwhelming the DB
    const BATCH_SIZE = 50
    for (let i = 0; i < validatedQuestions.length; i += BATCH_SIZE) {
        const batch = validatedQuestions.slice(i, i + BATCH_SIZE)

        for (let j = 0; j < batch.length; j++) {
            const q = batch[j]
            const rowIndex = i + j + 1

            try {
                // 1. Insert Question
                const { data: question, error: qError } = await supabase
                    .from('questions')
                    .insert({
                        type: q.type,
                        content: q.content,
                        category: q.sub_category,
                        sub_category: q.sub_category,
                        explanation: q.explanation || null,
                        image_url: q.image_url || null, // NEW FIELD
                    })
                    .select('id')
                    .single()

                if (qError || !question) {
                    failCount++
                    failedRows.push(rowIndex)
                    continue
                }

                // 2. Build Options
                const optionLabels = ['a', 'b', 'c', 'd', 'e'] as const
                const optionKeys = ['option_a', 'option_b', 'option_c', 'option_d', 'option_e'] as const
                const optionImageKeys = [
                    'option_a_image_url',
                    'option_b_image_url',
                    'option_c_image_url',
                    'option_d_image_url',
                    'option_e_image_url',
                ] as const
                const scoreKeys = ['score_a', 'score_b', 'score_c', 'score_d', 'score_e'] as const

                const optionsToInsert = optionLabels.map((label, idx) => {
                    const letterUpper = label.toUpperCase()
                    const isTKP = q.type === 'TKP'
                    const optionContent = q[optionKeys[idx]] || ''
                    const optionImageUrl = q[optionImageKeys[idx]] || ''

                    if (!optionContent.trim() && !optionImageUrl.trim()) {
                        throw new Error(`Pilihan ${letterUpper} kosong`)
                    }

                    return {
                        question_id: question.id,
                        content: optionContent,
                        image_url: optionImageUrl || null,
                        is_correct: isTKP ? letterUpper === q.correct_answer : letterUpper === q.correct_answer,
                        score_value: isTKP ? (q[scoreKeys[idx]] || 0) : (letterUpper === q.correct_answer ? 5 : 0),
                    }
                })

                // 3. Insert Options
                const { error: oError } = await supabase
                    .from('options')
                    .insert(optionsToInsert)

                if (oError) {
                    // Cleanup the question if options fail
                    await supabase.from('questions').delete().eq('id', question.id)
                    failCount++
                    failedRows.push(rowIndex)
                    continue
                }

                successCount++
            } catch {
                failCount++
                failedRows.push(rowIndex)
            }
        }
    }

    revalidatePath('/cpns/admin')

    if (failCount === 0) {
        return {
            success: true,
            message: `Berhasil import ${successCount} soal`
        }
    }

    return {
        success: successCount > 0,
        message: `Import selesai: ${successCount} berhasil, ${failCount} gagal (baris: ${failedRows.slice(0, 10).join(', ')}${failedRows.length > 10 ? '...' : ''})`
    }
}

// =============================================
// TRYOUT CONFIGURATIONS
// =============================================

export async function updateTryoutConfigurations(configs: TryoutConfigurationPayload[]) {
    try { await validateCsrf() } catch { return { success: false, message: 'Invalid request' } }

    const isUserAdmin = await isAdmin()
    if (!isUserAdmin) return { success: false, message: 'Unauthorized' }

    const supabase = await createAdminClient()

    const { error } = await supabase
        .from('tryout_configurations')
        .upsert(configs, { onConflict: 'id' })

    if (error) {
        return { success: false, message: error.message }
    }

    revalidatePath('/cpns/admin/tryout-config')
    revalidatePath('/cpns/admin')
    return { success: true, message: 'Konfigurasi Tryout berhasil disimpan' }
}

export async function addTryoutConfiguration(type: string, sub_category: string) {
    try { await validateCsrf() } catch { return { success: false, message: 'Invalid request' } }

    const isUserAdmin = await isAdmin()
    if (!isUserAdmin) return { success: false, message: 'Unauthorized' }

    const supabase = await createAdminClient()

    const { data: maxOrderData } = await supabase
        .from('tryout_configurations')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1)

    const nextSortOrder = (maxOrderData && maxOrderData.length > 0) ? (maxOrderData[0].sort_order + 1) : 1

    const { error } = await supabase
        .from('tryout_configurations')
        .insert({
            type,
            sub_category,
            question_count: 0,
            sort_order: nextSortOrder,
            is_active: true
        })

    if (error) {
        return { success: false, message: error.message }
    }

    revalidatePath('/cpns/admin/tryout-config')
    revalidatePath('/cpns/admin')
    return { success: true, message: 'Sub-Kategori berhasil ditambahkan' }
}

export async function seedDefaultSkdTryoutConfigurations() {
    try { await validateCsrf() } catch { return { success: false, message: 'Invalid request' } }

    const isUserAdmin = await isAdmin()
    if (!isUserAdmin) return { success: false, message: 'Unauthorized' }

    const supabase = await createAdminClient()
    const defaults = [
        ['TWK', 'Nasionalisme', 6],
        ['TWK', 'Integritas', 6],
        ['TWK', 'Bela Negara', 6],
        ['TWK', 'Pilar Negara', 6],
        ['TWK', 'Bahasa Negara', 6],
        ['TIU', 'Analogi', 3],
        ['TIU', 'Silogisme', 3],
        ['TIU', 'Analitis', 4],
        ['TIU', 'Berhitung', 5],
        ['TIU', 'Deret Angka', 5],
        ['TIU', 'Perbandingan Kuantitatif', 5],
        ['TIU', 'Soal Cerita', 5],
        ['TIU', 'Analogi Figural', 2],
        ['TIU', 'Ketidaksamaan', 1],
        ['TIU', 'Serial', 2],
        ['TKP', 'Pelayanan Publik', 8],
        ['TKP', 'Jejaring Kerja', 8],
        ['TKP', 'Sosial Budaya', 7],
        ['TKP', 'Teknologi Informasi dan Komunikasi', 7],
        ['TKP', 'Profesionalisme', 7],
        ['TKP', 'Anti-Radikalisme', 8],
    ] as const

    const rows = defaults.map(([type, subCategory, questionCount], index) => ({
        type,
        sub_category: subCategory,
        question_count: questionCount,
        sort_order: index + 1,
        is_active: true,
    }))

    const { error } = await supabase
        .from('tryout_configurations')
        .upsert(rows, { onConflict: 'type,sub_category' })

    if (error) {
        return { success: false, message: error.message }
    }

    revalidatePath('/cpns/admin/tryout-config')
    revalidatePath('/cpns/admin')
    return { success: true, message: 'Struktur default SKD berhasil diterapkan' }
}

export async function toggleTryoutConfiguration(id: string, is_active: boolean) {
    try { await validateCsrf() } catch { return { success: false, message: 'Invalid request' } }

    const isUserAdmin = await isAdmin()
    if (!isUserAdmin) return { success: false, message: 'Unauthorized' }

    const supabase = await createAdminClient()

    const { error } = await supabase
        .from('tryout_configurations')
        .update({ is_active })
        .eq('id', id)

    if (error) {
        return { success: false, message: error.message }
    }

    revalidatePath('/cpns/admin/tryout-config')
    revalidatePath('/cpns/admin')
    return { success: true, message: `Sub-Kategori berhasil di${is_active ? 'aktifkan' : 'nonaktifkan'}` }
}

export async function deleteTryoutConfiguration(id: string) {
    try { await validateCsrf() } catch { return { success: false, message: 'Invalid request' } }

    const isUserAdmin = await isAdmin()
    if (!isUserAdmin) return { success: false, message: 'Unauthorized' }

    const supabase = await createAdminClient()

    const { error } = await supabase
        .from('tryout_configurations')
        .delete()
        .eq('id', id)

    if (error) {
        return { success: false, message: error.message }
    }

    revalidatePath('/cpns/admin/tryout-config')
    revalidatePath('/cpns/admin')
    return { success: true, message: 'Kategori berhasil dihapus secara permanen' }
}

export async function deleteTryoutConfigurationsBulk(ids: string[]) {
    try { await validateCsrf() } catch { return { success: false, message: 'Invalid request' } }

    const isUserAdmin = await isAdmin()
    if (!isUserAdmin) return { success: false, message: 'Unauthorized' }

    const uniqueIds = Array.from(new Set(ids.filter(Boolean)))
    if (uniqueIds.length === 0) {
        return { success: false, message: 'Pilih minimal satu kategori' }
    }

    const supabase = await createAdminClient()

    const { error } = await supabase
        .from('tryout_configurations')
        .delete()
        .in('id', uniqueIds)

    if (error) {
        return { success: false, message: error.message }
    }

    revalidatePath('/cpns/admin/tryout-config')
    revalidatePath('/cpns/admin')
    return { success: true, message: `${uniqueIds.length} kategori berhasil dihapus` }
}

// =============================================
// VOUCHERS
// =============================================

export async function createVoucher(formData: FormData) {
    try { await validateCsrf() } catch { return { success: false, message: 'Invalid request' } }

    const isUserAdmin = await isAdmin()
    if (!isUserAdmin) return { success: false, message: 'Unauthorized' }

    const rawData = {
        code: String(formData.get('code') || '').trim(),
        quota_amount: Number(formData.get('quota_amount') || 0),
        max_uses: Number(formData.get('max_uses') || 0),
        expires_at: String(formData.get('expires_at') || '').trim() || null,
        is_active: formData.get('is_active') === 'on',
    }

    const parsed = VoucherFormSchema.safeParse(rawData)
    if (!parsed.success) {
        return { success: false, message: parsed.error.issues[0].message }
    }
    const data = parsed.data

    const supabase = await createAdminClient()
    const { error } = await supabase
        .from('vouchers')
        .insert({
            code: data.code,
            quota_amount: data.quota_amount,
            max_uses: data.max_uses,
            expires_at: data.expires_at ? new Date(data.expires_at).toISOString() : null,
            is_active: data.is_active,
        })

    if (error) return { success: false, message: error.message }

    revalidatePath('/cpns/admin/voucher')
    return { success: true, message: 'Voucher berhasil dibuat' }
}

export async function toggleVoucher(id: string, isActive: boolean) {
    try { await validateCsrf() } catch { return { success: false, message: 'Invalid request' } }

    const isUserAdmin = await isAdmin()
    if (!isUserAdmin) return { success: false, message: 'Unauthorized' }

    const supabase = await createAdminClient()
    const { error } = await supabase
        .from('vouchers')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', id)

    if (error) return { success: false, message: error.message }

    revalidatePath('/cpns/admin/voucher')
    return { success: true, message: `Voucher berhasil di${isActive ? 'aktifkan' : 'nonaktifkan'}` }
}

export async function updateVoucher(id: string, formData: FormData) {
    try { await validateCsrf() } catch { return { success: false, message: 'Invalid request' } }

    const isUserAdmin = await isAdmin()
    if (!isUserAdmin) return { success: false, message: 'Unauthorized' }

    const rawData = {
        code: String(formData.get('code') || '').trim(),
        quota_amount: Number(formData.get('quota_amount') || 0),
        max_uses: Number(formData.get('max_uses') || 0),
        expires_at: String(formData.get('expires_at') || '').trim() || null,
        is_active: formData.get('is_active') === 'on',
    }

    if (!id) return { success: false, message: 'Voucher tidak valid' }

    const parsed = VoucherFormSchema.safeParse(rawData)
    if (!parsed.success) {
        return { success: false, message: parsed.error.issues[0].message }
    }
    const data = parsed.data

    const supabase = await createAdminClient()
    const { data: voucher } = await supabase
        .from('vouchers')
        .select('used_count')
        .eq('id', id)
        .single()

    if (voucher && data.max_uses < voucher.used_count) {
        return { success: false, message: `Max penggunaan tidak boleh kurang dari klaim saat ini (${voucher.used_count})` }
    }

    const { error } = await supabase
        .from('vouchers')
        .update({
            code: data.code,
            quota_amount: data.quota_amount,
            max_uses: data.max_uses,
            expires_at: data.expires_at ? new Date(data.expires_at).toISOString() : null,
            is_active: data.is_active,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)

    if (error) return { success: false, message: error.message }

    revalidatePath('/cpns/admin/voucher')
    return { success: true, message: 'Voucher berhasil diupdate' }
}

export async function deleteVoucher(id: string) {
    try { await validateCsrf() } catch { return { success: false, message: 'Invalid request' } }

    const isUserAdmin = await isAdmin()
    if (!isUserAdmin) return { success: false, message: 'Unauthorized' }
    if (!id) return { success: false, message: 'Voucher tidak valid' }

    const supabase = await createAdminClient()
    const { data: voucher, error: readError } = await supabase
        .from('vouchers')
        .select('used_count')
        .eq('id', id)
        .single()

    if (readError) return { success: false, message: readError.message }

    if ((voucher?.used_count || 0) > 0) {
        return {
            success: false,
            message: 'Voucher yang sudah pernah diklaim tidak bisa dihapus. Nonaktifkan voucher agar riwayat klaim tetap aman.',
        }
    }

    const { error } = await supabase
        .from('vouchers')
        .delete()
        .eq('id', id)

    if (error) return { success: false, message: error.message }

    revalidatePath('/cpns/admin/voucher')
    return { success: true, message: 'Voucher berhasil dihapus' }
}

// =============================================
// TRYOUT AKBAR EVENTS
// =============================================

function parseWibDateTime(value: string) {
    return value ? new Date(`${value}:00+07:00`) : null
}

function readTryoutEventForm(formData: FormData) {
    const title = String(formData.get('title') || '').trim()
    const description = String(formData.get('description') || '').trim()
    const startsAt = String(formData.get('starts_at') || '').trim()
    const endsAt = String(formData.get('ends_at') || '').trim()
    const startGraceMinutes = Number(formData.get('start_grace_minutes') || 15)
    const durationMinutes = Number(formData.get('duration_minutes') || 100)
    const maxParticipantsRaw = String(formData.get('max_participants') || '').trim()
    const requiresCode = formData.get('requires_code') === 'on'
    const isPaid = formData.get('is_paid') === 'on' || formData.get('is_paid') === 'true'
    const priceRaw = String(formData.get('price') || '0').trim()
    const price = isPaid ? Math.max(0, Number(priceRaw) || 0) : 0
    const groupLink = String(formData.get('group_link') || '').trim()
    const normalizedDurationMinutes = Number.isInteger(durationMinutes) && durationMinutes > 0 ? durationMinutes : 100
    const normalizedStartGraceMinutes = Number.isInteger(startGraceMinutes) && startGraceMinutes >= 0 ? startGraceMinutes : 15
    const startsAtDate = parseWibDateTime(startsAt)
    const synchronizedCloseAt = startsAtDate && !Number.isNaN(startsAtDate.getTime())
        ? new Date(startsAtDate.getTime() + (normalizedDurationMinutes + normalizedStartGraceMinutes) * 60 * 1000).toISOString()
        : ''

    return {
        title,
        description: description || null,
        starts_at: startsAtDate ? startsAtDate.toISOString() : '',
        ends_at: synchronizedCloseAt || (endsAt ? new Date(endsAt).toISOString() : ''),
        start_grace_minutes: normalizedStartGraceMinutes,
        duration_minutes: normalizedDurationMinutes,
        max_participants: maxParticipantsRaw ? Number(maxParticipantsRaw) : null,
        requires_code: requiresCode,
        is_paid: isPaid,
        price,
        group_link: groupLink || null,
        result_visible_at: synchronizedCloseAt || null,
        explanation_visible_at: synchronizedCloseAt || null,
    }
}

// Validation is handled by TryoutEventFormSchema

export async function createTryoutEvent(formData: FormData) {
    try { await validateCsrf() } catch { return { success: false, message: 'Invalid request' } }

    const isUserAdmin = await isAdmin()
    if (!isUserAdmin) return { success: false, message: 'Unauthorized' }

    const rawPayload = readTryoutEventForm(formData)
    const parsed = TryoutEventFormSchema.safeParse(rawPayload)
    if (!parsed.success) return { success: false, message: parsed.error.issues[0].message }
    const payload = parsed.data

    const supabase = await createAdminClient()
    const { error } = await supabase
        .from('tryout_events')
        .insert({ ...payload, status: 'draft' })

    if (error) return { success: false, message: error.message }

    revalidatePath('/cpns/admin/event')
    return { success: true, message: 'Event Tryout Akbar berhasil dibuat' }
}

export async function updateTryoutEvent(id: string, formData: FormData) {
    try { await validateCsrf() } catch { return { success: false, message: 'Invalid request' } }

    const isUserAdmin = await isAdmin()
    if (!isUserAdmin) return { success: false, message: 'Unauthorized' }

    const rawPayload = readTryoutEventForm(formData)
    const parsed = TryoutEventFormSchema.safeParse(rawPayload)
    if (!parsed.success) return { success: false, message: parsed.error.issues[0].message }
    const payload = parsed.data

    const supabase = await createAdminClient()
    const { error } = await supabase
        .from('tryout_events')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', id)

    if (error) return { success: false, message: error.message }

    revalidatePath('/cpns/admin/event')
    return { success: true, message: 'Event Tryout Akbar berhasil diupdate' }
}

export async function updateTryoutEventStatus(id: string, status: 'draft' | 'scheduled' | 'live' | 'closed' | 'cancelled') {
    try { await validateCsrf() } catch { return { success: false, message: 'Invalid request' } }

    const isUserAdmin = await isAdmin()
    if (!isUserAdmin) return { success: false, message: 'Unauthorized' }

    const supabase = await createAdminClient()
    const { error } = await supabase
        .from('tryout_events')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)

    if (error) return { success: false, message: error.message }

    revalidatePath('/cpns/admin/event')
    return { success: true, message: `Status event berhasil diubah ke ${status}` }
}

export async function generateTryoutEventQuestions(id: string) {
    try { await validateCsrf() } catch { return { success: false, message: 'Invalid request' } }

    const isUserAdmin = await isAdmin()
    if (!isUserAdmin) return { success: false, message: 'Unauthorized' }

    const supabase = await createAdminClient()
    const { data, error } = await supabase.rpc('generate_tryout_event_questions', {
        p_event_id: id,
    })

    if (error) return { success: false, message: error.message }

    revalidatePath('/cpns/admin/event')
    return { success: true, message: `Paket soal event berhasil digenerate (${data || 0} soal)` }
}

export async function deleteTryoutEvent(id: string) {
    try { await validateCsrf() } catch { return { success: false, message: 'Invalid request' } }

    const isUserAdmin = await isAdmin()
    if (!isUserAdmin) return { success: false, message: 'Unauthorized' }

    const supabase = await createAdminClient()
    const { data: eventSessions, error: sessionReadError } = await supabase
        .from('tryout_event_sessions')
        .select('session_id')
        .eq('event_id', id)

    if (sessionReadError) return { success: false, message: sessionReadError.message }

    const sessionIds = (eventSessions || [])
        .map((session) => session.session_id)
        .filter(Boolean)

    if (sessionIds.length > 0) {
        const { error: sessionDeleteError } = await supabase
            .from('test_sessions')
            .delete()
            .in('id', sessionIds)

        if (sessionDeleteError) return { success: false, message: sessionDeleteError.message }
    }

    const { error } = await supabase
        .from('tryout_events')
        .delete()
        .eq('id', id)

    if (error) return { success: false, message: error.message }

    revalidatePath('/cpns/admin/event')
    revalidatePath('/cpns/dashboard/event')
    revalidatePath('/cpns/dashboard/riwayat')
    revalidatePath('/cpns/dashboard/ranking')
    return { success: true, message: 'Event Tryout Akbar berhasil dihapus' }
}

export async function createTryoutEventCode(eventId: string, formData: FormData) {
    try { await validateCsrf() } catch { return { success: false, message: 'Invalid request' } }

    const isUserAdmin = await isAdmin()
    if (!isUserAdmin) return { success: false, message: 'Unauthorized' }

    if (!eventId) return { success: false, message: 'Event tidak valid' }

    const rawData = {
        code: String(formData.get('code') || '').trim().toUpperCase(),
        max_uses: Number(formData.get('max_uses') || 1),
        expires_at: String(formData.get('expires_at') || '').trim() || null,
    }

    const parsed = TryoutEventCodeSchema.safeParse(rawData)
    if (!parsed.success) return { success: false, message: parsed.error.issues[0].message }
    const data = parsed.data

    const supabase = await createAdminClient()
    const { error } = await supabase
        .from('tryout_event_codes')
        .insert({
            event_id: eventId,
            code: data.code,
            max_uses: data.max_uses,
            expires_at: data.expires_at ? new Date(data.expires_at).toISOString() : null,
        })

    if (error) return { success: false, message: error.message }

    revalidatePath('/cpns/admin/event')
    return { success: true, message: 'Kode masuk event berhasil dibuat' }
}

export async function toggleTryoutEventCode(id: string, isActive: boolean) {
    try { await validateCsrf() } catch { return { success: false, message: 'Invalid request' } }

    const isUserAdmin = await isAdmin()
    if (!isUserAdmin) return { success: false, message: 'Unauthorized' }

    const supabase = await createAdminClient()
    const { error } = await supabase
        .from('tryout_event_codes')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', id)

    if (error) return { success: false, message: error.message }

    revalidatePath('/cpns/admin/event')
    return { success: true, message: isActive ? 'Kode masuk diaktifkan' : 'Kode masuk dinonaktifkan' }
}

export async function deleteTryoutEventCode(id: string) {
    try { await validateCsrf() } catch { return { success: false, message: 'Invalid request' } }

    const isUserAdmin = await isAdmin()
    if (!isUserAdmin) return { success: false, message: 'Unauthorized' }

    const supabase = await createAdminClient()
    const { data: code, error: readError } = await supabase
        .from('tryout_event_codes')
        .select('used_count')
        .eq('id', id)
        .single()

    if (readError) return { success: false, message: readError.message }
    if ((code?.used_count || 0) > 0) {
        return { success: false, message: 'Kode yang sudah dipakai peserta tidak bisa dihapus. Nonaktifkan kode agar riwayat tetap aman.' }
    }

    const { error } = await supabase
        .from('tryout_event_codes')
        .delete()
        .eq('id', id)

    if (error) return { success: false, message: error.message }

    revalidatePath('/cpns/admin/event')
    return { success: true, message: 'Kode masuk event berhasil dihapus' }
}
