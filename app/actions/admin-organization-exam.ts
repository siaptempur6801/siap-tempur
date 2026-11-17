'use server'

import { adminReturnUrl } from '@/lib/admin-return-url'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { validateCsrf } from '@/lib/csrf'
import { createClient } from '@/lib/utils/supabase/server'
import { authorizationService, AuthorizationError } from '@/src/services/authorization.service'
import { auditAdminAction } from '@/lib/audit-log'
import { PERMISSIONS } from '@/src/auth/permissions'
import { logger } from '@/lib/logger'

/**
 * Aksi distribusi assessment katalog ke batch organisasi.
 */

function text(form: FormData, key: string) {
    const value = form.get(key)
    return typeof value === 'string' ? value.trim() : ''
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
        'Batch not found': 'Batch tidak ditemukan.',
        'Exam not found': 'Exam tidak ditemukan.',
        'Assignment not found': 'Assignment tidak ditemukan.',
        'Assignment due must not be before its start': 'Jadwal tutup tidak boleh lebih awal dari jadwal buka.',
        'Cannot assign an exam that has no questions': 'Exam ini belum punya satu pun soal, jadi belum bisa diberikan ke peserta.',
        'Cannot assign an assessment that has no questions': 'Assessment ini belum memiliki soal dan belum bisa diberikan ke peserta.',
        'Assignment requires a CPNS or TKA assessment': 'Assignment hanya dapat memakai assessment CPNS atau TKA.',
        'Assignment requires a tryout, mini tryout, or drill': 'Pilih tryout, mini tryout, atau drill dari katalog.',
        'Assessment is not available': 'Assessment ini belum aktif untuk dibagikan.',
        'Assignment batch mismatch': 'Assignment ini sudah terhubung ke batch lain.',
        'Jadwal tidak valid.': 'Jadwal tidak valid.',
    }
    return known[message] || message
}

type Back = { batchId: string; orgId: string; examId: string; returnTo: string }

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
    const target = new URL(adminReturnUrl(back.returnTo, '/admin/organizations'), 'http://admin.local')
    const params = target.searchParams
    if (back.orgId) params.set('org', back.orgId)
    if (back.batchId) params.set('batch', back.batchId)
    if (back.examId) params.set('exam', back.examId)
    if (ok && !error) params.set('ok', ok)
    if (error) params.set('error', friendlyError(error))
    const query = params.toString()
    redirect(query ? `/admin/organizations?${query}` : '/admin/organizations')
}

function backFrom(form: FormData): Back {
    return { batchId: text(form, 'batch_id'), orgId: text(form, 'org'), examId: text(form, 'return_exam_id'), returnTo: text(form, 'return_to') }
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
    backTo(back, 'Penugasan disimpan. Lihat Monitoring untuk memantau peserta.')
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
