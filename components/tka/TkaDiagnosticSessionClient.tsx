'use client'

import Image from 'next/image'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, ArrowRight, BrainCircuit, Check, Clock3, Grid3X3, Send } from 'lucide-react'
import MathRenderer from '@/components/MathRenderer'
import { cn } from '@/lib/utils'
import {
    completeTkaFullExamSection,
    saveTkaFullExamAnswer,
    submitTkaFullExamAttempt,
} from '@/app/actions/tka-full-exam'
import type { TkaFullExamQuestionView, TkaFullExamState } from '@/src/services/tka-full-exam-rpc.service'
import ProgressBar from '@/components/ui/ProgressBar'
import TkaSectionConfirmModal from '@/components/tka/TkaSectionConfirmModal'
import { progressStorageKey, readStoredIndex, writeStoredIndex } from '@/lib/session-progress'
import { acquireSingleFlightLock, releaseSingleFlightLock } from '@/lib/single-flight-lock'

function formatRemaining(milliseconds: number) {
    const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000))
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function instruction(type: string) {
    if (type === 'multiple_choice') return 'Pilih semua jawaban yang benar.'
    if (type === 'category') return 'Pilih satu jawaban pada setiap kelompok.'
    return 'Pilih satu jawaban yang paling tepat.'
}

export default function TkaDiagnosticSessionClient({ state }: { state: TkaFullExamState }) {
    const router = useRouter()
    const activeSection = state.sections.find((section) => section.sectionId === state.activeSectionId) ?? null
    const maxSortOrder = Math.max(...state.sections.map((section) => section.sortOrder), 0)
    const isLastSection = activeSection?.sortOrder === maxSortOrder
    const [currentIndex, setCurrentIndex] = useState(0)
    const [selections, setSelections] = useState<Record<string, string[]>>(() => Object.fromEntries(
        state.questions.map((question) => [question.attemptQuestionId, question.selectedOptionIds]),
    ))
    const [remainingMs, setRemainingMs] = useState<number | null>(null)
    const [savingId, setSavingId] = useState<string | null>(null)
    const [processing, setProcessing] = useState(false)
    const [sectionConfirmMessage, setSectionConfirmMessage] = useState<string | null>(null)
    const finishLockRef = useRef(false)
    const enteredAtRef = useRef(Date.now())
    const expiredRef = useRef(false)
    const progressHydratedRef = useRef(false)

    const questions = state.questions
    const currentQuestion = questions[currentIndex] ?? null
    const answeredCount = useMemo(() => questions.filter((question) => (selections[question.attemptQuestionId] ?? []).length > 0).length, [questions, selections])
    const progressKey = progressStorageKey(state.attemptId, state.activeSectionId)

    // Server Action simpan jawaban me-render ulang RSC tree, jadi efek ini berjalan
    // ulang dengan prop baru. Posisi soal dipulihkan dari progres lokal supaya peserta
    // tidak terlempar kembali ke soal 1 setiap kali jawaban tersimpan.
    useEffect(() => {
        setSelections(Object.fromEntries(state.questions.map((question) => [question.attemptQuestionId, question.selectedOptionIds])))
        setCurrentIndex(readStoredIndex(progressKey, state.questions.length))
        enteredAtRef.current = Date.now()
        expiredRef.current = false
    }, [progressKey, state.questions])

    useEffect(() => {
        // Lewati commit pertama: menulis 0 sebelum posisi dipulihkan akan menimpa progres.
        if (!progressHydratedRef.current) {
            progressHydratedRef.current = true
            return
        }
        writeStoredIndex(progressKey, currentIndex)
    }, [progressKey, currentIndex])

    const timeSpent = useCallback((question: TkaFullExamQuestionView) => {
        const extra = currentQuestion?.attemptQuestionId === question.attemptQuestionId
            ? Math.max(0, Math.floor((Date.now() - enteredAtRef.current) / 1000))
            : 0
        return Math.max(0, question.timeSpentSeconds + extra)
    }, [currentQuestion?.attemptQuestionId])

    const selectOption = async (question: TkaFullExamQuestionView, optionId: string) => {
        if (savingId || processing) return
        const current = selections[question.attemptQuestionId] ?? []
        let next: string[]

        if (question.responseType === 'single_choice') {
            next = [optionId]
        } else if (question.responseType === 'category') {
            const selected = question.options.find((option) => option.id === optionId)
            const group = selected?.responseGroup ?? null
            const groupIds = new Set(question.options.filter((option) => (option.responseGroup ?? null) === group).map((option) => option.id))
            next = [...current.filter((id) => !groupIds.has(id)), optionId]
        } else {
            next = current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId]
        }

        setSelections((previous) => ({ ...previous, [question.attemptQuestionId]: next }))
        setSavingId(question.attemptQuestionId)
        try {
            const result = await saveTkaFullExamAnswer({
                attemptQuestionId: question.attemptQuestionId,
                optionIds: next,
                timeSpentSeconds: timeSpent(question),
                isFlagged: false,
            })
            if (result?.error) toast.error(result.error)
        } catch {
            toast.error('Jawaban belum tersimpan. Coba pilih kembali.')
        } finally {
            setSavingId(null)
        }
    }

    const finishSection = useCallback(async (automatic = false) => {
        if (!activeSection || !acquireSingleFlightLock(finishLockRef)) return

        let isNavigating = false
        setProcessing(true)
        try {
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
                toast.success('Tes diagnostik selesai. Peta kemampuanmu sudah dibuat.')
                router.push(`/tka/smp/diagnostic/${state.attemptId}/result`)
                isNavigating = true
                return
            }
            toast.success(automatic ? 'Waktu bagian selesai. Lanjut ke bagian berikutnya.' : 'Bagian selesai. Lanjut ke bagian berikutnya.')
            router.refresh()
        } catch {
            toast.error('Bagian ini belum dapat diselesaikan. Coba lagi.')
        } finally {
            if (!isNavigating) {
                releaseSingleFlightLock(finishLockRef)
                setProcessing(false)
            }
        }
    }, [activeSection, router, state.attemptId])

    const requestFinishSection = useCallback(() => {
        if (!activeSection || processing) return
        const unanswered = Math.max(0, questions.length - answeredCount)
        const warning = unanswered > 0 ? `Masih ada ${unanswered} soal belum dijawab. ` : ''
        setSectionConfirmMessage(`${warning}Selesaikan bagian ${activeSection.title} sekarang? Jawaban bagian ini tidak dapat diubah setelah lanjut.`)
    }, [activeSection, answeredCount, processing, questions.length])

    useEffect(() => {
        if (!activeSection) return
        const deadline = activeSection.deadlineAt
            ? Date.parse(activeSection.deadlineAt)
            : Date.now() + Math.max(0, activeSection.remainingSeconds ?? activeSection.durationSeconds) * 1000
        const tick = () => {
            const remaining = Math.max(0, deadline - Date.now())
            setRemainingMs(remaining)
            if (remaining <= 0 && !expiredRef.current) {
                expiredRef.current = true
                void finishSection(true)
            }
        }
        tick()
        const timer = window.setInterval(tick, 1000)
        return () => window.clearInterval(timer)
    }, [activeSection, finishSection])

    if (!activeSection || !currentQuestion) {
        return <main className="min-h-screen bg-white p-6 text-center font-bold text-slate-600">Sesi diagnostik tidak memiliki bagian aktif.</main>
    }

    const selectedIds = selections[currentQuestion.attemptQuestionId] ?? []
    const categoryGroups = currentQuestion.responseType === 'category'
        ? Array.from(new Set(currentQuestion.options.map((option) => option.responseGroup ?? 'Kelompok')))
        : []

    const renderOption = (option: TkaFullExamQuestionView['options'][number], index: number) => {
        const selected = selectedIds.includes(option.id)
        return (
            <button
                key={option.id}
                type="button"
                data-testid="diagnostic-option"
                data-selected={selected}
                disabled={savingId === currentQuestion.attemptQuestionId || processing}
                onClick={() => void selectOption(currentQuestion, option.id)}
                className={cn(
                    'st-focus flex w-full items-start gap-3 rounded-xl border p-3 text-left transition',
                    selected ? 'border-indigo-300 bg-indigo-50 ring-1 ring-indigo-200' : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/40',
                )}
            >
                <span className={cn('flex h-7 min-w-7 items-center justify-center rounded-lg text-xs font-black', selected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600')}>
                    {selected ? <Check size={14} /> : option.key || String.fromCharCode(65 + index)}
                </span>
                <span className="min-w-0 flex-1 space-y-2 text-sm font-semibold leading-relaxed text-slate-800">
                    {option.imageUrl && <Image src={option.imageUrl} alt="Pilihan jawaban" width={640} height={360} unoptimized className="max-h-52 w-auto max-w-full object-contain" />}
                    <MathRenderer text={option.content} />
                </span>
            </button>
        )
    }

    return (
        <main data-experience-mode="exam" data-program="tka-smp" className="st-product min-h-screen bg-[#f8f9fd] p-3 md:p-5">
            <div className="mx-auto max-w-6xl space-y-3">
                <header className="rounded-[1.15rem] border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-indigo-600"><BrainCircuit size={15} /> Tes Diagnostik TKA SMP</div>
                            <h1 className="mt-1 text-xl font-black tracking-tight text-slate-950">{activeSection.title}</h1>
                            <p className="mt-1 text-xs font-semibold text-slate-500">Bagian {activeSection.sortOrder} dari {state.sections.length} · {answeredCount}/{questions.length} terjawab</p>
                            <div className="mt-3 flex flex-wrap gap-2" aria-label="Tahapan tes diagnostik">
                                {state.sections.map((section) => {
                                    const current = section.sectionId === activeSection.sectionId
                                    const completed = section.status.toLowerCase() === 'completed' || section.sortOrder < activeSection.sortOrder
                                    return (
                                        <span
                                            key={section.sectionId}
                                            className={cn(
                                                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black',
                                                current ? 'bg-indigo-600 text-white' : completed ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-slate-100 text-slate-500',
                                            )}
                                        >
                                            {completed && !current ? <Check size={12} /> : <span>{section.sortOrder}</span>}
                                            {section.title}
                                        </span>
                                    )
                                })}
                            </div>
                        </div>
                        <div aria-label="Waktu tersisa" aria-live="polite" className={cn('inline-flex min-h-10 items-center gap-2 rounded-xl px-3 font-mono text-sm font-black tabular-nums', remainingMs !== null && remainingMs <= 60_000 ? 'bg-red-50 text-red-700' : 'bg-indigo-50 text-indigo-700')}>
                            <Clock3 size={16} /> {remainingMs === null ? '--:--' : formatRemaining(remainingMs)}
                        </div>
                    </div>
                    <ProgressBar
                        value={((currentIndex + 1) / questions.length) * 100}
                        label={`Progres bagian ${activeSection.title}`}
                        size="sm"
                        className="mt-3 border-slate-200"
                        indicatorClassName="bg-indigo-600"
                    />
                </header>

                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_16rem]">
                    <article data-testid="diagnostic-question-card" className="rounded-[1.15rem] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
                        <div className="flex items-center justify-between gap-3">
                            <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-indigo-700">Soal {currentIndex + 1} dari {questions.length}</span>
                            <span className="text-[11px] font-bold text-slate-400">{instruction(currentQuestion.responseType)}</span>
                        </div>
                        {currentQuestion.stimulus && (
                            <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm font-semibold leading-relaxed text-slate-700 ring-1 ring-slate-100">
                                {currentQuestion.stimulus.title && <p className="mb-2 font-black text-slate-900">{currentQuestion.stimulus.title}</p>}
                                {currentQuestion.stimulus.imageUrl && <Image src={currentQuestion.stimulus.imageUrl} alt="Stimulus soal" width={800} height={480} unoptimized className="mb-3 max-h-64 w-auto max-w-full object-contain" />}
                                <MathRenderer text={currentQuestion.stimulus.content} />
                            </div>
                        )}
                        <div className="mt-4 text-base font-black leading-relaxed text-slate-950"><MathRenderer text={currentQuestion.stem} /></div>
                        <div className="mt-4 space-y-2.5">
                            {categoryGroups.length > 0 ? categoryGroups.map((group) => (
                                <div key={group} className="space-y-2">
                                    <p className="text-xs font-black text-slate-500">{group}</p>
                                    {currentQuestion.options.filter((option) => (option.responseGroup ?? 'Kelompok') === group).map(renderOption)}
                                </div>
                            )) : currentQuestion.options.map(renderOption)}
                        </div>
                        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                            <button type="button" disabled={currentIndex === 0} onClick={() => { setCurrentIndex((index) => Math.max(0, index - 1)); enteredAtRef.current = Date.now() }} className="st-focus inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-black text-slate-600 disabled:opacity-30"><ArrowLeft size={16} /> Sebelumnya</button>
                            {currentIndex < questions.length - 1 ? (
                                <button type="button" onClick={() => { setCurrentIndex((index) => Math.min(questions.length - 1, index + 1)); enteredAtRef.current = Date.now() }} className="st-focus inline-flex min-h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-black text-white">Berikutnya <ArrowRight size={16} /></button>
                            ) : (
                                <button type="button" data-prevent-double="true" disabled={processing || Boolean(savingId)} onClick={() => void requestFinishSection()} className="st-focus inline-flex min-h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-black text-white disabled:opacity-50">
                                    {isLastSection ? <Send size={16} /> : <ArrowRight size={16} />}{isLastSection ? 'Lihat hasil diagnostik' : `Selesaikan ${activeSection.title}`}
                                </button>
                            )}
                        </div>
                    </article>

                    <aside className="rounded-[1.15rem] border border-slate-200 bg-white p-3 shadow-sm lg:sticky lg:top-3 lg:self-start" aria-label="Navigasi soal diagnostik">
                        <div className="flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                            <span className="flex items-center gap-2"><Grid3X3 size={15} /> Navigasi soal</span>
                            <span className="font-bold text-slate-600">{answeredCount}/{questions.length}</span>
                        </div>
                        <div className="mt-3 grid grid-cols-4 gap-2 lg:grid-cols-4">
                            {questions.map((question, index) => {
                                const answered = (selections[question.attemptQuestionId] ?? []).length > 0
                                const isCurrent = index === currentIndex
                                return (
                                    <button
                                        key={question.attemptQuestionId}
                                        type="button"
                                        aria-label={`Buka soal diagnostik ${index + 1}${isCurrent ? ', sedang dikerjakan' : ''}`}
                                        aria-current={isCurrent ? 'step' : undefined}
                                        onClick={() => { setCurrentIndex(index); enteredAtRef.current = Date.now() }}
                                        style={isCurrent ? { outline: '3px solid #ef4444', outlineOffset: '2px' } : undefined}
                                        className={cn(
                                            'st-focus relative flex h-9 items-center justify-center rounded-lg text-xs font-black transition-all',
                                            isCurrent && answered
                                                ? 'z-10 bg-emerald-600 text-white shadow-xs ring-2 ring-indigo-600 ring-offset-2 border border-emerald-700'
                                                : isCurrent
                                                    ? 'z-10 bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-600 ring-offset-2'
                                                    : answered
                                                        ? 'bg-emerald-600 text-white shadow-xs border border-emerald-700'
                                                        : 'bg-slate-100 text-slate-600 border border-slate-200/80 hover:bg-slate-200 hover:text-slate-900',
                                        )}
                                    >
                                        {index + 1}
                                        {isCurrent && (
                                            <span aria-hidden="true" className="absolute -right-1.5 -top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-red-500 shadow-sm" />
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                        <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-slate-600">
                            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" /> Sedang dikerjakan</span>
                            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-600" /> Terjawab</span>
                        </div>
                    </aside>
                </div>
            </div>

            <TkaSectionConfirmModal
                message={sectionConfirmMessage}
                processing={processing}
                onCancel={() => setSectionConfirmMessage(null)}
                onConfirm={() => {
                    setSectionConfirmMessage(null)
                    void finishSection(false)
                }}
            />
        </main>
    )
}
