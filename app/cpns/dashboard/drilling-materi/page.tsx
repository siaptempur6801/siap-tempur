import { redirect } from 'next/navigation'
import { createV2Client } from '@/lib/utils/supabase/server'
import DrillingMateriClient from './DrillingMateriClient'
import { practiceOverviewService } from '@/src/services/practice-overview.service'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Drilling Materi SKD - SIAP TEMPUR',
  description: 'Latihan drilling 30 soal per materi TWK, TIU, dan TKP.',
}

export default async function DrillingMateriPage() {
  const supabase = await createV2Client()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { activeSessionsByKey, materials, quota } =
    await practiceOverviewService.getDrillingPageData(user.id)
  return (
    <DrillingMateriClient
      activeSessionsByKey={activeSessionsByKey}
      materials={materials}
      quota={quota}
    />
  )
}
