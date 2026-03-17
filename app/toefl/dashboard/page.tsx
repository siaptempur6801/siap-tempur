import { createClient } from '@/utils/supabase/server'
export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { getToeflDashboardData } from '@/lib/toefl-dashboard'
import { getGreeting } from '@/lib/dashboard'
import ToeflDashboardClient from '@/components/dashboard/ToeflDashboardClient'

export default async function ToeflDashboardPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Get current hour for greeting
    const currentHour = parseInt(
        new Date().toLocaleTimeString('en-US', {
            hour: 'numeric',
            hour12: false,
            timeZone: 'Asia/Jakarta',
        })
    )
    const greeting = getGreeting(currentHour)

    // Fetch dashboard data
    const dashboardData = await getToeflDashboardData(supabase, user.id)

    return <ToeflDashboardClient data={dashboardData} greeting={greeting} />
}
