import { redirect } from 'next/navigation'
import { createAdminClient, createClient } from '@/lib/utils/supabase/server'
import LiveLeaderboardClient from '@/components/admin/LiveLeaderboardClient'

export const metadata = {
    title: 'Live Leaderboard',
}

export default async function LiveLeaderboardPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const supabase = await createClient()

    // Protect route: only admin/superadmin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/login')
    }

    const admin = await createAdminClient()
    const { data: profile } = await admin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
        redirect('/cpns/dashboard')
    }

    return <LiveLeaderboardClient eventId={id} />
}
