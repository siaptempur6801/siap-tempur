import { createClient } from '@/lib/utils/supabase/server'
import type { ProgramTrackContext } from '@/src/services/catalog-context.service'

export type ReviewWorkspaceFilters = {
    subject?: string | null
    status?: string | null
    stage?: string | null
    reviewer?: string | null
    q?: string | null
}

type Row = Record<string, unknown>
type WorkspaceQuestion = Row & {
    id: unknown
    subject_id: unknown
    question_code: unknown
    stem: unknown
    status: unknown
    version: unknown
    author_id: unknown
    reviewer_id: unknown
    current_stage: string | null
    pending_review: Row | null
}

type ContentPerson = {
    id: string
    full_name: string
    display_name: string | null
    avatar_url: string | null
    status: string
    can_review: boolean
    roles: string[]
}

function stringValue(value: unknown) {
    return value == null ? '' : String(value)
}

function sameId(left: unknown, right: unknown) {
    return stringValue(left) === stringValue(right)
}

function lower(value: unknown) {
    return stringValue(value).toLowerCase()
}

function asRecord(value: unknown): Row | null {
    if (!value || Array.isArray(value) || typeof value !== 'object') return null
    return value as Row
}

function asRows(value: unknown): Row[] {
    return Array.isArray(value) ? value.flatMap((row) => asRecord(row) ? [row as Row] : []) : []
}

function reviewStageFromStatus(status: unknown) {
    switch (lower(status)) {
        case 'submitted':
        case 'editorial_review':
            return 'editorial'
        case 'academic_review':
            return 'academic'
        case 'technical_qa':
            return 'technical_qa'
        default:
            return null
    }
}

async function resolveCatalog(context: ProgramTrackContext) {
    const client = await createClient()
    const programCode = context.programCode.trim().toUpperCase()
    const trackCode = context.trackCode.trim().toUpperCase()
    const { data: program, error: programError } = await client
        .from('programs')
        .select('id, code, name')
        .eq('code', programCode)
        .maybeSingle()
    if (programError) throw programError
    if (!program) throw new Error(`PROGRAM_NOT_FOUND:${programCode}`)

    const { data: track, error: trackError } = await client
        .from('tracks')
        .select('id, code, name')
        .eq('program_id', program.id)
        .eq('code', trackCode)
        .maybeSingle()
    if (trackError) throw trackError
    if (!track) throw new Error(`TRACK_NOT_FOUND:${programCode}/${trackCode}`)

    const [{ data: subjects, error: subjectError }, { data: examTypes, error: examTypeError }] = await Promise.all([
        client.from('subjects').select('id, code, name, subject_type').eq('track_id', track.id).order('sort_order'),
        client.from('exam_types').select('id, code, name').order('code'),
    ])
    if (subjectError) throw subjectError
    if (examTypeError) throw examTypeError

    return {
        programCode,
        trackCode,
        program: { id: String(program.id), code: String(program.code), name: String(program.name) },
        track: { id: String(track.id), code: String(track.code), name: String(track.name) },
        subjects: (subjects ?? []).map((row) => ({
            id: String(row.id),
            code: String(row.code),
            name: String(row.name),
            subjectType: String(row.subject_type ?? 'mandatory'),
        })),
        examTypes: (examTypes ?? []).map((row) => ({ id: String(row.id), code: String(row.code), name: String(row.name) })),
    }
}

async function listActiveContexts() {
    const client = await createClient()
    const { data: programs, error: programError } = await client.from('programs').select('id, code, name').order('code')
    if (programError) throw programError
    const programIds = (programs ?? []).map((row) => row.id)
    if (programIds.length === 0) return []
    const { data: tracks, error: trackError } = await client.from('tracks').select('id, program_id, code, name').in('program_id', programIds).order('code')
    if (trackError) throw trackError
    const programById = new Map((programs ?? []).map((program) => [String(program.id), program]))
    return (tracks ?? []).flatMap((track) => {
        const program = programById.get(String(track.program_id))
        if (!program) return []
        return [{
            programCode: String(program.code),
            programName: String(program.name),
            trackCode: String(track.code),
            trackName: String(track.name),
        }]
    })
}

async function listContentPeople(): Promise<ContentPerson[]> {
    const client = await createClient()
    const { data, error } = await client.rpc('list_content_people')
    if (error) throw error
    if (!Array.isArray(data)) return []
    return data.flatMap((value) => {
        const row = asRecord(value)
        if (!row?.id) return []
        return [{
            id: stringValue(row.id),
            full_name: stringValue(row.full_name),
            display_name: row.display_name == null ? null : stringValue(row.display_name),
            avatar_url: row.avatar_url == null ? null : stringValue(row.avatar_url),
            status: stringValue(row.status),
            can_review: row.can_review === true,
            roles: Array.isArray(row.roles) ? row.roles.map(String) : [],
        }]
    })
}

export class ContentReviewService {
    async getWorkspaceData(
        context: ProgramTrackContext,
        filters: ReviewWorkspaceFilters = {},
        selectedQuestionId?: string | null,
    ) {
        const client = await createClient()
        const catalog = await resolveCatalog(context)

        let questionQuery = client
            .from('questions')
            .select('id, question_code, subject_id, question_type, stem, difficulty, cognitive_level, source_reference, estimated_seconds, status, version, author_id, reviewer_id, stimulus_id, stimulus_order, published_at, created_at, updated_at')
            .eq('program_id', catalog.program.id)
            .eq('track_id', catalog.track.id)
            .order('updated_at', { ascending: false })
            .limit(250)

        if (filters.subject) {
            const subject = catalog.subjects.find((row) => row.code === filters.subject)
            if (subject) questionQuery = questionQuery.eq('subject_id', subject.id)
        }
        if (filters.status) questionQuery = questionQuery.eq('status', filters.status)
        if (filters.q?.trim()) {
            const term = filters.q.trim().replace(/[%_]/g, '')
            if (term) questionQuery = questionQuery.or(`question_code.ilike.%${term}%,stem.ilike.%${term}%`)
        }

        const { data: questionRows, error: questionError } = await questionQuery
        if (questionError) throw questionError
        const baseQuestions = (questionRows ?? []) as Row[]
        const questionIds = baseQuestions.map((row) => stringValue(row.id))

        const { data: reviewRows, error: reviewError } = questionIds.length
            ? await client
                .from('content_reviews')
                .select('id, entity_id, reviewer_id, status, notes, review_stage, question_version, review_round, assigned_at, started_at, completed_at, created_at, updated_at')
                .eq('entity_type', 'question')
                .in('entity_id', questionIds)
                .order('review_round', { ascending: false })
                .order('created_at', { ascending: false })
            : { data: [], error: null }
        if (reviewError) throw reviewError

        const reviews = (reviewRows ?? []) as Row[]
        const reviewsByQuestion = new Map<string, Row[]>()
        for (const review of reviews) {
            const id = stringValue(review.entity_id)
            const rows = reviewsByQuestion.get(id) ?? []
            rows.push(review)
            reviewsByQuestion.set(id, rows)
        }

        const pendingByQuestion = new Map<string, Row>()
        for (const [id, rows] of reviewsByQuestion) {
            const pending = rows.find((row) => lower(row.status) === 'pending')
            if (pending) pendingByQuestion.set(id, pending)
        }

        let questions: WorkspaceQuestion[] = baseQuestions.map((row) => ({
            ...row,
            id: row.id,
            subject_id: row.subject_id,
            question_code: row.question_code,
            stem: row.stem,
            status: row.status,
            version: row.version,
            author_id: row.author_id,
            reviewer_id: row.reviewer_id,
            current_stage: reviewStageFromStatus(row.status),
            pending_review: pendingByQuestion.get(stringValue(row.id)) ?? null,
        }))

        if (filters.stage) questions = questions.filter((row) => row.current_stage === filters.stage)
        if (filters.reviewer === 'unassigned') {
            questions = questions.filter((row) => row.pending_review && !row.pending_review.reviewer_id)
        } else if (filters.reviewer) {
            questions = questions.filter((row) => row.pending_review && sameId(row.pending_review.reviewer_id, filters.reviewer))
        }

        const people = await listContentPeople()
        const profileById = new Map(people.map((person) => [person.id, person]))
        const reviewerCandidates = people.filter((person) => person.can_review)

        const selectedId = selectedQuestionId && questions.some((row) => sameId(row.id, selectedQuestionId))
            ? selectedQuestionId
            : questions[0] ? stringValue(questions[0].id) : null
        const selectedQuestion = selectedId
            ? questions.find((row) => sameId(row.id, selectedId)) ?? null
            : null

        let options: Row[] = []
        let explanation: Row | null = null
        let stimulus: Row | null = null
        let knowledgeMappings: Row[] = []
        let knowledgeNodes: Row[] = []
        let versions: Row[] = []
        let auditLogs: Row[] = []
        let stimulusCandidates: Row[] = []
        let subjectKnowledgeNodes: Row[] = []
        let currentReviews: Row[] = selectedId ? reviewsByQuestion.get(selectedId) ?? [] : []

        if (selectedId) {
            const { data: detailData, error: detailError } = await client.rpc('get_content_question_detail', { p_question_id: selectedId })
            if (detailError) throw detailError
            const detail = asRecord(detailData)
            options = asRows(detail?.options)
            explanation = asRecord(detail?.explanation)
            stimulus = asRecord(detail?.stimulus)
            knowledgeMappings = asRows(detail?.knowledge_mappings)
            knowledgeNodes = asRows(detail?.knowledge_nodes)
            versions = asRows(detail?.versions)
            auditLogs = asRows(detail?.audit_logs)
            stimulusCandidates = asRows(detail?.stimulus_candidates)
            subjectKnowledgeNodes = asRows(detail?.subject_knowledge_nodes)
            const detailedReviews = asRows(detail?.reviews)
            if (detailedReviews.length) currentReviews = detailedReviews
        }

        const subjectById = new Map(catalog.subjects.map((subject) => [String(subject.id), subject]))
        const counts = {
            total: questions.length,
            unassigned: questions.filter((row) => Boolean(row.pending_review && !row.pending_review.reviewer_id)).length,
            revisionRequired: questions.filter((row) => lower(row.status) === 'revision_required').length,
            approved: questions.filter((row) => lower(row.status) === 'approved').length,
            published: questions.filter((row) => lower(row.status) === 'published').length,
        }

        return {
            catalog,
            contexts: await listActiveContexts(),
            filters,
            questions,
            selectedQuestion,
            selectedId,
            currentReviews,
            options,
            explanation,
            stimulus,
            knowledgeMappings,
            knowledgeNodes,
            versions,
            auditLogs,
            stimulusCandidates,
            subjectKnowledgeNodes,
            reviewers: reviewerCandidates,
            profileById,
            subjectById,
            counts,
        }
    }
}

export const contentReviewService = new ContentReviewService()
