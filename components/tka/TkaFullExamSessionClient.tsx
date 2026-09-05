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
    const resultPath = `${returnPath}/tryout/${state.attemptId}/result?completed=1`
    const examModeLabel = state.sections.length === 1 ? 'Mini Tryout' : 'Full Tryout'

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
    const questionEnteredAtRef = useRef<number | null>(null)
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
        const enteredAt = questionEnteredAtRef.current
        const extra = currentQuestion?.attemptQuestionId === question.attemptQuestionId && enteredAt !== null
            ? Math.max(0, Math.floor((Date.now() - enteredAt) / 1000))
            : 0
        return Math.max(0, question.timeSpentSeconds + extra)
    }, [currentQuestion?.attemptQuestionId])

    const syncSelection = useCallback((question: TkaFullExamQuestionView): Promise<void> => {
        const questionId = question.attemptQuestionId
        const existing = syncStateRef.current[questionId]
        if (!existing) return Promise.resolve()
        if (existing.inflightPromise) return existing.inflightPromise

        const worker = (async () => {
            while (true) {
                const current = syncStateRef.current[questionId]
                if (!current) return
                const selection = [...current.latestIds]
                const flagValue = current.latestFlag

                try {
                    const result = await saveTkaFullExamAnswer({
                        attemptQuestionId: questionId,
                        optionIds: selection,
                        timeSpentSeconds: currentTimeSpent(question),
                        isFlagged: flagValue,
                    })
                    const latest = syncStateRef.current[questionId]
                    if (
                        result?.error
                        && latest
                        && sameSelection(latest.latestIds, selection)
                        && latest.latestFlag === flagValue
                    ) {
                        toast.error(result.error)
                    }
                } catch {
                    const latest = syncStateRef.current[questionId]
                    if (latest && sameSelection(latest.latestIds, selection) && latest.latestFlag === flagValue) {
                        toast.error('Gagal menyimpan jawaban.')
                    }
                }

                const latest = syncStateRef.current[questionId]
                if (!latest) return
                if (sameSelection(latest.latestIds, selection) && latest.latestFlag === flagValue) {
                    syncStateRef.current[questionId] = {
                        latestIds: [...latest.latestIds],
                        latestFlag: latest.latestFlag,
                        inflightPromise: null,
                    }
                    return
                }
            }
        })()

        syncStateRef.current[questionId] = {
            latestIds: [...existing.latestIds],
            latestFlag: existing.latestFlag,
            inflightPromise: worker,
        }
        return worker
    }, [currentTimeSpent])

    const queueSelection = useCallback((question: TkaFullExamQuestionView, nextIds: string[], flagValue: boolean) => {
        const existing = syncStateRef.current[question.attemptQuestionId]
        const inflightPromise = existing?.inflightPromise ?? null
        syncStateRef.current[question.attemptQuestionId] = {
            latestIds: [...nextIds],
            latestFlag: flagValue,
            inflightPromise,
        }
        if (!inflightPromise) void syncSelection(question)
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
            const label = activeSection?.title ?? 'bagian ini'
            const message = unanswered > 0
                ? `Masih ada ${unanswered} soal belum dijawab di ${label}. Selesaikan bagian ini sekarang? Setelah berpindah, jawaban bagian ini tidak dapat diubah.`
                : `Semua soal ${label} sudah dijawab. Selesaikan bagian ini sekarang? Setelah berpindah, jawaban tidak dapat diubah.`
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
                toast.success(automatic ? 'Waktu habis. Tryout sudah dikirim.' : 'Tryout TKA selesai.')
                router.push(resultPath)
                return
            }

            toast.success(automatic ? 'Waktu bagian ini habis. Lanjut ke bagian berikutnya.' : 'Bagian selesai. Lanjut ke mata uji berikutnya.')
            router.refresh()
        } catch {
            toast.error('Bagian ini belum bisa diselesaikan. Coba lagi.')
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
            <main data-experience-mode="exam" data-program="tka-smp" className="st-product min-h-screen p-8 text-center">
                <div className="st-flat-card mx-auto max-w-xl p-6 font-black">
                    Tidak ada bagian aktif. Muat ulang halaman atau kembali ke TKA {level}.
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
                data-selected={selected}
                className="st-option st-focus p-3.5 text-left transition-colors"
            >
                <div className="flex items-start gap-3">
                    <span className={cn(
                        'flex h-8 min-w-8 items-center justify-center border-2 border-slate-900 text-xs font-black',
                        selected ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-700',
                    )}>
                        {selected ? <Check size={15}/> : option.key || String.fromCharCode(65 + index)}
                    </span>
                    <div className="min-w-0 flex-1 space-y-2 font-semibold leading-relaxed text-slate-800">
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
        <main data-experience-mode="exam" data-program="tka-smp" className="st-product min-h-screen p-3 md:p-6">
            <div className="mx-auto max-w-7xl space-y-4">
                <header className="st-flat-card p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <div className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">TKA SMP · {examModeLabel}</div>
                            <h1 className="st-heading mt-1 text-xl">{activeSection.title}</h1>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={cn(
                                'inline-flex min-h-11 items-center gap-2 border-2 border-slate-900 px-3 py-2 font-mono font-black tabular-nums',
                                remainingMs !== null && remainingMs <= 300000 ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-slate-950',
                            )}>
                                <Clock3 size={16}/>{remainingMs === null ? '--:--:--' : formatRemaining(remainingMs)}
                            </div>
                            <button type="button" onClick={() => router.push(returnPath)} className="st-focus inline-flex min-h-11 items-center gap-2 border-2 border-slate-900 bg-white px-3 py-2 text-sm font-black">
                                <LogOut size={16}/><span className="hidden sm:inline">Keluar</span>
                            </button>
                        </div>
                    </div>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        {state.sections.map((section) => (
                            <div key={section.sectionId} className={cn(
                                'border-2 border-slate-900 px-3 py-2 text-sm font-black',
                                section.status === 'active' ? 'bg-blue-600 text-white' : section.status === 'completed' ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-100 text-slate-500',
                            )}>
                                {section.sortOrder}. {section.title} · {section.questionCount} soal · {Math.round(section.durationSeconds / 60)} menit
                            </div>
                        ))}
                    </div>
                </header>

                <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
                    <section className="min-w-0 space-y-4">
                        <div className="st-flat-card flex flex-wrap items-center justify-between gap-3 p-3">
                            <div>
                                <div className="text-xs font-black uppercase tracking-[0.12em] text-blue-700">{activeSection.subjectCode}</div>
                                <div className="mt-0.5 text-lg font-black">Soal {currentIndex + 1} dari {questions.length}</div>
                            </div>
                            <button type="button" onClick={toggleFlag} className={cn('st-focus inline-flex min-h-11 items-center gap-2 border-2 border-slate-900 px-3 py-2 text-sm font-black', flags[currentQuestion.attemptQuestionId] ? 'bg-yellow-200' : 'bg-white')}>
                                <Flag size={16}/>{flags[currentQuestion.attemptQuestionId] ? 'Ditandai' : 'Tandai untuk ditinjau'}
                            </button>
                        </div>

                        {currentQuestion.stimulus && (
                            <article className="st-warning p-5">
                                {currentQuestion.stimulus.title && <h2 className="st-heading mb-3 text-lg">{currentQuestion.stimulus.title}</h2>}
                                {currentQuestion.stimulus.imageUrl && (
                                    <Image src={currentQuestion.stimulus.imageUrl} alt="Stimulus soal" width={900} height={500} unoptimized className="mb-4 max-h-80 w-auto max-w-full object-contain" />
                                )}
                                <div className="whitespace-pre-wrap font-semibold leading-relaxed text-slate-800">
                                    <MathRenderer text={currentQuestion.stimulus.content} />
                                </div>
                            </article>
                        )}

                        <article className="st-flat-card p-5 md:p-7">
                            <div className="whitespace-pre-wrap text-lg font-bold leading-relaxed md:text-xl">
                                <MathRenderer text={currentQuestion.stem} />
                            </div>
                            <p className="mt-4 border-t-2 border-dashed border-slate-200 pt-3 text-sm font-black text-blue-700">
                                {responseInstruction(currentQuestion.responseType)}
                            </p>
                            <div className="mt-5 space-y-3">
                                {currentQuestion.responseType === 'category' ? categoryGroups.map((group) => (
                                    <div key={group} className="space-y-2 border-l-4 border-blue-300 bg-slate-50 p-3">
                                        <h3 className="text-sm font-black uppercase text-slate-600">{group}</h3>
                                        {currentQuestion.options
                                            .filter((option) => (option.responseGroup ?? 'Kelompok') === group)
                                            .map((option, index) => renderOption(option, index))}
                                    </div>
                                )) : currentQuestion.options.map((option, index) => renderOption(option, index))}
                            </div>
                        </article>

                        <div className="flex items-center justify-between gap-3">
                            <button type="button" disabled={currentIndex === 0} onClick={() => navigate(currentIndex - 1)} className="st-focus inline-flex min-h-11 items-center gap-2 border-2 border-slate-900 bg-white px-4 py-2 text-sm font-black disabled:opacity-40">
                                <ChevronLeft size={18}/> Sebelumnya
                            </button>
                            {currentIndex === questions.length - 1 ? (
                                <button type="button" data-prevent-double="true" disabled={processing} onClick={() => void advanceSection(false)} className="st-focus inline-flex min-h-11 items-center gap-2 border-2 border-slate-900 bg-blue-600 px-5 py-2 text-sm font-black text-white disabled:opacity-50">
                                    <CheckCircle2 size={18}/>{processing ? 'Memproses...' : state.sections.some((section) => section.status === 'locked') ? 'Selesaikan bagian' : 'Kirim tryout'}
                                </button>
                            ) : (
                                <button type="button" onClick={() => navigate(currentIndex + 1)} className="st-focus inline-flex min-h-11 items-center gap-2 border-2 border-slate-900 bg-slate-950 px-4 py-2 text-sm font-black text-white">
                                    Selanjutnya <ChevronRight size={18}/>
                                </button>
                            )}
                        </div>
                    </section>

                    <aside className="st-flat-card h-fit p-4 lg:sticky lg:top-5">
                        <div className="flex items-center justify-between gap-2">
                            <h2 className="inline-flex items-center gap-2 font-black"><MapIcon size={18}/> Navigasi soal</h2>
                            <span className="text-xs font-black text-slate-500">{answeredCount}/{questions.length}</span>
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
                                        aria-label={`Buka soal ${index + 1}${index === currentIndex ? ', sedang dikerjakan' : ''}`}
                                        aria-current={index === currentIndex ? 'step' : undefined}
                                        style={index === currentIndex ? { outline: '3px solid #ef4444', outlineOffset: '2px' } : undefined}
                                        className={cn(
                                            'st-focus relative aspect-square min-h-10 border-2 border-slate-900 text-sm font-black',
                                            index === currentIndex ? 'z-10 bg-blue-600 text-white' : answered ? 'bg-emerald-100 text-slate-950' : 'bg-white text-slate-700',
                                        )}
                                    >
                                        {index + 1}
                                        {index === currentIndex && (
                                            <span aria-hidden="true" className="absolute -left-1.5 -top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-red-500 shadow-sm" />
                                        )}
                                        {flagged && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border border-slate-900 bg-yellow-300"/>}
                                    </button>
                                )
                            })}
                        </div>
                        <div className="st-muted mt-4 space-y-2 border-t-2 border-dashed border-slate-200 pt-4 text-xs font-bold">
                            <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Sedang dikerjakan</div>
                            <div>Terjawab bagian ini: <b className="text-slate-900">{answeredCount}/{questions.length}</b></div>
                            <div>Terjawab total: <b className="text-slate-900">{state.answeredCount}/{state.totalQuestions}</b></div>
                            <div>Ditandai: <b className="text-slate-900">{markedCount}</b></div>
                            <div>Pengerjaan: <b className="text-slate-900">#{state.attemptNumber}</b></div>
                        </div>
                    </aside>
                </div>
            </div>
        </main>
    )
}
