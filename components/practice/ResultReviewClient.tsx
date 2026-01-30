'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, AlertCircle, Map } from 'lucide-react'
// import { Card } from '@/components/ui/card'

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
        <div className="flex flex-col gap-6 min-h-[500px]">

            {/* TOP: Navigation Panel */}
            <div className="w-full flex flex-col bg-card border border-border rounded-xl shadow-sm">
                <div className="p-4 border-b border-border font-semibold flex items-center justify-between bg-secondary/10">
                    <div className="flex items-center gap-2">
                        <Map size={18} />
                        <span>Navigasi Hasil</span>
                    </div>
                    {/* Legend Compact */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground hidden md:flex">
                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div><span>Benar/Tinggi</span></div>
                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500"></div><span>Salah/Rendah</span></div>
                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div><span>Sedang</span></div>
                    </div>
                </div>

                <div className="p-4">
                    <div className="flex flex-col gap-4">
                        {/* Group questions by type */}
                        {['TWK', 'TIU', 'TKP'].map((questionType, typeIndex) => {
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
                                    <div className="text-xs font-semibold text-muted-foreground mb-2 px-1 uppercase tracking-wider">
                                        {questionType}
                                    </div>
                                    {/* Question Buttons */}
                                    <div className="flex flex-wrap gap-2">
                                        {filteredAnswers.map(({ ans, idx }, positionInGroup) => {
                                            const q = Array.isArray(ans.questions) ? ans.questions[0] : ans.questions
                                            const s = getReviewStatus(ans, q)
                                            const displayNumber = positionInGroup + 1 + numberOffset

                                            let colorClass = 'bg-secondary text-muted-foreground'
                                            if (q.type === 'TKP') {
                                                if (s === 'perfect') colorClass = 'bg-green-500 text-white border-green-600'
                                                else if (s === 'good') colorClass = 'bg-blue-500 text-white border-blue-600'
                                                else colorClass = 'bg-orange-500 text-white border-orange-600'
                                            } else {
                                                if (s === 'correct') colorClass = 'bg-green-500 text-white border-green-600'
                                                else colorClass = 'bg-red-500 text-white border-red-600'
                                            }

                                            return (
                                                <button
                                                    key={ans.id}
                                                    onClick={() => setCurrentIndex(idx)}
                                                    className={`
                                                        w-10 h-10 rounded-lg font-bold text-sm flex items-center justify-center transition-all border
                                                        ${currentIndex === idx ? 'ring-2 ring-primary ring-offset-2 scale-110 z-10 shadow-lg' : 'border-transparent'}
                                                        ${colorClass}
                                                    `}
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
            <div className="flex-1 flex flex-col bg-card border border-border rounded-xl shadow-sm overflow-hidden min-h-[500px]">
                {/* Header */}
                <div className="p-4 border-b border-border flex flex-wrap justify-between items-center bg-secondary/20 gap-3">
                    <div className="flex items-center gap-2">
                        <h2 className="font-bold text-lg mr-2">Soal {currentIndex + 1}</h2>
                        <span className="px-2 py-0.5 bg-secondary text-secondary-foreground text-xs font-semibold rounded border border-border">
                            {question.type}
                        </span>
                        {question.category && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 text-xs font-semibold rounded border border-blue-200 dark:border-blue-800 uppercase tracking-wider">
                                {question.category}
                            </span>
                        )}
                    </div>

                    {/* Score Badge */}
                    <div className="px-3 py-1 bg-background border rounded-full text-sm font-bold flex items-center gap-2 shadow-sm">
                        {type === 'TKP' ? (
                            <span className={`${status === 'perfect' ? 'text-green-600' : status === 'good' ? 'text-blue-500' : 'text-orange-500'}`}>
                                +{currentAnswer.selected_option?.score_value || 0} Poin
                            </span>
                        ) : (
                            status === 'correct' ? (
                                <span className="flex items-center gap-1 text-green-600"><CheckCircle2 size={16} /> Benar (+5)</span>
                            ) : (
                                <span className="flex items-center gap-1 text-red-500"><XCircle size={16} /> Salah (0)</span>
                            )
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 p-6 md:p-8">
                    <p className="text-lg md:text-xl leading-relaxed mb-8 max-w-4xl">{question.content}</p>

                    <div className="space-y-3 mb-8 max-w-3xl">
                        {options.map((option: any) => {
                            const isSelected = currentAnswer.option_id === option.id
                            const isCorrect = option.is_correct
                            const isMaxTKP = type === 'TKP' && option.id === maxScoreOption.id

                            // Styling Logic
                            let borderClass = 'border-border'
                            let bgClass = 'hover:bg-secondary/50'
                            let textClass = 'text-muted-foreground' // Default text color for non-selected
                            let indicatorColor = 'border-muted-foreground'

                            if (type === 'TKP') {
                                if (isSelected) {
                                    borderClass = 'border-blue-500'
                                    bgClass = 'bg-blue-500/10'
                                    textClass = 'text-foreground font-medium'
                                    indicatorColor = 'border-blue-500 bg-blue-500 text-white'
                                }
                                if (isMaxTKP && !isSelected) {
                                    borderClass = 'border-green-500/50'
                                    bgClass = 'bg-green-500/5'
                                }
                            } else {
                                // TWK / TIU
                                if (isSelected && isCorrect) {
                                    borderClass = 'border-green-500'
                                    bgClass = 'bg-green-500/10'
                                    textClass = 'text-green-700 dark:text-green-300 font-bold'
                                    indicatorColor = 'border-green-500 bg-green-500 text-white'
                                } else if (isSelected && !isCorrect) {
                                    borderClass = 'border-red-500'
                                    bgClass = 'bg-red-500/10'
                                    textClass = 'text-red-700 dark:text-red-300 font-bold'
                                    indicatorColor = 'border-red-500 bg-red-500 text-white'
                                } else if (!isSelected && isCorrect) {
                                    borderClass = 'border-green-500/50'
                                    bgClass = 'bg-green-500/5'
                                    textClass = 'text-green-600 dark:text-green-400 font-medium'
                                }
                            }

                            return (
                                <div key={option.id} className={`p-4 rounded-lg border-2 flex items-start gap-3 transition-colors ${borderClass} ${bgClass}`}>
                                    {/* Indicator Circle */}
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${indicatorColor}`}>
                                        {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                                    </div>

                                    <div className="flex-1">
                                        <span className={textClass}>{option.content}</span>

                                        {/* Status Labels */}
                                        <div className="flex gap-2 mt-1 flex-wrap">
                                            {isSelected && <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-black/5 dark:bg-white/10">Jawaban Anda</span>}
                                            {type !== 'TKP' && isCorrect && <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Jawaban Benar</span>}
                                            {type === 'TKP' && option.score_value > 0 && <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Nilai: {option.score_value}</span>}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Explanation */}
                    {question.explanation && (
                        <div className="bg-secondary/30 border border-border p-6 rounded-lg text-sm max-w-4xl">
                            <div className="flex items-center gap-2 font-bold text-foreground mb-3 text-lg">
                                <AlertCircle size={20} className="text-primary" /> Pembahasan
                            </div>
                            <div className="prose dark:prose-invert max-w-none text-muted-foreground leading-relaxed">
                                {question.explanation}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Nav */}
                <div className="p-4 border-t border-border flex justify-between items-center bg-background">
                    <button
                        onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                        disabled={currentIndex === 0}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-secondary disabled:opacity-50 transition"
                    >
                        <ChevronLeft size={20} />
                        Sebelumnya
                    </button>

                    <button
                        onClick={() => setCurrentIndex(prev => Math.min(answers.length - 1, prev + 1))}
                        disabled={currentIndex === answers.length - 1}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-secondary disabled:opacity-50 transition"
                    >
                        Selanjutnya
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>
        </div>
    )
}
