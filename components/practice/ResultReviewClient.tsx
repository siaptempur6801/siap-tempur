'use client'

import { useState, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, AlertCircle, Map, Sparkles, X } from 'lucide-react'
import PaperBackground from '@/components/PaperBackground'
import { cn, formatSubjectName } from '@/lib/utils'
import { SUBJECTS } from '@/lib/constants'
import MathRenderer from '@/components/MathRenderer'


interface Option {
    id: string
    content: string
    is_correct: boolean
    score_value: number
}

interface Question {
    id: string
    content: string
    explanation: string
    type: string
    category: string
    options: Option[]
}

interface Answer {
    id: string
    question_id: string
    option_id: string
    questions: Question | Question[]
    selected_option: Option | null
}

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

    // Safety check
    if (!currentAnswer) return <div>Data tidak tersedia</div>

    const question = Array.isArray(currentAnswer.questions) ? currentAnswer.questions[0] : currentAnswer.questions
    const type = question.type

    // Helper to determine status
    const getReviewStatus = (ans: Answer, q: Question) => {
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


    const maxScoreOption = options.reduce((prev: Option, current: Option) => (prev.score_value > current.score_value) ? prev : current, options[0])

    return (
        <div className="flex flex-col gap-6 min-h-[500px] font-handwriting">

            {/* TOP: Navigation Panel */}
            <div className="hidden">
                <div className="flex justify-end">
                    <button
                        onClick={() => setShowNav(prev => !prev)}
                        className={cn(
                            "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border-2 text-xs sm:text-sm font-bold transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
                            showNav
                                ? "bg-blue-50 text-blue-700 border-blue-900 hover:bg-blue-100"
                                : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50 hover:border-gray-500"
                        )}
                        title={showNav ? 'Sembunyikan navigasi pembahasan' : 'Tampilkan navigasi pembahasan'}
                    >
                        <motion.div animate={{ rotate: showNav ? 0 : 180 }}>
                            <Map size={14} />
                        </motion.div>
                        <span>{showNav ? 'Sembunyikan Navigasi' : 'Tampilkan Navigasi'}</span>
                    </button>
                </div>

                <AnimatePresence initial={false}>
                    {showNav && (
                        <motion.div
                            initial={{ height: 0, opacity: 0, y: -8 }}
                            animate={{ height: 'auto', opacity: 1, y: 0 }}
                            exit={{ height: 0, opacity: 0, y: -8 }}
                            transition={{ duration: 0.22 }}
                            className="overflow-hidden"
                        >
                            <div className="w-full flex flex-col bg-[#fff9c4] border-2 border-gray-900 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
                                <PaperBackground />
                                <div className="px-3 py-2.5 border-b-2 border-dashed border-gray-300 font-bold text-base sm:text-lg flex items-center justify-between bg-white/30 relative z-10">
                                    <div className="flex items-center gap-2">
                                        <Map size={18} />
                                        <span>Daftar Pembahasan</span>
                                    </div>
                                    {/* Legend Compact */}
                                    <div className="hidden lg:flex items-center gap-4 text-xs text-gray-700">
                                        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-green-500 border border-green-700"></div><span>Benar / Tinggi</span></div>
                                        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500 border border-red-700"></div><span>Salah / Rendah</span></div>
                                        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-blue-500 border border-blue-700"></div><span>Sedang</span></div>
                                    </div>
                                </div>

                                <div className="p-3 sm:p-4 relative z-10">
                                    <div className="flex flex-col gap-4">
                                        {/* Group questions by type using centralized SUBJECTS */}
                                        {[SUBJECTS.TWK.short, SUBJECTS.TIU.short, SUBJECTS.TKP.short].map((questionType) => {
                                            const filteredAnswers = sortedAnswers
                                                .map((ans, idx) => ({ ans, idx }))
                                                .filter(({ ans }) => {
                                                    const q = Array.isArray(ans.questions) ? ans.questions[0] : ans.questions
                                                    return q.type === questionType
                                                })

                                            if (filteredAnswers.length === 0) return null

                                            // Calculate offset for display numbering dynamically
                                            let numberOffset = 0
                                            if (questionType === SUBJECTS.TIU.short) {
                                                numberOffset = sortedAnswers.filter(a => {
                                                    const q = Array.isArray(a.questions) ? a.questions[0] : a.questions
                                                    return q.type === SUBJECTS.TWK.short
                                                }).length
                                            } else if (questionType === SUBJECTS.TKP.short) {
                                                numberOffset = sortedAnswers.filter(a => {
                                                    const q = Array.isArray(a.questions) ? a.questions[0] : a.questions
                                                    return q.type === SUBJECTS.TWK.short || q.type === SUBJECTS.TIU.short
                                                }).length
                                            }

                                            return (
                                                <div key={questionType}>
                                                    <div className="text-xs font-bold text-gray-800 mb-2 px-1 uppercase tracking-[0.2em] border-s-4 border-gray-900 ps-2.5">
                                                        {questionType}
                                                    </div>
                                                    <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-14 gap-1.5 sm:gap-2">
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
                                                                        "h-11 w-11 sm:h-12 sm:w-12 rounded-md font-bold text-sm sm:text-base flex items-center justify-center transition-all border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
                                                                        currentIndex === idx ? 'ring-2 ring-blue-400 ring-offset-1 scale-105 z-10 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]' : 'hover:scale-[1.03]',
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
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* BOTTOM: Question Review Area */}
            <div className="flex-1 flex flex-col bg-white border-2 border-gray-900 rounded-xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden relative min-h-[500px]">
                <PaperBackground />
                {/* Header */}
                <div className="p-3 sm:p-5 border-b-2 border-dashed border-gray-300 flex flex-col sm:flex-row sm:justify-between sm:items-center bg-yellow-50/50 gap-3 relative z-10">
                    <div className="flex flex-col gap-2">
                        <div className="flex flex-col gap-1.5">
                            <h2 className="font-bold text-xl sm:text-2xl text-gray-900 leading-tight">
                                Pembahasan <span className="font-sans">#{currentIndex + 1}</span>
                            </h2>
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex gap-1.5 flex-wrap">
                                    <span className="px-2 py-0.5 bg-gray-900 text-white text-[10px] sm:text-xs font-bold rounded-full rotate-2">
                                        {question.type}
                                    </span>
                                    {question.category && (
                                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border-2 border-blue-200 text-[10px] sm:text-xs font-bold rounded-lg -rotate-1 shadow-sm">
                                            {formatSubjectName(question.category)}
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-1.5 sm:hidden ml-auto">
                                    <div className="px-2.5 py-0.5 bg-white border-2 border-gray-900 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-none">
                                        {type === 'TKP' ? (
                                            <span className={cn(
                                                "flex items-center gap-1",
                                                status === 'perfect' ? 'text-green-600' : status === 'good' ? 'text-blue-600' : 'text-orange-600'
                                            )}>
                                                <Sparkles size={12} /> +<span className="font-sans">{currentAnswer.selected_option?.score_value || 0}</span>
                                            </span>
                                        ) : (
                                            status === 'correct' ? (
                                                <span className="flex items-center gap-1 text-green-600 font-bold"><CheckCircle2 size={13} /> Benar</span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-red-600 font-bold"><XCircle size={13} /> Salah</span>
                                            )
                                        )}
                                    </div>

                                    <button
                                        onClick={() => setShowNav(prev => !prev)}
                                        className={cn(
                                            "inline-flex items-center justify-center w-8 h-6 bg-white rounded-full border-2 transition-all shadow-none",
                                            showNav
                                                ? "text-blue-700 border-blue-900 hover:bg-blue-50"
                                                : "text-gray-600 border-gray-900 hover:bg-gray-50"
                                        )}
                                        title={showNav ? 'Sembunyikan navigasi pembahasan' : 'Tampilkan navigasi pembahasan'}
                                    >
                                        <motion.div animate={{ rotate: showNav ? 0 : 180 }}>
                                            <Map size={12} />
                                        </motion.div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Score Badge + Nav Toggle */}
                    <div className="hidden sm:flex items-center gap-2 self-start sm:self-center">
                        <div className="px-2.5 py-0.5 sm:px-3 sm:py-1 bg-white border-2 border-gray-900 rounded-full text-xs sm:text-lg font-bold flex items-center gap-1.5 sm:gap-2 shadow-none sm:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
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

                        <button
                            onClick={() => setShowNav(prev => !prev)}
                            className={cn(
                                "inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 bg-white rounded-full border-2 text-xs sm:text-lg font-bold transition-all shadow-none sm:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
                                showNav
                                    ? "text-blue-700 border-blue-900 hover:bg-blue-50"
                                    : "text-gray-600 border-gray-900 hover:bg-gray-50"
                            )}
                            title={showNav ? 'Sembunyikan navigasi pembahasan' : 'Tampilkan navigasi pembahasan'}
                        >
                            <motion.div animate={{ rotate: showNav ? 0 : 180 }}>
                                <Map size={14} className="sm:w-[18px] sm:h-[18px]" />
                            </motion.div>
                            <span>{showNav ? 'Sembunyikan Navigasi' : 'Tampilkan Navigasi'}</span>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 relative z-10 overflow-hidden">
                    <div className="flex h-full flex-col lg:flex-row">
                        <div className="flex-1 p-4 sm:p-10 overflow-y-auto">
                    <div className="relative mb-6 sm:mb-10">
                        <div className="absolute -left-4 sm:-left-6 top-1 w-1 sm:h-full bg-blue-400 rounded-full opacity-50"></div>
                        <div className="text-lg sm:text-2xl font-bold leading-relaxed text-gray-800 max-w-4xl">
                            <MathRenderer text={question.content} />
                        </div>
                    </div>

                    <div className="space-y-2 sm:space-y-2.5 mb-7 sm:mb-8 max-w-4xl">
                        {options.map((option: Option, i: number) => {
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
                                    "px-3 py-3.5 sm:px-3.5 sm:py-3.5 rounded-lg border-2 flex items-start gap-2.5 sm:gap-3 transition-all relative overflow-hidden group",
                                    borderClass,
                                    bgClass
                                )}>
                                    {/* Indicator Circle */}
                                    <div className={cn(
                                        "w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 font-bold text-sm sm:text-base",
                                        indicatorColor
                                    )}>
                                        {String.fromCharCode(65 + i)}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className={cn("text-[15px] sm:text-lg leading-snug break-words", textClass)}>
                                            <MathRenderer text={option.content} />
                                        </div>

                                        {/* Status Labels */}
                                        <div className="flex gap-1.5 mt-1.5 flex-wrap">
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
                                    <MathRenderer text={question.explanation} />
                                </div>
                                <div className="absolute bottom-2 right-3 opacity-20 relative z-10">
                                    <Sparkles size={40} className="text-gray-900" />
                                </div>
                            </div>
                        </div>
                    )}
                        </div>

                        <AnimatePresence initial={false}>
                            {showNav && (
                                <motion.aside
                                    initial={{ x: 280, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    exit={{ x: 280, opacity: 0 }}
                                    transition={{ duration: 0.22 }}
                                    className="hidden lg:block shrink-0 lg:w-[248px] xl:w-[260px] border-l-2 border-dashed border-gray-300 bg-[#fff9c4]/80 backdrop-blur-sm"
                                >
                                    <div className="px-2.5 py-3 border-b-2 border-dashed border-gray-300 font-bold text-sm flex items-center gap-2 bg-white/30">
                                        <Map size={16} />
                                        <span>Daftar Pembahasan</span>
                                    </div>

                                    <div className="px-2 py-3 space-y-3 max-h-[680px] overflow-y-auto">
                                        <div className="hidden lg:flex items-center gap-3 text-[11px] text-gray-700">
                                            <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-green-500 border border-green-700"></div><span>Benar</span></div>
                                            <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-red-500 border border-red-700"></div><span>Salah</span></div>
                                            <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-blue-500 border border-blue-700"></div><span>Sedang</span></div>
                                        </div>

                                        {[SUBJECTS.TWK.short, SUBJECTS.TIU.short, SUBJECTS.TKP.short].map((questionType) => {
                                            const filteredAnswers = sortedAnswers
                                                .map((ans, idx) => ({ ans, idx }))
                                                .filter(({ ans }) => {
                                                    const q = Array.isArray(ans.questions) ? ans.questions[0] : ans.questions
                                                    return q.type === questionType
                                                })

                                            if (filteredAnswers.length === 0) return null

                                            let numberOffset = 0
                                            if (questionType === SUBJECTS.TIU.short) {
                                                numberOffset = sortedAnswers.filter(a => {
                                                    const q = Array.isArray(a.questions) ? a.questions[0] : a.questions
                                                    return q.type === SUBJECTS.TWK.short
                                                }).length
                                            } else if (questionType === SUBJECTS.TKP.short) {
                                                numberOffset = sortedAnswers.filter(a => {
                                                    const q = Array.isArray(a.questions) ? a.questions[0] : a.questions
                                                    return q.type === SUBJECTS.TWK.short || q.type === SUBJECTS.TIU.short
                                                }).length
                                            }

                                            return (
                                                <div key={questionType}>
                                                    <div className="text-[11px] font-bold text-gray-800 mb-2 px-1 uppercase tracking-[0.2em] border-s-4 border-gray-900 ps-2">
                                                        {questionType}
                                                    </div>
                                                    <div className="grid grid-cols-5 gap-1">
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
                                                                        "aspect-square w-full rounded-[6px] font-bold text-[11px] flex items-center justify-center transition-all border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
                                                                        currentIndex === idx ? 'ring-2 ring-blue-400 ring-offset-1 scale-105 z-10 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]' : 'hover:scale-[1.03]',
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
                                </motion.aside>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                <AnimatePresence>
                    {showNav && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[1px] lg:hidden"
                            onClick={() => setShowNav(false)}
                        >
                            <motion.aside
                                initial={{ x: '100%' }}
                                animate={{ x: 0 }}
                                exit={{ x: '100%' }}
                                transition={{ duration: 0.22 }}
                                className="ml-auto h-full w-[260px] border-l border-gray-900 bg-[#fff9c4] shadow-[-4px_0_0_0_rgba(0,0,0,1)]"
                                onClick={(event) => event.stopPropagation()}
                            >
                                <div className="px-3 py-3 border-b-2 border-dashed border-gray-300 font-bold text-sm flex items-center justify-between bg-white/30">
                                    <div className="flex items-center gap-2">
                                        <Map size={16} />
                                        <span>Daftar Pembahasan</span>
                                    </div>
                                    <button
                                        onClick={() => setShowNav(false)}
                                        className="w-8 h-8 flex items-center justify-center rounded-full border-2 border-gray-900 bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>

                                <div className="px-2 py-3 space-y-3 h-[calc(100%-57px)] overflow-y-auto">
                                    <div className="flex items-center gap-3 text-[11px] text-gray-700">
                                        <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-green-500 border border-green-700"></div><span>Benar</span></div>
                                        <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-red-500 border border-red-700"></div><span>Salah</span></div>
                                        <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-blue-500 border border-blue-700"></div><span>Sedang</span></div>
                                    </div>

                                    {[SUBJECTS.TWK.short, SUBJECTS.TIU.short, SUBJECTS.TKP.short].map((questionType) => {
                                        const filteredAnswers = sortedAnswers
                                            .map((ans, idx) => ({ ans, idx }))
                                            .filter(({ ans }) => {
                                                const q = Array.isArray(ans.questions) ? ans.questions[0] : ans.questions
                                                return q.type === questionType
                                            })

                                        if (filteredAnswers.length === 0) return null

                                        let numberOffset = 0
                                        if (questionType === SUBJECTS.TIU.short) {
                                            numberOffset = sortedAnswers.filter(a => {
                                                const q = Array.isArray(a.questions) ? a.questions[0] : a.questions
                                                return q.type === SUBJECTS.TWK.short
                                            }).length
                                        } else if (questionType === SUBJECTS.TKP.short) {
                                            numberOffset = sortedAnswers.filter(a => {
                                                const q = Array.isArray(a.questions) ? a.questions[0] : a.questions
                                                return q.type === SUBJECTS.TWK.short || q.type === SUBJECTS.TIU.short
                                            }).length
                                        }

                                        return (
                                            <div key={questionType}>
                                                <div className="text-[11px] font-bold text-gray-800 mb-2 px-1 uppercase tracking-[0.2em] border-s-4 border-gray-900 ps-2">
                                                    {questionType}
                                                </div>
                                                <div className="grid grid-cols-5 gap-1">
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
                                                                onClick={() => {
                                                                    setCurrentIndex(idx)
                                                                    setShowNav(false)
                                                                }}
                                                                className={cn(
                                                                    "aspect-square w-full rounded-[6px] font-bold text-[11px] flex items-center justify-center transition-all border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
                                                                    currentIndex === idx ? 'ring-2 ring-blue-400 ring-offset-1 scale-105 z-10 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]' : 'hover:scale-[1.03]',
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
                            </motion.aside>
                        </motion.div>
                    )}
                </AnimatePresence>

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
