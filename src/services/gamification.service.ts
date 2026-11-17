import { getAttemptXp, getGamificationProgress, getGamificationReward } from '@/lib/gamification'
import { practiceOverviewRepository } from '@/src/repositories/practice-overview.repository'

export class GamificationService {
    async getOverview(userId: string) {
        const [totals, streak] = await Promise.all([
            practiceOverviewRepository.getCompletedAttemptTotals(userId),
            practiceOverviewRepository.getStreak(userId),
        ])

        return {
            ...getGamificationProgress(totals.totalXp),
            totalSessions: totals.totalSessions,
            streak,
        }
    }

    async getAttemptReward(userId: string, attempt: { score: number; practiceKind?: string | null }) {
        const overview = await this.getOverview(userId)
        return {
            ...getGamificationReward(overview.xp, getAttemptXp(attempt.score, attempt.practiceKind)),
            streakCount: overview.streak,
            isStreak: overview.streak > 0,
        }
    }
}

export const gamificationService = new GamificationService()
