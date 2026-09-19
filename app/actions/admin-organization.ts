'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { validateCsrf } from '@/lib/csrf'
import { createClient } from '@/lib/utils/supabase/server'
import { authorizationService, AuthorizationError } from '@/src/services/authorization.service'
import { PERMISSIONS } from '@/src/auth/permissions'
import { logger } from '@/lib/logger'

/**
 * Aksi tulis pengelolaan instansi & batch.
 *
 * Sumber: `docs/notes/prd-cpns-instansi-managed-service.md` §6.1, §6.2.
 *
 * Server action memeriksa permission lebih dulu supaya pesannya ramah, tetapi
 * pengaman sesungguhnya ada di database: RPC menolak kode duplikat, kode tidak
 * valid, tanggal selesai sebelum mulai, mengaktifkan batch pada instansi
 * nonaktif, dan menonaktifkan instansi yang masih punya batch aktif.
 */

function text(form: FormData, key: string) {
    const value = form.get(key)
    return typeof value === 'string' ? value.trim() : ''
}

/**
 * Ubah input `datetime-local` menjadi timestamptz.
 *
 * Nilai dari `<input type="datetime-local">` tidak membawa zona waktu. Admin
 * bekerja dalam WIB, jadi offset +07:00 ditempelkan eksplisit — tanpa itu,
 * jadwal ujian akan bergeser 7 jam dari yang dimaksud.
 */
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
    const message = error instanceof Error ? error.message : 'ORGANIZATION_ACTION_FAILED'
    const known: Record<string, string> = {
        'Authentication required': 'Sesi tidak valid. Silakan masuk ulang.',
        'Organization manage permission required': 'Akun ini tidak punya permission mengelola instansi.',
        'Organization name is required': 'Nama instansi wajib diisi, minimal 2 karakter.',
        'Organization code must be 2-24 characters of A-Z, 0-9 or -': 'Kode instansi harus 2–24 karakter: A–Z, 0–9, atau -.',
        'Organization code % is already used': 'Kode instansi sudah dipakai.',
        'Unknown organization type': 'Jenis instansi tidak dikenal.',
        'Unknown organization status': 'Status instansi tidak dikenal.',
        'Unknown batch status': 'Status batch tidak dikenal.',
        'Organization not found': 'Instansi tidak ditemukan.',
        'Organization is required': 'Instansi wajib dipilih.',
        'Organization code is already used': 'Kode instansi sudah dipakai.',
        'Batch name is required': 'Nama batch wajib diisi, minimal 2 karakter.',
        'Batch code must be 2-24 characters of A-Z, 0-9 or -': 'Kode batch harus 2–24 karakter: A–Z, 0–9, atau -.',
        'Batch end must not be before its start': 'Tanggal selesai tidak boleh lebih awal dari tanggal mulai.',
        'Cannot activate a batch whose organization is inactive': 'Batch tidak bisa diaktifkan karena instansinya nonaktif.',
        'Cannot deactivate an organization that still has active batches': 'Instansi masih punya batch aktif, jadi belum bisa dinonaktifkan.',
        'Batch not found': 'Batch tidak ditemukan.',
        'Batch not found in this organization': 'Batch tidak ditemukan pada instansi ini.',
        'Jadwal tidak valid.': 'Jadwal tidak valid.',
        'Cannot delete an organization that has participants': 'Instansi ini masih punya peserta, jadi tidak bisa dihapus. Keluarkan pesertanya dulu, atau nonaktifkan saja agar riwayatnya tetap utuh.',
    }
    if (message.includes('is already used')) return message.replace('Organization code', 'Kode instansi').replace('Batch code', 'Kode batch')
    // Sebagian pesan database menyisipkan angka (mis. "has 3 participants"),
    // jadi dicocokkan sebagai awalan sebelum jatuh ke pesan mentah.
    if (message.startsWith('Cannot delete an organization that has')) {
        return 'Instansi ini masih punya peserta, jadi tidak bisa dihapus. Keluarkan pesertanya dulu, atau nonaktifkan saja agar riwayatnya tetap utuh.'
    }
    if (message.startsWith('Cannot remove a participant who has already taken')) {
        return 'Peserta ini sudah mengerjakan ujian, jadi tidak bisa dihapus. Ubah statusnya menjadi "Mengundurkan diri" agar riwayatnya tetap utuh.'
    }
    if (message.startsWith('This assignment')) return message
    return known[message] || message
}

type Back = { path: string; params: Record<string, string> }

function backTo(back: Back, ok?: string, error?: unknown): never {
    revalidatePath('/admin/organizations')
    const params = new URLSearchParams(back.params)
    if (ok && !error) params.set('ok', ok)
    if (error) params.set('error', friendlyError(error))
    const query = params.toString()
    redirect(query ? `${back.path}?${query}` : back.path)
}

/**
 * Konteks halaman yang harus dipulihkan setelah aksi selesai.
 *
 * Form instansi memakai `name="id"` (id instansi yang sedang diubah), sedangkan
 * form batch memakai `name="organization_id"` (induknya). Keduanya diperiksa:
 * tanpa itu, menyimpan perubahan instansi akan melempar admin kembali ke daftar
 * dan ia kehilangan konteks batch yang sedang dikerjakan.
 */
function orgBack(form: FormData): Back {
    const params: Record<string, string> = {}
    const q = text(form, 'q')
    const status = text(form, 'status')
    if (q) params.q = q
    if (status) params.status = status
    const org = text(form, 'organization_id') || text(form, 'org') || text(form, 'id')
    if (org) params.org = org
    // Form batch memakai `batch_id`; form peserta memakai `batch`. Keduanya harus
    // dibaca — tanpa itu, mengeluarkan peserta atau mengubah statusnya menutup
    // panel peserta dan memaksa admin membukanya lagi.
    const batch = text(form, 'batch_id') || text(form, 'batch')
    if (batch) params.batch = batch
    return { path: '/admin/organizations', params }
}

function orgFields(form: FormData) {
    return {
        name: text(form, 'name'),
        code: text(form, 'code'),
        type: text(form, 'type') || 'instansi',
        city: text(form, 'city'),
        province: text(form, 'province'),
        address: text(form, 'address'),
        contactName: text(form, 'contact_name'),
        contactEmail: text(form, 'contact_email'),
        contactPhone: text(form, 'contact_phone'),
        status: text(form, 'status') || 'active',
        notes: text(form, 'notes'),
    }
}

export async function saveOrganizationAction(form: FormData) {
    const back = orgBack(form)
    let failure: unknown = null
    let name = ''
    try {
        await validateCsrf()
        await requirePermission()
        const id = text(form, 'id')
        const fields = orgFields(form)
        name = fields.name

        const client = await createClient()
        const { data, error } = await client.rpc('admin_upsert_organization', {
            p_id: id || null,
            p_name: fields.name,
            p_code: fields.code,
            p_type: fields.type,
            p_city: fields.city || null,
            p_province: fields.province || null,
            p_address: fields.address || null,
            p_contact_name: fields.contactName || null,
            p_contact_email: fields.contactEmail || null,
            p_contact_phone: fields.contactPhone || null,
            p_status: fields.status,
            p_notes: fields.notes || null,
        })
        if (error) throw new Error(error.message)

        // Instansi yang baru dibuat langsung dibuka detailnya: langkah berikutnya
        // dalam alur §10.1 adalah membuat batch, dan mendarat di daftar memaksa
        // admin mencari instansinya sendiri lagi.
        const created = data as { id?: string } | null
        if (!id && created?.id) back.params.org = created.id
    } catch (error) {
        failure = error
        logger.warn('[saveOrganizationAction] gagal', { error: error instanceof Error ? error.message : String(error) })
    }
    if (failure) backTo(back, undefined, failure)
    backTo(back, `Instansi ${name} disimpan.`)
}

export async function saveBatchAction(form: FormData) {
    const back = orgBack(form)
    let failure: unknown = null
    let name = ''
    try {
        await validateCsrf()
        await requirePermission()
        const id = text(form, 'batch_id')
        const organizationId = text(form, 'organization_id')
        name = text(form, 'name')
        if (!organizationId) throw new Error('Organization is required')

        const client = await createClient()
        const { error } = await client.rpc('admin_upsert_batch', {
            p_id: id || null,
            p_organization_id: organizationId,
            p_code: text(form, 'code'),
            p_name: name,
            p_starts_at: jakartaIso(text(form, 'starts_at')),
            p_ends_at: jakartaIso(text(form, 'ends_at')),
            p_status: text(form, 'batch_status') || 'draft',
            p_notes: text(form, 'notes') || null,
        })
        if (error) throw new Error(error.message)
    } catch (error) {
        failure = error
        logger.warn('[saveBatchAction] gagal', { error: error instanceof Error ? error.message : String(error) })
    }
    if (failure) backTo(back, undefined, failure)
    backTo(back, `Batch ${name} disimpan.`)
}

export async function rotateBatchInviteAction(form: FormData) {
    const back = orgBack(form)
    let failure: unknown = null
    try {
        await validateCsrf()
        await requirePermission()
        const batchId = text(form, 'batch_id')
        if (!batchId) throw new Error('Batch not found')

        const client = await createClient()
        const { error } = await client.rpc('admin_rotate_batch_invite', { p_batch_id: batchId })
        if (error) throw new Error(error.message)
    } catch (error) {
        failure = error
        logger.warn('[rotateBatchInviteAction] gagal', { error: error instanceof Error ? error.message : String(error) })
    }
    if (failure) backTo(back, undefined, failure)
    backTo(back, 'Tautan undangan baru dibuat. Tautan lama langsung tidak berlaku.')
}

export async function deleteOrganizationAction(form: FormData) {
    const back = orgBack(form)
    let failure: unknown = null
    let name = ''
    try {
        await validateCsrf()
        await requirePermission()
        const id = text(form, 'id')
        if (!id) throw new Error('Organization not found')
        name = text(form, 'name')

        const client = await createClient()
        const { error } = await client.rpc('admin_delete_organization', { p_id: id })
        if (error) throw new Error(error.message)

        // Instansinya sudah tidak ada, jadi konteks detailnya harus dilepas.
        delete back.params.org
        delete back.params.batch
    } catch (error) {
        failure = error
        logger.warn('[deleteOrganizationAction] gagal', { error: error instanceof Error ? error.message : String(error) })
    }
    if (failure) backTo(back, undefined, failure)
    backTo(back, `Instansi ${name || 'tersebut'} dihapus.`)
}

export async function removeParticipantAction(form: FormData) {
    const back = orgBack(form)
    let failure: unknown = null
    let code = ''
    try {
        await validateCsrf()
        await requirePermission()
        const participantId = text(form, 'participant_id')
        if (!participantId) throw new Error('Participant not found')
        code = text(form, 'participant_code')

        const client = await createClient()
        const { error } = await client.rpc('admin_remove_participant', { p_participant_id: participantId })
        if (error) throw new Error(error.message)
    } catch (error) {
        failure = error
        logger.warn('[removeParticipantAction] gagal', { error: error instanceof Error ? error.message : String(error) })
    }
    if (failure) backTo(back, undefined, failure)
    backTo(back, `Peserta ${code || 'tersebut'} dikeluarkan dari batch.`)
}

export async function setParticipantStatusAction(form: FormData) {
    const back = orgBack(form)
    let failure: unknown = null
    let status = ''
    try {
        await validateCsrf()
        await requirePermission()
        const participantId = text(form, 'participant_id')
        status = text(form, 'participant_status')
        if (!participantId) throw new Error('Participant not found')

        const client = await createClient()
        const { error } = await client.rpc('admin_set_participant_status', {
            p_participant_id: participantId,
            p_status: status,
        })
        if (error) throw new Error(error.message)
    } catch (error) {
        failure = error
        logger.warn('[setParticipantStatusAction] gagal', { error: error instanceof Error ? error.message : String(error) })
    }
    if (failure) backTo(back, undefined, failure)
    backTo(back, `Status peserta diubah menjadi ${status}.`)
}
