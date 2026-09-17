import Link from 'next/link'
import Script from 'next/script'
import { notFound, redirect } from 'next/navigation'
import { CalendarDays, CheckCircle2, Sparkles } from 'lucide-react'
import TkaPassPackagesClient, { type TkaPassPackage } from '@/components/tka/TkaPassPackagesClient'
import { Button } from '@/components/ui/Button'
import { env } from '@/lib/env'
import { createV2Client } from '@/lib/utils/supabase/server'
import { TkaLevel, isTkaLevelAvailable, parseTkaLevel, tkaLevelPath } from '@/src/tka/context'

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
    trackCode: TkaLevel
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
    if (!level || !isTkaLevelAvailable(level)) notFound()

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
        <main data-experience-mode="learning" data-program="tka-smp" className="min-h-screen px-4 py-6 md:px-8 md:py-8">
            <Script id="midtrans-snap" src={env.midtransSnapScriptUrl()} data-client-key={snapClientKey} strategy="afterInteractive" />

            <div className="mx-auto max-w-6xl space-y-6 md:space-y-8">
                {/* Header */}
                <header className="border-b border-slate-200/80 pb-6 text-slate-950">
                    <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700 ring-1 ring-indigo-200/50">
                        <Sparkles size={14} className="text-indigo-600" aria-hidden="true" />
                        <span>Tempur Pass · TKA {level}</span>
                    </div>
                    <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                        Pilih paket yang sesuai target belajarmu
                    </h1>
                    <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">
                        Tempur Pass membuka akses belajar premium TKA {level} selama durasi paket. Akses bebas Mini Tryout dan Full Tryout berstandar CAT tanpa perlu token per sesi.
                    </p>
                </header>

                {/* Quick Context Stat Tiles */}
                <div className="grid gap-4 sm:grid-cols-3">
                    <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition hover:border-indigo-200">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
                            <Sparkles size={20} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Akses Tanpa Batas</p>
                            <p className="text-base font-extrabold text-slate-900">Tryout CAT Penuh</p>
                            <p className="text-xs text-slate-500">Bebas simulasi tanpa token per sesi</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition hover:border-emerald-200">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
                            <CalendarDays size={20} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Perpanjangan</p>
                            <p className="text-base font-extrabold text-slate-900">Masa Aktif Akumulatif</p>
                            <p className="text-xs text-slate-500">Sisa hari aktif tidak akan hangus</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition hover:border-blue-200">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
                            <CheckCircle2 size={20} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Verifikasi Instan</p>
                            <p className="text-base font-extrabold text-slate-900">Otomatis & Resmi</p>
                            <p className="text-xs text-slate-500">QRIS & VA Bank via Midtrans</p>
                        </div>
                    </div>
                </div>

                {/* Pass Status Banner */}
                {passAccess.hasActivePass ? (
                    <section
                        data-testid="tka-pass-status-active"
                        role="status"
                        aria-live="polite"
                        className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50/80 via-white to-blue-50/40 p-5 shadow-xs"
                    >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="max-w-3xl">
                                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/80 px-2.5 py-0.5 text-xs font-black uppercase tracking-wider text-emerald-800">
                                    <CheckCircle2 size={15} aria-hidden="true" />
                                    <span>Tempur Pass aktif</span>
                                </div>
                                <h2 className="mt-2.5 text-xl font-bold text-slate-950 sm:text-2xl">
                                    Akses Premium TKA {level} Kamu Sedang Aktif
                                </h2>
                                <p className="mt-1 text-sm font-medium text-slate-600 leading-relaxed">
                                    {passAccess.accessThrough
                                        ? `Akses kamu sudah aman sampai ${formatAccessDate(passAccess.accessThrough)}.`
                                        : 'Akses kamu aktif tanpa tanggal berakhir.'}
                                </p>
                                {passAccess.scheduledExtensions > 0 && (
                                    <p className="mt-2 text-xs font-bold text-emerald-800">
                                        Termasuk {passAccess.scheduledExtensions} perpanjangan yang sudah terjadwal tanpa membuang sisa masa aktif.
                                    </p>
                                )}
                            </div>
                            {passAccess.accessThrough && (
                                <div className="inline-flex items-center gap-2 rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-slate-800 shadow-2xs ring-1 ring-slate-200/80">
                                    <CalendarDays size={16} className="text-indigo-600" aria-hidden="true" />
                                    <span>Sampai {formatAccessDate(passAccess.accessThrough)}</span>
                                </div>
                            )}
                        </div>
                    </section>
                ) : (
                    <section
                        data-testid="tka-pass-status-inactive"
                        className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs"
                    >
                        <div className="flex items-start gap-3.5">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                                <Sparkles size={20} />
                            </div>
                            <div>
                                <p className="text-base font-bold text-slate-900">Belum ada Tempur Pass aktif.</p>
                                <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                                    Kamu tetap bisa menggunakan akses gratis yang tersedia. Pilih durasi paket di bawah saat ingin membuka akses penuh Tryout CAT dan simulasi terpandu.
                                </p>
                            </div>
                        </div>
                    </section>
                )}

                {/* Packages */}
                {packages.length > 0 ? (
                    <TkaPassPackagesClient packages={packages} level={level} hasActivePass={passAccess.hasActivePass} />
                ) : (
                    <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center" role="status">
                        <p className="text-lg font-bold text-slate-900">Paket Tempur Pass belum tersedia.</p>
                        <p className="mt-1 text-sm text-slate-500">Kamu tetap bisa kembali ke TKA {level} dan memakai fitur gratis yang tersedia.</p>
                        <Button className="mt-4" variant="secondary" asChild><Link href={base}>Kembali ke TKA {level}</Link></Button>
                    </section>
                )}
            </div>
        </main>
    )
}
