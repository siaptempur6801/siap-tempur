'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { validateCsrf } from '@/lib/csrf'
import { createClient } from '@/lib/utils/supabase/server'
import { authorizationService, AuthorizationError } from '@/src/services/authorization.service'
import { PERMISSIONS, type PermissionCode } from '@/src/auth/permissions'
import { auditAdminAction } from '@/lib/audit-log'
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

type BackContext = { path: '/admin/users/access' | '/admin/settings'; params: Record<string, string> }

function contextFrom(form: FormData, path: BackContext['path']): BackContext {
    const keys = path === '/admin/users/access'
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
    const back = contextFrom(form, '/admin/users/access')
    let failure: unknown = null
    let summary = ''
    let actorId = ''
    let audit: { entityType: string; entityId: string | null; label: string; after: Record<string, unknown> } | null = null
    try {
        await validateCsrf()
        const authorization = await requirePermission(PERMISSIONS.ENTITLEMENT_MANAGE)
        actorId = authorization.userId
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
        audit = {
            entityType: 'wallet',
            entityId: userId,
            label: `${walletType} ${amount > 0 ? '+' : ''}${amount}`,
            after: { wallet_type: walletType, amount, reason, balance_after: payload.balance ?? null },
        }
    } catch (error) {
        failure = error
        logger.warn('[adjustWalletAction] gagal', { error: error instanceof Error ? error.message : String(error) })
    }
    if (failure) backTo(back, undefined, failure)
    // Token bernilai uang: setiap penyesuaian wajib meninggalkan jejak siapa,
    // berapa, dan dengan alasan apa.
    if (audit) await auditAdminAction({ action: 'ADJUST_WALLET', actorId, ...audit })
    backTo(back, summary)
}

export async function upsertVoucherAction(form: FormData) {
    const back = contextFrom(form, '/admin/users/access')
    let failure: unknown = null
    let code = ''
    let actorId = ''
    let audit: { entityType: string; entityId: string | null; label: string; after: Record<string, unknown> } | null = null
    try {
        await validateCsrf()
        const authorization = await requirePermission(PERMISSIONS.ENTITLEMENT_MANAGE)
        actorId = authorization.userId
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
        audit = {
            entityType: 'voucher',
            entityId: id || null,
            label: code,
            after: {
                code,
                quota_amount: quota ?? 0,
                max_uses: maxUses ?? 0,
                expires_at: expiresRaw || null,
                is_active: checkbox(form, 'is_active'),
                wallet_type: walletType || null,
            },
        }
    } catch (error) {
        failure = error
        logger.warn('[upsertVoucherAction] gagal', { error: error instanceof Error ? error.message : String(error) })
    }
    if (failure) backTo(back, undefined, failure)
    if (audit) await auditAdminAction({ action: 'UPSERT_VOUCHER', actorId, ...audit })
    backTo(back, `Voucher ${code} disimpan.`)
}

/* --------------------------------------------------------------------- settings */

export async function upsertFeatureFlagAction(form: FormData) {
    const back = contextFrom(form, '/admin/settings')
    let failure: unknown = null
    let key = ''
    let actorId = ''
    let audit: { entityType: string; entityId: string | null; label: string; after: Record<string, unknown> } | null = null
    try {
        await validateCsrf()
        const authorization = await requirePermission(PERMISSIONS.SETTINGS_MANAGE)
        actorId = authorization.userId
        const id = text(form, 'flag_id')
        key = text(form, 'key')
        const name = text(form, 'name')
        const rollout = number(form, 'rollout_percentage') ?? 0
        const enabled = checkbox(form, 'enabled')

        const client = await createClient()
        const { error } = await client.rpc('admin_upsert_feature_flag', {
            p_id: id || null,
            p_key: key,
            p_name: name,
            p_enabled: enabled,
            p_rollout_percentage: rollout,
        })
        if (error) throw new Error(error.message)
        audit = {
            entityType: 'feature_flag',
            entityId: id || null,
            label: key,
            after: { key, name, enabled, rollout_percentage: rollout },
        }
    } catch (error) {
        failure = error
        logger.warn('[upsertFeatureFlagAction] gagal', { error: error instanceof Error ? error.message : String(error) })
    }
    if (failure) backTo(back, undefined, failure)
    // Feature flag bisa mematikan/menyalakan enforcement yang berdampak uang.
    if (audit) await auditAdminAction({ action: 'UPSERT_FEATURE_FLAG', actorId, ...audit })
    backTo(back, `Feature flag ${key} disimpan.`)
}

export async function upsertCertificateTemplateAction(form: FormData) {
    const back = contextFrom(form, '/admin/settings')
    let failure: unknown = null
    let name = ''
    let actorId = ''
    let audit: { entityType: string; entityId: string | null; label: string; after: Record<string, unknown> } | null = null
    try {
        await validateCsrf()
        const authorization = await requirePermission(PERMISSIONS.SETTINGS_MANAGE)
        actorId = authorization.userId
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
        audit = {
            entityType: 'certificate_template',
            entityId: id || null,
            label: name,
            after: { name, template_url: templateUrl || null },
        }
    } catch (error) {
        failure = error
        logger.warn('[upsertCertificateTemplateAction] gagal', { error: error instanceof Error ? error.message : String(error) })
    }
    if (failure) backTo(back, undefined, failure)
    if (audit) await auditAdminAction({ action: 'UPSERT_CERTIFICATE_TEMPLATE', actorId, ...audit })
    backTo(back, `Template sertifikat ${name} disimpan.`)
}

export async function setTrackPeriodActiveAction(form: FormData) {
    const back = contextFrom(form, '/admin/settings')
    let failure: unknown = null
    const active = checkbox(form, 'is_active')
    let actorId = ''
    let entityId = ''
    try {
        await validateCsrf()
        const authorization = await requirePermission(PERMISSIONS.SETTINGS_MANAGE)
        actorId = authorization.userId
        entityId = text(form, 'track_period_id')
        if (!entityId) throw new Error('Track period not found')

        const client = await createClient()
        const { error } = await client.rpc('admin_set_track_period_active', {
            p_track_period_id: entityId,
            p_is_active: active,
        })
        if (error) throw new Error(error.message)
    } catch (error) {
        failure = error
        logger.warn('[setTrackPeriodActiveAction] gagal', { error: error instanceof Error ? error.message : String(error) })
    }
    if (failure) backTo(back, undefined, failure)
    await auditAdminAction({
        action: 'SET_TRACK_PERIOD_ACTIVE',
        actorId,
        entityType: 'track_period',
        entityId,
        label: active ? 'aktif' : 'nonaktif',
        after: { is_active: active },
    })
    backTo(back, active ? 'Track period diaktifkan.' : 'Track period dinonaktifkan.')
}

export async function upsertSystemSettingAction(form: FormData) {
    const back = contextFrom(form, '/admin/settings')
    let failure: unknown = null
    let key = ''
    let actorId = ''
    let written: unknown = null
    try {
        await validateCsrf()
        const authorization = await requirePermission(PERMISSIONS.SETTINGS_MANAGE)
        actorId = authorization.userId
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
        written = value
    } catch (error) {
        failure = error
        logger.warn('[upsertSystemSettingAction] gagal', { error: error instanceof Error ? error.message : String(error) })
    }
    if (failure) backTo(back, undefined, failure)
    await auditAdminAction({
        action: 'UPSERT_SYSTEM_SETTING',
        actorId,
        entityType: 'system_setting',
        entityId: null,
        label: key,
        after: { key, value: written },
    })
    backTo(back, `Pengaturan ${key} disimpan.`)
}

export async function deleteSystemSettingAction(form: FormData) {
    const back = contextFrom(form, '/admin/settings')
    let failure: unknown = null
    let key = ''
    let actorId = ''
    try {
        await validateCsrf()
        const authorization = await requirePermission(PERMISSIONS.SETTINGS_MANAGE)
        actorId = authorization.userId
        key = text(form, 'key')
        const client = await createClient()
        const { error } = await client.rpc('admin_delete_system_setting', { p_key: key })
        if (error) throw new Error(error.message)
    } catch (error) {
        failure = error
        logger.warn('[deleteSystemSettingAction] gagal', { error: error instanceof Error ? error.message : String(error) })
    }
    if (failure) backTo(back, undefined, failure)
    await auditAdminAction({
        action: 'DELETE_SYSTEM_SETTING',
        actorId,
        entityType: 'system_setting',
        entityId: null,
        label: key,
        before: { key },
    })
    backTo(back, `Pengaturan ${key} dihapus.`)
}
