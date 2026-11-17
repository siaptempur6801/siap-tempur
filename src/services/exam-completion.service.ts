import { scoringService } from '@/src/services/scoring.service'
import { activityService } from '@/src/services/activity.service'
import { streakService } from '@/src/services/streak.service'
import { subjectProgressService } from '@/src/services/subject-progress.service'
import { walletService, WalletDomainError } from '@/src/services/wallet.service'
import { eventRankingService } from '@/src/services/event-ranking.service'
import { leaderboardService } from '@/src/services/leaderboard.service'
import { hasEntitlementMarker, PracticeDomainError } from '@/src/services/exam-attempt.service'
import { attemptRepository } from '@/src/repositories/attempt.repository'
import { logger } from '@/lib/logger'

async function bestEffort<T>(
  step: string,
  userId: string,
  attemptId: string,
  run: () => Promise<T>,
): Promise<T | null> {
  try {
    return await run()
  } catch (error) {
    logger.error('Sinkronisasi pasca-penilaian gagal', error, {
      alert: 'attempt_post_scoring_sync_failed',
      step,
      userId,
      attemptId,
    })
    return null
  }
}

class ExamCompletionService {
  async completeAttempt(userId: string, attemptId: string) {
    const scoring = await scoringService.finishAttempt(userId, attemptId)

    let wallet
    const metadata = await attemptRepository.getAttemptMetadata(userId, attemptId)
    const eventContext = Boolean(
      metadata &&
      !Array.isArray(metadata) &&
      typeof metadata === 'object' &&
      (['event', 'EVENT'].includes(String(metadata.accessContext ?? '')) ||
        Boolean(metadata.eventId)),
    )
    const organizationContext = Boolean(
      metadata &&
      !Array.isArray(metadata) &&
      typeof metadata === 'object' &&
      (['organization', 'ORGANIZATION'].includes(String(metadata.accessContext ?? '')) ||
        Boolean(metadata.organizationId && metadata.assignmentId)),
    )

    // A distribution grants access to this attempt. Its completion must not
    // depend on the participant having a personal token balance.
    // Attempt yang ditanggung entitlement tidak dipotong token (audit A-16).
    if (!organizationContext && !eventContext && !hasEntitlementMarker(metadata)) {
      try {
        wallet = await walletService.debitForAttempt(userId, attemptId)
      } catch (error) {
        if (error instanceof WalletDomainError) {
          if (error.code === 'INSUFFICIENT_TOKEN_BALANCE' || error.code === 'WALLET_NOT_FOUND') {
            throw new PracticeDomainError(
              'INSUFFICIENT_TOKEN_BALANCE',
              'Exam token balance is insufficient to complete this attempt',
            )
          }
          throw new PracticeDomainError('EXAM_CONFIGURATION_ERROR', error.message)
        }
        throw error
      }
    }

    // Skor sudah tersimpan di atas. Sinkronisasi turunan (aktivitas, progres, ranking,
    // leaderboard, streak) bersifat best-effort: kegagalannya dicatat dengan kunci
    // alert, bukan dikembalikan sebagai "gagal mengumpulkan" ke peserta (audit A-11).
    // Ranking event dihitung ulang lagi oleh cron. Baris leaderboard nasional peserta
    // ini baru tersinkron lagi pada submit berikutnya atau saat papan dibangun ulang
    // (`rebuild_leaderboard`); kegagalannya terlihat lewat kunci alert di atas.
    const [activity, subjectProgress, eventRanking, nationalLeaderboards] = await Promise.all([
      bestEffort('activity', userId, attemptId, () =>
        activityService.syncAttemptDay(userId, attemptId),
      ),
      bestEffort('subject_progress', userId, attemptId, () => subjectProgressService.sync(userId)),
      bestEffort('event_ranking', userId, attemptId, () =>
        eventRankingService.syncForAttempt(userId, attemptId),
      ),
      bestEffort('leaderboard', userId, attemptId, () =>
        leaderboardService.syncForAttempt(userId, attemptId),
      ),
    ])
    const streak = await bestEffort('streak', userId, attemptId, () => streakService.sync(userId))

    return {
      scoring,
      wallet,
      activity,
      streak,
      subjectProgress,
      eventRanking,
      nationalLeaderboards,
    }
  }
}

export const examCompletionService = new ExamCompletionService()
