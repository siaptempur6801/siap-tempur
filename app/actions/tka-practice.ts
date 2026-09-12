'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { validateCsrf } from '@/lib/csrf'
import { logger } from '@/lib/logger'
import { createClient, createV2Client } from '@/lib/utils/supabase/server'
import { tkaFullExamRpcService } from '@/src/services/tka-full-exam-rpc.service'
import { isTkaLevelAvailable, parseTkaLevel, tkaContext, tkaLevelPath } from '@/src/tka/context'

const EXAM_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const TKA_DRILL_SUBJECTS = new Set(['BIN', 'MAT'])
type DrillStartPayload = {
    attempt_id?: string
    resumed?: boolean
    subject_code?: string
    knowledge_node_name?: string
    exam_slug?: string
}

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

function friendlyDrillRpcError(error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes('ENTITLEMENT_REQUIRED')) {
        return 'Latihan gratis untuk topik ini sudah digunakan. Tempur Pass diperlukan untuk latihan fokus berikutnya.'
    }
    if (message.includes('ACTIVE_USER_TRACK_REQUIRED')) return 'Aktifkan jalur TKA SMP terlebih dahulu.'
    if (message.includes('DRILL_EXAM_NOT_CONFIGURED')) return 'Latihan fokus untuk topik ini belum dibuka.'
    if (message.includes('DRILL_KNOWLEDGE_NODE_INVALID')) return 'Topik rekomendasi belum memiliki latihan fokus.'
    if (message.includes('DRILL_SUBJECT_INVALID')) return 'Mata pelajaran latihan fokus tidak valid.'
    if (message.includes('DRILL_ENTITLEMENT_FEATURE_MISSING')) return 'Konfigurasi Tempur Pass untuk latihan fokus belum siap.'
    if (message.includes('Exam item count') || message.includes('question count') || message.includes('question version')) {
        return 'Konfigurasi soal latihan fokus belum siap.'
    }
    return 'Gagal memulai latihan fokus.'
}

function friendlySmpRpcError(error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes('ENTITLEMENT_REQUIRED')) return 'Paket aktif diperlukan untuk membuka tryout ini.'
    if (message.includes('Attempt limit reached')) return 'Batas percobaan tryout sudah tercapai.'
    if (message.includes('Active user track required')) return 'Aktifkan jalur TKA SMP terlebih dahulu.'
    if (message.includes('Exam is not active') || message.includes('belum aktif')) return 'Tryout TKA SMP ini belum dibuka.'
    if (message.includes('item count') || message.includes('question count') || message.includes('question version')) {
        return 'Konfigurasi soal tryout belum siap.'
    }
    return 'Tryout TKA SMP staging belum dapat dimulai.'
}

export async function startTkaDrill(levelValue: string, subjectCodeValue: string, knowledgeNodeNameValue: string) {
    try { await validateCsrf() } catch { return { error: 'Invalid request' } }

    const level = parseTkaLevel(levelValue)
    const subjectCode = subjectCodeValue.trim().toUpperCase()
    const knowledgeNodeName = knowledgeNodeNameValue.trim()
    if (level !== 'SMP' || !TKA_DRILL_SUBJECTS.has(subjectCode) || !knowledgeNodeName || knowledgeNodeName.length > 120) {
        return { error: 'Konfigurasi latihan fokus tidak valid.' }
    }

    const path = tkaLevelPath(level)
    const { supabase, userId } = await getCurrentUserContext(path)
    const context = tkaContext(level)
    if (!await hasActiveTrack(supabase, userId, context)) {
        return { error: 'Aktifkan jalur TKA SMP terlebih dahulu.' }
    }

    try {
        // Use the authenticated learner RPC rather than the privileged generic
        // repository path. The RPC enforces ownership, free quota, entitlement,
        // exact competency mapping, and starts the frozen section-engine attempt.
        const learnerClient = await createClient()
        const { data, error } = await learnerClient.rpc('start_tka_smp_drill', {
            p_subject_code: subjectCode,
            p_knowledge_node_name: knowledgeNodeName,
        })
        if (error) throw new Error(error.message)

        const payload = (data && typeof data === 'object' && !Array.isArray(data))
            ? data as DrillStartPayload
            : null
        if (!payload?.attempt_id) throw new Error('DRILL_ATTEMPT_START_FAILED')

        revalidatePath(path)
        revalidatePath(`${path}/progress`)
        return {
            success: true as const,
            sessionId: payload.attempt_id,
            resumed: payload.resumed === true,
            level,
            subjectCode: payload.subject_code ?? subjectCode,
            knowledgeNodeName: payload.knowledge_node_name ?? knowledgeNodeName,
        }
    } catch (error) {
        logger.warn('[startTkaDrill:rpc] Failed to start TKA SMP focused drill', {
            error: error instanceof Error ? error.message : String(error),
            userId,
            subjectCode,
            knowledgeNodeName,
        })
        return { error: friendlyDrillRpcError(error) }
    }
}

export async function startTkaExam(levelValue: string, examSlugValue: string) {
    try { await validateCsrf() } catch { return { error: 'Invalid request' } }

    const level = parseTkaLevel(levelValue)
    const examSlug = examSlugValue.trim().toLowerCase()
    if (!level || !EXAM_SLUG_PATTERN.test(examSlug)) return { error: 'Konfigurasi tryout tidak valid.' }
    if (!isTkaLevelAvailable(level)) return { error: `Tryout TKA ${level} belum tersedia.` }

    const path = tkaLevelPath(level)
    const { supabase, userId } = await getCurrentUserContext(path)
    const context = tkaContext(level)

    if (!await hasActiveTrack(supabase, userId, context)) {
        return { error: `Aktifkan jalur TKA ${level} terlebih dahulu.` }
    }

    try {
        const result = await tkaFullExamRpcService.startSmpExam({ userId, examSlug })
        revalidatePath(path)
        return {
            success: true as const,
            sessionId: result.attemptId,
            resumed: result.resumed,
            level,
        }
    } catch (error) {
        logger.warn('[startTkaExam:rpc] Failed to start TKA SMP exam', {
            error: error instanceof Error ? error.message : String(error),
            userId,
            level,
            examSlug,
        })
        return { error: friendlySmpRpcError(error) }
    }
}
