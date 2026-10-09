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
import { AnswerSaveQueue, flushAnswerSaves } from '@/lib/answer-save-queue'
import MathRenderer from '@/components/MathRenderer'
import TkaSectionConfirmModal from '@/components/tka/TkaSectionConfirmModal'
import { progressStorageKey } from '@/lib/session-progress'
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
import { acquireSingleFlightLock, releaseSingleFlightLock } from '@/lib/single-flight-lock'

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
    const [sectionConfirmMessage, setSectionConfirmMessage] = useState<string | null>(null)

    // Tutup dialog konfirmasi bila bagian berpindah sendiri (mis. timer habis),
    // supaya tidak ada dialog basi yang menempel di bagian berikutnya.
    useEffect(() => {
        setSectionConfirmMessage(null)
    }, [activeSection?.sectionId])
    const finishLockRef = useRef(false)
    const syncStateRef = useRef(new AnswerSaveQueue<{ ids: string[]; flag: boolean }>())
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
        syncStateRef.current = new AnswerSaveQueue()
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

    const syncSelection = useCallback((question: TkaFullExamQuestionView) =>
        syncStateRef.current.sync(question.attemptQuestionId, async (selection) => {
            const result = await saveTkaFullExamAnswer({
                attemptQuestionId: question.attemptQuestionId,
                optionIds: selection.ids,
                timeSpentSeconds: currentTimeSpent(question),
                isFlagged: selection.flag,
            })
            if (result?.error) throw new Error(result.error)
        }), [currentTimeSpent])

    const queueSelection = useCallback((question: TkaFullExamQuestionView, nextIds: string[], flagValue: boolean) => {
        syncStateRef.current.set(question.attemptQuestionId, { ids: [...nextIds], flag: flagValue })
        void syncSelection(question).catch(() => toast.error('Gagal menyimpan jawaban.'))
    }, [syncSelection])

    useEffect(() => {
        const retry = () => {
            const pending = new Set(syncStateRef.current.keys())
            for (const question of questions) if (pending.has(question.attemptQuestionId)) {
                void syncSelection(question).catch(() => toast.error('Gagal menyimpan jawaban.'))
            }
        }
        window.addEventListener('online', retry)
        return () => window.removeEventListener('online', retry)
    }, [questions, syncSelection])

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

    const flushSelections = useCallback((automatic = false) => {
        const pending = new Set(syncStateRef.current.keys())
        return flushAnswerSaves(questions.filter((q) => pending.has(q.attemptQuestionId)).map(syncSelection), automatic)
    }, [questions, syncSelection])

    const sectionAdvanceMessage = useCallback(() => {
        const label = activeSection?.title ?? 'bagian ini'
        const unanswered = Math.max(0, questions.length - answeredCount)
        return unanswered > 0
            ? `Masih ada ${unanswered} soal belum dijawab di ${label}. Setelah berpindah, jawaban bagian ini tidak dapat diubah.`
            : `Semua soal ${label} sudah dijawab. Setelah berpindah, jawaban tidak dapat diubah.`
    }, [activeSection, questions.length, answeredCount])

    const requestSectionAdvance = useCallback(() => {
        if (processing) return
        setSectionConfirmMessage(sectionAdvanceMessage())
    }, [processing, sectionAdvanceMessage])

    const advanceSection = useCallback(async (automatic = false) => {
        if (!acquireSingleFlightLock(finishLockRef)) return
        setSectionConfirmMessage(null)
        let isNavigating = false
        setProcessing(true)
        try {
            await flushSelections(automatic)
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
                isNavigating = true
                return
            }

            toast.success(automatic ? 'Waktu bagian ini habis. Lanjut ke bagian berikutnya.' : 'Bagian selesai. Lanjut ke mata uji berikutnya.')
            router.refresh()
        } catch {
            toast.error('Bagian ini belum bisa diselesaikan. Coba lagi.')
        } finally {
            if (!isNavigating) {
                releaseSingleFlightLock(finishLockRef)
                setProcessing(false)
            }
        }
    }, [flushSelections, resultPath, router, state.attemptId])

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
            <main data-experience-mode="exam" data-program={`tka-${level.toLowerCase()}`} className="min-h-screen bg-slate-50/70 p-6 text-center text-slate-900">
                <div className="mx-auto max-w-xl rounded-2xl border border-slate-200/80 bg-white p-6 font-bold text-slate-900 shadow-xs">
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
                className={cn(
                    'group relative w-full rounded-2xl border p-4 text-left transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2',
                    selected
                        ? 'border-indigo-600 bg-indigo-50/70 shadow-xs ring-1 ring-indigo-500/20'
                        : 'border-slate-200/80 bg-white hover:border-indigo-200 hover:bg-slate-50/60 shadow-2xs',
                )}
            >
                <div className="flex items-start gap-3.5">
                    <span
                        className={cn(
                            'flex h-8 min-w-8 items-center justify-center rounded-xl text-xs font-bold transition-colors',
                            selected
                                ? 'bg-indigo-600 text-white shadow-2xs'
                                : 'border border-slate-200 bg-slate-100/80 text-slate-600 group-hover:border-indigo-200 group-hover:bg-indigo-50 group-hover:text-indigo-600',
                        )}
                    >
                        {selected ? <Check size={15} strokeWidth={2.5} /> : option.key || String.fromCharCode(65 + index)}
                    </span>
                    <div className="min-w-0 flex-1 space-y-2 text-sm sm:text-base font-medium leading-relaxed text-slate-800">
                        {option.imageUrl && (
                            <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white p-2">
                                <Image
                                    src={option.imageUrl}
                                    alt="Pilihan jawaban"
                                    width={640}
                                    height={360}
                                    unoptimized
                                    className="max-h-56 w-auto max-w-full object-contain"
                                />
                            </div>
                        )}
                        <MathRenderer text={option.content} />
                    </div>
                </div>
            </button>
        )
    }

    return (
        <main data-experience-mode="exam" data-program={`tka-${level.toLowerCase()}`} className="min-h-screen bg-slate-50/70 p-3 text-slate-900 md:p-6">
            <div className="mx-auto max-w-7xl space-y-4">
                <header className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-indigo-700 ring-1 ring-indigo-200/60 shadow-2xs">
                                TKA {level} · {examModeLabel}
                            </div>
                            <h1 className="mt-2 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">{activeSection.title}</h1>
                        </div>
                        <div className="flex items-center gap-2.5">
                            <div
                                aria-label="Waktu tersisa"
                                className={cn(
                                    'inline-flex min-h-11 items-center gap-2 rounded-xl px-3.5 py-2 font-mono text-sm font-bold tabular-nums shadow-2xs transition-colors',
                                    remainingMs !== null && remainingMs <= 300000
                                        ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/80 animate-pulse'
                                        : 'bg-indigo-50 text-indigo-900 ring-1 ring-indigo-200/80',
                                )}
                            >
                                <Clock3 size={16} className={remainingMs !== null && remainingMs <= 300000 ? 'text-rose-600' : 'text-indigo-600'} />
                                {remainingMs === null ? '--:--:--' : formatRemaining(remainingMs)}
                            </div>
                            <button
                                type="button"
                                onClick={() => router.push(returnPath)}
                                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                            >
                                <LogOut size={16} className="text-slate-500" />
                                <span className="hidden sm:inline">Keluar</span>
                            </button>
                        </div>
                    </div>
                    <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                        {state.sections.map((section) => (
                            <div
                                key={section.sectionId}
                                className={cn(
                                    'flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-bold transition-colors',
                                    section.status === 'active'
                                        ? 'bg-indigo-600 text-white shadow-xs'
                                        : section.status === 'completed'
                                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80'
                                            : 'bg-slate-100 text-slate-500 border border-slate-200/60',
                                )}
                            >
                                <span>{section.sortOrder}. {section.title}</span>
                                <span className={cn('text-[11px] font-medium', section.status === 'active' ? 'text-indigo-100' : 'text-slate-500')}>
                                    {section.questionCount} soal · {Math.round(section.durationSeconds / 60)} menit
                                </span>
                            </div>
                        ))}
                    </div>
                </header>

                <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
                    <section className="min-w-0 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-xs">
                            <div>
                                <div className="inline-flex items-center rounded-md bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700 ring-1 ring-indigo-200/60 shadow-2xs">
                                    {activeSection.subjectCode}
                                </div>
                                <div className="mt-1 text-base sm:text-lg font-bold text-slate-950">
                                    Soal {currentIndex + 1} dari {questions.length}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={toggleFlag}
                                className={cn(
                                    'inline-flex min-h-11 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold shadow-2xs transition active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600',
                                    flags[currentQuestion.attemptQuestionId]
                                        ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-300'
                                        : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700',
                                )}
                            >
                                <Flag size={16} className={flags[currentQuestion.attemptQuestionId] ? 'fill-amber-500 text-amber-600' : 'text-slate-400'} />
                                {flags[currentQuestion.attemptQuestionId] ? 'Ditandai' : 'Tandai untuk ditinjau'}
                            </button>
                        </div>

                        {currentQuestion.stimulus && (
                            <article className="rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50/60 via-amber-50/30 to-white p-5 md:p-6 shadow-xs">
                                {currentQuestion.stimulus.title && (
                                    <h2 className="mb-3 text-base sm:text-lg font-bold text-amber-950">
                                        {currentQuestion.stimulus.title}
                                    </h2>
                                )}
                                {currentQuestion.stimulus.imageUrl && (
                                    <div className="mb-4 overflow-hidden rounded-xl border border-amber-200/60 bg-white p-2">
                                        <Image
                                            src={currentQuestion.stimulus.imageUrl}
                                            alt="Stimulus soal"
                                            width={900}
                                            height={500}
                                            unoptimized
                                            className="max-h-80 w-auto max-w-full object-contain"
                                        />
                                    </div>
                                )}
                                <div className="whitespace-pre-wrap text-sm sm:text-base font-normal leading-relaxed text-slate-800">
                                    <MathRenderer text={currentQuestion.stimulus.content} />
                                </div>
                            </article>
                        )}

                        <article className="rounded-2xl border border-slate-200/80 bg-white p-5 md:p-7 shadow-xs">
                            <div className="whitespace-pre-wrap text-base sm:text-lg md:text-xl font-medium leading-relaxed text-slate-950">
                                <MathRenderer text={currentQuestion.stem} />
                            </div>
                            <p className="mt-4 border-t border-slate-100 pt-3 text-xs font-bold uppercase tracking-wider text-indigo-600">
                                {responseInstruction(currentQuestion.responseType)}
                            </p>
                            <div className="mt-5 space-y-3">
                                {currentQuestion.responseType === 'category' ? categoryGroups.map((group) => (
                                    <div key={group} className="space-y-2.5 rounded-xl border border-indigo-100 bg-indigo-50/30 p-3.5">
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-700">{group}</h3>
                                        {currentQuestion.options
                                            .filter((option) => (option.responseGroup ?? 'Kelompok') === group)
                                            .map((option, index) => renderOption(option, index))}
                                    </div>
                                )) : currentQuestion.options.map((option, index) => renderOption(option, index))}
                            </div>
                        </article>

                        <div className="flex items-center justify-between gap-3">
                            <button
                                type="button"
                                disabled={currentIndex === 0}
                                onClick={() => navigate(currentIndex - 1)}
                                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs sm:text-sm font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                            >
                                <ChevronLeft size={18} /> Sebelumnya
                            </button>
                            {currentIndex === questions.length - 1 ? (
                                <button
                                    type="button"
                                    data-prevent-double="true"
                                    disabled={processing}
                                    onClick={requestSectionAdvance}
                                    className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-indigo-700 transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                                >
                                    <CheckCircle2 size={18} />
                                    {processing ? 'Memproses...' : state.sections.some((section) => section.status === 'locked') ? 'Selesaikan bagian' : 'Kirim tryout'}
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => navigate(currentIndex + 1)}
                                    className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-900 px-5 py-2 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-slate-800 transition active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                                >
                                    Selanjutnya <ChevronRight size={18} />
                                </button>
                            )}
                        </div>
                    </section>

                    <aside className="h-fit rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs lg:sticky lg:top-5">
                        <div className="flex items-center justify-between gap-2">
                            <h2 className="inline-flex items-center gap-2 font-bold text-sm text-slate-900">
                                <MapIcon size={16} className="text-indigo-600" /> Navigasi soal
                            </h2>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
                                {answeredCount}/{questions.length}
                            </span>
                        </div>
                        <div className="mt-4 grid grid-cols-5 gap-2">
                            {questions.map((question, index) => {
                                const answered = (selections[question.attemptQuestionId] ?? []).length > 0
                                const flagged = flags[question.attemptQuestionId]
                                const isCurrent = index === currentIndex
                                return (
                                    <button
                                        key={question.attemptQuestionId}
                                        type="button"
                                        onClick={() => navigate(index)}
                                        aria-label={`Buka soal ${index + 1}${isCurrent ? ', sedang dikerjakan' : ''}`}
                                        aria-current={isCurrent ? 'step' : undefined}
                                        style={isCurrent ? { outline: '3px solid #ef4444', outlineOffset: '2px' } : undefined}
                                        className={cn(
                                            'relative flex aspect-square min-h-10 items-center justify-center rounded-xl text-xs font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600',
                                            isCurrent && answered
                                                ? 'z-10 bg-emerald-600 text-white shadow-xs font-black ring-2 ring-indigo-600 ring-offset-2 border border-emerald-700'
                                                : isCurrent
                                                    ? 'z-10 bg-indigo-600 text-white shadow-xs font-black ring-2 ring-indigo-600 ring-offset-2'
                                                    : answered
                                                        ? 'bg-emerald-600 text-white font-bold shadow-xs hover:bg-emerald-700 border border-emerald-700'
                                                        : 'border border-slate-200/90 bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900',
                                        )}
                                    >
                                        {index + 1}
                                        {isCurrent && (
                                            <span aria-hidden="true" className="absolute -left-1 -top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-red-500 shadow-2xs" />
                                        )}
                                        {flagged && (
                                            <span aria-label="Ditandai" className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-amber-400 shadow-2xs" />
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                        <div className="mt-4 space-y-2.5 border-t border-slate-100 pt-4 text-xs font-medium text-slate-600">
                            <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200/70 bg-slate-50/70 p-2.5 text-[11px] font-semibold text-slate-700">
                                <div className="flex items-center gap-1.5">
                                    <span className="flex h-4 w-4 items-center justify-center rounded-md bg-emerald-600 text-[9px] font-bold text-white shadow-2xs">✓</span>
                                    <span className="text-slate-800">Terjawab</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="flex h-4 w-4 items-center justify-center rounded-md border border-slate-300 bg-slate-100 text-[9px] font-bold text-slate-600">-</span>
                                    <span className="text-slate-600">Belum dijawab</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="relative flex h-4 w-4 items-center justify-center rounded-md bg-indigo-600 text-[9px] font-bold text-white shadow-2xs">
                                        <span className="absolute -left-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-red-500" />
                                    </span>
                                    <span className="text-slate-800">Sedang dibuka</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="relative flex h-4 w-4 items-center justify-center rounded-md border border-slate-200 bg-slate-100 text-[9px] font-bold text-slate-600">
                                        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-amber-400" />
                                    </span>
                                    <span className="text-slate-800">Ditandai</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-red-500" />
                                <span>Sedang dikerjakan</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-emerald-600" />
                                <span>Terjawab bagian ini: <b className="font-bold text-emerald-700">{answeredCount}/{questions.length}</b></span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-indigo-600" />
                                <span>Terjawab total: <b className="font-bold text-slate-900">{state.answeredCount}/{state.totalQuestions}</b></span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-amber-400" />
                                <span>Ditandai: <b className="font-bold text-amber-700">{markedCount}</b></span>
                            </div>
                            <div>Pengerjaan: <b className="font-bold text-slate-900">#{state.attemptNumber}</b></div>
                        </div>
                    </aside>
                </div>
            </div>

            <TkaSectionConfirmModal
                message={sectionConfirmMessage}
                processing={processing}
                onCancel={() => setSectionConfirmMessage(null)}
                onConfirm={() => void advanceSection(false)}
            />
        </main>
    )
}
