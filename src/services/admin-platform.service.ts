import { createClient } from '@/lib/utils/supabase/server'

/**
 * Modul admin: Entitlements (token, voucher, pass) dan Settings (konfigurasi).
 *
 * Semuanya lewat RPC (`20260919140000_admin_entitlements_settings.sql`) karena
 * tabel-tabelnya mengaktifkan RLS tanpa policy tulis untuk `authenticated`, dan
 * `system_settings`/`periods`/`track_periods` tidak punya policy sama sekali.
 *
 * Service ini TIDAK memeriksa permission sendiri: setiap RPC menolak pemanggil
 * yang tidak berhak dan galatnya diteruskan apa adanya. Pemeriksaan izin di UI
 * hanya untuk menyembunyikan aksi, bukan sebagai pengaman.
 */

/* ------------------------------------------------------------------ entitlements */

export type WalletTypeSummary = {
    wallet_type: string
    wallets: number
    balance: number
}

export type EntitlementOverview = {
    wallets: WalletTypeSummary[]
    transactions_total: number
    transactions_30d: number
    vouchers_total: number
    vouchers_active: number
    voucher_claims: number
    entitlements_total: number
    entitlements_active: number
}

export type AdminWalletRow = {
    id: string
    user_id: string
    wallet_type: string
    balance: number
    full_name: string
    email: string | null
    updated_at: string | null
}

export type AdminWalletTransaction = {
    id: number
    type: string
    amount: number
    source_type: string
    balance_after: number
    created_at: string | null
}

export type AdminVoucherRow = {
    id: string
    code: string
    quota_amount: number
    max_uses: number
    used_count: number
    expires_at: string | null
    is_active: boolean
    wallet_type: string | null
    claims: number
    tokens_granted: number
    /**
     * `ledger` bila angka token berasal dari buku besar dompet, `estimated` bila
     * diperkirakan dari klaim x kuota karena klaim itu diwarisi dari migrasi
     * legacy dan tidak punya baris buku besar. UI WAJIB membedakannya.
     */
    tokens_source: 'ledger' | 'estimated'
}

export type AdminEntitlementRow = {
    id: string
    user_id: string
    feature_code: string | null
    feature_name: string | null
    full_name: string
    email: string | null
    source_type: string | null
    starts_at: string | null
    expires_at: string | null
    usage_limit: number | null
    usage_count: number
    status: string
}

/* --------------------------------------------------------------------- settings */

export type FeatureFlagRow = {
    id: string
    key: string
    name: string
    enabled: boolean
    rollout_percentage: number
    config: unknown
}

export type FeatureRow = {
    id: string
    code: string
    name: string
    description: string | null
    entitlements: number
}

export type CertificateTemplateRow = {
    id: string
    name: string
    template_url: string | null
    config: unknown
    certificates: number
}

export type PeriodRow = {
    id: string
    code: string
    name: string
    start_date: string | null
    end_date: string | null
    status: string
}

export type TrackPeriodRow = {
    id: string
    is_active: boolean
    track_code: string
    program_code: string
    period_code: string | null
    period_name: string | null
    start_date: string | null
    end_date: string | null
}

export type SystemSettingRow = {
    key: string
    value: unknown
    updated_at: string | null
    updated_by_name: string | null
}

export type AdminSettings = {
    feature_flags: FeatureFlagRow[]
    features: FeatureRow[]
    certificate_templates: CertificateTemplateRow[]
    periods: PeriodRow[]
    track_periods: TrackPeriodRow[]
    system_settings: SystemSettingRow[]
}

/* ---------------------------------------------------------------------- helpers */

function asObject(value: unknown): Record<string, unknown> {
    if (!value || Array.isArray(value) || typeof value !== 'object') return {}
    return value as Record<string, unknown>
}

function asArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : []
}

function str(value: unknown): string {
    return value == null ? '' : String(value)
}

function nullableStr(value: unknown): string | null {
    const text = str(value)
    return text || null
}

function num(value: unknown): number {
    const parsed = Number(value ?? 0)
    return Number.isFinite(parsed) ? parsed : 0
}

function bool(value: unknown): boolean {
    return value === true
}

/* ---------------------------------------------------------------------- service */

export class AdminPlatformService {
    /* ---------------------------------------------------------- entitlements */

    /** Ringkasan token/voucher/pass. Butuh `entitlement.manage`. */
    async getEntitlementOverview(): Promise<EntitlementOverview> {
        const client = await createClient()
        const { data, error } = await client.rpc('admin_entitlement_overview', {})
        if (error) throw new Error(error.message)
        const payload = asObject(data)
        return {
            wallets: asArray(payload.wallets).map((row) => {
                const wallet = asObject(row)
                return {
                    wallet_type: str(wallet.wallet_type),
                    wallets: num(wallet.wallets),
                    balance: num(wallet.balance),
                }
            }),
            transactions_total: num(payload.transactions_total),
            transactions_30d: num(payload.transactions_30d),
            vouchers_total: num(payload.vouchers_total),
            vouchers_active: num(payload.vouchers_active),
            voucher_claims: num(payload.voucher_claims),
            entitlements_total: num(payload.entitlements_total),
            entitlements_active: num(payload.entitlements_active),
        }
    }

    /** Daftar dompet per pengguna. */
    async listWallets(filters: { search?: string | null; walletType?: string | null; limit?: number; offset?: number } = {}) {
        const client = await createClient()
        const { data, error } = await client.rpc('admin_list_wallets', {
            p_search: filters.search || null,
            p_wallet_type: filters.walletType || null,
            p_limit: filters.limit ?? 50,
            p_offset: filters.offset ?? 0,
        })
        if (error) throw new Error(error.message)
        const payload = asObject(data)
        return {
            wallets: asArray(payload.wallets).map((row): AdminWalletRow => {
                const wallet = asObject(row)
                return {
                    id: str(wallet.id),
                    user_id: str(wallet.user_id),
                    wallet_type: str(wallet.wallet_type),
                    balance: num(wallet.balance),
                    full_name: str(wallet.full_name) || str(wallet.display_name) || 'Tanpa nama',
                    email: nullableStr(wallet.email),
                    updated_at: nullableStr(wallet.updated_at),
                }
            }),
            total: num(payload.total),
        }
    }

    /** Riwayat transaksi satu pengguna. */
    async listWalletTransactions(filters: { userId?: string | null; walletType?: string | null; limit?: number; offset?: number } = {}) {
        const client = await createClient()
        const { data, error } = await client.rpc('admin_list_wallet_transactions', {
            p_user_id: filters.userId || null,
            p_wallet_type: filters.walletType || null,
            p_limit: filters.limit ?? 50,
            p_offset: filters.offset ?? 0,
        })
        if (error) throw new Error(error.message)
        const payload = asObject(data)
        return {
            transactions: asArray(payload.transactions).map((row): AdminWalletTransaction => {
                const tx = asObject(row)
                return {
                    id: num(tx.id),
                    type: str(tx.type),
                    amount: num(tx.amount),
                    source_type: str(tx.source_type),
                    balance_after: num(tx.balance_after),
                    created_at: nullableStr(tx.created_at),
                }
            }),
            total: num(payload.total),
        }
    }

    /** Daftar voucher beserta jumlah klaim dan token yang sudah diberikan. */
    async listVouchers(): Promise<AdminVoucherRow[]> {
        const client = await createClient()
        const { data, error } = await client.rpc('admin_list_vouchers', {})
        if (error) throw new Error(error.message)
        return asArray(asObject(data).vouchers).map((row): AdminVoucherRow => {
            const voucher = asObject(row)
            return {
                id: str(voucher.id),
                code: str(voucher.code),
                quota_amount: num(voucher.quota_amount),
                max_uses: num(voucher.max_uses),
                used_count: num(voucher.used_count),
                expires_at: nullableStr(voucher.expires_at),
                is_active: bool(voucher.is_active),
                wallet_type: nullableStr(voucher.wallet_type),
                claims: num(voucher.claims),
                tokens_granted: num(voucher.tokens_granted),
                tokens_source: str(voucher.tokens_source) === 'ledger' ? 'ledger' : 'estimated',
            }
        })
    }

    /** Daftar entitlement (pass) per pengguna. */
    async listEntitlements(filters: { search?: string | null; status?: string | null; limit?: number; offset?: number } = {}) {
        const client = await createClient()
        const { data, error } = await client.rpc('admin_list_entitlements', {
            p_search: filters.search || null,
            p_status: filters.status || null,
            p_limit: filters.limit ?? 50,
            p_offset: filters.offset ?? 0,
        })
        if (error) throw new Error(error.message)
        const payload = asObject(data)
        return {
            entitlements: asArray(payload.entitlements).map((row): AdminEntitlementRow => {
                const item = asObject(row)
                return {
                    id: str(item.id),
                    user_id: str(item.user_id),
                    feature_code: nullableStr(item.feature_code),
                    feature_name: nullableStr(item.feature_name),
                    full_name: str(item.full_name) || str(item.display_name) || 'Tanpa nama',
                    email: nullableStr(item.email),
                    source_type: nullableStr(item.source_type),
                    starts_at: nullableStr(item.starts_at),
                    expires_at: nullableStr(item.expires_at),
                    usage_limit: item.usage_limit == null ? null : num(item.usage_limit),
                    usage_count: num(item.usage_count),
                    status: str(item.status) || 'unknown',
                }
            }),
            total: num(payload.total),
        }
    }

    /* ------------------------------------------------------------- settings */

    /** Seluruh konfigurasi platform dalam satu panggilan. Butuh `settings.manage`. */
    async getSettings(): Promise<AdminSettings> {
        const client = await createClient()
        const { data, error } = await client.rpc('admin_list_settings', {})
        if (error) throw new Error(error.message)
        const payload = asObject(data)
        return {
            feature_flags: asArray(payload.feature_flags).map((row): FeatureFlagRow => {
                const flag = asObject(row)
                return {
                    id: str(flag.id),
                    key: str(flag.key),
                    name: str(flag.name),
                    enabled: bool(flag.enabled),
                    rollout_percentage: num(flag.rollout_percentage),
                    config: flag.config ?? null,
                }
            }),
            features: asArray(payload.features).map((row): FeatureRow => {
                const feature = asObject(row)
                return {
                    id: str(feature.id),
                    code: str(feature.code),
                    name: str(feature.name),
                    description: nullableStr(feature.description),
                    entitlements: num(feature.entitlements),
                }
            }),
            certificate_templates: asArray(payload.certificate_templates).map((row): CertificateTemplateRow => {
                const template = asObject(row)
                return {
                    id: str(template.id),
                    name: str(template.name),
                    template_url: nullableStr(template.template_url),
                    config: template.config ?? null,
                    certificates: num(template.certificates),
                }
            }),
            periods: asArray(payload.periods).map((row): PeriodRow => {
                const period = asObject(row)
                return {
                    id: str(period.id),
                    code: str(period.code),
                    name: str(period.name),
                    start_date: nullableStr(period.start_date),
                    end_date: nullableStr(period.end_date),
                    status: str(period.status),
                }
            }),
            track_periods: asArray(payload.track_periods).map((row): TrackPeriodRow => {
                const trackPeriod = asObject(row)
                return {
                    id: str(trackPeriod.id),
                    is_active: bool(trackPeriod.is_active),
                    track_code: str(trackPeriod.track_code),
                    program_code: str(trackPeriod.program_code),
                    period_code: nullableStr(trackPeriod.period_code),
                    period_name: nullableStr(trackPeriod.period_name),
                    start_date: nullableStr(trackPeriod.start_date),
                    end_date: nullableStr(trackPeriod.end_date),
                }
            }),
            system_settings: asArray(payload.system_settings).map((row): SystemSettingRow => {
                const setting = asObject(row)
                return {
                    key: str(setting.key),
                    value: setting.value ?? null,
                    updated_at: nullableStr(setting.updated_at),
                    updated_by_name: nullableStr(setting.updated_by_name),
                }
            }),
        }
    }
}

export const adminPlatformService = new AdminPlatformService()

/** Tipe dompet yang dikenal beserta labelnya. */
export const WALLET_TYPE_LABELS: Record<string, string> = {
    exam_token_cpns: 'Token CPNS',
    exam_token_tka: 'Token TKA',
    exam_token: 'Token (legacy)',
}

export function walletTypeLabel(code: string) {
    return WALLET_TYPE_LABELS[code] || code
}

/** Jenis sumber transaksi dompet → label yang bisa dibaca. */
export const TRANSACTION_SOURCE_LABELS: Record<string, string> = {
    voucher: 'Klaim voucher',
    exam_attempt: 'Pengerjaan ujian',
    legacy_migration_opening_balance: 'Saldo awal migrasi',
    admin_adjustment: 'Penyesuaian admin',
    order: 'Pembelian',
    order_item: 'Pembelian produk',
    refund: 'Pengembalian',
}

export function transactionSourceLabel(code: string) {
    return TRANSACTION_SOURCE_LABELS[code] || code
}

export const ENTITLEMENT_STATUS_LABELS: Record<string, string> = {
    active: 'Aktif',
    expired: 'Kedaluwarsa',
    revoked: 'Dicabut',
    pending: 'Menunggu',
}

export function entitlementStatusLabel(status: string) {
    return ENTITLEMENT_STATUS_LABELS[status] || status
}
