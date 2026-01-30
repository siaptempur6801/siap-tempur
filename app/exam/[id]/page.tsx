import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ExamInterface from '@/components/exam/ExamInterface'

export default async function ExamPage({ params }: { params: { id: string } }) {
    const supabase = await createClient()
    const sessionId = params.id

    // 1. Fetch Session
    const { data: session, error: sessionError } = await supabase
        .from('test_sessions')
        .select('*')
        .eq('id', sessionId)
        .single()

    if (sessionError || !session) {
        redirect('/dashboard?error=Session not found')
    }

    if (session.status === 'completed') {
        redirect(`/dashboard/result/${sessionId}`)
    }

    // 2. Fetch Questions & Options
    // We assume test_answers are pre-filled (even with null option) to define the question set.
    // This is the "Question Instance" approach.
    const { data: answerSlots, error: answersError } = await supabase
        .from('test_answers')
        .select(`
        question_id,
        option_id,
        questions (
            id,
            content,
            type,
            options (
                id,
                content
            )
        )
    `)
        .eq('session_id', sessionId)
    // .order('created_at', { ascending: true }) // If we stored order

    if (answersError || !answerSlots || answerSlots.length === 0) {
        // Fallback: If no slots, checking if it's a tryout or practice to generation
        // For now, redirect with error
        redirect('/dashboard?error=No questions found for this session')
    }

    // Transform data for Client Component
    const questions = answerSlots.map((slot: any) => ({
        id: slot.questions.id,
        content: slot.questions.content,
        type: slot.questions.type,
        options: slot.questions.options
    }))

    const initialAnswers: Record<string, string> = {}
    answerSlots.forEach((slot: any) => {
        if (slot.option_id) {
            initialAnswers[slot.question_id] = slot.option_id
        }
    })

    // Calculate End Time
    // If end_time is stored in session, use it.
    // Else calculate based on start_time + duration (which we might need to fetch from metadata or tryout)
    // For now assuming session has effective deadline or we default to 100 minutes
    const endTime = session.end_time || new Date(new Date(session.start_time).getTime() + 100 * 60 * 1000).toISOString()

    return (
        <ExamInterface
            sessionId={sessionId}
            questions={questions}
            initialAnswers={initialAnswers}
            endTime={endTime}
        />
    )
}
