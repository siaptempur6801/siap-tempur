'use client'

import { useState, useMemo, useEffect } from 'react'
import { submitAnswer, finishPractice } from '@/app/actions/practice'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, CheckCircle2, Clock, Map, Flag, Pause, Play } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface Question {
    id: string
    content: string
    type: string
    category?: string
    options: {
        id: string
        content: string
    }[]
}

interface Props {
    sessionId: string
    questions: Question[]
    initialAnswers: Record<string, string> // questionId -> optionId
    endTime?: string // ISO string for tryout mode
    isTryout?: boolean
}

export default function PracticeSessionClient({ sessionId, questions, initialAnswers, endTime, isTryout = false }: Props) {
    const router = useRouter()
    const [currentIndex, setCurrentIndex] = useState(0)
    const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers)
    const [marked, setMarked] = useState<Record<string, boolean>>({}) // Ragu-ragu state
    const [submitting, setSubmitting] = useState(false)
    const [finishing, setFinishing] = useState(false)

    // Timer states for tryout mode
    const [timeLeft, setTimeLeft] = useState<string>('01:40:00')
    const [timeLeftMs, setTimeLeftMs] = useState<number>(0)
    const [hasFinished, setHasFinished] = useState(false)
    const [showWarning5Min, setShowWarning5Min] = useState(false)
    const [showWarning1Min, setShowWarning1Min] = useState(false)
    const [isPaused, setIsPaused] = useState(false)

    // Sort questions by type (TWK -> TIU -> TKP)
    const sortedQuestions = useMemo(() => {
        const typeOrder = { 'TWK': 1, 'TIU': 2, 'TKP': 3 }
        return [...questions].sort((a, b) => {
            return (typeOrder[a.type as keyof typeof typeOrder] || 99) - (typeOrder[b.type as keyof typeof typeOrder] || 99)
        })
    }, [questions])

    const currentQuestion = sortedQuestions[currentIndex]

    // Timer Logic for Tryout Mode
    useEffect(() => {
        if (!isTryout || !endTime) return
        if (isPaused) return // Don't run timer when paused

        const interval = setInterval(() => {
            if (hasFinished) return

            const now = new Date().getTime()
            const end = new Date(endTime).getTime()
            const diff = end - now

            if (diff <= 0) {
                clearInterval(interval)
                setTimeLeft('00:00:00')
                setTimeLeftMs(0)
                if (!hasFinished) {
                    setHasFinished(true)
                    handleAutoFinish()
                }
            } else {
                setTimeLeftMs(diff)
                const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
                const seconds = Math.floor((diff % (1000 * 60)) / 1000)
                setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)

                // Warning notifications
                const totalMinutes = Math.floor(diff / (1000 * 60))

                if (totalMinutes === 4 && !showWarning5Min) {
                    setShowWarning5Min(true)
                }

                if (totalMinutes === 0 && Math.floor(diff / 1000) === 60 && !showWarning1Min) {
                    setShowWarning1Min(true)
                }
            }
        }, 1000)
        return () => clearInterval(interval)
    }, [endTime, hasFinished, isTryout, isPaused, showWarning5Min, showWarning1Min])

    // Safety check - prevent crash if no questions available
    if (!currentQuestion || sortedQuestions.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center text-muted-foreground">
                    <p className="text-lg font-semibold">Tidak ada soal tersedia</p>
                    <p className="text-sm">Silakan kembali ke halaman latihan</p>
                </div>
            </div>
        )
    }

    const handleSelectOption = async (optionId: string) => {
        if (submitting) return

        // Optimistic update
        setAnswers(prev => ({ ...prev, [currentQuestion.id]: optionId }))

        // Server action
        // Silent update/debounce could be better, but direct call is safer for consistency
        const result = await submitAnswer(sessionId, currentQuestion.id, optionId)

        if (result?.error) {
            toast.error('Gagal menyimpan jawaban')
        }
    }

    const toggleMark = () => {
        setMarked(prev => ({
            ...prev,
            [currentQuestion.id]: !prev[currentQuestion.id]
        }))
    }

    const [showConfirmModal, setShowConfirmModal] = useState(false)

    // Calculate Answer Stats
    const totalQuestions = sortedQuestions.length
    const answeredCount = Object.keys(answers).length
    const unansweredCount = totalQuestions - answeredCount
    const markedCount = Object.values(marked).filter(Boolean).length

    const onFinishClick = () => {
        setShowConfirmModal(true)
    }

    const handleConfirmFinish = async () => {
        setShowConfirmModal(false)
        await handleFinishSession()
    }

    const handleAutoFinish = async () => {
        toast.info('Waktu habis! Ujian diselesaikan otomatis.')
        await handleFinishSession()
    }

    const handleFinishSession = async () => {
        if (hasFinished && isTryout) return
        if (isTryout) setHasFinished(true)
        setFinishing(true)

        try {
            const result = await finishPractice(sessionId)

            if (result?.error) {
                toast.error(result.error)
                return
            }

            if (result?.success) {
                toast.success(isTryout ? 'Simulasi selesai!' : 'Latihan selesai!')
                router.push(`/dashboard/latihan/${sessionId}/result`)
            }
        } catch (error) {
            console.error('Error finishing practice:', error)
            toast.error('Gagal menyelesaikan latihan')
        } finally {
            setFinishing(false)
        }
    }

    return (
        <div className="flex flex-col lg:flex-row gap-6 p-4 md:p-8 h-[calc(100vh-64px)] overflow-hidden relative">
            {/* Warning Modal - 5 Minutes */}
            <AnimatePresence>
                {isTryout && showWarning5Min && timeLeftMs > 60000 && (
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
                {isTryout && showWarning1Min && (
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

            {/* Custom Confirmation Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-2">
                                <CheckCircle2 size={32} className="text-blue-600 dark:text-blue-400" />
                            </div>

                            <h3 className="text-2xl font-bold">Selesaikan Latihan?</h3>

                            <div className="text-muted-foreground w-full space-y-3 bg-secondary/30 p-4 rounded-lg text-sm text-left">
                                <div className="flex justify-between items-center">
                                    <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Total Soal</span>
                                    <span className="font-bold">{totalQuestions}</span>
                                </div>
                                <div className="flex justify-between items-center text-green-600 dark:text-green-400">
                                    <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div> Dijawab</span>
                                    <span className="font-bold">{answeredCount}</span>
                                </div>
                                <div className="flex justify-between items-center text-yellow-600 dark:text-yellow-400">
                                    <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-yellow-500"></div> Masih Ragu</span>
                                    <span className="font-bold">{markedCount}</span>
                                </div>
                                <div className="flex justify-between items-center text-red-600 dark:text-red-400">
                                    <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500"></div> Belum Dijawab</span>
                                    <span className="font-bold">{unansweredCount}</span>
                                </div>
                            </div>

                            <p className="text-xs text-muted-foreground">Pastikan tidak ada jawaban yang terlewat sebelum mengumpulkan.</p>

                            <div className="grid grid-cols-2 gap-3 w-full mt-4">
                                <button
                                    onClick={() => setShowConfirmModal(false)}
                                    className="px-4 py-2 rounded-lg border border-border hover:bg-secondary transition font-medium"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleConfirmFinish}
                                    className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition font-bold shadow-lg shadow-primary/20"
                                >
                                    Ya, Selesai!
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* LEFT: Question Area */}
            <div className="flex-1 flex flex-col h-full bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-border flex justify-between items-center bg-secondary/20">
                    <div className="flex items-center gap-2">
                        <h2 className="font-bold text-lg mr-2">Soal {currentIndex + 1} <span className="text-muted-foreground font-normal">/ {sortedQuestions.length}</span></h2>

                        {/* Type Badge (TIU/TWK/TKP) */}
                        <span className="px-2 py-0.5 bg-secondary text-secondary-foreground text-xs font-semibold rounded border border-border">
                            {currentQuestion.type}
                        </span>

                        {/* Category Badge (Numerik, etc) */}
                        {currentQuestion.category && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 text-xs font-semibold rounded border border-blue-200 dark:border-blue-800 uppercase tracking-wider">
                                {currentQuestion.category}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleMark}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${marked[currentQuestion.id]
                                ? 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800'
                                : 'bg-background border-border text-muted-foreground hover:bg-secondary'
                                }`}
                        >
                            <Flag size={14} className={marked[currentQuestion.id] ? 'fill-current' : ''} />
                            {marked[currentQuestion.id] ? 'Ditandai Ragu' : 'Tandai Ragu'}
                        </button>
                        {isTryout ? (
                            <div className={cn(
                                "px-4 py-1 rounded-full text-sm font-mono flex items-center gap-2 transition-all duration-300 border",
                                isPaused ? "bg-gray-500 text-white border-gray-600" :
                                    timeLeftMs <= 60000 ? "bg-red-500 text-white border-red-600 animate-pulse shadow-lg shadow-red-500/50" :
                                        timeLeftMs <= 300000 ? "bg-orange-500 text-white border-orange-600 shadow-lg shadow-orange-500/30" :
                                            timeLeftMs <= 600000 ? "bg-yellow-500 text-gray-900 border-yellow-600 shadow-lg shadow-yellow-500/30" :
                                                "bg-primary/10 text-primary border-primary/20"
                            )}>
                                <Clock size={14} />
                                <span>{isPaused ? `${timeLeft} (Paused)` : timeLeft}</span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setIsPaused(!isPaused)
                                    }}
                                    className={cn(
                                        "ml-1 p-1 rounded hover:bg-black/10 transition-colors",
                                        isPaused && "hover:bg-white/20"
                                    )}
                                    title={isPaused ? "Resume Timer" : "Pause Timer"}
                                >
                                    {isPaused ? <Play size={14} /> : <Pause size={14} />}
                                </button>
                            </div>
                        ) : (
                            <div className="px-4 py-1.5 bg-background border border-border rounded-full text-sm font-mono flex items-center gap-2">
                                <Clock size={14} />
                                Mode Latihan
                            </div>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="prose dark:prose-invert max-w-none mb-8">
                        <p className="text-lg leading-relaxed">{currentQuestion.content}</p>
                    </div>

                    <div className="space-y-3">
                        {currentQuestion.options.map((option) => (
                            <div
                                key={option.id}
                                onClick={() => handleSelectOption(option.id)}
                                className={`
                                    p-4 rounded-lg border-2 cursor-pointer transition-all flex items-start gap-3
                                    ${answers[currentQuestion.id] === option.id
                                        ? 'border-primary bg-primary/5'
                                        : 'border-border hover:border-primary/50 hover:bg-secondary/50'}
                                `}
                            >
                                <div className={`
                                    w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5
                                    ${answers[currentQuestion.id] === option.id
                                        ? 'border-primary bg-primary text-white'
                                        : 'border-muted-foreground'}
                                `}>
                                    {answers[currentQuestion.id] === option.id && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                                </div>
                                <span className={answers[currentQuestion.id] === option.id ? 'font-medium text-foreground' : 'text-muted-foreground'}>
                                    {option.content}
                                </span>
                            </div>
                        ))}
                    </div>
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

                    {currentIndex === sortedQuestions.length - 1 ? (
                        <button
                            onClick={onFinishClick}
                            disabled={finishing}
                            className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition shadow-lg shadow-primary/20"
                        >
                            {finishing ? 'Menyimpan...' : 'Selesai & Hitung Skor'}
                            <CheckCircle2 size={18} />
                        </button>
                    ) : (
                        <button
                            onClick={() => setCurrentIndex(prev => Math.min(sortedQuestions.length - 1, prev + 1))}
                            className="flex items-center gap-2 px-4 py-2 bg-foreground text-background rounded-lg hover:opacity-90 transition"
                        >
                            Selanjutnya
                            <ChevronRight size={20} />
                        </button>
                    )}
                </div>
            </div>

            {/* RIGHT: Navigation Panel */}
            <div className="w-full lg:w-80 shrink-0 flex flex-col bg-card border border-border rounded-xl h-full shadow-sm">
                <div className="p-4 border-b border-border font-semibold flex items-center gap-2">
                    <Map size={18} />
                    Navigasi Soal
                </div>
                <div className="p-4 flex-1 overflow-y-auto">
                    <div className="grid grid-cols-5 gap-2">
                        {sortedQuestions.map((q, idx) => (
                            <button
                                key={q.id}
                                onClick={() => setCurrentIndex(idx)}
                                className={`
                                    aspect-square rounded-lg font-bold text-sm flex items-center justify-center transition-all border
                                    ${currentIndex === idx ? 'ring-2 ring-primary ring-offset-2' : ''}
                                    ${marked[q.id]
                                        ? 'bg-yellow-500 text-white border-yellow-600 hover:bg-yellow-600'
                                        : answers[q.id]
                                            ? 'bg-primary text-white border-primary'
                                            : 'bg-secondary text-muted-foreground border-transparent hover:bg-secondary/80'
                                    }
                                `}
                            >
                                {idx + 1}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="p-4 bg-secondary/20 text-xs text-muted-foreground border-t border-border space-y-1">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-primary"></div><span>Dijawab</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-yellow-500"></div><span>Ragu-ragu</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-secondary border border-muted-foreground/30"></div><span>Belum dijawab</span></div>
                </div>
            </div>
        </div >
    )
}
