import { createAdminClient, createClient } from '@/lib/utils/supabase/server'
import { redirect } from 'next/navigation'
import EventClient from '@/components/dashboard/EventClient'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export default async function UserEventPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login?next=/cpns/dashboard/event')

    const admin = await createAdminClient()
    const { data: events, error } = await admin
        .from('tryout_events')
        .select('id, title, description, starts_at, ends_at, start_grace_minutes, duration_minutes, max_participants, requires_code, is_paid, price, status, tryout_event_questions(id)')
        .in('status', ['scheduled', 'live', 'closed'])
        .order('starts_at', { ascending: true })

    if (error) {
        logger.warn('[user-event-page]', { error })
        return <div className="p-8 text-center font-bold text-gray-900">Gagal memuat event</div>
    }

    const eventIds = (events || []).map((event) => event.id)

    const [{ data: participants }, { data: eventSessions }, { data: eventPayments }] = await Promise.all([
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
        // Fetch payment status per event for this user
        eventIds.length > 0
            ? admin
                .from('event_payments')
                .select('event_id, order_id, status, amount')
                .eq('user_id', user.id)
                .in('event_id', eventIds)
            : Promise.resolve({ data: [] }),
    ])

    const participantMap = new Map((participants || []).map((participant) => [participant.event_id, participant]))
    const sessionMap = new Map((eventSessions || []).map((session) => [session.event_id, session]))
    const successStatuses = new Set(['capture', 'settlement'])
    const paymentMap = new Map<string, NonNullable<typeof eventPayments>[number]>()
    for (const payment of eventPayments || []) {
        const current = paymentMap.get(payment.event_id)
        if (!current) {
            paymentMap.set(payment.event_id, payment)
            continue
        }

        const paymentIsSuccess = successStatuses.has(payment.status)
        const currentIsSuccess = successStatuses.has(current.status)
        if (paymentIsSuccess && !currentIsSuccess) {
            paymentMap.set(payment.event_id, payment)
        }
    }

    const normalizedEvents = (events || []).map((event) => {
        const participant = participantMap.get(event.id)
        const eventSession = sessionMap.get(event.id)
        const payment = paymentMap.get(event.id)
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
            is_paid: event.is_paid ?? false,
            price: event.price ?? 0,
            status: event.status,
            participant_id: participant?.id || null,
            participant_status: participant?.status || null,
            session_id: eventSession?.session_id || null,
            event_session_status: eventSession?.status || null,
            test_session_status: testSession?.status || null,
            question_count: event.tryout_event_questions?.length || 0,
            // Payment info (null if gratis or belum bayar)
            payment_status: payment?.status || null,
            payment_order_id: payment?.order_id || null,
        }
    })

    return <EventClient events={normalizedEvents} />
}
