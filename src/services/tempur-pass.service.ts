import { createV2Client } from '@/lib/utils/supabase/server'

/**
 * Tempur Pass per program + jenjang.
 *
 * Hak akses di SiapTempur diikat ke **program (+jenjang)**, bukan ke akun, karena satu akun bisa
 * punya beberapa target (CPNS, TKA SD/SMP/SMA). Helper di file ini adalah satu-satunya tempat
 * pemetaan scope → fitur pass, supaya tidak ada lagi pengecekan yang "hardcode" ke satu jenjang
 * (bug lama: `hasActiveTempurPass()` selalu memeriksa fitur TKA SMP, sehingga pass TKA SD/SMA dan
 * pass CPNS tidak terdeteksi dengan benar).
 */
export type PassScope = 'cpns' | 'tka:sd' | 'tka:smp' | 'tka:sma'

export const PASS_SCOPES: readonly PassScope[] = ['cpns', 'tka:sd', 'tka:smp', 'tka:sma'] as const

/** Fitur penanda pass per scope (dipakai untuk cek aktif/tidak). */
export const PASS_FEATURE_BY_SCOPE: Record<PassScope, string> = {
    cpns: 'cpns.full_tryout.regular',
    'tka:sd': 'tka.sd.full_tryout.regular',
    'tka:smp': 'tka.smp.full_tryout.regular',
    'tka:sma': 'tka.sma.full_tryout.regular',
}

/** @deprecated Gunakan `PASS_FEATURE_BY_SCOPE`. Dipertahankan untuk kompatibilitas. */
export const TEMPUR_PASS_FEATURE_CODE = PASS_FEATURE_BY_SCOPE['tka:smp']

const TKA_LEVEL_SCOPE: Record<string, PassScope> = {
    SD: 'tka:sd',
    SMP: 'tka:smp',
    SMA: 'tka:sma',
}

/** Scope pass untuk jenjang TKA ('SD' | 'SMP' | 'SMA'). */
export function passScopeForTkaLevel(level: string): PassScope {
    return TKA_LEVEL_SCOPE[level.toUpperCase()] ?? 'tka:smp'
}

function isUsableEntitlement(input: {
    startsAt: string | null
    expiresAt: string | null
    usageLimit: number | null
    usageCount: number
}, now = Date.now()) {
    const startsAt = input.startsAt ? Date.parse(input.startsAt) : Number.NaN
    const expiresAt = input.expiresAt ? Date.parse(input.expiresAt) : null
    const withinWindow = Number.isFinite(startsAt)
        && startsAt <= now
        && (expiresAt === null || (Number.isFinite(expiresAt) && expiresAt > now))
    const withinUsage = input.usageLimit === null || input.usageCount < input.usageLimit
    return withinWindow && withinUsage
}

/**
 * Scope mana saja yang punya pass aktif untuk pengguna ini — satu query untuk semua scope,
 * dipakai halaman yang perlu menampilkan status beberapa program sekaligus (mis. halaman akun).
 */
export async function getActivePassScopes(userId: string): Promise<PassScope[]> {
    const supabase = await createV2Client()
    const { data: features, error: featureError } = await supabase
        .from('features')
        .select('id, code')
        .in('code', Object.values(PASS_FEATURE_BY_SCOPE))
    if (featureError) throw featureError

    const scopeByFeatureId = new Map<string, PassScope>()
    for (const feature of features ?? []) {
        const code = String(feature.code)
        const scope = PASS_SCOPES.find((candidate) => PASS_FEATURE_BY_SCOPE[candidate] === code)
        if (scope) scopeByFeatureId.set(String(feature.id), scope)
    }
    if (scopeByFeatureId.size === 0) return []

    const { data: entitlements, error: entitlementError } = await supabase
        .from('entitlements')
        .select('feature_id, starts_at, expires_at, usage_limit, usage_count, status')
        .eq('user_id', userId)
        .in('feature_id', [...scopeByFeatureId.keys()])
        .in('status', ['active', 'ACTIVE'])
    if (entitlementError) throw entitlementError

    const active = new Set<PassScope>()
    for (const entitlement of entitlements ?? []) {
        const usable = isUsableEntitlement({
            startsAt: entitlement.starts_at ? String(entitlement.starts_at) : null,
            expiresAt: entitlement.expires_at ? String(entitlement.expires_at) : null,
            usageLimit: entitlement.usage_limit === null ? null : Number(entitlement.usage_limit),
            usageCount: Number(entitlement.usage_count ?? 0),
        })
        const scope = scopeByFeatureId.get(String(entitlement.feature_id))
        if (usable && scope) active.add(scope)
    }

    return PASS_SCOPES.filter((scope) => active.has(scope))
}

/** Apakah pengguna punya pass aktif pada scope tertentu. */
export async function hasActivePass(userId: string, scope: PassScope) {
    const scopes = await getActivePassScopes(userId)
    return scopes.includes(scope)
}

/** @deprecated Perilaku lama: hanya pass TKA SMP. Gunakan `hasActivePass(userId, scope)`. */
export async function hasActiveTempurPass(userId: string) {
    return hasActivePass(userId, 'tka:smp')
}
