import { NextRequest, NextResponse } from 'next/server'
import { isMissingProgressColumnError } from '@/lib/practice-session'
import { createClient } from '@/lib/utils/supabase/server'
import { errorResponse, successResponse, isRateLimited, getIp } from '@/lib/api-utils'
import { beaconPayloadSchema } from '@/lib/validations/api'

export const dynamic = 'force-dynamic'

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const ip = getIp(request)
    // 60 requests per minute per IP to prevent infinite loop bugs from flooding DB
    if (isRateLimited(`beacon_${ip}`, 60, 60000)) {
        return errorResponse('rate_limit_exceeded', 'Rate limit exceeded', 429)
    }

    const { id } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        // Beacon writes are best-effort, so stale tabs or expired sessions
        // should fail silently instead of inflating observability noise.
        return new NextResponse(null, { status: 204 })
    }

    let body;

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
                return successResponse({ success: true, degraded: true })
            }
        }

        console.error('[practice-session-beacon] Update error:', error)
        return errorResponse('internal_error', 'Failed to save progress', 500)
    }

    if (!data) {
        return new NextResponse(null, { status: 204 })
    }

    return successResponse({ success: true })
}
