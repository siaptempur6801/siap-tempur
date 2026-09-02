'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Check, CheckCircle2, ChevronLeft, ChevronRight, RotateCcw, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import MathRenderer from '@/components/MathRenderer'
import { cn } from '@/lib/utils'
import { reviewTkaWrongQuestion } from '@/app/actions/tka-wrong-questions'
import type { TkaWrongQuestionItem } from '@/src/services/tka-wrong-question.service'

type Feedback = {
    isCorrect: boolean
    scoreAwarded: number
    remainingOpen: number
    explanation: string
} | null

function responseInstruction(type: string) {
    if (type === 'multiple_choice') return 'Pilih semua jawaban yang benar.'
    if (type === 'category') return 'Pilih satu jawaban pada setiap kelompok.'
    return 'Pilih satu jawaban yang paling tepat.'
}

function failureLabel(item: TkaWrongQuestionItem) {
    if (item.latestOutcome === 'unanswered') return 'Belum dijawab'
    return 'Jawaban salah'
}

export default function TkaWrongQuestionModeClient({
    initialItems,
}: {
    initialItems: TkaWrongQuestionItem[]
}) {
    const [items, setItems] = useState(initialItems)
    const [currentIndex, setCurrentIndex] = useState(0)
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [feedback, setFeedback] = useState<Feedback>(null)
    const [processing, setProcessing] = useState(false)
    const [remainingOpen, setRemainingOpen] = useState(initialItems.length)

    const current = items[currentIndex] ?? null
    const categoryGroups = useMemo(() => current?.responseType === 'category'
        ? Array.from(new Set(current.options.map((option) => option.responseGroup ?? 'Kelompok')))
        : [], [current])

    const chooseOption = (optionId: string) => {
        if (!current || processing || feedback?.isCorrect) return
        const option = current.options.find((candidate) => candidate.id === optionId)
        let next: string[]

        if (current.responseType === 'single_choice') {
            next = [optionId]
        } else if (current.responseType === 'category') {
            const group = option?.responseGroup ?? null
            const groupIds = new Set(current.options
                .filter((candidate) => (candidate.responseGroup ?? null) === group)
                .map((candidate) => candidate.id))
            const withoutGroup = selectedIds.filter((id) => !groupIds.has(id))
            next = selectedIds.includes(optionId) ? withoutGroup : [...withoutGroup, optionId]
        } else {
            next = selectedIds.includes(optionId)
                ? selectedIds.filter((id) => id !== optionId)
                : [...selectedIds, optionId]
        }

        setSelectedIds(next)
        if (feedback && !feedback.isCorrect) setFeedback(null)
    }

    const checkAnswer = async () => {
        if (!current || processing) return
        if (selectedIds.length === 0) {
            toast.error('Pilih jawaban terlebih dahulu.')
            return
        }

        setProcessing(true)
        try {
            const result = await reviewTkaWrongQuestion({
                wrongQuestionId: current.wrongQuestionId,
                optionIds: selectedIds,
            })
            if (result.error) {
                toast.error(result.error)
                return
            }
            const nextFeedback = {
                isCorrect: result.isCorrect === true,
                scoreAwarded: Number(result.scoreAwarded ?? 0),
                remainingOpen: Number(result.remainingOpen ?? remainingOpen),
                explanation: String(result.explanation ?? ''),
            }
            setFeedback(nextFeedback)
            setRemainingOpen(nextFeedback.remainingOpen)
            if (nextFeedback.isCorrect) toast.success('Benar. Soal ini sudah selesai diulang.')
        } catch {
            toast.error('Jawaban belum bisa diperiksa. Coba lagi.')
        } finally {
            setProcessing(false)
        }
    }

    const nextResolved = () => {
        if (!current || !feedback?.isCorrect) return
        const nextItems = items.filter((item) => item.wrongQuestionId !== current.wrongQuestionId)
        setItems(nextItems)
        setCurrentIndex(Math.min(currentIndex, Math.max(0, nextItems.length - 1)))
        setSelectedIds([])
        setFeedback(null)
    }

    const navigate = (direction: -1 | 1) => {
        if (!current || processing || feedback?.isCorrect) return
        const next = Math.max(0, Math.min(items.length - 1, currentIndex + direction))
        if (next === currentIndex) return
        setCurrentIndex(next)
        setSelectedIds([])
        setFeedback(null)
    }

    if (!current) {
        return (
            <main data-experience-mode="learning" data-program="tka-smp" className="st-product min-h-screen px-4 py-10">
                <section className="st-card-lg mx-auto max-w-2xl p-8 text-center md:p-10">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center border-2 border-slate-900 bg-emerald-100 text-emerald-700"><CheckCircle2 size={27}/></div>
                    <h1 className="st-heading-display mt-5 text-4xl">Semua soal sudah diulang.</h1>
                    <p className="st-muted mt-3 font-semibold leading-relaxed">Tidak ada soal salah atau belum dijawab yang masih perlu kamu ulang saat ini.</p>
                    <Link href="/tka/smp" className="st-button st-focus mt-6 inline-flex min-h-11 items-center bg-slate-950 px-5 py-2.5 text-sm font-black text-white">Kembali ke TKA SMP</Link>
                </section>
            </main>
        )
    }

    const renderOption = (option: TkaWrongQuestionItem['options'][number], index: number) => {
        const selected = selectedIds.includes(option.id)
        return (
            <button
                key={option.id}
                type="button"
                onClick={() => chooseOption(option.id)}
                disabled={processing || feedback?.isCorrect === true}
                data-selected={selected}
                className={cn(
                    'st-option p-3.5 text-left transition disabled:cursor-not-allowed disabled:opacity-70',
                    selected ? 'bg-blue-50' : 'bg-white',
                )}
            >
                <div className="flex items-start gap-3">
                    <span className={cn(
                        'flex h-8 min-w-8 items-center justify-center border-2 border-slate-900 text-xs font-black',
                        selected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700',
                    )}>
                        {selected ? <Check size={15}/> : option.key || String.fromCharCode(65 + index)}
                    </span>
                    <div className="min-w-0 flex-1 space-y-2 text-sm font-semibold leading-relaxed text-slate-800 md:text-base">
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
        <main data-experience-mode="learning" data-program="tka-smp" className="st-product min-h-screen p-3 md:p-6">
            <div className="mx-auto max-w-6xl space-y-5">
                <header className="st-card p-5 md:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="max-w-3xl">
                            <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-red-700"><RotateCcw size={16}/> TKA SMP · Soal yang perlu diulang</div>
                            <h1 className="st-heading-display mt-2 text-3xl md:text-4xl">Pelajari kembali satu soal dalam satu waktu.</h1>
                            <p className="st-muted mt-2 text-sm font-semibold leading-relaxed">Setelah kamu menjawab dengan benar, soal akan keluar dari daftar yang perlu diulang.</p>
                        </div>
                        <div className="border-2 border-slate-900 bg-yellow-100 px-5 py-3 text-center shadow-[2px_2px_0_#111827]">
                            <div className="text-[10px] font-black uppercase tracking-wide text-amber-800">Tersisa</div>
                            <div className="mt-0.5 text-2xl font-black text-slate-950">{remainingOpen}</div>
                        </div>
                    </div>
                </header>

                <section className="grid gap-4 lg:grid-cols-[1fr_17rem]">
                    <article className="st-card min-w-0 p-4 md:p-6">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="st-pill bg-emerald-100 text-emerald-800">{current.subjectCode || 'TKA SMP'}</span>
                                <span className="st-pill bg-red-100 text-red-700">{failureLabel(current)}</span>
                                {current.questionCode && <span className="text-xs font-bold text-slate-500">{current.questionCode}</span>}
                            </div>
                            <span className="text-xs font-bold text-slate-500">Perlu diulang {current.failureCount}x</span>
                        </div>

                        {current.stimulus && (
                            <div className="st-warning mt-5 p-4">
                                {current.stimulus.title && <h2 className="st-heading mb-2">{current.stimulus.title}</h2>}
                                {current.stimulus.imageUrl && (
                                    <Image src={current.stimulus.imageUrl} alt="Stimulus soal" width={960} height={540} unoptimized className="mb-3 max-h-80 w-auto max-w-full object-contain" />
                                )}
                                <div className="text-sm font-semibold leading-relaxed text-slate-700 md:text-base"><MathRenderer text={current.stimulus.content} /></div>
                            </div>
                        )}

                        <div className="mt-5 text-lg font-bold leading-relaxed text-slate-950"><MathRenderer text={current.stem} /></div>
                        <p className="st-muted mt-2 text-sm font-semibold">{responseInstruction(current.responseType)}</p>

                        <div className="mt-5 space-y-3">
                            {current.responseType === 'category'
                                ? categoryGroups.map((group) => (
                                    <div key={group} className="space-y-2 border-l-4 border-blue-300 bg-slate-50 p-3">
                                        <div className="text-xs font-black uppercase tracking-wide text-slate-500">{group}</div>
                                        {current.options.filter((option) => (option.responseGroup ?? 'Kelompok') === group).map(renderOption)}
                                    </div>
                                ))
                                : current.options.map(renderOption)}
                        </div>

                        {feedback && (
                            <div className={cn('mt-6 p-4', feedback.isCorrect ? 'st-success' : 'st-danger')}>
                                <div className={cn('flex items-center gap-2 font-black', feedback.isCorrect ? 'text-emerald-800' : 'text-red-800')}>
                                    {feedback.isCorrect ? <CheckCircle2 size={20}/> : <XCircle size={20}/>}
                                    {feedback.isCorrect ? 'Benar. Soal ini sudah selesai diulang.' : 'Belum tepat. Pelajari pembahasan lalu coba jawaban lain.'}
                                </div>
                                {feedback.explanation && (
                                    <div className="mt-3 border-t-2 border-dashed border-slate-200 pt-3 text-sm font-semibold leading-relaxed text-slate-700">
                                        <div className="mb-1 text-xs font-black uppercase text-slate-500">Pembahasan</div>
                                        <MathRenderer text={feedback.explanation} />
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t-2 border-dashed border-slate-200 pt-5">
                            <Link href="/tka/smp" className="st-button st-focus inline-flex min-h-11 items-center bg-white px-4 py-2.5 text-sm font-black text-slate-800">Keluar</Link>
                            {feedback?.isCorrect ? (
                                <button type="button" onClick={nextResolved} className="st-button st-focus inline-flex min-h-11 items-center gap-2 bg-emerald-500 px-5 py-2.5 text-sm font-black text-white">
                                    Lanjut <ChevronRight size={17}/>
                                </button>
                            ) : (
                                <button type="button" onClick={checkAnswer} disabled={processing || selectedIds.length === 0} className="st-button st-focus inline-flex min-h-11 items-center bg-slate-950 px-5 py-2.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50">
                                    {processing ? 'Memeriksa...' : feedback ? 'Periksa lagi' : 'Periksa jawaban'}
                                </button>
                            )}
                        </div>
                    </article>

                    <aside className="st-card h-fit p-4 lg:sticky lg:top-5">
                        <div className="text-xs font-black uppercase tracking-wide text-slate-500">Daftar soal</div>
                        <div className="mt-1 text-2xl font-black tracking-tight text-slate-950">{currentIndex + 1}/{items.length}</div>
                        <div className="mt-4 grid grid-cols-2 gap-2">
                            <button type="button" onClick={() => navigate(-1)} disabled={currentIndex === 0 || processing || feedback?.isCorrect === true} className="st-flat-card inline-flex min-h-11 items-center justify-center gap-1 px-3 py-2 text-xs font-black text-slate-700 disabled:opacity-40">
                                <ChevronLeft size={16}/> Sebelumnya
                            </button>
                            <button type="button" onClick={() => navigate(1)} disabled={currentIndex >= items.length - 1 || processing || feedback?.isCorrect === true} className="st-flat-card inline-flex min-h-11 items-center justify-center gap-1 px-3 py-2 text-xs font-black text-slate-700 disabled:opacity-40">
                                Berikutnya <ChevronRight size={16}/>
                            </button>
                        </div>
                        <div className="st-muted mt-4 space-y-2 border-t-2 border-dashed border-slate-200 pt-4 text-xs font-semibold leading-relaxed">
                            <p><b className="text-slate-800">Salah:</b> {current.wrongCount}x</p>
                            <p><b className="text-slate-800">Belum dijawab:</b> {current.unansweredCount}x</p>
                            <p>Jawab dengan benar agar soal ini ditandai selesai dan keluar dari daftar yang perlu diulang.</p>
                        </div>
                    </aside>
                </section>
            </div>
        </main>
    )
}
