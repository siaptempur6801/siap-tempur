'use server'

import { validateCsrf } from '@/lib/csrf'
import { logger } from '@/lib/logger'
import { tkaFullExamRpcService } from '@/src/services/tka-full-exam-rpc.service'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isUuid(value: string) {
    return UUID_PATTERN.test(value)
}

function messageFor(error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes('SECTION_TIME_EXPIRED')) return 'Waktu section sudah habis.'
    if (message.includes('ALL_SECTIONS_MUST_BE_COMPLETED')) return 'Selesaikan seluruh section sebelum mengirim tryout.'
    if (message.includes('Attempt limit reached')) return 'Batas percobaan tryout sudah tercapai.'
    if (message.includes('active section')) return 'Soal ini tidak berada pada section aktif.'
    return 'Gagal memproses tryout TKA.'
}

export async function saveTkaFullExamAnswer(input: {
    attemptQuestionId: string
    optionIds: string[]
    timeSpentSeconds: number
    isFlagged: boolean
}) {
    try { await validateCsrf() } catch { return { error: 'Invalid request' } }

    const optionIds = Array.from(new Set(input.optionIds))
    if (!isUuid(input.attemptQuestionId) || optionIds.some((id) => !isUuid(id))) {
        return { error: 'Payload jawaban tidak valid.' }
    }

    try {
        await tkaFullExamRpcService.saveAnswer({
            attemptQuestionId: input.attemptQuestionId,
            optionIds,
            timeSpentSeconds: input.timeSpentSeconds,
            isFlagged: input.isFlagged,
        })
        return { success: true as const }
    } catch (error) {
        logger.warn('[tka-full-exam] save answer failed', {
            error: error instanceof Error ? error.message : String(error),
            attemptQuestionId: input.attemptQuestionId,
        })
        return { error: messageFor(error) }
    }
}

export async function completeTkaFullExamSection(attemptId: string) {
    try { await validateCsrf() } catch { return { error: 'Invalid request' } }
    if (!isUuid(attemptId)) return { error: 'Attempt tidak valid.' }

    try {
        const result = await tkaFullExamRpcService.completeSection(attemptId)
        return {
            success: true as const,
            readyToSubmit: result.ready_to_submit === true,
            activeSectionId: typeof result.active_section_id === 'string' ? result.active_section_id : null,
        }
    } catch (error) {
        logger.warn('[tka-full-exam] complete section failed', {
            error: error instanceof Error ? error.message : String(error),
            attemptId,
        })
        return { error: messageFor(error) }
    }
}

export async function submitTkaFullExamAttempt(attemptId: string) {
    try { await validateCsrf() } catch { return { error: 'Invalid request' } }
    if (!isUuid(attemptId)) return { error: 'Attempt tidak valid.' }

    try {
        const result = await tkaFullExamRpcService.submitAttempt(attemptId)
        return {
            success: true as const,
            rawScore: typeof result.raw_score === 'number' ? result.raw_score : Number(result.raw_score ?? 0),
            percentage: typeof result.percentage === 'number' ? result.percentage : Number(result.percentage ?? 0),
        }
    } catch (error) {
        logger.warn('[tka-full-exam] submit attempt failed', {
            error: error instanceof Error ? error.message : String(error),
            attemptId,
        })
        return { error: messageFor(error) }
    }
}
