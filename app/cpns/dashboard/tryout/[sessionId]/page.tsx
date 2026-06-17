import { createClient } from '@/lib/utils/supabase/server'
import { redirect } from 'next/navigation'
import PracticeSessionClient from '@/components/practice/PracticeSessionClient'
import { getOptionOrderForSession, orderOptionsById } from '@/lib/option-randomizer'
import { logger } from '@/lib/logger'

export default async function PracticeSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
    const supabase = await createClient()
    const { sessionId } = await params



    const { data: session, error: sessionError } = await supabase
        .from('test_sessions')
        .select('*')
        .eq('id', sessionId)
        .single()

    if (sessionError) {
        logger.warn('[PracticeSessionPage] Session Error:', { error: sessionError })
        redirect('/cpns/dashboard/tryout') // Comment out redirect to see error on screen/logs
    }

    if (!session) {
        logger.warn('[PracticeSessionPage] Session not found (Possible RLS issue)')
        redirect('/cpns/dashboard/tryout')
    }

    if (session.status === 'completed') {
        redirect(`/cpns/dashboard/tryout/${sessionId}/result`)
    }

    // 2. Fetch Questions & Options
    // Since we don't have a direct JSON field for questions in the table (we just used it for return in the function),
    // we need to reconstruct the question set from test_answers.

    const { data: answersData, error: answersError } = await supabase
        .from('test_answers')
        .select(`
            id,
            question_id,
            option_id,
            option_order,
            questions (
                id,
                content,
                type,
                category,
                sub_category,
                image_url,
                options (
                    id,
                    content,
                    image_url
                )
            )
        `)
        .eq('session_id', sessionId)

    if (answersError || !answersData) {
        logger.warn('[PracticeSessionPage] Answers Error:', { error: answersError })
        return <div>Error loading questions</div>
    }

    // 2.5 Fetch Tryout Configurations for Sorting
    const { data: configs } = await supabase
        .from('tryout_configurations')
        .select('type, sub_category, sort_order')
        .eq('is_active', true)

    // Build a map for O(1) sort order lookups
    const configSortMap: Record<string, number> = {}
    if (configs) {
        configs.forEach((c) => {
            const key = `${c.type}-${c.sub_category}`
            configSortMap[key] = c.sort_order
        })
    }

    // 3. Format Data for Client
    // We need to transform the joined data into a clean structure
    interface Option {
        id: string
        content: string
        image_url?: string | null
    }

    interface Question {
        id: string
        content: string
        type: string
        category: string
        sub_category: string
        image_url?: string | null
        options: Option[]
        sort_order?: number
    }

    interface AnswerData {
        id: string
        question_id: string
        option_id: string | null
        option_order: string[] | null
        questions: Question | Question[] // Supabase join can return array or single object depending on query
    }

    const optionOrderUpdates: Array<{ answerId: string; optionOrder: string[] }> = []

    const questions = (answersData as unknown as AnswerData[]).map((item) => {
        // Handle if joined data is array or object
        const qRaw = Array.isArray(item.questions) ? item.questions[0] : item.questions

        if (!qRaw) return null

        const sortKey = `${qRaw.type}-${qRaw.sub_category}`
        const sortOrder = configSortMap[sortKey] || 999
        const rawOptions = qRaw.options || []
        const optionOrder = item.option_order?.length
            ? item.option_order
            : getOptionOrderForSession(rawOptions, sessionId, qRaw.id)

        if (!item.option_order?.length && optionOrder.length > 0) {
            optionOrderUpdates.push({ answerId: item.id, optionOrder })
        }

        return {
            id: qRaw.id,
            content: qRaw.content,
            type: qRaw.type,
            category: qRaw.category,
            sub_category: qRaw.sub_category,
            image_url: qRaw.image_url,
            options: orderOptionsById(rawOptions, optionOrder),
            sort_order: sortOrder
        }
    }).filter(Boolean) as Question[]

    if (optionOrderUpdates.length > 0) {
        await Promise.all(
            optionOrderUpdates.map((item) => (
                supabase
                    .from('test_answers')
                    .update({ option_order: item.optionOrder })
                    .eq('id', item.answerId)
            ))
        )
    }

    // Perform server-side sorting based on admin configuration
    questions.sort((a, b) => {
        if (a.sort_order !== undefined && b.sort_order !== undefined) {
            return a.sort_order - b.sort_order
        }
        return 0
    })

    const initialAnswers: Record<string, string> = {}
        ; (answersData as unknown as AnswerData[]).forEach((item) => {
            if (item.option_id) {
                initialAnswers[item.question_id] = item.option_id
            }
        })

    const initialCurrentIndex = Math.max(
        0,
        Math.min(
            Number(session.current_question_index ?? 0),
            Math.max(questions.length - 1, 0)
        )
    )

    const initialMarked = session.marked_questions && typeof session.marked_questions === 'object'
        ? Object.fromEntries(
            Object.entries(session.marked_questions as Record<string, unknown>).map(([questionId, value]) => [questionId, Boolean(value)])
        )
        : {}

    const { data: eventSession } = await supabase
        .from('tryout_event_sessions')
        .select('id')
        .eq('session_id', sessionId)
        .maybeSingle()

    // Check if this is a tryout session (has all three types)
    const questionTypes = new Set(questions.map((q) => q.type))
    const isTryout = questionTypes.has('TWK') && questionTypes.has('TIU') && questionTypes.has('TKP')

    // Calculate end time for tryout (100 minutes from start)
    let endTime: string | undefined
    if (isTryout && session.start_time) {
        const endTimeMs = new Date(session.start_time).getTime() + (100 * 60 * 1000)
        endTime = new Date(endTimeMs).toISOString()
    }

    return (
        <PracticeSessionClient
            sessionId={sessionId}
            questions={questions}
            initialAnswers={initialAnswers}
            initialCurrentIndex={initialCurrentIndex}
            initialMarked={initialMarked}
            endTime={endTime}
            isTryout={isTryout}
            returnTo={eventSession ? 'event' : isTryout ? 'tryout' : 'mini-tryout'}
        />
    )
}
