import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  completeAttempt: vi.fn(),
  syncForAttempt: vi.fn(),
  events: [] as Array<{ id: string }>,
}))

vi.mock('@/lib/utils/supabase/server', () => ({
  createAdminClient: async () => ({ rpc: mocks.rpc }),
  createV2AdminClient: async () => {
    const query = {
      select: () => query,
      lte: () => query,
      gte: () => query,
      not: async () => ({ data: mocks.events, error: null }),
    }
    return { from: () => query }
  },
}))
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))
vi.mock('@/src/services/exam-completion.service', () => ({
  examCompletionService: { completeAttempt: mocks.completeAttempt },
}))
vi.mock('@/src/services/event-ranking.service', () => ({
  eventRankingService: { syncForAttempt: mocks.syncForAttempt },
}))

import { logger } from '@/lib/logger'
import { attemptFinalizationService } from '@/src/services/attempt-finalization.service'

function listReturns(rows: unknown[]) {
  mocks.rpc.mockImplementation(async (name: string, args: Record<string, unknown>) => {
    if (name === 'list_expired_in_progress_attempts') return { data: rows, error: null }
    if (name === 'finalize_expired_sectioned_attempt')
      return {
        data: { finalized: args.p_attempt_id !== 'not-expired', attempt_id: args.p_attempt_id },
        error: null,
      }
    if (name === 'recalculate_event_rankings') return { data: 1, error: null }
    throw new Error(`unexpected rpc ${name}`)
  })
}

describe('finalisasi attempt kedaluwarsa (A-07)', () => {
  beforeEach(() => {
    mocks.rpc.mockReset()
    mocks.completeAttempt.mockReset()
    mocks.syncForAttempt.mockReset()
    mocks.syncForAttempt.mockResolvedValue(null)
    vi.mocked(logger.error).mockClear()
  })

  it('mesin bersama dinilai lewat examCompletionService, mesin bersesi lewat RPC', async () => {
    listReturns([
      { attempt_id: 'shared-1', user_id: 'u1', engine: 'shared', deadline: '2026-11-18T00:00:00Z' },
      { attempt_id: 'tka-1', user_id: 'u2', engine: 'sectioned', deadline: '2026-11-18T00:00:00Z' },
    ])

    const summary = await attemptFinalizationService.finalizeExpired()

    expect(summary).toEqual({ checked: 2, finalized: 2, skipped: 0, failed: 0 })
    expect(mocks.completeAttempt).toHaveBeenCalledWith('u1', 'shared-1')
    expect(mocks.rpc).toHaveBeenCalledWith('finalize_expired_sectioned_attempt', {
      p_attempt_id: 'tka-1',
    })
    expect(mocks.syncForAttempt).toHaveBeenCalledWith('u2', 'tka-1')
  })

  it('attempt yang ditolak RPC (belum kedaluwarsa) dihitung skipped', async () => {
    listReturns([{ attempt_id: 'not-expired', user_id: 'u', engine: 'sectioned', deadline: 'x' }])
    expect(await attemptFinalizationService.finalizeExpired()).toMatchObject({
      finalized: 0,
      skipped: 1,
    })
  })

  it('kegagalan satu attempt dicatat dengan alert dan tidak menghentikan yang lain', async () => {
    listReturns([
      { attempt_id: 'bad', user_id: 'u1', engine: 'shared', deadline: 'x' },
      { attempt_id: 'good', user_id: 'u2', engine: 'shared', deadline: 'x' },
    ])
    mocks.completeAttempt.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce({})

    const summary = await attemptFinalizationService.finalizeExpired()

    expect(summary).toMatchObject({ checked: 2, finalized: 1, failed: 1 })
    expect(logger.error).toHaveBeenCalledWith(
      'Finalisasi otomatis attempt gagal',
      expect.any(Error),
      expect.objectContaining({ alert: 'attempt_auto_finalize_failed', attemptId: 'bad' }),
    )
  })

  it('menghitung ulang ranking event yang berjalan atau baru selesai', async () => {
    listReturns([])
    mocks.events = [{ id: 'event-1' }, { id: 'event-2' }]

    const summary = await attemptFinalizationService.refreshRecentEventRankings()

    expect(summary).toEqual({ events: 2, failed: 0 })
    expect(mocks.rpc).toHaveBeenCalledWith('recalculate_event_rankings', { p_event_id: 'event-1' })
  })
})
