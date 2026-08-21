'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { validateCsrf } from '@/lib/csrf'
import { env } from '@/lib/env'
import { logger } from '@/lib/logger'
import { createV2Client } from '@/lib/utils/supabase/server'
import { examAttemptService, PracticeDomainError, type StartAttemptResult } from '@/src/services/exam-attempt.service'
import { examCompletionService } from '@/src/services/exam-completion.service'
import { tkaFullExamRpcService } from '@/src/services/tka-full-exam-rpc.service'
import { parseTkaLevel, tkaContext, tkaLevelPath } from '@/src/tka/context'

const EXAM_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

async function getCurrentUserContext(returnTo: string) {
    const supabase = await createV2Client()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`)
    return { supabase, userId: user.id }
}

async function hasActiveTrack(
    supabase: Awaited<ReturnType<typeof createV2Client>>,
    userId: string,
    context: ReturnType<typeof tkaContext>,
) {
    const { data: program, error: programError } = await supabase
        .from('programs')
        .select('id')
        .eq('code', context.programCode)
        .maybeSingle()
    if (programError) throw programError
    if (!program) return false

    const { data: track, error: trackError } = await supabase
        .from('tracks')
        .select('id')
        .eq('program_id', program.id)
        .eq('code', context.trackCode)
        .maybeSingle()
    if (trackError) throw trackError
    if (!track) return false

    const { data: userTrack, error: userTrackError } = await supabase
        .from('user_tracks')
        .select('status')
        .eq('user_id', userId)
        .eq('track_id', track.id)
        .maybeSingle()
    if (userTrackError) throw userTrackError
    return userTrack?.status.toLowerCase() === 'active'
}

function friendlyError(error: PracticeDomainError) {
    switch (error.code) {
        case 'EXAM_NOT_CONFIGURED': return 'Tryout ini belum dibuka.'
        case 'QUESTION_BANK_EMPTY': return 'Bank soal tryout ini masih kosong.'
        case 'QUESTION_BANK_INCOMPLETE': {
            const selected = typeof error.details?.selected === 'number' ? error.details.selected : null
            const required = typeof error.details?.required === 'number' ? error.details.required : null
            return selected !== null && required !== null
                ? `Bank soal baru tersedia ${selected}/${required} soal.`
                : 'Bank soal tryout ini belum lengkap.'
        }
        case 'ATTEMPT_LIMIT_REACHED': return 'Batas percobaan tryout sudah tercapai.'
        case 'ENTITLEMENT_REQUIRED': return 'Paket aktif diperlukan untuk membuka tryout ini.'
        case 'INSUFFICIENT_TOKEN_BALANCE': return 'Token kamu tidak mencukupi untuk tryout ini.'
        default: return 'Tryout belum dapat dimulai.'
    }
}

async function startWithExpiredRecovery(userId: string, start: () => Promise<StartAttemptResult>) {
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

export async function startTkaExam(levelValue: string, examSlugValue: string) {
    try { await validateCsrf() } catch { return { error: 'Invalid request' } }

    const level = parseTkaLevel(levelValue)
    const examSlug = examSlugValue.trim().toLowerCase()
    if (!level || !EXAM_SLUG_PATTERN.test(examSlug)) return { error: 'Konfigurasi tryout tidak valid.' }

    const path = tkaLevelPath(level)
    const { supabase, userId } = await getCurrentUserContext(path)
    const context = tkaContext(level)

    if (!await hasActiveTrack(supabase, userId, context)) {
        return { error: `Aktifkan jalur TKA ${level} terlebih dahulu.` }
    }

    const useSmpFullExamRpc = level === 'SMP'
        && examSlug === 'tka-smp-full'
        && env.appEnvironment() !== 'production'

    if (useSmpFullExamRpc) {
        try {
            const result = await tkaFullExamRpcService.startSmpFullExam({ userId, examSlug })
            revalidatePath(path)
            return {
                success: true as const,
                sessionId: result.attemptId,
                resumed: result.resumed,
                level,
            }
        } catch (error) {
            logger.warn('[startTkaExam:rpc] Failed to start staging TKA SMP full exam', {
                error: error instanceof Error ? error.message : String(error),
                userId,
                level,
                examSlug,
            })
            const message = error instanceof Error ? error.message : ''
            if (message.includes('Attempt limit reached')) return { error: 'Batas percobaan tryout sudah tercapai.' }
            return { error: 'Full Tryout TKA SMP staging belum dapat dimulai.' }
        }
    }

    try {
        const result = await startWithExpiredRecovery(userId, () =>
            examAttemptService.startConfiguredExam({ userId, context, examSlug }),
        )
        revalidatePath(path)
        return {
            success: true as const,
            sessionId: result.attemptId,
            resumed: result.resumed,
            level,
        }
    } catch (error) {
        logger.warn('[startTkaExam:v2] Failed to start configured TKA exam', {
            error: error instanceof Error ? error.message : String(error),
            userId,
            level,
            examSlug,
        })
        if (error instanceof PracticeDomainError) return { error: friendlyError(error) }
        return { error: 'Gagal memulai tryout TKA.' }
    }
}
