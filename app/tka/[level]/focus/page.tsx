import { notFound, redirect } from 'next/navigation'
import { Dumbbell } from 'lucide-react'
import TkaLearningHierarchy from '@/components/tka/TkaLearningHierarchy'
import TkaFeatureNotice from '@/components/tka/TkaFeatureNotice'
import PageHeader from '@/components/ui/PageHeader'
import TkaTokenAccessSummary from '@/components/tka/TkaTokenAccessSummary'
import { createV2Client } from '@/lib/utils/supabase/server'
import { walletService } from '@/src/services/wallet.service'
import { isTkaLevelAvailable, parseTkaLevel, tkaContext, tkaLevelPath } from '@/src/tka/context'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function TkaFocusPage({ params }: { params: Promise<{ level: string }> }) {
  const { level: rawLevel } = await params
  const level = parseTkaLevel(rawLevel)
  if (!level || !isTkaLevelAvailable(level)) notFound()

  const base = tkaLevelPath(level)
  const supabase = await createV2Client()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) redirect(`/login?returnTo=${encodeURIComponent(`${base}/focus`)}`)

  if (level !== 'SMP') {
    return (
      <TkaFeatureNotice
        level={level}
        title={`Latihan fokus TKA ${level}`}
        description={`Latihan Fokus TKA ${level} belum tersedia. Cek kembali nanti untuk berlatih per materi.`}
        actionHref={base}
        actionLabel="Kembali ke Ringkasan"
      />
    )
  }

  const context = tkaContext(level)
  const { data: program, error: programError } = await supabase
    .from('programs')
    .select('id')
    .eq('code', context.programCode)
    .maybeSingle()
  if (programError) throw programError
  if (!program) notFound()

  const { data: track, error: trackError } = await supabase
    .from('tracks')
    .select('id')
    .eq('program_id', program.id)
    .eq('code', context.trackCode)
    .maybeSingle()
  if (trackError) throw trackError
  if (!track) notFound()

  const { data: userTrack, error: userTrackError } = await supabase
    .from('user_tracks')
    .select('status')
    .eq('user_id', user.id)
    .eq('track_id', track.id)
    .maybeSingle()
  if (userTrackError) throw userTrackError

  const activeTrack = userTrack?.status.toLowerCase() === 'active'
  const tokenBalance = await walletService.getExamTokenBalance(user.id, program.id)

  return (
    <main
      data-experience-mode="learning"
      data-program={`tka-${level.toLowerCase()}`}
      className="min-h-screen px-4 py-6 md:px-8 md:py-8"
    >
      <div className="mx-auto max-w-6xl space-y-5">
        <PageHeader
          className="pb-1"
          eyebrow={
            <>
              <Dumbbell size={14} aria-hidden="true" /> Latihan Fokus · TKA {level}
            </>
          }
          title="Latihan Fokus per Materi"
          description="Pilih materi yang ingin kamu kuasai. Gunakan 1 token untuk latihan 10 soal, lalu pelajari pembahasannya."
        />

        <TkaTokenAccessSummary
          tokenBalance={tokenBalance}
          tokenCost={1}
          href={`${base}/beli-token`}
        />
        <TkaLearningHierarchy activeTrack={activeTrack} level={level} tokenBalance={tokenBalance} />
      </div>
    </main>
  )
}
