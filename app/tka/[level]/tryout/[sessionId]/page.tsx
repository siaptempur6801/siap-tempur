import { redirect, notFound } from 'next/navigation'
import { createV2Client } from '@/lib/utils/supabase/server'
import { logger } from '@/lib/logger'
import TkaFullExamSessionClient from '@/components/tka/TkaFullExamSessionClient'
import TkaPracticeSessionClient from '@/components/tka/TkaPracticeSessionClient'
import { practiceSessionService } from '@/src/services/practice-session.service'
import {
  tkaFullExamRpcService,
  type TkaFullExamState,
} from '@/src/services/tka-full-exam-rpc.service'
import { isTkaLevelAvailable, parseTkaLevel, tkaLevelPath } from '@/src/tka/context'

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
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user)
    redirect(`/login?returnTo=${encodeURIComponent(`${base}/tryout/${sessionId}`)}`)

  let fullExamState: TkaFullExamState | null = null
  if (isTkaLevelAvailable(level)) {
    try {
      const candidate = await tkaFullExamRpcService.getState(sessionId)
      if (candidate.sections.length > 0) fullExamState = candidate
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (!message.toLowerCase().includes('attempt not found')) {
        logger.error('[tka-session] Section engine state lookup failed', error, {
          sessionId,
          level,
        })
        throw error
      }
      // Legacy/generic TKA attempts do not use the section engine. They
      // continue through the Schema V2 practice service below.
    }
  }

  if (fullExamState) {
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('track_id')
      .eq('id', fullExamState.examId)
      .maybeSingle()
    if (examError) throw examError

    const { data: track, error: trackError } = exam?.track_id
      ? await supabase
          .from('tracks')
          .select('code, program_id')
          .eq('id', exam.track_id)
          .maybeSingle()
      : { data: null, error: null }
    if (trackError) throw trackError

    const { data: program, error: programError } = track?.program_id
      ? await supabase.from('programs').select('code').eq('id', track.program_id).maybeSingle()
      : { data: null, error: null }
    if (programError) throw programError
    if (program?.code?.toUpperCase() !== 'TKA' || track?.code?.toUpperCase() !== level)
      redirect(base)

    if (fullExamState.status === 'completed') {
      redirect(`${base}/tryout/${sessionId}/result`)
    }
    if (!fullExamState.activeSectionId || fullExamState.questions.length === 0) {
      redirect(base)
    }
    return <TkaFullExamSessionClient level={level} state={fullExamState} />
  }

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
