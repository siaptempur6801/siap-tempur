import { createV2AdminClient } from '@/lib/utils/supabase/server'
import type { CanonicalExamType, ResolvedExam } from '@/src/repositories/exam.repository'

type ExamRow = {
    id: string
    program_id: string
    track_id: string
    exam_type_id: string
    title: string
    slug: string
    duration_seconds: number | null
    attempt_limit: number | null
    question_order: string
    access_type: string
    required_feature_id: string | null
    token_cost: number
    starts_at: string | null
    ends_at: string | null
    status: string
}

function availableNow(exam: ExamRow) {
    const now = Date.now()
    const starts = exam.starts_at ? Date.parse(exam.starts_at) : null
    const ends = exam.ends_at ? Date.parse(exam.ends_at) : null
    return (starts === null || starts <= now) && (ends === null || ends >= now)
}

export class ConfiguredExamRepository {
    async findBySlug(input: {
        programCode: string
        trackCode: string
        slug: string
    }): Promise<ResolvedExam | null> {
        const admin = await createV2AdminClient()
        const programCode = input.programCode.trim().toUpperCase()
        const trackCode = input.trackCode.trim().toUpperCase()
        const slug = input.slug.trim().toLowerCase()
        if (!programCode || !trackCode || !slug) return null

        const { data: program, error: programError } = await admin
            .from('programs')
            .select('id')
            .eq('code', programCode)
            .maybeSingle()
        if (programError) throw programError
        if (!program) return null

        const { data: track, error: trackError } = await admin
            .from('tracks')
            .select('id')
            .eq('program_id', program.id)
            .eq('code', trackCode)
            .maybeSingle()
        if (trackError) throw trackError
        if (!track) return null

        const { data: rawExam, error: examError } = await admin
            .from('exams')
            .select('id, program_id, track_id, exam_type_id, title, slug, duration_seconds, attempt_limit, question_order, access_type, required_feature_id, token_cost, starts_at, ends_at, status')
            .eq('program_id', program.id)
            .eq('track_id', track.id)
            .eq('slug', slug)
            .in('status', ['active', 'ACTIVE', 'scheduled', 'SCHEDULED'])
            .maybeSingle()
        if (examError) throw examError
        const exam = rawExam as ExamRow | null
        if (!exam || !availableNow(exam)) return null

        const { data: examType, error: typeError } = await admin
            .from('exam_types')
            .select('code')
            .eq('id', exam.exam_type_id)
            .maybeSingle()
        if (typeError) throw typeError
        if (!examType) return null

        return {
            id: exam.id,
            programId: exam.program_id,
            trackId: exam.track_id,
            examTypeId: exam.exam_type_id,
            examTypeCode: String(examType.code) as CanonicalExamType,
            title: exam.title,
            slug: exam.slug,
            durationSeconds: exam.duration_seconds,
            attemptLimit: exam.attempt_limit,
            questionOrder: exam.question_order,
            accessType: exam.access_type,
            requiredFeatureId: exam.required_feature_id,
            tokenCost: exam.token_cost,
            startsAt: exam.starts_at,
            endsAt: exam.ends_at,
            subjectId: null,
            subjectCode: null,
        }
    }
}

export const configuredExamRepository = new ConfiguredExamRepository()
