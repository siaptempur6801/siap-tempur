import { redirect, notFound } from 'next/navigation'
import { createV2Client } from '@/lib/utils/supabase/server'
import TkaPracticeSessionClient from '@/components/tka/TkaPracticeSessionClient'
import { practiceSessionService } from '@/src/services/practice-session.service'
import { parseTkaLevel, tkaLevelPath } from '@/src/tka/context'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function TkaPracticeSessionPage({
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
    if (authError || !user) redirect(`/login?returnTo=${encodeURIComponent(`${base}/tryout/${sessionId}`)}`)

    const session = await practiceSessionService.getSessionView(user.id, sessionId)
    if (!session) redirect(base)

    if (session.programCode.toUpperCase() !== 'TKA' || session.trackCode.toUpperCase() !== level) {
        redirect(base)
    }

    if (['completed', 'COMPLETED', 'submitted', 'SUBMITTED'].includes(session.status)) {
        redirect(`${base}/tryout/${sessionId}/result`)
    }

    if (session.questions.length === 0) redirect(base)

    return (
        <TkaPracticeSessionClient
            level={level}
            sessionId={session.attemptId}
            questions={session.questions}
            initialAnswers={session.initialAnswers}
            initialAnswerOptions={session.initialAnswerOptions}
            initialCurrentIndex={session.initialCurrentIndex}
            initialMarked={session.initialMarked}
            endTime={session.endTime}
        />
    )
}
