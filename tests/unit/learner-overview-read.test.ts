import { beforeEach, describe, expect, it, vi } from 'vitest'
const { rpc, single } = vi.hoisted(() => ({ rpc: vi.fn(), single: vi.fn() }))
vi.mock('@/lib/utils/supabase/server', () => ({ createV2AdminClient: async () => ({ rpc }) }))
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { PracticeOverviewRepository } from '@/src/repositories/practice-overview.repository'
const repository = new PracticeOverviewRepository()
beforeEach(() => { vi.resetAllMocks() })
describe('CPNS read models', () => {
    it('reads totals in one request and passes the exact caller user ID', async () => {
        single.mockResolvedValue({data:{total_sessions:1200,total_xp:12345},error:null})
        rpc.mockReturnValue({ single })
        await expect(repository.getCompletedAttemptTotals('owner')).resolves.toEqual({totalSessions:1200,totalXp:12345})
        expect(rpc).toHaveBeenCalledExactlyOnceWith('practice_completed_attempt_totals',{p_user_id:'owner'})
    })
    it('maps progress counts without fetching questions or answer keys', async () => {
        rpc.mockResolvedValue({ data:[{id:'a',exam_id:'e',started_at:null,last_saved_at:null,last_question_position:4,metadata:{practiceKind:'drill'},question_count:1500,answered_questions:1200}],error:null })
        await expect(repository.listActiveAttempts('owner')).resolves.toEqual([{id:'a',examId:'e',startedAt:null,lastSavedAt:null,lastQuestionPosition:4,metadata:{practiceKind:'drill'},questionCount:1500,answeredQuestions:1200}])
        expect(rpc).toHaveBeenCalledExactlyOnceWith('practice_active_attempt_overviews',{p_user_id:'owner'})
    })
    it('propagates database errors instead of displaying incorrect totals', async () => {
        const error = {code:'42501',message:'denied'}
        single.mockResolvedValue({data:null,error});rpc.mockReturnValue({single})
        await expect(repository.getCompletedAttemptTotals('owner')).rejects.toEqual(error)
        rpc.mockResolvedValue({data:null,error})
        await expect(repository.listActiveAttempts('owner')).rejects.toEqual(error)
    })
})

it('uses the learner client with a parameterless owner-only reward aggregate', async () => {
    const learnerRpc = vi.fn().mockReturnValue({single:vi.fn().mockResolvedValue({data:{total_sessions:1005,total_xp:20100},error:null})})
    const db = {rpc:learnerRpc} as unknown as SupabaseClient<Database>
    await expect(repository.getCompletedAttemptTotals('ignored-owner', db)).resolves.toEqual({totalSessions:1005,totalXp:20100})
    expect(learnerRpc).toHaveBeenCalledExactlyOnceWith('learner_completed_attempt_totals')
    expect(rpc).not.toHaveBeenCalled()
})
