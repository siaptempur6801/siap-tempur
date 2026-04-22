import TryoutAkbarClient, { EventCreateController } from '@/components/admin/TryoutAkbarClient'
import { createAdminClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

export default async function EventAdminPage() {
    const supabase = await createAdminClient()

    const { data: events, error } = await supabase
        .from('tryout_events')
        .select(`
            id,
            title,
            description,
            starts_at,
            ends_at,
            start_grace_minutes,
            duration_minutes,
            max_participants,
            requires_code,
            status,
            result_visible_at,
            explanation_visible_at,
            created_at,
            tryout_event_participants(id, status),
            tryout_event_codes(id, code, max_uses, used_count, is_active, expires_at, created_at),
            tryout_event_questions(id),
            tryout_event_sessions(id, status, test_sessions(status, is_passed))
        `)
        .order('starts_at', { ascending: false })

    if (error) {
        console.error('[event-admin]', error)
        return <div className="p-8 text-center font-bold text-gray-900">Gagal memuat data event</div>
    }

    const normalizedEvents = (events || []).map((event) => {
        const sessions = event.tryout_event_sessions || []
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
            result_visible_at: event.result_visible_at,
            explanation_visible_at: event.explanation_visible_at,
            created_at: event.created_at,
            codes: event.tryout_event_codes || [],
            participant_count: event.tryout_event_participants?.length || 0,
            question_count: event.tryout_event_questions?.length || 0,
            session_count: sessions.length,
            completed_count: sessions.filter((session) => {
                const testSession = Array.isArray(session.test_sessions) ? session.test_sessions[0] : session.test_sessions
                return session.status === 'completed' || testSession?.status === 'completed'
            }).length,
            passed_count: sessions.filter((session) => {
                const testSession = Array.isArray(session.test_sessions) ? session.test_sessions[0] : session.test_sessions
                return Boolean(testSession?.is_passed)
            }).length,
        }
    })

    return (
        <div className="space-y-8 pb-10">
            <div className="relative overflow-hidden border-2 border-gray-900 bg-white p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
                <div className="pointer-events-none absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '10px 10px' }}></div>
                <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="mb-2 inline-flex border-2 border-gray-900 bg-gray-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            Admin Console
                        </p>
                        <h1 className="font-handwriting text-4xl font-black text-gray-900">Event</h1>
                        <p className="mt-2 text-sm font-medium text-gray-600">
                            Kelola event berbasis jadwal seperti Tryout Akbar, paket soal, status, dan monitoring peserta.
                        </p>
                    </div>
                    <EventCreateController />
                </div>
            </div>

            <TryoutAkbarClient events={normalizedEvents} />
        </div>
    )
}
