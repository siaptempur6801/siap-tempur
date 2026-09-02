import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, BarChart3, Crown } from 'lucide-react'
import TkaProgressDashboard from '@/components/tka/TkaProgressDashboard'
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
    const supabase = await createV2Client()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) redirect(`/login?returnTo=${encodeURIComponent(`${base}/progress`)}`)

    const dashboard = await tkaProgressDashboardService.getDashboard()

    return (
        <main data-experience-mode="learning" data-program="tka-smp" className="min-h-screen px-4 py-5 md:px-8 md:py-8">
            <div className="mx-auto max-w-6xl space-y-6 md:space-y-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Link href={base} className="st-focus inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm font-bold text-slate-500 transition hover:bg-white hover:text-indigo-700">
                        <ArrowLeft size={17}/> Kembali ke TKA SMP
                    </Link>
                    <Link
                        href={`${base}/pass`}
                        className="st-focus inline-flex min-h-10 items-center gap-2 rounded-xl bg-indigo-50 px-3 text-sm font-black text-indigo-700 ring-1 ring-indigo-100 transition hover:bg-indigo-100"
                    >
                        <Crown size={16}/> Tempur Pass
                    </Link>
                </div>

                <header className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-slate-950 via-indigo-950 to-indigo-800 p-6 text-white shadow-[0_22px_54px_rgba(79,70,229,0.16)] md:p-8">
                    <div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-indigo-400/20 blur-3xl" aria-hidden="true" />
                    <div className="relative inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-indigo-200">
                        <BarChart3 size={17}/> Perkembangan belajar
                    </div>
                    <h1 className="relative mt-2 text-4xl font-black tracking-tight text-white md:text-5xl">Perkembangan belajar TKA SMP</h1>
                    <p className="relative mt-3 max-w-3xl font-semibold leading-relaxed text-slate-300 md:text-lg">
                        Lihat bagian yang sudah kuat, materi yang masih perlu diperbaiki, dan rekomendasi langkah belajar berikutnya dalam satu tempat.
                    </p>
                </header>

                <TkaProgressDashboard dashboard={dashboard}/>
            </div>
        </main>
    )
}
