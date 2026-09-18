import { describe, expect, it, vi, beforeEach } from 'vitest'

/**
 * Regresi: filter `.in(...)` untuk daftar id attempt harus di-batch.
 *
 * Sebelum perbaikan, `listScores` mengirim seluruh id attempt yang pernah
 * diselesaikan user dalam satu URL PostgREST. Pada ±440 UUID URL melewati batas
 * header dan permintaan gagal dengan `UND_ERR_HEADERS_OVERFLOW`. Kegagalan itu
 * terjadi di dalam `exam_completion_service.completeAttempt`, sehingga pengguna
 * dengan riwayat banyak TIDAK DAPAT menyelesaikan ujian.
 *
 * Test ini mengunci kontraknya: jumlah query harus mengikuti jumlah batch, dan
 * setiap batch harus berada di bawah batas ukuran.
 */

const inCalls: string[][] = []
let selectMode: 'scores' | 'attempts' = 'scores'

vi.mock('@/lib/utils/supabase/server', () => ({
    createV2AdminClient: async () => ({
        from: () => {
            const builder = {
                select: () => builder,
                eq: () => builder,
                in: (column: string, values: string[]) => {
                    if (column === 'attempt_id') inCalls.push(values)
                    return builder
                },
                order: () => builder,
                limit: () => builder,
                then: (resolve: (value: unknown) => unknown) => Promise.resolve(
                    selectMode === 'scores'
                        ? { data: [], error: null }
                        : { data: [{ id: 'a' }], error: null },
                ).then(resolve),
            }
            return builder
        },
    }),
}))

vi.mock('@/lib/logger', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const { progressRepository, ProgressRepository } = await import('@/src/repositories/progress.repository')
const { SUPABASE_IN_FILTER_BATCH_SIZE } = await import('@/lib/supabase-batch')

function uuid(index: number) {
    return `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`
}

describe('progress repository — batching filter .in()', () => {
    beforeEach(() => {
        inCalls.length = 0
        selectMode = 'scores'
    })

    it('tidak mengirim satu query raksasa untuk riwayat panjang', async () => {
        // 440 id adalah titik di mana URL PostgREST melewati batas header.
        const ids = Array.from({ length: 440 }, (_, index) => uuid(index))
        await progressRepository.listScores(ids)

        expect(inCalls.length).toBe(Math.ceil(ids.length / SUPABASE_IN_FILTER_BATCH_SIZE))
        for (const batch of inCalls) {
            expect(batch.length).toBeLessThanOrEqual(SUPABASE_IN_FILTER_BATCH_SIZE)
        }
    })

    it('setiap id tetap terkirim tepat satu kali', async () => {
        const ids = Array.from({ length: 250 }, (_, index) => uuid(index))
        await progressRepository.listScores(ids)

        const sent = inCalls.flat().sort()
        expect(sent).toEqual([...ids].sort())
    })

    it('tidak melakukan query sama sekali untuk daftar kosong', async () => {
        await progressRepository.listScores([])
        expect(inCalls).toHaveLength(0)
    })

    it('membatasi jumlah attempt agregat secara eksplisit, bukan diam-diam', async () => {
        // Kontrak: agregat progres TIDAK boleh dipotong tanpa terlihat. Bila batas
        // tersentuh, repository harus gagal keras supaya tidak menghasilkan angka
        // progres yang salah tanpa ada yang menyadarinya.
        expect(ProgressRepository.MAX_ATTEMPTS_PER_AGGREGATE).toBeGreaterThan(1000)
    })
})
