import { redirect } from 'next/navigation'
import { MINI_TRYOUT_TYPES, isMiniTryoutType } from '@/lib/constants'
import { DRILLING_MATERI_QUESTION_COUNT, getDrillingMaterialKey, isMissingProgressColumnError } from '@/lib/practice-session'
import { createAdminClient, createClient } from '@/lib/utils/supabase/server'
import DrillingMateriClient, { type DrillingActiveSessions, type DrillingMateriItem } from './DrillingMateriClient'

export const dynamic = 'force-dynamic'

export const metadata = {
    title: 'Drilling Materi SKD - SIAP TEMPUR',
    description: 'Latihan drilling 30 soal per materi TWK, TIU, dan TKP dengan biaya 1 token per materi.',
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

type ActivePracticeSessionRow = {
    id: string
    start_time: string | null
    session_kind?: string | null
    current_question_index?: number | null
}

type AnswerTypeRow = {
    session_id: string
    option_id: string | null
    questions: { type?: string | null; sub_category?: string | null } | Array<{ type?: string | null; sub_category?: string | null }> | null
}

type QuestionMaterialRow = {
    type: string | null
    sub_category: string | null
}

function getQuestion(answer: AnswerTypeRow) {
    const question = Array.isArray(answer.questions) ? answer.questions[0] : answer.questions
    return question ?? null
}

async function getActiveDrillingSessions(
    supabase: SupabaseClient,
    userId: string
): Promise<DrillingActiveSessions> {
    const activePracticeQuery = await supabase
        .from('test_sessions')
        .select('id, start_time, session_kind, current_question_index')
        .eq('user_id', userId)
        .eq('mode', 'practice')
        .eq('status', 'in_progress')
        .order('last_activity_at', { ascending: false })
        .limit(15)

    const fallbackPracticeQuery = activePracticeQuery.error && isMissingProgressColumnError(activePracticeQuery.error)
        ? await supabase
            .from('test_sessions')
            .select('id, start_time, session_kind')
            .eq('user_id', userId)
            .eq('mode', 'practice')
            .eq('status', 'in_progress')
            .order('start_time', { ascending: false })
            .limit(15)
        : null

    const sessions = (fallbackPracticeQuery?.data ?? activePracticeQuery.data ?? []) as ActivePracticeSessionRow[]
    const sessionIds = sessions.map((session) => session.id)

    if (sessionIds.length === 0) return {}

    const { data: answers } = await supabase
        .from('test_answers')
        .select(`
            session_id,
            option_id,
            questions (
                type,
                sub_category
            )
        `)
        .in('session_id', sessionIds)

    const answersBySessionId = new Map<string, AnswerTypeRow[]>()
    ;((answers ?? []) as AnswerTypeRow[]).forEach((answer) => {
        const current = answersBySessionId.get(answer.session_id) ?? []
        current.push(answer)
        answersBySessionId.set(answer.session_id, current)
    })

    const activeSessionsByKey: DrillingActiveSessions = {}

    sessions.forEach((session) => {
        if (session.session_kind && session.session_kind !== 'drilling_materi') return

        const sessionAnswers = answersBySessionId.get(session.id) ?? []
        if (sessionAnswers.length !== DRILLING_MATERI_QUESTION_COUNT) return

        const firstQuestion = getQuestion(sessionAnswers[0])
        const type = firstQuestion?.type
        const subCategory = firstQuestion?.sub_category?.trim()
        if (!isMiniTryoutType(type) || !subCategory) return

        const isSameMaterial = sessionAnswers.every((answer) => {
            const question = getQuestion(answer)
            return question?.type === type && question.sub_category?.trim() === subCategory
        })
        if (!isSameMaterial) return

        const key = getDrillingMaterialKey(type, subCategory)
        if (activeSessionsByKey[key]) return

        activeSessionsByKey[key] = {
            sessionId: session.id,
            startedAt: session.start_time,
            resumeQuestionNumber: Math.max(1, (session.current_question_index ?? 0) + 1),
            answeredQuestions: sessionAnswers.filter((answer) => Boolean(answer.option_id)).length,
        }
    })

    return activeSessionsByKey
}

async function getDrillingMaterials(): Promise<DrillingMateriItem[]> {
    const admin = await createAdminClient()
    const { data } = await admin
        .from('questions')
        .select('type, sub_category')
        .in('type', MINI_TRYOUT_TYPES)
        .not('sub_category', 'is', null)

    const countsByKey = new Map<string, DrillingMateriItem>()

    ;((data ?? []) as QuestionMaterialRow[]).forEach((question) => {
        const type = question.type
        const subCategory = question.sub_category?.trim()
        if (!isMiniTryoutType(type) || !subCategory) return

        const key = getDrillingMaterialKey(type, subCategory)
        const current = countsByKey.get(key)
        if (current) {
            countsByKey.set(key, {
                ...current,
                questionCount: current.questionCount + 1,
            })
            return
        }

        countsByKey.set(key, {
            key,
            type,
            subCategory,
            questionCount: 1,
        })
    })

    return Array.from(countsByKey.values()).sort((a, b) => {
        const typeOrder = MINI_TRYOUT_TYPES.indexOf(a.type) - MINI_TRYOUT_TYPES.indexOf(b.type)
        if (typeOrder !== 0) return typeOrder
        return a.subCategory.localeCompare(b.subCategory, 'id-ID')
    })
}

export default async function DrillingMateriPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const [activeSessionsByKey, materials, profileResult] = await Promise.all([
        getActiveDrillingSessions(supabase, user.id),
        getDrillingMaterials(),
        supabase
            .from('profiles')
            .select('tryout_quota')
            .eq('id', user.id)
            .single(),
    ])
    const quota = profileResult.data?.tryout_quota ?? 0

    return <DrillingMateriClient activeSessionsByKey={activeSessionsByKey} materials={materials} quota={quota} />
}
