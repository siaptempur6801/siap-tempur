import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ entitlements: [] as unknown[] }))

vi.mock('@/lib/utils/supabase/server', () => ({
  createV2AdminClient: async () => {
    const query = {
      select: () => query,
      eq: () => query,
      in: async () => ({ data: mocks.entitlements, error: null }),
    }
    return { from: () => query }
  },
  createAdminClient: async () => ({}),
}))

import { attemptRepository } from '@/src/repositories/attempt.repository'
import { examRepository, type ResolvedExam } from '@/src/repositories/exam.repository'
import { activityService } from '@/src/services/activity.service'
import { eventRankingService } from '@/src/services/event-ranking.service'
import { examAttemptService } from '@/src/services/exam-attempt.service'
import { examCompletionService } from '@/src/services/exam-completion.service'
import { leaderboardService } from '@/src/services/leaderboard.service'
import { scoringService } from '@/src/services/scoring.service'
import { streakService } from '@/src/services/streak.service'
import { subjectProgressService } from '@/src/services/subject-progress.service'
import { walletService } from '@/src/services/wallet.service'

const EXAM: ResolvedExam = {
  id: 'exam-1',
  programId: 'program-1',
  trackId: 'track-1',
  examTypeId: 'type-1',
  examTypeCode: 'FULL_TRYOUT',
  title: 'Tryout',
  slug: 'tryout',
  durationSeconds: 6000,
  attemptLimit: null,
  questionOrder: 'fixed',
  accessType: 'PREMIUM',
  requiredFeatureId: 'feature-1',
  tokenCost: 1,
  startsAt: null,
  endsAt: null,
  subjectId: null,
  subjectCode: null,
}

const USABLE_ENTITLEMENT = {
  id: 'ent-1',
  starts_at: '2026-01-01T00:00:00Z',
  expires_at: null,
  usage_limit: 2,
  usage_count: 0,
}

function stubStart(exam: ResolvedExam) {
  vi.spyOn(examRepository, 'findExam').mockResolvedValue(exam)
  vi.spyOn(examRepository, 'buildQuestionSet').mockResolvedValue([] as never)
  vi.spyOn(attemptRepository, 'findActiveAttempt').mockResolvedValue(null)
  vi.spyOn(attemptRepository, 'countAttempts').mockResolvedValue(0)
  vi.spyOn(attemptRepository, 'createAttemptWithQuestions').mockResolvedValue({
    id: 'attempt-1',
  } as never)
  vi.spyOn(walletService, 'assertCanAfford').mockResolvedValue(undefined)
}

describe('pemakaian entitlement per attempt (A-09/A-16)', () => {
  beforeEach(() => {
    mocks.entitlements = [USABLE_ENTITLEMENT]
  })
  afterEach(() => vi.restoreAllMocks())

  it('sesi yang ditanggung entitlement memakai satu jatah dan tidak dipotong token', async () => {
    stubStart(EXAM)
    const consume = vi
      .spyOn(attemptRepository, 'consumeEntitlementForAttempt')
      .mockResolvedValue(true)
    const debit = vi.spyOn(walletService, 'debitForAttempt').mockResolvedValue({} as never)

    await examAttemptService.startFullTryout({ userId: 'user-1' })

    expect(consume).toHaveBeenCalledWith('user-1', 'attempt-1', 'feature-1')
    expect(debit).not.toHaveBeenCalled()
  })

  it('jatah habis saat dibuat: exam bertoken jatuh ke pemotongan token', async () => {
    stubStart(EXAM)
    vi.spyOn(attemptRepository, 'consumeEntitlementForAttempt').mockResolvedValue(false)
    const debit = vi.spyOn(walletService, 'debitForAttempt').mockResolvedValue({} as never)

    await examAttemptService.startFullTryout({ userId: 'user-1' })

    expect(debit).toHaveBeenCalledWith('user-1', 'attempt-1')
  })

  it('jatah habis untuk exam tanpa token: attempt dihapus dan akses ditolak', async () => {
    stubStart({ ...EXAM, tokenCost: 0 })
    vi.spyOn(attemptRepository, 'consumeEntitlementForAttempt').mockResolvedValue(false)
    const remove = vi
      .spyOn(attemptRepository, 'deleteAttempt')
      .mockResolvedValue(undefined as never)

    await expect(examAttemptService.startFullTryout({ userId: 'user-1' })).rejects.toMatchObject({
      code: 'ENTITLEMENT_REQUIRED',
    })
    expect(remove).toHaveBeenCalledWith('attempt-1')
  })

  it('resume attempt bertanda tidak memotong token maupun memakai jatah lagi', async () => {
    vi.spyOn(examRepository, 'findExam').mockResolvedValue(EXAM)
    vi.spyOn(attemptRepository, 'findActiveAttempt').mockResolvedValue({
      id: 'attempt-1',
      started_at: new Date().toISOString(),
      metadata: { entitlementId: 'ent-1' },
    } as never)
    vi.spyOn(attemptRepository, 'waitForAttemptQuestions').mockResolvedValue(undefined as never)
    mocks.entitlements = []
    const consume = vi.spyOn(attemptRepository, 'consumeEntitlementForAttempt')
    const debit = vi.spyOn(walletService, 'debitForAttempt').mockResolvedValue({} as never)

    const result = await examAttemptService.startFullTryout({ userId: 'user-1' })

    expect(result).toEqual({ attemptId: 'attempt-1', resumed: true })
    expect(consume).not.toHaveBeenCalled()
    expect(debit).not.toHaveBeenCalled()
  })

  it('penyelesaian attempt bertanda entitlement tidak memotong token (A-16)', async () => {
    vi.spyOn(scoringService, 'finishAttempt').mockResolvedValue({
      success: true,
      alreadyCompleted: false,
      totalScore: 10,
      percentage: 100,
      passed: true,
    })
    vi.spyOn(activityService, 'syncAttemptDay').mockResolvedValue({} as never)
    vi.spyOn(streakService, 'sync').mockResolvedValue({} as never)
    vi.spyOn(subjectProgressService, 'sync').mockResolvedValue({} as never)
    vi.spyOn(eventRankingService, 'syncForAttempt').mockResolvedValue({} as never)
    vi.spyOn(leaderboardService, 'syncForAttempt').mockResolvedValue({} as never)
    vi.spyOn(attemptRepository, 'getAttemptMetadata').mockResolvedValue({
      practiceKind: 'full_tryout',
      entitlementId: 'ent-1',
    })
    const debit = vi.spyOn(walletService, 'debitForAttempt').mockResolvedValue({} as never)

    await examCompletionService.completeAttempt('user-1', 'attempt-1')

    expect(debit).not.toHaveBeenCalled()
  })
})
