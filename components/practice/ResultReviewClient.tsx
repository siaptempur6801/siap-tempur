'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import PaperBackground from '@/components/PaperBackground'
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

    const sortedAnswers = useMemo(() => {
        return answers
    }, [answers])

    const currentAnswer = sortedAnswers[currentIndex]

    if (!currentAnswer) return <div>Data tidak tersedia</div>

    const question = Array.isArray(currentAnswer.questions) ? currentAnswer.questions[0] : currentAnswer.questions
    const options = question.options || []
    
    // Default fallback if reduce fails
    const maxScoreOption = options.length > 0 
        ? options.reduce((prev: Option, current: Option) => (prev.score_value > current.score_value) ? prev : current, options[0])
        : ({} as Option)

    const getReviewStatus = (ans: Answer, q: Question) => {
        if (q.type === 'TKP') {
            const score = ans.selected_option?.score_value || 0
            if (score === 5) return 'perfect'
            if (score >= 3) return 'good'
            return 'bad'
        } else {
            return ans.selected_option?.is_correct ? 'correct' : 'wrong'
        }
    }

    const status = getReviewStatus(currentAnswer, question)

    return (
        <div className="flex flex-col gap-6 min-h-[500px] font-handwriting">
            <div className="flex-1 flex flex-col bg-white border-2 border-gray-900 rounded-xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden relative min-h-[500px]">
                <PaperBackground />
                
                <ReviewHeader 
                    currentIndex={currentIndex}
                    question={question}
                    currentAnswer={currentAnswer}
                    status={status}
                    showNav={showNav}
                    setShowNav={setShowNav}
                />

                <div className="flex-1 relative z-10 overflow-hidden">
                    <div className="flex h-full flex-col lg:flex-row">
                        <ReviewContent 
                            question={question}
                            currentAnswer={currentAnswer}
                            maxScoreOption={maxScoreOption}
                        />

                        <ReviewSidebar 
                            showNav={showNav}
                            setShowNav={setShowNav}
                            sortedAnswers={sortedAnswers}
                            currentIndex={currentIndex}
                            setCurrentIndex={setCurrentIndex}
                            getReviewStatus={getReviewStatus}
                        />
                    </div>
                </div>

                {/* Footer Nav */}
                <div className="p-4 sm:p-6 border-t-2 border-dashed border-gray-300 flex justify-between items-center bg-yellow-50/30 relative z-10">
                    <button
                        onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                        disabled={currentIndex === 0}
                        className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg border-2 border-gray-900 font-bold bg-white hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-px active:translate-y-px active:shadow-none"
                    >
                        <ChevronLeft size={24} />
                        <span className="hidden sm:inline">Sebelumnya</span>
                    </button>

                    <button
                        onClick={() => setCurrentIndex(prev => Math.min(answers.length - 1, prev + 1))}
                        disabled={currentIndex === answers.length - 1}
                        className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg border-2 border-gray-900 font-bold bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] active:translate-x-px active:translate-y-px active:shadow-none"
                    >
                        <span className="hidden sm:inline">Selanjutnya</span>
                        <ChevronRight size={24} />
                    </button>
                </div>
            </div>
        </div>
    )
}
