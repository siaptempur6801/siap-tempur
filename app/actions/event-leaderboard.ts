'use server'

import { createAdminClient, createV2AdminClient, createV2Client } from '@/lib/utils/supabase/server'
import { authorizationRepository } from '@/src/repositories/authorization.repository'
import { eventRepository } from '@/src/repositories/event.repository'
import { PERMISSIONS } from '@/src/auth/permissions'
import type { Json } from '@/types/database.types'

export interface LiveLeaderboardEntry {
    entry_id: string
    user_id: string
    full_name: string
    avatar_url: string | null
    progress_count: number
    question_count?: number
    score_twk: number
    score_tiu: number
    score_tkp: number
    total_score: number
    live_rank: number
    is_bot: boolean
    started_at: string
}

type AttemptRow = {
    id: string
    user_id: string
    status: string
    started_at: string | null
    submitted_at: string | null
    duration_used_seconds: number | null
    total_score: number | null
    metadata: Json
}

type AttemptQuestionRow = {
    id: string
    attempt_id: string
    question_snapshot: Json
}

function snapshotString(snapshot: Json, key: string) {
    if (!snapshot || Array.isArray(snapshot) || typeof snapshot !== 'object') return null
    const value = snapshot[key]
    return typeof value === 'string' ? value : null
}

function eventIsFinished(event: { status: string; ends_at: string }) {
    return String(event.status).toLowerCase() === 'closed' || Date.now() > Date.parse(event.ends_at)
}

export async function getLiveLeaderboardAction(eventId: string) {
    if (!eventId) throw new Error('Event ID tidak valid')

    const supabase = await createV2Client()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const event = await eventRepository.getEvent(eventId)
    if (!event) throw new Error('Event tidak ditemukan')

    const authorization = await authorizationRepository.getUserAuthorization(user.id)
    const canManageEvent = authorization.permissions.includes(PERMISSIONS.EVENT_MANAGE)
    const finished = eventIsFinished(event)

    if (!finished && !canManageEvent) {
        throw new Error('Live leaderboard hanya tersedia untuk admin')
    }
    if (finished && !canManageEvent) {
        const registration = await eventRepository.getRegistration(user.id, eventId)
        if (!registration) throw new Error('Leaderboard event hanya bisa dilihat peserta terdaftar')
    }

    const admin = await createV2AdminClient()
    const { data: attemptData, error: attemptError } = await admin
        .from('exam_attempts')
        .select('id, user_id, status, started_at, submitted_at, duration_used_seconds, total_score, metadata')
        .contains('metadata', { eventId })
        .in('status', ['created', 'CREATED', 'in_progress', 'IN_PROGRESS', 'completed', 'COMPLETED'])
        .order('started_at', { ascending: true, nullsFirst: false })
        .limit(5000)
    if (attemptError) throw attemptError

    const attempts = (attemptData ?? []) as AttemptRow[]
    if (attempts.length === 0) {
        return {
            event: { id: event.id, title: event.title, status: finished ? 'closed' : 'live' },
            leaderboard: [] as LiveLeaderboardEntry[],
        }
    }

    const attemptIds = attempts.map((row) => row.id)
    const userIds = Array.from(new Set(attempts.map((row) => row.user_id)))
    const [{ data: profileData, error: profileError }, { data: questionData, error: questionError }] = await Promise.all([
        admin.from('profiles').select('id, full_name, avatar_url').in('id', userIds),
        admin.from('attempt_questions').select('id, attempt_id, question_snapshot').in('attempt_id', attemptIds).limit(20000),
    ])
    if (profileError) throw profileError
    if (questionError) throw questionError

    const questions = (questionData ?? []) as AttemptQuestionRow[]
    const questionIds = questions.map((row) => row.id)
    const subjectIds = Array.from(new Set(questions
        .map((row) => snapshotString(row.question_snapshot, 'subjectId'))
        .filter((id): id is string => Boolean(id))))

    const [{ data: answerData, error: answerError }, { data: subjectData, error: subjectError }] = await Promise.all([
        questionIds.length
            ? admin.from('attempt_answers').select('attempt_question_id, selected_option_id').in('attempt_question_id', questionIds).limit(20000)
            : Promise.resolve({ data: [], error: null }),
        subjectIds.length
            ? admin.from('subjects').select('id, code').in('id', subjectIds)
            : Promise.resolve({ data: [], error: null }),
    ])
    if (answerError) throw answerError
    if (subjectError) throw subjectError

    const answers = (answerData ?? []) as Array<{ attempt_question_id: string; selected_option_id: string | null }>
    const selectedOptionIds = Array.from(new Set(answers
        .map((row) => row.selected_option_id)
        .filter((id): id is string => Boolean(id))))
    const { data: optionData, error: optionError } = selectedOptionIds.length
        ? await admin
            .from('question_options')
            .select('id, score, is_correct')
            .in('id', selectedOptionIds)
        : { data: [], error: null }
    if (optionError) throw optionError

    const profileById = new Map(((profileData ?? []) as Array<{ id: string; full_name: string | null; avatar_url: string | null }>).map((row) => [row.id, row]))
    const subjectCodeById = new Map(((subjectData ?? []) as Array<{ id: string; code: string }>).map((row) => [row.id, row.code.toUpperCase()]))
    const questionById = new Map(questions.map((row) => [row.id, row]))
    const optionById = new Map(((optionData ?? []) as Array<{ id: string; score: number | null; is_correct: boolean | null }>).map((row) => [row.id, row]))

    const questionCountByAttempt = new Map<string, number>()
    for (const question of questions) {
        questionCountByAttempt.set(question.attempt_id, (questionCountByAttempt.get(question.attempt_id) ?? 0) + 1)
    }

    const progressByAttempt = new Map<string, number>()
    const scoresByAttempt = new Map<string, { TWK: number; TIU: number; TKP: number }>()
    for (const answer of answers) {
        if (!answer.selected_option_id) continue
        const question = questionById.get(answer.attempt_question_id)
        const option = optionById.get(answer.selected_option_id)
        if (!question || !option) continue
        progressByAttempt.set(question.attempt_id, (progressByAttempt.get(question.attempt_id) ?? 0) + 1)

        const subjectId = snapshotString(question.question_snapshot, 'subjectId')
        const subjectCode = subjectId ? subjectCodeById.get(subjectId) : null
        if (!subjectCode || !['TWK', 'TIU', 'TKP'].includes(subjectCode)) continue
        const score = Number(option.score ?? (option.is_correct ? 5 : 0))
        const current = scoresByAttempt.get(question.attempt_id) ?? { TWK: 0, TIU: 0, TKP: 0 }
        current[subjectCode as 'TWK' | 'TIU' | 'TKP'] += Number.isFinite(score) ? score : 0
        scoresByAttempt.set(question.attempt_id, current)
    }

    let finalRankByUser = new Map<string, number>()
    if (finished) {
        // The generated type snapshot predates this staging RPC. Keep this
        // invocation on the server-only admin client until types are regenerated.
        const rpcAdmin = await createAdminClient()
        const { error: recalcError } = await rpcAdmin.rpc('recalculate_event_rankings', { p_event_id: eventId })
        if (recalcError) throw recalcError
        const { data: rankingData, error: rankingError } = await admin
            .from('event_rankings')
            .select('user_id, rank')
            .eq('event_id', eventId)
        if (rankingError) throw rankingError
        finalRankByUser = new Map(((rankingData ?? []) as Array<{ user_id: string; rank: number }>).map((row) => [row.user_id, row.rank]))
    }

    const entries = attempts.map((attempt) => {
        const profile = profileById.get(attempt.user_id)
        const scores = scoresByAttempt.get(attempt.id) ?? { TWK: 0, TIU: 0, TKP: 0 }
        return {
            entry_id: `user:${attempt.user_id}`,
            user_id: attempt.user_id,
            full_name: profile?.full_name || 'Pejuang Tanpa Nama',
            avatar_url: profile?.avatar_url ?? null,
            progress_count: progressByAttempt.get(attempt.id) ?? 0,
            question_count: questionCountByAttempt.get(attempt.id) ?? 0,
            score_twk: scores.TWK,
            score_tiu: scores.TIU,
            score_tkp: scores.TKP,
            total_score: scores.TWK + scores.TIU + scores.TKP,
            live_rank: finalRankByUser.get(attempt.user_id) ?? 0,
            is_bot: false,
            started_at: attempt.started_at ?? event.starts_at,
        } satisfies LiveLeaderboardEntry
    })

    if (!finished) {
        entries.sort((a, b) =>
            b.total_score - a.total_score ||
            b.progress_count - a.progress_count ||
            Date.parse(a.started_at) - Date.parse(b.started_at) ||
            a.user_id.localeCompare(b.user_id)
        )
        entries.forEach((entry, index) => { entry.live_rank = index + 1 })
    } else {
        entries.sort((a, b) => a.live_rank - b.live_rank)
    }

    return {
        event: { id: event.id, title: event.title, status: finished ? 'closed' : 'live' },
        leaderboard: entries,
    }
}
