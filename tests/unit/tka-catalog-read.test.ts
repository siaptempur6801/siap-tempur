import { beforeEach, describe, expect, it, vi } from 'vitest'
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }))
vi.mock('@/lib/utils/supabase/server', () => ({ createV2Client: async () => ({ rpc }) }))
import { getTkaAttemptSummaries } from '@/src/repositories/tka-catalog-read.repository'
import type { createV2Client } from '@/lib/utils/supabase/server'
const db = {rpc} as unknown as Awaited<ReturnType<typeof createV2Client>>
beforeEach(() => vi.resetAllMocks())
describe('TKA quota projections', () => {
    it('does not query for an empty catalog', async () => {
        await expect(getTkaAttemptSummaries(db,[],true)).resolves.toEqual([])
        expect(rpc).not.toHaveBeenCalled()
    })
    it.each([true,false])('preserves direct-only=%s without transferring history', async directOnly => {
        const rows=[{exam_id:'exam',attempt_count:1205,active_attempt_id:'active'}]
        rpc.mockResolvedValue({data:rows,error:null})
        await expect(getTkaAttemptSummaries(db,['exam'],directOnly)).resolves.toEqual(rows)
        expect(rpc).toHaveBeenCalledExactlyOnceWith('learner_exam_attempt_summaries',{p_exam_ids:['exam'],p_direct_only:directOnly})
    })
    it('throws on a failed quota query instead of silently granting free access', async () => {
        const error={code:'42501'};rpc.mockResolvedValue({data:null,error})
        await expect(getTkaAttemptSummaries(db,['exam'],true)).rejects.toEqual(error)
    })
})
