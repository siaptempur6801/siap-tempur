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
