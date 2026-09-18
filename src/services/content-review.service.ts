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
    /**
     * Menghitung jumlah soal per status sebagai AGREGAT SELURUH TABEL.
     *
     * KENAPA BUKAN DARI ARRAY `questions`
     *   Sebelumnya angka-angka ini dihitung dari hasil query daftar soal, yang
     *   dibatasi `.limit(250)`. Pada context dengan lebih dari 250 soal, jendela
     *   itu hanya memuat sebagian status — dan karena diurutkan `updated_at desc`,
     *   yang terpotong adalah soal-soal lama. Contoh nyata di staging
     *   (CPNS/SKD, 573 soal: 140 published + 433 draft): 250 baris terbaru
     *   SELURUHNYA draft, sehingga dashboard dan halaman review melaporkan
     *   `published = 0` — angka yang menyesatkan admin.
     *
     *   Sekarang dihitung dengan `count: 'exact', head: true` per status, tanpa
     *   menarik satu baris pun. Satu query per status, dijalankan paralel.
     *
     * `total` adalah jumlah seluruh soal pada context ini, terlepas dari filter
     * yang sedang aktif — sama seperti sebelumnya, di mana `total` dihitung
     * setelah filter stage/reviewer diterapkan. Perhatikan bahwa filter
     * stage/reviewer tetap TIDAK memengaruhi angka status (perilaku lama yang
     * dipertahankan), sedangkan filter subject/status/q memang mempersempit
     * `questions` di `getWorkspaceData` — dan sejak perubahan ini tidak lagi
     * mempersempit `counts`.
     *
     * `unassigned` tetap dihitung dari review yang benar-benar tertunda pada
     * jendela soal yang dimuat, karena "belum ditugaskan" hanya bermakna untuk
     * soal yang punya review pending. Artinya angka ini memang dibatasi
     * `p_limit` — perilaku yang sama seperti sebelumnya.
     */
    private async countQuestionsByStatus(
        catalog: { program: { id: string }; track: { id: string } },
        unassignedWithinQuestionIds: string[],
    ) {
        const client = await createClient()
        const base = () => client
            .from('questions')
            .select('id', { count: 'exact', head: true })
            .eq('program_id', catalog.program.id)
            .eq('track_id', catalog.track.id)

        const [total, published, approved, revisionRequired, pendingReviews] = await Promise.all([
            base(),
            base().eq('status', 'published'),
            base().eq('status', 'approved'),
            base().eq('status', 'revision_required'),
            unassignedWithinQuestionIds.length
                ? client
                    .from('content_reviews')
                    .select('entity_id, reviewer_id', { count: 'exact' })
                    .eq('entity_type', 'question')
                    .eq('status', 'pending')
                    .in('entity_id', unassignedWithinQuestionIds)
                : Promise.resolve({ data: [], error: null, count: 0 }),
        ])

        for (const result of [total, published, approved, revisionRequired, pendingReviews]) {
            if (result.error) throw result.error
        }

        // Selaras dengan perhitungan lama di `getWorkspaceData`: satu review
        // pending tanpa reviewer = satu soal belum ditugaskan.
        const unassigned = new Set(
            (pendingReviews.data ?? [])
                .filter((row) => !row.reviewer_id)
                .map((row) => String(row.entity_id)),
        ).size

        return {
            total: total.count ?? 0,
            unassigned,
            published: published.count ?? 0,
            approved: approved.count ?? 0,
            revisionRequired: revisionRequired.count ?? 0,
        }
    }

    /**
     * Ringkasan content untuk dashboard admin.
     *
     * KENAPA TERPISAH DARI `getWorkspaceData`
     *   Dashboard hanya membutuhkan: context (program/track), beberapa angka
     *   status, dan 6 baris teratas untuk "Review queue". Tetapi ia memanggil
     *   `getWorkspaceData`, yang jauh lebih berat:
     *
     *     1. menarik 250 soal LENGKAP dengan `stem`;
     *     2. menarik SELURUH `content_reviews` untuk 250 soal itu;
     *     3. memanggil RPC `get_content_question_detail` untuk satu soal terpilih
     *        — RPC itu mengembalikan opsi, pembahasan, stimulus, knowledge
     *        mapping, versi, audit log, dan kandidat stimulus dalam satu payload.
     *
     *   Tidak satu pun dari (2) dan (3) dipakai dashboard. Lihat
     *   `app/admin/AdminOverview.tsx`: ia hanya membaca `catalog`, `counts`,
     *   `questions` (untuk hitungan tahap review + 6 baris queue), dan
     *   `subjectById`.
     */
    async getReviewSummary(context: ProgramTrackContext) {
        const client = await createClient()
        const catalog = await resolveCatalog(context)

        // Kolom minimum yang benar-benar dibaca dashboard. `updated_at` tetap
        // diperlukan karena urutannya menentukan isi jendela 250 baris yang
        // dipakai untuk "Review queue" dan hitungan tahap review.
        const { data, error } = await client
            .from('questions')
            .select('id, question_code, subject_id, status, version, stem')
            .eq('program_id', catalog.program.id)
            .eq('track_id', catalog.track.id)
            .order('updated_at', { ascending: false })
            .limit(250)
        if (error) throw error

        const questions = (data ?? []) as Row[]
        const subjectById = new Map(catalog.subjects.map((subject) => [String(subject.id), subject]))
        const counts = await this.countQuestionsByStatus(catalog, questions.map((row) => stringValue(row.id)))

        return { catalog, questions, subjectById, counts }
    }

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
        // Agregat seluruh tabel — lihat `countQuestionsByStatus`. Sebelumnya
        // angka ini dihitung dari array `questions` yang sudah difilter dan
        // dibatasi 250 baris, sehingga pada context dengan >250 soal angkanya
        // salah (mis. `published = 0` padahal ada 140).
        const counts = await this.countQuestionsByStatus(catalog, questions.map((row) => stringValue(row.id)))

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
