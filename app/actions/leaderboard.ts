'use server'

import { logger } from '@/lib/logger'
import { createClient } from '@/lib/utils/supabase/server'

export interface LeaderboardEntry {
    rank_pos: number
    user_id: string
    full_name: string
    avatar_url: string | null
    top_score: number
    score_twk: number
    score_tiu: number
    score_tkp: number
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
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return {
            currentUserId: null,
            rankings: [],
            currentUserRank: null,
            error: 'Unauthorized',
        }
    }

    const { data, error } = await supabase.rpc('get_national_leaderboard', {
        p_limit: 100,
        p_user_id: user.id,
    })

    if (error) {
        logger.warn('National leaderboard fetch failed', { error: error.message })
        return {
            currentUserId: user.id,
            rankings: [],
            currentUserRank: null,
            error: 'Gagal memuat ranking nasional',
        }
    }

    const entries = (data ?? []) as LeaderboardEntry[]
    const rankings = entries.filter((entry) => entry.rank_pos <= 100)
    const currentUserRank = entries.find((entry) => entry.user_id === user.id) ?? null

    return {
        currentUserId: user.id,
        rankings,
        currentUserRank,
    }
}
