import { attemptRepository, type AttemptAnswerRow, type ScoringOptionRow } from '@/src/repositories/attempt.repository'
import { PracticeDomainError } from '@/src/services/exam-attempt.service'
import type { Json } from '@/types/database.types'

type SubjectAccumulator = {
    subjectId: string
    rawScore: number
    maxScore: number
    correctCount: number
    wrongCount: number
    unansweredCount: number
    passingScore: number | null
}

function readSnapshotField<T extends string | number>(snapshot: Json, key: string): T | null {
    if (!snapshot || Array.isArray(snapshot) || typeof snapshot !== 'object') return null
    const value = snapshot[key]
    if (typeof value === 'string' || typeof value === 'number') return value as T
    return null
}

function durationSeconds(startedAt: string | null) {
    if (!startedAt) return null
    const started = Date.parse(startedAt)
    if (!Number.isFinite(started)) return null
    return Math.max(0, Math.floor((Date.now() - started) / 1000))
}

export function calculateQuestionScore(input: {
    maxScore: number
    option: ScoringOptionRow | null
}) {
    if (!input.option) {
        return { score: 0, isCorrect: null as boolean | null }
    }

    const score = input.option.score ?? (input.option.is_correct === true ? input.maxScore : 0)
    return {
        score: Math.max(0, score),
        isCorrect: input.option.is_correct,
    }
}

export class ScoringService {
    async finishAttempt(userId: string, attemptId: string) {
        const bundle = await attemptRepository.getAttemptBundle(userId, attemptId)
        if (!bundle) {
            throw new PracticeDomainError('EXAM_CONFIGURATION_ERROR', 'Attempt not found')
        }

        if (!['in_progress', 'IN_PROGRESS', 'created', 'CREATED'].includes(bundle.attempt.status)) {
            return {
                success: true as const,
                alreadyCompleted: true as const,
                totalScore: bundle.attempt.total_score ?? 0,
                percentage: bundle.attempt.percentage,
                passed: bundle.attempt.passed,
            }
        }

        if (bundle.questions.length === 0) {
            throw new PracticeDomainError('EXAM_CONFIGURATION_ERROR', 'Attempt has no allocated questions')
        }

        const answerByQuestion = new Map<string, AttemptAnswerRow>()
        for (const answer of bundle.answers) answerByQuestion.set(answer.attempt_question_id, answer)

        const selectedOptionIds = Array.from(new Set(
            bundle.answers
                .map((answer) => answer.selected_option_id)
                .filter((id): id is string => Boolean(id)),
        ))
        const options = await attemptRepository.getScoringOptions(selectedOptionIds)
        const optionById = new Map(options.map((option) => [option.id, option]))

        const subjects = new Map<string, SubjectAccumulator>()
        let totalScore = 0
        let totalMaxScore = 0

        for (const question of bundle.questions) {
            const answer = answerByQuestion.get(question.id)
            const option = answer?.selected_option_id ? optionById.get(answer.selected_option_id) ?? null : null
            const scored = calculateQuestionScore({ maxScore: question.max_score, option })

            totalScore += scored.score
            totalMaxScore += question.max_score

            const subjectId = readSnapshotField<string>(question.question_snapshot, 'subjectId')
            if (subjectId) {
                const current = subjects.get(subjectId) ?? {
                    subjectId,
                    rawScore: 0,
                    maxScore: 0,
                    correctCount: 0,
                    wrongCount: 0,
                    unansweredCount: 0,
                    passingScore: readSnapshotField<number>(question.question_snapshot, 'passingScore'),
                }

                current.rawScore += scored.score
                current.maxScore += question.max_score
                if (!answer?.selected_option_id) current.unansweredCount += 1
                else if (scored.isCorrect === true) current.correctCount += 1
                else if (scored.isCorrect === false) current.wrongCount += 1
                subjects.set(subjectId, current)
            }

            if (answer) {
                await attemptRepository.updateAnswerScore(answer.id, {
                    isCorrect: scored.isCorrect,
                    score: scored.score,
                })
            }
        }

        const subjectScores = Array.from(subjects.values()).map((subject) => {
            const percentage = subject.maxScore > 0
                ? Number(((subject.rawScore / subject.maxScore) * 100).toFixed(2))
                : null
            const passed = subject.passingScore === null ? null : subject.rawScore >= subject.passingScore
            return {
                attemptId,
                subjectId: subject.subjectId,
                rawScore: subject.rawScore,
                percentage,
                passingScore: subject.passingScore,
                passed,
                correctCount: subject.correctCount,
                wrongCount: subject.wrongCount,
                unansweredCount: subject.unansweredCount,
            }
        })

        await attemptRepository.upsertScores(subjectScores)

        const percentage = totalMaxScore > 0
            ? Number(((totalScore / totalMaxScore) * 100).toFixed(2))
            : null
        const passStates = subjectScores.map((score) => score.passed).filter((value): value is boolean => value !== null)
        const passed = passStates.length === subjectScores.length && passStates.length > 0
            ? passStates.every(Boolean)
            : null

        await attemptRepository.completeAttempt({
            attemptId,
            totalScore,
            percentage,
            passed,
            durationUsedSeconds: durationSeconds(bundle.attempt.started_at),
        })

        return {
            success: true as const,
            alreadyCompleted: false as const,
            totalScore,
            percentage,
            passed,
        }
    }
}

export const scoringService = new ScoringService()
