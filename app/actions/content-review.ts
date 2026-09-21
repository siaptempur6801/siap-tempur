'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { validateCsrf } from '@/lib/csrf'
import { createClient } from '@/lib/utils/supabase/server'
import { authorizationService, AuthorizationError } from '@/src/services/authorization.service'
import { PERMISSIONS, type PermissionCode } from '@/src/auth/permissions'
import type { ProgramTrackContext } from '@/src/services/catalog-context.service'

import { parseQuestionOptions } from '@/lib/question-options'

function text(form: FormData, key: string) {
    const value = form.get(key)
    return typeof value === 'string' ? value.trim() : ''
}

function nullableText(form: FormData, key: string) {
    return text(form, key) || null
}

function nullableNumber(form: FormData, key: string) {
    const raw = text(form, key)
    if (!raw) return null
    const value = Number(raw)
    if (!Number.isFinite(value)) throw new Error(`${key.toUpperCase()}_INVALID`)
    return value
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
    const message = error instanceof Error ? error.message : 'CONTENT_WORKFLOW_FAILED'
    const known: Record<string, string> = {
        QUESTION_NOT_FOUND: 'Soal tidak ditemukan.',
        SUBJECT_INVALID: 'Subject tidak valid.',
        'Question not found': 'Soal tidak ditemukan.',
        'Question not editable in current status': 'Soal hanya bisa diedit ketika draft, revision required, atau rejected.',
        'Only author or question manager can edit this question': 'Hanya author atau admin konten yang boleh mengedit soal ini.',
        'Estimated seconds invalid': 'Estimasi waktu harus lebih dari 0 detik.',
        'Stimulus does not match question context': 'Stimulus tidak cocok dengan program, track, atau subject soal.',
        'Knowledge node does not match subject': 'Knowledge node tidak cocok dengan subject soal.',
        'Subject not found': 'Subject tidak valid.',
        'Question stem required': 'Pertanyaan wajib diisi.',
        'At least two options required': 'Minimal dua opsi jawaban diperlukan.',
        'Option keys must be unique': 'Key opsi jawaban harus unik.',
        'Option key and content required': 'Semua opsi harus memiliki key dan isi.',
        'Single choice requires exactly one correct option': 'Single choice harus memiliki tepat satu jawaban benar.',
        'Multiple choice requires at least three options and at least two, but not all, correct options': 'Multiple choice membutuhkan minimal tiga opsi dan minimal dua jawaban benar, tetapi tidak boleh semua benar.',
        'Category requires at least two response groups': 'Soal category membutuhkan minimal dua response group.',
        'Each category response group requires at least two options and exactly one correct option': 'Setiap response group harus punya minimal dua opsi dan tepat satu jawaban benar.',
        'Author cannot review their own question': 'Author tidak boleh mereview soalnya sendiri.',
        'Target user is not an active content reviewer': 'Reviewer tujuan tidak aktif atau tidak memiliki permission review.',
        'Question is not assigned to current reviewer': 'Soal ini tidak ditugaskan kepada reviewer yang sedang login.',
        'Only approved questions can be published': 'Hanya soal approved yang dapat dipublish.',
        QUESTION_VERSION_CONFLICT: 'Soal sudah berubah sejak form ini dibuka. Muat ulang halaman, lalu terapkan perubahan Anda pada versi terbaru.',
        QUESTION_VERSION_INVALID: 'Versi soal tidak valid. Muat ulang halaman sebelum menyimpan.',
    }
    return known[message] || message
}

function workspaceUrl(context: ProgramTrackContext, questionId?: string | null, ok?: string | null, error?: unknown) {
    const params = new URLSearchParams({
        program: context.programCode,
        track: context.trackCode,
    })
    if (questionId) params.set('question', questionId)
    if (ok) params.set('ok', ok)
    if (error) params.set('error', friendlyError(error))
    return `/admin/content/review?${params.toString()}`
}

async function finish(context: ProgramTrackContext, questionId: string | null, ok: string, error?: unknown) {
    revalidatePath('/admin/content/review')
    redirect(workspaceUrl(context, questionId, error ? null : ok, error))
}

export async function saveContentDraftAction(form: FormData) {
    const context = contextFrom(form)
    const questionId = nullableText(form, 'id')
    let savedId = questionId
    let failure: unknown = null
    try {
        await validateCsrf()
        await requireAny(questionId
            ? [PERMISSIONS.CONTENT_UPDATE, PERMISSIONS.QUESTION_MANAGE]
            : [PERMISSIONS.CONTENT_CREATE, PERMISSIONS.QUESTION_MANAGE])

        // Token concurrency wajib untuk soal yang sudah ada; nilai aslinya
        // berasal dari input tersembunyi yang dirender halaman.
        const expectedVersion = nullableNumber(form, 'expected_version')
        const expectedUpdatedAt = nullableText(form, 'expected_updated_at')
        if (questionId && (expectedVersion === null || !Number.isInteger(expectedVersion) || expectedVersion < 1 || !expectedUpdatedAt)) {
            throw new Error('QUESTION_VERSION_INVALID')
        }

        const options = parseQuestionOptions(text(form, 'options')).map((option) => ({
            key: option.key,
            content: option.content,
            score: option.score,
            is_correct: option.isCorrect,
            sort_order: option.sortOrder,
            response_group: option.responseGroup,
            response_group_order: option.responseGroupOrder,
            image_url: option.imageUrl,
            metadata: {},
        }))
        const client = await createClient()
        const { data, error } = await client.rpc('save_question_draft', {
            p_question_id: questionId,
            p_program_code: context.programCode,
            p_track_code: context.trackCode,
            p_subject_code: text(form, 'subject_code'),
            p_question_type: text(form, 'question_type') || 'single_choice',
            p_stem: text(form, 'stem'),
            p_difficulty: text(form, 'difficulty') || 'medium',
            p_cognitive_level: nullableText(form, 'cognitive_level'),
            p_estimated_seconds: nullableNumber(form, 'estimated_seconds'),
            p_source_reference: nullableText(form, 'source_reference'),
            p_stimulus_id: nullableText(form, 'stimulus_id'),
            p_explanation: nullableText(form, 'explanation'),
            p_knowledge_node_id: nullableText(form, 'knowledge_node_id'),
            p_options: options,
            p_change_reason: nullableText(form, 'change_reason'),
            p_expected_version: questionId ? expectedVersion : null,
            p_expected_updated_at: questionId ? expectedUpdatedAt : null,
        })
        if (error) throw new Error(error.message)
        if (data && typeof data === 'object' && !Array.isArray(data) && typeof data.question_id === 'string') {
            savedId = data.question_id
        }
    } catch (error) {
        failure = error
    }
    await finish(context, savedId, 'Draft soal tersimpan.', failure)
}

export async function submitContentQuestionAction(form: FormData) {
    const context = contextFrom(form)
    const questionId = text(form, 'question_id')
    let failure: unknown = null
    try {
        await validateCsrf()
        await requireAny([PERMISSIONS.CONTENT_UPDATE, PERMISSIONS.CONTENT_CREATE, PERMISSIONS.QUESTION_MANAGE])
        const client = await createClient()
        const { error } = await client.rpc('submit_question_for_review', { p_question_id: questionId })
        if (error) throw new Error(error.message)
    } catch (error) {
        failure = error
    }
    await finish(context, questionId, 'Soal dikirim ke Editorial Review.', failure)
}

export async function assignContentReviewerAction(form: FormData) {
    const context = contextFrom(form)
    const questionId = text(form, 'question_id')
    let failure: unknown = null
    try {
        await validateCsrf()
        await requireAny([PERMISSIONS.CONTENT_REVIEW, PERMISSIONS.QUESTION_MANAGE])
        const reviewerId = text(form, 'reviewer_id')
        if (!reviewerId) throw new Error('Reviewer wajib dipilih.')
        const client = await createClient()
        const { error } = await client.rpc('assign_question_reviewer', {
            p_question_id: questionId,
            p_reviewer_id: reviewerId,
        })
        if (error) throw new Error(error.message)
    } catch (error) {
        failure = error
    }
    await finish(context, questionId, 'Reviewer berhasil ditugaskan.', failure)
}

export async function decideContentReviewAction(form: FormData) {
    const context = contextFrom(form)
    const questionId = text(form, 'question_id')
    let failure: unknown = null
    try {
        await validateCsrf()
        await authorizationService.requirePermission(PERMISSIONS.CONTENT_REVIEW)
        const decision = text(form, 'decision')
        if (!['approve', 'revision_required', 'reject'].includes(decision)) throw new Error('Keputusan review tidak valid.')
        const client = await createClient()
        const { error } = await client.rpc('review_question_stage', {
            p_question_id: questionId,
            p_decision: decision,
            p_notes: nullableText(form, 'notes'),
        })
        if (error) throw new Error(error.message)
    } catch (error) {
        failure = error
    }
    await finish(context, questionId, 'Keputusan review tersimpan.', failure)
}

export async function publishContentQuestionAction(form: FormData) {
    const context = contextFrom(form)
    const questionId = text(form, 'question_id')
    let failure: unknown = null
    try {
        await validateCsrf()
        await authorizationService.requirePermission(PERMISSIONS.CONTENT_PUBLISH)
        const client = await createClient()
        const { error } = await client.rpc('publish_question', { p_question_id: questionId })
        if (error) throw new Error(error.message)
    } catch (error) {
        failure = error
    }
    await finish(context, questionId, 'Soal berhasil dipublish.', failure)
}