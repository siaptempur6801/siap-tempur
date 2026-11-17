'use client'

import UniversalPracticeSessionClient from '@/components/practice/UniversalPracticeSessionClient'
import type { PracticeQuestionView } from '@/src/services/practice-session.service'
import type { TkaLevel } from '@/src/tka/context'

export default function TkaPracticeSessionClient({
    level,
    sessionId,
    questions,
    initialAnswers,
    initialAnswerOptions,
    initialCurrentIndex,
    initialMarked,
    endTime,
}: {
    level: TkaLevel
    sessionId: string
    questions: PracticeQuestionView[]
    initialAnswers: Record<string, string>
    initialAnswerOptions: Record<string, string[]>
    initialCurrentIndex: number
    initialMarked: Record<string, boolean>
    endTime?: string
}) {
    const base = `/tka/${level.toLowerCase()}`
    return (
        <UniversalPracticeSessionClient
            sessionId={sessionId}
            questions={questions}
            initialAnswers={initialAnswers}
            initialAnswerOptions={initialAnswerOptions}
            initialCurrentIndex={initialCurrentIndex}
            initialMarked={initialMarked}
            endTime={endTime}
            returnPath={base}
            resultPath={(attemptId) => `${base}/tryout/${attemptId}/result?completed=1`}
        />
    )
}
