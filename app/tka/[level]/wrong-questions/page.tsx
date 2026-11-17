import { notFound, redirect } from 'next/navigation'
import { createV2Client } from '@/lib/utils/supabase/server'
import TkaWrongQuestionModeClient from '@/components/tka/TkaWrongQuestionModeClient'
import TkaFeatureNotice from '@/components/tka/TkaFeatureNotice'
import { isTkaLevelAvailable, parseTkaLevel, tkaLevelPath } from '@/src/tka/context'
import { tkaWrongQuestionService } from '@/src/services/tka-wrong-question.service'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function TkaWrongQuestionsPage({
  params,
}: {
  params: Promise<{ level: string }>
}) {
  const { level: rawLevel } = await params
  const level = parseTkaLevel(rawLevel)
  if (!level) notFound()

  const base = tkaLevelPath(level)
  if (!isTkaLevelAvailable(level)) redirect(base)

  const supabase = await createV2Client()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user)
    redirect(`/login?returnTo=${encodeURIComponent(`${base}/wrong-questions`)}`)

  if (level !== 'SMP') {
    return (
      <TkaFeatureNotice
        level={level}
        title={`Bank soal salah TKA ${level}`}
        description={`Bank soal salah dan sesi pengulangan untuk TKA ${level} belum tersedia. Riwayat evaluasi tetap bisa dibuka dari sini.`}
        actionHref={`${base}/riwayat`}
        actionLabel="Buka riwayat belajar"
      />
    )
  }

  const items = await tkaWrongQuestionService.listOpen(200)
  return <TkaWrongQuestionModeClient initialItems={items} />
}
