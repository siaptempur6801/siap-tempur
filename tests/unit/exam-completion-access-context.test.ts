import { afterEach, describe, expect, it, vi } from 'vitest'
import { attemptRepository } from '@/src/repositories/attempt.repository'
import { activityService } from '@/src/services/activity.service'
import { eventRankingService } from '@/src/services/event-ranking.service'
import { examCompletionService } from '@/src/services/exam-completion.service'
import { leaderboardService } from '@/src/services/leaderboard.service'
import { scoringService } from '@/src/services/scoring.service'
import { streakService } from '@/src/services/streak.service'
import { subjectProgressService } from '@/src/services/subject-progress.service'
import { walletService } from '@/src/services/wallet.service'

describe('attempt completion access context', () => {
  afterEach(() => vi.restoreAllMocks())

  function stubSideEffects() {
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
  }

  it.each([
    ['Event metadata', { eventId: 'event-1', practiceKind: 'event' }],
    ['Event explicit context', { accessContext: 'event' }],
    ['Organization assignment', { accessContext: 'organization', assignmentId: 'assignment-1' }],
  ])('%s does not debit participant tokens on completion', async (_label, metadata) => {
    stubSideEffects()
    vi.spyOn(attemptRepository, 'getAttemptMetadata').mockResolvedValue(metadata)
    const debit = vi.spyOn(walletService, 'debitForAttempt').mockResolvedValue({} as never)

    await examCompletionService.completeAttempt('user-1', 'attempt-1')

    expect(debit).not.toHaveBeenCalled()
  })

  it('keeps the normal Direct token debit', async () => {
    stubSideEffects()
    vi.spyOn(attemptRepository, 'getAttemptMetadata').mockResolvedValue({
      practiceKind: 'full_tryout',
    })
    const debit = vi.spyOn(walletService, 'debitForAttempt').mockResolvedValue({} as never)

    await examCompletionService.completeAttempt('user-1', 'attempt-1')

    expect(debit).toHaveBeenCalledWith('user-1', 'attempt-1')
  })

  it('kegagalan sync ranking setelah skor tersimpan tidak menggagalkan submit (A-11)', async () => {
    stubSideEffects()
    vi.spyOn(attemptRepository, 'getAttemptMetadata').mockResolvedValue({ eventId: 'event-1' })
    vi.mocked(eventRankingService.syncForAttempt).mockRejectedValueOnce(
      Object.assign(new Error('duplicate key value violates unique constraint'), { code: '23505' }),
    )
    vi.mocked(streakService.sync).mockRejectedValueOnce(new Error('streak down'))
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const result = await examCompletionService.completeAttempt('user-1', 'attempt-1')

    expect(result.scoring.totalScore).toBe(10)
    expect(result.eventRanking).toBeNull()
    expect(result.streak).toBeNull()
    const logged = errorLog.mock.calls.map((call) => String(call[0])).join(' ')
    expect(logged).toContain('attempt_post_scoring_sync_failed')
    expect(logged).toContain('event_ranking')
  })
})
