import { notFound, redirect } from 'next/navigation'
import { BarChart3 } from 'lucide-react'
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
        <main data-experience-mode="learning" data-program="tka-smp" className="min-h-screen px-4 py-6 md:px-8 md:py-8">
            <div className="mx-auto max-w-6xl space-y-6 md:space-y-8">
                <header className="border-b border-slate-200/80 pb-6 text-slate-950">
                    <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-black tracking-wide text-indigo-700 ring-1 ring-indigo-200/50">
                        <BarChart3 size={14} className="text-indigo-600" />
                        <span>Analisis & Progres · TKA {level}</span>
                    </div>
                    <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                        Perkembangan belajar TKA {level}
                    </h1>
                    <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">
                        Pantau tingkat kesiapan ujian, peta kekuatan tiap mata pelajaran, serta rekomendasi materi prioritas yang perlu diperkuat untuk memaksimalkan hasil belajarmu.
                    </p>
                </header>

                <TkaProgressDashboard dashboard={dashboard}/>
            </div>
        </main>
    )
}
