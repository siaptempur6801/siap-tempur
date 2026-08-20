'use client'

import Image from 'next/image'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Check, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Flag, LogOut, Map } from 'lucide-react'
import MathRenderer from '@/components/MathRenderer'
import { cn } from '@/lib/utils'
import { finishPractice, submitAnswer, submitAnswerOptions } from '@/app/actions/practice'
import type { PracticeQuestionView } from '@/src/services/practice-session.service'

type Props = {
    sessionId: string
    questions: PracticeQuestionView[]
    initialAnswers: Record<string, string>
    initialAnswerOptions: Record<string, string[]>
    initialCurrentIndex: number
    initialMarked: Record<string, boolean>
    endTime?: string
    returnPath: string
    resultPath: (sessionId: string) => string
}

type SyncState = {
    inFlight: boolean
    latestIds: string[]
    inflightPromise: Promise<void> | null
}

function sameSelection(left: string[], right: string[]) {
    if (left.length !== right.length) return false
    const a = [...left].sort()
    const b = [...right].sort()
    return a.every((value, index) => value === b[index])
}

function responseInstruction(type: string) {
    if (type === 'multiple_choice') return 'Pilih semua jawaban yang benar.'
    if (type === 'category') return 'Pilih satu jawaban pada setiap kelompok.'
    return 'Pilih satu jawaban yang paling tepat.'
}

function formatRemaining(milliseconds: number) {
    const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000))
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':')
}

export default function UniversalPracticeSessionClient({
    sessionId,
    questions,
    initialAnswers,
    initialAnswerOptions,
    initialCurrentIndex,
    initialMarked,
    endTime,
    returnPath,
    resultPath,
}: Props) {
    const router = useRouter()
    const [currentIndex, setCurrentIndex] = useState(initialCurrentIndex)
    const [singleAnswers, setSingleAnswers] = useState<Record<string, string>>(initialAnswers)
    const [multiAnswers, setMultiAnswers] = useState<Record<string, string[]>>(initialAnswerOptions)
    const [marked, setMarked] = useState<Record<string, boolean>>(initialMarked)
    const [finishing, setFinishing] = useState(false)
    const [remainingMs, setRemainingMs] = useState<number | null>(null)
    const syncStateRef = useRef<Record<string, SyncState>>({})
    const finishedRef = useRef(false)

    const currentQuestion = questions[currentIndex] ?? null

    const selectedIdsFor = useCallback((question: PracticeQuestionView) => {
        if (question.response_type === 'single_choice') {
            const selected = singleAnswers[question.id]
            return selected ? [selected] : []
        }
        return multiAnswers[question.id] ?? []
    }, [multiAnswers, singleAnswers])

    const answeredQuestionIds = useMemo(() => {
        const answered = new Set<string>()
        for (const question of questions) {
            if (selectedIdsFor(question).length > 0) answered.add(question.id)
        }
        return answered
    }, [questions, selectedIdsFor])

    const syncSelection = useCallback(async (question: PracticeQuestionView): Promise<void> => {
        const state = syncStateRef.current[question.id]
        if (!state) return
        if (state.inFlight) return state.inflightPromise ?? Promise.resolve()

        const selection = [...state.latestIds]
        state.inFlight = true
        const request = (question.response_type === 'single_choice'
            ? selection[0]
                ? submitAnswer(sessionId, question.id, selection[0])
                : Promise.resolve({ error: 'Jawaban kosong.' })
            : submitAnswerOptions(sessionId, question.id, selection))
            .then((result) => {
                if (result?.error && sameSelection(state.latestIds, selection)) {
                    toast.error(result.error)
                }
            })
            .catch(() => {
                if (sameSelection(state.latestIds, selection)) toast.error('Gagal menyimpan jawaban.')
            })
            .then(async () => {
                state.inFlight = false
                if (!sameSelection(state.latestIds, selection)) await syncSelection(question)
            })

        state.inflightPromise = request
        return request
    }, [sessionId])

    const queueSelection = useCallback((question: PracticeQuestionView, nextIds: string[]) => {
        const state = syncStateRef.current[question.id] ?? {
            inFlight: false,
            latestIds: [],
            inflightPromise: null,
        }
        state.latestIds = [...nextIds]
        syncStateRef.current[question.id] = state
        void syncSelection(question)
    }, [syncSelection])

    const handleSelect = useCallback((question: PracticeQuestionView, optionId: string) => {
        if (question.response_type === 'single_choice') {
            setSingleAnswers((previous) => ({ ...previous, [question.id]: optionId }))
            queueSelection(question, [optionId])
            return
        }

        setMultiAnswers((previous) => {
            const current = previous[question.id] ?? []
            let next: string[]

            if (question.response_type === 'category') {
                const selectedOption = question.options.find((option) => option.id === optionId)
                const selectedGroup = selectedOption?.response_group ?? null
                const optionIdsInGroup = new Set(
                    question.options
                        .filter((option) => (option.response_group ?? null) === selectedGroup)
                        .map((option) => option.id),
                )
                const withoutGroup = current.filter((id) => !optionIdsInGroup.has(id))
                next = current.includes(optionId) ? withoutGroup : [...withoutGroup, optionId]
            } else {
                next = current.includes(optionId)
                    ? current.filter((id) => id !== optionId)
                    : [...current, optionId]
            }

            queueSelection(question, next)
            return { ...previous, [question.id]: next }
        })
    }, [queueSelection])

    const persistProgress = useCallback((index: number, nextMarked: Record<string, boolean>) => {
        void fetch(`/api/practice-sessions/${sessionId}/beacon`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentQuestionIndex: index, markedQuestions: nextMarked }),
        }).catch(() => undefined)
    }, [sessionId])

    const navigate = useCallback((index: number) => {
        const next = Math.max(0, Math.min(questions.length - 1, index))
        setCurrentIndex(next)
        persistProgress(next, marked)
    }, [marked, persistProgress, questions.length])

    const toggleMarked = useCallback(() => {
        if (!currentQuestion) return
        setMarked((previous) => {
            const next = { ...previous, [currentQuestion.id]: !previous[currentQuestion.id] }
            persistProgress(currentIndex, next)
            return next
        })
    }, [currentIndex, currentQuestion, persistProgress])

    const flushAnswers = useCallback(async () => {
        const pending = questions.filter((question) => syncStateRef.current[question.id])
        await Promise.all(pending.map((question) => syncSelection(question)))
    }, [questions, syncSelection])

    const finish = useCallback(async (automatic = false) => {
        if (finishedRef.current || finishing) return
        finishedRef.current = true
        setFinishing(true)
        try {
            await flushAnswers()
            const result = await finishPractice(sessionId)
            if (result?.error) {
                finishedRef.current = false
                setFinishing(false)
                toast.error(result.error)
                return
            }
            toast.success(automatic ? 'Waktu habis. Jawaban sudah dikirim.' : 'Tryout selesai.')
            router.push(resultPath(sessionId))
        } catch {
            finishedRef.current = false
            setFinishing(false)
            toast.error('Gagal menyelesaikan tryout.')
        }
    }, [finishPractice, finishing, flushAnswers, resultPath, router, sessionId])

    useEffect(() => {
        if (!endTime || finishing) {
            if (!endTime) setRemainingMs(null)
            return
        }
        const tick = () => {
            const remaining = Date.parse(endTime) - Date.now()
            setRemainingMs(Math.max(0, remaining))
            if (remaining <= 0) void finish(true)
        }
        tick()
        const timer = window.setInterval(tick, 1000)
        return () => window.clearInterval(timer)
    }, [endTime, finish, finishing])

    if (!currentQuestion) {
        return <main className="min-h-screen bg-[#fdfbf7] p-8 text-center font-bold">Tidak ada soal pada attempt ini.</main>
    }

    const selectedIds = selectedIdsFor(currentQuestion)
    const categoryGroups = currentQuestion.response_type === 'category'
        ? Array.from(new Map(currentQuestion.options.map((option) => [option.response_group ?? 'Kelompok', option.response_group ?? 'Kelompok'])).keys())
        : []
    const markedCount = Object.values(marked).filter(Boolean).length

    const renderOption = (option: PracticeQuestionView['options'][number], index: number) => {
        const selected = selectedIds.includes(option.id)
        return (
            <button
                key={option.id}
                type="button"
                onClick={() => handleSelect(currentQuestion, option.id)}
                className={cn(
                    'w-full border-2 p-3 text-left transition shadow-[2px_2px_0_0_#bbb]',
                    selected ? 'border-blue-700 bg-blue-100 shadow-none translate-x-0.5 translate-y-0.5' : 'border-gray-300 bg-white hover:border-gray-900',
                )}
            >
                <div className="flex items-start gap-3">
                    <span className={cn(
                        'flex h-7 min-w-7 items-center justify-center border-2 border-gray-900 text-xs font-black',
                        selected ? 'bg-blue-700 text-white' : 'bg-white',
                    )}>
                        {selected ? <Check size={15}/> : option.key || String.fromCharCode(65 + index)}
                    </span>
                    <div className="min-w-0 flex-1 space-y-2 font-semibold text-gray-800">
                        {option.image_url && (
                            <Image src={option.image_url} alt="Pilihan jawaban" width={640} height={360} unoptimized className="max-h-56 w-auto max-w-full object-contain" />
                        )}
                        <MathRenderer text={option.content} />
                    </div>
                </div>
            </button>
        )
    }

    return (
        <main className="min-h-screen bg-[#fdfbf7] p-3 text-gray-900 md:p-6">
            <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[1fr_280px]">
                <section className="min-w-0 space-y-4">
                    <header className="flex flex-wrap items-center justify-between gap-3 border-2 border-gray-900 bg-white p-4 shadow-[4px_4px_0_0_#111]">
                        <div>
                            <div className="text-xs font-black uppercase text-blue-700">{currentQuestion.type} · {currentQuestion.response_type}</div>
                            <div className="mt-1 text-xl font-black">Soal {currentIndex + 1} / {questions.length}</div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button type="button" onClick={toggleMarked} className={cn('border-2 border-gray-900 px-3 py-2 font-black', marked[currentQuestion.id] ? 'bg-yellow-300' : 'bg-white')}>
                                <Flag size={16}/>
                            </button>
                            {remainingMs !== null && (
                                <div className={cn('inline-flex items-center gap-2 border-2 border-gray-900 px-3 py-2 font-mono font-black', remainingMs <= 300000 ? 'bg-red-100 text-red-700' : 'bg-cyan-100')}>
                                    <Clock3 size={16}/>{formatRemaining(remainingMs)}
                                </div>
                            )}
                        </div>
                    </header>

                    {currentQuestion.stimulus && (
                        <article className="border-2 border-gray-900 bg-yellow-50 p-5 shadow-[4px_4px_0_0_#bbb]">
                            {currentQuestion.stimulus.title && <h2 className="mb-3 text-lg font-black">{currentQuestion.stimulus.title}</h2>}
                            {currentQuestion.stimulus.image_url && (
                                <Image src={currentQuestion.stimulus.image_url} alt="Stimulus soal" width={900} height={500} unoptimized className="mb-4 max-h-80 w-auto max-w-full object-contain" />
                            )}
                            <div className="whitespace-pre-wrap font-semibold leading-relaxed text-gray-800">
                                <MathRenderer text={currentQuestion.stimulus.content} />
                            </div>
                        </article>
                    )}

                    <article className="border-2 border-gray-900 bg-white p-5 shadow-[5px_5px_0_0_#111] md:p-7">
                        <div className="whitespace-pre-wrap text-lg font-bold leading-relaxed md:text-xl">
                            <MathRenderer text={currentQuestion.content} />
                        </div>
                        <p className="mt-4 border-t-2 border-dashed border-gray-200 pt-3 text-sm font-black text-blue-700">
                            {responseInstruction(currentQuestion.response_type)}
                        </p>

                        <div className="mt-5 space-y-3">
                            {currentQuestion.response_type === 'category' ? (
                                categoryGroups.map((group) => (
                                    <div key={group} className="space-y-2 border-2 border-dashed border-gray-300 bg-gray-50 p-3">
                                        <h3 className="text-sm font-black uppercase text-gray-600">{group}</h3>
                                        {currentQuestion.options
                                            .filter((option) => (option.response_group ?? 'Kelompok') === group)
                                            .map((option, index) => renderOption(option, index))}
                                    </div>
                                ))
                            ) : currentQuestion.options.map((option, index) => renderOption(option, index))}
                        </div>
                    </article>

                    <div className="flex items-center justify-between gap-3">
                        <button type="button" disabled={currentIndex === 0} onClick={() => navigate(currentIndex - 1)} className="inline-flex items-center gap-2 border-2 border-gray-900 bg-white px-4 py-2 font-black disabled:opacity-40">
                            <ChevronLeft size={18}/> Sebelumnya
                        </button>
                        {currentIndex === questions.length - 1 ? (
                            <button type="button" disabled={finishing} onClick={() => void finish(false)} className="inline-flex items-center gap-2 border-2 border-gray-900 bg-blue-700 px-5 py-2 font-black text-white disabled:opacity-50">
                                <CheckCircle2 size={18}/>{finishing ? 'Menghitung...' : 'Selesai'}
                            </button>
                        ) : (
                            <button type="button" onClick={() => navigate(currentIndex + 1)} className="inline-flex items-center gap-2 border-2 border-gray-900 bg-gray-900 px-4 py-2 font-black text-white">
                                Selanjutnya <ChevronRight size={18}/>
                            </button>
                        )}
                    </div>
                </section>

                <aside className="h-fit border-2 border-gray-900 bg-white p-4 shadow-[4px_4px_0_0_#111] lg:sticky lg:top-6">
                    <h2 className="flex items-center gap-2 font-black"><Map size={18}/> Navigasi Soal</h2>
                    <div className="mt-4 grid grid-cols-5 gap-2">
                        {questions.map((question, index) => (
                            <button
                                key={question.id}
                                type="button"
                                onClick={() => navigate(index)}
                                className={cn(
                                    'aspect-square border-2 border-gray-900 text-sm font-black',
                                    currentIndex === index ? 'ring-2 ring-blue-500 ring-offset-1' : '',
                                    marked[question.id] ? 'bg-yellow-300' : answeredQuestionIds.has(question.id) ? 'bg-blue-600 text-white' : 'bg-white',
                                )}
                            >
                                {index + 1}
                            </button>
                        ))}
                    </div>
                    <div className="mt-4 space-y-1 border-t-2 border-dashed border-gray-300 pt-3 text-xs font-bold text-gray-600">
                        <p>{answeredQuestionIds.size} dijawab</p>
                        <p>{questions.length - answeredQuestionIds.size} belum dijawab</p>
                        <p>{markedCount} ditandai</p>
                    </div>
                    <button type="button" onClick={() => router.push(returnPath)} className="mt-4 inline-flex w-full items-center justify-center gap-2 border-2 border-red-300 bg-red-50 px-3 py-2 font-black text-red-700">
                        <LogOut size={17}/> Keluar & lanjut nanti
                    </button>
                </aside>
            </div>
        </main>
    )
}
