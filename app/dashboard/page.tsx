import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { getDashboardData, getGreeting } from '@/lib/dashboard'
import DashboardClient from '@/components/dashboard/DashboardClient'

export default async function DashboardPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Get current hour for greeting
    // Get current hour for greeting (using Jakarta/WIB time)
    const currentHour = parseInt(
        new Date().toLocaleTimeString('en-US', {
            hour: 'numeric',
            hour12: false,
            timeZone: 'Asia/Jakarta',
        })
    )
    const greeting = getGreeting(currentHour)

    // Fetch dashboard data
    const dashboardData = await getDashboardData(supabase, user.id)

    return <DashboardClient data={dashboardData} greeting={greeting} />
}

