import { NextRequest, NextResponse } from 'next/server'
import { isMissingProgressColumnError } from '@/lib/practice-session'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

interface BeaconPayload {
    currentQuestionIndex?: number
    markedQuestions?: Record<string, boolean>
}

function sanitizeMarkedQuestions(markedQuestions: BeaconPayload['markedQuestions']) {
    if (!markedQuestions || typeof markedQuestions !== 'object') {
        return {}
    }

    return Object.fromEntries(
        Object.entries(markedQuestions).map(([questionId, value]) => [questionId, Boolean(value)])
    )
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        // Beacon writes are best-effort, so stale tabs or expired sessions
        // should fail silently instead of inflating observability noise.
        return new NextResponse(null, { status: 204 })
    }

    let body: BeaconPayload

    try {
        const contentType = request.headers.get('content-type') ?? ''
        body = contentType.includes('application/json')
            ? await request.json() as BeaconPayload
            : JSON.parse(await request.text()) as BeaconPayload
    } catch {
        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const currentQuestionIndex = Number.isFinite(body.currentQuestionIndex)
        ? Math.max(0, Math.floor(body.currentQuestionIndex ?? 0))
        : 0

    const markedQuestions = sanitizeMarkedQuestions(body.markedQuestions)

    const { data, error } = await supabase
        .from('test_sessions')
        .update({
            current_question_index: currentQuestionIndex,
            marked_questions: markedQuestions,
            last_activity_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .eq('status', 'in_progress')
        .select('id')
        .maybeSingle()

    if (error) {
        if (isMissingProgressColumnError(error)) {
            const { data: fallbackSession, error: fallbackError } = await supabase
                .from('test_sessions')
                .select('id')
                .eq('id', id)
                .eq('user_id', user.id)
                .eq('status', 'in_progress')
                .maybeSingle()

            if (!fallbackError && fallbackSession) {
                return NextResponse.json({ success: true, degraded: true })
            }
        }

        console.error('[practice-session-beacon] Update error:', error)
        return NextResponse.json({ error: 'Failed to save progress' }, { status: 500 })
    }

    if (!data) {
        return new NextResponse(null, { status: 204 })
    }

    return NextResponse.json({ success: true })
}
