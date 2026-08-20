import { createAdminClient } from '@/lib/utils/supabase/server'

export type CatalogSubject = {
    id: string
    code: string
    name: string
    slug: string
    subjectType: string
    sortOrder: number
}

export type CatalogTrack = {
    id: string
    code: string
    name: string
    slug: string
    description: string | null
    subjects: CatalogSubject[]
}

export type CatalogProgram = {
    id: string
    code: string
    name: string
    slug: string
    description: string | null
    tracks: CatalogTrack[]
}

type SubjectRow = {
    id: string
    code: string
    name: string
    slug: string
    subject_type: string
    sort_order: number
}

type TrackRow = {
    id: string
    code: string
    name: string
    slug: string
    description: string | null
    subjects: SubjectRow[] | null
}

type ProgramRow = {
    id: string
    code: string
    name: string
    slug: string
    description: string | null
    tracks: TrackRow[] | null
}

export class CatalogRepository {
    async listActivePrograms(): Promise<CatalogProgram[]> {
        const supabase = await createAdminClient()
        const { data, error } = await supabase
            .from('programs')
            .select(`
                id,
                code,
                name,
                slug,
                description,
                tracks!inner(
                    id,
                    code,
                    name,
                    slug,
                    description,
                    status,
                    level_order,
                    subjects(
                        id,
                        code,
                        name,
                        slug,
                        subject_type,
                        sort_order,
                        status
                    )
                )
            `)
            .eq('status', 'active')
            .eq('tracks.status', 'active')
            .order('name')

        if (error) throw error

        return ((data ?? []) as unknown as ProgramRow[]).map((program) => ({
            id: program.id,
            code: program.code,
            name: program.name,
            slug: program.slug,
            description: program.description,
            tracks: (program.tracks ?? []).map((track) => ({
                id: track.id,
                code: track.code,
                name: track.name,
                slug: track.slug,
                description: track.description,
                subjects: (track.subjects ?? [])
                    .map((subject) => ({
                        id: subject.id,
                        code: subject.code,
                        name: subject.name,
                        slug: subject.slug,
                        subjectType: subject.subject_type,
                        sortOrder: subject.sort_order,
                    }))
                    .sort((a, b) => a.sortOrder - b.sortOrder),
            })),
        }))
    }
}

export const catalogRepository = new CatalogRepository()
