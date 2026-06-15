import TryoutAkbarClient, { EventCreateController } from '@/components/admin/TryoutAkbarClient'
import { createAdminClient } from '@/lib/utils/supabase/server'
import { logger } from '@/lib/logger'
import { PASSING_GRADES } from '@/lib/constants'

export const dynamic = 'force-dynamic'

function getSynchronizedCloseAt(event: {
    starts_at: string
    duration_minutes: number
    start_grace_minutes: number
}) {
    return new Date(
        new Date(event.starts_at).getTime() +
        (event.duration_minutes + event.start_grace_minutes) * 60 * 1000
    ).toISOString()
}

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
            group_link,
            is_paid,
            price,
            status,
            result_visible_at,
            explanation_visible_at,
            created_at,
            tryout_event_participants(
                id,
                user_id,
                status,
                registered_at,
                profiles(full_name),
                tryout_event_codes(code)
            ),
            tryout_event_codes(id, code, max_uses, used_count, is_active, expires_at, created_at),
            tryout_event_questions(
                id,
                sort_order,
                created_at,
                questions(
                    id,
                    question_code,
                    content,
                    type,
                    category,
                    sub_category,
                    explanation,
                    image_url,
                    options(id, content, image_url, is_correct, score_value, created_at)
                )
            ),
            tryout_event_sessions(
                id,
                user_id,
                session_id,
                status,
                started_at,
                finished_at,
                test_sessions(
                    id,
                    status,
                    start_time,
                    end_time,
                    score_twk,
                    score_tiu,
                    score_tkp,
                    total_score,
                    is_passed
                )
            )
        `)
        .order('starts_at', { ascending: false })

    if (error) {
        logger.warn('[event-admin]', { error })
        return <div className="p-8 text-center font-bold text-gray-900">Gagal memuat data event</div>
    }

    const normalizedEvents = (events || []).map((event) => {
        const sessions = event.tryout_event_sessions || []
        const sessionByUserId = new Map(
            sessions.map((session) => [session.user_id, session])
        )
        const questions = (event.tryout_event_questions || [])
            .map((eventQuestion) => {
                const question = Array.isArray(eventQuestion.questions) ? eventQuestion.questions[0] : eventQuestion.questions

                if (!question) return null

                return {
                    id: eventQuestion.id,
                    sort_order: eventQuestion.sort_order,
                    created_at: eventQuestion.created_at,
                    question_id: question.id,
                    question_code: question.question_code,
                    content: question.content,
                    type: question.type,
                    category: question.category,
                    sub_category: question.sub_category,
                    explanation: question.explanation,
                    image_url: question.image_url,
                    options: [...(question.options || [])].sort((a, b) => {
                        const createdAtDiff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                        if (createdAtDiff !== 0) return createdAtDiff
                        return a.id.localeCompare(b.id)
                    }),
                }
            })
            .filter((question): question is NonNullable<typeof question> => question !== null)
            .sort((a, b) => {
                if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
                const createdAtDiff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                if (createdAtDiff !== 0) return createdAtDiff
                return a.id.localeCompare(b.id)
            })
            .map((question, index) => ({
                ...question,
                display_order: index + 1,
            }))

        const synchronizedCloseAt = getSynchronizedCloseAt(event)
        const participants = (event.tryout_event_participants || [])
            .map((participant) => {
                const profile = Array.isArray(participant.profiles) ? participant.profiles[0] : participant.profiles
                const code = Array.isArray(participant.tryout_event_codes) ? participant.tryout_event_codes[0] : participant.tryout_event_codes
                const eventSession = sessionByUserId.get(participant.user_id)
                const testSession = Array.isArray(eventSession?.test_sessions) ? eventSession?.test_sessions[0] : eventSession?.test_sessions
                const scoreTwk = Number(testSession?.score_twk || 0)
                const scoreTiu = Number(testSession?.score_tiu || 0)
                const scoreTkp = Number(testSession?.score_tkp || 0)
                const isPassed = Boolean(testSession?.is_passed) || (
                    scoreTwk >= PASSING_GRADES.TWK &&
                    scoreTiu >= PASSING_GRADES.TIU &&
                    scoreTkp >= PASSING_GRADES.TKP
                )

                return {
                    id: participant.id,
                    user_id: participant.user_id,
                    full_name: profile?.full_name || null,
                    status: participant.status,
                    registered_at: participant.registered_at,
                    code: code?.code || null,
                    session_id: eventSession?.session_id || null,
                    event_session_status: eventSession?.status || null,
                    test_session_status: testSession?.status || null,
                    started_at: eventSession?.started_at || testSession?.start_time || null,
                    finished_at: eventSession?.finished_at || testSession?.end_time || null,
                    score_twk: testSession?.score_twk ?? null,
                    score_tiu: testSession?.score_tiu ?? null,
                    score_tkp: testSession?.score_tkp ?? null,
                    total_score: testSession?.total_score ?? null,
                    is_passed: testSession ? isPassed : null,
                }
            })
            .sort((a, b) => new Date(a.registered_at).getTime() - new Date(b.registered_at).getTime())

        return {
            id: event.id,
            title: event.title,
            description: event.description,
            starts_at: event.starts_at,
            ends_at: synchronizedCloseAt,
            start_grace_minutes: event.start_grace_minutes,
            duration_minutes: event.duration_minutes,
            max_participants: event.max_participants,
            requires_code: event.requires_code,
            group_link: event.group_link,
            is_paid: event.is_paid ?? false,
            price: event.price ?? 0,
            status: event.status,
            result_visible_at: synchronizedCloseAt,
            explanation_visible_at: synchronizedCloseAt,
            created_at: event.created_at,
            codes: event.tryout_event_codes || [],
            participants,
            participant_count: participants.length,
            questions,
            question_count: questions.length,
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
