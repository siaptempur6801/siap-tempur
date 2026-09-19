'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { validateCsrf } from '@/lib/csrf'
import { createClient } from '@/lib/utils/supabase/server'
import { authorizationService, AuthorizationError } from '@/src/services/authorization.service'
import { PERMISSIONS, type PermissionCode } from '@/src/auth/permissions'
import { logger } from '@/lib/logger'

/**
 * Aksi tulis modul Entitlements & Settings.
 *
 * ## Penjagaan berlapis
 *
 * Server action memeriksa permission lebih dulu supaya pesannya ramah, tetapi
 * itu BUKAN pengaman. Pengaman sesungguhnya ada di database: `admin_adjust_wallet`
 * menolak penyesuaian dompet sendiri (token bernilai uang), jumlah nol, saldo
 * negatif, dan alasan yang terlalu pendek; `admin_upsert_voucher` menolak
 * mengubah kode voucher yang sudah punya klaim; `admin_upsert_certificate_template`
 * menolak mengosongkan URL template yang sudah dipakai sertifikat terbit.
 *
 * Jadi walaupun form dipalsukan, RPC-nya tetap menolak dan pesan penolakan itu
 * yang ditampilkan.
 */

function text(form: FormData, key: string) {
    const value = form.get(key)
    return typeof value === 'string' ? value.trim() : ''
}

function number(form: FormData, key: string) {
    const raw = text(form, key)
    if (!raw) return null
    const value = Number(raw)
    return Number.isFinite(value) ? value : null
}

function checkbox(form: FormData, key: string) {
    const value = form.get(key)
    return value === 'on' || value === 'true' || value === '1'
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
    const message = error instanceof Error ? error.message : 'ADMIN_PLATFORM_ACTION_FAILED'
    const known: Record<string, string> = {
        'Authentication required': 'Sesi tidak valid. Silakan masuk ulang.',
        'Entitlement manage permission required': 'Akun ini tidak punya permission mengelola entitlement.',
        'Settings manage permission required': 'Akun ini tidak punya permission mengelola pengaturan.',
        'Cannot adjust your own wallet': 'Dompet Anda sendiri tidak bisa disesuaikan — token bernilai uang, jadi ini dicegah di database.',
        'Unknown wallet type': 'Tipe dompet tidak dikenal.',
        'Amount must not be zero': 'Jumlah penyesuaian tidak boleh 0.',
        'Amount exceeds the per-adjustment limit': 'Jumlah melebihi batas 1.000.000 per penyesuaian.',
        'A reason of at least 3 characters is required': 'Alasan wajib diisi, minimal 3 karakter.',
        'User profile not found': 'Profil pengguna tidak ditemukan.',
        'User is required': 'Pengguna wajib dipilih.',
        'Adjustment would make the balance negative': 'Penyesuaian akan membuat saldo menjadi negatif.',
        'Unknown role': 'Kode peran tidak dikenal.',
        'Setting value is required': 'Nilai pengaturan wajib diisi.',
        'Certificate template id is required': 'Template sertifikat tidak dikenali.',
        'Certificate template not found': 'Template sertifikat tidak ditemukan.',
        'Template name is required': 'Nama template wajib diisi.',
        'Track period not found': 'Track period tidak ditemukan.',
        'Feature flag not found': 'Feature flag tidak ditemukan.',
        'Flag name is required': 'Nama feature flag wajib diisi.',
        'Voucher not found': 'Voucher tidak ditemukan.',
        'Quota must be greater than zero': 'Kuota harus lebih besar dari 0.',
        'Max uses must be greater than zero': 'Batas pemakaian harus lebih besar dari 0.',
        'Quota must not be negative': 'Kuota tidak boleh negatif.',
        'Rollout percentage must be between 0 and 100': 'Rollout harus antara 0 dan 100.',
    }
    // Galat berparameter dari database dikembalikan apa adanya; pesannya sudah
    // spesifik (mis. "Max uses cannot be lower than the 5 times already used").
    return known[message] || message
}

type BackContext = { path: '/admin/entitlements' | '/admin/settings'; params: Record<string, string> }

function contextFrom(form: FormData, path: BackContext['path']): BackContext {
    const keys = path === '/admin/entitlements'
        ? ['q', 'wallet_type', 'user', 'status']
        : []
    const params: Record<string, string> = {}
    for (const key of keys) {
        const value = text(form, key)
        if (value) params[key] = value
    }
    return { path, params }
}

function backTo(context: BackContext, ok?: string, error?: unknown): never {
    revalidatePath(context.path)
    const params = new URLSearchParams(context.params)
    if (ok && !error) params.set('ok', ok)
    if (error) params.set('error', friendlyError(error))
    const query = params.toString()
    redirect(query ? `${context.path}?${query}` : context.path)
}

/* ------------------------------------------------------------------ entitlements */

export async function adjustWalletAction(form: FormData) {
    const back = contextFrom(form, '/admin/entitlements')
    let failure: unknown = null
    let summary = ''
    try {
        await validateCsrf()
        await requirePermission(PERMISSIONS.ENTITLEMENT_MANAGE)
        const userId = text(form, 'user_id')
        const walletType = text(form, 'wallet_type')
        const amount = number(form, 'amount')
        const reason = text(form, 'reason')
        if (!userId) throw new Error('User is required')
        if (amount === null) throw new Error('Amount must not be zero')

        const client = await createClient()
        const { data, error } = await client.rpc('admin_adjust_wallet', {
            p_user_id: userId,
            p_wallet_type: walletType,
            p_amount: amount,
            p_reason: reason,
        })
        if (error) throw new Error(error.message)
        const payload = (data ?? {}) as { balance?: number }
        summary = `Saldo ${walletType} disesuaikan ${amount > 0 ? '+' : ''}${amount}. Saldo sekarang ${payload.balance ?? '—'}.`
    } catch (error) {
        failure = error
        logger.warn('[adjustWalletAction] gagal', { error: error instanceof Error ? error.message : String(error) })
    }
    if (failure) backTo(back, undefined, failure)
    backTo(back, summary)
}

export async function upsertVoucherAction(form: FormData) {
    const back = contextFrom(form, '/admin/entitlements')
    let failure: unknown = null
    let code = ''
    try {
        await validateCsrf()
        await requirePermission(PERMISSIONS.ENTITLEMENT_MANAGE)
        const id = text(form, 'voucher_id')
        code = text(form, 'code').toUpperCase()
        const quota = number(form, 'quota_amount')
        const maxUses = number(form, 'max_uses')
        const expiresRaw = text(form, 'expires_at')
        const walletType = text(form, 'wallet_type')

        const client = await createClient()
        const { error } = await client.rpc('admin_upsert_voucher', {
            p_id: id || null,
            p_code: code,
            p_quota_amount: quota ?? 0,
            p_max_uses: maxUses ?? 0,
            p_expires_at: expiresRaw ? new Date(`${expiresRaw}T23:59:59+07:00`).toISOString() : null,
            p_is_active: checkbox(form, 'is_active'),
            p_wallet_type: walletType || null,
        })
        if (error) throw new Error(error.message)
    } catch (error) {
        failure = error
        logger.warn('[upsertVoucherAction] gagal', { error: error instanceof Error ? error.message : String(error) })
    }
    if (failure) backTo(back, undefined, failure)
    backTo(back, `Voucher ${code} disimpan.`)
}

/* --------------------------------------------------------------------- settings */

export async function upsertFeatureFlagAction(form: FormData) {
    const back = contextFrom(form, '/admin/settings')
    let failure: unknown = null
    let key = ''
    try {
        await validateCsrf()
        await requirePermission(PERMISSIONS.SETTINGS_MANAGE)
        const id = text(form, 'flag_id')
        key = text(form, 'key')
        const name = text(form, 'name')
        const rollout = number(form, 'rollout_percentage') ?? 0

        const client = await createClient()
        const { error } = await client.rpc('admin_upsert_feature_flag', {
            p_id: id || null,
            p_key: key,
            p_name: name,
            p_enabled: checkbox(form, 'enabled'),
            p_rollout_percentage: rollout,
        })
        if (error) throw new Error(error.message)
    } catch (error) {
        failure = error
        logger.warn('[upsertFeatureFlagAction] gagal', { error: error instanceof Error ? error.message : String(error) })
    }
    if (failure) backTo(back, undefined, failure)
    backTo(back, `Feature flag ${key} disimpan.`)
}

export async function upsertCertificateTemplateAction(form: FormData) {
    const back = contextFrom(form, '/admin/settings')
    let failure: unknown = null
    let name = ''
    try {
        await validateCsrf()
        await requirePermission(PERMISSIONS.SETTINGS_MANAGE)
        const id = text(form, 'template_id')
        name = text(form, 'name')
        const templateUrl = text(form, 'template_url')
        const configRaw = text(form, 'config')

        // Config disimpan sebagai jsonb. Divalidasi di sini supaya kesalahan
        // ketik JSON memberi pesan yang jelas, bukan galat database.
        let config: unknown = null
        if (configRaw) {
            try {
                config = JSON.parse(configRaw)
            } catch {
                throw new Error('Config harus berupa JSON yang valid.')
            }
        }

        const client = await createClient()
        const { error } = await client.rpc('admin_upsert_certificate_template', {
            p_id: id,
            p_name: name,
            p_template_url: templateUrl || null,
            p_config: (config ?? null) as never,
        })
        if (error) throw new Error(error.message)
    } catch (error) {
        failure = error
        logger.warn('[upsertCertificateTemplateAction] gagal', { error: error instanceof Error ? error.message : String(error) })
    }
    if (failure) backTo(back, undefined, failure)
    backTo(back, `Template sertifikat ${name} disimpan.`)
}

export async function setTrackPeriodActiveAction(form: FormData) {
    const back = contextFrom(form, '/admin/settings')
    let failure: unknown = null
    const active = checkbox(form, 'is_active')
    try {
        await validateCsrf()
        await requirePermission(PERMISSIONS.SETTINGS_MANAGE)
        const id = text(form, 'track_period_id')
        if (!id) throw new Error('Track period not found')

        const client = await createClient()
        const { error } = await client.rpc('admin_set_track_period_active', {
            p_track_period_id: id,
            p_is_active: active,
        })
        if (error) throw new Error(error.message)
    } catch (error) {
        failure = error
        logger.warn('[setTrackPeriodActiveAction] gagal', { error: error instanceof Error ? error.message : String(error) })
    }
    if (failure) backTo(back, undefined, failure)
    backTo(back, active ? 'Track period diaktifkan.' : 'Track period dinonaktifkan.')
}

export async function upsertSystemSettingAction(form: FormData) {
    const back = contextFrom(form, '/admin/settings')
    let failure: unknown = null
    let key = ''
    try {
        await validateCsrf()
        await requirePermission(PERMISSIONS.SETTINGS_MANAGE)
        key = text(form, 'key')
        const valueRaw = text(form, 'value')
        if (!valueRaw) throw new Error('Setting value is required')

        let value: unknown
        try {
            value = JSON.parse(valueRaw)
        } catch {
            // Nilai yang bukan JSON diperlakukan sebagai string, supaya
            // pengguna bisa mengetik teks biasa tanpa tanda kutip.
            value = valueRaw
        }

        const client = await createClient()
        const { error } = await client.rpc('admin_upsert_system_setting', {
            p_key: key,
            p_value: value as never,
        })
        if (error) throw new Error(error.message)
    } catch (error) {
        failure = error
        logger.warn('[upsertSystemSettingAction] gagal', { error: error instanceof Error ? error.message : String(error) })
    }
    if (failure) backTo(back, undefined, failure)
    backTo(back, `Pengaturan ${key} disimpan.`)
}

export async function deleteSystemSettingAction(form: FormData) {
    const back = contextFrom(form, '/admin/settings')
    let failure: unknown = null
    let key = ''
    try {
        await validateCsrf()
        await requirePermission(PERMISSIONS.SETTINGS_MANAGE)
        key = text(form, 'key')
        const client = await createClient()
        const { error } = await client.rpc('admin_delete_system_setting', { p_key: key })
        if (error) throw new Error(error.message)
    } catch (error) {
        failure = error
        logger.warn('[deleteSystemSettingAction] gagal', { error: error instanceof Error ? error.message : String(error) })
    }
    if (failure) backTo(back, undefined, failure)
    backTo(back, `Pengaturan ${key} dihapus.`)
}
