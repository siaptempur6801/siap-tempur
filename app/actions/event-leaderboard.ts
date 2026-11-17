'use server'

import { createAdminClient, createV2AdminClient, createV2Client } from '@/lib/utils/supabase/server'
import { authorizationRepository } from '@/src/repositories/authorization.repository'
import { eventRepository } from '@/src/repositories/event.repository'
import { PERMISSIONS } from '@/src/auth/permissions'
import type { Json } from '@/types/database.types'

const POSTGREST_PAGE_SIZE = 1000
const POSTGREST_FILTER_BATCH_SIZE = 200
const POSTGREST_BATCH_CONCURRENCY = 8

type PostgrestPageResult = {
  data: unknown[] | null
  error: { message: string } | null
}

async function fetchAllPages<T>(
  loadPage: (from: number, to: number) => Promise<PostgrestPageResult>,
): Promise<T[]> {
  const rows: T[] = []

  for (let from = 0; ; from += POSTGREST_PAGE_SIZE) {
    const { data, error } = await loadPage(from, from + POSTGREST_PAGE_SIZE - 1)
    if (error) throw error

    const page = (data ?? []) as T[]
    rows.push(...page)
    if (page.length < POSTGREST_PAGE_SIZE) return rows
  }
}

async function fetchRowsByIds<T>(
  ids: string[],
  loadPage: (idBatch: string[], from: number, to: number) => Promise<PostgrestPageResult>,
): Promise<T[]> {
  const rows: T[] = []
  const idBatches: string[][] = []

  // Keep `in (...)` filters bounded so large events do not create enormous URLs.
  for (let index = 0; index < ids.length; index += POSTGREST_FILTER_BATCH_SIZE) {
    idBatches.push(ids.slice(index, index + POSTGREST_FILTER_BATCH_SIZE))
  }

  // Bound concurrency to keep complete pagination from flooding PostgREST.
  for (let index = 0; index < idBatches.length; index += POSTGREST_BATCH_CONCURRENCY) {
    const batchRows = await Promise.all(
      idBatches
        .slice(index, index + POSTGREST_BATCH_CONCURRENCY)
        .map((idBatch) => fetchAllPages<T>((from, to) => loadPage(idBatch, from, to))),
    )
    for (const batch of batchRows) {
      for (const row of batch) rows.push(row)
    }
  }

  return rows
}

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
  const {
    data: { user },
  } = await supabase.auth.getUser()
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
  const attempts = await fetchAllPages<AttemptRow>(async (from, to) => {
    const { data, error } = await admin
      .from('exam_attempts')
      .select(
        'id, user_id, status, started_at, submitted_at, duration_used_seconds, total_score, metadata',
      )
      .contains('metadata', { eventId })
      .in('status', ['created', 'CREATED', 'in_progress', 'IN_PROGRESS', 'completed', 'COMPLETED'])
      .order('started_at', { ascending: true, nullsFirst: false })
      .order('id', { ascending: true })
      .range(from, to)
    return { data, error }
  })
  if (attempts.length === 0) {
    return {
      event: { id: event.id, title: event.title, status: finished ? 'closed' : 'live' },
      leaderboard: [] as LiveLeaderboardEntry[],
    }
  }

  const attemptIds = attempts.map((row) => row.id)
  const userIds = Array.from(new Set(attempts.map((row) => row.user_id)))
  const [profileData, questions] = await Promise.all([
    fetchRowsByIds<{
      id: string
      full_name: string | null
      avatar_url: string | null
    }>(userIds, async (idBatch, from, to) => {
      const { data, error } = await admin
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', idBatch)
        .order('id', { ascending: true })
        .range(from, to)
      return { data, error }
    }),
    fetchRowsByIds<AttemptQuestionRow>(attemptIds, async (idBatch, from, to) => {
      const { data, error } = await admin
        .from('attempt_questions')
        .select('id, attempt_id, question_snapshot')
        .in('attempt_id', idBatch)
        .order('attempt_id', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to)
      return { data, error }
    }),
  ])
  const questionIds = questions.map((row) => row.id)
  const subjectIds = Array.from(
    new Set(
      questions
        .map((row) => snapshotString(row.question_snapshot, 'subjectId'))
        .filter((id): id is string => Boolean(id)),
    ),
  )

  const [answers, subjectData] = await Promise.all([
    fetchRowsByIds<{
      id: string
      attempt_question_id: string
      selected_option_id: string | null
    }>(questionIds, async (idBatch, from, to) => {
      const { data, error } = await admin
        .from('attempt_answers')
        .select('id, attempt_question_id, selected_option_id')
        .in('attempt_question_id', idBatch)
        .order('attempt_question_id', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to)
      return { data, error }
    }),
    fetchRowsByIds<{ id: string; code: string }>(subjectIds, async (idBatch, from, to) => {
      const { data, error } = await admin
        .from('subjects')
        .select('id, code')
        .in('id', idBatch)
        .order('id', { ascending: true })
        .range(from, to)
      return { data, error }
    }),
  ])

  const selectedOptionIds = Array.from(
    new Set(answers.map((row) => row.selected_option_id).filter((id): id is string => Boolean(id))),
  )
  const optionData = await fetchRowsByIds<{
    id: string
    score: number | null
    is_correct: boolean | null
  }>(selectedOptionIds, async (idBatch, from, to) => {
    const { data, error } = await admin
      .from('question_options')
      .select('id, score, is_correct')
      .in('id', idBatch)
      .order('id', { ascending: true })
      .range(from, to)
    return { data, error }
  })

  const profileById = new Map(profileData.map((row) => [row.id, row]))
  const subjectCodeById = new Map(subjectData.map((row) => [row.id, row.code.toUpperCase()]))
  const questionById = new Map(questions.map((row) => [row.id, row]))
  const optionById = new Map(optionData.map((row) => [row.id, row]))

  const questionCountByAttempt = new Map<string, number>()
  for (const question of questions) {
    questionCountByAttempt.set(
      question.attempt_id,
      (questionCountByAttempt.get(question.attempt_id) ?? 0) + 1,
    )
  }

  const progressByAttempt = new Map<string, number>()
  const scoresByAttempt = new Map<string, { TWK: number; TIU: number; TKP: number }>()
  for (const answer of answers) {
    if (!answer.selected_option_id) continue
    const question = questionById.get(answer.attempt_question_id)
    const option = optionById.get(answer.selected_option_id)
    if (!question || !option) continue
    progressByAttempt.set(
      question.attempt_id,
      (progressByAttempt.get(question.attempt_id) ?? 0) + 1,
    )

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
    const { error: recalcError } = await rpcAdmin.rpc('recalculate_event_rankings', {
      p_event_id: eventId,
    })
    if (recalcError) throw recalcError
    const rankingData = await fetchAllPages<{ user_id: string; rank: number }>(async (from, to) => {
      const { data, error } = await admin
        .from('event_rankings')
        .select('user_id, rank')
        .eq('event_id', eventId)
        .order('user_id', { ascending: true })
        .range(from, to)
      return { data, error }
    })
    finalRankByUser = new Map(rankingData.map((row) => [row.user_id, row.rank]))
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
    entries.sort(
      (a, b) =>
        b.total_score - a.total_score ||
        b.progress_count - a.progress_count ||
        Date.parse(a.started_at) - Date.parse(b.started_at) ||
        a.user_id.localeCompare(b.user_id),
    )
    entries.forEach((entry, index) => {
      entry.live_rank = index + 1
    })
  } else {
    entries.sort((a, b) => a.live_rank - b.live_rank)
  }

  return {
    event: { id: event.id, title: event.title, status: finished ? 'closed' : 'live' },
    leaderboard: entries,
  }
}
