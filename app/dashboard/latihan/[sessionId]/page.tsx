import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import PracticeSessionClient from '@/components/practice/PracticeSessionClient'

export default async function PracticeSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
    const supabase = await createClient()
    const { sessionId } = await params



    const { data: session, error: sessionError } = await supabase
        .from('test_sessions')
        .select('*')
        .eq('id', sessionId)
        .single()

    if (sessionError) {
        console.error('[PracticeSessionPage] Session Error Raw:', JSON.stringify(sessionError, null, 2))
        redirect('/dashboard/latihan') // Comment out redirect to see error on screen/logs
    }

    if (!session) {
        console.error('[PracticeSessionPage] Session not found (Possible RLS issue)')
        redirect('/dashboard/latihan')
    }

    if (session.status === 'completed') {
        redirect(`/dashboard/latihan/${sessionId}/result`)
    }

    // 2. Fetch Questions & Options
    // Since we don't have a direct JSON field for questions in the table (we just used it for return in the function),
    // we need to reconstruct the question set from test_answers.

    const { data: answersData, error: answersError } = await supabase
        .from('test_answers')
        .select(`
            question_id,
            option_id,
            questions (
                id,
                content,
                type,
                category,
                sub_category,
                options (
                    id,
                    content
                )
            )
        `)
        .eq('session_id', sessionId)

    if (answersError || !answersData) {
        console.error('[PracticeSessionPage] Answers Error:', answersError)
        return <div>Error loading questions</div>
    }



    // 3. Format Data for Client
    // We need to transform the joined data into a clean structure
    interface Option {
        id: string
        content: string
    }

    interface Question {
        id: string
        content: string
        type: string
        category: string
        sub_category: string
        options: Option[]
    }

    interface AnswerData {
        question_id: string
        option_id: string | null
        questions: Question | Question[] // Supabase join can return array or single object depending on query
    }

    const questions = (answersData as unknown as AnswerData[]).map((item) => {
        // Handle if joined data is array or object
        const qRaw = Array.isArray(item.questions) ? item.questions[0] : item.questions

        if (!qRaw) return null

        return {
            id: qRaw.id,
            content: qRaw.content,
            type: qRaw.type,
            category: qRaw.category,
            sub_category: qRaw.sub_category,
            options: qRaw.options || [] // Ensure array
        }
    }).filter(Boolean) as Question[]




    const initialAnswers: Record<string, string> = {}
        ; (answersData as unknown as AnswerData[]).forEach((item) => {
            if (item.option_id) {
                initialAnswers[item.question_id] = item.option_id
            }
        })

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
            endTime={endTime}
            isTryout={isTryout}
        />
    )
}
