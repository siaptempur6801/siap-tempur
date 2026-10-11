import { createAdminClient, createV2AdminClient } from '@/lib/utils/supabase/server'
import type { Json } from '@/types/database.types'

type NationalLeaderboardEntry = {
  rank_pos: number
  user_id: string
  full_name: string
  avatar_url: string | null
  top_score: number
  score_twk: number
  score_tiu: number
  score_tkp: number
  duration_seconds: number | null
  attempt_id: string | null
  is_current_user?: boolean
}

type GenericRow = Record<string, unknown>

function readMetadataNumber(metadata: Json, key: string) {
  if (!metadata || Array.isArray(metadata) || typeof metadata !== 'object') return 0
  const value = metadata[key]
  return typeof value === 'number' ? value : Number(value ?? 0) || 0
}

function readMetadataNullableNumber(metadata: Json, key: string) {
  if (!metadata || Array.isArray(metadata) || typeof metadata !== 'object') return null
  const value = metadata[key]
  if (value === null || value === undefined) return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function readMetadataString(metadata: Json, key: string) {
  if (!metadata || Array.isArray(metadata) || typeof metadata !== 'object') return null
  const value = metadata[key]
  return typeof value === 'string' ? value : null
}

class LeaderboardService {
  async syncForAttempt(userId: string, attemptId: string) {
    const admin = await createV2AdminClient()
    const { data: attempt, error: attemptError } = await admin
      .from('exam_attempts')
      .select('id, user_id, exam_id, status, metadata')
      .eq('id', attemptId)
      .eq('user_id', userId)
      .maybeSingle()
    if (attemptError) throw attemptError
    if (!attempt || String(attempt.status).toLowerCase() !== 'completed') return []

    const metadata = attempt.metadata as Json
    if (readMetadataString(metadata, 'practiceKind') === 'event') return []

    const { data: exam, error: examError } = await admin
      .from('exams')
      .select('program_id, track_id, exam_type_id')
      .eq('id', String(attempt.exam_id))
      .maybeSingle()
    if (examError) throw examError
    if (!exam) return []

    const { data: examType, error: typeError } = await admin
      .from('exam_types')
      .select('code')
      .eq('id', String(exam.exam_type_id))
      .maybeSingle()
    if (typeError) throw typeError
    if (examType?.code !== 'FULL_TRYOUT') return []

    const now = new Date().toISOString()
    const { data: boards, error: boardError } = await admin
      .from('leaderboards')
      .select('id, leaderboard_type, program_id, track_id')
      .in('status', ['active', 'ACTIVE'])
      .lte('starts_at', now)
      .gte('ends_at', now)
    if (boardError) throw boardError

    const examProgramId = String(exam.program_id ?? '')
    const examTrackId = String(exam.track_id ?? '')
    const eligibleBoards = (boards ?? []).filter((board) => {
      const type = String(board.leaderboard_type).toLowerCase()
      if (type !== 'national' && type !== 'regular') return false
      const boardProgramId = board.program_id ? String(board.program_id) : null
      const boardTrackId = board.track_id ? String(board.track_id) : null
      if (boardProgramId && boardProgramId !== examProgramId) return false
      if (boardTrackId && boardTrackId !== examTrackId) return false
      return true
    })
    if (eligibleBoards.length === 0) return []

    const rpcAdmin = await createAdminClient()
    // `p_user_id` WAJIB dikirim di jalur submit. Tanpa itu fungsi akan
    // menghitung ulang SELURUH papan setiap kali satu peserta selesai
    // (perilaku lama, O(N^2) penulisan). Dengan `p_user_id`, hanya baris
    // peserta ini yang dihitung ulang dan hanya peringkat yang benar-benar
    // bergeser yang ditulis. Lihat migration
    // `20260918140000_leaderboard_incremental_recalculation.sql`.
    await Promise.all(
      eligibleBoards.map(async (board) => {
        const { error } = await rpcAdmin.rpc('recalculate_leaderboard', {
          p_leaderboard_id: String(board.id),
          p_user_id: userId,
        })
        if (error) throw error
      }),
    )

    return eligibleBoards.map((board) => String(board.id))
  }

  async getNationalLeaderboard(userId: string, limit = 100) {
    const admin = await createV2AdminClient()
    const now = new Date().toISOString()

    const { data: program, error: programError } = await admin
      .from('programs')
      .select('id')
      .eq('code', 'CPNS')
      .maybeSingle()
    if (programError) throw programError
    if (!program) return { board: null, rankings: [], currentUserRank: null }

    const { data: track, error: trackError } = await admin
      .from('tracks')
      .select('id')
      .eq('program_id', program.id)
      .eq('code', 'SKD')
      .maybeSingle()
    if (trackError) throw trackError
    if (!track) return { board: null, rankings: [], currentUserRank: null }

    const { data: boards, error: boardError } = await admin
      .from('leaderboards')
      .select('id, code, name, leaderboard_type, starts_at, ends_at')
      .eq('program_id', program.id)
      .eq('track_id', track.id)
      .in('status', ['active', 'ACTIVE'])
      .lte('starts_at', now)
      .gte('ends_at', now)
      .order('ends_at', { ascending: true })
    if (boardError) throw boardError

    const board =
      (boards ?? []).find((row) => String(row.leaderboard_type).toLowerCase() === 'national') ??
      null
    if (!board) return { board: null, rankings: [], currentUserRank: null }
    const boardId = String(board.id)

    const { data: topRows, error: topError } = await admin
      .from('leaderboard_entries')
      .select('user_id, score, rank, metadata')
      .eq('leaderboard_id', boardId)
      .order('rank', { ascending: true })
      .limit(limit)
    if (topError) throw topError

    let currentRow = (topRows ?? []).find((row) => String(row.user_id) === userId) ?? null
    if (!currentRow) {
      const { data, error } = await admin
        .from('leaderboard_entries')
        .select('user_id, score, rank, metadata')
        .eq('leaderboard_id', boardId)
        .eq('user_id', userId)
        .maybeSingle()
      if (error) throw error
      currentRow = data
    }

    const userIds = Array.from(
      new Set(
        [
          ...(topRows ?? []).map((row) => String(row.user_id)),
          ...(currentRow ? [String(currentRow.user_id)] : []),
        ].filter(Boolean),
      ),
    )

    const profileById = new Map<string, { full_name: string | null; avatar_url: string | null }>()
    if (userIds.length > 0) {
      const { data: profiles, error: profileError } = await admin
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds)
      if (profileError) throw profileError
      for (const profile of profiles ?? []) {
        profileById.set(String(profile.id), {
          full_name: typeof profile.full_name === 'string' ? profile.full_name : null,
          avatar_url: typeof profile.avatar_url === 'string' ? profile.avatar_url : null,
        })
      }
    }

    const mapEntry = (row: GenericRow): NationalLeaderboardEntry => {
      const metadata = (row.metadata ?? {}) as Json
      const profile = profileById.get(String(row.user_id))
      return {
        rank_pos: Number(row.rank ?? 0),
        user_id: String(row.user_id),
        full_name: profile?.full_name || 'Pejuang Tanpa Nama',
        avatar_url: profile?.avatar_url ?? null,
        top_score: Number(row.score ?? 0),
        score_twk: readMetadataNumber(metadata, 'scoreTWK'),
        score_tiu: readMetadataNumber(metadata, 'scoreTIU'),
        score_tkp: readMetadataNumber(metadata, 'scoreTKP'),
        duration_seconds: readMetadataNullableNumber(metadata, 'durationSeconds'),
        attempt_id: readMetadataString(metadata, 'attemptId'),
        is_current_user: String(row.user_id) === userId,
      }
    }

    const rankings = ((topRows ?? []) as GenericRow[]).map(mapEntry)
    const currentUserRank = currentRow ? mapEntry(currentRow as GenericRow) : null

    return {
      board: {
        id: boardId,
        code: String(board.code ?? ''),
        name: String(board.name ?? ''),
        startsAt: String(board.starts_at ?? ''),
        endsAt: String(board.ends_at ?? ''),
      },
      rankings,
      currentUserRank,
    }
  }
}

export const leaderboardService = new LeaderboardService()
