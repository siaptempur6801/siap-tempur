'use client'

import Image from 'next/image'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
    Check,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock3,
    Flag,
    LogOut,
    Map as MapIcon,
} from 'lucide-react'
import MathRenderer from '@/components/MathRenderer'
import { cn } from '@/lib/utils'
import {
    completeTkaFullExamSection,
    saveTkaFullExamAnswer,
    submitTkaFullExamAttempt,
} from '@/app/actions/tka-full-exam'
import type {
    TkaFullExamQuestionView,
    TkaFullExamState,
} from '@/src/services/tka-full-exam-rpc.service'

type SyncState = {
    inFlight: boolean
    latestIds: string[]
    latestFlag: boolean
    inflightPromise: Promise<void> | null
}

function sameSelection(left: string[], right: string[]) {
    if (left.length !== right.length) return false
    const a = [...left].sort()
    const b = [...right].sort()
    return a.every((value, index) => value === b[index])
}

function formatRemaining(milliseconds: number) {
    const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000))
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':')
}

function responseInstruction(type: string) {
    if (type === 'multiple_choice') return 'Pilih semua jawaban yang benar.'
    if (type === 'category') return 'Pilih satu jawaban pada setiap kelompok.'
    return 'Pilih satu jawaban yang paling tepat.'
}

function progressStorageKey(attemptId: string, sectionId: string | null) {
    return `tka-full-progress:${attemptId}:${sectionId ?? 'none'}`
}

export default function TkaFullExamSessionClient({
    level,
    state,
}: {
    level: string
    state: TkaFullExamState
}) {
    const router = useRouter()
    const activeSection = state.sections.find((section) => section.sectionId === state.activeSectionId) ?? null
    const returnPath = `/tka/${level.toLowerCase()}`
    const resultPath = `${returnPath}/tryout/${state.attemptId}/result`

    const initialSelections = useMemo(() => Object.fromEntries(
        state.questions.map((question) => [question.attemptQuestionId, question.selectedOptionIds]),
    ), [state.questions])
    const initialFlags = useMemo(() => Object.fromEntries(
        state.questions.map((question) => [question.attemptQuestionId, question.isFlagged]),
    ), [state.questions])

    const [currentIndex, setCurrentIndex] = useState(0)
    const [selections, setSelections] = useState<Record<string, string[]>>(initialSelections)
    const [flags, setFlags] = useState<Record<string, boolean>>(initialFlags)
    const [remainingMs, setRemainingMs] = useState<number | null>(null)
    const [processing, setProcessing] = useState(false)
    const syncStateRef = useRef<Record<string, SyncState>>({})
    const questionEnteredAtRef = useRef(Date.now())
    const expiredHandledRef = useRef(false)

    const questions = state.questions
    const currentQuestion = questions[currentIndex] ?? null

    useEffect(() => {
        const key = progressStorageKey(state.attemptId, state.activeSectionId)
        let storedIndex = 0
        let storedFlags: Record<string, boolean> = {}
        try {
            const raw = window.localStorage.getItem(key)
            if (raw) {
                const parsed = JSON.parse(raw) as { index?: number; flags?: Record<string, boolean> }
                if (typeof parsed.index === 'number') storedIndex = parsed.index
                if (parsed.flags && typeof parsed.flags === 'object') storedFlags = parsed.flags
            }
        } catch {
            // Local progress is best-effort only. The database remains authoritative for answers.
        }

        setSelections(Object.fromEntries(state.questions.map((question) => [question.attemptQuestionId, question.selectedOptionIds])))
        setFlags({
            ...Object.fromEntries(state.questions.map((question) => [question.attemptQuestionId, question.isFlagged])),
            ...storedFlags,
        })
        setCurrentIndex(Math.max(0, Math.min(storedIndex, Math.max(state.questions.length - 1, 0))))
        syncStateRef.current = {}
        questionEnteredAtRef.current = Date.now()
        expiredHandledRef.current = false
    }, [state.activeSectionId, state.attemptId, state.questions])

    useEffect(() => {
        if (!state.activeSectionId) return
        try {
            window.localStorage.setItem(
                progressStorageKey(state.attemptId, state.activeSectionId),
                JSON.stringify({ index: currentIndex, flags }),
            )
        } catch {
            // Ignore storage quota/private-mode failures.
        }
    }, [currentIndex, flags, state.activeSectionId, state.attemptId])

    const selectedIdsFor = useCallback((question: TkaFullExamQuestionView) => (
        selections[question.attemptQuestionId] ?? []
    ), [selections])

    const answeredCount = useMemo(() => questions.reduce(
        (total, question) => total + (selectedIdsFor(question).length > 0 ? 1 : 0),
        0,
    ), [questions, selectedIdsFor])

    const currentTimeSpent = useCallback((question: TkaFullExamQuestionView) => {
        const extra = currentQuestion?.attemptQuestionId === question.attemptQuestionId
            ? Math.max(0, Math.floor((Date.now() - questionEnteredAtRef.current) / 1000))
            : 0
        return Math.max(0, question.timeSpentSeconds + extra)
    }, [currentQuestion?.attemptQuestionId])

    const syncSelection = useCallback(async (question: TkaFullExamQuestionView): Promise<void> => {
        const stateForQuestion = syncStateRef.current[question.attemptQuestionId]
        if (!stateForQuestion) return
        if (stateForQuestion.inFlight) return stateForQuestion.inflightPromise ?? Promise.resolve()

        const selection = [...stateForQuestion.latestIds]
        const flagValue = stateForQuestion.latestFlag
        stateForQuestion.inFlight = true
        const request = saveTkaFullExamAnswer({
            attemptQuestionId: question.attemptQuestionId,
            optionIds: selection,
            timeSpentSeconds: currentTimeSpent(question),
            isFlagged: flagValue,
        }).then((result) => {
            if (result?.error && sameSelection(stateForQuestion.latestIds, selection) && stateForQuestion.latestFlag === flagValue) {
                toast.error(result.error)
            }
        }).catch(() => {
            if (sameSelection(stateForQuestion.latestIds, selection)) toast.error('Gagal menyimpan jawaban.')
        }).then(async () => {
            stateForQuestion.inFlight = false
            if (!sameSelection(stateForQuestion.latestIds, selection) || stateForQuestion.latestFlag !== flagValue) {
                await syncSelection(question)
            }
        })
        stateForQuestion.inflightPromise = request
        return request
    }, [currentTimeSpent])

    const queueSelection = useCallback((question: TkaFullExamQuestionView, nextIds: string[], flagValue: boolean) => {
        const current = syncStateRef.current[question.attemptQuestionId] ?? {
            inFlight: false,
            latestIds: [],
            latestFlag: false,
            inflightPromise: null,
        }
        current.latestIds = [...nextIds]
        current.latestFlag = flagValue
        syncStateRef.current[question.attemptQuestionId] = current
        void syncSelection(question)
    }, [syncSelection])

    const handleSelect = useCallback((question: TkaFullExamQuestionView, optionId: string) => {
        const current = selections[question.attemptQuestionId] ?? []
        let next: string[]

        if (question.responseType === 'single_choice') {
            next = [optionId]
        } else if (question.responseType === 'category') {
            const selectedOption = question.options.find((option) => option.id === optionId)
            const group = selectedOption?.responseGroup ?? null
            const idsInGroup = new Set(question.options
                .filter((option) => (option.responseGroup ?? null) === group)
                .map((option) => option.id))
            const withoutGroup = current.filter((id) => !idsInGroup.has(id))
            next = current.includes(optionId) ? withoutGroup : [...withoutGroup, optionId]
        } else {
            next = current.includes(optionId)
                ? current.filter((id) => id !== optionId)
                : [...current, optionId]
        }

        setSelections((previous) => ({ ...previous, [question.attemptQuestionId]: next }))
        queueSelection(question, next, flags[question.attemptQuestionId] ?? false)
    }, [flags, queueSelection, selections])

    const toggleFlag = useCallback(() => {
        if (!currentQuestion) return
        const nextFlag = !(flags[currentQuestion.attemptQuestionId] ?? false)
        setFlags((previous) => ({ ...previous, [currentQuestion.attemptQuestionId]: nextFlag }))
        const selected = selections[currentQuestion.attemptQuestionId] ?? []
        if (selected.length > 0) queueSelection(currentQuestion, selected, nextFlag)
    }, [currentQuestion, flags, queueSelection, selections])

    const navigate = useCallback((nextIndex: number) => {
        const bounded = Math.max(0, Math.min(questions.length - 1, nextIndex))
        setCurrentIndex(bounded)
        questionEnteredAtRef.current = Date.now()
    }, [questions.length])

    const flushSelections = useCallback(async () => {
        const pending = questions.filter((question) => syncStateRef.current[question.attemptQuestionId])
        await Promise.all(pending.map((question) => syncSelection(question)))
    }, [questions, syncSelection])

    const advanceSection = useCallback(async (automatic = false) => {
        if (processing) return
        const unanswered = Math.max(0, questions.length - answeredCount)
        if (!automatic) {
            const label = activeSection?.title ?? 'section ini'
            const message = unanswered > 0
                ? `Masih ada ${unanswered} soal belum dijawab di ${label}. Selesaikan section sekarang? Setelah berpindah, jawaban section ini tidak dapat diubah.`
                : `Semua soal ${label} sudah dijawab. Selesaikan section sekarang? Setelah berpindah, jawaban tidak dapat diubah.`
            if (!window.confirm(message)) return
        }

        setProcessing(true)
        try {
            await flushSelections()
            const transition = await completeTkaFullExamSection(state.attemptId)
            if (transition?.error) {
                toast.error(transition.error)
                return
            }

            if (transition?.readyToSubmit) {
                const submitted = await submitTkaFullExamAttempt(state.attemptId)
                if (submitted?.error) {
                    toast.error(submitted.error)
                    return
                }
                toast.success(automatic ? 'Waktu habis. Tryout sudah dikirim.' : 'Tryout TKA selesai!')
                router.push(resultPath)
                return
            }

            toast.success(automatic ? 'Waktu section habis. Lanjut ke section berikutnya.' : 'Section selesai. Lanjut ke mata uji berikutnya.')
            router.refresh()
        } catch {
            toast.error('Gagal menyelesaikan section.')
        } finally {
            setProcessing(false)
        }
    }, [activeSection?.title, answeredCount, flushSelections, processing, questions.length, resultPath, router, state.attemptId])

    useEffect(() => {
        if (!activeSection || processing) {
            if (!activeSection) setRemainingMs(null)
            return
        }
        const deadline = activeSection.deadlineAt
            ? Date.parse(activeSection.deadlineAt)
            : Date.now() + Math.max(0, activeSection.remainingSeconds ?? activeSection.durationSeconds) * 1000

        const tick = () => {
            const remaining = Math.max(0, deadline - Date.now())
            setRemainingMs(remaining)
            if (remaining <= 0 && !expiredHandledRef.current) {
                expiredHandledRef.current = true
                void advanceSection(true)
            }
        }
        tick()
        const timer = window.setInterval(tick, 1000)
        return () => window.clearInterval(timer)
    }, [activeSection, advanceSection, processing])

    if (!activeSection || !currentQuestion) {
        return (
            <main className="min-h-screen bg-[#fdfbf7] p-8 text-center">
                <div className="mx-auto max-w-xl border-2 border-gray-900 bg-white p-6 font-black shadow-[5px_5px_0_0_#111]">
                    Tidak ada section aktif. Muat ulang halaman atau kembali ke TKA {level}.
                </div>
            </main>
        )
    }

    const selectedIds = selectedIdsFor(currentQuestion)
    const categoryGroups = currentQuestion.responseType === 'category'
        ? Array.from(new Set(currentQuestion.options.map((option) => option.responseGroup ?? 'Kelompok')))
        : []
    const markedCount = Object.values(flags).filter(Boolean).length

    const renderOption = (option: TkaFullExamQuestionView['options'][number], index: number) => {
        const selected = selectedIds.includes(option.id)
        return (
            <button
                key={option.id}
                type="button"
                onClick={() => handleSelect(currentQuestion, option.id)}
                className={cn(
                    'w-full border-2 p-3 text-left transition shadow-[2px_2px_0_0_#bbb]',
                    selected
                        ? 'translate-x-0.5 translate-y-0.5 border-blue-700 bg-blue-100 shadow-none'
                        : 'border-gray-300 bg-white hover:border-gray-900',
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
                        {option.imageUrl && (
                            <Image src={option.imageUrl} alt="Pilihan jawaban" width={640} height={360} unoptimized className="max-h-56 w-auto max-w-full object-contain" />
                        )}
                        <MathRenderer text={option.content} />
                    </div>
                </div>
            </button>
        )
    }

    return (
        <main className="min-h-screen bg-[#fdfbf7] p-3 text-gray-900 md:p-6">
            <div className="mx-auto max-w-7xl space-y-4">
                <header className="border-2 border-gray-900 bg-white p-4 shadow-[4px_4px_0_0_#111]">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <div className="text-xs font-black uppercase tracking-widest text-blue-700">TKA SMP · Full Tryout</div>
                            <h1 className="mt-1 text-xl font-black">{activeSection.title}</h1>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={cn(
                                'inline-flex items-center gap-2 border-2 border-gray-900 px-3 py-2 font-mono font-black',
                                remainingMs !== null && remainingMs <= 300000 ? 'bg-red-100 text-red-700' : 'bg-cyan-100',
                            )}>
                                <Clock3 size={16}/>{remainingMs === null ? '--:--:--' : formatRemaining(remainingMs)}
                            </div>
                            <button type="button" onClick={() => router.push(returnPath)} className="inline-flex items-center gap-2 border-2 border-gray-900 bg-white px-3 py-2 font-black">
                                <LogOut size={16}/><span className="hidden sm:inline">Keluar</span>
                            </button>
                        </div>
                    </div>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        {state.sections.map((section) => (
                            <div key={section.sectionId} className={cn(
                                'border-2 border-gray-900 px-3 py-2 text-sm font-black',
                                section.status === 'active' ? 'bg-blue-700 text-white' : section.status === 'completed' ? 'bg-green-100' : 'bg-gray-100 text-gray-500',
                            )}>
                                {section.sortOrder}. {section.title} · {section.questionCount} soal · {Math.round(section.durationSeconds / 60)} menit
                            </div>
                        ))}
                    </div>
                </header>

                <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
                    <section className="min-w-0 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-2 border-gray-900 bg-white p-3">
                            <div>
                                <div className="text-xs font-black uppercase text-blue-700">{activeSection.subjectCode} · {currentQuestion.responseType}</div>
                                <div className="text-lg font-black">Soal {currentIndex + 1} / {questions.length}</div>
                            </div>
                            <button type="button" onClick={toggleFlag} className={cn('inline-flex items-center gap-2 border-2 border-gray-900 px-3 py-2 font-black', flags[currentQuestion.attemptQuestionId] ? 'bg-yellow-300' : 'bg-white')}>
                                <Flag size={16}/>{flags[currentQuestion.attemptQuestionId] ? 'Ditandai' : 'Tandai'}
                            </button>
                        </div>

                        {currentQuestion.stimulus && (
                            <article className="border-2 border-gray-900 bg-yellow-50 p-5 shadow-[4px_4px_0_0_#bbb]">
                                {currentQuestion.stimulus.title && <h2 className="mb-3 text-lg font-black">{currentQuestion.stimulus.title}</h2>}
                                {currentQuestion.stimulus.imageUrl && (
                                    <Image src={currentQuestion.stimulus.imageUrl} alt="Stimulus soal" width={900} height={500} unoptimized className="mb-4 max-h-80 w-auto max-w-full object-contain" />
                                )}
                                <div className="whitespace-pre-wrap font-semibold leading-relaxed text-gray-800">
                                    <MathRenderer text={currentQuestion.stimulus.content} />
                                </div>
                            </article>
                        )}

                        <article className="border-2 border-gray-900 bg-white p-5 shadow-[5px_5px_0_0_#111] md:p-7">
                            <div className="whitespace-pre-wrap text-lg font-bold leading-relaxed md:text-xl">
                                <MathRenderer text={currentQuestion.stem} />
                            </div>
                            <p className="mt-4 border-t-2 border-dashed border-gray-200 pt-3 text-sm font-black text-blue-700">
                                {responseInstruction(currentQuestion.responseType)}
                            </p>
                            <div className="mt-5 space-y-3">
                                {currentQuestion.responseType === 'category' ? categoryGroups.map((group) => (
                                    <div key={group} className="space-y-2 border-2 border-dashed border-gray-300 bg-gray-50 p-3">
                                        <h3 className="text-sm font-black uppercase text-gray-600">{group}</h3>
                                        {currentQuestion.options
                                            .filter((option) => (option.responseGroup ?? 'Kelompok') === group)
                                            .map((option, index) => renderOption(option, index))}
                                    </div>
                                )) : currentQuestion.options.map((option, index) => renderOption(option, index))}
                            </div>
                        </article>

                        <div className="flex items-center justify-between gap-3">
                            <button type="button" disabled={currentIndex === 0} onClick={() => navigate(currentIndex - 1)} className="inline-flex items-center gap-2 border-2 border-gray-900 bg-white px-4 py-2 font-black disabled:opacity-40">
                                <ChevronLeft size={18}/> Sebelumnya
                            </button>
                            {currentIndex === questions.length - 1 ? (
                                <button type="button" disabled={processing} onClick={() => void advanceSection(false)} className="inline-flex items-center gap-2 border-2 border-gray-900 bg-blue-700 px-5 py-2 font-black text-white disabled:opacity-50">
                                    <CheckCircle2 size={18}/>{processing ? 'Memproses...' : state.sections.some((section) => section.status === 'locked') ? 'Selesai Section' : 'Kirim Tryout'}
                                </button>
                            ) : (
                                <button type="button" onClick={() => navigate(currentIndex + 1)} className="inline-flex items-center gap-2 border-2 border-gray-900 bg-gray-900 px-4 py-2 font-black text-white">
                                    Selanjutnya <ChevronRight size={18}/>
                                </button>
                            )}
                        </div>
                    </section>

                    <aside className="h-fit border-2 border-gray-900 bg-white p-4 shadow-[4px_4px_0_0_#111] lg:sticky lg:top-5">
                        <div className="flex items-center justify-between gap-2">
                            <h2 className="inline-flex items-center gap-2 font-black"><MapIcon size={18}/> Navigasi</h2>
                            <span className="text-xs font-black text-gray-500">{answeredCount}/{questions.length}</span>
                        </div>
                        <div className="mt-4 grid grid-cols-5 gap-2">
                            {questions.map((question, index) => {
                                const answered = (selections[question.attemptQuestionId] ?? []).length > 0
                                const flagged = flags[question.attemptQuestionId]
                                return (
                                    <button
                                        key={question.attemptQuestionId}
                                        type="button"
                                        onClick={() => navigate(index)}
                                        className={cn(
                                            'relative aspect-square border-2 border-gray-900 text-sm font-black',
                                            index === currentIndex ? 'bg-blue-700 text-white' : answered ? 'bg-green-100' : 'bg-white',
                                        )}
                                    >
                                        {index + 1}
                                        {flagged && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border border-gray-900 bg-yellow-300"/>}
                                    </button>
                                )
                            })}
                        </div>
                        <div className="mt-4 space-y-2 border-t-2 border-dashed border-gray-300 pt-4 text-xs font-bold text-gray-600">
                            <div>Terjawab section: <b>{answeredCount}/{questions.length}</b></div>
                            <div>Terjawab total: <b>{state.answeredCount}/{state.totalQuestions}</b></div>
                            <div>Ditandai: <b>{markedCount}</b></div>
                            <div>Percobaan: <b>#{state.attemptNumber}</b></div>
                        </div>
                    </aside>
                </div>
            </div>
        </main>
    )
}
