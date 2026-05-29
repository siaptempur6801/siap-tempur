'use client'

import { memo, useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { submitAnswer, finishPractice } from '@/app/actions/practice'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, CheckCircle2, Clock, Map, Flag, LogOut, Key, Sparkles, X, ZoomIn } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn, formatSubjectName } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import PaperBackground from '@/components/PaperBackground'
import MathRenderer from '@/components/MathRenderer'


interface Question {
    id: string
    content: string
    type: string
    category?: string
    sub_category?: string
    image_url?: string | null
    options: {
        id: string
        content: string
        image_url?: string | null
    }[]
}

interface Props {
    sessionId: string
    questions: Question[]
    initialAnswers: Record<string, string> // questionId -> optionId
    initialCurrentIndex: number
    initialMarked: Record<string, boolean>
    endTime?: string // ISO string for tryout mode
    isTryout?: boolean
    returnTo?: 'tryout' | 'event'
}

type SessionProgressSnapshot = {
    sessionId: string
    currentQuestionIndex: number
    markedQuestions: Record<string, boolean>
}

type AnswerSyncState = {
    inFlight: boolean
    latestOptionId: string | null
    inflightPromise: Promise<void> | null
}

function getSessionStorageKey(sessionId: string) {
    return `cpns-practice-session:${sessionId}`
}

function saveProgressToLocalStorage(snapshot: SessionProgressSnapshot) {
    if (typeof window === 'undefined') return

    window.localStorage.setItem(
        getSessionStorageKey(snapshot.sessionId),
        JSON.stringify({
            currentQuestionIndex: snapshot.currentQuestionIndex,
            markedQuestions: snapshot.markedQuestions
        })
    )
}

function loadProgressFromLocalStorage(sessionId: string) {
    if (typeof window === 'undefined') return null

    try {
        const raw = window.localStorage.getItem(getSessionStorageKey(sessionId))
        if (!raw) return null

        const parsed = JSON.parse(raw) as {
            currentQuestionIndex?: number
            markedQuestions?: Record<string, boolean>
        }

        return {
            currentQuestionIndex: typeof parsed.currentQuestionIndex === 'number' ? parsed.currentQuestionIndex : null,
            markedQuestions: parsed.markedQuestions && typeof parsed.markedQuestions === 'object' ? parsed.markedQuestions : null
        }
    } catch {
        return null
    }
}

function clearProgressFromLocalStorage(sessionId: string) {
    if (typeof window === 'undefined') return
    window.localStorage.removeItem(getSessionStorageKey(sessionId))
}

async function saveProgressSnapshot(snapshot: SessionProgressSnapshot, previousSerializedSnapshot: string, force = false) {
    const serialized = JSON.stringify(snapshot)

    if (!force && serialized === previousSerializedSnapshot) {
        return { serialized, skipped: true, success: false }
    }

    const response = await fetch(`/api/practice-sessions/${snapshot.sessionId}/beacon`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            currentQuestionIndex: snapshot.currentQuestionIndex,
            markedQuestions: snapshot.markedQuestions
        })
    })

    if (!response.ok) {
        return { serialized, skipped: false, success: false }
    }

    return { serialized, skipped: false, success: true }
}

function flushProgressWithBeacon(snapshot: SessionProgressSnapshot) {
    const payload = JSON.stringify({
        currentQuestionIndex: snapshot.currentQuestionIndex,
        markedQuestions: snapshot.markedQuestions
    })
    const endpoint = `/api/practice-sessions/${snapshot.sessionId}/beacon`

    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        const blob = new Blob([payload], { type: 'application/json' })
        const queued = navigator.sendBeacon(endpoint, blob)

        if (queued) {
            return true
        }
    }

    void fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: payload,
        keepalive: true
    })

    return false
}

const QuestionPrompt = memo(function QuestionPrompt({ question }: { question: Question }) {
    const [previewImage, setPreviewImage] = useState<string | null>(null)

    return (
        <>
            {question.image_url && (
                <>
                    <div 
                        className="w-full max-w-sm mx-auto rounded-xl border-2 border-gray-900 overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white relative cursor-pointer group"
                        onClick={() => setPreviewImage(question.image_url!)}
                    >
                        <div className="absolute top-2 left-2 z-10 p-1.5 bg-yellow-300 border-2 border-gray-900 rounded shadow-sm transform -rotate-2">
                            <Sparkles size={14} className="text-gray-900" />
                        </div>
                        <Image
                            src={question.image_url}
                            alt="Ilustrasi Soal"
                            width={800}
                            height={400}
                            className="w-full h-auto object-contain max-h-[200px]"
                            unoptimized
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="bg-white px-3 py-1.5 rounded-lg border-2 border-gray-900 font-bold font-handwriting text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2">
                                <ZoomIn size={16} /> Perbesar Gambar
                            </div>
                        </div>
                    </div>
                    
                    <AnimatePresence>
                        {previewImage && (
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" 
                                onClick={() => setPreviewImage(null)}
                            >
                                <motion.div 
                                    initial={{ scale: 0.95 }}
                                    animate={{ scale: 1 }}
                                    exit={{ scale: 0.95 }}
                                    className="relative max-w-5xl w-full max-h-[90vh] bg-[#fff9c4] border-2 border-gray-900 rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-4 flex flex-col" 
                                    onClick={e => e.stopPropagation()}
                                >
                                     <button 
                                        onClick={() => setPreviewImage(null)}
                                        className="absolute -top-4 -right-4 w-10 h-10 bg-red-500 hover:bg-red-600 text-white rounded-full border-2 border-gray-900 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] z-10 transition-transform hover:scale-110 active:scale-95"
                                     >
                                         <X size={20} />
                                     </button>
                                     <div className="w-full h-full flex-1 overflow-auto flex items-center justify-center bg-white rounded-lg border-2 border-gray-900 p-2">
                                         <Image
                                             src={previewImage}
                                             alt="Preview"
                                             width={1200}
                                             height={800}
                                             className="max-w-full max-h-[80vh] object-contain"
                                             unoptimized
                                         />
                                     </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </>
            )}
            <div className="prose dark:prose-invert max-w-none font-handwriting text-gray-900">
                <div className="text-xl md:text-2xl leading-relaxed font-bold whitespace-pre-wrap">
                    <MathRenderer text={question.content} />
                </div>
            </div>
        </>
    )
})

const QuestionOptionCard = memo(function QuestionOptionCard({
    option,
    index,
    isSelected,
    onSelect
}: {
    option: Question['options'][number]
    index: number
    isSelected: boolean
    onSelect: (optionId: string) => void
}) {
    const [previewImage, setPreviewImage] = useState<string | null>(null)

    return (
        <>
            <button
                type="button"
                onClick={() => onSelect(option.id)}
                className={cn(
                    "w-full px-3 py-1.5 md:px-4 md:py-2 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-4 group relative overflow-hidden text-left touch-manipulation",
                    isSelected
                        ? 'border-blue-600 bg-blue-50 shadow-[2px_2px_0px_0px_rgba(37,99,235,1)] translate-x-px translate-y-px'
                        : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50/30 hover:shadow-[2px_2px_0px_0px_rgba(59,130,246,0.2)]'
                )}
            >
                {isSelected && (
                    <div className="absolute inset-x-0 bottom-2 top-2 bg-blue-400/20 -z-10" />
                )}

                <div className={cn(
                    "w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 font-handwriting font-bold text-lg transition-colors",
                    isSelected
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-gray-400 text-gray-400 group-hover:border-blue-400 group-hover:text-blue-400'
                )}>
                    {String.fromCharCode(65 + index)}
                </div>
                <div className={cn(
                    "flex-1 space-y-2 text-base md:text-lg leading-relaxed font-handwriting",
                    isSelected ? 'font-bold text-blue-900' : 'text-gray-600 font-medium'
                )}>
                    {option.image_url && (
                        <div 
                            className="relative max-h-44 w-full max-w-sm rounded-lg border-2 border-gray-200 bg-white overflow-hidden group/img cursor-pointer"
                            onClick={(e) => {
                                e.stopPropagation() // prevent selecting the option when clicking image
                                setPreviewImage(option.image_url!)
                            }}
                        >
                            <Image
                                src={option.image_url}
                                alt={`Pilihan ${String.fromCharCode(65 + index)}`}
                                width={360}
                                height={240}
                                unoptimized
                                className="w-full h-full object-contain max-h-44"
                            />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">
                                <div className="bg-white p-2 rounded-full border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-gray-900">
                                    <ZoomIn size={18} />
                                </div>
                            </div>
                        </div>
                    )}
                    {option.content.trim() && <MathRenderer text={option.content} />}
                </div>
            </button>

            <AnimatePresence>
                {previewImage && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" 
                        onClick={() => setPreviewImage(null)}
                    >
                        <motion.div 
                            initial={{ scale: 0.95 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.95 }}
                            className="relative max-w-5xl w-full max-h-[90vh] bg-[#fff9c4] border-2 border-gray-900 rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-4 flex flex-col" 
                            onClick={e => e.stopPropagation()}
                        >
                             <button 
                                onClick={() => setPreviewImage(null)}
                                className="absolute -top-4 -right-4 w-10 h-10 bg-red-500 hover:bg-red-600 text-white rounded-full border-2 border-gray-900 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] z-10 transition-transform hover:scale-110 active:scale-95"
                             >
                                 <X size={20} />
                             </button>
                             <div className="w-full h-full flex-1 overflow-auto flex items-center justify-center bg-white rounded-lg border-2 border-gray-900 p-2">
                                 <Image
                                     src={previewImage}
                                     alt="Preview"
                                     width={1200}
                                     height={800}
                                     className="max-w-full max-h-[80vh] object-contain"
                                     unoptimized
                                 />
                             </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
})

const TryoutTimerBadge = memo(function TryoutTimerBadge({
    endTime,
    hasFinished,
    onShowWarning5Min,
    onShowWarning1Min,
    onTimeExpired
}: {
    endTime: string
    hasFinished: boolean
    onShowWarning5Min: () => void
    onShowWarning1Min: () => void
    onTimeExpired: () => void
}) {
    const [timeLeft, setTimeLeft] = useState('01:40:00')
    const [timeLeftMs, setTimeLeftMs] = useState(0)
    const warning5ShownRef = useRef(false)
    const warning1ShownRef = useRef(false)
    const expiredHandledRef = useRef(false)

    useEffect(() => {
        warning5ShownRef.current = false
        warning1ShownRef.current = false
        expiredHandledRef.current = false
    }, [endTime])

    useEffect(() => {
        if (!endTime || hasFinished) return

        const tick = () => {
            const now = Date.now()
            const end = new Date(endTime).getTime()
            const diff = end - now

            if (diff <= 0) {
                setTimeLeft('00:00:00')
                setTimeLeftMs(0)

                if (!expiredHandledRef.current) {
                    expiredHandledRef.current = true
                    onTimeExpired()
                }
                return
            }

            setTimeLeftMs(diff)

            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
            const seconds = Math.floor((diff % (1000 * 60)) / 1000)

            setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)

            if (diff <= 5 * 60 * 1000 && diff > 60 * 1000 && !warning5ShownRef.current) {
                warning5ShownRef.current = true
                onShowWarning5Min()
            }

            if (diff <= 60 * 1000 && !warning1ShownRef.current) {
                warning1ShownRef.current = true
                onShowWarning1Min()
            }
        }

        tick()
        const interval = window.setInterval(tick, 1000)
        return () => window.clearInterval(interval)
    }, [endTime, hasFinished, onShowWarning5Min, onShowWarning1Min, onTimeExpired])

    return (
        <div className={cn(
            "px-2 py-1 md:px-4 md:py-1 rounded-full text-[10px] md:text-sm font-mono flex items-center gap-1 md:gap-1.5 transition-all duration-300 border",
            timeLeftMs <= 60000 ? "bg-red-50 text-red-600 border-red-500 animate-pulse border-2 md:shadow-[2px_2px_0px_0px_rgba(239,68,68,1)]" :
                timeLeftMs <= 300000 ? "bg-orange-50 text-orange-600 border-orange-500 border-2 md:shadow-[2px_2px_0px_0px_rgba(249,115,22,1)]" :
                    "bg-blue-50 text-blue-700 border-blue-900 border-2 md:shadow-[2px_2px_0px_0px_rgba(30,58,138,1)]"
        )}>
            <Clock size={11} className="md:w-3.5 md:h-3.5" />
            <span>{timeLeft}</span>
        </div>
    )
})

export default function PracticeSessionClient({
    sessionId,
    questions,
    initialAnswers,
    initialCurrentIndex,
    initialMarked,
    endTime,
    isTryout = false,
    returnTo = 'tryout'
}: Props) {
    const router = useRouter()
    const [currentIndex, setCurrentIndex] = useState(initialCurrentIndex)
    const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers)
    const [marked, setMarked] = useState<Record<string, boolean>>(initialMarked)
    const [finishing, setFinishing] = useState(false)

    const [hasFinished, setHasFinished] = useState(false)
    const [showWarning5Min, setShowWarning5Min] = useState(false)
    const [showWarning1Min, setShowWarning1Min] = useState(false)
    const [showMobileNav, setShowMobileNav] = useState(false)
    const [showConfirmModal, setShowConfirmModal] = useState(false)
    const [showExitModal, setShowExitModal] = useState(false)
    const [showNav, setShowNav] = useState(true) // Toggleable desktop side nav
    const [hasHydratedResumeState, setHasHydratedResumeState] = useState(false)
    const lastSavedSnapshotRef = useRef('')
    const latestSnapshotRef = useRef<SessionProgressSnapshot | null>(null)
    const answerSyncStateRef = useRef<Record<string, AnswerSyncState>>({})

    // Subcategory sorting and limits are now handled by dynamic tryout_configurations in the database fetch
    const sortedQuestions = useMemo(() => {
        return questions
    }, [questions])

    const currentQuestion = sortedQuestions[currentIndex]
    const currentQuestionId = currentQuestion?.id ?? ''

    const syncProgressSnapshot = useCallback((nextIndex: number, nextMarked: Record<string, boolean>) => {
        if (hasFinished) return

        const snapshot = {
            sessionId,
            currentQuestionIndex: nextIndex,
            markedQuestions: nextMarked
        }

        latestSnapshotRef.current = snapshot
        saveProgressToLocalStorage(snapshot)
    }, [hasFinished, sessionId])

    const handleNavigateToIndex = useCallback((nextIndex: number) => {
        const safeIndex = Math.max(0, Math.min(sortedQuestions.length - 1, nextIndex))
        setCurrentIndex(safeIndex)
        syncProgressSnapshot(safeIndex, marked)
    }, [marked, sortedQuestions.length, syncProgressSnapshot])

    const handlePreviousQuestion = useCallback(() => {
        handleNavigateToIndex(currentIndex - 1)
    }, [currentIndex, handleNavigateToIndex])

    const handleNextQuestion = useCallback(() => {
        handleNavigateToIndex(currentIndex + 1)
    }, [currentIndex, handleNavigateToIndex])

    const handleFinishSession = useCallback(async () => {
        if (finishing) return // Prevent double click
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
                clearProgressFromLocalStorage(sessionId)
                toast.success(isTryout ? 'Tryout selesai!' : 'Tryout selesai!')
                router.push(`/cpns/dashboard/tryout/${sessionId}/result${returnTo === 'event' ? '?from=event' : ''}`)
            }
        } catch (error) {
            console.error('Error finishing practice:', error)
            toast.error('Gagal menyelesaikan tryout')
        } finally {
            setFinishing(false)
        }
    }, [finishing, hasFinished, isTryout, returnTo, sessionId, router])

    useEffect(() => {
        const savedProgress = loadProgressFromLocalStorage(sessionId)
        if (savedProgress) {
            if (
                typeof savedProgress.currentQuestionIndex === 'number' &&
                savedProgress.currentQuestionIndex >= 0 &&
                savedProgress.currentQuestionIndex < sortedQuestions.length
            ) {
                setCurrentIndex(savedProgress.currentQuestionIndex)
            }

            if (savedProgress.markedQuestions) {
                setMarked(savedProgress.markedQuestions)
            }
        }

        setHasHydratedResumeState(true)
    }, [sessionId, sortedQuestions.length])

    useEffect(() => {
        if (!hasHydratedResumeState) {
            return
        }

        if (hasFinished) {
            latestSnapshotRef.current = null
            clearProgressFromLocalStorage(sessionId)
            return
        }

        latestSnapshotRef.current = {
            sessionId,
            currentQuestionIndex: currentIndex,
            markedQuestions: marked
        }

        saveProgressToLocalStorage(latestSnapshotRef.current)

        const timeout = window.setTimeout(() => {
            const snapshot = latestSnapshotRef.current
            if (!snapshot) return

            void saveProgressSnapshot(snapshot, lastSavedSnapshotRef.current)
                .then((result) => {
                    if (result.success || result.skipped) {
                        lastSavedSnapshotRef.current = result.serialized
                    }
                })
                .catch((error) => {
                    console.error('Failed to persist practice session progress:', error)
                })
        }, 700)

        return () => window.clearTimeout(timeout)
    }, [sessionId, currentIndex, marked, hasFinished, hasHydratedResumeState])

    useEffect(() => {
        const flushProgress = () => {
            if (latestSnapshotRef.current) {
                flushProgressWithBeacon(latestSnapshotRef.current)
            }
        }

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                flushProgress()
            }
        }

        window.addEventListener('pagehide', flushProgress)
        document.addEventListener('visibilitychange', handleVisibilityChange)

        return () => {
            window.removeEventListener('pagehide', flushProgress)
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    }, [])

    // Warn on browser refresh/close
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (!finishing && !hasFinished) {
                e.preventDefault()
                e.returnValue = '' // Chrome requires returnValue to be set
            }
        }

        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [finishing, hasFinished])

    const toggleMark = () => {
        setMarked(prev => {
            const nextMarked = {
                ...prev,
                [currentQuestionId]: !prev[currentQuestionId]
            }

            syncProgressSnapshot(currentIndex, nextMarked)
            return nextMarked
        })
    }

    const syncAnswerForQuestion = useCallback(async (questionId: string): Promise<void> => {
        const state = answerSyncStateRef.current[questionId]
        if (!state?.latestOptionId) return
        if (state.inFlight) {
            return state.inflightPromise ?? Promise.resolve()
        }

        const optionId = state.latestOptionId
        state.inFlight = true

        const request = submitAnswer(sessionId, questionId, optionId)
            .then((result) => {
                if (result?.error && state.latestOptionId === optionId) {
                    toast.error('Gagal menyimpan jawaban')
                }
            })
            .catch(() => {
                if (state.latestOptionId === optionId) {
                    toast.error('Gagal menyimpan jawaban')
                }
            })
            .then(async () => {
                state.inFlight = false

                if (state.latestOptionId !== optionId) {
                    await syncAnswerForQuestion(questionId)
                }
            })

        state.inflightPromise = request
        return request
    }, [sessionId])

    const flushPendingAnswers = useCallback(async () => {
        const pendingQuestionIds = Object.keys(answerSyncStateRef.current)
        if (pendingQuestionIds.length === 0) return

        await Promise.all(pendingQuestionIds.map((questionId) => syncAnswerForQuestion(questionId)))
    }, [syncAnswerForQuestion])

    const handleAutoFinish = useCallback(async () => {
        toast.info('Waktu habis! Tryout diselesaikan otomatis.')
        await flushPendingAnswers()
        await handleFinishSession()
    }, [flushPendingAnswers, handleFinishSession])

    const handleSelectOption = useCallback((optionId: string) => {
        const questionId = currentQuestionId
        if (!questionId) return

        if (answers[questionId] === optionId) return

        setAnswers(prev => ({ ...prev, [questionId]: optionId }))

        const currentState = answerSyncStateRef.current[questionId] ?? {
            inFlight: false,
            latestOptionId: null,
            inflightPromise: null
        }

        currentState.latestOptionId = optionId
        answerSyncStateRef.current[questionId] = currentState

        void syncAnswerForQuestion(questionId)
    }, [answers, currentQuestionId, syncAnswerForQuestion])

    const handleShowWarning5Min = useCallback(() => {
        setShowWarning5Min(true)
    }, [])

    const handleShowWarning1Min = useCallback(() => {
        setShowWarning1Min(true)
    }, [])

    const handleTimeExpired = useCallback(() => {
        if (hasFinished) return
        setHasFinished(true)
        void handleAutoFinish()
    }, [handleAutoFinish, hasFinished])


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
        await flushPendingAnswers()
        await handleFinishSession()
    }



    const handleExit = async () => {
        await flushPendingAnswers()

        const snapshot = latestSnapshotRef.current

        if (snapshot) {
            try {
                const result = await saveProgressSnapshot(snapshot, lastSavedSnapshotRef.current, true)
                if (result.success || result.skipped) {
                    lastSavedSnapshotRef.current = result.serialized
                }
            } catch (error) {
                console.error('Failed to save progress before exit:', error)
            }
        }

        router.push(returnTo === 'event' ? '/cpns/dashboard/event' : '/cpns/dashboard/tryout')
    }

    // Safety check - prevent crash if no questions available
    if (!currentQuestion || sortedQuestions.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center text-muted-foreground">
                    <p className="text-lg font-semibold">Tidak ada soal tersedia</p>
                    <p className="text-sm">Silakan kembali ke halaman tryout</p>
                </div>
            </div>
        )
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
                                                handleNavigateToIndex(idx)
                                                setShowMobileNav(false)
                                            }}
                                            className={cn(
                                                "aspect-square rounded-lg font-handwriting font-bold text-lg flex items-center justify-center transition-all border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-none hover:translate-x-px hover:translate-y-px",
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
                                    <LogOut size={18} /> Keluar Tryout
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
                <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-[#fff9c4] border-2 border-gray-900 rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-sm w-full p-8 animate-in zoom-in-95 duration-200 relative overflow-hidden">
                        <PaperBackground />
                        <div className="relative z-10 flex flex-col items-center text-center space-y-4 font-handwriting">
                            <div className="w-16 h-16 bg-red-100 border-2 border-red-600 rounded-full flex items-center justify-center mb-2 rotate-3 shadow-sm">
                                <LogOut size={32} className="text-red-600" />
                            </div>

                            <h3 className="text-3xl font-bold text-gray-900">Keluar Tryout?</h3>

                            <p className="text-lg text-gray-700 font-medium flex items-center justify-center gap-2">
                                Progres tryout dan nomor soal terakhir akan tersimpan. Anda bisa lanjut lagi nanti dari {returnTo === 'event' ? 'halaman event' : 'dashboard'}.
                            </p>

                            <div className="grid grid-cols-2 gap-4 w-full mt-4">
                                <button
                                    onClick={() => setShowExitModal(false)}
                                    className="px-4 py-2 rounded-lg border-2 border-gray-900 bg-white hover:bg-gray-50 transition font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-px active:translate-y-px active:shadow-none"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleExit}
                                    className="px-4 py-2 rounded-lg bg-red-600 text-white border-2 border-gray-900 hover:bg-red-700 transition font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-px active:translate-y-px active:shadow-none"
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
                {isTryout && showWarning5Min && (
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
                                    className="bg-orange-500 text-white px-10 py-3 rounded-lg border-2 border-gray-900 font-bold text-xl hover:bg-orange-600 transition shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-px active:translate-y-px active:shadow-none"
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
                                    className="bg-red-600 text-white px-10 py-4 rounded-lg border-2 border-gray-900 font-bold text-2xl hover:bg-red-700 transition shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-px active:translate-y-px active:shadow-none"
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

                            <h3 className="text-3xl font-bold text-gray-900">Selesaikan Tryout?</h3>

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
                                    className="px-4 py-3 rounded-xl border-2 border-gray-900 bg-white hover:bg-gray-50 transition font-bold text-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-px active:translate-y-px active:shadow-none"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleConfirmFinish}
                                    className="px-4 py-3 rounded-xl bg-blue-600 text-white border-2 border-gray-900 hover:bg-blue-700 transition font-bold text-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-px active:translate-y-px active:shadow-none"
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
                <div className="flex-1 flex flex-col bg-white/80 backdrop-blur-sm border-2 border-gray-900 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] md:overflow-hidden relative">
                    {/* Header - Optimized for Mobile */}
                    <div className="border-b-2 border-dashed border-gray-300 bg-yellow-50/50 p-2 md:p-4">
                        <div className="flex items-center justify-between gap-2">
                            {/* Left: Nav & Info */}
                            <div className="flex items-center gap-2 overflow-hidden min-w-0">
                                <div className="flex flex-col gap-0.5 md:gap-1 overflow-hidden">
                                    <div className="flex items-baseline gap-1">
                                        <span className="font-handwriting font-bold text-xl md:text-2xl text-gray-900 leading-tight">Soal #{currentIndex + 1}</span>
                                        <span className="font-handwriting text-sm text-gray-500 md:text-lg">/ {sortedQuestions.length}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="px-1.5 py-0.5 bg-gray-900 text-white text-[9px] md:text-[11px] font-bold rounded uppercase tracking-wider">
                                            {currentQuestion.type}
                                        </span>
                                        {currentQuestion.category && (
                                            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 border border-blue-200 text-[9px] md:text-xs font-bold font-handwriting rounded md:shadow-sm">
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
                                        "w-7 h-7 md:w-auto md:h-auto md:px-4 md:py-1 text-[10px] md:text-sm gap-1 md:gap-1.5 font-handwriting font-bold shadow-none", // Circle on mobile, Pill on desktop
                                        marked[currentQuestion.id]
                                            ? 'bg-yellow-100 text-yellow-700 border-2 border-yellow-400 rotate-1 md:shadow-[2px_2px_0px_0px_rgba(202,138,4,1)]'
                                            : 'bg-white border-2 border-gray-300 text-gray-500 hover:bg-gray-50 hover:border-gray-400 md:shadow-[2px_2px_0px_0px_rgba(156,163,175,1)]'
                                    )}
                                    title={marked[currentQuestion.id] ? 'Hilangkan tanda ragu' : 'Tandai ragu'}
                                >
                                    <Flag size={14} className={cn(marked[currentQuestion.id] ? 'fill-current' : '')} />
                                    <span className="hidden md:inline ml-2">{marked[currentQuestion.id] ? 'Ditandai Ragu' : 'Tandai Ragu'}</span>
                                </button>

                                {isTryout ? (
                                    <TryoutTimerBadge
                                        endTime={endTime!}
                                        hasFinished={hasFinished}
                                        onShowWarning5Min={handleShowWarning5Min}
                                        onShowWarning1Min={handleShowWarning1Min}
                                        onTimeExpired={handleTimeExpired}
                                    />
                                ) : (
                                    <div className="hidden md:flex px-4 py-1.5 bg-white border-2 border-gray-900 rounded-full text-xs md:text-sm font-handwriting font-bold items-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                        <Clock size={14} />
                                        <span>Tryout Santai</span>
                                    </div>
                                )}

                                <button
                                    onClick={() => setShowNav(!showNav)}
                                    className={cn(
                                        "hidden lg:flex px-2.5 md:px-3 h-7 md:h-8 rounded-full border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all items-center justify-center",
                                        showNav
                                            ? "bg-blue-50 text-blue-700 border-blue-900 hover:bg-blue-100"
                                            : "bg-white text-gray-500 border-gray-300 hover:bg-gray-50 hover:border-gray-400"
                                    )}
                                    title={showNav ? "Sembunyikan Navigasi" : "Tampilkan Navigasi"}
                                >
                                    <motion.div
                                        animate={{ rotate: showNav ? 0 : 180 }}
                                        className="transition-colors"
                                    >
                                        <Map size={14} />
                                    </motion.div>
                                </button>

                                <button
                                    onClick={() => setShowMobileNav(true)}
                                    className="lg:hidden w-8 h-8 md:w-9 md:h-9 rounded-full border-2 border-gray-300 bg-white text-gray-500 hover:bg-gray-50 hover:border-gray-400 shrink-0 shadow-none flex items-center justify-center"
                                >
                                    <Map size={14} className="md:w-4 md:h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Content Area - Unified Scroll */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="flex-1 overflow-y-auto">
                            <div className="p-4 md:p-6 flex flex-col gap-6">
                                <div className="pb-4 md:pb-6 border-b-2 border-dashed border-gray-200 flex flex-col gap-4">
                                    <QuestionPrompt question={currentQuestion} />
                                </div>

                                <div className="space-y-2 md:space-y-3">
                                    {currentQuestion.options.map((option, i) => {
                                        const isSelected = answers[currentQuestion.id] === option.id
                                        return (
                                            <QuestionOptionCard
                                                key={option.id}
                                                option={option}
                                                index={i}
                                                isSelected={isSelected}
                                                onSelect={handleSelectOption}
                                            />
                                        )
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Mobile Navigation - Slimmed Down */}
                        <div className="shrink-0 p-4 border-t-2 border-dashed border-gray-300 flex justify-between items-center sm:hidden gap-3 bg-white/50 backdrop-blur-sm z-10">
                            <button
                                onClick={handlePreviousQuestion}
                                disabled={currentIndex === 0}
                                className="flex items-center justify-center w-12 h-12 rounded-xl border-2 border-gray-900 bg-white hover:bg-gray-50 disabled:opacity-50 transition shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-px active:translate-y-px active:shadow-none"
                            >
                                <ChevronLeft size={24} />
                            </button>

                            {currentIndex === sortedQuestions.length - 1 ? (
                                <button
                                    onClick={onFinishClick}
                                    disabled={finishing}
                                    className="flex-1 flex items-center justify-center gap-2 h-12 bg-blue-600 text-white rounded-xl border-2 border-gray-900 font-handwriting font-bold text-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-px active:translate-y-px active:shadow-none"
                                >
                                    {finishing ? '...' : 'Selesai'}
                                    <CheckCircle2 size={20} />
                                </button>
                            ) : (
                                <button
                                    onClick={handleNextQuestion}
                                    className="flex items-center justify-center w-12 h-12 bg-gray-900 text-white rounded-xl border-2 border-gray-900 shadow-[3px_3px_0px_0px_rgba(30,58,138,0.3)] active:translate-x-px active:translate-y-px active:shadow-none"
                                >
                                    <ChevronRight size={24} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Footer Nav - Desktop Only - Styled */}
                    <div className="hidden sm:flex p-4 border-t-2 border-dashed border-gray-300 justify-between items-center bg-white/50 backdrop-blur-sm">
                        <button
                            onClick={handlePreviousQuestion}
                            disabled={currentIndex === 0}
                            className="flex items-center gap-2 px-5 py-2 rounded-lg border-2 border-gray-900 font-handwriting font-bold hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-px active:translate-y-px active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                        >
                            <ChevronLeft size={20} />
                            Sebelumnya
                        </button>

                        {currentIndex === sortedQuestions.length - 1 ? (
                            <button
                                onClick={onFinishClick}
                                disabled={finishing}
                                className="flex items-center gap-2 px-8 py-2 bg-blue-600 text-white border-2 border-blue-800 rounded-lg hover:bg-blue-700 transition font-handwriting font-bold text-lg shadow-[3px_3px_0px_0px_rgba(30,58,138,1)] active:translate-x-px active:translate-y-px active:shadow-[1px_1px_0px_0px_rgba(30,58,138,1)]"
                            >
                                {finishing ? 'Menyimpan...' : 'Selesai & Hitung'}
                                <CheckCircle2 size={20} />
                            </button>
                        ) : (
                            <button
                                onClick={handleNextQuestion}
                                className="flex items-center gap-2 px-5 py-2 bg-gray-900 text-white border-2 border-gray-900 rounded-lg hover:bg-gray-800 transition font-handwriting font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] active:translate-x-px active:translate-y-px active:shadow-none"
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
                                        onClick={() => handleNavigateToIndex(idx)}
                                        className={cn(
                                            "aspect-square rounded-lg font-handwriting font-bold text-lg flex items-center justify-center transition-all border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-none hover:translate-x-px hover:translate-y-px",
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
                                <LogOut size={18} /> Keluar Tryout
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
