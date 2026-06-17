import { redirect } from 'next/navigation'
import { MINI_TRYOUT_TYPES, isMiniTryoutType, type MiniTryoutType } from '@/lib/constants'
import { isMissingProgressColumnError } from '@/lib/practice-session'
import { createClient } from '@/lib/utils/supabase/server'
import MiniTryoutClient, { type MiniTryoutActiveSessions } from './MiniTryoutClient'

export const dynamic = 'force-dynamic'

export const metadata = {
    title: 'Mini Tryout SKD - SIAP TEMPUR',
    description: 'Latihan mini tryout terfokus untuk TWK, TIU, dan TKP.',
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

type ActivePracticeSessionRow = {
    id: string
    start_time: string | null
    current_question_index?: number | null
}

type AnswerTypeRow = {
    session_id: string
    option_id: string | null
    questions: { type?: string | null } | Array<{ type?: string | null }> | null
}

function getQuestionType(answer: AnswerTypeRow) {
    const question = Array.isArray(answer.questions) ? answer.questions[0] : answer.questions
    return question?.type ?? null
}

async function getActiveMiniTryoutSessions(
    supabase: SupabaseClient,
    userId: string
): Promise<MiniTryoutActiveSessions> {
    const activePracticeQuery = await supabase
        .from('test_sessions')
        .select('id, start_time, current_question_index')
        .eq('user_id', userId)
        .eq('mode', 'practice')
        .eq('status', 'in_progress')
        .order('last_activity_at', { ascending: false })
        .limit(12)

    const fallbackPracticeQuery = activePracticeQuery.error && isMissingProgressColumnError(activePracticeQuery.error)
        ? await supabase
            .from('test_sessions')
            .select('id, start_time')
            .eq('user_id', userId)
            .eq('mode', 'practice')
            .eq('status', 'in_progress')
            .order('start_time', { ascending: false })
            .limit(12)
        : null

    const sessions = (fallbackPracticeQuery?.data ?? activePracticeQuery.data ?? []) as ActivePracticeSessionRow[]
    const sessionIds = sessions.map((session) => session.id)

    if (sessionIds.length === 0) {
        return {}
    }

    const { data: answers } = await supabase
        .from('test_answers')
        .select(`
            session_id,
            option_id,
            questions (
                type
            )
        `)
        .in('session_id', sessionIds)

    const answersBySessionId = new Map<string, AnswerTypeRow[]>()

    ;((answers ?? []) as AnswerTypeRow[]).forEach((answer) => {
        const current = answersBySessionId.get(answer.session_id) ?? []
        current.push(answer)
        answersBySessionId.set(answer.session_id, current)
    })

    const activeSessionsByType: MiniTryoutActiveSessions = {}

    sessions.forEach((session) => {
        const sessionAnswers = answersBySessionId.get(session.id) ?? []
        const type = sessionAnswers.map(getQuestionType).find(isMiniTryoutType)

        if (!type || activeSessionsByType[type]) {
            return
        }

        activeSessionsByType[type] = {
            sessionId: session.id,
            startedAt: session.start_time,
            resumeQuestionNumber: Math.max(1, (session.current_question_index ?? 0) + 1),
            answeredQuestions: sessionAnswers.filter((answer) => Boolean(answer.option_id)).length,
        }
    })

    return Object.fromEntries(
        MINI_TRYOUT_TYPES.map((type) => [type, activeSessionsByType[type]]).filter(([, session]) => Boolean(session))
    ) as Partial<Record<MiniTryoutType, NonNullable<MiniTryoutActiveSessions[MiniTryoutType]>>>
}

export default async function MiniTryoutPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const [activeSessionsByType, profileResult] = await Promise.all([
        getActiveMiniTryoutSessions(supabase, user.id),
        supabase
            .from('profiles')
            .select('tryout_quota')
            .eq('id', user.id)
            .maybeSingle(),
    ])

    const quota = profileResult.data?.tryout_quota ?? 0

    return <MiniTryoutClient activeSessionsByType={activeSessionsByType} quota={quota} />
}
