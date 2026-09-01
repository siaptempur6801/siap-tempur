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
        <main className="min-h-screen bg-[#fdfbf7] px-4 py-6 text-gray-900 md:px-8 md:py-10">
            <div className="mx-auto max-w-6xl space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Link href={base} className="inline-flex items-center gap-2 border-2 border-gray-900 bg-white px-4 py-2 font-black shadow-[3px_3px_0_0_#111] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none">
                        <ArrowLeft size={18}/> Kembali ke TKA SMP
                    </Link>
                    <div className="flex flex-wrap items-center gap-2">
                        <Link
                            href={`${base}/pass`}
                            className="inline-flex items-center gap-2 border-2 border-gray-900 bg-yellow-100 px-3 py-1 text-xs font-black uppercase shadow-[2px_2px_0_0_#111] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
                        >
                            <Crown size={16}/> Tempur Pass
                        </Link>
                        <span className="inline-flex items-center gap-2 border-2 border-gray-900 bg-cyan-100 px-3 py-1 text-xs font-black uppercase">
                            <BarChart3 size={16}/> Ringkasan belajar
                        </span>
                    </div>
                </div>

                <header className="border-2 border-gray-900 bg-white p-6 shadow-[6px_6px_0_0_#111] md:p-8">
                    <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-blue-700">
                        <BarChart3 size={16}/> Perkembangan belajar
                    </div>
                    <h1 className="mt-2 font-handwriting text-4xl font-black md:text-5xl">Perkembangan belajar TKA SMP</h1>
                    <p className="mt-2 max-w-3xl font-semibold leading-relaxed text-gray-600">
                        Lihat bagian yang sudah kuat, materi yang masih perlu diperbaiki, latihan perbaikan yang aktif, dan rekomendasi langkah belajar berikutnya dalam satu tempat.
                    </p>
                </header>

                <TkaProgressDashboard dashboard={dashboard}/>
            </div>
        </main>
    )
}
