import Link from 'next/link'
import Script from 'next/script'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, ShieldCheck, Sparkles } from 'lucide-react'
import TkaPassPackagesClient from '@/components/tka/TkaPassPackagesClient'
import { env } from '@/lib/env'
import { createV2Client } from '@/lib/utils/supabase/server'
import { commerceService } from '@/src/services/commerce.service'
import { parseTkaLevel, tkaLevelPath } from '@/src/tka/context'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function TkaPassPage({
    params,
}: {
    params: Promise<{ level: string }>
}) {
    const { level: rawLevel } = await params
    const level = parseTkaLevel(rawLevel)
    if (!level || level !== 'SMP') notFound()

    const base = tkaLevelPath(level)
    if (env.appEnvironment() === 'production') redirect(base)

    const supabase = await createV2Client()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) redirect(`/login?returnTo=${encodeURIComponent(`${base}/pass`)}`)

    const packages = await commerceService.listActiveProductOffers('TKA', level)
    const snapClientKey = env.midtransClientKey()

    return (
        <main className="min-h-screen bg-[#fdfbf7] px-4 py-6 text-gray-900 md:px-8 md:py-10">
            <Script
                id="midtrans-snap"
                src="https://app.sandbox.midtrans.com/snap/snap.js"
                data-client-key={snapClientKey}
                strategy="afterInteractive"
            />

            <div className="mx-auto max-w-6xl space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Link
                        href={base}
                        className="inline-flex items-center gap-2 border-2 border-gray-900 bg-white px-4 py-2 font-black shadow-[3px_3px_0_0_#111] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
                    >
                        <ArrowLeft size={18}/> Kembali ke TKA SMP
                    </Link>
                    <span className="inline-flex items-center gap-2 border-2 border-gray-900 bg-amber-100 px-3 py-1 text-xs font-black uppercase">
                        <ShieldCheck size={16}/> Staging Monetization V1
                    </span>
                </div>

                <header className="border-2 border-gray-900 bg-white p-6 shadow-[6px_6px_0_0_#111] md:p-8">
                    <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-blue-700">
                        <Sparkles size={16}/> Tempur Pass TKA SMP
                    </div>
                    <h1 className="mt-2 font-handwriting text-4xl font-black md:text-5xl">Pilih Tempur Pass</h1>
                    <p className="mt-2 max-w-3xl font-semibold text-gray-600">
                        Aktifkan akses premium TKA SMP selama masa pass. Harga, order, pembayaran, dan entitlement diproses dari catalog server-side; halaman ini hanya tersedia pada staging selama Milestone 4.
                    </p>
                </header>

                {packages.length > 0 ? (
                    <TkaPassPackagesClient packages={packages} level={level}/>
                ) : (
                    <section className="border-2 border-dashed border-gray-400 bg-white p-8 text-center">
                        <p className="font-black">Paket Tempur Pass belum tersedia.</p>
                        <p className="mt-1 text-sm font-semibold text-gray-500">Coba lagi setelah catalog pembayaran aktif.</p>
                    </section>
                )}
            </div>
        </main>
    )
}
