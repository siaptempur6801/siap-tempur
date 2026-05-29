'use server'

import { createClient } from '@/lib/utils/supabase/server'
import { logger } from '@/lib/logger'

export interface LiveLeaderboardEntry {
    user_id: string
    full_name: string
    avatar_url: string | null
    progress_count: number
    live_rank: number
}

export async function getLiveLeaderboardAction(eventId: string) {
    if (!eventId) {
        throw new Error('Gagal memuat leaderboard: event ID tidak valid')
    }

    const supabase = await createClient()

    // 1. Fetch event details first. Scheduled/closed events should show an empty board,
    // not fail because the live RPC is not relevant yet.
    const { data: event, error: eventError } = await supabase
        .from('tryout_events')
        .select('id, title, status')
        .eq('id', eventId)
        .single()
        
    if (eventError) {
        throw new Error('Event tidak ditemukan')
    }

    if (event.status !== 'live') {
        return {
            event,
            leaderboard: []
        }
    }

    // 2. Fetch live leaderboard using RPC
    const { data: leaderboard, error } = await supabase.rpc('get_live_event_leaderboard', {
        p_event_id: eventId
    })

    if (error) {
        if (error.code === 'PGRST202' || error.message.includes('schema cache')) {
            logger.warn('Live leaderboard RPC unavailable in schema cache', { eventId, error })

            return {
                event,
                leaderboard: []
            }
        }

        logger.error('Live leaderboard fetch failed', error, { eventId })
        throw new Error('Gagal memuat leaderboard')
    }

    return {
        event,
        leaderboard: (leaderboard as LiveLeaderboardEntry[]) || []
    }
}
