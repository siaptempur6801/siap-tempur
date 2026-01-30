'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function startPractice(type: 'TWK' | 'TIU' | 'TKP') {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/login')
    }

    console.log('[startPractice] Starting for user:', user.id, 'Type:', type)

    // Call DB Function
    const { data, error } = await supabase.rpc('start_practice_session', {
        p_user_id: user.id,
        p_type: type,
        p_limit: type === 'TWK' ? 30 : type === 'TIU' ? 35 : type === 'TKP' ? 45 : 10, // 30 TWK, 35 TIU, 45 TKP, 10 others
    })

    if (error) {
        console.error('[startPractice] DB Error:', error)
        return { error: 'Failed to start practice session' }
    }

    console.log('[startPractice] Success. Data:', data)

    if (!data || data.length === 0) {
        console.error('[startPractice] No data returned from RPC')
        return { error: 'No session created' }
    }

    // Return session ID for client-side redirect
    const sessionId = data[0].session_id
    console.log('[startPractice] Session created:', sessionId)
    return { success: true, sessionId }
}

export async function startTryout() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // Call DB Function for Tryout
    // Standard CPNS 2024: 110 Questions (TWK 30, TIU 35, TKP 45)
    // Adjust logic if needed in the DB function
    const { data, error } = await supabase.rpc('start_tryout_session', {
        p_user_id: user.id
    })

    if (error) {
        console.error('[startTryout] DB Error:', error)
        return { error: 'Failed to start tryout session' }
    }

    if (!data || data.length === 0) {
        return { error: 'No session created' }
    }

    const sessionId = data[0].session_id
    return { success: true, sessionId }
}

export async function submitAnswer(sessionId: string, questionId: string, optionId: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('test_answers')
        .update({ option_id: optionId })
        .eq('session_id', sessionId)
        .eq('question_id', questionId)

    if (error) {
        console.error('Error submitting answer:', error)
        return { error: 'Failed to save answer' }
    }

    return { success: true }
}

export async function finishPractice(sessionId: string) {
    const supabase = await createClient()

    // Call scoring function
    const { error } = await supabase.rpc('calculate_session_score', {
        session_uuid: sessionId
    })

    if (error) {
        console.error('Error finishing practice:', error)
        return { error: 'Failed to finish session' }
    }

    revalidatePath(`/dashboard/latihan/${sessionId}/result`)
    return { success: true }
}
