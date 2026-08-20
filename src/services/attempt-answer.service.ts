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
}

export const attemptAnswerService = new AttemptAnswerService()
