import { AnimatePresence, motion } from 'framer-motion'
import { List, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SUBJECTS } from '@/lib/constants'
import type { Answer, Question } from './types'

interface ReviewSidebarProps {
  showNav: boolean
  setShowNav: (show: boolean) => void
  sortedAnswers: Answer[]
  currentIndex: number
  setCurrentIndex: (index: number) => void
  getReviewStatus: (ans: Answer, q: Question) => 'perfect' | 'good' | 'bad' | 'correct' | 'wrong'
}

export default function ReviewSidebar({
  showNav,
  setShowNav,
  sortedAnswers,
  currentIndex,
  setCurrentIndex,
  getReviewStatus,
}: ReviewSidebarProps) {
  const renderNavigationButtons = (onItemClick?: () => void) => {
    return [SUBJECTS.TWK.short, SUBJECTS.TIU.short, SUBJECTS.TKP.short].map((questionType) => {
      const filteredAnswers = sortedAnswers
        .map((answer, index) => ({ answer, index }))
        .filter(({ answer }) => {
          const question = Array.isArray(answer.questions) ? answer.questions[0] : answer.questions
          return question.type === questionType
        })

      if (filteredAnswers.length === 0) return null

      let numberOffset = 0
      if (questionType === SUBJECTS.TIU.short) {
        numberOffset = sortedAnswers.filter((answer) => {
          const question = Array.isArray(answer.questions) ? answer.questions[0] : answer.questions
          return question.type === SUBJECTS.TWK.short
        }).length
      } else if (questionType === SUBJECTS.TKP.short) {
        numberOffset = sortedAnswers.filter((answer) => {
          const question = Array.isArray(answer.questions) ? answer.questions[0] : answer.questions
          return question.type === SUBJECTS.TWK.short || question.type === SUBJECTS.TIU.short
        }).length
      }

      return (
        <div key={questionType}>
          <div className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-slate-600">
            {questionType}
          </div>
          <div className="grid grid-cols-5 gap-1.5 2xl:grid-cols-6">
            {filteredAnswers.map(({ answer, index }, positionInGroup) => {
              const question = Array.isArray(answer.questions)
                ? answer.questions[0]
                : answer.questions
              const status = getReviewStatus(answer, question)
              const displayNumber = positionInGroup + 1 + numberOffset

              let colorClass = 'border-slate-300 bg-white text-slate-500'
              if (question.type === 'TKP') {
                if (status === 'perfect')
                  colorClass = 'border-emerald-600 bg-emerald-600 text-white'
                else if (status === 'good') colorClass = 'border-blue-600 bg-blue-600 text-white'
                else colorClass = 'border-amber-600 bg-amber-500 text-white'
              } else {
                colorClass =
                  status === 'correct'
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-red-600 bg-red-600 text-white'
              }

              return (
                <button
                  type="button"
                  key={answer.id}
                  onClick={() => {
                    setCurrentIndex(index)
                    onItemClick?.()
                  }}
                  aria-label={`Buka pembahasan soal ${displayNumber}`}
                  aria-current={currentIndex === index ? 'true' : undefined}
                  className={cn(
                    'st-focus aspect-square w-full rounded-md border text-xs font-black transition focus-visible:outline-none',
                    currentIndex === index && 'ring-2 ring-blue-500 ring-offset-2',
                    colorClass,
                  )}
                >
                  {displayNumber}
                </button>
              )
            })}
          </div>
        </div>
      )
    })
  }

  const legend = (
    <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-slate-600">
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" /> Benar/tinggi
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-red-600" /> Salah
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-blue-600" /> Poin sedang
      </span>
    </div>
  )

  return (
    <>
      <AnimatePresence initial={false}>
        {showNav && (
          <motion.aside
            initial={{ x: 32, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 32, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="hidden min-h-[680px] w-80 shrink-0 flex-col overflow-hidden border-2 border-slate-900 bg-white lg:flex 2xl:w-96"
          >
            <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-4 text-sm font-black text-slate-900">
              <List size={17} /> Daftar soal
            </div>
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
              {legend}
              {renderNavigationButtons()}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showNav && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm lg:hidden"
            onClick={() => setShowNav(false)}
          >
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.18 }}
              className="ml-auto flex h-full w-[min(86vw,320px)] flex-col border-l-2 border-slate-900 bg-white"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-black text-slate-900">
                  <List size={17} /> Daftar soal
                </div>
                <button
                  type="button"
                  onClick={() => setShowNav(false)}
                  aria-label="Tutup daftar soal"
                  className="st-focus flex h-11 w-11 items-center justify-center border border-slate-300 bg-white text-slate-700"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
                {legend}
                {renderNavigationButtons(() => setShowNav(false))}
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
