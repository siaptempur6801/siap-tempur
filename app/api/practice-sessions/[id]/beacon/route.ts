import { NextRequest, NextResponse } from 'next/server'
import { createV2Client, createV2AdminClient } from '@/lib/utils/supabase/server'
import { errorResponse, successResponse, checkRateLimit, getIp } from '@/lib/api-utils'
import { beaconPayloadSchema } from '@/lib/validations/api'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

type AttemptQuestionRow = {
    id: string
    question_id: string
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const ip = getIp(request)
    if (await checkRateLimit(`beacon_${ip}`, 60, 60000)) {
        return errorResponse('rate_limit_exceeded', 'Rate limit exceeded', 429)
    }

    const { id } = await params
    const supabase = await createV2Client()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return new NextResponse(null, { status: 204 })
    }

    let body: unknown
    try {
        const contentType = request.headers.get('content-type') ?? ''
        body = contentType.includes('application/json')
            ? await request.json()
            : JSON.parse(await request.text())
    } catch {
        return errorResponse('invalid_json', 'Invalid JSON payload', 400)
    }

    const parsed = beaconPayloadSchema.safeParse(body)
    if (!parsed.success) {
        return errorResponse('validation_error', 'Invalid payload format', 400, parsed.error.issues)
    }

    const { currentQuestionIndex = 0, markedQuestions = {} } = parsed.data
    const admin = await createV2AdminClient()

    const { data: attempt, error: attemptError } = await admin
        .from('exam_attempts')
        .select('id')
        .eq('id', id)
        .eq('user_id', user.id)
        .in('status', ['in_progress', 'IN_PROGRESS', 'created', 'CREATED'])
        .maybeSingle()

    if (attemptError) {
        logger.warn('[practice-session-beacon:v2] Attempt lookup error', { error: attemptError, attemptId: id })
        return errorResponse('internal_error', 'Failed to save progress', 500)
    }
    if (!attempt) return new NextResponse(null, { status: 204 })

    const now = new Date().toISOString()
    const { error: progressError } = await admin
        .from('exam_attempts')
        .update({
            last_question_position: currentQuestionIndex + 1,
            last_saved_at: now,
            updated_at: now,
        })
        .eq('id', id)
        .eq('user_id', user.id)

    if (progressError) {
        logger.warn('[practice-session-beacon:v2] Attempt update error', { error: progressError, attemptId: id })
        return errorResponse('internal_error', 'Failed to save progress', 500)
    }

    const { data: rawQuestions, error: questionError } = await admin
        .from('attempt_questions')
        .select('id, question_id')
        .eq('attempt_id', id)

    if (questionError) {
        logger.warn('[practice-session-beacon:v2] Question lookup error', { error: questionError, attemptId: id })
        return errorResponse('internal_error', 'Failed to save marked questions', 500)
    }

    const questions = (rawQuestions ?? []) as AttemptQuestionRow[]
    if (questions.length > 0) {
        const { error: markError } = await admin
            .from('attempt_answers')
            .upsert(questions.map((question) => ({
                attempt_question_id: question.id,
                is_flagged: Boolean(markedQuestions[question.question_id]),
                updated_at: now,
            })), { onConflict: 'attempt_question_id' })

        if (markError) {
            logger.warn('[practice-session-beacon:v2] Flag update error', { error: markError, attemptId: id })
            return errorResponse('internal_error', 'Failed to save marked questions', 500)
        }
    }

    return successResponse({ success: true })
}
