import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, BarChart3, Crown } from 'lucide-react'
import TkaProgressDashboard from '@/components/tka/TkaProgressDashboard'
import { env } from '@/lib/env'
import { createV2Client } from '@/lib/utils/supabase/server'
import { tkaProgressDashboardService } from '@/src/services/tka-progress-dashboard.service'
import { parseTkaLevel, tkaLevelPath } from '@/src/tka/context'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function TkaProgressPage({
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
    if (authError || !user) redirect(`/login?returnTo=${encodeURIComponent(`${base}/progress`)}`)

    const dashboard = await tkaProgressDashboardService.getDashboard()

    return (
        <main data-experience-mode="learning" data-program="tka-smp" className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 md:px-8 md:py-10">
            <div className="mx-auto max-w-6xl space-y-6 md:space-y-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Link href={base} className="inline-flex min-h-11 items-center gap-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-white hover:px-3 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2">
                        <ArrowLeft size={17}/> Kembali ke TKA SMP
                    </Link>
                    <Link
                        href={`${base}/pass`}
                        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-50 px-3 text-sm font-semibold text-amber-700 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2"
                    >
                        <Crown size={16}/> Tempur Pass
                    </Link>
                </div>

                <header className="rounded-[2rem] border border-emerald-100 bg-white p-6 shadow-[var(--px-shadow-sm)] md:p-8">
                    <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                        <BarChart3 size={17}/> Perkembangan belajar
                    </div>
                    <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 md:text-5xl">Perkembangan belajar TKA SMP</h1>
                    <p className="mt-3 max-w-3xl leading-relaxed text-slate-600 md:text-lg">
                        Lihat bagian yang sudah kuat, materi yang masih perlu diperbaiki, latihan perbaikan yang aktif, dan rekomendasi langkah belajar berikutnya dalam satu tempat.
                    </p>
                </header>

                <TkaProgressDashboard dashboard={dashboard}/>
            </div>
        </main>
    )
}
