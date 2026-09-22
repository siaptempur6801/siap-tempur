import { describe, expect, it, vi, beforeEach } from 'vitest'

/**
 * Kontrak service Review Queue:
 *   1. Hitungan status adalah AGREGAT SELURUH TABEL (`count: exact, head: true`),
 *      tidak pernah dibatasi `limit`.
 *   2. Filter stage/reviewer berjalan di DATABASE (bukan atas jendela), dan
 *      daftar antrean berhalaman 25 baris dengan `total` exact.
 *   3. Deep link `?question=` ke soal di luar halaman tetap memuat soal itu.
 *
 * Bug nyata yang dikunci: dulu `counts` dihitung dari array `.limit(250)`
 * (CPNS/SKD 573 soal → published dilaporkan 0 padahal 140), dan filter
 * stage/reviewer diterapkan di aplikasi sehingga soal ke-251 tidak terjangkau.
 */

const fromMock = vi.fn()

vi.mock('@/lib/utils/supabase/server', () => ({
    createClient: async () => ({ from: fromMock, rpc: async () => ({ data: [], error: null }) }),
    createV2Client: async () => ({ from: fromMock, rpc: async () => ({ data: [], error: null }) }),
    createAdminClient: async () => ({ from: fromMock, rpc: async () => ({ data: [], error: null }) }),
    createV2AdminClient: async () => ({ from: fromMock, rpc: async () => ({ data: [], error: null }) }),
}))

type Call = {
    table: string
    count?: string
    head?: boolean
    status?: string
    limited?: boolean
    limit?: number
    inIds?: string[]
    isNull?: string
    orExpression?: string
    eq?: Record<string, string>
    range?: [number, number]
}

const calls: Call[] = []
const state = {
    questionCount: 60,
    questionRows: [{ id: 'q-1', question_code: 'Q-1', subject_id: 's-1', status: 'draft', version: 1, stem: 'soal' }] as Array<Record<string, unknown>>,
    offPageRow: null as Record<string, unknown> | null,
}

/**
 * Builder rantai Supabase tiruan yang mencatat BENTUK query (bukan hasilnya).
 * `then` membuatnya thenable sehingga `await` dan `Promise.all` bekerja sama
 * seperti pada klien sungguhan.
 */
function makeBuilder(table: string) {
    const record: Call = { table }
    const builder: Record<string, unknown> = {}

    Object.assign(builder, {
        select: (_cols: string, opts?: { count?: string; head?: boolean }) => {
            if (opts?.count) record.count = opts.count
            if (opts?.head) record.head = opts.head
            return builder
        },
        eq: (column: string, value: string) => {
            record.eq = { ...(record.eq ?? {}), [column]: value }
            if (column === 'status') record.status = value
            return builder
        },
        in: (column: string, values: string[]) => {
            record.inIds = values
            record.eq = { ...(record.eq ?? {}), [`in:${column}`]: values.join(',') }
            return builder
        },
        is: (column: string) => {
            record.isNull = column
            return builder
        },
        or: (expression: string) => {
            record.orExpression = expression
            return builder
        },
        order: () => builder,
        limit: (value: number) => {
            record.limited = true
            record.limit = value
            return builder
        },
        range: (from: number, to: number) => {
            record.range = [from, to]
            return builder
        },
        maybeSingle: async () => {
            calls.push({ ...record })
            if (table === 'programs') return { data: { id: 'prog-1', code: 'CPNS', name: 'CPNS' }, error: null }
            if (table === 'tracks') return { data: { id: 'track-1', code: 'SKD', name: 'SKD' }, error: null }
            if (table === 'questions' && record.eq?.id) return { data: state.offPageRow, error: null }
            return { data: null, error: null }
        },
        single: async () => ({ data: null, error: null }),
        then: (resolve: (value: unknown) => unknown) => {
            calls.push({ ...record })
            const payload = table === 'questions'
                ? {
                    data: record.head ? null : state.questionRows,
                    error: null,
                    count: state.questionCount,
                }
                : { data: [], error: null, count: 0 }
            return Promise.resolve(payload).then(resolve)
        },
    })

    return builder
}

beforeEach(() => {
    calls.length = 0
    state.questionCount = 60
    state.questionRows = [{ id: 'q-1', question_code: 'Q-1', subject_id: 's-1', status: 'draft', version: 1, stem: 'soal' }]
    state.offPageRow = null
    fromMock.mockReset()
    fromMock.mockImplementation((table: string) => makeBuilder(table))
})

const { contentReviewService } = await import('@/src/services/content-review.service')

const CONTEXT = { programCode: 'CPNS', trackCode: 'SKD' }
const questionCalls = () => calls.filter((c) => c.table === 'questions')
const exactQuestionCounts = () => questionCalls().filter((c) => c.count === 'exact' && c.head)

describe('getReviewSummary — hitungan agregat', () => {
    it('memakai count exact head-only, bukan menarik baris', async () => {
        await contentReviewService.getReviewSummary(CONTEXT)

        expect(exactQuestionCounts().length).toBeGreaterThanOrEqual(4)
        for (const call of exactQuestionCounts()) {
            expect(call.head).toBe(true)
        }
    })

    it('TIDAK membatasi hitungan dengan limit — inti perbaikan', async () => {
        await contentReviewService.getReviewSummary(CONTEXT)

        const limitedCountCalls = exactQuestionCounts().filter((c) => c.limited)
        expect(limitedCountCalls).toEqual([])

        // Dashboard hanya menarik 6 baris antrean, bukan 250.
        const rowsCall = questionCalls().find((c) => c.limited && !c.count)
        expect(rowsCall?.limit).toBe(6)
    })

    it('memfilter setiap status dengan nilai yang benar', async () => {
        await contentReviewService.getReviewSummary(CONTEXT)

        const statuses = exactQuestionCounts().map((c) => c.status)
        expect(statuses).toContain('published')
        expect(statuses).toContain('approved')
        expect(statuses).toContain('revision_required')
        expect(statuses).toContain('academic_review')
        expect(statuses).toContain('technical_qa')
        // Satu hitungan total tanpa filter status.
        expect(statuses).toContain(undefined)
    })

    it('menghitung tahap editorial dan unassigned di database', async () => {
        await contentReviewService.getReviewSummary(CONTEXT)

        expect(exactQuestionCounts().some((c) => c.inIds?.join(',') === 'submitted,editorial_review')).toBe(true)
        expect(exactQuestionCounts().some((c) => c.isNull === 'reviewer_id')).toBe(true)
    })
})

describe('getWorkspaceData — paginasi & filter di database', () => {
    it('meminta 25 baris dengan range dan count exact', async () => {
        await contentReviewService.getWorkspaceData(CONTEXT, { page: 2 })

        const rowsCall = questionCalls().find((c) => !c.head && c.range)
        expect(rowsCall?.range).toEqual([25, 49])
        expect(rowsCall?.count).toBe('exact')
    })

    it('menerjemahkan filter stage ke status di database', async () => {
        await contentReviewService.getWorkspaceData(CONTEXT, { stage: 'editorial' })

        const stageCalls = questionCalls().filter((c) => c.inIds?.join(',') === 'submitted,editorial_review')
        expect(stageCalls.length).toBeGreaterThan(0)
        // Berlaku untuk hitungan total maupun permintaan baris.
        expect(stageCalls.some((c) => c.head)).toBe(true)
        expect(stageCalls.some((c) => !c.head)).toBe(true)
    })

    it('filter unassigned memakai status tahap + reviewer_id null', async () => {
        await contentReviewService.getWorkspaceData(CONTEXT, { reviewer: 'unassigned' })

        expect(questionCalls().some((c) => c.isNull === 'reviewer_id' && c.inIds?.join(',') === 'submitted,editorial_review,academic_review,technical_qa')).toBe(true)
    })

    it('filter reviewer memakai kolom reviewer_id', async () => {
        await contentReviewService.getWorkspaceData(CONTEXT, { reviewer: 'user-1' })

        expect(questionCalls().some((c) => c.eq?.reviewer_id === 'user-1')).toBe(true)
    })

    it('kode mapel tidak dikenal memakai UUID kosong yang valid', async () => {
        await contentReviewService.getWorkspaceData(CONTEXT, { subject: 'TIDAK-ADA' })

        expect(questionCalls().some((c) => c.eq?.subject_id === '00000000-0000-0000-0000-000000000000')).toBe(true)
    })

    it('halaman melewati jumlah baris tidak menjalankan query baris', async () => {
        state.questionCount = 10

        const data = await contentReviewService.getWorkspaceData(CONTEXT, { page: 99 })

        expect(data.clampTo).toBe(1)
        expect(data.questions).toEqual([])
        expect(questionCalls().some((c) => c.range)).toBe(false)
    })

    it('deep link ke soal di luar halaman tetap memuat soal itu', async () => {
        const offPageId = '11111111-1111-1111-1111-111111111111'
        state.offPageRow = { id: offPageId, question_code: 'Q-OFF', subject_id: 's-1', status: 'draft', version: 3, stem: 'soal lain' }

        const data = await contentReviewService.getWorkspaceData(CONTEXT, {}, offPageId)

        expect(data.selectedId).toBe(offPageId)
        expect(data.selectedQuestion?.question_code).toBe('Q-OFF')
        expect(questionCalls().some((c) => c.eq?.id === offPageId)).toBe(true)
    })

    it('id soal yang bukan UUID tidak menyentuh query', async () => {
        await contentReviewService.getWorkspaceData(CONTEXT, {}, 'bukan-uuid')

        expect(questionCalls().some((c) => c.eq?.id === 'bukan-uuid')).toBe(false)
    })
})

describe('getWorkspaceData — antrean hanya berisi yang perlu tindakan', () => {
    it('tanpa filter status: mengecualikan terbit dan arsip', async () => {
        await contentReviewService.getWorkspaceData(CONTEXT)

        const rowsCall = questionCalls().find((c) => !c.head && c.range)
        expect(rowsCall?.inIds).toContain('draft')
        expect(rowsCall?.inIds).not.toContain('published')
        expect(rowsCall?.inIds).not.toContain('archived')
    })

    it('status=all: tanpa filter status sama sekali', async () => {
        await contentReviewService.getWorkspaceData(CONTEXT, { status: 'all' })

        const rowsCall = questionCalls().find((c) => !c.head && c.range)
        expect(rowsCall?.inIds).toBeUndefined()
        expect(rowsCall?.eq?.status).toBeUndefined()
    })

    it('status eksplisit tetap difilter persis', async () => {
        await contentReviewService.getWorkspaceData(CONTEXT, { status: 'published' })

        const rowsCall = questionCalls().find((c) => !c.head && c.range)
        expect(rowsCall?.eq?.status).toBe('published')
    })

    it('antrean dashboard juga mengecualikan status selesai', async () => {
        await contentReviewService.getReviewSummary(CONTEXT)

        const rowsCall = questionCalls().find((c) => c.limited && !c.count)
        expect(rowsCall?.inIds).not.toContain('published')
        expect(rowsCall?.inIds).not.toContain('archived')
    })
})

describe('getWorkspaceData — pending review hanya untuk baris yang tampil', () => {
    it('content_reviews di-query dengan daftar entity_id halaman', async () => {
        await contentReviewService.getWorkspaceData(CONTEXT)

        const reviewCalls = calls.filter((c) => c.table === 'content_reviews')
        expect(reviewCalls.length).toBeGreaterThan(0)
        for (const call of reviewCalls) {
            expect(Array.isArray(call.inIds)).toBe(true)
        }
    })
})
