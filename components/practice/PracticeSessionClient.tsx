'use client'

import { useState, useMemo, useEffect } from 'react'
import { submitAnswer, finishPractice } from '@/app/actions/practice'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, CheckCircle2, Clock, Map, Flag, Pause, Play, LogOut, Highlighter, Key, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn, formatSubjectName } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import PaperBackground from '@/components/PaperBackground'
import { SUBJECTS } from '@/lib/constants'

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
    const [showMobileNav, setShowMobileNav] = useState(false)
    const [showConfirmModal, setShowConfirmModal] = useState(false)
    const [showExitModal, setShowExitModal] = useState(false)
    const [showNav, setShowNav] = useState(true) // Toggleable desktop side nav

    // Sort questions by type (TWK -> TIU -> TKP)
    const sortedQuestions = useMemo(() => {
        const typeOrder: Record<string, number> = {
            [SUBJECTS.TWK.short]: 1,
            [SUBJECTS.TIU.short]: 2,
            [SUBJECTS.TKP.short]: 3
        }
        return [...questions].sort((a, b) => {
            return (typeOrder[a.type] || 99) - (typeOrder[b.type] || 99)
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
                toast.success(isTryout ? 'Tryout selesai!' : 'Latihan selesai!')
                router.push(`/dashboard/latihan/${sessionId}/result`)
            }
        } catch (error) {
            console.error('Error finishing practice:', error)
            toast.error('Gagal menyelesaikan latihan')
        } finally {
            setFinishing(false)
        }
    }

    const handleExit = () => {
        router.push('/dashboard/latihan')
    }

    return (
        <div className="flex flex-col lg:flex-row gap-4 md:gap-6 p-2 md:p-8 h-auto md:h-[calc(100vh-64px)] md:overflow-hidden relative font-body">
            <PaperBackground />

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
                            <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-dashed border-gray-300">
                                <h2 className="font-bold text-xl flex items-center gap-2 font-handwriting text-gray-800">
                                    <Map size={20} /> Navigasi Soal
                                </h2>
                                <button onClick={() => setShowMobileNav(false)} className="p-2 hover:bg-secondary rounded-full">
                                    <ChevronRight size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-1">
                                <div className="grid grid-cols-5 md:grid-cols-8 gap-2.5">
                                    {sortedQuestions.map((q, idx) => (
                                        <button
                                            key={q.id}
                                            onClick={() => {
                                                setCurrentIndex(idx)
                                                setShowMobileNav(false)
                                            }}
                                            className={cn(
                                                "aspect-square rounded-lg font-handwriting font-bold text-lg flex items-center justify-center transition-all border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px]",
                                                currentIndex === idx ? 'ring-2 ring-blue-400 ring-offset-2 border-blue-600 z-10' : '',
                                                marked[q.id]
                                                    ? 'bg-yellow-400 text-yellow-900 border-yellow-600'
                                                    : answers[q.id]
                                                        ? 'bg-blue-500 text-white border-blue-700'
                                                        : 'bg-white text-gray-500 border-gray-300 hover:border-gray-500'
                                            )}
                                        >
                                            {idx + 1}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Exit ButtonMobile */}
                            <div className="mt-4 pt-4 border-t-2 border-dashed border-gray-300 bg-gray-50/50 rounded-lg p-4">
                                <button
                                    onClick={() => setShowExitModal(true)}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-red-200 text-red-600 bg-red-50 hover:bg-red-100 hover:border-red-300 font-handwriting font-bold transition-all"
                                >
                                    <LogOut size={18} /> Keluar Latihan
                                </button>

                                <div className="mt-4 p-3 bg-white border-2 border-gray-200 text-xs text-gray-600 space-y-1.5 rounded-lg font-handwriting font-bold shadow-sm">
                                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500 border border-blue-700"></div><span>Dijawab</span></div>
                                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-yellow-400 border border-yellow-600"></div><span>Ragu-ragu</span></div>
                                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-white border-2 border-gray-300"></div><span>Belum dijawab</span></div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Exit Confirmation Modal */}
            {showExitModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-[#fff9c4] border-2 border-gray-900 rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-sm w-full p-8 animate-in zoom-in-95 duration-200 relative overflow-hidden">
                        <PaperBackground />
                        <div className="relative z-10 flex flex-col items-center text-center space-y-4 font-handwriting">
                            <div className="w-16 h-16 bg-red-100 border-2 border-red-600 rounded-full flex items-center justify-center mb-2 rotate-3 shadow-sm">
                                <LogOut size={32} className="text-red-600" />
                            </div>

                            <h3 className="text-3xl font-bold text-gray-900">Keluar Latihan?</h3>

                            <p className="text-lg text-gray-700 font-medium flex items-center justify-center gap-2">
                                Progres latihan Anda saat ini akan hilang. Apakah Anda yakin ingin menyerah?
                            </p>

                            <div className="grid grid-cols-2 gap-4 w-full mt-4">
                                <button
                                    onClick={() => setShowExitModal(false)}
                                    className="px-4 py-2 rounded-lg border-2 border-gray-900 bg-white hover:bg-gray-50 transition font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleExit}
                                    className="px-4 py-2 rounded-lg bg-red-600 text-white border-2 border-gray-900 hover:bg-red-700 transition font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                                >
                                    Keluar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
                            className="bg-[#fff9c4] border-2 border-gray-900 p-10 rounded-2xl shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] max-w-md w-full text-center relative overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <PaperBackground />
                            <div className="relative z-10 font-handwriting">
                                <div className="w-20 h-20 bg-orange-100 border-2 border-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 -rotate-3 shadow-md">
                                    <Clock className="w-12 h-12 text-orange-500" />
                                </div>
                                <h3 className="text-3xl font-bold mb-4 text-gray-900 flex items-center justify-center gap-2">Waktu Tipis! <Clock className="w-8 h-8 animate-pulse text-orange-600" /></h3>
                                <p className="text-xl mb-8 text-gray-700 font-medium leading-relaxed">Waktu tersisa kurang dari 5 menit nih. Gas pol selesaikan semua soalnya!</p>
                                <button
                                    onClick={() => setShowWarning5Min(false)}
                                    className="bg-orange-500 text-white px-10 py-3 rounded-lg border-2 border-gray-900 font-bold text-xl hover:bg-orange-600 transition shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                                >
                                    Siap Mandraguna!
                                </button>
                            </div>
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
                            className="bg-[#fff9c4] border-2 border-gray-900 p-10 rounded-2xl shadow-[10px_10px_0px_0px_rgba(239,68,68,0.5)] max-w-md w-full text-center relative overflow-hidden animate-bounce-subtle"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <PaperBackground />
                            <div className="relative z-10 font-handwriting">
                                <div className="w-24 h-24 bg-red-100 border-2 border-red-600 rounded-full flex items-center justify-center mx-auto mb-6 rotate-6 shadow-lg animate-pulse">
                                    <Clock className="w-14 h-14 text-red-600" />
                                </div>
                                <h3 className="text-4xl font-bold mb-4 text-red-600 flex items-center justify-center gap-2">DARURAT! <Clock className="w-10 h-10 animate-ping" /></h3>
                                <p className="text-2xl mb-8 text-gray-800 font-bold leading-tight">Tinggal 1 menit lagi! Buruan klik Selesai sebelum auto-submit!</p>
                                <button
                                    onClick={() => setShowWarning1Min(false)}
                                    className="bg-red-600 text-white px-10 py-4 rounded-lg border-2 border-gray-900 font-bold text-2xl hover:bg-red-700 transition shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                                >
                                    OKE OKE!!
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Custom Confirmation Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-[#fff9c4] border-2 border-gray-900 rounded-xl shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] max-w-md w-full p-8 animate-in zoom-in-95 duration-200 relative overflow-hidden">
                        <PaperBackground />
                        {/* Tape effect on modal */}
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-32 h-8 bg-white/40 border border-gray-200 shadow-sm -rotate-2 z-20 pointer-events-none"></div>

                        <div className="relative z-10 flex flex-col items-center text-center space-y-4 font-handwriting">
                            <div className="w-16 h-16 bg-blue-100 border-2 border-blue-600 rounded-full flex items-center justify-center mb-2 rotate-2 shadow-md">
                                <CheckCircle2 size={32} className="text-blue-600" />
                            </div>

                            <h3 className="text-3xl font-bold text-gray-900">Selesaikan Latihan?</h3>

                            <div className="w-full space-y-4 bg-white/60 border-2 border-gray-900 p-6 rounded-xl text-lg text-left shadow-inner relative">
                                <div className="absolute top-0 left-0 w-full h-1 bg-blue-500/10"></div>
                                <div className="flex justify-between items-center pb-2 border-b border-dashed border-gray-300">
                                    <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500 border border-blue-700"></div> Total Soal</span>
                                    <span className="font-bold text-2xl">{totalQuestions}</span>
                                </div>
                                <div className="flex justify-between items-center text-green-700 font-bold">
                                    <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500 border border-green-700"></div> Dijawab</span>
                                    <span className="text-2xl">{answeredCount}</span>
                                </div>
                                <div className="flex justify-between items-center text-yellow-700 font-bold">
                                    <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-yellow-400 border border-yellow-600"></div> Ragu-ragu</span>
                                    <span className="text-2xl">{markedCount}</span>
                                </div>
                                <div className="flex justify-between items-center text-red-600 font-bold">
                                    <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500 border border-red-700"></div> Belum Dijawab</span>
                                    <span className="text-2xl">{unansweredCount}</span>
                                </div>
                            </div>

                            <p className="text-lg text-gray-700 font-medium italic flex items-center justify-center gap-2">
                                "Jangan lupa cek lagi ya, teliti itu kunci kelulusan!" <Key className="w-5 h-5 text-yellow-600" /> <Sparkles className="w-5 h-5 text-blue-400" />
                            </p>

                            <div className="grid grid-cols-2 gap-4 w-full mt-6">
                                <button
                                    onClick={() => setShowConfirmModal(false)}
                                    className="px-4 py-3 rounded-xl border-2 border-gray-900 bg-white hover:bg-gray-50 transition font-bold text-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleConfirmFinish}
                                    className="px-4 py-3 rounded-xl bg-blue-600 text-white border-2 border-gray-900 hover:bg-blue-700 transition font-bold text-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                                >
                                    Siap Tempur!
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* LEFT: Question Area Wrapper */}
            <div className={cn(
                "flex-1 flex flex-col md:h-full relative transition-all duration-500",
                showNav ? "" : "lg:max-w-4xl lg:mx-auto"
            )}>
                {/* Desktop Floating Toggle Tab */}
                <button
                    onClick={() => setShowNav(!showNav)}
                    className="hidden lg:flex absolute top-20 -right-4 z-20 items-center justify-center w-8 h-10 bg-yellow-100 border-2 border-l-0 border-gray-900 rounded-r-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:w-10 transition-all group overflow-hidden"
                    title={showNav ? "Sembunyikan Navigasi" : "Tampilkan Navigasi"}
                >
                    <motion.div
                        animate={{ rotate: showNav ? 0 : 180 }}
                        className={cn("transition-colors", showNav ? "text-gray-500" : "text-blue-600")}
                    >
                        <Map size={16} />
                    </motion.div>
                </button>

                <div className="flex-1 flex flex-col bg-white/80 backdrop-blur-sm border-2 border-gray-900 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] md:overflow-hidden relative">
                    {/* Header - Optimized for Mobile */}
                    <div className="border-b-2 border-dashed border-gray-300 bg-yellow-50/50 p-2 md:p-4">
                        <div className="flex items-center justify-between gap-2">
                            {/* Left: Nav & Info */}
                            <div className="flex items-center gap-2 overflow-hidden">
                                <button
                                    onClick={() => setShowMobileNav(true)}
                                    className="lg:hidden p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 shrink-0"
                                >
                                    <Map size={16} />
                                </button>

                                <div className="flex flex-col gap-0.5 md:gap-1 overflow-hidden">
                                    <div className="flex items-baseline gap-1">
                                        <span className="font-handwriting font-bold text-xl md:text-2xl text-gray-900 leading-tight">Soal #{currentIndex + 1}</span>
                                        <span className="font-handwriting text-sm text-gray-500 md:text-lg">/ {sortedQuestions.length}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="px-1.5 py-0.5 bg-gray-900 text-white text-[10px] md:text-[11px] font-bold rounded uppercase tracking-wider">
                                            {currentQuestion.type}
                                        </span>
                                        {currentQuestion.category && (
                                            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-200 text-[10px] md:text-xs font-bold font-handwriting rounded shadow-sm">
                                                {formatSubjectName(currentQuestion.category)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right: Actions & Timer */}
                            <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
                                <button
                                    onClick={toggleMark}
                                    className={cn(
                                        "flex items-center justify-center rounded-full border transition-colors",
                                        "w-8 h-8 md:w-auto md:h-auto md:px-4 md:py-1.5 font-handwriting font-bold", // Circle on mobile, Pill on desktop
                                        marked[currentQuestion.id]
                                            ? 'bg-yellow-100 text-yellow-700 border-2 border-yellow-400 rotate-1 shadow-sm'
                                            : 'bg-white border-2 border-gray-300 text-gray-500 hover:bg-gray-50 hover:border-gray-400'
                                    )}
                                    title={marked[currentQuestion.id] ? 'Hilangkan tanda ragu' : 'Tandai ragu'}
                                >
                                    <Flag size={14} className={cn(marked[currentQuestion.id] ? 'fill-current' : '')} />
                                    <span className="hidden md:inline ml-2">{marked[currentQuestion.id] ? 'Ditandai Ragu' : 'Tandai Ragu'}</span>
                                </button>

                                {isTryout ? (
                                    <div className={cn(
                                        "px-2 py-1 md:px-4 md:py-1 rounded-full text-xs md:text-sm font-mono flex items-center gap-1.5 transition-all duration-300 border",
                                        isPaused ? "bg-gray-500 text-white border-gray-600" :
                                            timeLeftMs <= 60000 ? "bg-red-50 text-red-600 border-red-500 animate-pulse border-2 shadow-[2px_2px_0px_0px_rgba(239,68,68,1)]" :
                                                timeLeftMs <= 300000 ? "bg-orange-50 text-orange-600 border-orange-500 border-2 shadow-[2px_2px_0px_0px_rgba(249,115,22,1)]" :
                                                    "bg-blue-50 text-blue-700 border-blue-900 border-2 shadow-[2px_2px_0px_0px_rgba(30,58,138,1)]"
                                    )}>
                                        <Clock size={12} className="md:w-3.5 md:h-3.5" />
                                        <span>{timeLeft}</span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setIsPaused(!isPaused)
                                            }}
                                            className="ml-1 md:ml-2 hover:bg-black/10 rounded p-0.5"
                                        >
                                            {isPaused ? <Play size={10} /> : <Pause size={10} />}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="hidden md:flex px-4 py-1.5 bg-white border-2 border-gray-900 rounded-full text-xs md:text-sm font-handwriting font-bold items-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                        <Clock size={14} />
                                        <span>Latihan Santai</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-6">
                        <div className="prose dark:prose-invert max-w-none mb-6 md:mb-8 font-handwriting text-gray-900">
                            <p className="text-xl md:text-2xl leading-relaxed font-bold">{currentQuestion.content}</p>
                        </div>

                        <div className="space-y-2 md:space-y-3">
                            {currentQuestion.options.map((option, i) => {
                                const isSelected = answers[currentQuestion.id] === option.id;
                                return (
                                    <div
                                        key={option.id}
                                        onClick={() => handleSelectOption(option.id)}
                                        className={cn(
                                            "p-3 md:p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-4 group relative overflow-hidden",
                                            isSelected
                                                ? 'border-blue-600 bg-blue-50 shadow-[2px_2px_0px_0px_rgba(37,99,235,1)] transform translate-x-[1px] translate-y-[1px]'
                                                : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50/30 hover:shadow-[2px_2px_0px_0px_rgba(59,130,246,0.2)]'
                                        )}
                                    >
                                        {/* Ink Highlighter Effect */}
                                        {isSelected && (
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: '100%' }}
                                                className="absolute inset-x-0 bottom-2 top-2 bg-blue-400/30 -z-10"
                                                style={{ originX: 0 }}
                                            />
                                        )}

                                        <div className={cn(
                                            "w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 font-handwriting font-bold text-lg transition-colors",
                                            isSelected
                                                ? 'border-blue-600 bg-blue-600 text-white'
                                                : 'border-gray-400 text-gray-400 group-hover:border-blue-400 group-hover:text-blue-400'
                                        )}>
                                            {String.fromCharCode(65 + i)}
                                        </div>
                                        <span className={cn(
                                            "text-base md:text-lg leading-relaxed font-handwriting",
                                            isSelected ? 'font-bold text-blue-900' : 'text-gray-600 font-medium'
                                        )}>
                                            {option.content}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Mobile Navigation - Slimmed Down */}
                        <div className="mt-4 pt-4 border-t-2 border-dashed border-gray-300 flex justify-between items-center sm:hidden gap-3">
                            <button
                                onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                                disabled={currentIndex === 0}
                                className="flex items-center justify-center w-12 h-12 rounded-xl border-2 border-gray-900 bg-white hover:bg-gray-50 disabled:opacity-50 transition shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                            >
                                <ChevronLeft size={24} />
                            </button>

                            {currentIndex === sortedQuestions.length - 1 ? (
                                <button
                                    onClick={onFinishClick}
                                    disabled={finishing}
                                    className="flex-1 flex items-center justify-center gap-2 h-12 bg-blue-600 text-white rounded-xl border-2 border-gray-900 font-handwriting font-bold text-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                                >
                                    {finishing ? '...' : 'Selesai'}
                                    <CheckCircle2 size={20} />
                                </button>
                            ) : (
                                <button
                                    onClick={() => setCurrentIndex(prev => Math.min(sortedQuestions.length - 1, prev + 1))}
                                    className="flex items-center justify-center w-12 h-12 bg-gray-900 text-white rounded-xl border-2 border-gray-900 shadow-[3px_3px_0px_0px_rgba(30,58,138,0.3)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                                >
                                    <ChevronRight size={24} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Footer Nav - Desktop Only - Styled */}
                    <div className="hidden sm:flex p-4 border-t-2 border-dashed border-gray-300 justify-between items-center bg-white/50 backdrop-blur-sm">
                        <button
                            onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                            disabled={currentIndex === 0}
                            className="flex items-center gap-2 px-5 py-2 rounded-lg border-2 border-gray-900 font-handwriting font-bold hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                        >
                            <ChevronLeft size={20} />
                            Sebelumnya
                        </button>

                        {currentIndex === sortedQuestions.length - 1 ? (
                            <button
                                onClick={onFinishClick}
                                disabled={finishing}
                                className="flex items-center gap-2 px-8 py-2 bg-blue-600 text-white border-2 border-blue-800 rounded-lg hover:bg-blue-700 transition font-handwriting font-bold text-lg shadow-[3px_3px_0px_0px_rgba(30,58,138,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(30,58,138,1)]"
                            >
                                {finishing ? 'Menyimpan...' : 'Selesai & Hitung'}
                                <CheckCircle2 size={20} />
                            </button>
                        ) : (
                            <button
                                onClick={() => setCurrentIndex(prev => Math.min(sortedQuestions.length - 1, prev + 1))}
                                className="flex items-center gap-2 px-5 py-2 bg-gray-900 text-white border-2 border-gray-900 rounded-lg hover:bg-gray-800 transition font-handwriting font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                            >
                                Selanjutnya
                                <ChevronRight size={20} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* RIGHT: Navigation Panel - Hidden on Mobile - Styled */}
            <AnimatePresence>
                {showNav && (
                    <motion.div
                        initial={{ x: 300, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 300, opacity: 0 }}
                        className="hidden lg:flex w-full lg:w-80 shrink-0 flex-col bg-white/90 border-2 border-gray-900 rounded-xl h-full shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] z-10 relative"
                    >
                        {/* Tape Effect */}
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-32 h-8 bg-yellow-100/60 border border-white/40 shadow-sm rotate-2 z-20 pointer-events-none"></div>

                        <div className="p-4 border-b-2 border-dashed border-gray-300 font-handwriting font-bold text-xl flex items-center gap-2 text-gray-800">
                            <Map size={20} />
                            Navigasi Soal
                        </div>
                        <div className="p-4 flex-1 overflow-y-auto">
                            <div className="grid grid-cols-5 gap-2.5">
                                {sortedQuestions.map((q, idx) => (
                                    <button
                                        key={q.id}
                                        onClick={() => setCurrentIndex(idx)}
                                        className={cn(
                                            "aspect-square rounded-lg font-handwriting font-bold text-lg flex items-center justify-center transition-all border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px]",
                                            currentIndex === idx ? 'ring-2 ring-blue-400 ring-offset-2 border-blue-600 z-10' : '',
                                            marked[q.id]
                                                ? 'bg-yellow-400 text-yellow-900 border-yellow-600'
                                                : answers[q.id]
                                                    ? 'bg-blue-500 text-white border-blue-700'
                                                    : 'bg-white text-gray-500 border-gray-300 hover:border-gray-500'
                                        )}
                                    >
                                        {idx + 1}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="p-4 border-t-2 border-dashed border-gray-300 bg-gray-50/50 rounded-b-lg">
                            <button
                                onClick={() => setShowExitModal(true)}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 border-red-200 text-red-600 bg-red-50 hover:bg-red-100 hover:border-red-300 font-handwriting font-bold transition-all text-base dashed"
                            >
                                <LogOut size={18} /> Keluar Latihan
                            </button>
                            <div className="mt-4 p-3 bg-white border-2 border-gray-200 text-xs text-gray-600 space-y-1.5 rounded-lg font-handwriting font-bold shadow-sm">
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500 border border-blue-700"></div><span>Dijawab</span></div>
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-yellow-400 border border-yellow-600"></div><span>Ragu-ragu</span></div>
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-white border-2 border-gray-300"></div><span>Belum dijawab</span></div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    )
}
