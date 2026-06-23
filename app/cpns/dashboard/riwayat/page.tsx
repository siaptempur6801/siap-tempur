import { redirect } from 'next/navigation'
import { PASSING_GRADES } from '@/lib/constants'
import { isDrillingMateriQuestionSet, normalizeTestSessionKind } from '@/lib/practice-session'
import { createClient } from '@/lib/utils/supabase/server'
import HistoryClient from './HistoryClient'

type SessionType = 'TWK' | 'TIU' | 'TKP'
type HistoryKind = 'event' | 'full-tryout' | 'mini-tryout' | 'drilling-materi'

type HistoryMeta = {
    types: Set<SessionType>
    subCategories: Set<string>
    answerCount: number
}

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

function getHistoryTitle(
    mode: 'practice' | 'tryout',
    types: SessionType[],
    eventTitle?: string | null,
    drillingSubCategory?: string | null
) {
    if (eventTitle) {
        return eventTitle
    }

    if (mode === 'tryout' || types.length > 1) {
        return 'Tryout SKD Full'
    }

    if (drillingSubCategory) {
        return `Drilling Materi ${drillingSubCategory}`
    }

    if (types[0]) {
        return `Mini Tryout ${types[0]}`
    }

    return 'Mini Tryout'
}

function getHistoryKind(
    mode: 'practice' | 'tryout',
    types: SessionType[],
    eventTitle?: string | null,
    drillingSubCategory?: string | null
): HistoryKind {
    if (eventTitle) return 'event'
    if (mode === 'tryout' || types.length > 1) return 'full-tryout'
    if (drillingSubCategory) return 'drilling-materi'
    return 'mini-tryout'
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
        .select('id, mode, session_kind, start_time, end_time, total_score, score_twk, score_tiu, score_tkp')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('end_time', { ascending: false })
        .limit(24)

    const sessionIds = completedSessions?.map((session) => session.id) ?? []
    const historyMetaMap = new Map<string, HistoryMeta>()
    const eventTitleMap = new Map<string, string>()

    if (sessionIds.length > 0) {
        const [{ data: historyAnswers }, { data: eventSessions }] = await Promise.all([
            supabase
                .from('test_answers')
                .select(`
                    session_id,
                    questions (
                        type,
                        category,
                        sub_category
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
            const subCategorySource = typeof question?.sub_category === 'string' && question.sub_category.trim()
                ? question.sub_category
                : typeof question?.category === 'string'
                    ? question.category
                    : ''
            const subCategory = subCategorySource.trim()

            if (!type) return

            const currentMeta = historyMetaMap.get(answer.session_id) ?? {
                types: new Set<SessionType>(),
                subCategories: new Set<string>(),
                answerCount: 0,
            }
            currentMeta.types.add(type)
            if (subCategory) currentMeta.subCategories.add(subCategory)
            currentMeta.answerCount += 1
            historyMetaMap.set(answer.session_id, currentMeta)
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
        const meta = historyMetaMap.get(session.id)
        const types = Array.from(meta?.types ?? [])
        const subCategories = Array.from(meta?.subCategories ?? [])
        const eventTitle = eventTitleMap.get(session.id) ?? null
        const scoreTwk = session.score_twk ?? 0
        const scoreTiu = session.score_tiu ?? 0
        const scoreTkp = session.score_tkp ?? 0
        const sessionKind = normalizeTestSessionKind(session.session_kind)
        const drillingSubCategory =
            isDrillingMateriQuestionSet({
                sessionKind,
                isCombined: types.length > 1,
                answerCount: meta?.answerCount ?? 0,
                uniqueSubCategoryCount: subCategories.length,
                isEventSession: Boolean(eventTitle),
            }) && subCategories.length >= 1
                ? subCategories[0]
                : null

        return {
            id: session.id,
            title: getHistoryTitle(session.mode, types, eventTitle, drillingSubCategory),
            kind: getHistoryKind(session.mode, types, eventTitle, drillingSubCategory),
            isEvent: Boolean(eventTitle),
            subCategory: drillingSubCategory,
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
