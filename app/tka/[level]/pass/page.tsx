import Link from 'next/link'
import Script from 'next/script'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, CalendarDays, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react'
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
        <main data-experience-mode="learning" data-program="tka-smp" className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 md:px-8 md:py-10">
            <Script id="midtrans-snap" src="https://app.sandbox.midtrans.com/snap/snap.js" data-client-key={snapClientKey} strategy="afterInteractive" />

            <div className="mx-auto max-w-6xl space-y-6 md:space-y-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Link href={base} className="inline-flex min-h-11 items-center gap-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-white hover:px-3 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2">
                        <ArrowLeft size={17} aria-hidden="true"/> Kembali ke TKA SMP
                    </Link>
                    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                        <ShieldCheck size={15} aria-hidden="true"/> Pembayaran melalui Midtrans
                    </span>
                </div>

                <header className="rounded-[2rem] border border-amber-100 bg-white p-6 shadow-[var(--px-shadow-sm)] md:p-8">
                    <div className="flex items-center gap-2 text-sm font-semibold text-amber-700"><Sparkles size={17} aria-hidden="true"/> Tempur Pass TKA SMP</div>
                    <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 md:text-5xl">Pilih paket yang sesuai target belajarmu</h1>
                    <p className="mt-3 max-w-3xl leading-relaxed text-slate-600 md:text-lg">
                        Tempur Pass membuka akses belajar premium TKA SMP selama durasi paket. Harga dan total pembayaran ditampilkan sebelum kamu memilih metode pembayaran.
                    </p>
                </header>

                {passAccess.hasActivePass ? (
                    <section data-testid="tka-pass-status-active" role="status" aria-live="polite" className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-5">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="max-w-3xl">
                                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700"><CheckCircle2 size={17} aria-hidden="true"/> Tempur Pass aktif</div>
                                <h2 className="mt-2 text-2xl font-bold text-slate-950">Akses TKA SMP kamu sedang aktif</h2>
                                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                                    {passAccess.accessThrough
                                        ? `Kamu bisa menggunakan fitur paket sampai ${formatAccessDate(passAccess.accessThrough)}.`
                                        : 'Akses kamu aktif tanpa tanggal berakhir.'}
                                </p>
                                {passAccess.scheduledExtensions > 0 && (
                                    <p className="mt-2 text-sm font-semibold text-emerald-700">Ada {passAccess.scheduledExtensions} perpanjangan yang sudah terjadwal. Sisa masa aktifmu tidak terbuang.</p>
                                )}
                            </div>
                            {passAccess.accessThrough && (
                                <div className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm">
                                    <CalendarDays size={16} aria-hidden="true"/> Sampai {formatAccessDate(passAccess.accessThrough)}
                                </div>
                            )}
                        </div>
                    </section>
                ) : (
                    <section data-testid="tka-pass-status-inactive" className="rounded-2xl border border-dashed border-slate-300 bg-white p-4">
                        <p className="font-semibold text-slate-950">Belum ada Tempur Pass aktif.</p>
                        <p className="mt-1 text-sm leading-relaxed text-slate-600">Kamu tetap bisa menggunakan akses gratis yang tersedia. Pilih paket di bawah saat ingin membuka akses premium.</p>
                    </section>
                )}

                {packages.length > 0 ? (
                    <TkaPassPackagesClient packages={packages} level={level} hasActivePass={passAccess.hasActivePass} />
                ) : (
                    <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center" role="status">
                        <p className="font-semibold text-slate-950">Paket Tempur Pass belum tersedia.</p>
                        <p className="mt-1 text-sm text-slate-500">Kamu tetap bisa kembali ke TKA SMP dan memakai fitur gratis yang tersedia.</p>
                        <Button className="mt-4" variant="secondary" asChild><Link href={base}>Kembali ke TKA SMP</Link></Button>
                    </section>
                )}
            </div>
        </main>
    )
}
