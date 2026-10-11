import { createV2Client } from '@/lib/utils/supabase/server'
import { redirect } from 'next/navigation'
import PracticeSessionClient from '@/components/practice/PracticeSessionClient'
import { logger } from '@/lib/logger'
import { practiceSessionService } from '@/src/services/practice-session.service'

export default async function PracticeSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>
}) {
  const { sessionId } = await params
  const supabase = await createV2Client()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user)
    redirect(`/login?returnTo=${encodeURIComponent(`/cpns/dashboard/tryout/${sessionId}`)}`)

  const session = await practiceSessionService.getSessionView(user.id, sessionId).catch((error) => {
    logger.warn('[PracticeSessionPage:v2] Failed to load attempt', {
      attemptId: sessionId,
      userId: user.id,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  })

  if (!session) {
    logger.warn('[PracticeSessionPage:v2] Attempt not found', {
      attemptId: sessionId,
      userId: user.id,
    })
    redirect('/cpns/dashboard/tryout')
  }

  if (['completed', 'COMPLETED', 'submitted', 'SUBMITTED'].includes(session.status)) {
    redirect(`/cpns/dashboard/tryout/${sessionId}/result`)
  }

  if (session.questions.length === 0) {
    logger.warn('[PracticeSessionPage:v2] Attempt has no questions', {
      attemptId: sessionId,
      userId: user.id,
    })
    redirect('/cpns/dashboard/tryout')
  }

  return (
    <PracticeSessionClient
      sessionId={session.attemptId}
      questions={session.questions}
      initialAnswers={session.initialAnswers}
      initialCurrentIndex={session.initialCurrentIndex}
      initialMarked={session.initialMarked}
      endTime={session.endTime}
      isTryout={session.isTryout}
      returnTo={session.returnTo}
    />
  )
}
