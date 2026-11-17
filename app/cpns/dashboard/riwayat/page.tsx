import { redirect } from 'next/navigation'
import { createV2Client } from '@/lib/utils/supabase/server'
import HistoryClient from './HistoryClient'
import { practiceOverviewService } from '@/src/services/practice-overview.service'

export default async function RiwayatPage() {
    const supabase = await createV2Client()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const sessions = await practiceOverviewService.getHistoryPageData(user.id)
    return <HistoryClient sessions={sessions} />
}
