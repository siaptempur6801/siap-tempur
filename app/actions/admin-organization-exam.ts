'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { validateCsrf } from '@/lib/csrf'
import { createClient } from '@/lib/utils/supabase/server'
import { authorizationService, AuthorizationError } from '@/src/services/authorization.service'
import { auditAdminAction } from '@/lib/audit-log'
import { PERMISSIONS } from '@/src/auth/permissions'
import { organizationExamService, type TemplateShortage } from '@/src/services/organization-exam.service'
import { logger } from '@/lib/logger'

/**
 * Aksi pengelolaan template ujian, komposisi exam, dan assignment.
 *
 * Sumber: PRD §7.3, §7.4.
 *
 * ## Dua bentuk hasil
 *
 * Aksi template dan assignment memakai pola redirect + pesan flash yang sama
 * dengan aksi admin lain. Aksi KOMPOSISI mengembalikan nilainya, karena
 * kegagalannya informatif: daftar soal yang kurang per subjek harus dibaca dan
 * ditindaklanjuti, bukan sekadar muncul lalu hilang.
 */

function text(form: FormData, key: string) {
    const value = form.get(key)
    return typeof value === 'string' ? value.trim() : ''
}

function number(form: FormData, key: string) {
    const raw = text(form, key)
    if (!raw) return null
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? parsed : null
}

function checkbox(form: FormData, key: string) {
    const value = form.get(key)
    return value === 'on' || value === 'true' || value === '1'
}

/** Ubah `datetime-local` menjadi timestamptz. Admin bekerja dalam WIB. */
function jakartaIso(value: string) {
    if (!value) return null
    const normalized = value.length === 16 ? `${value}:00` : value
    const date = new Date(`${normalized}+07:00`)
    if (Number.isNaN(date.getTime())) throw new Error('Jadwal tidak valid.')
    return date.toISOString()
}

async function requirePermission() {
    const authorization = await authorizationService.requireAuthenticated()
    if (!authorization.permissions.includes(PERMISSIONS.ORGANIZATION_MANAGE)) {
        throw new AuthorizationError('Missing permission: organization.manage')
    }
    return authorization
}

function friendlyError(error: unknown) {
    const message = error instanceof Error ? error.message : 'ORGANIZATION_EXAM_FAILED'
    const known: Record<string, string> = {
        'Authentication required': 'Sesi tidak valid. Silakan masuk ulang.',
        'Organization manage permission required': 'Akun ini tidak punya permission mengelola instansi.',
        'Template not found': 'Template tidak ditemukan.',
        'Template name is required': 'Nama template wajib diisi, minimal 2 karakter.',
        'Organization not found': 'Instansi tidak ditemukan.',
        'Question counts must be between 0 and 200 per subject': 'Jumlah soal per subjek harus antara 0 dan 200.',
        'A template must contain at least one question': 'Template harus berisi minimal satu soal.',
        'Duration must be greater than zero': 'Durasi harus lebih besar dari 0.',
        'Max attempts must be at least 1': 'Jumlah attempt minimal 1.',
        'Unknown explanation setting': 'Pengaturan pembahasan tidak dikenal.',
        'Unknown ranking visibility': 'Pengaturan visibilitas ranking tidak dikenal.',
        'Unknown template status': 'Status template tidak dikenal.',
        'Unknown exam status': 'Status exam tidak dikenal.',
        'Batch not found': 'Batch tidak ditemukan.',
        'Exam not found': 'Exam tidak ditemukan.',
        'Assignment not found': 'Assignment tidak ditemukan.',
        'Assignment due must not be before its start': 'Jadwal tutup tidak boleh lebih awal dari jadwal buka.',
        'Cannot assign an exam that has no questions': 'Exam ini belum punya satu pun soal, jadi belum bisa diberikan ke peserta.',
        'Jadwal tidak valid.': 'Jadwal tidak valid.',
    }
    if (message.startsWith('Cannot delete an exam that has')) {
        return 'Exam ini sudah punya pengerjaan peserta, jadi tidak bisa dihapus. Arsipkan saja agar riwayatnya tetap utuh.'
    }
    return known[message] || message
}

type Back = { batchId: string; orgId: string }

type OrgExamAudit = {
    actorId: string
    action: string
    entityType: string
    entityId?: string | null
    label?: string | null
    before?: Record<string, unknown> | null
    after?: Record<string, unknown> | null
}

/**
 * Menulis jejak audit satu aksi instansi, bila aksinya berhasil.
 *
 * Dipisah dari `backTo` dan di-await SEBELUM `backTo` dipanggil, karena `backTo`
 * harus tetap fungsi SINKRON yang melempar `redirect()`: `redirect()` yang
 * dilempar dari dalam fungsi `async` tidak lagi tertangkap mekanisme Server
 * Action Next — browser tidak berpindah halaman dan pesan sukses tidak pernah
 * sampai ke layar, meskipun datanya sudah berubah di database.
 */
async function auditOrgExamAction(audit: OrgExamAudit, error?: unknown) {
    if (error) return
    await auditAdminAction(audit)
}

function backTo(back: Back, ok?: string, error?: unknown): never {
    revalidatePath('/admin/organizations')
    const params = new URLSearchParams()
    if (back.orgId) params.set('org', back.orgId)
    if (back.batchId) params.set('batch', back.batchId)
    if (ok && !error) params.set('ok', ok)
    if (error) params.set('error', friendlyError(error))
    const query = params.toString()
    redirect(query ? `/admin/organizations?${query}` : '/admin/organizations')
}

function backFrom(form: FormData): Back {
    return { batchId: text(form, 'batch_id'), orgId: text(form, 'org') }
}

/* ------------------------------------------------------------------- template */

export async function saveOrgTemplateAction(form: FormData) {
    const back = backFrom(form)
    let failure: unknown = null
    let name = ''
    let actorId = ''
    const templateId = text(form, 'template_id')
    try {
        await validateCsrf()
        const authorization = await requirePermission()
        actorId = authorization.userId
        const id = templateId
        name = text(form, 'name')

        const client = await createClient()
        const { error } = await client.rpc('admin_upsert_org_template', {
            p_id: id || null,
            p_organization_id: text(form, 'template_organization_id') || null,
            p_name: name,
            p_twk_count: number(form, 'twk_count') ?? 0,
            p_tiu_count: number(form, 'tiu_count') ?? 0,
            p_tkp_count: number(form, 'tkp_count') ?? 0,
            p_duration_seconds: (number(form, 'duration_minutes') ?? 100) * 60,
            p_max_attempts: number(form, 'max_attempts') ?? 1,
            p_randomize_questions: checkbox(form, 'randomize_questions'),
            p_randomize_options: checkbox(form, 'randomize_options'),
            p_show_explanation: text(form, 'show_explanation') || 'after_exam',
            p_ranking_visibility: text(form, 'ranking_visibility') || 'internal',
            p_status: text(form, 'template_status') || 'draft',
        })
        if (error) throw new Error(error.message)
    } catch (error) {
        failure = error
        logger.warn('[saveOrgTemplateAction] gagal', { error: error instanceof Error ? error.message : String(error) })
    }
    if (failure) backTo(back, undefined, failure)
    await auditOrgExamAction({
        actorId,
        action: templateId ? 'UPDATE_ORG_TEMPLATE' : 'CREATE_ORG_TEMPLATE',
        entityType: 'organization_exam_template',
        entityId: templateId || null,
        label: name,
        after: { twk: number(form, 'twk_count') ?? 0, tiu: number(form, 'tiu_count') ?? 0, tkp: number(form, 'tkp_count') ?? 0 },
    }, failure)
    backTo(back, `Template ${name} disimpan.`)
}

/* ------------------------------------------------------------------ komposisi */

export type ComposeActionResult =
    | { status: 'idle' }
    | { status: 'error'; message: string }
    | { status: 'shortages'; shortages: TemplateShortage[]; templateName: string }
    | { status: 'composed'; examId: string; title: string; totalQuestions: number; scheduled: boolean }

/**
 * Bentuk exam dari template.
 *
 * Mengembalikan daftar kekurangan alih-alih melempar galat: admin perlu tahu
 * subjek mana yang kurang dan berapa banyak, bukan sekadar bahwa gagal.
 */
export async function composeExamAction(
    _previous: ComposeActionResult,
    form: FormData,
): Promise<ComposeActionResult> {
    let actorId = ''
    try {
        await validateCsrf()
        const authorization = await requirePermission()
        actorId = authorization.userId

        const templateId = text(form, 'template_id')
        const title = text(form, 'title')
        const status = text(form, 'exam_status') === 'active' ? 'active' : 'draft'
        const templateName = text(form, 'template_name')

        if (!templateId) return { status: 'error', message: 'Template wajib dipilih.' }

        const result = await organizationExamService.compose(templateId, title, status)

        if (!result.composed) {
            return { status: 'shortages', shortages: result.shortages, templateName }
        }

        // Bentuk DAN jadwalkan dalam satu langkah. PRD §7.4 menetapkan assignment
        // adalah batch + template + jadwal, dan §10.1 langkah 4–5 menjalankannya
        // berurutan — jadi memisahkannya hanya memaksa admin menekan dua tombol
        // untuk satu pekerjaan, dan sempat membuat exam tanpa jadwal sama sekali.
        const batchId = text(form, 'batch_id')
        if (batchId) {
            const client = await createClient()
            const { error } = await client.rpc('admin_upsert_assignment', {
                p_id: null,
                p_batch_id: batchId,
                p_exam_id: result.examId,
                p_template_id: templateId,
                p_starts_at: jakartaIso(text(form, 'starts_at')),
                p_due_at: jakartaIso(text(form, 'due_at')),
                p_is_active: checkbox(form, 'is_active'),
                p_notes: text(form, 'notes') || null,
            })
            if (error) throw new Error(error.message)
        }

        revalidatePath('/admin/organizations')
        logger.info('[composeExamAction] exam dibentuk', {
            templateId,
            examId: result.examId,
            total: result.totalQuestions,
        })
        // Membentuk exam dari template membuat soal ujian nyata untuk peserta.
        await auditAdminAction({
            actorId,
            action: 'COMPOSE_EXAM_FROM_TEMPLATE',
            entityType: 'exam',
            entityId: result.examId,
            label: result.title,
            after: {
                template_id: templateId,
                total_questions: result.totalQuestions,
                status,
                batch_id: batchId || null,
            },
        })
        return {
            status: 'composed',
            examId: result.examId,
            title: result.title,
            totalQuestions: result.totalQuestions,
            scheduled: Boolean(batchId),
        }
    } catch (error) {
        logger.warn('[composeExamAction] gagal', {
            error: error instanceof Error ? error.message : String(error),
        })
        return { status: 'error', message: friendlyError(error) }
    }
}

/* ---------------------------------------------------------------- assignment */

export async function saveAssignmentAction(form: FormData) {
    const back = backFrom(form)
    let failure: unknown = null
    let actorId = ''
    const assignmentId = text(form, 'assignment_id')
    try {
        await validateCsrf()
        const authorization = await requirePermission()
        actorId = authorization.userId

        const examId = text(form, 'exam_id')
        const batchId = text(form, 'batch_id')
        if (!batchId) throw new Error('Batch not found')
        if (!examId) throw new Error('Exam not found')

        const client = await createClient()
        const { error } = await client.rpc('admin_upsert_assignment', {
            p_id: assignmentId || null,
            p_batch_id: batchId,
            p_exam_id: examId,
            p_template_id: text(form, 'template_id') || null,
            p_starts_at: jakartaIso(text(form, 'starts_at')),
            p_due_at: jakartaIso(text(form, 'due_at')),
            p_is_active: checkbox(form, 'is_active'),
            p_notes: text(form, 'notes') || null,
        })
        if (error) throw new Error(error.message)
    } catch (error) {
        failure = error
        logger.warn('[saveAssignmentAction] gagal', { error: error instanceof Error ? error.message : String(error) })
    }
    if (failure) backTo(back, undefined, failure)
    await auditOrgExamAction({
        actorId,
        action: assignmentId ? 'UPDATE_ASSIGNMENT' : 'CREATE_ASSIGNMENT',
        entityType: 'organization_exam_assignment',
        entityId: assignmentId || null,
        label: text(form, 'batch_id'),
        after: { exam_id: text(form, 'exam_id'), is_active: checkbox(form, 'is_active') },
    }, failure)
    backTo(back, 'Ujian batch disimpan.')
}

export async function toggleAssignmentActiveAction(form: FormData) {
    const back = backFrom(form)
    let failure: unknown = null
    const active = checkbox(form, 'is_active')
    let actorId = ''
    try {
        await validateCsrf()
        const authorization = await requirePermission()
        actorId = authorization.userId
        const client = await createClient()
        const { error } = await client.rpc('admin_upsert_assignment', {
            p_id: text(form, 'assignment_id') || null,
            p_batch_id: text(form, 'batch_id'),
            p_exam_id: text(form, 'exam_id'),
            p_template_id: text(form, 'template_id') || null,
            p_starts_at: text(form, 'starts_at_value') || null,
            p_due_at: text(form, 'due_at_value') || null,
            p_is_active: active,
            p_notes: text(form, 'notes_value') || null,
        })
        if (error) throw new Error(error.message)
    } catch (error) {
        failure = error
        logger.warn('[toggleAssignmentActiveAction] gagal', { error: error instanceof Error ? error.message : String(error) })
    }
    if (failure) backTo(back, undefined, failure)
    await auditOrgExamAction({
        actorId,
        action: 'SET_ASSIGNMENT_ACTIVE',
        entityType: 'organization_exam_assignment',
        entityId: text(form, 'assignment_id') || null,
        label: text(form, 'batch_id'),
        after: { is_active: active },
    }, failure)
    backTo(back, active ? 'Ujian diaktifkan.' : 'Ujian dinonaktifkan.')
}

export async function deleteComposedExamAction(form: FormData) {
    const back = backFrom(form)
    let failure: unknown = null
    let title = ''
    let actorId = ''
    const examId = text(form, 'exam_id')
    try {
        await validateCsrf()
        const authorization = await requirePermission()
        actorId = authorization.userId
        title = text(form, 'exam_title')
        if (!examId) throw new Error('Exam not found')

        const client = await createClient()
        const { error } = await client.rpc('admin_delete_composed_exam', { p_exam_id: examId })
        if (error) throw new Error(error.message)
    } catch (error) {
        failure = error
        logger.warn('[deleteComposedExamAction] gagal', { error: error instanceof Error ? error.message : String(error) })
    }
    if (failure) backTo(back, undefined, failure)
    // Menghapus exam hasil komposisi mencabut ujian yang mungkin sudah
    // dijadwalkan ke peserta — tindakan yang paling perlu bisa ditelusuri.
    await auditOrgExamAction({
        actorId,
        action: 'DELETE_COMPOSED_EXAM',
        entityType: 'exam',
        entityId: examId,
        label: title,
        before: { title },
    }, failure)
    backTo(back, `Exam ${title || 'tersebut'} dihapus.`)
}
