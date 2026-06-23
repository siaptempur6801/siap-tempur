'use server'

import { DRILLING_MATERI_QUESTION_COUNT, isMissingProgressColumnError, isTryoutExpired } from '@/lib/practice-session'
import { createAdminClient, createClient } from '@/lib/utils/supabase/server'
import { getMiniTryoutProduct, isMiniTryoutType, type MiniTryoutType } from '@/lib/constants'
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

async function syncLeaderboardFromSession(
    supabase: Awaited<ReturnType<typeof createClient>>,
    sessionId: string
) {
    const { error } = await supabase.rpc('upsert_leaderboard_from_session', {
        p_session_id: sessionId,
    })

    if (error) {
        logger.warn('Leaderboard sync failed', {
            error: error.message,
            sessionId,
        })
    }
}

async function queryInProgressSessions(
    supabase: Awaited<ReturnType<typeof createClient>>,
    userId: string,
    mode: 'practice' | 'tryout',
    limit = 10
) {
    const baseQuery = supabase
        .from('test_sessions')
        .select('id, start_time, session_kind')
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
        .select('id, start_time, session_kind')
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
        } else {
            await syncLeaderboardFromSession(supabase, session.id)
        }

        return null
    }

    return { sessionId: session.id, resumed: true }
}

async function findExistingPracticeSession(
    supabase: Awaited<ReturnType<typeof createClient>>,
    userId: string,
    type: MiniTryoutType,
    expectedQuestionCount?: number,
    expectedSubCategory?: string
): Promise<ResumeSessionResult | null> {
    const { data: sessions, error } = await queryInProgressSessions(supabase, userId, 'practice', 10)

    if (error) {
        logger.warn('[findExistingPracticeSession] Session query error', { error: error.message })
        return null
    }

    for (const session of sessions ?? []) {
        if (expectedSubCategory && session.session_kind && session.session_kind !== 'drilling_materi') {
            continue
        }

        if (!expectedSubCategory && session.session_kind === 'drilling_materi') {
            continue
        }

        const { data: answerRows, error: answerError } = await supabase
            .from('test_answers')
            .select('questions!inner(type, sub_category)')
            .eq('session_id', session.id)
            .limit(expectedQuestionCount ? expectedQuestionCount + 1 : 1)

        if (answerError || !answerRows?.length) {
            continue
        }

        if (expectedQuestionCount && answerRows.length !== expectedQuestionCount) {
            continue
        }

        const questionRows = answerRows
            .map((answer) => Array.isArray(answer.questions) ? answer.questions[0] : answer.questions)
            .filter(Boolean)

        if (
            questionRows.length === answerRows.length &&
            questionRows.every((question) => (
                question?.type === type &&
                (!expectedSubCategory || question.sub_category?.trim() === expectedSubCategory)
            ))
        ) {
            return { sessionId: session.id, resumed: true }
        }
    }

    return null
}

export async function startPractice(type: MiniTryoutType) {
    try { await validateCsrf() } catch { return { error: 'Invalid request' } }

    const miniTryoutProduct = getMiniTryoutProduct(type)
    if (!miniTryoutProduct) {
        return { error: 'Tipe mini tryout tidak valid' }
    }

    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/login')
    }

    const existingSession = await findExistingPracticeSession(supabase, user.id, miniTryoutProduct.type, miniTryoutProduct.questionCount)
    if (existingSession) {
        return { success: true, ...existingSession }
    }

    // New mini tryout sessions cost one SKD token. Existing active sessions are returned above.
    const { data, error } = await supabase.rpc('start_mini_tryout_session', {
        p_user_id: user.id,
        p_type: miniTryoutProduct.type,
        p_limit: miniTryoutProduct.questionCount,
    })

    if (error) {
        logger.warn('[startPractice] DB Error', { error: error.message })
        if (error.message?.includes('Not enough SKD tickets') || error.details?.includes('Not enough SKD tickets')) {
            return { error: 'Token mini tryout habis! Silakan beli paket baru.' }
        }
        if (error.message?.includes('Bank soal mini tryout belum lengkap') || error.details?.includes('Bank soal mini tryout belum lengkap')) {
            return { error: 'Bank soal mini tryout belum lengkap untuk produk ini.' }
        }
        return { error: 'Gagal memulai mini tryout.' }
    }



    if (!data || data.length === 0) {
        logger.warn('[startPractice] No data returned from RPC')
        return { error: 'Sesi mini tryout tidak berhasil dibuat' }
    }

    // Return session ID for client-side redirect
    const sessionId = data[0].session_id

    revalidatePath('/cpns/dashboard')
    revalidatePath('/cpns/dashboard/mini-tryout')
    revalidatePath('/cpns/dashboard/profile')

    return { success: true, sessionId, resumed: false }
}

export async function startMiniTryout(type: MiniTryoutType) {
    return startPractice(type)
}

export async function startDrillingMateri(type: MiniTryoutType, subCategory: string) {
    try { await validateCsrf() } catch { return { error: 'Invalid request' } }

    if (!isMiniTryoutType(type)) {
        return { error: 'Tipe drilling tidak valid' }
    }

    const normalizedSubCategory = subCategory.trim()
    if (!normalizedSubCategory) {
        return { error: 'Materi drilling tidak valid' }
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const existingSession = await findExistingPracticeSession(supabase, user.id, type, DRILLING_MATERI_QUESTION_COUNT, normalizedSubCategory)
    if (existingSession) {
        return { success: true, ...existingSession }
    }

    const { data, error } = await supabase.rpc('start_drilling_materi_session', {
        p_user_id: user.id,
        p_type: type,
        p_sub_category: normalizedSubCategory,
    })

    if (error) {
        logger.warn('[startDrillingMateri] DB Error', { error: error.message })
        if (error.message?.includes('Not enough SKD tickets') || error.details?.includes('Not enough SKD tickets')) {
            return { error: 'Token drilling materi habis! Silakan beli paket baru.' }
        }
        if (error.message?.includes('Bank soal drilling materi belum lengkap') || error.details?.includes('Bank soal drilling materi belum lengkap')) {
            const selectedCount = error.message?.match(/selected (\d+)/)?.[1] || error.details?.match(/selected (\d+)/)?.[1]
            return {
                error: selectedCount
                    ? `Bank soal ${type} - ${normalizedSubCategory} baru terbaca ${selectedCount}/${DRILLING_MATERI_QUESTION_COUNT} soal.`
                    : `Bank soal ${type} - ${normalizedSubCategory} belum cukup untuk drilling ${DRILLING_MATERI_QUESTION_COUNT} soal.`
            }
        }
        return { error: 'Gagal memulai drilling materi.' }
    }

    if (!data || data.length === 0) {
        logger.warn('[startDrillingMateri] No data returned from RPC')
        return { error: 'Sesi drilling materi tidak berhasil dibuat' }
    }

    revalidatePath('/cpns/dashboard')
    revalidatePath('/cpns/dashboard/drilling-materi')
    revalidatePath('/cpns/dashboard/profile')
    revalidatePath('/cpns/dashboard/riwayat')

    return { success: true, sessionId: data[0].session_id, resumed: !data[0].questions }
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

    const admin = await createAdminClient()
    const [{ data: answerRow, error: answerError }, { data: optionRow, error: optionError }] = await Promise.all([
        supabase
            .from('test_answers')
            .select('id')
            .eq('session_id', sessionId)
            .eq('question_id', questionId)
            .maybeSingle(),
        admin
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

    if (!isUuid(sessionId)) {
        return { error: 'Invalid session payload' }
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // Validate session belongs to current user and is still in progress
    const { data: ownedSession } = await supabase
        .from('test_sessions')
        .select('id')
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .eq('status', 'in_progress')
        .maybeSingle()

    if (!ownedSession) {
        return { error: 'Session not found or already completed' }
    }

    // Call scoring function
    const { error } = await supabase.rpc('calculate_session_score', {
        session_uuid: sessionId
    })

    if (error) {
        logger.warn('Error finishing practice', { error: error.message })
        return { error: 'Failed to finish session' }
    }

    await syncLeaderboardFromSession(supabase, sessionId)

    const admin = await createAdminClient()
    const { error: eventCompletionError } = await admin
        .rpc('complete_tryout_event_session', {
            p_user_id: user.id,
            p_session_id: sessionId,
        })
        .maybeSingle()

    if (eventCompletionError) {
        logger.warn('Error completing event session', {
            error: eventCompletionError.message,
            sessionId,
            userId: user.id,
        })
        return { error: 'Failed to finish event session' }
    }

    revalidatePath(`/cpns/dashboard/tryout/${sessionId}/result`)
    revalidatePath('/cpns/dashboard')
    revalidatePath('/cpns/dashboard/ranking')
    revalidatePath('/cpns/dashboard/tryout')
    revalidatePath('/cpns/dashboard/mini-tryout')
    revalidatePath('/cpns/dashboard/event')
    revalidatePath('/cpns/dashboard/riwayat')
    return { success: true }
}
