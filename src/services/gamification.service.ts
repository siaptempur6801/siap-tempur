import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { getAttemptXp, getGamificationProgress, getGamificationReward } from '@/lib/gamification'
import { practiceOverviewRepository } from '@/src/repositories/practice-overview.repository'

export class GamificationService {
    async getOverview(userId: string, learnerClient?: SupabaseClient<Database>) {
        const [totals, streak] = await Promise.all([
            practiceOverviewRepository.getCompletedAttemptTotals(userId, learnerClient),
            practiceOverviewRepository.getStreak(userId, learnerClient),
        ])

        return {
            ...getGamificationProgress(totals.totalXp),
            totalSessions: totals.totalSessions,
            streak,
        }
    }

    async getAttemptReward(userId: string, attempt: { score: number; practiceKind?: string | null }, learnerClient?: SupabaseClient<Database>) {
        const overview = await this.getOverview(userId, learnerClient)
        return {
            ...getGamificationReward(overview.xp, getAttemptXp(attempt.score, attempt.practiceKind)),
            streakCount: overview.streak,
            isStreak: overview.streak > 0,
        }
    }
}

export const gamificationService = new GamificationService()
