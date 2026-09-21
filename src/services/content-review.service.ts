import { createClient } from '@/lib/utils/supabase/server'
import { escapePostgrestValue } from '@/lib/postgrest-filter'
import { ADMIN_PAGE_SIZE, adminOffset, adminTotalPages } from '@/lib/admin-pagination'
import type { ProgramTrackContext } from '@/src/services/catalog-context.service'

export type ReviewWorkspaceFilters = {
    subject?: string | null
    status?: string | null
    stage?: string | null
    reviewer?: string | null
    q?: string | null
    /** Nomor halaman daftar antrean (25 baris/halaman). */
    page?: number | null
    /** Reviewer yang sedang login — untuk hitungan "ditugaskan ke saya". */
    assignee?: string | null
}

/** UUID valid yang tidak akan cocok dengan baris mana pun. */
const NO_MATCH_ID = '00000000-0000-0000-0000-000000000000'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Peta tahap review → status `questions`.
 *
 * `submitted` dan `editorial_review` sama-sama tahap editorial (submitted
 * berarti belum diklaim reviewer, editorial_review sudah). Peta ini yang
 * memungkinkan filter tahap berjalan di database, bukan atas jendela yang
 * sudah terpotong.
 */
const STAGE_STATUSES: Record<string, readonly string[]> = {
    editorial: ['submitted', 'editorial_review'],
    academic: ['academic_review'],
    technical_qa: ['technical_qa'],
}

const REVIEW_STAGE_STATUSES = ['submitted', 'editorial_review', 'academic_review', 'technical_qa'] as const

const QUEUE_COLUMNS = 'id, question_code, subject_id, question_type, stem, difficulty, cognitive_level, source_reference, estimated_seconds, status, version, author_id, reviewer_id, stimulus_id, stimulus_order, published_at, created_at, updated_at'

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
     * `unassigned` dan `assignedToMe` juga exact: soal pada tahap review yang
     * `reviewer_id`-nya kosong / milik aktor. Sebelumnya `unassigned` dihitung
     * dari jendela soal yang dimuat, sehingga angkanya ikut berubah saat
     * paginasi — padahal angkanya harus tetap.
     */
    private async countQuestionsByStatus(
        catalog: { program: { id: string }; track: { id: string } },
        options: { assignee?: string | null } = {},
    ) {
        const client = await createClient()
        const base = () => client
            .from('questions')
            .select('id', { count: 'exact', head: true })
            .eq('program_id', catalog.program.id)
            .eq('track_id', catalog.track.id)
        const inStage = () => base().in('status', REVIEW_STAGE_STATUSES)

        const [total, published, approved, revisionRequired, editorial, academic, technical, unassigned, assignedToMe] = await Promise.all([
            base(),
            base().eq('status', 'published'),
            base().eq('status', 'approved'),
            base().eq('status', 'revision_required'),
            base().in('status', STAGE_STATUSES.editorial),
            base().eq('status', 'academic_review'),
            base().eq('status', 'technical_qa'),
            inStage().is('reviewer_id', null),
            options.assignee ? inStage().eq('reviewer_id', options.assignee) : Promise.resolve({ count: 0, error: null }),
        ])

        for (const result of [total, published, approved, revisionRequired, editorial, academic, technical, unassigned, assignedToMe]) {
            if (result.error) throw result.error
        }

        return {
            total: total.count ?? 0,
            unassigned: unassigned.count ?? 0,
            assignedToMe: assignedToMe.count ?? 0,
            published: published.count ?? 0,
            approved: approved.count ?? 0,
            revisionRequired: revisionRequired.count ?? 0,
            editorial: editorial.count ?? 0,
            academic: academic.count ?? 0,
            technical: technical.count ?? 0,
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

        // Dashboard hanya butuh 6 baris antrean; angka per tahap dihitung exact
        // oleh `countQuestionsByStatus`, bukan dari jendela seperti sebelumnya.
        const { data, error } = await client
            .from('questions')
            .select('id, question_code, subject_id, status, version, stem')
            .eq('program_id', catalog.program.id)
            .eq('track_id', catalog.track.id)
            .order('updated_at', { ascending: false })
            .limit(6)
        if (error) throw error

        const questions = (data ?? []) as Row[]
        const subjectById = new Map(catalog.subjects.map((subject) => [String(subject.id), subject]))
        const counts = await this.countQuestionsByStatus(catalog)

        return { catalog, questions, subjectById, counts }
    }

    async getWorkspaceData(
        context: ProgramTrackContext,
        filters: ReviewWorkspaceFilters = {},
        selectedQuestionId?: string | null,
    ) {
        const client = await createClient()
        const catalog = await resolveCatalog(context)

        // Kode mapel tidak dikenal → UUID valid yang tidak cocok dengan apa pun
        // (bukan `uuid = ''` yang ditolak PostgREST).
        const subjectId = filters.subject
            ? catalog.subjects.find((row) => row.code.toLowerCase() === filters.subject!.trim().toLowerCase())?.id ?? NO_MATCH_ID
            : null

        type QueueChain = {
            eq: (column: string, value: string) => QueueChain
            in: (column: string, values: readonly string[]) => QueueChain
            is: (column: string, value: null) => QueueChain
            or: (expression: string) => QueueChain
        }
        /**
         * Seluruh filter berjalan di database.
         *
         * Sebelumnya `stage` dan `reviewer` disaring di aplikasi atas jendela 250
         * baris, sehingga "N soal sesuai filter" hanya berlaku untuk jendela itu
         * dan soal ke-251 tidak terjangkau. `questions.reviewer_id` adalah cermin
         * reviewer pada review pending (di-set `assign_question_reviewer`,
         * dikosongkan `submit_question_for_review`/`review_question_stage`),
         * sehingga filter reviewer dapat memakai kolom itu.
         */
        const applyFilters = (builder: QueueChain): QueueChain => {
            let query = builder
                .eq('program_id', catalog.program.id)
                .eq('track_id', catalog.track.id)
            if (subjectId) query = query.eq('subject_id', subjectId)
            if (filters.status) query = query.eq('status', filters.status)
            const stageStatuses = filters.stage ? STAGE_STATUSES[filters.stage] : undefined
            if (stageStatuses) query = query.in('status', stageStatuses)
            if (filters.reviewer === 'unassigned') {
                query = query.in('status', REVIEW_STAGE_STATUSES).is('reviewer_id', null)
            } else if (filters.reviewer) {
                query = query.eq('reviewer_id', filters.reviewer)
            }
            if (filters.q?.trim()) {
                // `,()` bisa mengubah bentuk ekspresi `or=(...)` PostgREST; helper
                // bersama juga membuang wildcard `%` yang diketik admin.
                const term = escapePostgrestValue(filters.q)
                if (term) query = query.or(`question_code.ilike.%${term}%,stem.ilike.%${term}%`)
            }
            return query
        }

        const page = Math.max(1, Math.floor(filters.page ?? 1))
        const countQuery = applyFilters(client.from('questions').select('id', { count: 'exact', head: true }) as unknown as QueueChain)
        const countResult = await (countQuery as unknown as PromiseLike<{ count: number | null; error: unknown }>)
        if (countResult.error) throw countResult.error
        const total = countResult.count ?? 0
        const lastPage = adminTotalPages(total)
        // Nomor halaman di luar jangkauan: PostgREST menolak `Range` melewati
        // jumlah baris (PGRST103), jadi permintaan baris tidak dijalankan.
        const clampTo = page > lastPage ? lastPage : null

        let baseQuestions: Row[] = []
        if (!clampTo) {
            const rowsQuery = applyFilters(client.from('questions').select(QUEUE_COLUMNS, { count: 'exact' }) as unknown as QueueChain) as unknown as {
                order: (column: string, options: { ascending: boolean }) => { range: (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }> }
            }
            const { data, error } = await rowsQuery
                .order('updated_at', { ascending: false })
                .range(adminOffset(page), adminOffset(page) + ADMIN_PAGE_SIZE - 1)
            if (error) throw error
            baseQuestions = (data ?? []) as Row[]
        }

        const toWorkspaceQuestion = (row: Row): WorkspaceQuestion => ({
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
            pending_review: null,
        })

        const questions = baseQuestions.map(toWorkspaceQuestion)

        // Deep link (`?question=`) bisa menunjuk soal di luar halaman ini — mis.
        // dari Question Bank "Buka alur review". Muat barisnya terpisah; hanya id
        // berbentuk UUID yang boleh menyentuh query.
        let offPageSelected: WorkspaceQuestion | null = null
        if (selectedQuestionId && UUID_PATTERN.test(selectedQuestionId) && !questions.some((row) => sameId(row.id, selectedQuestionId))) {
            const { data: one, error: oneError } = await client
                .from('questions')
                .select(QUEUE_COLUMNS)
                .eq('program_id', catalog.program.id)
                .eq('track_id', catalog.track.id)
                .eq('id', selectedQuestionId)
                .maybeSingle()
            if (oneError) throw oneError
            if (one) offPageSelected = toWorkspaceQuestion(one as Row)
        }

        const reviewIds = [...questions.map((row) => stringValue(row.id)), ...(offPageSelected ? [stringValue(offPageSelected.id)] : [])]
        const { data: reviewRows, error: reviewError } = reviewIds.length
            ? await client
                .from('content_reviews')
                .select('id, entity_id, reviewer_id, status, notes, review_stage, question_version, review_round, assigned_at, started_at, completed_at, created_at, updated_at')
                .eq('entity_type', 'question')
                .in('entity_id', reviewIds)
                .order('review_round', { ascending: false })
                .order('created_at', { ascending: false })
            : { data: [], error: null }
        if (reviewError) throw reviewError

        const reviewsByQuestion = new Map<string, Row[]>()
        for (const review of (reviewRows ?? []) as Row[]) {
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
        for (const row of questions) row.pending_review = pendingByQuestion.get(stringValue(row.id)) ?? null
        if (offPageSelected) offPageSelected.pending_review = pendingByQuestion.get(stringValue(offPageSelected.id)) ?? null

        const people = await listContentPeople()
        const profileById = new Map(people.map((person) => [person.id, person]))
        const reviewerCandidates = people.filter((person) => person.can_review)

        const selectedQuestion = offPageSelected
            ?? (selectedQuestionId ? questions.find((row) => sameId(row.id, selectedQuestionId)) ?? null : null)
            ?? questions[0]
            ?? null
        const selectedId = selectedQuestion ? stringValue(selectedQuestion.id) : null

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
        // Agregat seluruh tabel — lihat `countQuestionsByStatus`.
        const counts = await this.countQuestionsByStatus(catalog, { assignee: filters.assignee ?? null })

        return {
            catalog,
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
            page,
            total,
            lastPage,
            clampTo,
        }
    }
}

export const contentReviewService = new ContentReviewService()
