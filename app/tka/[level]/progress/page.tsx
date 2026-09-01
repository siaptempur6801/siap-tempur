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
        <main data-experience-mode="learning" data-program="tka-smp" className="st-product min-h-screen px-4 py-6 md:px-8 md:py-10">
            <div className="mx-auto max-w-6xl space-y-6 md:space-y-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Link href={base} className="st-focus inline-flex min-h-11 items-center gap-2 text-sm font-black text-slate-700 hover:text-blue-700">
                        <ArrowLeft size={17}/> Kembali ke TKA SMP
                    </Link>
                    <Link
                        href={`${base}/pass`}
                        className="st-button st-focus inline-flex min-h-11 items-center gap-2 bg-yellow-100 px-3 text-sm font-black text-slate-950"
                    >
                        <Crown size={16}/> Tempur Pass
                    </Link>
                </div>

                <header className="st-card-lg relative overflow-hidden p-6 md:p-8">
                    <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rotate-12 border-2 border-dashed border-blue-300 bg-blue-50" aria-hidden="true" />
                    <div className="relative inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-blue-700">
                        <BarChart3 size={17}/> Perkembangan belajar
                    </div>
                    <h1 className="st-heading-display relative mt-2 text-4xl md:text-5xl">Perkembangan belajar TKA SMP</h1>
                    <p className="st-muted relative mt-3 max-w-3xl font-semibold leading-relaxed md:text-lg">
                        Lihat bagian yang sudah kuat, materi yang masih perlu diperbaiki, latihan perbaikan yang aktif, dan rekomendasi langkah belajar berikutnya dalam satu tempat.
                    </p>
                </header>

                <TkaProgressDashboard dashboard={dashboard}/>
            </div>
        </main>
    )
}
