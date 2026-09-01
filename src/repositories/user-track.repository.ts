import { createAdminClient } from '@/lib/utils/supabase/server'

export type UserTrackRecord = {
    id: string
    userId: string
    trackId: string
    status: string
    targetYear: number | null
    startedAt: string
}

export class UserTrackRepository {
    async listActiveByUser(userId: string): Promise<UserTrackRecord[]> {
        const supabase = await createAdminClient()
        const { data, error } = await supabase
            .from('user_tracks')
            .select('id, user_id, track_id, status, target_year, started_at')
            .eq('user_id', userId)
            .eq('status', 'active')
            .order('started_at', { ascending: true })

        if (error) throw error

        return (data ?? []).map((row) => ({
            id: row.id,
            userId: row.user_id,
            trackId: row.track_id,
            status: row.status,
            targetYear: row.target_year,
            startedAt: row.started_at,
        }))
    }

    async getPreferences(userTrackId: string) {
        const supabase = await createAdminClient()
        const { data, error } = await supabase
            .from('user_track_preferences')
            .select('*')
            .eq('user_track_id', userTrackId)
            .maybeSingle()

        if (error) throw error
        return data
    }
}

export const userTrackRepository = new UserTrackRepository()
