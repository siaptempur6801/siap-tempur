'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, AlertCircle, Map, Sparkles } from 'lucide-react'
import PaperBackground from '@/components/PaperBackground'
import { cn } from '@/lib/utils'

interface Answer {
    id: string
    question_id: string
    option_id: string
    questions: {
        id: string
        content: string
        explanation: string
        type: string
        category: string
        options: {
            id: string
            content: string
            is_correct: boolean
            score_value: number
        }[]
    } | {
        id: string
        content: string
        explanation: string
        type: string
        category: string
        options: {
            id: string
            content: string
            is_correct: boolean
            score_value: number
        }[]
    }[] | {
        id: string
        content: string
        explanation: string
        type: string
        category: string
        options: {
            id: string
            content: string
            is_correct: boolean
            score_value: number
        }[]
    }[]
    selected_option: {
        id: string
        content: string
        is_correct: boolean
        score_value: number
    } | null
}

interface Props {
    answers: Answer[]
}

export default function ResultReviewClient({ answers }: Props) {
    const [currentIndex, setCurrentIndex] = useState(0)

    // Sort answers by question type (TWK -> TIU -> TKP)
    const sortedAnswers = useMemo(() => {
        const typeOrder = { 'TWK': 1, 'TIU': 2, 'TKP': 3 }
        return [...answers].sort((a, b) => {
            const qA = Array.isArray(a.questions) ? a.questions[0] : a.questions
            const qB = Array.isArray(b.questions) ? b.questions[0] : b.questions
            return (typeOrder[qA.type as keyof typeof typeOrder] || 99) - (typeOrder[qB.type as keyof typeof typeOrder] || 99)
        })
    }, [answers])

    const currentAnswer = sortedAnswers[currentIndex]

    // Safety check
    if (!currentAnswer) return <div>Data tidak tersedia</div>

    const question = Array.isArray(currentAnswer.questions) ? currentAnswer.questions[0] : currentAnswer.questions
    const type = question.type

    // Helper to determine status
    const getReviewStatus = (ans: Answer, q: any) => {
        if (q.type === 'TKP') {
            const score = ans.selected_option?.score_value || 0
            if (score === 5) return 'perfect'
            if (score >= 3) return 'good'
            return 'bad' // Implicitly handles 'bad'
        } else {
            return ans.selected_option?.is_correct ? 'correct' : 'wrong'
        }
    }

    const status = getReviewStatus(currentAnswer, question)
    const options = question.options || []

    // Sort options to match original display order (usually random, but for review maybe consistent?)
    // In practice mode we randomized them. Here they come from DB join. 
    // They might be in ID order or insertion order. That's fine for review.


    const maxScoreOption = options.reduce((prev: any, current: any) => (prev.score_value > current.score_value) ? prev : current, options[0])

    return (
        <div className="flex flex-col gap-8 min-h-[500px] font-handwriting">

            {/* TOP: Navigation Panel */}
            <div className="w-full flex flex-col bg-[#fff9c4] border-2 border-gray-900 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
                <PaperBackground />
                <div className="p-4 border-b-2 border-dashed border-gray-300 font-bold text-xl flex items-center justify-between bg-white/30 relative z-10">
                    <div className="flex items-center gap-2">
                        <Map size={20} />
                        <span>Daftar Pembahasan</span>
                    </div>
                    {/* Legend Compact */}
                    <div className="flex items-center gap-6 text-sm text-gray-700 hidden lg:flex">
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500 border border-green-700"></div><span>Benar / Tinggi</span></div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500 border border-red-700"></div><span>Salah / Rendah</span></div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500 border border-blue-700"></div><span>Sedang</span></div>
                    </div>
                </div>

                <div className="p-6 relative z-10">
                    <div className="flex flex-col gap-6">
                        {/* Group questions by type */}
                        {['TWK', 'TIU', 'TKP'].map((questionType) => {
                            const filteredAnswers = sortedAnswers
                                .map((ans, idx) => ({ ans, idx }))
                                .filter(({ ans }) => {
                                    const q = Array.isArray(ans.questions) ? ans.questions[0] : ans.questions
                                    return q.type === questionType
                                })

                            if (filteredAnswers.length === 0) return null

                            // Calculate offset for display numbering dynamically
                            // Based on cumulative count of previous question types
                            let numberOffset = 0
                            if (questionType === 'TIU') {
                                // TIU starts after all TWK questions
                                numberOffset = sortedAnswers.filter(a => {
                                    const q = Array.isArray(a.questions) ? a.questions[0] : a.questions
                                    return q.type === 'TWK'
                                }).length
                            } else if (questionType === 'TKP') {
                                // TKP starts after all TWK + TIU questions
                                numberOffset = sortedAnswers.filter(a => {
                                    const q = Array.isArray(a.questions) ? a.questions[0] : a.questions
                                    return q.type === 'TWK' || q.type === 'TIU'
                                }).length
                            }

                            return (
                                <div key={questionType}>
                                    {/* Section Header */}
                                    <div className="text-sm font-bold text-gray-800 mb-3 px-1 uppercase tracking-widest border-s-4 border-gray-900 ps-3">
                                        {questionType}
                                    </div>
                                    {/* Question Buttons */}
                                    <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2.5">
                                        {filteredAnswers.map(({ ans, idx }, positionInGroup) => {
                                            const q = Array.isArray(ans.questions) ? ans.questions[0] : ans.questions
                                            const s = getReviewStatus(ans, q)
                                            const displayNumber = positionInGroup + 1 + numberOffset

                                            let colorClass = 'bg-white text-gray-400 border-gray-300'
                                            if (q.type === 'TKP') {
                                                if (s === 'perfect') colorClass = 'bg-green-500 text-white border-green-700'
                                                else if (s === 'good') colorClass = 'bg-blue-500 text-white border-blue-700'
                                                else colorClass = 'bg-orange-500 text-white border-orange-700'
                                            } else {
                                                if (s === 'correct') colorClass = 'bg-green-500 text-white border-green-700'
                                                else colorClass = 'bg-red-500 text-white border-red-700'
                                            }

                                            return (
                                                <button
                                                    key={ans.id}
                                                    onClick={() => setCurrentIndex(idx)}
                                                    className={cn(
                                                        "aspect-square rounded-lg font-bold text-lg flex items-center justify-center transition-all border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
                                                        currentIndex === idx ? 'ring-2 ring-blue-400 ring-offset-2 scale-110 z-10 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' : 'hover:scale-105',
                                                        colorClass
                                                    )}
                                                >
                                                    {displayNumber}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* BOTTOM: Question Review Area */}
            <div className="flex-1 flex flex-col bg-white border-2 border-gray-900 rounded-xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden relative min-h-[500px]">
                <PaperBackground />
                {/* Header */}
                <div className="p-3 sm:p-5 border-b-2 border-dashed border-gray-300 flex flex-col sm:flex-row sm:justify-between sm:items-center bg-yellow-50/50 gap-3 relative z-10">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                            <h2 className="font-bold text-xl sm:text-2xl text-gray-900 leading-tight">
                                Pembahasan <span className="font-sans">#{currentIndex + 1}</span>
                            </h2>
                            <div className="flex gap-1.5 flex-wrap">
                                <span className="px-2 py-0.5 bg-gray-900 text-white text-[10px] sm:text-xs font-bold rounded-full rotate-2">
                                    {question.type}
                                </span>
                                {question.category && (
                                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border-2 border-blue-200 text-[10px] sm:text-xs font-bold rounded-lg -rotate-1 shadow-sm">
                                        {question.category}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Score Badge - Integrated */}
                    <div className="self-start sm:self-center px-3 py-1 bg-white border-2 border-gray-900 rounded-full text-sm sm:text-lg font-bold flex items-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        {type === 'TKP' ? (
                            <span className={cn(
                                "flex items-center gap-1.5",
                                status === 'perfect' ? 'text-green-600' : status === 'good' ? 'text-blue-600' : 'text-orange-600'
                            )}>
                                <Sparkles size={14} className="sm:w-[18px] sm:h-[18px]" /> +<span className="font-sans">{currentAnswer.selected_option?.score_value || 0}</span> Poin
                            </span>
                        ) : (
                            status === 'correct' ? (
                                <span className="flex items-center gap-1.5 text-green-600 font-bold"><CheckCircle2 size={16} className="sm:w-[18px] sm:h-[18px]" /> Benar</span>
                            ) : (
                                <span className="flex items-center gap-1.5 text-red-600 font-bold"><XCircle size={16} className="sm:w-[18px] sm:h-[18px]" /> Salah</span>
                            )
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 p-4 sm:p-10 relative z-10">
                    <div className="relative mb-6 sm:mb-10">
                        <div className="absolute -left-4 sm:-left-6 top-1 w-1 sm:h-full bg-blue-400 rounded-full opacity-50"></div>
                        <p className="text-lg sm:text-2xl font-bold leading-relaxed text-gray-800 max-w-4xl">{question.content}</p>
                    </div>

                    <div className="space-y-3 sm:space-y-4 mb-8 sm:mb-10 max-w-4xl">
                        {options.map((option: any, i: number) => {
                            const isSelected = currentAnswer.option_id === option.id
                            const isCorrect = option.is_correct
                            const isMaxTKP = type === 'TKP' && option.id === maxScoreOption.id

                            // Styling Logic
                            let borderClass = 'border-gray-200'
                            let bgClass = 'bg-white hover:bg-gray-50'
                            let textClass = 'text-gray-500'
                            let indicatorColor = 'border-gray-300 text-gray-300'

                            if (type === 'TKP') {
                                if (isSelected) {
                                    borderClass = 'border-blue-600 border-solid'
                                    bgClass = 'bg-blue-50 shadow-[2px_2px_0px_0px_rgba(37,99,235,1)]'
                                    textClass = 'text-blue-900 font-bold'
                                    indicatorColor = 'border-blue-600 bg-blue-600 text-white'
                                }
                                if (isMaxTKP && !isSelected) {
                                    borderClass = 'border-green-500 border-dashed opacity-80'
                                    bgClass = 'bg-green-50/50'
                                }
                            } else {
                                // TWK / TIU
                                if (isSelected && isCorrect) {
                                    borderClass = 'border-green-600'
                                    bgClass = 'bg-green-50 shadow-[2px_2px_0px_0px_rgba(22,163,74,1)]'
                                    textClass = 'text-green-900 font-bold'
                                    indicatorColor = 'border-green-600 bg-green-600 text-white'
                                } else if (isSelected && !isCorrect) {
                                    borderClass = 'border-red-600'
                                    bgClass = 'bg-red-50 shadow-[2px_2px_0px_0px_rgba(220,38,38,1)]'
                                    textClass = 'text-red-900 font-bold'
                                    indicatorColor = 'border-red-600 bg-red-600 text-white'
                                } else if (!isSelected && isCorrect) {
                                    borderClass = 'border-green-600 border-dashed'
                                    bgClass = 'bg-green-50/50'
                                    textClass = 'text-green-700 font-bold'
                                    indicatorColor = 'border-green-600 bg-white text-green-600'
                                }
                            }

                            return (
                                <div key={option.id} className={cn(
                                    "p-5 rounded-xl border-2 flex items-start gap-4 transition-all relative overflow-hidden group",
                                    borderClass,
                                    bgClass
                                )}>
                                    {/* Indicator Circle */}
                                    <div className={cn(
                                        "w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 font-bold text-lg",
                                        indicatorColor
                                    )}>
                                        {String.fromCharCode(65 + i)}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className={cn("text-base sm:text-xl leading-relaxed break-words", textClass)}>
                                            {option.content}
                                        </div>

                                        {/* Status Labels */}
                                        <div className="flex gap-2 mt-2 flex-wrap">
                                            {isSelected && <span className="text-[9px] sm:text-[10px] uppercase font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded bg-gray-900 text-white shadow-sm">Pilihan Anda</span>}
                                            {type !== 'TKP' && isCorrect && <span className="text-[9px] sm:text-[10px] uppercase font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded border-2 border-green-600 bg-white text-green-700 shadow-sm">Kunci</span>}
                                            {type === 'TKP' && option.score_value > 0 && (
                                                <span className={cn(
                                                    "text-[9px] sm:text-[10px] uppercase font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded border-2 shadow-sm",
                                                    option.score_value === 5 ? "bg-green-500 text-white border-green-700" : "bg-blue-50 text-blue-700 border-blue-200"
                                                )}>
                                                    Poin: {option.score_value}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Explanation */}
                    {question.explanation && (
                        <div className="relative group max-w-4xl">
                            {/* Tape effect */}
                            <div className="absolute -top-3 left-10 w-24 h-7 bg-yellow-200/50 border border-white/40 shadow-sm rotate-2 z-20"></div>

                            <div className="bg-[#fff740] border-2 border-gray-900 p-5 sm:p-8 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
                                <PaperBackground />
                                <div className="flex items-center gap-3 font-bold text-gray-900 mb-3 sm:mb-4 text-xl sm:text-2xl relative z-10">
                                    <AlertCircle size={20} className="text-orange-600 fill-yellow-100 sm:w-6 sm:h-6" />
                                    <span>Mengapa Begitu?</span>
                                </div>
                                <div className="text-base sm:text-xl text-gray-800 leading-relaxed relative z-10 font-medium italic">
                                    {question.explanation}
                                </div>
                                <div className="absolute bottom-2 right-3 opacity-20 relative z-10">
                                    <Sparkles size={40} className="text-gray-900" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Nav */}
                <div className="p-4 sm:p-6 border-t-2 border-dashed border-gray-300 flex justify-between items-center bg-yellow-50/30 relative z-10">
                    <button
                        onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                        disabled={currentIndex === 0}
                        className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg border-2 border-gray-900 font-bold bg-white hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                    >
                        <ChevronLeft size={24} />
                        <span className="hidden sm:inline">Sebelumnya</span>
                    </button>

                    <button
                        onClick={() => setCurrentIndex(prev => Math.min(answers.length - 1, prev + 1))}
                        disabled={currentIndex === answers.length - 1}
                        className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg border-2 border-gray-900 font-bold bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                    >
                        <span className="hidden sm:inline">Selanjutnya</span>
                        <ChevronRight size={24} />
                    </button>
                </div>
            </div>
        </div>
    )
}
