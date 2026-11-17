import { progressRepository, type DailyActivityRow } from '@/src/repositories/progress.repository'
import type { Json } from '@/types/database.types'

const JAKARTA_OFFSET = '+07:00'

function readPracticeKind(metadata: Json) {
  if (!metadata || Array.isArray(metadata) || typeof metadata !== 'object') return null
  return typeof metadata.practiceKind === 'string' ? metadata.practiceKind : null
}

function dateInJakarta(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const byType = new Map(parts.map((part) => [part.type, part.value]))
  return `${byType.get('year')}-${byType.get('month')}-${byType.get('day')}`
}

function dayWindowJakarta(activityDate: string) {
  const start = new Date(`${activityDate}T00:00:00${JAKARTA_OFFSET}`)
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
  return { startIso: start.toISOString(), endIso: end.toISOString() }
}

class ActivityService {
  async syncAttemptDay(userId: string, attemptId: string): Promise<DailyActivityRow> {
    const completed = await progressRepository.getCompletedAttempt(userId, attemptId)
    if (!completed?.submitted_at) {
      throw new Error('COMPLETED_ATTEMPT_REQUIRED_FOR_ACTIVITY')
    }

    const activityDate = dateInJakarta(completed.submitted_at)
    const window = dayWindowJakarta(activityDate)
    const attempts = await progressRepository.listCompletedAttemptsInWindow(
      userId,
      window.startIso,
      window.endIso,
    )
    const scores = await progressRepository.listScores(attempts.map((attempt) => attempt.id))

    const questionsAnswered = scores.reduce(
      (sum, score) => sum + score.correct_count + score.wrong_count,
      0,
    )
    const correctAnswers = scores.reduce((sum, score) => sum + score.correct_count, 0)
    const practiceSeconds = attempts.reduce(
      (sum, attempt) => sum + Math.max(0, attempt.duration_used_seconds ?? 0),
      0,
    )

    let drillAttempts = 0
    let examAttempts = 0
    for (const attempt of attempts) {
      if (readPracticeKind(attempt.metadata) === 'drill') drillAttempts += 1
      else examAttempts += 1
    }

    const row: DailyActivityRow = {
      user_id: userId,
      activity_date: activityDate,
      questions_answered: questionsAnswered,
      practice_seconds: practiceSeconds,
      drill_attempts: drillAttempts,
      exam_attempts: examAttempts,
      correct_answers: correctAnswers,
    }

    await progressRepository.upsertDailyActivity(row)
    return row
  }
}

export const activityService = new ActivityService()
export { dateInJakarta }
