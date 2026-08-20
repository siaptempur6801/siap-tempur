'use server'

import { DRILLING_MATERI_QUESTION_COUNT } from '@/lib/practice-session'
import { createV2Client } from '@/lib/utils/supabase/server'
import { getMiniTryoutProduct, isMiniTryoutType, type MiniTryoutType } from '@/lib/constants'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { validateCsrf } from '@/lib/csrf'
import { logger } from '@/lib/logger'
import { examAttemptService, PracticeDomainError, type StartAttemptResult } from '@/src/services/exam-attempt.service'
import { attemptAnswerService } from '@/src/services/attempt-answer.service'
import { examCompletionService } from '@/src/services/exam-completion.service'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isUuid(value: string) {
    return UUID_PATTERN.test(value)
}

async function getCurrentUserId() {
    const supabase = await createV2Client()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')
    return user.id
}

function practiceErrorMessage(error: PracticeDomainError) {
    switch (error.code) {
        case 'EXAM_NOT_CONFIGURED':
            return 'Ujian Schema V2 belum dikonfigurasi atau belum diaktifkan di staging.'
        case 'QUESTION_BANK_EMPTY':
            return 'Bank soal untuk ujian ini masih kosong.'
        case 'QUESTION_BANK_INCOMPLETE': {
            const selected = typeof error.details?.selected === 'number' ? error.details.selected : null
            const required = typeof error.details?.required === 'number' ? error.details.required : null
            return selected !== null && required !== null
                ? `Bank soal baru tersedia ${selected}/${required} soal.`
                : 'Bank soal untuk ujian ini belum lengkap.'
        }
        case 'ATTEMPT_LIMIT_REACHED':
            return 'Batas percobaan untuk ujian ini sudah tercapai.'
        case 'ENTITLEMENT_REQUIRED':
            return 'Akun ini belum memiliki akses untuk ujian tersebut.'
        case 'INSUFFICIENT_TOKEN_BALANCE':
            return 'Token tryout kamu tidak mencukupi untuk ujian ini.'
        case 'EXAM_CONFIGURATION_ERROR':
            return 'Konfigurasi ujian Schema V2 belum lengkap.'
        default:
            return 'Gagal memproses ujian.'
    }
}

async function runStartWithExpiredAttemptRecovery(
    userId: string,
    start: () => Promise<StartAttemptResult>,
) {
    try {
        return await start()
    } catch (error) {
        if (error instanceof PracticeDomainError && error.code === 'EXPIRED_ATTEMPT') {
            const attemptId = typeof error.details?.attemptId === 'string' ? error.details.attemptId : null
            if (attemptId) {
                await examCompletionService.completeAttempt(userId, attemptId)
                return start()
            }
        }
        throw error
    }
}

function revalidatePracticeStart() {
    revalidatePath('/cpns/dashboard')
    revalidatePath('/cpns/dashboard/tryout')
    revalidatePath('/cpns/dashboard/mini-tryout')
    revalidatePath('/cpns/dashboard/drilling-materi')
    revalidatePath('/cpns/dashboard/profile')
    revalidatePath('/cpns/dashboard/riwayat')
}

function revalidatePracticeFinish(attemptId: string) {
    revalidatePath(`/cpns/dashboard/tryout/${attemptId}/result`)
    revalidatePath('/cpns/dashboard')
    revalidatePath('/cpns/dashboard/ranking')
    revalidatePath('/cpns/dashboard/tryout')
    revalidatePath('/cpns/dashboard/mini-tryout')
    revalidatePath('/cpns/dashboard/drilling-materi')
    revalidatePath('/cpns/dashboard/event')
    revalidatePath('/cpns/dashboard/profile')
    revalidatePath('/cpns/dashboard/riwayat')
}

export async function startPractice(type: MiniTryoutType) {
    try { await validateCsrf() } catch { return { error: 'Invalid request' } }

    const product = getMiniTryoutProduct(type)
    if (!product) return { error: 'Tipe mini tryout tidak valid' }

    const userId = await getCurrentUserId()

    try {
        const result = await runStartWithExpiredAttemptRecovery(userId, () =>
            examAttemptService.startMiniTryout({
                userId,
                subjectCode: product.type,
                questionCount: product.questionCount,
            }),
        )
        revalidatePracticeStart()
        return { success: true, sessionId: result.attemptId, resumed: result.resumed }
    } catch (error) {
        logger.warn('[startPractice:v2] Failed to start mini tryout', {
            error: error instanceof Error ? error.message : String(error),
            type,
            userId,
        })
        if (error instanceof PracticeDomainError) return { error: practiceErrorMessage(error) }
        return { error: 'Gagal memulai mini tryout.' }
    }
}

export async function startMiniTryout(type: MiniTryoutType) {
    return startPractice(type)
}

export async function startDrillingMateri(type: MiniTryoutType, subCategory: string) {
    try { await validateCsrf() } catch { return { error: 'Invalid request' } }

    if (!isMiniTryoutType(type)) return { error: 'Tipe drilling tidak valid' }
    const normalizedSubCategory = subCategory.trim()
    if (!normalizedSubCategory) return { error: 'Materi drilling tidak valid' }

    const userId = await getCurrentUserId()

    try {
        const result = await runStartWithExpiredAttemptRecovery(userId, () =>
            examAttemptService.startDrill({
                userId,
                subjectCode: type,
                knowledgeNodeName: normalizedSubCategory,
                questionCount: DRILLING_MATERI_QUESTION_COUNT,
            }),
        )
        revalidatePracticeStart()
        return { success: true, sessionId: result.attemptId, resumed: result.resumed }
    } catch (error) {
        logger.warn('[startDrillingMateri:v2] Failed to start drill', {
            error: error instanceof Error ? error.message : String(error),
            type,
            subCategory: normalizedSubCategory,
            userId,
        })
        if (error instanceof PracticeDomainError) return { error: practiceErrorMessage(error) }
        return { error: 'Gagal memulai drilling materi.' }
    }
}

export async function startTryout() {
    try { await validateCsrf() } catch { return { error: 'Invalid request' } }

    const userId = await getCurrentUserId()
    try {
        const result = await runStartWithExpiredAttemptRecovery(userId, () =>
            examAttemptService.startFullTryout({ userId }),
        )
        revalidatePracticeStart()
        return { success: true, sessionId: result.attemptId, resumed: result.resumed }
    } catch (error) {
        logger.warn('[startTryout:v2] Failed to start full tryout', {
            error: error instanceof Error ? error.message : String(error),
            userId,
        })
        if (error instanceof PracticeDomainError) return { error: practiceErrorMessage(error) }
        return { error: 'Gagal memulai tryout.' }
    }
}

export async function submitAnswer(sessionId: string, questionId: string, optionId: string) {
    try { await validateCsrf() } catch { return { error: 'Invalid request' } }

    if (!isUuid(sessionId) || !isUuid(questionId) || !isUuid(optionId)) {
        return { error: 'Invalid answer payload' }
    }

    const userId = await getCurrentUserId()
    try {
        await attemptAnswerService.saveAnswer({
            userId,
            attemptId: sessionId,
            questionId,
            optionId,
        })
        return { success: true }
    } catch (error) {
        logger.warn('[submitAnswer:v2] Failed to save answer', {
            error: error instanceof Error ? error.message : String(error),
            attemptId: sessionId,
            questionId,
            userId,
        })
        if (error instanceof PracticeDomainError) return { error: practiceErrorMessage(error) }
        return { error: 'Failed to save answer' }
    }
}

export async function finishPractice(sessionId: string) {
    try { await validateCsrf() } catch { return { error: 'Invalid request' } }

    if (!isUuid(sessionId)) return { error: 'Invalid session payload' }

    const userId = await getCurrentUserId()
    try {
        await examCompletionService.completeAttempt(userId, sessionId)
        revalidatePracticeFinish(sessionId)
        return { success: true }
    } catch (error) {
        logger.warn('[finishPractice:v2] Failed to finish attempt', {
            error: error instanceof Error ? error.message : String(error),
            attemptId: sessionId,
            userId,
        })
        if (error instanceof PracticeDomainError) return { error: practiceErrorMessage(error) }
        return { error: 'Failed to finish session' }
    }
}
