'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { isAdmin } from '@/utils/admin'

export async function deleteQuestion(id: string) {
    const isUserAdmin = await isAdmin()
    if (!isUserAdmin) {
        return { success: false, message: 'Unauthorized' }
    }

    const supabase = await createClient()
    const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', id)

    if (error) {
        return { success: false, message: error.message }
    }

    revalidatePath('/dashboard/admin')
    return { success: true, message: 'Soal berhasil dihapus' }
}

export async function createQuestion(formData: FormData) {
    const isUserAdmin = await isAdmin()
    if (!isUserAdmin) {
        return { success: false, message: 'Unauthorized' }
    }

    const type = formData.get('type') as any // TWK, TIU, TKP
    const content = formData.get('content') as string
    const category = formData.get('category') as string // Sub-category
    const explanation = formData.get('explanation') as string
    const correctAnswer = formData.get('correct_answer') as string // A, B, C...

    const supabase = await createClient()

    // 1. Insert Question
    const { data: question, error: qError } = await supabase
        .from('questions')
        .insert({
            type,
            content,
            category,
            sub_category: category,
            explanation
        })
        .select()
        .single()

    if (qError) return { success: false, message: qError.message }

    // 2. Prepare Options
    const optionLabels = ['A', 'B', 'C', 'D', 'E']
    const optionsToInsert = optionLabels.map(label => {
        const score = formData.get(`score_${label.toLowerCase()}`)
        return {
            question_id: question.id,
            content: formData.get(`option_${label.toLowerCase()}`) as string,
            is_correct: label === correctAnswer,
            score_value: type === 'TKP' ? parseInt(score as string || '0') : (label === correctAnswer ? 1 : 0)
        }
    })

    // 3. Insert Options
    const { error: oError } = await supabase
        .from('options')
        .insert(optionsToInsert)

    if (oError) {
        // Cleanup question if options fail?
        await supabase.from('questions').delete().eq('id', question.id)
        return { success: false, message: oError.message }
    }

    revalidatePath('/dashboard/admin')
    return { success: true, message: 'Soal baru berhasil dibuat' }
}

export async function updateQuestion(id: string, formData: FormData) {
    const isUserAdmin = await isAdmin()
    if (!isUserAdmin) {
        return { success: false, message: 'Unauthorized' }
    }

    const type = formData.get('type') as any
    const content = formData.get('content') as string
    const category = formData.get('category') as string
    const explanation = formData.get('explanation') as string
    const correctAnswer = formData.get('correct_answer') as string

    const supabase = await createClient()

    // 1. Update Question
    const { error: qError } = await supabase
        .from('questions')
        .update({
            type,
            content,
            category,
            sub_category: category,
            explanation
        })
        .eq('id', id)

    if (qError) return { success: false, message: qError.message }

    // 2. Clear Existing Options
    const { error: dError } = await supabase
        .from('options')
        .delete()
        .eq('question_id', id)

    if (dError) return { success: false, message: dError.message }

    // 3. Insert New Options
    const optionLabels = ['A', 'B', 'C', 'D', 'E']
    const optionsToInsert = optionLabels.map(label => {
        const score = formData.get(`score_${label.toLowerCase()}`)
        return {
            question_id: id,
            content: formData.get(`option_${label.toLowerCase()}`) as string,
            is_correct: label === correctAnswer,
            score_value: type === 'TKP' ? parseInt(score as string || '0') : (label === correctAnswer ? 1 : 0)
        }
    })

    const { error: oError } = await supabase
        .from('options')
        .insert(optionsToInsert)

    if (oError) return { success: false, message: oError.message }

    revalidatePath('/dashboard/admin')
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
    option_a: string
    option_b: string
    option_c: string
    option_d: string
    option_e: string
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

    const supabase = await createClient()
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
                const scoreKeys = ['score_a', 'score_b', 'score_c', 'score_d', 'score_e'] as const

                const optionsToInsert = optionLabels.map((label, idx) => {
                    const letterUpper = label.toUpperCase()
                    const isTKP = q.type === 'TKP'

                    return {
                        question_id: question.id,
                        content: q[optionKeys[idx]] || '',
                        is_correct: isTKP ? false : letterUpper === q.correct_answer,
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

    revalidatePath('/dashboard/admin')

    if (failCount === 0) {
        return {
            success: true,
            message: `✅ Berhasil import ${successCount} soal!`
        }
    }

    return {
        success: successCount > 0,
        message: `Import selesai: ${successCount} berhasil, ${failCount} gagal (baris: ${failedRows.slice(0, 10).join(', ')}${failedRows.length > 10 ? '...' : ''})`
    }
}
