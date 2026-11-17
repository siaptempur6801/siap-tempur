'use server'

import { logger } from '@/lib/logger'
import { createClient } from '@/lib/utils/supabase/server'
import { leaderboardService } from '@/src/services/leaderboard.service'

export interface LeaderboardEntry {
  rank_pos: number
  user_id: string
  full_name: string
  avatar_url: string | null
  top_score: number
  score_twk: number
  score_tiu: number
  score_tkp: number
  duration_seconds?: number | null
  attempt_id?: string | null
  is_current_user?: boolean
}

export interface NationalLeaderboardResult {
  currentUserId: string | null
  rankings: LeaderboardEntry[]
  currentUserRank: LeaderboardEntry | null
  error?: string
}

export async function getNationalLeaderboardAction(): Promise<NationalLeaderboardResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      currentUserId: null,
      rankings: [],
      currentUserRank: null,
      error: 'Unauthorized',
    }
  }

  try {
    const result = await leaderboardService.getNationalLeaderboard(user.id, 100)
    return {
      currentUserId: user.id,
      rankings: result.rankings,
      currentUserRank: result.currentUserRank,
    }
  } catch (error) {
    logger.warn('National leaderboard fetch failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    return {
      currentUserId: user.id,
      rankings: [],
      currentUserRank: null,
      error: 'Gagal memuat ranking nasional',
    }
  }
}
