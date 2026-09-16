import { attemptRepository, type AttemptRow } from '@/src/repositories/attempt.repository'
import { PracticeDomainError } from '@/src/services/exam-attempt.service'

/**
 * Toleransi kecil untuk latensi jaringan saat jawaban terakhir dikirim tepat di
 * detik terakhir. Tidak mengubah integritas skor secara berarti.
 */
const ANSWER_SAVE_GRACE_SECONDS = 30

export function readAttemptDurationSeconds(metadata: AttemptRow['metadata']): number | null {
    if (!metadata || Array.isArray(metadata) || typeof metadata !== 'object') return null
    const value = (metadata as Record<string, unknown>).durationSeconds
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null
}

/**
 * Deadline penyimpanan jawaban (ms). `null` berarti attempt tidak dibatasi waktu
 * (drill/latihan bebas atau durasi tidak diketahui).
 */
export function resolveAnswerDeadlineMs(
    attempt: Pick<AttemptRow, 'metadata' | 'started_at'>,
): number | null {
    const durationSeconds = readAttemptDurationSeconds(attempt.metadata)
    if (!durationSeconds || !attempt.started_at) return null

    const deadlineMs = Date.parse(attempt.started_at) + (durationSeconds + ANSWER_SAVE_GRACE_SECONDS) * 1000
    return Number.isFinite(deadlineMs) ? deadlineMs : null
}

/**
 * Timer di browser hanya alat bantu; batas waktu ujian wajib ditegakkan di server.
 * Tanpa ini, jawaban masih bisa dikirim setelah waktu habis dan skor/leaderboard
 * menjadi tidak sah.
 */
export function assertAnswerWindowOpen(attempt: AttemptRow) {
    const deadlineMs = resolveAnswerDeadlineMs(attempt)
    if (deadlineMs === null) return

    if (Date.now() > deadlineMs) {
        throw new PracticeDomainError(
            'ATTEMPT_TIME_EXPIRED',
            'Waktu ujian sudah berakhir',
            { deadline: new Date(deadlineMs).toISOString() },
        )
    }
}

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
        assertAnswerWindowOpen(attempt)

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
        assertAnswerWindowOpen(attempt)

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
