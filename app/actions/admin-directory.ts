'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { validateCsrf } from '@/lib/csrf'
import { createClient } from '@/lib/utils/supabase/server'
import { authorizationService, AuthorizationError } from '@/src/services/authorization.service'
import { PERMISSIONS, type PermissionCode } from '@/src/auth/permissions'
import { logger } from '@/lib/logger'

/**
 * Aksi tulis modul Users & Roles.
 *
 * ## Penjagaan berlapis
 *
 * Server action di sini memeriksa permission SEBELUM memanggil RPC, tetapi itu
 * hanya untuk memberi pesan yang ramah — bukan pengaman. Pengaman sesungguhnya
 * ada di database: setiap RPC menegakkan `auth.uid()`, permission, dan penjaga
 * anti-lockout (tidak bisa mencabut peran sendiri, tidak bisa menonaktifkan
 * akun sendiri, tidak bisa menghilangkan SUPER_ADMIN terakhir).
 *
 * Jadi walaupun seseorang memalsukan form dan memanggil aksi ini tanpa izin,
 * RPC-nya tetap menolak dan pesan penolakan itu yang ditampilkan.
 */

function text(form: FormData, key: string) {
    const value = form.get(key)
    return typeof value === 'string' ? value.trim() : ''
}

async function requirePermission(...permissions: PermissionCode[]) {
    const authorization = await authorizationService.requireAuthenticated()
    if (!permissions.some((permission) => authorization.permissions.includes(permission))) {
        throw new AuthorizationError(`Missing one of permissions: ${permissions.join(', ')}`)
    }
    return authorization
}

/** Terjemahkan galat RPC menjadi kalimat yang bisa ditindaklanjuti. */
function friendlyError(error: unknown) {
    const message = error instanceof Error ? error.message : 'ADMIN_USER_ACTION_FAILED'
    const known: Record<string, string> = {
        'Authentication required': 'Sesi tidak valid. Silakan masuk ulang.',
        'User read permission required': 'Akun ini tidak punya permission membaca data pengguna.',
        'Role read permission required': 'Akun ini tidak punya permission membaca daftar peran.',
        'Role manage permission required': 'Akun ini tidak punya permission mengubah peran.',
        'User manage permission required': 'Akun ini tidak punya permission mengubah status pengguna.',
        'Cannot revoke your own role': 'Peran Anda sendiri tidak bisa dicabut — itu akan mengunci akun Anda.',
        'Cannot remove the last SUPER_ADMIN': 'SUPER_ADMIN terakhir tidak boleh dihapus.',
        'Cannot deactivate your own account': 'Akun Anda sendiri tidak bisa dinonaktifkan.',
        'Cannot deactivate the last active SUPER_ADMIN': 'SUPER_ADMIN aktif terakhir tidak boleh dinonaktifkan.',
        'Invalid user status': 'Status pengguna tidak dikenal.',
        'Unknown role': 'Kode peran tidak dikenal.',
        'User profile not found': 'Profil pengguna tidak ditemukan.',
        'User is required': 'Pengguna wajib dipilih.',
    }
    return known[message] || message
}

function backTo(searchParams: Record<string, string>, ok?: string, error?: unknown): never {
    revalidatePath('/admin/users')
    const params = new URLSearchParams(searchParams)
    params.delete('ok')
    params.delete('error')
    if (ok && !error) params.set('ok', ok)
    if (error) params.set('error', friendlyError(error))
    redirect(`/admin/users?${params.toString()}`)
}

function contextFrom(form: FormData) {
    return {
        q: text(form, 'q'),
        role: text(form, 'role'),
        status: text(form, 'status'),
    }
}

export async function assignUserRoleAction(form: FormData) {
    const back = contextFrom(form)
    let failure: unknown = null
    let roleCode = ''
    try {
        await validateCsrf()
        await requirePermission(PERMISSIONS.ROLE_MANAGE)
        const userId = text(form, 'user_id')
        roleCode = text(form, 'role_code')
        if (!userId) throw new Error('User is required')
        const client = await createClient()
        const { error } = await client.rpc('admin_assign_user_role', {
            p_user_id: userId,
            p_role_code: roleCode,
        })
        if (error) throw new Error(error.message)
    } catch (error) {
        failure = error
        logger.warn('[assignUserRoleAction] gagal', { error: error instanceof Error ? error.message : String(error) })
    }
    if (failure) backTo(back, undefined, failure)
    backTo(back, `Peran ${roleCode} diberikan.`)
}

export async function revokeUserRoleAction(form: FormData) {
    const back = contextFrom(form)
    let failure: unknown = null
    let roleCode = ''
    try {
        await validateCsrf()
        await requirePermission(PERMISSIONS.ROLE_MANAGE)
        const userId = text(form, 'user_id')
        roleCode = text(form, 'role_code')
        if (!userId) throw new Error('User is required')
        const client = await createClient()
        const { error } = await client.rpc('admin_revoke_user_role', {
            p_user_id: userId,
            p_role_code: roleCode,
        })
        if (error) throw new Error(error.message)
    } catch (error) {
        failure = error
        logger.warn('[revokeUserRoleAction] gagal', { error: error instanceof Error ? error.message : String(error) })
    }
    if (failure) backTo(back, undefined, failure)
    backTo(back, `Peran ${roleCode} dicabut.`)
}

export async function setUserStatusAction(form: FormData) {
    const back = contextFrom(form)
    let failure: unknown = null
    let status = ''
    try {
        await validateCsrf()
        await requirePermission(PERMISSIONS.USER_MANAGE)
        const userId = text(form, 'user_id')
        status = text(form, 'status')
        if (!userId) throw new Error('User is required')
        const client = await createClient()
        const { error } = await client.rpc('admin_set_user_status', {
            p_user_id: userId,
            p_status: status,
        })
        if (error) throw new Error(error.message)
    } catch (error) {
        failure = error
        logger.warn('[setUserStatusAction] gagal', { error: error instanceof Error ? error.message : String(error) })
    }
    if (failure) backTo(back, undefined, failure)
    backTo(back, `Status pengguna diubah menjadi ${status}.`)
}
