'use client'

import { useState, useEffect } from 'react'
import { submitAnswer, finishExam } from '@/app/actions/exam'
import { cn } from '@/lib/utils' // Need to ensure lib/utils exists or use clsx directly
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, ChevronLeft, ChevronRight, Clock, Map } from 'lucide-react'


interface Question {
    id: string
    content: string
    type: 'TWK' | 'TIU' | 'TKP'
    options: {
        id: string
        content: string
    }[]
}

interface ExamInterfaceProps {
    sessionId: string
    questions: Question[]
    initialAnswers: Record<string, string> // questionId -> optionId
    endTime: string // ISO string
}

export default function ExamInterface({ sessionId, questions, initialAnswers, endTime }: ExamInterfaceProps) {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
    const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers)
    const [timeLeft, setTimeLeft] = useState<string>('00:00:00')
    const [timeLeftMs, setTimeLeftMs] = useState<number>(0)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [hasFinished, setHasFinished] = useState(false)
    const [showWarning5Min, setShowWarning5Min] = useState(false)
    const [showWarning1Min, setShowWarning1Min] = useState(false)
    const [showMobileNav, setShowMobileNav] = useState(false)

    const currentQuestion = questions[currentQuestionIndex]

    const handleFinish = async () => {
        if (hasFinished) return // Prevent double submission
        setHasFinished(true)
        setIsSubmitting(true)
        await finishExam(sessionId)
    }

    // Timer Logic
    useEffect(() => {
        const interval = setInterval(() => {
            if (hasFinished) return // Prevent race condition

            const now = new Date().getTime()
            const end = new Date(endTime).getTime()
            const diff = end - now

            if (diff <= 0) {
                clearInterval(interval)
                setTimeLeft('00:00:00')
                setTimeLeftMs(0)
                if (!hasFinished) {
                    setHasFinished(true)
                    handleFinish()
                }
            } else {
                setTimeLeftMs(diff)
                const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
                const seconds = Math.floor((diff % (1000 * 60)) / 1000)
                setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)

                // Warning notifications
                const totalMinutes = Math.floor(diff / (1000 * 60))

                // 5 minute warning (show once)
                if (totalMinutes === 4 && !showWarning5Min) {
                    setShowWarning5Min(true)
                    // You can add toast here if you have a toast library
                }

                // 1 minute warning (show once)
                if (totalMinutes === 0 && Math.floor(diff / 1000) === 60 && !showWarning1Min) {
                    setShowWarning1Min(true)
                    // You can add toast here if you have a toast library
                }
            }
        }, 1000)
        return () => clearInterval(interval)
    }, [endTime, hasFinished, showWarning5Min, showWarning1Min])

    const handleOptionSelect = async (optionId: string) => {
        const newAnswers = { ...answers, [currentQuestion.id]: optionId }
        setAnswers(newAnswers)

        // Server Action (Optimistic)
        try {
            await submitAnswer(sessionId, currentQuestion.id, optionId)
        } catch (error) {
            console.error("Failed to sync answer", error)
            // Revert state if needed or show toast
        }
    }



    return (
        <div className="flex h-screen bg-background">
            {/* Warning Modal - 5 Minutes */}
            <AnimatePresence>
                {showWarning5Min && timeLeftMs > 60000 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                        onClick={() => setShowWarning5Min(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-orange-500 text-white p-8 rounded-2xl shadow-2xl max-w-md w-full text-center"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Clock className="w-16 h-16 mx-auto mb-4" />
                            <h3 className="text-2xl font-bold mb-2">Peringatan Waktu!</h3>
                            <p className="text-lg mb-6">Waktu tersisa kurang dari 5 menit. Segera selesaikan jawaban Anda!</p>
                            <button
                                onClick={() => setShowWarning5Min(false)}
                                className="bg-white text-orange-500 px-8 py-3 rounded-lg font-bold hover:bg-orange-50 transition"
                            >
                                Mengerti
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Warning Modal - 1 Minute */}
            <AnimatePresence>
                {showWarning1Min && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
                        onClick={() => setShowWarning1Min(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-red-500 text-white p-8 rounded-2xl shadow-2xl max-w-md w-full text-center animate-pulse"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Clock className="w-16 h-16 mx-auto mb-4" />
                            <h3 className="text-3xl font-bold mb-2">WAKTU HAMPIR HABIS!</h3>
                            <p className="text-xl mb-6">Tinggal 1 menit! Ujian akan otomatis selesai saat waktu habis.</p>
                            <button
                                onClick={() => setShowWarning1Min(false)}
                                className="bg-white text-red-500 px-8 py-3 rounded-lg font-bold hover:bg-red-50 transition"
                            >
                                Mengerti
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Mobile Navigation Drawer */}
            <AnimatePresence>
                {showMobileNav && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 z-50 flex flex-col lg:hidden"
                        onClick={() => setShowMobileNav(false)}
                    >
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="bg-background w-3/4 h-full ml-auto p-6 flex flex-col shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="font-bold text-lg flex items-center gap-2">
                                    <Map size={18} /> Navigasi Soal
                                </h2>
                                <button onClick={() => setShowMobileNav(false)} className="p-2 hover:bg-secondary rounded-full">
                                    <ChevronRight size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-1">
                                <div className="grid grid-cols-5 gap-2">
                                    {questions.map((q, idx) => {
                                        const isAnswered = !!answers[q.id]
                                        const isCurrent = idx === currentQuestionIndex
                                        return (
                                            <button
                                                key={q.id}
                                                onClick={() => {
                                                    setCurrentQuestionIndex(idx)
                                                    setShowMobileNav(false)
                                                }}
                                                className={cn(
                                                    "aspect-square rounded-lg text-sm font-medium transition-all",
                                                    isCurrent ? "bg-primary text-white shadow-lg shadow-primary/25" :
                                                        isAnswered ? "bg-green-500/20 text-green-500 border border-green-500/50" :
                                                            "bg-secondary/50 text-muted-foreground hover:bg-secondary border border-transparent"
                                                )}
                                            >
                                                {idx + 1}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            <div className="p-4 border-t border-border mt-4">
                                <button
                                    onClick={() => {
                                        setShowMobileNav(false)
                                        handleFinish()
                                    }}
                                    disabled={isSubmitting}
                                    className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg font-bold transition flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? 'Menyimpan...' : 'Selesai Ujian'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Sidebar Navigation */}
            <aside className="w-80 bg-secondary/10 border-r border-border flex flex-col hidden lg:flex">
                <div className="p-6 border-b border-border">
                    <h2 className="font-bold text-lg mb-1">Navigasi Soal</h2>
                    <p className="text-sm text-muted-foreground">{Object.keys(answers).length} / {questions.length} Dijawab</p>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="grid grid-cols-5 gap-2">
                        {questions.map((q, idx) => {
                            const isAnswered = !!answers[q.id]
                            const isCurrent = idx === currentQuestionIndex
                            return (
                                <button
                                    key={q.id}
                                    onClick={() => setCurrentQuestionIndex(idx)}
                                    className={cn(
                                        "aspect-square rounded-lg text-sm font-medium transition-all",
                                        isCurrent ? "bg-primary text-white shadow-lg shadow-primary/25" :
                                            isAnswered ? "bg-green-500/20 text-green-500 border border-green-500/50" :
                                                "bg-secondary/50 text-muted-foreground hover:bg-secondary border border-transparent"
                                    )}
                                >
                                    {idx + 1}
                                </button>
                            )
                        })}
                    </div>
                </div>
                <div className="p-6 border-t border-border">
                    <button
                        onClick={handleFinish}
                        disabled={isSubmitting}
                        className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg font-bold transition flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? 'Menyimpan...' : 'Selesai Ujian'}
                    </button>
                </div>
            </aside>

            {/* Main Interface */}
            <main className="flex-1 flex flex-col relative">
                {/* Header - Optimized for Mobile */}
                <header className="h-14 md:h-16 border-b border-border flex items-center justify-between px-3 md:px-8 bg-background/80 backdrop-blur-md sticky top-0 z-10 transition-all">
                    <div className="flex items-center gap-2 md:gap-4 overflow-hidden">
                        <button
                            onClick={() => setShowMobileNav(true)}
                            className="lg:hidden p-1.5 rounded-lg bg-secondary text-foreground hover:bg-secondary/80 shrink-0"
                        >
                            <Map size={18} className="md:w-5 md:h-5" />
                        </button>

                        <div className="flex items-baseline gap-2 overflow-hidden">
                            <span className="font-bold text-sm md:text-xl">#{currentQuestionIndex + 1}</span>
                            <div className="px-1.5 py-0.5 rounded text-[10px] md:text-xs font-bold shrink-0 bg-secondary border border-border">
                                {currentQuestion.type}
                            </div>
                        </div>
                    </div>

                    <div className={cn(
                        "flex items-center gap-1.5 md:gap-2 font-mono text-xs md:text-xl font-bold px-2 py-1 md:px-4 md:py-2 rounded-lg transition-all duration-300 shrink-0",
                        timeLeftMs <= 60000 ? "bg-red-500 text-white animate-pulse" :
                            timeLeftMs <= 300000 ? "bg-orange-500 text-white" :
                                "bg-primary/10 text-primary border border-primary/20"
                    )}>
                        <Clock className="w-3.5 h-3.5 md:w-5 md:h-5" />
                        {timeLeft}
                    </div>
                </header>

                {/* Content */}
                <div className="flex-1 p-8 overflow-y-auto flex flex-col max-w-4xl mx-auto w-full">
                    <div>
                        <div className="prose dark:prose-invert max-w-none text-lg mb-8 leading-relaxed">
                            {currentQuestion.content}
                        </div>

                        <div className="space-y-4">
                            {currentQuestion.options.map((opt, idx) => {
                                const isSelected = answers[currentQuestion.id] === opt.id
                                const labels = ['A', 'B', 'C', 'D', 'E']
                                return (
                                    <div
                                        key={opt.id}
                                        onClick={() => handleOptionSelect(opt.id)}
                                        className={cn(
                                            "group flex items-center gap-4 p-4 rounded-xl border border-border cursor-pointer transition-all duration-200",
                                            isSelected ? "bg-primary/10 border-primary shadow-lg shadow-primary/10" : "hover:bg-secondary/30 hover:border-primary/50"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors",
                                            isSelected ? "bg-primary text-white" : "bg-secondary text-muted-foreground group-hover:bg-secondary/80"
                                        )}>
                                            {labels[idx]}
                                        </div>
                                        <div className="text-lg">
                                            {opt.content}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>



                    <div className={cn("mt-4 md:mt-12 flex justify-between md:pt-8")}>
                        <button
                            onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                            disabled={currentQuestionIndex === 0}
                            className="flex items-center gap-2 px-4 py-2 md:px-6 md:py-3 rounded-lg font-medium hover:bg-secondary transition disabled:opacity-50 text-sm md:text-base"
                        >
                            <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
                            Sebelumnya
                        </button>
                        <button
                            onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
                            disabled={currentQuestionIndex === questions.length - 1}
                            className="flex items-center gap-2 px-6 py-2 md:px-8 md:py-3 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition shadow-lg shadow-primary/25 disabled:opacity-50 disabled:shadow-none bg-primary text-sm md:text-base"
                        >
                            Selanjutnya
                            <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                    </div>
                </div>
            </main>
        </div>
    )
}
