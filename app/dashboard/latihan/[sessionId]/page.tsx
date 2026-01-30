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
    const questions = answersData.map((item: any) => {
        // Handle if joined data is array or object
        const qRaw = Array.isArray(item.questions) ? item.questions[0] : item.questions

        if (!qRaw) return null

        return {
            id: qRaw.id,
            content: qRaw.content,
            type: qRaw.type,
            category: qRaw.category,
            options: qRaw.options || [] // Ensure array
        }
    }).filter(Boolean) as any[]




    const initialAnswers: Record<string, string> = {}
    answersData.forEach((item: any) => {
        if (item.option_id) {
            initialAnswers[item.question_id] = item.option_id
        }
    })

    // Check if this is a tryout session (has all three types)
    const questionTypes = new Set(questions.map((q: any) => q.type))
    const isTryout = questionTypes.has('TWK') && questionTypes.has('TIU') && questionTypes.has('TKP')

    // Calculate end time for tryout (100 minutes from start)
    let endTime: string | undefined
    if (isTryout && session.start_time) {
        const endTimeMs = Date.now() + (100 * 60 * 1000) // 30 detik
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
