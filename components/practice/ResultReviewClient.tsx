'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import ReviewSidebar from './review/ReviewSidebar'
import ReviewHeader from './review/ReviewHeader'
import ReviewContent from './review/ReviewContent'
import type { Answer, Question, Option } from './review/types'

interface Props {
  answers: Answer[]
}

export default function ResultReviewClient({ answers }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showNav, setShowNav] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)')
    const syncDesktopNav = () => setShowNav(mediaQuery.matches)

    syncDesktopNav()
    mediaQuery.addEventListener('change', syncDesktopNav)
    return () => mediaQuery.removeEventListener('change', syncDesktopNav)
  }, [])

  const sortedAnswers = useMemo(() => answers, [answers])
  const currentAnswer = sortedAnswers[currentIndex]

  if (!currentAnswer) {
    return (
      <div className="st-flat-card p-6 text-center text-sm font-semibold text-slate-500">
        Pembahasan belum tersedia untuk sesi ini.
      </div>
    )
  }

  const question = Array.isArray(currentAnswer.questions)
    ? currentAnswer.questions[0]
    : currentAnswer.questions
  const options = question.options || []
  const maxScoreOption =
    options.length > 0
      ? options.reduce(
          (previous: Option, current: Option) =>
            previous.score_value > current.score_value ? previous : current,
          options[0],
        )
      : ({} as Option)

  const getReviewStatus = (answer: Answer, currentQuestion: Question) => {
    if (currentQuestion.type === 'TKP') {
      const score = answer.selected_option?.score_value || 0
      if (score === 5) return 'perfect' as const
      if (score >= 3) return 'good' as const
      return 'bad' as const
    }

    return answer.selected_option?.is_correct ? ('correct' as const) : ('wrong' as const)
  }

  const status = getReviewStatus(currentAnswer, question)

  return (
    <div className="flex flex-col gap-4 font-body lg:min-h-[680px] lg:flex-row">
      <div className="flex min-h-[520px] min-w-0 flex-1 flex-col overflow-hidden border-2 border-slate-900 bg-white lg:min-h-[680px]">
        <ReviewHeader
          currentIndex={currentIndex}
          question={question}
          currentAnswer={currentAnswer}
          status={status}
          showNav={showNav}
          setShowNav={setShowNav}
        />

        <div className="min-h-0 flex-1 overflow-hidden">
          <ReviewContent
            question={question}
            currentAnswer={currentAnswer}
            maxScoreOption={maxScoreOption}
          />
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 p-3 sm:p-4">
          <button
            type="button"
            onClick={() => setCurrentIndex((previous) => Math.max(0, previous - 1))}
            disabled={currentIndex === 0}
            className="st-button st-focus flex min-h-11 items-center gap-2 bg-white px-3 py-2 text-sm text-slate-900 disabled:cursor-not-allowed disabled:opacity-35"
          >
            <ChevronLeft size={18} />
            <span className="hidden sm:inline">Sebelumnya</span>
          </button>

          <p className="text-xs font-bold text-slate-500">
            {currentIndex + 1} dari {answers.length}
          </p>

          <button
            type="button"
            onClick={() =>
              setCurrentIndex((previous) => Math.min(answers.length - 1, previous + 1))
            }
            disabled={currentIndex === answers.length - 1}
            className="st-button st-focus flex min-h-11 items-center gap-2 bg-slate-900 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-35"
          >
            <span className="hidden sm:inline">Berikutnya</span>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <ReviewSidebar
        showNav={showNav}
        setShowNav={setShowNav}
        sortedAnswers={sortedAnswers}
        currentIndex={currentIndex}
        setCurrentIndex={setCurrentIndex}
        getReviewStatus={getReviewStatus}
      />
    </div>
  )
}
