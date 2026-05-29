'use server'

import { isMissingProgressColumnError, isTryoutExpired } from '@/lib/practice-session'
import { createAdminClient, createClient } from '@/lib/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { validateCsrf } from '@/lib/csrf'
import { logger } from '@/lib/logger'

type ResumeSessionResult = {
    sessionId: string
    resumed: true
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isUuid(value: string) {
    return UUID_PATTERN.test(value)
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

async function findExistingTryoutSession(
    supabase: Awaited<ReturnType<typeof createClient>>,
    userId: string
): Promise<ResumeSessionResult | null> {
    const { data: sessions, error } = await queryInProgressSessions(supabase, userId, 'tryout', 1)

    if (error) {
        logger.warn('[findExistingTryoutSession] DB Error', { error: error.message })
        return null
    }

    const session = sessions?.[0]
    if (!session) return null

    if (isTryoutExpired(session.start_time)) {
        const { error: finishError } = await supabase.rpc('calculate_session_score', {
            session_uuid: session.id
        })

        if (finishError) {
            logger.warn('[findExistingTryoutSession] Failed to auto-finish expired session', { error: finishError })
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
        logger.warn('[findExistingPracticeSession] Session query error', { error: error.message })
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
    try { await validateCsrf() } catch { return { error: 'Invalid request' } }

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
        logger.warn('[startPractice] DB Error', { error: error.message })
        return { error: 'Failed to start practice session' }
    }



    if (!data || data.length === 0) {
        logger.warn('[startPractice] No data returned from RPC')
        return { error: 'No session created' }
    }

    // Return session ID for client-side redirect
    const sessionId = data[0].session_id

    return { success: true, sessionId, resumed: false }
}

export async function startTryout() {
    try { await validateCsrf() } catch { return { error: 'Invalid request' } }

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
        logger.warn('[startTryout] DB Error', { error: error.message })
        if (error.message?.includes('Not enough SKD tickets') || error.details?.includes('Not enough SKD tickets')) {
            return { error: 'Token tryout habis! Silakan beli paket baru.' }
        }
        return { error: 'Gagal memulai tryout. Pastikan bank soal sudah terisi cukup.' }
    }

    if (!data || data.length === 0) {
        return { error: 'Sesi tryout tidak berhasil dibuat' }
    }

    const sessionId = data[0].session_id
    return { success: true, sessionId, resumed: false }
}

export async function submitAnswer(sessionId: string, questionId: string, optionId: string) {
    try { await validateCsrf() } catch { return { error: 'Invalid request' } }

    const supabase = await createClient()

    if (!isUuid(sessionId) || !isUuid(questionId) || !isUuid(optionId)) {
        return { error: 'Invalid answer payload' }
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: session, error: sessionError } = await supabase
        .from('test_sessions')
        .select('id')
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .eq('status', 'in_progress')
        .maybeSingle()

    if (sessionError) {
        logger.warn('Error validating answer session', { error: sessionError })
        return { error: 'Failed to save answer' }
    }

    if (!session) {
        return { error: 'Session is not active' }
    }

    const [{ data: answerRow, error: answerError }, { data: optionRow, error: optionError }] = await Promise.all([
        supabase
            .from('test_answers')
            .select('id')
            .eq('session_id', sessionId)
            .eq('question_id', questionId)
            .maybeSingle(),
        supabase
            .from('options')
            .select('id')
            .eq('id', optionId)
            .eq('question_id', questionId)
            .maybeSingle(),
    ])

    if (answerError || optionError) {
        logger.warn('Error validating submitted answer', { error: (answerError || optionError)?.message })
        return { error: 'Failed to save answer' }
    }

    if (!answerRow || !optionRow) {
        return { error: 'Invalid answer option' }
    }

    const { error } = await supabase
        .from('test_answers')
        .update({ option_id: optionId })
        .eq('session_id', sessionId)
        .eq('question_id', questionId)

    if (error) {
        logger.warn('Error submitting answer', { error: error.message })
        return { error: 'Failed to save answer' }
    }

    const { error: activityError } = await supabase
        .from('test_sessions')
        .update({ last_activity_at: new Date().toISOString() })
        .eq('id', sessionId)

    if (activityError && !isMissingProgressColumnError(activityError)) {
        logger.warn('Error updating session activity', { error: activityError.message })
    }

    return { success: true }
}

export async function finishPractice(sessionId: string) {
    try { await validateCsrf() } catch { return { error: 'Invalid request' } }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // Call scoring function
    const { error } = await supabase.rpc('calculate_session_score', {
        session_uuid: sessionId
    })

    if (error) {
        logger.warn('Error finishing practice', { error: error.message })
        return { error: 'Failed to finish session' }
    }

    const admin = await createAdminClient()
    const { data: eventSession } = await admin
        .from('tryout_event_sessions')
        .select('event_id')
        .eq('session_id', sessionId)
        .eq('user_id', user.id)
        .maybeSingle()

    if (eventSession) {
        await Promise.all([
            admin
                .from('tryout_event_sessions')
                .update({
                    status: 'completed',
                    finished_at: new Date().toISOString(),
                })
                .eq('session_id', sessionId)
                .eq('user_id', user.id),
            admin
                .from('tryout_event_participants')
                .update({ status: 'completed' })
                .eq('event_id', eventSession.event_id)
                .eq('user_id', user.id),
        ])
    }

    // Leaderboard is updated by pg_cron on a fixed interval.
    // No need to trigger manual refresh here to save DB resources.

    revalidatePath(`/cpns/dashboard/tryout/${sessionId}/result`)
    revalidatePath('/cpns/dashboard')
    revalidatePath('/cpns/dashboard/ranking')
    revalidatePath('/cpns/dashboard/tryout')
    revalidatePath('/cpns/dashboard/event')
    revalidatePath('/cpns/dashboard/riwayat')
    return { success: true }
}
