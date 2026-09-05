import Link from 'next/link'
import Script from 'next/script'
import { notFound, redirect } from 'next/navigation'
import { CalendarDays, CheckCircle2, Sparkles } from 'lucide-react'
import TkaPassPackagesClient, { type TkaPassPackage } from '@/components/tka/TkaPassPackagesClient'
import { Button } from '@/components/ui/Button'
import { env } from '@/lib/env'
import { createV2Client } from '@/lib/utils/supabase/server'
import { parseTkaLevel, tkaLevelPath } from '@/src/tka/context'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type AuthenticatedV2Client = Awaited<ReturnType<typeof createV2Client>>

type LearnerPassAccess = {
    hasActivePass: boolean
    accessThrough: string | null
    scheduledExtensions: number
}

function stringValue(value: unknown) {
    return typeof value === 'string' ? value : String(value ?? '')
}

function nullableString(value: unknown) {
    return typeof value === 'string' ? value : null
}

function nullableNumber(value: unknown) {
    if (value === null || value === undefined || value === '') return null
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
}

function numberValue(value: unknown) {
    const parsed = Number(value ?? 0)
    return Number.isFinite(parsed) ? parsed : 0
}

function timestampValue(value: unknown) {
    const raw = nullableString(value)
    if (!raw) return null
    const timestamp = Date.parse(raw)
    return Number.isFinite(timestamp) ? timestamp : null
}

function formatAccessDate(value: string) {
    return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'Asia/Jakarta',
    }).format(new Date(value))
}

async function listActivePassPackages(
    supabase: AuthenticatedV2Client,
    trackCode: 'SMP'
): Promise<TkaPassPackage[]> {
    const now = new Date().toISOString()

    const { data: program, error: programError } = await supabase
        .from('programs')
        .select('id')
        .eq('code', 'TKA')
        .maybeSingle()
    if (programError) throw programError
    if (!program) return []

    const programId = stringValue(program.id)
    const { data: track, error: trackError } = await supabase
        .from('tracks')
        .select('id')
        .eq('program_id', programId)
        .eq('code', trackCode)
        .maybeSingle()
    if (trackError) throw trackError
    if (!track) return []

    const trackId = stringValue(track.id)
    const { data: products, error: productError } = await supabase
        .from('products')
        .select('id, code, name, description, duration_days')
        .eq('program_id', programId)
        .eq('track_id', trackId)
        .in('status', ['active', 'ACTIVE'])
        .order('duration_days', { ascending: true })
    if (productError) throw productError
    if (!products?.length) return []

    const productIds = products
        .map((product) => stringValue(product.id))
        .filter(Boolean)
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
        return [{
            code: stringValue(product.code),
            name: stringValue(product.name),
            description: nullableString(product.description),
            durationDays: nullableNumber(product.duration_days),
            price: numberValue(price.amount),
            currency: stringValue(price.currency) || 'IDR',
        }]
    })
}

async function getLearnerPassAccess(
    supabase: AuthenticatedV2Client,
    userId: string
): Promise<LearnerPassAccess> {
    const { data: feature, error: featureError } = await supabase
        .from('features')
        .select('id')
        .eq('code', 'tka.smp.full_tryout.regular')
        .maybeSingle()
    if (featureError) throw featureError
    if (!feature) return { hasActivePass: false, accessThrough: null, scheduledExtensions: 0 }

    const featureId = stringValue(feature.id)
    const { data: entitlements, error: entitlementError } = await supabase
        .from('entitlements')
        .select('starts_at, expires_at, usage_limit, usage_count, status')
        .eq('user_id', userId)
        .eq('feature_id', featureId)
        .in('status', ['active', 'ACTIVE'])
        .order('starts_at', { ascending: true })
    if (entitlementError) throw entitlementError

    const now = Date.now()
    const rows = (entitlements ?? []).map((entitlement) => ({
        startsAt: timestampValue(entitlement.starts_at),
        expiresAt: timestampValue(entitlement.expires_at),
        expiresAtRaw: nullableString(entitlement.expires_at),
        usageLimit: nullableNumber(entitlement.usage_limit),
        usageCount: numberValue(entitlement.usage_count),
    })).filter((entitlement) => (
        entitlement.startsAt !== null
        && (entitlement.usageLimit === null || entitlement.usageCount < entitlement.usageLimit)
    ))

    const activeNow = rows.filter((entitlement) => (
        entitlement.startsAt !== null
        && entitlement.startsAt <= now
        && (entitlement.expiresAt === null || entitlement.expiresAt > now)
    ))

    if (activeNow.length === 0) return { hasActivePass: false, accessThrough: null, scheduledExtensions: 0 }
    if (activeNow.some((entitlement) => entitlement.expiresAt === null)) return { hasActivePass: true, accessThrough: null, scheduledExtensions: 0 }

    let accessThroughMs = Math.max(...activeNow.map((entitlement) => entitlement.expiresAt ?? now))
    let scheduledExtensions = 0

    for (const entitlement of rows) {
        if (entitlement.startsAt === null || entitlement.expiresAt === null) continue
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

export default async function TkaPassPage({ params }: { params: Promise<{ level: string }> }) {
    const { level: rawLevel } = await params
    const level = parseTkaLevel(rawLevel)
    if (!level || level !== 'SMP') notFound()

    const base = tkaLevelPath(level)
    if (env.appEnvironment() === 'production') redirect(base)

    const supabase = await createV2Client()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) redirect(`/login?returnTo=${encodeURIComponent(`${base}/pass`)}`)

    const [packages, passAccess] = await Promise.all([
        listActivePassPackages(supabase, level),
        getLearnerPassAccess(supabase, user.id),
    ])
    const snapClientKey = env.midtransClientKey()

    return (
        <main data-experience-mode="learning" data-program="tka-smp" className="st-product min-h-screen px-4 py-6 md:px-8 md:py-10">
            <Script id="midtrans-snap" src="https://app.sandbox.midtrans.com/snap/snap.js" data-client-key={snapClientKey} strategy="afterInteractive" />

            <div className="mx-auto max-w-6xl space-y-6 md:space-y-8">
                <header className="border-b border-slate-200 pb-5">
                    <div className="relative inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-blue-700"><Sparkles size={17} aria-hidden="true"/> Tempur Pass TKA SMP</div>
                    <h1 className="mt-2 text-2xl font-bold text-slate-950">Tempur Pass</h1>
                    <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
                        Bangun ritme belajar TKA SMP dengan akses Mini Tryout dan Full Tryout selama masa aktif paket. Pilih durasi yang sesuai rencana persiapanmu, lalu luangkan waktu untuk berlatih dan mengevaluasi hasilnya.
                    </p>
                </header>

                {passAccess.hasActivePass ? (
                    <section data-testid="tka-pass-status-active" role="status" aria-live="polite" className="st-success p-5">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="max-w-3xl">
                                <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-emerald-800"><CheckCircle2 size={17} aria-hidden="true"/> Tempur Pass aktif</div>
                                <h2 className="st-heading mt-2 text-2xl">Aksesmu siap. Lanjutkan progres belajarmu.</h2>
                                <p className="st-muted mt-2 text-sm font-semibold leading-relaxed">
                                    {passAccess.accessThrough
                                        ? `Kamu bisa menggunakan fitur paket sampai ${formatAccessDate(passAccess.accessThrough)}.`
                                        : 'Akses kamu aktif tanpa tanggal berakhir.'}
                                </p>
                                {passAccess.scheduledExtensions > 0 && (
                                    <p className="mt-2 text-sm font-black text-emerald-800">Ada {passAccess.scheduledExtensions} perpanjangan yang sudah terjadwal. Sisa masa aktifmu tidak terbuang.</p>
                                )}
                            </div>
                            {passAccess.accessThrough && (
                                <div className="st-pill bg-white text-slate-800"><CalendarDays size={16} aria-hidden="true"/> Sampai {formatAccessDate(passAccess.accessThrough)}</div>
                            )}
                        </div>
                    </section>
                ) : (
                    <section data-testid="tka-pass-status-inactive" className="st-card p-4">
                        <p className="st-heading">Siap membangun rutinitas tryout?</p>
                        <p className="st-muted mt-1 text-sm font-semibold leading-relaxed">Tempur Pass kamu belum aktif. Pilih durasi di bawah untuk membuka akses tryout dalam paket, atau lanjutkan dulu dengan fitur gratis yang tersedia.</p>
                    </section>
                )}

                {packages.length > 0 ? (
                    <TkaPassPackagesClient packages={packages} level={level} hasActivePass={passAccess.hasActivePass} />
                ) : (
                    <section className="st-card p-8 text-center" role="status">
                        <p className="st-heading">Paket Tempur Pass belum tersedia.</p>
                        <p className="st-muted mt-1 text-sm font-semibold">Kamu tetap bisa kembali ke TKA SMP dan memakai fitur gratis yang tersedia.</p>
                        <Button className="mt-4" variant="secondary" asChild><Link href={base}>Kembali ke TKA SMP</Link></Button>
                    </section>
                )}
            </div>
        </main>
    )
}
