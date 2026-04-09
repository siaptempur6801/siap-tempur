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
    
    const { error: err3 } = await supabase.from('tryout_questions').delete().eq('question_id', id)
    if (err3 && err3.code !== 'PGRST116') {
        console.error('Error deleting tryout_questions:', err3)
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

    revalidatePath('/cpns/dashboard/admin')
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

    revalidatePath('/cpns/dashboard/admin')
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

    revalidatePath('/cpns/dashboard/admin')
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

    revalidatePath('/cpns/dashboard/admin')

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

    revalidatePath('/cpns/dashboard/admin/tryout-config')
    revalidatePath('/cpns/dashboard/admin')
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

    revalidatePath('/cpns/dashboard/admin/tryout-config')
    revalidatePath('/cpns/dashboard/admin')
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

    revalidatePath('/cpns/dashboard/admin/tryout-config')
    revalidatePath('/cpns/dashboard/admin')
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

    revalidatePath('/cpns/dashboard/admin/tryout-config')
    revalidatePath('/cpns/dashboard/admin')
    return { success: true, message: 'Kategori berhasil dihapus secara permanen' }
}
