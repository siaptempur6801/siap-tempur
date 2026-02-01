'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function submitAnswer(sessionId: string, questionId: string, optionId: string) {
    const supabase = await createClient()

    // Verify session is active (this logic should ideally be ID-based and fast)
    // For security, checking time remaining here is good.

    const { error } = await supabase
        .from('test_answers')
        .upsert(
            { session_id: sessionId, question_id: questionId, option_id: optionId },
            { onConflict: 'session_id, question_id' }
        )

    if (error) {
        console.error('Submit error:', error)
        throw new Error('Failed to save answer')
    }

    // No revalidation needed for smooth UI?
    // Actually, we might want to keep UI optimistic.
}

export async function finishExam(sessionId: string) {
    const supabase = await createClient()

    // Call the DB function to calculate score
    const { error } = await supabase.rpc('calculate_session_score', {
        session_uuid: sessionId
    })

    if (error) {
        console.error('Finish exam error:', error)
        throw new Error('Failed to calculate score')
    }

    redirect(`/dashboard/result/${sessionId}`)
}

export async function checkTime(sessionId: string) {
    // Check if time is up, if so, trigger finishExam
    // This is for auto-submit logic
    const supabase = await createClient()
    const { data: session } = await supabase.from('test_sessions').select('start_time, mode').eq('id', sessionId).single()

    if (!session) return { ended: false }

    // Logic to compare start_time + duration vs now()
    // For now simple stub
    return { ended: false }
}
