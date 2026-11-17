import { createV2Client } from '@/lib/utils/supabase/server'
export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { getGreeting } from '@/lib/dashboard'
import DashboardClient from '@/components/dashboard/DashboardClient'
import { practiceOverviewService } from '@/src/services/practice-overview.service'

export default async function DashboardPage() {
    const supabase = await createV2Client()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const currentHour = parseInt(
        new Date().toLocaleTimeString('en-US', {
            hour: 'numeric',
            hour12: false,
            timeZone: 'Asia/Jakarta',
        })
    )
    const greeting = getGreeting(currentHour)
    const dashboardData = await practiceOverviewService.getDashboardData(user.id)

    return <DashboardClient data={dashboardData} greeting={greeting} />
}
