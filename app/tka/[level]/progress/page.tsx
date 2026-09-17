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
                <header className="relative overflow-hidden rounded-3xl border border-indigo-100/90 bg-gradient-to-br from-indigo-50/80 via-white to-blue-50/40 p-6 sm:p-8 md:p-10 shadow-xs">
                    {/* Subtle decorative background circles */}
                    <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-indigo-200/25 blur-3xl" />
                    <div className="pointer-events-none absolute -bottom-16 right-20 h-48 w-48 rounded-full bg-blue-200/20 blur-2xl" />

                    <div className="relative z-10 max-w-3xl">
                        <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3.5 py-1 text-xs font-bold tracking-wide text-indigo-700 ring-1 ring-indigo-200/70 shadow-2xs">
                            <BarChart3 size={14} className="text-indigo-600" />
                            <span>Analisis & Progres · TKA {level}</span>
                        </div>
                        <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl md:text-4xl">
                            Perkembangan belajar TKA {level}
                        </h1>
                        <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
                            Pantau tingkat kesiapan ujian, peta kekuatan tiap mata pelajaran, serta rekomendasi materi prioritas yang perlu diperkuat untuk memaksimalkan hasil belajarmu.
                        </p>
                    </div>
                </header>

                <TkaProgressDashboard dashboard={dashboard} />
            </div>
        </main>
    )
}
