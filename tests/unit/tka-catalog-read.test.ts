import { beforeEach, describe, expect, it, vi } from 'vitest'
const { rpc, getAuthUser, catalogRead } = vi.hoisted(() => ({
  rpc: vi.fn(),
  getAuthUser: vi.fn(),
  catalogRead: vi.fn(),
}))
vi.mock('@/lib/utils/supabase/server', () => ({
  getAuthUser,
  createV2Client: async () => ({
    rpc,
    from: () => {
      const query = { select: () => query, eq: () => query, maybeSingle: catalogRead }
      return query
    },
  }),
}))
import {
  getTkaAttemptSummaries,
  getAuthenticatedTkaCatalogContext,
} from '@/src/repositories/tka-catalog-read.repository'
import type { createV2Client } from '@/lib/utils/supabase/server'
const db = { rpc } as unknown as Awaited<ReturnType<typeof createV2Client>>
beforeEach(() => vi.resetAllMocks())
describe('TKA quota projections', () => {
  it('does not query for an empty catalog', async () => {
    await expect(getTkaAttemptSummaries(db, [], true)).resolves.toEqual([])
    expect(rpc).not.toHaveBeenCalled()
  })
  it.each([true, false])(
    'preserves direct-only=%s without transferring history',
    async (directOnly) => {
      const rows = [{ exam_id: 'exam', attempt_count: 1205, active_attempt_id: 'active' }]
      rpc.mockResolvedValue({ data: rows, error: null })
      await expect(getTkaAttemptSummaries(db, ['exam'], directOnly)).resolves.toEqual(rows)
      expect(rpc).toHaveBeenCalledExactlyOnceWith('learner_exam_attempt_summaries', {
        p_exam_ids: ['exam'],
        p_direct_only: directOnly,
      })
    },
  )
  it('throws on a failed quota query instead of silently granting free access', async () => {
    const error = { code: '42501' }
    rpc.mockResolvedValue({ data: null, error })
    await expect(getTkaAttemptSummaries(db, ['exam'], true)).rejects.toEqual(error)
  })
})

describe('TKA authenticated catalog dependency ordering', () => {
  it('starts the RLS catalog read while server-verified identity is pending', async () => {
    let resolve!: (value: { user: { id: string } }) => void
    getAuthUser.mockReturnValue(
      new Promise((r) => {
        resolve = r
      }),
    )
    catalogRead.mockResolvedValue({ data: { id: 'track', program_id: 'program' }, error: null })
    const result = getAuthenticatedTkaCatalogContext('TKA', 'SMP')
    await vi.waitFor(() => expect(catalogRead).toHaveBeenCalledTimes(1))
    resolve({ user: { id: 'owner' } })
    await expect(result).resolves.toEqual({
      user: { id: 'owner' },
      catalogContext: { programId: 'program', trackId: 'track' },
    })
  })
  it('preserves the unauthenticated redirect path when the catalog request fails', async () => {
    getAuthUser.mockResolvedValue({ user: null })
    catalogRead.mockResolvedValue({ data: null, error: { code: 'PGRST301' } })
    await expect(getAuthenticatedTkaCatalogContext('TKA', 'SMP')).resolves.toEqual({
      user: null,
      catalogContext: null,
    })
  })
  it('does not delay an unauthenticated redirect behind a stalled catalog request', async () => {
    getAuthUser.mockResolvedValue({ user: null })
    catalogRead.mockReturnValue(new Promise(() => undefined))
    await expect(getAuthenticatedTkaCatalogContext('TKA', 'SMP')).resolves.toEqual({
      user: null,
      catalogContext: null,
    })
  })
  it('does not hide catalog errors for authenticated learners', async () => {
    getAuthUser.mockResolvedValue({ user: { id: 'owner' } })
    catalogRead.mockResolvedValue({ data: null, error: { code: '42501' } })
    await expect(getAuthenticatedTkaCatalogContext('TKA', 'SMP')).rejects.toEqual({ code: '42501' })
  })
})
