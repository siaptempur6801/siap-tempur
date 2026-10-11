import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Auto-close event kedaluwarsa (nomor 5 audit 2026-09-18).
 *
 * Sebelumnya logika ini (`lib/tryout-event-status.ts`) menulis ke tabel
 * `tryout_events` yang TIDAK ADA di Schema V2, sehingga selalu gagal dan tidak
 * pernah ada yang menutup event. Buktinya nyata di staging: satu event QA
 * berstatus `live` padahal `ends_at` sudah lewat sebulan.
 *
 * Fungsi itu juga dipanggil di dalam render GET `/cpns`, sehingga setiap crawl
 * anonim menjalankan UPDATE dengan klien service role.
 *
 * Kontrak yang dikunci test ini:
 *   1. menyasar tabel `events` (V2), bukan `tryout_events`
 *   2. hanya baris yang statusnya masih TERBUKA dan `ends_at` sudah lewat
 *   3. idempoten — hasilnya jumlah baris yang benar-benar ditutup
 */

const updateCalls: Array<{ table: string; payload: unknown; filters: Array<[string, unknown]> }> =
  []

vi.mock('@/lib/utils/supabase/server', () => ({
  createV2AdminClient: async () => ({
    from: (table: string) => {
      const record: (typeof updateCalls)[number] = { table, payload: null, filters: [] }
      const builder = {
        update: (payload: unknown) => {
          record.payload = payload
          return builder
        },
        in: (column: string, values: unknown) => {
          record.filters.push([`in:${column}`, values])
          return builder
        },
        lt: (column: string, value: unknown) => {
          record.filters.push([`lt:${column}`, value])
          return builder
        },
        select: () => {
          updateCalls.push(record)
          return Promise.resolve({ data: [{ id: 'event-1' }], error: null })
        },
      }
      return builder
    },
  }),
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const { eventRepository } = await import('@/src/repositories/event.repository')

describe('closeExpiredEvents', () => {
  beforeEach(() => {
    updateCalls.length = 0
  })

  it('menyasar tabel events V2, bukan tabel legacy tryout_events', async () => {
    await eventRepository.closeExpiredEvents('2026-09-18T00:00:00.000Z')
    expect(updateCalls).toHaveLength(1)
    expect(updateCalls[0].table).toBe('events')
    expect(updateCalls[0].table).not.toBe('tryout_events')
  })

  it('menyetel status menjadi closed', async () => {
    await eventRepository.closeExpiredEvents('2026-09-18T00:00:00.000Z')
    expect(updateCalls[0].payload).toEqual({ status: 'closed' })
  })

  it('hanya menyentuh status yang masih terbuka — inilah yang membuatnya idempoten', async () => {
    await eventRepository.closeExpiredEvents('2026-09-18T00:00:00.000Z')
    const statusFilter = updateCalls[0].filters.find(([key]) => key === 'in:status')
    expect(statusFilter).toBeDefined()

    const values = statusFilter?.[1] as string[]
    expect(values).toContain('live')
    expect(values).toContain('scheduled')
    // `closed` TIDAK boleh ada: menyertakannya akan menulis ulang baris yang
    // sudah tertutup dan membuat operasinya tidak lagi idempoten.
    expect(values.map((value) => value.toLowerCase())).not.toContain('closed')
  })

  it('menerima varian huruf besar maupun kecil (status di DB bercampur)', async () => {
    await eventRepository.closeExpiredEvents('2026-09-18T00:00:00.000Z')
    const values = updateCalls[0].filters.find(([key]) => key === 'in:status')?.[1] as string[]
    for (const kanonik of ['scheduled', 'live', 'active']) {
      expect(values).toContain(kanonik)
      expect(values).toContain(kanonik.toUpperCase())
    }
  })

  it('membandingkan ends_at dengan waktu yang diberikan', async () => {
    const now = '2026-09-18T12:00:00.000Z'
    await eventRepository.closeExpiredEvents(now)
    const deadline = updateCalls[0].filters.find(([key]) => key === 'lt:ends_at')
    expect(deadline?.[1]).toBe(now)
  })

  it('mengembalikan jumlah baris yang benar-benar ditutup', async () => {
    const closed = await eventRepository.closeExpiredEvents('2026-09-18T00:00:00.000Z')
    expect(closed).toBe(1)
  })
})
