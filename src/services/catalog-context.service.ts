import { createV2AdminClient } from '@/lib/utils/supabase/server'

export type ProgramTrackContext = {
    programCode: string
    trackCode: string
}

export type ResolvedCatalogContext = ProgramTrackContext & {
    program: { id: string; code: string; name: string }
    track: { id: string; code: string; name: string }
    subjects: Array<{ id: string; code: string; name: string; subjectType: string }>
    examTypes: Array<{ id: string; code: string; name: string }>
}

export const CPNS_SKD_CONTEXT: ProgramTrackContext = {
    programCode: 'CPNS',
    trackCode: 'SKD',
}

export const TKA_SD_CONTEXT: ProgramTrackContext = {
    programCode: 'TKA',
    trackCode: 'SD',
}

export const TKA_SMP_CONTEXT: ProgramTrackContext = {
    programCode: 'TKA',
    trackCode: 'SMP',
}

export const TKA_SMA_CONTEXT: ProgramTrackContext = {
    programCode: 'TKA',
    trackCode: 'SMA',
}

function normalizeCode(value: string, label: string) {
    const normalized = value.trim().toUpperCase()
    if (!normalized) throw new Error(`${label}_REQUIRED`)
    return normalized
}

export class CatalogContextService {
    async resolve(context: ProgramTrackContext): Promise<ResolvedCatalogContext> {
        const admin = await createV2AdminClient()
        const programCode = normalizeCode(context.programCode, 'PROGRAM_CODE')
        const trackCode = normalizeCode(context.trackCode, 'TRACK_CODE')

        const { data: program, error: programError } = await admin
            .from('programs')
            .select('id, code, name')
            .eq('code', programCode)
            .maybeSingle()
        if (programError) throw programError
        if (!program) throw new Error(`PROGRAM_NOT_FOUND:${programCode}`)

        const { data: track, error: trackError } = await admin
            .from('tracks')
            .select('id, code, name')
            .eq('program_id', program.id)
            .eq('code', trackCode)
            .maybeSingle()
        if (trackError) throw trackError
        if (!track) throw new Error(`TRACK_NOT_FOUND:${programCode}/${trackCode}`)

        const [{ data: subjects, error: subjectError }, { data: examTypes, error: typeError }] = await Promise.all([
            admin
                .from('subjects')
                .select('id, code, name, subject_type')
                .eq('track_id', track.id)
                .in('status', ['active', 'ACTIVE'])
                .order('sort_order', { ascending: true }),
            admin
                .from('exam_types')
                .select('id, code, name')
                .order('code', { ascending: true }),
        ])
        if (subjectError) throw subjectError
        if (typeError) throw typeError

        return {
            programCode,
            trackCode,
            program: {
                id: String(program.id),
                code: String(program.code),
                name: String(program.name),
            },
            track: {
                id: String(track.id),
                code: String(track.code),
                name: String(track.name),
            },
            subjects: (subjects ?? []).map((row) => ({
                id: String(row.id),
                code: String(row.code),
                name: String(row.name),
                subjectType: String(row.subject_type ?? 'mandatory'),
            })),
            examTypes: (examTypes ?? []).map((row) => ({
                id: String(row.id),
                code: String(row.code),
                name: String(row.name),
            })),
        }
    }

    async listActiveContexts() {
        const admin = await createV2AdminClient()
        const { data: programs, error: programsError } = await admin
            .from('programs')
            .select('id, code, name, status')
            .in('status', ['active', 'ACTIVE'])
            .order('code', { ascending: true })
        if (programsError) throw programsError

        const programIds = (programs ?? []).map((row) => row.id)
        if (!programIds.length) return []

        const { data: tracks, error: tracksError } = await admin
            .from('tracks')
            .select('id, program_id, code, name, status')
            .in('program_id', programIds)
            .in('status', ['active', 'ACTIVE'])
            .order('code', { ascending: true })
        if (tracksError) throw tracksError

        const programById = new Map((programs ?? []).map((row) => [String(row.id), row]))
        return (tracks ?? []).map((track) => {
            const program = programById.get(String(track.program_id))
            if (!program) throw new Error(`PROGRAM_NOT_FOUND_FOR_TRACK:${String(track.id)}`)
            return {
                programCode: String(program.code),
                programName: String(program.name),
                trackCode: String(track.code),
                trackName: String(track.name),
            }
        })
    }
}

export const catalogContextService = new CatalogContextService()
