import { attemptRepository } from '@/src/repositories/attempt.repository'
import { PracticeDomainError } from '@/src/services/exam-attempt.service'

export class AttemptAnswerService {
    async saveAnswer(input: {
        userId: string
        attemptId: string
        questionId: string
        optionId: string
    }) {
        const attempt = await attemptRepository.getActiveOwnedAttempt(input.userId, input.attemptId)
        if (!attempt) {
            throw new PracticeDomainError('EXAM_CONFIGURATION_ERROR', 'Attempt is not active or does not belong to user')
        }

        const attemptQuestion = await attemptRepository.getAttemptQuestion(input.attemptId, input.questionId)
        if (!attemptQuestion) {
            throw new PracticeDomainError('EXAM_CONFIGURATION_ERROR', 'Question is not allocated to this attempt')
        }

        const option = await attemptRepository.getOptionForQuestion(input.questionId, input.optionId)
        if (!option) {
            throw new PracticeDomainError('EXAM_CONFIGURATION_ERROR', 'Option does not belong to this question')
        }

        await attemptRepository.upsertAnswer({
            attemptQuestionId: attemptQuestion.id,
            optionId: option.id,
        })
        await attemptRepository.touchAttempt(input.attemptId, attemptQuestion.position)

        return { success: true as const }
    }

    async saveAnswerOptions(input: {
        userId: string
        attemptId: string
        questionId: string
        optionIds: string[]
    }) {
        const attempt = await attemptRepository.getActiveOwnedAttempt(input.userId, input.attemptId)
        if (!attempt) {
            throw new PracticeDomainError('EXAM_CONFIGURATION_ERROR', 'Attempt is not active or does not belong to user')
        }

        const attemptQuestion = await attemptRepository.getAttemptQuestion(input.attemptId, input.questionId)
        if (!attemptQuestion) {
            throw new PracticeDomainError('EXAM_CONFIGURATION_ERROR', 'Question is not allocated to this attempt')
        }

        const optionIds = Array.from(new Set(input.optionIds.filter(Boolean)))
        const options = await attemptRepository.getOptionsForQuestion(input.questionId, optionIds)
        if (options.length !== optionIds.length) {
            throw new PracticeDomainError('EXAM_CONFIGURATION_ERROR', 'One or more options do not belong to this question')
        }

        await attemptRepository.upsertAnswerOptions({
            attemptQuestionId: attemptQuestion.id,
            optionIds,
        })
        await attemptRepository.touchAttempt(input.attemptId, attemptQuestion.position)

        return { success: true as const }
    }
}

export const attemptAnswerService = new AttemptAnswerService()
