import { createV2AdminClient } from '@/lib/utils/supabase/server'
import type { Json } from '@/types/database.types'

function metadataString(metadata: Json, key: string) {
    if (!metadata || Array.isArray(metadata) || typeof metadata !== 'object') return null
    const value = metadata[key]
    return typeof value === 'string' ? value : null
}

export class EventRankingService {
    async syncForAttempt(userId: string, attemptId: string) {
        const admin = await createV2AdminClient()
        const { data: attempt, error: attemptError } = await admin
            .from('exam_attempts')
            .select('id, user_id, status, metadata')
            .eq('id', attemptId)
            .eq('user_id', userId)
            .maybeSingle()
        if (attemptError) throw attemptError
        if (!attempt || String(attempt.status).toLowerCase() !== 'completed') return null

        const metadata = attempt.metadata as Json
        const eventId = metadataString(metadata, 'eventId')
        if (!eventId) return null

        const registrationId = metadataString(metadata, 'eventRegistrationId')
        if (registrationId) {
            const { error: registrationError } = await admin
                .from('event_registrations')
                .update({ status: 'completed' })
                .eq('id', registrationId)
                .eq('event_id', eventId)
                .eq('user_id', userId)
            if (registrationError) throw registrationError
        }

        const { error: rankingError } = await admin.rpc('recalculate_event_rankings', {
            p_event_id: eventId,
        })
        if (rankingError) throw rankingError

        const { data: ranking, error: readError } = await admin
            .from('event_rankings')
            .select('event_id, user_id, attempt_id, score, duration_seconds, rank, rank_group, calculated_at')
            .eq('event_id', eventId)
            .eq('user_id', userId)
            .maybeSingle()
        if (readError) throw readError

        return ranking
            ? {
                eventId,
                attemptId: ranking.attempt_id,
                score: Number(ranking.score ?? 0),
                durationSeconds: Number(ranking.duration_seconds ?? 0),
                rank: Number(ranking.rank ?? 0),
                rankGroup: ranking.rank_group ?? null,
            }
            : null
    }
}

export const eventRankingService = new EventRankingService()
