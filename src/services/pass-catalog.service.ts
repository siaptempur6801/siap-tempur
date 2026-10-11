import type { createV2Client } from '@/lib/utils/supabase/server'
import { PASS_FEATURE_BY_SCOPE, type PassScope } from '@/src/tka/pass-scope'
import { assessmentCatalogService } from '@/src/services/assessment-catalog.service'

/**
 * Katalog paket Tempur Pass per program (+ jenjang untuk TKA) dan pembacaan status pass.
 *
 * Sebelumnya logika ini hidup di dalam halaman pass TKA. Dipindahkan ke service supaya halaman
 * CPNS memakai aturan yang sama: paket aktif = produk ACTIVE pada program terkait yang punya harga
 * aktif, dan status pass dibaca dari fitur penanda sesuai scope.
 */
export type PassPackage = {
  code: string
  name: string
  description: string | null
  price: number
  currency: string
  durationDays: number | null
}

export type PassAccess = {
  hasActivePass: boolean
  accessThrough: string | null
  scheduledExtensions: number
}

/** Klien Supabase bertipe aplikasi (server). */
type PassCatalogClient = Awaited<ReturnType<typeof createV2Client>>

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function nullableString(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function numberValue(value: unknown) {
  return typeof value === 'number' ? value : Number(value ?? 0)
}

function nullableNumber(value: unknown) {
  if (value === null || value === undefined) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Paket pass yang sedang dijual untuk sebuah program.
 *
 * @param programCode kode program (`TKA` atau `CPNS`)
 * @param trackCode   opsional; isi untuk membatasi ke jenjang TKA tertentu
 */
export async function listActivePassPackages(
  supabase: PassCatalogClient,
  { programCode, trackCode }: { programCode: string; trackCode?: string | null },
): Promise<PassPackage[]> {
  const now = new Date().toISOString()

  if (programCode.trim().toUpperCase() === 'TKA' && trackCode?.trim().toUpperCase() === 'SMA') {
    // SMA has no assessment content yet. Keep its public catalog closed using
    // the privileged readiness check; established SD/SMP pass flows continue
    // through their existing authenticated catalog path.
    const availableAssessments = await assessmentCatalogService.listDistributable()
    if (
      !availableAssessments.some(
        (assessment) =>
          assessment.domain === 'TKA' &&
          assessment.trackCode.toUpperCase() === trackCode.trim().toUpperCase(),
      )
    )
      return []
  }

  const { data: program, error: programError } = await supabase
    .from('programs')
    .select('id')
    .eq('code', programCode)
    .maybeSingle()
  if (programError) throw programError
  if (!program) return []

  const programId = stringValue(program.id)
  let query = supabase
    .from('products')
    .select('id, code, name, description, duration_days')
    .eq('program_id', programId)
    // Hanya paket pass: paket token punya halaman sendiri (`/cpns/dashboard/beli-paket`),
    // jadi tidak boleh ikut tampil di halaman Tempur Pass.
    .eq('product_type', 'PASS')
    .in('status', ['ACTIVE', 'active'])
    .order('duration_days', { ascending: true })

  if (trackCode) {
    const { data: track, error: trackError } = await supabase
      .from('tracks')
      .select('id')
      .eq('program_id', programId)
      .eq('code', trackCode)
      .maybeSingle()
    if (trackError) throw trackError
    if (!track) return []
    query = query.eq('track_id', stringValue(track.id))
  }

  const { data: products, error: productError } = await query
  if (productError) throw productError
  if (!products?.length) return []

  const productIds = products.map((product) => stringValue(product.id)).filter(Boolean)
  if (productIds.length === 0) return []

  const { data: prices, error: priceError } = await supabase
    .from('product_prices')
    .select('product_id, currency, amount, starts_at, ends_at')
    .in('product_id', productIds)
    .in('status', ['active', 'ACTIVE'])
    .lte('starts_at', now)
    .order('starts_at', { ascending: false })
  if (priceError) throw priceError

  const activePriceByProduct = new Map<string, NonNullable<typeof prices>[number]>()
  for (const price of prices ?? []) {
    const productId = stringValue(price.product_id)
    const endsAt = nullableString(price.ends_at)
    if (!productId || (endsAt && endsAt < now)) continue
    if (!activePriceByProduct.has(productId)) activePriceByProduct.set(productId, price)
  }

  return products.flatMap((product) => {
    const productId = stringValue(product.id)
    const price = activePriceByProduct.get(productId)
    if (!price) return []
    return [
      {
        code: stringValue(product.code),
        name: stringValue(product.name),
        description: nullableString(product.description),
        durationDays: nullableNumber(product.duration_days),
        price: numberValue(price.amount),
        currency: stringValue(price.currency) || 'IDR',
      },
    ]
  })
}

/**
 * Status pass untuk satu scope (`cpns`, `tka:sd`, `tka:smp`, `tka:sma`) — termasuk masa aktif
 * gabungan dan perpanjangan yang sudah terjadwal.
 */
export async function getPassAccess(
  supabase: PassCatalogClient,
  userId: string,
  scope: PassScope,
): Promise<PassAccess> {
  const { data: feature, error: featureError } = await supabase
    .from('features')
    .select('id')
    .eq('code', PASS_FEATURE_BY_SCOPE[scope])
    .maybeSingle()
  if (featureError) throw featureError
  if (!feature) return { hasActivePass: false, accessThrough: null, scheduledExtensions: 0 }

  const { data: entitlements, error: entitlementError } = await supabase
    .from('entitlements')
    .select('starts_at, expires_at, usage_limit, usage_count, status')
    .eq('user_id', userId)
    .eq('feature_id', stringValue(feature.id))
    .in('status', ['active', 'ACTIVE'])
    .order('starts_at', { ascending: true })
  if (entitlementError) throw entitlementError

  const now = Date.now()
  const rows = (entitlements ?? [])
    .map((entitlement) => ({
      startsAt: entitlement.starts_at ? Date.parse(String(entitlement.starts_at)) : Number.NaN,
      expiresAt: entitlement.expires_at ? Date.parse(String(entitlement.expires_at)) : null,
      usageLimit: nullableNumber(entitlement.usage_limit),
      usageCount: numberValue(entitlement.usage_count),
    }))
    .filter(
      (entitlement) =>
        Number.isFinite(entitlement.startsAt) &&
        (entitlement.usageLimit === null || entitlement.usageCount < entitlement.usageLimit),
    )

  const activeNow = rows.filter(
    (entitlement) =>
      Number.isFinite(entitlement.startsAt) &&
      entitlement.startsAt <= now &&
      (entitlement.expiresAt === null || entitlement.expiresAt > now),
  )

  if (activeNow.length === 0)
    return { hasActivePass: false, accessThrough: null, scheduledExtensions: 0 }
  if (activeNow.some((entitlement) => entitlement.expiresAt === null)) {
    return { hasActivePass: true, accessThrough: null, scheduledExtensions: 0 }
  }

  let accessThroughMs = Math.max(...activeNow.map((entitlement) => entitlement.expiresAt ?? now))
  let scheduledExtensions = 0

  for (const entitlement of rows) {
    if (!Number.isFinite(entitlement.startsAt) || entitlement.expiresAt === null) continue
    if (entitlement.startsAt <= now) continue
    if (entitlement.startsAt <= accessThroughMs + 1000 && entitlement.expiresAt > accessThroughMs) {
      accessThroughMs = entitlement.expiresAt
      scheduledExtensions += 1
    }
  }

  return {
    hasActivePass: true,
    accessThrough: new Date(accessThroughMs).toISOString(),
    scheduledExtensions,
  }
}
