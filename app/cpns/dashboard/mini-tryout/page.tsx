import { redirect } from 'next/navigation'
import { createV2Client } from '@/lib/utils/supabase/server'
import MiniTryoutClient from './MiniTryoutClient'
import { practiceOverviewService } from '@/src/services/practice-overview.service'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Mini Tryout SKD - SIAP TEMPUR',
  description: 'Latihan mini tryout terfokus untuk TWK, TIU, dan TKP.',
}

export default async function MiniTryoutPage() {
  const supabase = await createV2Client()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { activeSessionsByType, quota } = await practiceOverviewService.getMiniTryoutPageData(
    user.id,
  )
  return <MiniTryoutClient activeSessionsByType={activeSessionsByType} quota={quota} />
}
