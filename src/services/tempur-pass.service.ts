import { createV2Client } from '@/lib/utils/supabase/server'

export const TEMPUR_PASS_FEATURE_CODE = 'tka.smp.full_tryout.regular'

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

export async function hasActiveTempurPass(userId: string) {
    const supabase = await createV2Client()
    const { data: feature, error: featureError } = await supabase
        .from('features')
        .select('id')
        .eq('code', TEMPUR_PASS_FEATURE_CODE)
        .maybeSingle()
    if (featureError) throw featureError
    if (!feature) return false
    const featureId = String(feature.id)

    const { data: entitlements, error: entitlementError } = await supabase
        .from('entitlements')
        .select('starts_at, expires_at, usage_limit, usage_count, status')
        .eq('user_id', userId)
        .eq('feature_id', featureId)
        .in('status', ['active', 'ACTIVE'])
    if (entitlementError) throw entitlementError

    return (entitlements ?? []).some((entitlement) => isUsableEntitlement({
        startsAt: entitlement.starts_at ? String(entitlement.starts_at) : null,
        expiresAt: entitlement.expires_at ? String(entitlement.expires_at) : null,
        usageLimit: entitlement.usage_limit === null ? null : Number(entitlement.usage_limit),
        usageCount: Number(entitlement.usage_count ?? 0),
    }))
}
