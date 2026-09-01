import { scoringService } from '@/src/services/scoring.service'
import { activityService } from '@/src/services/activity.service'
import { streakService } from '@/src/services/streak.service'
import { subjectProgressService } from '@/src/services/subject-progress.service'
import { walletService, WalletDomainError } from '@/src/services/wallet.service'
import { eventRankingService } from '@/src/services/event-ranking.service'
import { leaderboardService } from '@/src/services/leaderboard.service'
import { PracticeDomainError } from '@/src/services/exam-attempt.service'

export class ExamCompletionService {
    async completeAttempt(userId: string, attemptId: string) {
        const scoring = await scoringService.finishAttempt(userId, attemptId)

        let wallet
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

        const [activity, subjectProgress, eventRanking, nationalLeaderboards] = await Promise.all([
            activityService.syncAttemptDay(userId, attemptId),
            subjectProgressService.sync(userId),
            eventRankingService.syncForAttempt(userId, attemptId),
            leaderboardService.syncForAttempt(userId, attemptId),
        ])
        const streak = await streakService.sync(userId)

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
