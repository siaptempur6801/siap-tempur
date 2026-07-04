'use server'

import { createAdminClient, createClient } from '@/lib/utils/supabase/server'
import { logger } from '@/lib/logger'
import { getEffectiveEventCloseTime } from '@/lib/event-access'
import { AnswerProgressRow, buildAnsweredProgressMap } from '@/lib/event-leaderboard-progress'
import { autoCloseExpiredTryoutEvents } from '@/lib/tryout-event-status'
import {
    computeDisplayedBotEntry,
    ensureEventLeaderboardBots,
    rankEventLeaderboardEntries,
    type LeaderboardRankableEntry,
} from '@/lib/event-leaderboard-bots'

export interface LiveLeaderboardEntry {
    entry_id: string
    user_id: string
    full_name: string
    avatar_url: string | null
    progress_count: number
    score_twk: number
    score_tiu: number
    score_tkp: number
    total_score: number
    live_rank: number
    is_bot: boolean
    started_at: string
}

type EventLeaderboardEvent = {
    id: string
    title: string
    status: string
    starts_at: string
    duration_minutes: number
    start_grace_minutes: number
}

type EventSessionRow = {
    user_id: string
    session_id: string
    started_at: string
}

type TestSessionScoreRow = {
    id: string
    status: string
    score_twk: number | null
    score_tiu: number | null
    score_tkp: number | null
    total_score: number | null
}

type ProfileRow = {
    id: string
    full_name: string | null
    avatar_url: string | null
}

function toNumber(value: number | null | undefined) {
    return typeof value === 'number' ? value : 0
}

async function getAnswerProgressRows(
    admin: Awaited<ReturnType<typeof createAdminClient>>,
    sessionIds: string[]
) {
    const rows: AnswerProgressRow[] = []
    const pageSize = 1000
    let from = 0

    while (true) {
        const { data, error } = await admin
            .from('test_answers')
            .select('id, session_id, option_id')
            .in('session_id', sessionIds)
            .order('id', { ascending: true })
            .range(from, from + pageSize - 1)

        if (error) {
            logger.error('Event answer progress page fetch failed', error, {
                from,
                pageSize,
                sessionCount: sessionIds.length,
            })
            throw new Error('Gagal memuat progress leaderboard event')
        }

        const page = (data || []) as AnswerProgressRow[]
        rows.push(...page)

        if (page.length < pageSize) break
        from += pageSize
    }

    return rows
}

async function getCompletedEventLeaderboardEntries(eventId: string): Promise<LeaderboardRankableEntry[]> {
    const admin = await createAdminClient()

    const { data: eventSessions, error: eventSessionsError } = await admin
        .from('tryout_event_sessions')
        .select('user_id, session_id, started_at')
        .eq('event_id', eventId)
        .neq('status', 'cancelled')

    if (eventSessionsError) {
        logger.error('Event sessions fetch failed', eventSessionsError, { eventId })
        throw new Error('Gagal memuat leaderboard event')
    }

    const sessions = (eventSessions || []) as EventSessionRow[]
    if (sessions.length === 0) return []

    const sessionIds = [...new Set(sessions.map((session) => session.session_id))]
    const userIds = [...new Set(sessions.map((session) => session.user_id))]

    const [
        { data: testSessions, error: testSessionsError },
        { data: profiles, error: profilesError },
        answerProgress,
    ] = await Promise.all([
        admin
            .from('test_sessions')
            .select('id, status, score_twk, score_tiu, score_tkp, total_score')
            .in('id', sessionIds),
        admin
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', userIds),
        getAnswerProgressRows(admin, sessionIds),
    ])

    if (testSessionsError || profilesError) {
        logger.error('Completed event leaderboard fetch failed', {
            testSessionsError,
            profilesError,
            eventId,
        })
        throw new Error('Gagal memuat leaderboard event')
    }

    const scoreMap = new Map(
        ((testSessions || []) as TestSessionScoreRow[]).map((session) => [session.id, session])
    )
    const profileMap = new Map(
        ((profiles || []) as ProfileRow[]).map((profile) => [profile.id, profile])
    )
    const progressMap = buildAnsweredProgressMap(answerProgress)

    return sessions
        .map((eventSession) => {
            const score = scoreMap.get(eventSession.session_id)
            const profile = profileMap.get(eventSession.user_id)

            return {
                entry_id: `user:${eventSession.user_id}`,
                user_id: eventSession.user_id,
                full_name: profile?.full_name || 'Pejuang Tanpa Nama',
                avatar_url: profile?.avatar_url || null,
                progress_count: progressMap.get(eventSession.session_id) || 0,
                score_twk: toNumber(score?.score_twk),
                score_tiu: toNumber(score?.score_tiu),
                score_tkp: toNumber(score?.score_tkp),
                total_score: toNumber(score?.total_score),
                live_rank: 0,
                is_bot: false,
                started_at: eventSession.started_at,
            }
        })
}

export async function getLiveLeaderboardAction(eventId: string) {
    if (!eventId) {
        throw new Error('Gagal memuat leaderboard: event ID tidak valid')
    }

    const supabase = await createClient()
    const admin = await createAdminClient()
    await autoCloseExpiredTryoutEvents(admin)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('Unauthorized')
    }

    // 1. Fetch event details first. Scheduled/closed events should show an empty board,
    // not fail because the live RPC is not relevant yet.
    const { data: event, error: eventError } = await supabase
        .from('tryout_events')
        .select('id, title, status, starts_at, duration_minutes, start_grace_minutes')
        .eq('id', eventId)
        .single()
        
    if (eventError) {
        throw new Error('Event tidak ditemukan')
    }

    const leaderboardEvent = event as EventLeaderboardEvent
    const closeTime = getEffectiveEventCloseTime(leaderboardEvent)
    const isEventFinished = leaderboardEvent.status === 'closed' || Date.now() > closeTime.getTime()

    const { data: profile } = await admin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    const isAdmin = Boolean(profile && ['admin', 'superadmin'].includes(String(profile.role)))

    if (isEventFinished) {
        if (!isAdmin) {
            const { data: participant, error: participantError } = await admin
                .from('tryout_event_participants')
                .select('id')
                .eq('event_id', eventId)
                .eq('user_id', user.id)
                .maybeSingle()

            if (participantError || !participant) {
                throw new Error('Leaderboard event hanya bisa dilihat peserta terdaftar')
            }
        }

        return {
            event: { ...leaderboardEvent, status: 'closed' },
            leaderboard: rankEventLeaderboardEntries([
                ...await getCompletedEventLeaderboardEntries(eventId),
                ...(await ensureEventLeaderboardBots(admin, eventId)).map((entry) => computeDisplayedBotEntry({
                    entry,
                    eventStatus: 'closed',
                })),
            ]),
        }
    }

    if (leaderboardEvent.status !== 'live') {
        return {
            event: leaderboardEvent,
            leaderboard: []
        }
    }

    if (!isAdmin) {
        throw new Error('Live leaderboard hanya tersedia untuk admin')
    }

    // 2. Fetch live leaderboard using RPC
    const { data: leaderboard, error } = await supabase.rpc('get_live_event_leaderboard', {
        p_event_id: eventId
    })

    if (error) {
        if (error.code === 'PGRST202' || error.message.includes('schema cache')) {
            logger.warn('Live leaderboard RPC unavailable in schema cache', { eventId, error })

            const botEntries = await ensureEventLeaderboardBots(admin, eventId)

            return {
                event,
                leaderboard: rankEventLeaderboardEntries(botEntries.map((entry) => computeDisplayedBotEntry({
                    entry,
                    eventStatus: leaderboardEvent.status,
                })))
            }
        }

        logger.error('Live leaderboard fetch failed', error, { eventId })
        throw new Error('Gagal memuat leaderboard')
    }

    const realEntries = ((leaderboard as LiveLeaderboardEntry[]) || []).map((entry) => ({
        ...entry,
        entry_id: entry.entry_id || `user:${entry.user_id}`,
        is_bot: false,
        started_at: entry.started_at || new Date(
            new Date(leaderboardEvent.starts_at).getTime() + (entry.live_rank || 0)
        ).toISOString(),
    }))
    const botEntries = (await ensureEventLeaderboardBots(admin, eventId)).map((entry) => computeDisplayedBotEntry({
        entry,
        eventStatus: leaderboardEvent.status,
    }))

    return {
        event: leaderboardEvent,
        leaderboard: rankEventLeaderboardEntries([...realEntries, ...botEntries])
    }
}
