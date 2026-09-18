import { describe, expect, it, vi, beforeEach } from 'vitest'

/**
 * Regresi: angka `counts` dihitung sebagai AGREGAT SELURUH TABEL.
 *
 * Bug nyata yang dikunci di sini: sebelumnya `counts` dihitung dari array
 * `questions` hasil query daftar yang dibatasi `.limit(250)`. Pada context
 * dengan lebih dari 250 soal — dan diurutkan `updated_at desc` — jendela itu
 * hanya memuat sebagian status, sehingga angkanya menyesatkan admin.
 *
 * Terukur di staging sebelum perbaikan:
 *   CPNS/SKD : total dilaporkan 250 (sebenarnya 573), published 0 (sebenarnya 140)
 *   TKA/SMP  : total dilaporkan 250 (sebenarnya 300), published 250 (sebenarnya 300)
 * TKA/SD tidak terpengaruh (213 soal, di bawah batas) — dan tetap sama sesudahnya.
 *
 * Kontrak yang dijaga test ini:
 *   1. Hitungan memakai `count: 'exact', head: true` — tidak menarik baris.
 *   2. Hitungan TIDAK dikenai `.limit()` — inilah inti perbaikannya.
 *   3. Setiap status dihitung dengan filter status yang benar.
 *   4. `unassigned` tetap dibatasi pada soal yang dimuat (satu-satunya angka
 *      yang memang bermakna per-jendela).
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
    inIds?: string[]
}

const calls: Call[] = []

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
            if (column === 'status') record.status = value
            return builder
        },
        in: (_column: string, values: string[]) => {
            record.inIds = values
            return builder
        },
        order: () => builder,
        limit: () => {
            record.limited = true
            return builder
        },
        maybeSingle: async () => {
            calls.push({ ...record })
            if (table === 'programs') return { data: { id: 'prog-1', code: 'CPNS', name: 'CPNS' }, error: null }
            if (table === 'tracks') return { data: { id: 'track-1', code: 'SKD', name: 'SKD' }, error: null }
            return { data: null, error: null }
        },
        single: async () => ({ data: null, error: null }),
        then: (resolve: (value: unknown) => unknown) => {
            calls.push({ ...record })
            // `questions` mengembalikan satu baris supaya jalur yang bergantung
            // pada daftar soal (mis. review per pertanyaan) benar-benar berjalan.
            const payload =
                table === 'questions'
                    ? { data: [{ id: 'q-1', question_code: 'Q-1', subject_id: 's-1', status: 'draft', version: 1, stem: 'soal' }], error: null, count: 1 }
                    : { data: [], error: null, count: 0 }
            return Promise.resolve(payload).then(resolve)
        },
    })

    return builder
}

beforeEach(() => {
    calls.length = 0
    fromMock.mockReset()
    fromMock.mockImplementation((table: string) => makeBuilder(table))
})

const { contentReviewService } = await import('@/src/services/content-review.service')

const CONTEXT = { programCode: 'CPNS', trackCode: 'SKD' }

describe('getReviewSummary — hitungan agregat', () => {
    it('memakai count exact head-only, bukan menarik baris', async () => {
        await contentReviewService.getReviewSummary(CONTEXT)

        // Hitungan STATUS pada `questions` harus head-only: tidak ada baris yang
        // ditarik hanya untuk menghitung.
        const questionCounts = calls.filter((c) => c.table === 'questions' && c.count === 'exact')
        expect(questionCounts.length).toBeGreaterThanOrEqual(4)
        for (const call of questionCounts) {
            expect(call.head).toBe(true)
        }
    })

    it('TIDAK membatasi hitungan dengan limit — inti perbaikan', async () => {
        await contentReviewService.getReviewSummary(CONTEXT)

        // Query daftar soal memang dibatasi 250; hitungan TIDAK boleh ikut.
        const limitedCountCalls = calls.filter((c) => c.table === 'questions' && c.count === 'exact' && c.limited)
        expect(limitedCountCalls).toEqual([])

        // Sebaliknya, harus ADA query daftar yang dibatasi (jendela review queue).
        expect(calls.some((c) => c.table === 'questions' && c.limited && !c.count)).toBe(true)
    })

    it('memfilter setiap status dengan nilai yang benar', async () => {
        await contentReviewService.getReviewSummary(CONTEXT)

        const statuses = calls
            .filter((c) => c.table === 'questions' && c.count === 'exact')
            .map((c) => c.status)
        expect(statuses).toContain('published')
        expect(statuses).toContain('approved')
        expect(statuses).toContain('revision_required')
        // Satu hitungan total tanpa filter status.
        expect(statuses).toContain(undefined)
    })
})

describe('getWorkspaceData — unassigned tetap per-jendela', () => {
    it('membatasi hitungan unassigned pada soal yang dimuat', async () => {
        await contentReviewService.getWorkspaceData(CONTEXT)

        // `content_reviews` hanya boleh di-query dengan daftar entity_id,
        // karena "belum ditugaskan" hanya bermakna untuk soal yang punya review.
        const reviewCalls = calls.filter((c) => c.table === 'content_reviews')
        expect(reviewCalls.length).toBeGreaterThan(0)
        for (const call of reviewCalls) {
            expect(Array.isArray(call.inIds)).toBe(true)
        }
    })

    it('tetap memakai agregat untuk status pada halaman review', async () => {
        await contentReviewService.getWorkspaceData(CONTEXT)

        const limitedCountCalls = calls.filter((c) => c.table === 'questions' && c.count === 'exact' && c.limited)
        expect(limitedCountCalls).toEqual([])
    })
})
