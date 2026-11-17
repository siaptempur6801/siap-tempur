import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/utils/supabase/server', () => ({}))

import { durationSeconds } from '@/src/services/scoring.service'

describe('durasi pengerjaan dibatasi durasi ujian (A-14)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-20T00:00:00.000Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('attempt yang dinilai tiga hari kemudian tercatat sepanjang durasi ujian', () => {
    expect(durationSeconds('2026-11-17T00:00:00.000Z', 6000)).toBe(6000)
  })

  it('attempt yang selesai lebih cepat tetap memakai waktu sebenarnya', () => {
    expect(durationSeconds('2026-11-19T23:30:00.000Z', 6000)).toBe(1800)
  })

  it('tanpa durasi ujian (drill bebas) tidak dibatasi', () => {
    expect(durationSeconds('2026-11-19T00:00:00.000Z', null)).toBe(86_400)
  })

  it('started_at kosong atau rusak menghasilkan null', () => {
    expect(durationSeconds(null, 6000)).toBeNull()
    expect(durationSeconds('bukan-tanggal', 6000)).toBeNull()
  })
})
