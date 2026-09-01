import { progressRepository, type SubjectProgressRow } from '@/src/repositories/progress.repository'

type SubjectAccumulator = {
    subjectId: string
    attemptIds: Set<string>
    questionsAnswered: number
    correctAnswers: number
    totalQuestions: number
    weightedPercentage: number
}

function round2(value: number) {
    return Number(value.toFixed(2))
}

export class SubjectProgressService {
    async sync(userId: string) {
        const attemptIds = await progressRepository.listAllCompletedAttemptIds(userId)
        const scores = await progressRepository.listScores(attemptIds)
        const bySubject = new Map<string, SubjectAccumulator>()

        for (const score of scores) {
            if (!score.subject_id) continue

            const current = bySubject.get(score.subject_id) ?? {
                subjectId: score.subject_id,
                attemptIds: new Set<string>(),
                questionsAnswered: 0,
                correctAnswers: 0,
                totalQuestions: 0,
                weightedPercentage: 0,
            }

            const answered = score.correct_count + score.wrong_count
            const totalQuestions = answered + score.unanswered_count
            current.attemptIds.add(score.attempt_id)
            current.questionsAnswered += answered
            current.correctAnswers += score.correct_count
            current.totalQuestions += totalQuestions
            if (score.percentage !== null && totalQuestions > 0) {
                current.weightedPercentage += score.percentage * totalQuestions
            }
            bySubject.set(score.subject_id, current)
        }

        const now = new Date().toISOString()
        const rows: SubjectProgressRow[] = Array.from(bySubject.values()).map((subject) => ({
            user_id: userId,
            subject_id: subject.subjectId,
            attempts: subject.attemptIds.size,
            questions_answered: subject.questionsAnswered,
            accuracy: subject.questionsAnswered > 0
                ? round2((subject.correctAnswers / subject.questionsAnswered) * 100)
                : 0,
            mastery_score: subject.totalQuestions > 0
                ? round2(subject.weightedPercentage / subject.totalQuestions)
                : 0,
            updated_at: now,
        }))

        await progressRepository.upsertSubjectProgress(rows)
        return rows
    }
}

export const subjectProgressService = new SubjectProgressService()
