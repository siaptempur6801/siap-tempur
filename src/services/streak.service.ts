import { progressRepository } from '@/src/repositories/progress.repository'
import { dateInJakarta } from '@/src/services/activity.service'

function dayNumber(value: string) {
    return Math.floor(Date.parse(`${value}T00:00:00Z`) / 86_400_000)
}

function isActiveDay(input: { questions_answered: number; practice_seconds: number }) {
    return input.questions_answered > 0 || input.practice_seconds > 0
}

export class StreakService {
    async sync(userId: string) {
        const rows = await progressRepository.listActivityDays(userId)
        const activeDates = Array.from(new Set(
            rows
                .filter(isActiveDay)
                .map((row) => row.activity_date),
        )).sort()

        if (activeDates.length === 0) {
            await progressRepository.upsertStreak({
                userId,
                currentStreak: 0,
                longestStreak: 0,
                lastActiveDate: null,
            })
            return { currentStreak: 0, longestStreak: 0, lastActiveDate: null as string | null }
        }

        let longestStreak = 1
        let running = 1
        for (let index = 1; index < activeDates.length; index += 1) {
            const consecutive = dayNumber(activeDates[index]) - dayNumber(activeDates[index - 1]) === 1
            running = consecutive ? running + 1 : 1
            longestStreak = Math.max(longestStreak, running)
        }

        const lastActiveDate = activeDates[activeDates.length - 1]
        const today = dateInJakarta(new Date())
        const gapFromToday = dayNumber(today) - dayNumber(lastActiveDate)

        let currentStreak = 0
        if (gapFromToday <= 1) {
            currentStreak = 1
            for (let index = activeDates.length - 1; index > 0; index -= 1) {
                if (dayNumber(activeDates[index]) - dayNumber(activeDates[index - 1]) !== 1) break
                currentStreak += 1
            }
        }

        await progressRepository.upsertStreak({
            userId,
            currentStreak,
            longestStreak,
            lastActiveDate,
        })

        return { currentStreak, longestStreak, lastActiveDate }
    }
}

export const streakService = new StreakService()
