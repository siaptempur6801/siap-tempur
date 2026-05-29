import { redirect } from 'next/navigation'
import { PASSING_GRADES } from '@/lib/constants'
import { createClient } from '@/lib/utils/supabase/server'
import HistoryClient from './HistoryClient'

type SessionType = 'TWK' | 'TIU' | 'TKP'

function formatCompletedAt(dateTime: string) {
    return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta'
    }).format(new Date(dateTime))
}

function getHistoryTitle(mode: 'practice' | 'tryout', types: SessionType[], eventTitle?: string | null) {
    if (eventTitle) {
        return eventTitle
    }

    if (mode === 'tryout' || types.length > 1) {
        return 'Tryout SKD Full'
    }

    if (types[0]) {
        return `Tryout ${types[0]}`
    }

    return 'tryout soal'
}

function getHistoryPassed(
    mode: 'practice' | 'tryout',
    types: SessionType[],
    scores: { twk: number; tiu: number; tkp: number }
) {
    if (mode === 'tryout' || types.length > 1) {
        return (
            scores.twk >= PASSING_GRADES.TWK &&
            scores.tiu >= PASSING_GRADES.TIU &&
            scores.tkp >= PASSING_GRADES.TKP
        )
    }

    const type = types[0]
    if (type === 'TWK') return scores.twk >= PASSING_GRADES.TWK
    if (type === 'TIU') return scores.tiu >= PASSING_GRADES.TIU
    if (type === 'TKP') return scores.tkp >= PASSING_GRADES.TKP

    return null
}

export default async function RiwayatPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: completedSessions } = await supabase
        .from('test_sessions')
        .select('id, mode, start_time, end_time, total_score, score_twk, score_tiu, score_tkp')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('end_time', { ascending: false })
        .limit(24)

    const sessionIds = completedSessions?.map((session) => session.id) ?? []
    const historyTypesMap = new Map<string, Set<SessionType>>()
    const eventTitleMap = new Map<string, string>()

    if (sessionIds.length > 0) {
        const [{ data: historyAnswers }, { data: eventSessions }] = await Promise.all([
            supabase
                .from('test_answers')
                .select(`
                    session_id,
                    questions (
                        type
                    )
                `)
                .in('session_id', sessionIds),
            supabase
                .from('tryout_event_sessions')
                .select(`
                    session_id,
                    tryout_events (
                        title
                    )
                `)
                .in('session_id', sessionIds),
        ])

        historyAnswers?.forEach((answer) => {
            const question = Array.isArray(answer.questions) ? answer.questions[0] : answer.questions
            const type = question?.type as SessionType | undefined

            if (!type) return

            const currentTypes = historyTypesMap.get(answer.session_id) ?? new Set<SessionType>()
            currentTypes.add(type)
            historyTypesMap.set(answer.session_id, currentTypes)
        })

        eventSessions?.forEach((eventSession) => {
            const event = Array.isArray(eventSession.tryout_events)
                ? eventSession.tryout_events[0]
                : eventSession.tryout_events

            if (event?.title) {
                eventTitleMap.set(eventSession.session_id, event.title)
            }
        })
    }

    const historySessions = (completedSessions ?? []).map((session) => {
        const types = Array.from(historyTypesMap.get(session.id) ?? [])
        const eventTitle = eventTitleMap.get(session.id) ?? null
        const scoreTwk = session.score_twk ?? 0
        const scoreTiu = session.score_tiu ?? 0
        const scoreTkp = session.score_tkp ?? 0

        return {
            id: session.id,
            title: getHistoryTitle(session.mode, types, eventTitle),
            isEvent: Boolean(eventTitle),
            completedAt: session.end_time ?? session.start_time,
            completedAtLabel: formatCompletedAt(session.end_time ?? session.start_time),
            totalScore: session.total_score ?? 0,
            scoreTwk,
            scoreTiu,
            scoreTkp,
            passed: getHistoryPassed(session.mode, types, {
                twk: scoreTwk,
                tiu: scoreTiu,
                tkp: scoreTkp
            })
        }
    })

    return <HistoryClient sessions={historySessions} />
}
