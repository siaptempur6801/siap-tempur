import { redirect } from 'next/navigation'
import { createAdminClient, createClient } from '@/lib/utils/supabase/server'
import LiveLeaderboardClient from '@/components/admin/LiveLeaderboardClient'
import { canViewCompletedEventLeaderboard } from '@/lib/event-access'

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

    if (profile && ['admin', 'superadmin'].includes(profile.role)) {
        return <LiveLeaderboardClient eventId={id} />
    }

    const [{ data: event }, { data: participant }] = await Promise.all([
        admin
            .from('tryout_events')
            .select('status, starts_at, duration_minutes, start_grace_minutes')
            .eq('id', id)
            .single(),
        admin
            .from('tryout_event_participants')
            .select('id')
            .eq('event_id', id)
            .eq('user_id', user.id)
            .maybeSingle(),
    ])

    if (!event || !canViewCompletedEventLeaderboard({ event, participantId: participant?.id })) {
        redirect('/cpns/dashboard')
    }

    return <LiveLeaderboardClient eventId={id} />
}
