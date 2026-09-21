'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { validateCsrf } from '@/lib/csrf'
import { createClient } from '@/lib/utils/supabase/server'
import { authorizationService, AuthorizationError } from '@/src/services/authorization.service'
import { PERMISSIONS, type PermissionCode } from '@/src/auth/permissions'
import type { ProgramTrackContext } from '@/src/services/catalog-context.service'
import { SUBMITTABLE_STATUSES, isReviewBatchCode, type ReviewBatchCode } from '@/lib/review-batch'
import { logger } from '@/lib/logger'

/**
 * Aksi REVIEW MASSAL untuk panel admin.
 *
 * KENAPA ADA
 *   Alur review menyediakan satu soal per satu form. Untuk satu batch (mis. 80
 *   soal CPNS yang dibutuhkan satu set Full Tryout) itu berarti ~1.700 klik:
 *   Kirim -> Assign -> Approve x3 tahap -> Publish, per soal.
 *
 *   Tiga RPC massal sudah lama ada di database dan jelas dibuat untuk kasus ini,
 *   tetapi TIDAK PERNAH DIPAKAI — tidak ada UI maupun server action yang
 *   memanggilnya. Modul ini yang memakainya.
 *
 * CARA KERJA (dan kenapa begini)
 *   `review_question_stage` MENGOSONGKAN `reviewer_id` di `questions` dan
 *   `content_reviews` setiap kali satu tahap selesai, lalu membuat review
 *   pending baru untuk tahap berikutnya. Sementara `bulk_review_pilot_stage`
 *   hanya menyentuh soal yang `reviewer_id = auth.uid()`.
 *
 *   Jadi setiap tahap butuh DUA panggilan, bukan satu:
 *       1. `claim_pilot_review_stage` -> tugaskan diri sendiri sebagai reviewer
 *       2. `bulk_review_pilot_stage`  -> putuskan satu tahap untuk seluruh batch
 *
 *   Itulah sebabnya batch 80 soal hanya butuh 6 panggilan untuk 3 tahap,
 *   bukan 240.
 *
 * YANG TIDAK DILAKUKAN MODUL INI
 *   Tidak ada satu pun status yang ditembus. Semua transisi melewati RPC resmi
 *   yang menegakkan `auth.uid()`, permission, aturan "author != reviewer", dan
 *   penjaga workflow di database. Aksi di sini hanya mempercepat langkah
 *   mekanis — tidak ada yang otomatis menyetujui atau menerbitkan soal.
 */

const REVIEW_STAGES = [
    { key: 'editorial', label: 'Editorial' },
    { key: 'academic', label: 'Akademik' },
    { key: 'technical_qa', label: 'QA Teknis' },
] as const

function batchFrom(form: FormData): ReviewBatchCode {
    const raw = text(form, 'batch')
    if (!isReviewBatchCode(raw)) {
        throw new Error('BATCH_CODE_INVALID')
    }
    return raw
}

function text(form: FormData, key: string) {
    const value = form.get(key)
    return typeof value === 'string' ? value.trim() : ''
}

function contextFrom(form: FormData): ProgramTrackContext {
    return {
        programCode: (text(form, 'program_code') || 'CPNS').toUpperCase(),
        trackCode: (text(form, 'track_code') || 'SKD').toUpperCase(),
    }
}

async function requireAny(permissions: PermissionCode[]) {
    const authorization = await authorizationService.requireAuthenticated()
    if (!permissions.some((permission) => authorization.permissions.includes(permission))) {
        throw new AuthorizationError(`Missing one of permissions: ${permissions.join(', ')}`)
    }
    return authorization
}

function friendlyError(error: unknown) {
    const message = error instanceof Error ? error.message : 'BATCH_REVIEW_FAILED'
    const known: Record<string, string> = {
        BATCH_CODE_INVALID: 'Kode batch tidak dikenal.',
        BATCH_EMPTY: 'Tidak ada soal di batch ini.',
        BATCH_TOO_LARGE: 'Batch terlalu besar untuk satu tindakan (maksimal 1.000 soal).',
        'Keputusan review tidak valid.': 'Keputusan review tidak valid.',
        'Authentication required': 'Sesi tidak valid. Silakan masuk ulang.',
        'Content review permission required': 'Akun ini tidak punya permission review.',
        'Content publish permission required': 'Akun ini tidak punya permission publish.',
        'Reviewer assignment permission required': 'Akun ini tidak punya permission menugaskan reviewer.',
        'Author cannot review their own question': 'Anda adalah author soal ini, jadi tidak boleh mereviewnya sendiri.',
        'Target user is not an active content reviewer': 'Reviewer tujuan tidak aktif atau tanpa permission review.',
        'Question is not assigned to current reviewer': 'Soal ini tidak ditugaskan kepada Anda. Jalankan "Siapkan & klaim" lebih dulu.',
        'Question is not in an active review stage': 'Soal tidak berada di tahap review yang aktif.',
        'No pending assigned review found': 'Tidak ada review pending untuk Anda di tahap ini.',
        'Only approved questions can be published': 'Hanya soal berstatus approved yang dapat diterbitkan.',
        'Pending review still exists': 'Masih ada review yang menggantung pada soal ini.',
        'Invalid review decision': 'Keputusan review tidak valid.',
    }
    return known[message] || message
}

function workspaceUrl(context: ProgramTrackContext, ok?: string | null, error?: unknown) {
    const params = new URLSearchParams({
        program: context.programCode,
        track: context.trackCode,
    })
    if (ok) params.set('ok', ok)
    if (error) params.set('error', friendlyError(error))
    return `/admin/content/review?${params.toString()}`
}

function finish(context: ProgramTrackContext, ok: string, error?: unknown): never {
    revalidatePath('/admin/content/review')
    redirect(workspaceUrl(context, error ? null : ok, error))
}

function countFrom(data: unknown, key: string) {
    const payload = (data ?? {}) as Record<string, unknown>
    const value = Number(payload[key] ?? 0)
    return Number.isFinite(value) ? value : 0
}

type BatchClient = Awaited<ReturnType<typeof createClient>>

/** Soal di batch ini beserta statusnya (dipakai untuk memutuskan langkah aman). */
async function listBatchQuestions(client: BatchClient, batch: ReviewBatchCode) {
    const { data, error } = await client
        .from('questions')
        .select('id, status')
        .contains('response_config', { pilotBatch: batch })
        .limit(500)
    if (error) throw error
    return data ?? []
}

/**
 * Langkah 1 — siapkan batch ke meja review.
 *
 * Untuk setiap soal yang masih `draft`/`revision_required`:
 *   submit_question_for_review -> status `submitted` + review editorial pending
 *
 * Lalu SATU panggilan `claim_pilot_review_stage` menugaskan Anda sebagai
 * reviewer dan memindahkan seluruh batch ke `editorial_review`.
 *
 * Hanya langkah MEKANIS. Tidak ada keputusan review yang diambil di sini, dan
 * soal yang sudah berada di alur review dilewati sehingga aksi ini aman
 * diulang.
 */
export async function prepareReviewBatchAction(form: FormData) {
    const context = contextFrom(form)
    let failure: unknown = null
    let submitted = 0
    let skipped = 0
    let claimed = 0

    try {
        await validateCsrf()
        await requireAny([PERMISSIONS.CONTENT_REVIEW, PERMISSIONS.QUESTION_MANAGE])
        const batch = batchFrom(form)
        const client = await createClient()
        const questions = await listBatchQuestions(client, batch)

        if (questions.length === 0) throw new Error('BATCH_EMPTY')

        // Satu panggilan untuk seluruh batch: dulu satu RPC per soal (N+1) —
        // 500 soal berarti 500 round-trip sebelum satu pun selesai.
        const toSubmit = questions.filter((question) => SUBMITTABLE_STATUSES.has(question.status)).map((question) => question.id)
        skipped = questions.length - toSubmit.length
        if (toSubmit.length > 0) {
            const result = await client.rpc('submit_questions_for_review', { p_question_ids: toSubmit })
            if (result.error) throw new Error(result.error.message)
            submitted = countFrom(result.data, 'submitted')
        }

        // Satu panggilan untuk seluruh batch: tugaskan diri sendiri sebagai
        // reviewer pada semua review pending yang belum punya reviewer.
        const claim = await client.rpc('claim_pilot_review_stage', { p_batch: batch })
        if (claim.error) throw new Error(claim.error.message)
        claimed = countFrom(claim.data, 'claimed_questions')
    } catch (error) {
        failure = error
        logger.warn('[prepareReviewBatchAction] gagal', {
            error: error instanceof Error ? error.message : String(error),
        })
    }

    if (failure) finish(context, '', failure)
    finish(
        context,
        `${submitted} soal dikirim ke review, ${claimed} soal diklaim untuk Anda. ` +
            `${skipped} dilewati karena sudah di alur review atau sudah diputuskan.`,
    )
}

/**
 * Langkah 2 — putuskan satu TAHAP review untuk seluruh batch.
 *
 * Dua panggilan: klaim ulang (karena tahap sebelumnya mengosongkan reviewer),
 * lalu putuskan. `bulk_review_pilot_stage` menyaring lewat
 * `response_config.pilotBatch` DAN `reviewer_id = auth.uid()`, sehingga hanya
 * soal yang benar-benar ditugaskan kepada Anda yang tersentuh.
 *
 * Tiga tahap dijalankan berurutan: editorial -> academic -> technical_qa.
 * Setiap klik hanya memutuskan SATU tahap, dan keputusannya Anda yang tentukan.
 */
export async function reviewReviewBatchStageAction(form: FormData) {
    const context = contextFrom(form)
    const decision = text(form, 'decision')
    const notes = text(form, 'notes') || null
    const stageLabel = REVIEW_STAGES.find((stage) => stage.key === text(form, 'stage'))?.label
    let failure: unknown = null
    let reviewed = 0
    let claimed = 0

    try {
        await validateCsrf()
        await requireAny([PERMISSIONS.CONTENT_REVIEW])
        const batch = batchFrom(form)
        if (!['approve', 'revision_required', 'reject'].includes(decision)) {
            throw new Error('Keputusan review tidak valid.')
        }

        const client = await createClient()

        const claim = await client.rpc('claim_pilot_review_stage', { p_batch: batch })
        if (claim.error) throw new Error(claim.error.message)
        claimed = countFrom(claim.data, 'claimed_questions')

        const { data, error } = await client.rpc('bulk_review_pilot_stage', {
            p_batch: batch,
            p_decision: decision,
            p_notes: notes,
        })
        if (error) throw new Error(error.message)
        reviewed = countFrom(data, 'reviewed_questions')
    } catch (error) {
        failure = error
        logger.warn('[reviewReviewBatchStageAction] gagal', {
            error: error instanceof Error ? error.message : String(error),
        })
    }

    if (failure) finish(context, '', failure)
    finish(
        context,
        `${reviewed} soal diputuskan${stageLabel ? ` pada tahap ${stageLabel}` : ''}` +
            `${claimed > 0 ? ` (${claimed} diklaim ulang)` : ''}.`,
    )
}

/**
 * Langkah 3 — terbitkan soal batch yang sudah `approved`.
 *
 * `publish_question` bekerja satu soal per panggilan; tidak ada versi massal di
 * database. Pemanggilannya dijalankan berurutan dalam satu aksi supaya tetap
 * satu klik, dan setiap kegagalan dilaporkan apa adanya.
 */
export async function publishReviewBatchAction(form: FormData) {
    const context = contextFrom(form)
    let failure: unknown = null
    let published = 0
    let notApproved = 0

    try {
        await validateCsrf()
        await requireAny([PERMISSIONS.CONTENT_PUBLISH])
        const batch = batchFrom(form)
        const client = await createClient()
        const questions = await listBatchQuestions(client, batch)

        if (questions.length === 0) throw new Error('BATCH_EMPTY')

        // Satu panggilan batch; `publish_question` tetap satu-satunya penjaga
        // aturan (hanya approved, tanpa pending review).
        const toPublish = questions.filter((question) => question.status === 'approved').map((question) => question.id)
        notApproved = questions.length - toPublish.length
        if (toPublish.length > 0) {
            const result = await client.rpc('publish_questions', { p_question_ids: toPublish })
            if (result.error) throw new Error(result.error.message)
            published = countFrom(result.data, 'published')
        }
    } catch (error) {
        failure = error
        logger.warn('[publishReviewBatchAction] gagal', {
            error: error instanceof Error ? error.message : String(error),
        })
    }

    if (failure) finish(context, '', failure)
    finish(
        context,
        `${published} soal diterbitkan` +
            `${notApproved > 0 ? `, ${notApproved} belum berstatus approved sehingga dilewati` : ''}.`,
    )
}
