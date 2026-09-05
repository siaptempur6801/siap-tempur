'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { ArrowLeft, CheckCircle2, ChevronRight, RotateCcw, Sparkles } from 'lucide-react'
import MathRenderer from '@/components/MathRenderer'
import { reviewTkaRemedialItem } from '@/app/actions/tka-remedial'
import type { TkaRemedialItem, TkaRemedialSession } from '@/src/services/tka-remedial.service'
import { cn } from '@/lib/utils'
import ProgressBar from '@/components/ui/ProgressBar'

type Feedback = {
    isCorrect: boolean
    explanation: string
    error?: string
} | null

export default function TkaRemedialModeClient({
    initialSession,
    initialItems,
}: {
    initialSession: TkaRemedialSession
    initialItems: TkaRemedialItem[]
}) {
    const [items, setItems] = useState(initialItems)
    const firstPending = Math.max(0, initialItems.findIndex((item) => item.status === 'pending'))
    const [activeIndex, setActiveIndex] = useState(firstPending)
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [feedback, setFeedback] = useState<Feedback>(null)
    const [completedItems, setCompletedItems] = useState(initialSession.completedItems)
    const [pendingItems, setPendingItems] = useState(initialSession.pendingItems)
    const [sessionStatus, setSessionStatus] = useState(initialSession.status)
    const [isPending, startTransition] = useTransition()

    const current = items[activeIndex] ?? null
    const totalItems = initialSession.totalItems
    const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 100

    const pendingIndexes = useMemo(
        () => items.flatMap((item, index) => item.status === 'pending' ? [index] : []),
        [items],
    )

    function chooseIndex(index: number) {
        if (items[index]?.status === 'completed') return
        setActiveIndex(index)
        setSelectedIds([])
        setFeedback(null)
    }

    function toggleOption(id: string) {
        if (!current || feedback?.isCorrect) return
        if (current.responseType === 'single_choice') {
            setSelectedIds([id])
            return
        }
        setSelectedIds((previous) => previous.includes(id)
            ? previous.filter((value) => value !== id)
            : [...previous, id])
    }

    function review() {
        if (!current || selectedIds.length === 0 || isPending) return
        startTransition(async () => {
            const result = await reviewTkaRemedialItem({
                sessionId: initialSession.id,
                itemId: current.id,
                optionIds: selectedIds,
            })
            if ('error' in result && result.error) {
                setFeedback({ isCorrect: false, explanation: '', error: result.error })
                return
            }
            if (!('success' in result) || !result.success) return

            setFeedback({
                isCorrect: result.isCorrect,
                explanation: result.explanation ?? '',
            })
            setCompletedItems(result.completedItems)
            setPendingItems(result.pendingItems)
            setSessionStatus(result.sessionStatus)
            if (result.isCorrect) {
                setItems((previous) => previous.map((item) => item.id === current.id
                    ? { ...item, status: 'completed', bestScore: Math.max(item.bestScore, result.scoreAwarded) }
                    : item))
            }
        })
    }

    function nextPending() {
        const next = items.findIndex((item, index) => index > activeIndex && item.status === 'pending')
        const fallback = items.findIndex((item) => item.status === 'pending')
        const target = next >= 0 ? next : fallback
        if (target >= 0) chooseIndex(target)
    }

    if (!current || totalItems === 0) {
        return (
            <main data-experience-mode="learning" data-program="tka-smp" className="st-product min-h-screen px-4 py-8">
                <div className="st-card-lg mx-auto max-w-3xl p-8 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center border-2 border-slate-900 bg-emerald-100 text-emerald-700"><CheckCircle2 size={27}/></div>
                    <h1 className="st-heading-display mt-5 text-4xl">Tidak ada latihan perbaikan aktif.</h1>
                    <p className="st-muted mx-auto mt-2 max-w-lg font-semibold leading-relaxed">Kamu bisa kembali ke TKA SMP untuk melanjutkan latihan atau melihat perkembangan belajar.</p>
                    <Link href="/tka/smp" className="st-button st-focus mt-6 inline-flex min-h-11 items-center bg-slate-950 px-5 py-2.5 text-sm font-black text-white">Kembali ke TKA SMP</Link>
                </div>
            </main>
        )
    }

    const allDone = sessionStatus === 'completed' || pendingItems === 0
    const instruction = current.responseType === 'single_choice'
        ? 'Pilih satu jawaban yang paling tepat.'
        : current.responseType === 'multiple_choice'
            ? 'Pilih semua jawaban yang menurutmu benar.'
            : 'Pasangkan pilihan sesuai kategori yang diminta.'

    return (
        <main data-experience-mode="learning" data-program="tka-smp" className="st-product min-h-screen px-4 py-6 md:px-8 md:py-8">
            <div className="mx-auto max-w-6xl space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Link href="/tka/smp" className="st-focus inline-flex min-h-11 items-center gap-2 text-sm font-black text-slate-700 hover:text-blue-700">
                        <ArrowLeft size={17}/> TKA SMP
                    </Link>
                    <span className="st-pill bg-yellow-100 text-amber-800">Latihan perbaikan</span>
                </div>

                <section className="st-card p-5 md:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="max-w-3xl">
                            <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-amber-800"><Sparkles size={16}/> Fokus pada bagian yang perlu diperbaiki</div>
                            <h1 className="st-heading-display mt-2 text-4xl">Latihan perbaikan</h1>
                            <p className="st-muted mt-2 text-sm font-semibold leading-relaxed">SiapTempur memilih beberapa soal dari bagian yang masih perlu kamu pahami. Jawab dengan benar untuk menuntaskan satu per satu.</p>
                        </div>
                        <div className="border-2 border-slate-900 bg-yellow-100 p-3 text-center shadow-[2px_2px_0_#111827]">
                            <div className="text-xs font-black uppercase tracking-wide text-amber-800">Perkembangan</div>
                            <div className="mt-1 text-2xl font-black tracking-tight text-slate-950">{completedItems}/{totalItems}</div>
                        </div>
                    </div>
                    <ProgressBar
                        value={progress}
                        label="Perkembangan latihan perbaikan"
                        size="sm"
                        className="mt-5 bg-white"
                        indicatorClassName="bg-yellow-300"
                    />
                </section>

                {allDone ? (
                    <section className="st-success p-8 text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center border-2 border-slate-900 bg-emerald-100 text-emerald-700"><CheckCircle2 size={27}/></div>
                        <h2 className="st-heading-display mt-5 text-4xl">Latihan perbaikan selesai.</h2>
                        <p className="st-muted mx-auto mt-2 max-w-xl font-semibold leading-relaxed">Semua soal pada sesi ini sudah dituntaskan dan perkembangan belajarmu sudah diperbarui.</p>
                        <Link href="/tka/smp" className="st-button st-focus mt-6 inline-flex min-h-11 items-center bg-slate-950 px-5 py-2.5 text-sm font-black text-white">Kembali ke TKA SMP</Link>
                    </section>
                ) : (
                    <div className="grid gap-5 lg:grid-cols-[14rem_minmax(0,1fr)]">
                        <aside className="st-card h-fit p-4 lg:sticky lg:top-5">
                            <div className="text-xs font-black uppercase tracking-wide text-slate-500">Daftar latihan</div>
                            <div className="mt-3 grid grid-cols-5 gap-2 lg:grid-cols-4">
                                {items.map((item, index) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        disabled={item.status === 'completed'}
                                        onClick={() => chooseIndex(index)}
                                        aria-label={`Latihan perbaikan ${item.position}`}
                                        className={cn(
                                            'st-focus aspect-square min-h-10 border-2 border-slate-900 text-sm font-black transition-colors',
                                            item.status === 'completed'
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : index === activeIndex
                                                    ? 'bg-yellow-200 text-slate-950'
                                                    : 'bg-white text-slate-700 hover:bg-yellow-50',
                                        )}
                                    >
                                        {item.status === 'completed' ? '✓' : item.position}
                                    </button>
                                ))}
                            </div>
                            <div className="st-muted mt-4 border-t-2 border-dashed border-slate-200 pt-3 text-xs font-bold">Tersisa {pendingItems} soal.</div>
                        </aside>

                        <article className="st-card min-w-0 p-5 md:p-7">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex flex-wrap gap-2 text-xs font-black">
                                    <span className="st-pill bg-emerald-100 text-emerald-800">{current.subjectCode}</span>
                                    <span className="st-pill bg-slate-100 text-slate-700">Soal {current.position}/{totalItems}</span>
                                    {current.questionCode && <span className="st-pill bg-white text-slate-500">{current.questionCode}</span>}
                                </div>
                                <span className="text-xs font-bold text-slate-500">{current.reason === 'source_attempt_unanswered' ? 'Sebelumnya belum dijawab' : 'Sebelumnya salah'}</span>
                            </div>

                            {current.stimulus && (
                                <div className="st-warning mt-5 p-4">
                                    {current.stimulus.title && <div className="st-heading mb-2">{current.stimulus.title}</div>}
                                    <div className="text-sm font-semibold leading-relaxed text-slate-700 md:text-base"><MathRenderer text={current.stimulus.content}/></div>
                                </div>
                            )}

                            <div className="mt-5 text-lg font-bold leading-relaxed text-slate-950"><MathRenderer text={current.stem}/></div>
                            <p className="st-muted mt-3 text-sm font-semibold">{instruction}</p>

                            <div className="mt-5 grid gap-3">
                                {current.options.map((option) => {
                                    const selected = selectedIds.includes(option.id)
                                    return (
                                        <button
                                            key={option.id}
                                            type="button"
                                            onClick={() => toggleOption(option.id)}
                                            disabled={feedback?.isCorrect === true}
                                            data-selected={selected}
                                            className="st-option st-focus flex min-h-12 w-full items-start gap-3 p-3.5 text-left text-sm font-semibold leading-relaxed disabled:cursor-not-allowed disabled:opacity-70 md:text-base"
                                        >
                                            <span className={cn('flex h-8 min-w-8 items-center justify-center border-2 border-slate-900 text-xs font-black', selected ? 'bg-yellow-300 text-slate-950' : 'bg-slate-100 text-slate-700')}>{option.key || '•'}</span>
                                            <span className="min-w-0 flex-1"><MathRenderer text={option.content}/></span>
                                        </button>
                                    )
                                })}
                            </div>

                            {feedback && (
                                <div className={cn('mt-6 p-4 text-sm font-semibold leading-relaxed', feedback.error ? 'st-danger' : feedback.isCorrect ? 'st-success' : 'st-warning')}>
                                    {feedback.error ? (
                                        <div className="font-black text-red-700">{feedback.error}</div>
                                    ) : feedback.isCorrect ? (
                                        <>
                                            <div className="font-black text-emerald-800">Benar. Perkembangan topik ini sudah diperbarui.</div>
                                            {feedback.explanation && <div className="mt-3 border-t-2 border-dashed border-slate-200 pt-3 text-slate-700"><MathRenderer text={feedback.explanation}/></div>}
                                        </>
                                    ) : (
                                        <div className="font-black text-amber-800">Belum tepat. Pelajari kembali pilihannya lalu coba lagi.</div>
                                    )}
                                </div>
                            )}

                            <div className="mt-6 flex flex-wrap justify-end gap-3 border-t-2 border-dashed border-slate-200 pt-5">
                                {!feedback?.isCorrect && (
                                    <button
                                        type="button"
                                        disabled={selectedIds.length === 0 || isPending}
                                        onClick={review}
                                        className="st-button st-focus inline-flex min-h-11 items-center gap-2 bg-slate-950 px-5 py-2.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        <RotateCcw size={16}/> {feedback ? 'Periksa lagi' : 'Periksa jawaban'}
                                    </button>
                                )}
                                {feedback?.isCorrect && pendingIndexes.length > 1 && (
                                    <button type="button" onClick={nextPending} className="st-button st-focus inline-flex min-h-11 items-center gap-2 bg-yellow-300 px-5 py-2.5 text-sm font-black text-slate-950">
                                        Lanjut latihan <ChevronRight size={17}/>
                                    </button>
                                )}
                            </div>
                        </article>
                    </div>
                )}
            </div>
        </main>
    )
}
