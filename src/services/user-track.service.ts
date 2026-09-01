import { createClient, createV2AdminClient } from '@/lib/utils/supabase/server'
import { catalogContextService, type ProgramTrackContext } from '@/src/services/catalog-context.service'
import type { Json } from '@/types/database.types'

export type UserTrackPreferenceInput = {
    targetPosition?: string | null
    targetInstitution?: string | null
    schoolName?: string | null
    schoolGrade?: string | null
    targetUniversity?: string | null
    targetMajor?: string | null
    preferences?: Json
}

export type UserTrackView = {
    id: string
    userId: string
    trackId: string
    programCode: string
    programName: string
    trackCode: string
    trackName: string
    status: string
    targetYear: number | null
    startedAt: string
    completedAt: string | null
    preference: {
        targetPosition: string | null
        targetInstitution: string | null
        schoolName: string | null
        schoolGrade: string | null
        targetUniversity: string | null
        targetMajor: string | null
        preferences: Json
    } | null
}

function nowIso() {
    return new Date().toISOString()
}

export class UserTrackService {
    async activateTrack(input: {
        userId: string
        context: ProgramTrackContext
        targetYear?: number | null
        preference?: UserTrackPreferenceInput
    }) {
        const programCode = input.context.programCode.trim().toUpperCase()
        const trackCode = input.context.trackCode.trim().toUpperCase()
        if (!programCode || !trackCode) throw new Error('PROGRAM_TRACK_CONTEXT_REQUIRED')

        const supabase = await createClient()
        const { data, error } = await supabase.rpc('activate_user_track', {
            p_program_code: programCode,
            p_track_code: trackCode,
            p_target_year: input.targetYear ?? null,
            p_school_name: input.preference?.schoolName ?? null,
            p_school_grade: input.preference?.schoolGrade ?? null,
        })
        if (error) throw error

        const payload = data && typeof data === 'object' && !Array.isArray(data)
            ? data as Record<string, unknown>
            : null
        const id = typeof payload?.userTrackId === 'string' ? payload.userTrackId : null
        if (!id) throw new Error('USER_TRACK_ACTIVATION_INVALID_RESPONSE')

        return { id, programCode, trackCode }
    }

    async pauseTrack(input: { userId: string; context: ProgramTrackContext }) {
        const catalog = await catalogContextService.resolve(input.context)
        const admin = await createV2AdminClient()
        const { error } = await admin
            .from('user_tracks')
            .update({ status: 'paused', updated_at: nowIso() })
            .eq('user_id', input.userId)
            .eq('track_id', catalog.track.id)
        if (error) throw error
    }

    async completeTrack(input: { userId: string; context: ProgramTrackContext }) {
        const catalog = await catalogContextService.resolve(input.context)
        const admin = await createV2AdminClient()
        const now = nowIso()
        const { error } = await admin
            .from('user_tracks')
            .update({ status: 'completed', completed_at: now, updated_at: now })
            .eq('user_id', input.userId)
            .eq('track_id', catalog.track.id)
        if (error) throw error
    }

    async updatePreference(userTrackId: string, input: UserTrackPreferenceInput) {
        const admin = await createV2AdminClient()
        const { error } = await admin
            .from('user_track_preferences')
            .upsert({
                user_track_id: userTrackId,
                target_position: input.targetPosition ?? null,
                target_institution: input.targetInstitution ?? null,
                school_name: input.schoolName ?? null,
                school_grade: input.schoolGrade ?? null,
                target_university: input.targetUniversity ?? null,
                target_major: input.targetMajor ?? null,
                preferences: input.preferences ?? {},
                updated_at: nowIso(),
            }, { onConflict: 'user_track_id' })
        if (error) throw error
    }

    async getForUser(input: { userId: string; context: ProgramTrackContext }) {
        const catalog = await catalogContextService.resolve(input.context)
        const all = await this.listForUser(input.userId)
        return all.find((row) => row.trackId === catalog.track.id) ?? null
    }

    async listForUser(userId: string): Promise<UserTrackView[]> {
        const admin = await createV2AdminClient()
        const { data: rows, error } = await admin
            .from('user_tracks')
            .select('id, user_id, track_id, status, target_year, started_at, completed_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: true })
        if (error) throw error
        if (!rows?.length) return []

        const trackIds = Array.from(new Set(rows.map((row) => String(row.track_id))))
        const userTrackIds = rows.map((row) => String(row.id))
        const [{ data: tracks, error: trackError }, { data: preferences, error: preferenceError }] = await Promise.all([
            admin
                .from('tracks')
                .select('id, program_id, code, name')
                .in('id', trackIds),
            admin
                .from('user_track_preferences')
                .select('user_track_id, target_position, target_institution, school_name, school_grade, target_university, target_major, preferences')
                .in('user_track_id', userTrackIds),
        ])
        if (trackError) throw trackError
        if (preferenceError) throw preferenceError

        const programIds = Array.from(new Set((tracks ?? []).map((track) => String(track.program_id))))
        const { data: programs, error: programError } = await admin
            .from('programs')
            .select('id, code, name')
            .in('id', programIds)
        if (programError) throw programError

        const trackById = new Map((tracks ?? []).map((row) => [String(row.id), row]))
        const programById = new Map((programs ?? []).map((row) => [String(row.id), row]))
        const preferenceByUserTrack = new Map((preferences ?? []).map((row) => [String(row.user_track_id), row]))

        return rows.map((row) => {
            const track = trackById.get(String(row.track_id))
            if (!track) throw new Error(`TRACK_NOT_FOUND:${String(row.track_id)}`)
            const program = programById.get(String(track.program_id))
            if (!program) throw new Error(`PROGRAM_NOT_FOUND_FOR_TRACK:${String(track.program_id)}`)
            const preference = preferenceByUserTrack.get(String(row.id))

            return {
                id: String(row.id),
                userId: String(row.user_id),
                trackId: String(row.track_id),
                programCode: String(program.code),
                programName: String(program.name),
                trackCode: String(track.code),
                trackName: String(track.name),
                status: String(row.status),
                targetYear: row.target_year ?? null,
                startedAt: String(row.started_at),
                completedAt: row.completed_at ? String(row.completed_at) : null,
                preference: preference ? {
                    targetPosition: preference.target_position ?? null,
                    targetInstitution: preference.target_institution ?? null,
                    schoolName: preference.school_name ?? null,
                    schoolGrade: preference.school_grade ?? null,
                    targetUniversity: preference.target_university ?? null,
                    targetMajor: preference.target_major ?? null,
                    preferences: preference.preferences ?? {},
                } : null,
            }
        })
    }
}

export const userTrackService = new UserTrackService()
