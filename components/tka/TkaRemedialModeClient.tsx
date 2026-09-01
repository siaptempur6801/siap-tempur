'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { ArrowLeft, CheckCircle2, ChevronRight, RotateCcw, Sparkles } from 'lucide-react'
import MathRenderer from '@/components/MathRenderer'
import { reviewTkaRemedialItem } from '@/app/actions/tka-remedial'
import type { TkaRemedialItem, TkaRemedialSession } from '@/src/services/tka-remedial.service'
import { cn } from '@/lib/utils'

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
            <main data-experience-mode="learning" data-program="tka-smp" className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950">
                <div className="mx-auto max-w-3xl rounded-[2rem] border border-emerald-200 bg-white p-8 text-center shadow-[var(--px-shadow-md)]">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><CheckCircle2 size={27}/></div>
                    <h1 className="mt-5 text-3xl font-extrabold tracking-tight">Tidak ada latihan perbaikan aktif.</h1>
                    <p className="mx-auto mt-2 max-w-lg leading-relaxed text-slate-600">Kamu bisa kembali ke TKA SMP untuk melanjutkan latihan atau melihat perkembangan belajar.</p>
                    <Link href="/tka/smp" className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2">Kembali ke TKA SMP</Link>
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
        <main data-experience-mode="learning" data-program="tka-smp" className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 md:px-8 md:py-8">
            <div className="mx-auto max-w-6xl space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Link href="/tka/smp" className="inline-flex min-h-11 items-center gap-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-white hover:px-3 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2">
                        <ArrowLeft size={17}/> TKA SMP
                    </Link>
                    <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">Latihan perbaikan</span>
                </div>

                <section className="rounded-3xl border border-amber-100 bg-white p-5 shadow-[var(--px-shadow-xs)] md:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="max-w-3xl">
                            <div className="flex items-center gap-2 text-sm font-semibold text-amber-700"><Sparkles size={16}/> Fokus pada bagian yang perlu diperbaiki</div>
                            <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Latihan perbaikan</h1>
                            <p className="mt-2 text-sm leading-relaxed text-slate-600">SiapTempur memilih beberapa soal dari bagian yang masih perlu kamu pahami. Jawab dengan benar untuk menuntaskan satu per satu.</p>
                        </div>
                        <div className="min-w-40 rounded-2xl bg-amber-50 p-3 text-center">
                            <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">Perkembangan</div>
                            <div className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">{completedItems}/{totalItems}</div>
                        </div>
                    </div>
                    <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100" aria-label={`Perkembangan latihan perbaikan ${progress}%`}>
                        <div className="h-full rounded-full bg-amber-500 transition-[width]" style={{ width: `${progress}%` }}/>
                    </div>
                </section>

                {allDone ? (
                    <section className="rounded-[2rem] border border-emerald-200 bg-white p-8 text-center shadow-[var(--px-shadow-sm)]">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><CheckCircle2 size={27}/></div>
                        <h2 className="mt-5 text-3xl font-extrabold tracking-tight">Latihan perbaikan selesai.</h2>
                        <p className="mx-auto mt-2 max-w-xl leading-relaxed text-slate-600">Semua soal pada sesi ini sudah dituntaskan dan perkembangan belajarmu sudah diperbarui.</p>
                        <Link href="/tka/smp" className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">Kembali ke TKA SMP</Link>
                    </section>
                ) : (
                    <div className="grid gap-5 lg:grid-cols-[14rem_minmax(0,1fr)]">
                        <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-4 shadow-[var(--px-shadow-xs)] lg:sticky lg:top-5">
                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Daftar latihan</div>
                            <div className="mt-3 grid grid-cols-5 gap-2 lg:grid-cols-4">
                                {items.map((item, index) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        disabled={item.status === 'completed'}
                                        onClick={() => chooseIndex(index)}
                                        aria-label={`Latihan perbaikan ${item.position}`}
                                        className={cn(
                                            'aspect-square min-h-10 rounded-xl border text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2',
                                            item.status === 'completed'
                                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                                : index === activeIndex
                                                    ? 'border-amber-400 bg-amber-50 text-amber-800'
                                                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                                        )}
                                    >
                                        {item.status === 'completed' ? '✓' : item.position}
                                    </button>
                                ))}
                            </div>
                            <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">Tersisa {pendingItems} soal.</div>
                        </aside>

                        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[var(--px-shadow-xs)] md:p-7">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">{current.subjectCode}</span>
                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">Soal {current.position}/{totalItems}</span>
                                    {current.questionCode && <span className="rounded-full bg-slate-50 px-2.5 py-1 text-slate-500">{current.questionCode}</span>}
                                </div>
                                <span className="text-xs font-medium text-slate-500">{current.reason === 'source_attempt_unanswered' ? 'Sebelumnya belum dijawab' : 'Sebelumnya salah'}</span>
                            </div>

                            {current.stimulus && (
                                <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
                                    {current.stimulus.title && <div className="mb-2 font-bold text-slate-950">{current.stimulus.title}</div>}
                                    <div className="text-sm leading-relaxed text-slate-700 md:text-base"><MathRenderer text={current.stimulus.content}/></div>
                                </div>
                            )}

                            <div className="mt-5 text-lg font-semibold leading-relaxed text-slate-950"><MathRenderer text={current.stem}/></div>
                            <p className="mt-3 text-sm text-slate-500">{instruction}</p>

                            <div className="mt-5 grid gap-3">
                                {current.options.map((option) => {
                                    const selected = selectedIds.includes(option.id)
                                    return (
                                        <button
                                            key={option.id}
                                            type="button"
                                            onClick={() => toggleOption(option.id)}
                                            disabled={feedback?.isCorrect === true}
                                            className={cn(
                                                'flex min-h-12 w-full items-start gap-3 rounded-2xl border p-3.5 text-left text-sm font-medium leading-relaxed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 md:text-base',
                                                selected ? 'border-amber-400 bg-amber-50' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
                                            )}
                                        >
                                            <span className={cn('flex h-8 min-w-8 items-center justify-center rounded-lg border text-xs font-bold', selected ? 'border-amber-500 bg-amber-500 text-white' : 'border-slate-200 bg-slate-50 text-slate-600')}>{option.key || '•'}</span>
                                            <span className="min-w-0 flex-1"><MathRenderer text={option.content}/></span>
                                        </button>
                                    )
                                })}
                            </div>

                            {feedback && (
                                <div className={cn('mt-6 rounded-2xl border p-4 text-sm leading-relaxed', feedback.error ? 'border-red-200 bg-red-50' : feedback.isCorrect ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50')}>
                                    {feedback.error ? (
                                        <div className="font-semibold text-red-700">{feedback.error}</div>
                                    ) : feedback.isCorrect ? (
                                        <>
                                            <div className="font-semibold text-emerald-800">Benar. Perkembangan topik ini sudah diperbarui.</div>
                                            {feedback.explanation && <div className="mt-3 border-t border-emerald-900/10 pt-3 text-slate-700"><MathRenderer text={feedback.explanation}/></div>}
                                        </>
                                    ) : (
                                        <div className="font-semibold text-amber-800">Belum tepat. Pelajari kembali pilihannya lalu coba lagi.</div>
                                    )}
                                </div>
                            )}

                            <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
                                {!feedback?.isCorrect && (
                                    <button
                                        type="button"
                                        disabled={selectedIds.length === 0 || isPending}
                                        onClick={review}
                                        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        <RotateCcw size={16}/> {feedback ? 'Periksa lagi' : 'Periksa jawaban'}
                                    </button>
                                )}
                                {feedback?.isCorrect && pendingIndexes.length > 1 && (
                                    <button type="button" onClick={nextPending} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2">
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
