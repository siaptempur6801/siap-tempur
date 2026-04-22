'use server'

import { createAdminClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { isAdmin } from '@/utils/admin'
import { OPTION_LABELS, type OptionLabel, type QuestionType } from '@/lib/admin-dashboard'

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

function validateQuestionFormPayload(payload: QuestionFormPayload) {
    if (!payload.content) return 'Pertanyaan wajib diisi'
    if (!payload.category) return 'Materi wajib dipilih'
    if (!payload.explanation) return 'Pembahasan wajib diisi'
    if (!OPTION_LABELS.includes(payload.correctAnswer as OptionLabel)) return 'Kunci jawaban tidak valid'

    return null
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
        console.error('Error deleting test_answers:', err1)
    }
    
    const { error: err2 } = await supabase.from('options').delete().eq('question_id', id)
    if (err2 && err2.code !== 'PGRST116') {
        console.error('Error deleting options:', err2)
    }
    
    // 2. Finally delete the question
    const { error: qErr } = await supabase
        .from('questions')
        .delete()
        .eq('id', id)

    if (qErr) {
        console.error('Final delete error:', qErr)
        return { success: false, message: `Gagal menghapus soal: ${qErr.message}` }
    }

    revalidatePath('/cpns/admin')
    return { success: true, message: 'Soal berhasil dihapus' }
}

export async function createQuestion(formData: FormData) {
    const isUserAdmin = await isAdmin()
    if (!isUserAdmin) {
        return { success: false, message: 'Unauthorized' }
    }

    const payload = readQuestionFormPayload(formData)
    const validationError = validateQuestionFormPayload(payload)
    if (validationError) {
        return { success: false, message: validationError }
    }

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
    const isUserAdmin = await isAdmin()
    if (!isUserAdmin) {
        return { success: false, message: 'Unauthorized' }
    }

    const payload = readQuestionFormPayload(formData)
    const validationError = validateQuestionFormPayload(payload)
    if (validationError) {
        return { success: false, message: validationError }
    }

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
    const isUserAdmin = await isAdmin()
    if (!isUserAdmin) {
        return { success: false, message: 'Unauthorized' }
    }

    if (!questions || questions.length === 0) {
        return { success: false, message: 'Tidak ada data soal untuk diimport' }
    }

    const supabase = await createAdminClient()
    let successCount = 0
    let failCount = 0
    const failedRows: number[] = []

    // Process in batches of 50 to avoid overwhelming the DB
    const BATCH_SIZE = 50
    for (let i = 0; i < questions.length; i += BATCH_SIZE) {
        const batch = questions.slice(i, i + BATCH_SIZE)

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

export async function toggleTryoutConfiguration(id: string, is_active: boolean) {
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

// =============================================
// VOUCHERS
// =============================================

export async function createVoucher(formData: FormData) {
    const isUserAdmin = await isAdmin()
    if (!isUserAdmin) return { success: false, message: 'Unauthorized' }

    const code = String(formData.get('code') || '').trim().toUpperCase()
    const quotaAmount = Number(formData.get('quota_amount') || 0)
    const maxUses = Number(formData.get('max_uses') || 0)
    const expiresAt = String(formData.get('expires_at') || '').trim()
    const isActive = formData.get('is_active') === 'on'

    if (!code) return { success: false, message: 'Kode voucher wajib diisi' }
    if (!Number.isInteger(quotaAmount) || quotaAmount < 1) return { success: false, message: 'Jumlah token harus minimal 1' }
    if (!Number.isInteger(maxUses) || maxUses < 1) return { success: false, message: 'Maksimal penggunaan harus minimal 1' }

    const supabase = await createAdminClient()
    const { error } = await supabase
        .from('vouchers')
        .insert({
            code,
            quota_amount: quotaAmount,
            max_uses: maxUses,
            expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
            is_active: isActive,
        })

    if (error) return { success: false, message: error.message }

    revalidatePath('/cpns/admin/voucher')
    return { success: true, message: 'Voucher berhasil dibuat' }
}

export async function toggleVoucher(id: string, isActive: boolean) {
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
    const isUserAdmin = await isAdmin()
    if (!isUserAdmin) return { success: false, message: 'Unauthorized' }

    const code = String(formData.get('code') || '').trim().toUpperCase()
    const quotaAmount = Number(formData.get('quota_amount') || 0)
    const maxUses = Number(formData.get('max_uses') || 0)
    const expiresAt = String(formData.get('expires_at') || '').trim()
    const isActive = formData.get('is_active') === 'on'

    if (!id) return { success: false, message: 'Voucher tidak valid' }
    if (!code) return { success: false, message: 'Kode voucher wajib diisi' }
    if (!Number.isInteger(quotaAmount) || quotaAmount < 1) return { success: false, message: 'Jumlah token harus minimal 1' }
    if (!Number.isInteger(maxUses) || maxUses < 1) return { success: false, message: 'Maksimal penggunaan harus minimal 1' }

    const supabase = await createAdminClient()
    const { data: voucher } = await supabase
        .from('vouchers')
        .select('used_count')
        .eq('id', id)
        .single()

    if (voucher && maxUses < voucher.used_count) {
        return { success: false, message: `Max penggunaan tidak boleh kurang dari klaim saat ini (${voucher.used_count})` }
    }

    const { error } = await supabase
        .from('vouchers')
        .update({
            code,
            quota_amount: quotaAmount,
            max_uses: maxUses,
            expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
            is_active: isActive,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)

    if (error) return { success: false, message: error.message }

    revalidatePath('/cpns/admin/voucher')
    return { success: true, message: 'Voucher berhasil diupdate' }
}

export async function deleteVoucher(id: string) {
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

function readTryoutEventForm(formData: FormData) {
    const title = String(formData.get('title') || '').trim()
    const description = String(formData.get('description') || '').trim()
    const startsAt = String(formData.get('starts_at') || '').trim()
    const endsAt = String(formData.get('ends_at') || '').trim()
    const startGraceMinutes = Number(formData.get('start_grace_minutes') || 15)
    const durationMinutes = Number(formData.get('duration_minutes') || 100)
    const maxParticipantsRaw = String(formData.get('max_participants') || '').trim()
    const resultVisibleAt = String(formData.get('result_visible_at') || '').trim()
    const explanationVisibleAt = String(formData.get('explanation_visible_at') || '').trim()
    const requiresCode = formData.get('requires_code') === 'on'

    return {
        title,
        description: description || null,
        starts_at: startsAt ? new Date(startsAt).toISOString() : '',
        ends_at: endsAt ? new Date(endsAt).toISOString() : '',
        start_grace_minutes: Number.isInteger(startGraceMinutes) ? startGraceMinutes : 15,
        duration_minutes: Number.isInteger(durationMinutes) ? durationMinutes : 100,
        max_participants: maxParticipantsRaw ? Number(maxParticipantsRaw) : null,
        requires_code: requiresCode,
        result_visible_at: resultVisibleAt ? new Date(resultVisibleAt).toISOString() : null,
        explanation_visible_at: explanationVisibleAt ? new Date(explanationVisibleAt).toISOString() : null,
    }
}

function validateTryoutEventPayload(payload: ReturnType<typeof readTryoutEventForm>) {
    if (!payload.title) return 'Nama event wajib diisi'
    if (!payload.starts_at) return 'Jadwal mulai wajib diisi'
    if (!payload.ends_at) return 'Jadwal tutup wajib diisi'
    if (new Date(payload.ends_at).getTime() <= new Date(payload.starts_at).getTime()) {
        return 'Jadwal tutup harus setelah jadwal mulai'
    }
    if (!Number.isInteger(payload.start_grace_minutes) || payload.start_grace_minutes < 0) return 'Start window tidak valid'
    if (!Number.isInteger(payload.duration_minutes) || payload.duration_minutes < 1) return 'Durasi tidak valid'
    if (payload.max_participants !== null && (!Number.isInteger(payload.max_participants) || payload.max_participants < 1)) {
        return 'Max peserta tidak valid'
    }
    return null
}

export async function createTryoutEvent(formData: FormData) {
    const isUserAdmin = await isAdmin()
    if (!isUserAdmin) return { success: false, message: 'Unauthorized' }

    const payload = readTryoutEventForm(formData)
    const validationError = validateTryoutEventPayload(payload)
    if (validationError) return { success: false, message: validationError }

    const supabase = await createAdminClient()
    const { error } = await supabase
        .from('tryout_events')
        .insert({ ...payload, status: 'draft' })

    if (error) return { success: false, message: error.message }

    revalidatePath('/cpns/admin/event')
    return { success: true, message: 'Event Tryout Akbar berhasil dibuat' }
}

export async function updateTryoutEvent(id: string, formData: FormData) {
    const isUserAdmin = await isAdmin()
    if (!isUserAdmin) return { success: false, message: 'Unauthorized' }

    const payload = readTryoutEventForm(formData)
    const validationError = validateTryoutEventPayload(payload)
    if (validationError) return { success: false, message: validationError }

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
    const isUserAdmin = await isAdmin()
    if (!isUserAdmin) return { success: false, message: 'Unauthorized' }

    const code = String(formData.get('code') || '').trim().toUpperCase()
    const maxUses = Number(formData.get('max_uses') || 1)
    const expiresAt = String(formData.get('expires_at') || '').trim()

    if (!eventId) return { success: false, message: 'Event tidak valid' }
    if (!code) return { success: false, message: 'Kode masuk wajib diisi' }
    if (!/^[A-Z0-9-]{4,32}$/.test(code)) {
        return { success: false, message: 'Kode hanya boleh huruf, angka, strip, minimal 4 karakter' }
    }
    if (!Number.isInteger(maxUses) || maxUses < 1) return { success: false, message: 'Limit penggunaan kode tidak valid' }

    const supabase = await createAdminClient()
    const { error } = await supabase
        .from('tryout_event_codes')
        .insert({
            event_id: eventId,
            code,
            max_uses: maxUses,
            expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        })

    if (error) return { success: false, message: error.message }

    revalidatePath('/cpns/admin/event')
    return { success: true, message: 'Kode masuk event berhasil dibuat' }
}

export async function toggleTryoutEventCode(id: string, isActive: boolean) {
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
