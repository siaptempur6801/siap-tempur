import { notFound, redirect } from 'next/navigation'
import { BarChart3 } from 'lucide-react'
import TkaProgressDashboard from '@/components/tka/TkaProgressDashboard'
import TkaFeatureNotice from '@/components/tka/TkaFeatureNotice'
import PageHeader from '@/components/ui/PageHeader'
import { createV2Client } from '@/lib/utils/supabase/server'
import { tkaProgressDashboardService } from '@/src/services/tka-progress-dashboard.service'
import { isTkaLevelAvailable, parseTkaLevel, tkaLevelPath } from '@/src/tka/context'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function TkaProgressPage({ params }: { params: Promise<{ level: string }> }) {
  const { level: rawLevel } = await params
  const level = parseTkaLevel(rawLevel)
  if (!level || !isTkaLevelAvailable(level)) notFound()

  const base = tkaLevelPath(level)
  const supabase = await createV2Client()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) redirect(`/login?returnTo=${encodeURIComponent(`${base}/progress`)}`)

  if (level !== 'SMP') {
    return (
      <TkaFeatureNotice
        level={level}
        title={`Perkembangan belajar TKA ${level}`}
        description={`Analisis kesiapan, materi prioritas, dan perbaikan soal untuk TKA ${level} belum tersedia. Riwayat evaluasi jenjang ini tetap bisa ditinjau.`}
        actionHref={`${base}/riwayat`}
        actionLabel="Buka riwayat belajar"
      />
    )
  }

  const dashboard = await tkaProgressDashboardService.getDashboard()

  return (
    <main
      data-experience-mode="learning"
      data-program={`tka-${level.toLowerCase()}`}
      className="min-h-screen px-4 py-6 md:px-8 md:py-8"
    >
      <div className="mx-auto max-w-6xl space-y-6 md:space-y-8">
        <PageHeader
          eyebrow={
            <>
              <BarChart3 size={14} aria-hidden="true" /> Analisis & Progres · TKA {level}
            </>
          }
          title={`Perkembangan belajar TKA ${level}`}
          description="Pantau tingkat kesiapan ujian, peta kekuatan tiap mata pelajaran, serta rekomendasi materi prioritas yang perlu diperkuat untuk memaksimalkan hasil belajarmu."
        />

        <TkaProgressDashboard dashboard={dashboard} level={level} />
      </div>
    </main>
  )
}
