'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function startPracticeSession(type: 'TWK' | 'TIU' | 'TKP' | 'ALL' = 'ALL') {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    // 1. Create Session
    const { data: session, error: createError } = await supabase
        .from('test_sessions')
        .insert({
            user_id: user.id,
            mode: 'practice',
            start_time: new Date().toISOString(),
            score_twk: 0,
            score_tiu: 0,
            score_tkp: 0,
            total_score: 0,
            is_passed: false
        })
        .select()
        .single()

    if (createError || !session) {
        console.error('Create session error:', createError)
        throw new Error('Failed to create session')
    }

    // 2. Select Random Questions (e.g., 30 questions)
    // Note: This works if we have questions in DB.
    // For demo, we assume questions exist.
    // If we filter by type, add .eq.

    let query = supabase.from('questions').select('id').limit(30)
    if (type !== 'ALL') {
        query = query.eq('type', type)
    }

    // Note: 'random' is hard in Supabase simple client without RPC or extensions sometimes.
    // Using simple limit for now. In prod, use random() RPC.
    const { data: questions } = await query

    if (!questions || questions.length === 0) {
        // Handle empty question bank
        // For server action acting as form action
        throw new Error('No questions available in database')
    }

    // 3. Insert Test Answers (Slots)
    const answerSlots = questions.map(q => ({
        session_id: session.id,
        question_id: q.id,
        option_id: null // Unanswered
    }))

    const { error: slotError } = await supabase
        .from('test_answers')
        .insert(answerSlots)

    if (slotError) {
        console.error('Slot creation error:', slotError)
        // Cleanup session?
        throw new Error('Failed to prepare session')
    }

    redirect(`/exam/${session.id}`)
}
