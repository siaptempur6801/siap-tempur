import { notFound, redirect } from 'next/navigation'
import { logger } from '@/lib/logger'
import { createV2Client } from '@/lib/utils/supabase/server'
import { practiceResultService, type PracticeResultView } from '@/src/services/practice-result.service'
import { tkaFullExamRpcService, type TkaFullExamState } from '@/src/services/tka-full-exam-rpc.service'
import { isTkaLevelAvailable, parseTkaLevel, tkaLevelPath } from '@/src/tka/context'
import TkaInteractiveReviewClient from '@/components/tka/TkaInteractiveReviewClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function TkaReviewPage({
    params,
}: {
    params: Promise<{ level: string; sessionId: string }>
}) {
    const { level: rawLevel, sessionId } = await params
    const level = parseTkaLevel(rawLevel)
    if (!level) notFound()

    const base = tkaLevelPath(level)
    const supabase = await createV2Client()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) redirect(`/login?returnTo=${encodeURIComponent(`${base}/tryout/${sessionId}/review`)}`)

    let result: PracticeResultView | null = null
    let fullExamState: TkaFullExamState | null = null

    if (isTkaLevelAvailable(level)) {
        try {
            const candidate = await tkaFullExamRpcService.getState(sessionId)
            if (candidate.sections.length > 0) fullExamState = candidate
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            if (!message.toLowerCase().includes('attempt not found')) {
                logger.error('[tka-review] Section engine result lookup failed', error, { sessionId, level })
                throw error
            }
        }
    }

    if (fullExamState) {
        if (fullExamState.status !== 'completed') {
            redirect(`${base}/tryout/${sessionId}`)
        }
        result = await tkaFullExamRpcService.getResultView(sessionId)
    }

    if (!result) result = await practiceResultService.getResult(user.id, sessionId)
    if (!result) redirect(base)
    if (result.programCode.toUpperCase() !== 'TKA' || result.trackCode.toUpperCase() !== level) redirect(base)
    if (!['completed', 'COMPLETED', 'submitted', 'SUBMITTED'].includes(result.status)) {
        redirect(`${base}/tryout/${sessionId}`)
    }

    return (
        <TkaInteractiveReviewClient
            level={level}
            attemptId={sessionId}
            practiceKind={result.practiceKind}
            backUrl={`${base}/tryout/${sessionId}/result`}
            items={result.reviewItems}
        />
    )
}
