
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import PracticeClient from './PracticeClient'

const TRYOUT_DURATION_MS = 100 * 60 * 1000

function isMissingProgressColumnError(error: { message?: string | null; details?: string | null } | null) {
    const text = `${error?.message ?? ''} ${error?.details ?? ''}`.toLowerCase()
    return text.includes('last_activity_at') || text.includes('current_question_index')
}

function isTryoutExpired(startTime?: string | null) {
    if (!startTime) return false
    return Date.now() - new Date(startTime).getTime() >= TRYOUT_DURATION_MS
}

export default async function PracticeListingPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Fetch profile for quota
    const { data: profile } = await supabase
        .from('profiles')
        .select('tryout_quota')
        .eq('id', user.id)
        .single()

    const quota = profile?.tryout_quota ?? 0

    const activeTryoutQuery = await supabase
        .from('test_sessions')
        .select('id, start_time, current_question_index, marked_questions')
        .eq('user_id', user.id)
        .eq('mode', 'tryout')
        .eq('status', 'in_progress')
        .order('last_activity_at', { ascending: false })
        .limit(1)
        .maybeSingle()

    const fallbackTryoutQuery = activeTryoutQuery.error && isMissingProgressColumnError(activeTryoutQuery.error)
        ? await supabase
            .from('test_sessions')
            .select('id, start_time')
            .eq('user_id', user.id)
            .eq('mode', 'tryout')
            .eq('status', 'in_progress')
            .order('start_time', { ascending: false })
            .limit(1)
            .maybeSingle()
        : null

    const activeTryoutCandidate = fallbackTryoutQuery?.data ?? activeTryoutQuery.data

    if (activeTryoutCandidate?.id && isTryoutExpired(activeTryoutCandidate.start_time)) {
        await supabase.rpc('calculate_session_score', {
            session_uuid: activeTryoutCandidate.id
        })
    }

    const activeTryout =
        activeTryoutCandidate?.id && isTryoutExpired(activeTryoutCandidate.start_time)
            ? null
            : activeTryoutCandidate
    const activeResumeQuestionNumber =
        activeTryout && 'current_question_index' in activeTryout && typeof activeTryout.current_question_index === 'number'
            ? activeTryout.current_question_index + 1
            : null

    const answeredQuestions = activeTryout?.id
        ? (await supabase
            .from('test_answers')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', activeTryout.id)
            .not('option_id', 'is', null)).count ?? null
        : null

    return (
        <PracticeClient
            quota={quota}
            activeSessionId={activeTryout?.id ?? null}
            activeResumeQuestionNumber={activeResumeQuestionNumber}
            activeAnsweredQuestions={answeredQuestions}
            activeStartedAt={activeTryout?.start_time ?? null}
        />
    )
}

