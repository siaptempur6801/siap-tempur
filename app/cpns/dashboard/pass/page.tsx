import Link from 'next/link'
import Script from 'next/script'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { CalendarDays, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react'
import PassPackagesClient from '@/components/pass/PassPackagesClient'
import PaperBackground from '@/components/PaperBackground'
import { PageAnimateContainer, PageAnimateItem } from '@/components/ui/PageAnimate'
import { Button } from '@/components/ui/Button'
import { env } from '@/lib/env'
import { createV2Client } from '@/lib/utils/supabase/server'
import { getPassAccess, listActivePassPackages } from '@/src/services/pass-catalog.service'

export const metadata: Metadata = {
    title: 'Tempur Pass CPNS — SIAP TEMPUR',
    description: 'Paket akses belajar CPNS: Mini Tryout dan Full Tryout berstandar CAT tanpa token per sesi.',
    robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

const BENEFITS = [
    'Mini Tryout tanpa batas token',
    'Full Tryout berstandar CAT',
    'Pembahasan dan bank soal salah',
    'Riwayat serta perkembangan belajar',
] as const

function formatAccessDate(value: string) {
    return new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeZone: 'Asia/Jakarta' }).format(new Date(value))
}

/**
 * Halaman Tempur Pass **khusus CPNS**.
 *
 * Dipisah dari halaman pass TKA supaya cakupannya jelas: pass CPNS berlaku untuk program CPNS,
 * sedangkan TKA punya pass per jenjang dengan halaman sendiri.
 */
export default async function CpnsPassPage() {
    const supabase = await createV2Client()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) redirect(`/login?returnTo=${encodeURIComponent('/cpns/dashboard/pass')}`)

    const [packages, passAccess] = await Promise.all([
        listActivePassPackages(supabase, { programCode: 'CPNS' }),
        getPassAccess(supabase, user.id, 'cpns'),
    ])
    const snapClientKey = env.midtransClientKey()

    return (
        <div className="relative min-h-screen w-full">
            <Script id="midtrans-snap" src={env.midtransSnapScriptUrl()} data-client-key={snapClientKey} strategy="afterInteractive" />
            <PaperBackground />
            <PageAnimateContainer className="relative z-10 mx-auto max-w-6xl space-y-7 px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:py-9">
                <PageAnimateItem>
                    <div className="space-y-6 md:space-y-8">
                <header className="border-b border-slate-200/80 pb-6 text-slate-950">
                    <div className="st-kicker"><Sparkles size={14} /> Tempur Pass · CPNS</div>
                    <h1 className="st-heading-display mt-5 text-4xl sm:text-5xl md:text-6xl">
                        {passAccess.hasActivePass ? 'Kelola akses belajar CPNS-mu' : 'Buka akses belajar CPNS tanpa hitung token'}
                    </h1>
                    <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                        Tempur Pass CPNS berlaku untuk seluruh latihan dan tryout SKD di program CPNS. Pass TKA memiliki
                        cakupan sendiri per jenjang, jadi keduanya tidak saling menggantikan.
                    </p>

                    <ul className="mt-4 grid gap-2 text-sm font-bold text-slate-600 sm:grid-cols-2">
                        {BENEFITS.map((benefit) => (
                            <li key={benefit} className="inline-flex items-center gap-2">
                                <CheckCircle2 size={16} className="text-emerald-600" /> {benefit}
                            </li>
                        ))}
                    </ul>
                </header>

                {passAccess.hasActivePass ? (
                    <section className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 sm:p-6" aria-label="Status Tempur Pass CPNS">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-200">
                                    <ShieldCheck size={14} /> Tempur Pass aktif
                                </span>
                                <h2 className="mt-2.5 text-xl font-bold text-slate-950 sm:text-2xl">
                                    Akses Premium CPNS Kamu Sedang Aktif
                                </h2>
                                <p className="mt-1 text-sm font-medium leading-relaxed text-slate-600">
                                    {passAccess.accessThrough
                                        ? `Akses kamu sudah aman sampai ${formatAccessDate(passAccess.accessThrough)}.`
                                        : 'Akses kamu aktif tanpa batas waktu.'}
                                </p>
                                {passAccess.scheduledExtensions > 0 && (
                                    <p className="mt-1 text-xs font-bold text-emerald-800">
                                        Termasuk {passAccess.scheduledExtensions} perpanjangan yang sudah terjadwal.
                                    </p>
                                )}
                            </div>
                            {passAccess.accessThrough && (
                                <span className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3.5 py-2 text-xs font-black text-emerald-800">
                                    <CalendarDays size={15} /> Sampai {formatAccessDate(passAccess.accessThrough)}
                                </span>
                            )}
                        </div>
                    </section>
                ) : null}

                {packages.length > 0 ? (
                    <PassPackagesClient
                        packages={packages}
                        program="cpns"
                        scopeLabel="CPNS"
                        hasActivePass={passAccess.hasActivePass}
                    />
                ) : (
                    <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center" role="status">
                        <p className="text-lg font-bold text-slate-900">Paket Tempur Pass CPNS belum tersedia.</p>
                        <p className="mt-1 text-sm text-slate-500">
                            Kamu tetap bisa memakai latihan dan tryout gratis yang tersedia di dashboard CPNS.
                        </p>
                        <Button className="mt-4" variant="secondary" asChild>
                            <Link href="/cpns/dashboard">Kembali ke dashboard CPNS</Link>
                        </Button>
                    </section>
                )}

                <section className="rounded-2xl border border-slate-200/80 bg-white p-5 text-sm font-medium text-slate-600 sm:p-6">
                    <p>
                        Sedang menyiapkan jenjang TKA juga?{' '}
                        <Link href="/tka" className="font-black text-blue-700 hover:underline">
                            Pilih jenjang TKA
                        </Link>{' '}
                        lalu buka <span className="font-black text-slate-900">Tempur Pass</span> di jenjang tersebut — pass TKA
                        dihitung per jenjang (SD, SMP, SMA).
                    </p>
                </section>
                    </div>
                </PageAnimateItem>
            </PageAnimateContainer>
        </div>
    )
}
