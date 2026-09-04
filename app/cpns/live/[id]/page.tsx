import { redirect } from 'next/navigation'
import { createV2Client } from '@/lib/utils/supabase/server'
import { getServerNowMs } from '@/lib/server/time'
import LiveLeaderboardClient from '@/components/admin/LiveLeaderboardClient'
import { authorizationRepository } from '@/src/repositories/authorization.repository'
import { eventRepository } from '@/src/repositories/event.repository'
import { PERMISSIONS } from '@/src/auth/permissions'

export const metadata = {
    title: 'Live Leaderboard',
}

export default async function LiveLeaderboardPage({ params }: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const supabase = await createV2Client()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect(`/login?returnTo=${encodeURIComponent(`/cpns/live/${id}`)}`)

    const event = await eventRepository.getEvent(id)
    if (!event) redirect('/cpns/dashboard/event')

    const authorization = await authorizationRepository.getUserAuthorization(user.id)
    if (authorization.permissions.includes(PERMISSIONS.EVENT_MANAGE)) {
        return <LiveLeaderboardClient eventId={id}/>
    }

    const finished = String(event.status).toLowerCase() === 'closed' || getServerNowMs() > Date.parse(event.ends_at)
    if (!finished) redirect('/cpns/dashboard/event')

    const registration = await eventRepository.getRegistration(user.id, id)
    if (!registration) redirect('/cpns/dashboard/event')

    return <LiveLeaderboardClient eventId={id}/>
}
