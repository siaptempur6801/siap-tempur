import { createV2Client } from '@/lib/utils/supabase/server'
import { redirect } from 'next/navigation'
import PracticeClient from './PracticeClient'
import { practiceOverviewService } from '@/src/services/practice-overview.service'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function PracticeListingPage() {
  const supabase = await createV2Client()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const data = await practiceOverviewService.getFullTryoutPageData(user.id)

  return <PracticeClient {...data} />
}
