import { createAdminClient, createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import EventClient from '@/components/dashboard/EventClient'

export const dynamic = 'force-dynamic'

export default async function UserEventPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login?next=/cpns/dashboard/event')

    const admin = await createAdminClient()
    const { data: events, error } = await admin
        .from('tryout_events')
        .select('id, title, description, starts_at, ends_at, start_grace_minutes, duration_minutes, max_participants, requires_code, status, tryout_event_questions(id)')
        .in('status', ['scheduled', 'live', 'closed'])
        .order('starts_at', { ascending: true })

    if (error) {
        console.error('[user-event-page]', error)
        return <div className="p-8 text-center font-bold text-gray-900">Gagal memuat event</div>
    }

    const eventIds = (events || []).map((event) => event.id)

    const [{ data: participants }, { data: eventSessions }] = await Promise.all([
        eventIds.length > 0
            ? admin
                .from('tryout_event_participants')
                .select('id, event_id, status')
                .eq('user_id', user.id)
                .in('event_id', eventIds)
            : Promise.resolve({ data: [] }),
        eventIds.length > 0
            ? admin
                .from('tryout_event_sessions')
                .select('event_id, session_id, status, test_sessions(status)')
                .eq('user_id', user.id)
                .in('event_id', eventIds)
            : Promise.resolve({ data: [] }),
    ])

    const participantMap = new Map((participants || []).map((participant) => [participant.event_id, participant]))
    const sessionMap = new Map((eventSessions || []).map((session) => [session.event_id, session]))

    const normalizedEvents = (events || []).map((event) => {
        const participant = participantMap.get(event.id)
        const eventSession = sessionMap.get(event.id)
        const testSession = Array.isArray(eventSession?.test_sessions)
            ? eventSession.test_sessions[0]
            : eventSession?.test_sessions

        return {
            id: event.id,
            title: event.title,
            description: event.description,
            starts_at: event.starts_at,
            ends_at: event.ends_at,
            start_grace_minutes: event.start_grace_minutes,
            duration_minutes: event.duration_minutes,
            max_participants: event.max_participants,
            requires_code: event.requires_code,
            status: event.status,
            participant_id: participant?.id || null,
            participant_status: participant?.status || null,
            session_id: eventSession?.session_id || null,
            event_session_status: eventSession?.status || null,
            test_session_status: testSession?.status || null,
            question_count: event.tryout_event_questions?.length || 0,
        }
    })

    return <EventClient events={normalizedEvents} />
}
