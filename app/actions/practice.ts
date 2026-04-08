'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

type ResumeSessionResult = {
    sessionId: string
    resumed: true
}

const TRYOUT_DURATION_MS = 100 * 60 * 1000

function isMissingProgressColumnError(error: { message?: string | null; details?: string | null } | null) {
    const text = `${error?.message ?? ''} ${error?.details ?? ''}`.toLowerCase()
    return text.includes('last_activity_at') || text.includes('current_question_index') || text.includes('marked_questions')
}

async function queryInProgressSessions(
    supabase: Awaited<ReturnType<typeof createClient>>,
    userId: string,
    mode: 'practice' | 'tryout',
    limit = 10
) {
    const baseQuery = supabase
        .from('test_sessions')
        .select('id, start_time')
        .eq('user_id', userId)
        .eq('mode', mode)
        .eq('status', 'in_progress')

    const primaryQuery = await baseQuery
        .order('last_activity_at', { ascending: false })
        .limit(limit)

    if (!primaryQuery.error || !isMissingProgressColumnError(primaryQuery.error)) {
        return primaryQuery
    }

    return supabase
        .from('test_sessions')
        .select('id, start_time')
        .eq('user_id', userId)
        .eq('mode', mode)
        .eq('status', 'in_progress')
        .order('start_time', { ascending: false })
        .limit(limit)
}

function isTryoutExpired(startTime?: string | null) {
    if (!startTime) return false
    return Date.now() - new Date(startTime).getTime() >= TRYOUT_DURATION_MS
}

async function findExistingTryoutSession(
    supabase: Awaited<ReturnType<typeof createClient>>,
    userId: string
): Promise<ResumeSessionResult | null> {
    const { data: sessions, error } = await queryInProgressSessions(supabase, userId, 'tryout', 1)

    if (error) {
        console.error('[findExistingTryoutSession] DB Error:', error)
        return null
    }

    const session = sessions?.[0]
    if (!session) return null

    if (isTryoutExpired(session.start_time)) {
        const { error: finishError } = await supabase.rpc('calculate_session_score', {
            session_uuid: session.id
        })

        if (finishError) {
            console.error('[findExistingTryoutSession] Failed to auto-finish expired session:', finishError)
        }

        return null
    }

    return { sessionId: session.id, resumed: true }
}

async function findExistingPracticeSession(
    supabase: Awaited<ReturnType<typeof createClient>>,
    userId: string,
    type: 'TWK' | 'TIU' | 'TKP'
): Promise<ResumeSessionResult | null> {
    const { data: sessions, error } = await queryInProgressSessions(supabase, userId, 'practice', 10)

    if (error) {
        console.error('[findExistingPracticeSession] Session query error:', error)
        return null
    }

    for (const session of sessions ?? []) {
        const { data: answerRow, error: answerError } = await supabase
            .from('test_answers')
            .select('questions!inner(type)')
            .eq('session_id', session.id)
            .limit(1)
            .maybeSingle()

        if (answerError || !answerRow) {
            continue
        }

        const questionData = Array.isArray(answerRow.questions)
            ? answerRow.questions[0]
            : answerRow.questions

        if (questionData?.type === type) {
            return { sessionId: session.id, resumed: true }
        }
    }

    return null
}

export async function startPractice(type: 'TWK' | 'TIU' | 'TKP') {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/login')
    }

    const existingSession = await findExistingPracticeSession(supabase, user.id, type)
    if (existingSession) {
        return { success: true, ...existingSession }
    }

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



    if (!data || data.length === 0) {
        console.error('[startPractice] No data returned from RPC')
        return { error: 'No session created' }
    }

    // Return session ID for client-side redirect
    const sessionId = data[0].session_id

    return { success: true, sessionId, resumed: false }
}

export async function startTryout() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const existingSession = await findExistingTryoutSession(supabase, user.id)
    if (existingSession) {
        return { success: true, ...existingSession }
    }

    // Call reworked RPC — generates 110 soal sesuai blueprint SKD CPNS
    const { data, error } = await supabase.rpc('start_tryout_session', {
        p_user_id: user.id
    })

    if (error) {
        console.error('[startTryout] DB Error:', error)
        if (error.message?.includes('Not enough SKD tickets') || error.details?.includes('Not enough SKD tickets')) {
            return { error: 'Token ujian habis! Silakan beli paket baru.' }
        }
        return { error: 'Gagal memulai ujian. Pastikan bank soal sudah terisi cukup.' }
    }

    if (!data || data.length === 0) {
        return { error: 'Sesi ujian tidak berhasil dibuat' }
    }

    const sessionId = data[0].session_id
    return { success: true, sessionId, resumed: false }
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

    const { error: sessionError } = await supabase
        .from('test_sessions')
        .update({ last_activity_at: new Date().toISOString() })
        .eq('id', sessionId)

    if (sessionError && !isMissingProgressColumnError(sessionError)) {
        console.error('Error updating session activity:', sessionError)
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

    if (error) {
        console.error('Error finishing practice:', error)
        return { error: 'Failed to finish session' }
    }

    // Leaderboard is now updated via pg_cron (Materialized View) every ~2-5 mins
    // No need to trigger manual refresh here to save DB resources.

    revalidatePath(`/cpns/dashboard/latihan/${sessionId}/result`)
    revalidatePath('/cpns/dashboard')
    revalidatePath('/cpns/dashboard/ranking')
    revalidatePath('/cpns/dashboard/latihan')
    return { success: true }
}
