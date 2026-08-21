'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { ArrowLeft, CheckCircle2, ChevronRight, RotateCcw, Sparkles } from 'lucide-react'
import MarkdownRenderer from '@/components/MarkdownRenderer'
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
            <main className="min-h-screen bg-[#fdfbf7] px-4 py-8 text-gray-900">
                <div className="mx-auto max-w-3xl border-2 border-gray-900 bg-white p-8 text-center shadow-[6px_6px_0_0_#111]">
                    <CheckCircle2 className="mx-auto" size={42}/>
                    <h1 className="mt-3 text-3xl font-black">Tidak ada remedial aktif.</h1>
                    <Link href="/tka/smp" className="mt-5 inline-flex border-2 border-gray-900 bg-gray-900 px-5 py-3 font-black text-white">Kembali ke TKA SMP</Link>
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
        <main className="min-h-screen bg-[#fdfbf7] px-4 py-6 text-gray-900 md:px-8 md:py-8">
            <div className="mx-auto max-w-6xl space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Link href="/tka/smp" className="inline-flex items-center gap-2 border-2 border-gray-900 bg-white px-4 py-2 font-black shadow-[3px_3px_0_0_#111]">
                        <ArrowLeft size={18}/> TKA SMP
                    </Link>
                    <span className="border-2 border-gray-900 bg-orange-100 px-3 py-1 text-xs font-black uppercase tracking-widest">
                        TKA SMP · Remedial Otomatis
                    </span>
                </div>

                <section className="border-2 border-gray-900 bg-white p-5 shadow-[5px_5px_0_0_#111]">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-orange-700"><Sparkles size={16}/> Learning Loop</div>
                            <h1 className="mt-1 text-3xl font-black">Remedial otomatis</h1>
                            <p className="mt-1 max-w-2xl text-sm font-semibold text-gray-600">Sistem memilih maksimal 10 gap dari tryout ini. Jawaban benar menuntaskan gap dan langsung menjadi evidence baru untuk mastery topik.</p>
                        </div>
                        <div className="min-w-40 border-2 border-gray-900 bg-orange-50 p-3 text-center">
                            <div className="text-xs font-black uppercase text-gray-500">Progress</div>
                            <div className="text-2xl font-black">{completedItems}/{totalItems}</div>
                        </div>
                    </div>
                    <div className="mt-4 h-3 overflow-hidden border-2 border-gray-900 bg-gray-100">
                        <div className="h-full bg-gray-900 transition-all" style={{ width: `${progress}%` }}/>
                    </div>
                </section>

                {allDone ? (
                    <section className="border-2 border-gray-900 bg-green-50 p-8 text-center shadow-[5px_5px_0_0_#111]">
                        <CheckCircle2 className="mx-auto text-green-700" size={44}/>
                        <h2 className="mt-3 text-3xl font-black">Remedial selesai.</h2>
                        <p className="mt-2 font-semibold text-gray-600">Semua gap dalam sesi ini sudah dituntaskan dan mastery terbaru sudah tersimpan.</p>
                        <Link href="/tka/smp" className="mt-5 inline-flex border-2 border-gray-900 bg-gray-900 px-5 py-3 font-black text-white">Kembali ke TKA SMP</Link>
                    </section>
                ) : (
                    <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
                        <aside className="h-fit border-2 border-gray-900 bg-white p-4 shadow-[4px_4px_0_0_#111]">
                            <div className="text-xs font-black uppercase tracking-widest text-gray-500">10 soal terpilih</div>
                            <div className="mt-3 grid grid-cols-5 gap-2 lg:grid-cols-4">
                                {items.map((item, index) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        disabled={item.status === 'completed'}
                                        onClick={() => chooseIndex(index)}
                                        aria-label={`Remedial ${item.position}`}
                                        className={cn(
                                            'aspect-square border-2 border-gray-900 text-sm font-black',
                                            item.status === 'completed' ? 'bg-green-100 text-green-800' : index === activeIndex ? 'bg-orange-200' : 'bg-white hover:bg-orange-50',
                                        )}
                                    >
                                        {item.status === 'completed' ? '✓' : item.position}
                                    </button>
                                ))}
                            </div>
                            <div className="mt-3 text-xs font-bold text-gray-500">Tersisa {pendingItems} soal.</div>
                        </aside>

                        <article className="border-2 border-gray-900 bg-white p-5 shadow-[5px_5px_0_0_#111] md:p-7">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex flex-wrap gap-2 text-xs font-black uppercase">
                                    <span className="border border-gray-900 bg-cyan-100 px-2 py-1">{current.subjectCode}</span>
                                    <span className="border border-gray-900 bg-gray-100 px-2 py-1">Remedial {current.position}/{totalItems}</span>
                                    {current.questionCode && <span className="border border-gray-900 bg-white px-2 py-1">{current.questionCode}</span>}
                                </div>
                                <span className="text-xs font-black text-gray-500">{current.reason === 'source_attempt_unanswered' ? 'Sebelumnya kosong' : 'Sebelumnya salah'}</span>
                            </div>

                            {current.stimulus && (
                                <div className="mt-5 border-2 border-gray-900 bg-[#fff9c4] p-4">
                                    {current.stimulus.title && <div className="mb-2 font-black">{current.stimulus.title}</div>}
                                    <MarkdownRenderer content={current.stimulus.content}/>
                                </div>
                            )}

                            <div className="mt-5 text-lg font-bold"><MarkdownRenderer content={current.stem}/></div>
                            <p className="mt-3 text-sm font-black text-gray-500">{instruction}</p>

                            <div className="mt-4 grid gap-3">
                                {current.options.map((option) => {
                                    const selected = selectedIds.includes(option.id)
                                    return (
                                        <button
                                            key={option.id}
                                            type="button"
                                            onClick={() => toggleOption(option.id)}
                                            disabled={feedback?.isCorrect === true}
                                            className={cn(
                                                'flex w-full items-start gap-3 border-2 border-gray-900 p-3 text-left font-semibold transition',
                                                selected ? 'bg-orange-100 shadow-[3px_3px_0_0_#111]' : 'bg-white hover:bg-gray-50',
                                            )}
                                        >
                                            <span className="flex h-7 min-w-7 items-center justify-center border-2 border-gray-900 bg-white text-xs font-black">{option.key || '•'}</span>
                                            <span className="min-w-0 flex-1"><MarkdownRenderer content={option.content}/></span>
                                        </button>
                                    )
                                })}
                            </div>

                            {feedback && (
                                <div className={cn('mt-5 border-2 border-gray-900 p-4', feedback.error ? 'bg-red-50' : feedback.isCorrect ? 'bg-green-50' : 'bg-yellow-50')}>
                                    {feedback.error ? (
                                        <div className="font-black text-red-700">{feedback.error}</div>
                                    ) : feedback.isCorrect ? (
                                        <>
                                            <div className="font-black text-green-800">Benar! Evidence mastery sudah diperbarui.</div>
                                            {feedback.explanation && <div className="mt-3 border-t border-green-900/20 pt-3"><MarkdownRenderer content={feedback.explanation}/></div>}
                                        </>
                                    ) : (
                                        <div className="font-black text-yellow-800">Belum tepat. Pelajari lagi pilihannya lalu coba ulang.</div>
                                    )}
                                </div>
                            )}

                            <div className="mt-5 flex flex-wrap justify-end gap-3">
                                {!feedback?.isCorrect && (
                                    <button
                                        type="button"
                                        disabled={selectedIds.length === 0 || isPending}
                                        onClick={review}
                                        className="inline-flex items-center gap-2 border-2 border-gray-900 bg-gray-900 px-5 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        <RotateCcw size={17}/> {feedback ? 'Periksa lagi' : 'Periksa jawaban'}
                                    </button>
                                )}
                                {feedback?.isCorrect && pendingIndexes.length > 1 && (
                                    <button type="button" onClick={nextPending} className="inline-flex items-center gap-2 border-2 border-gray-900 bg-orange-200 px-5 py-3 font-black shadow-[3px_3px_0_0_#111]">
                                        Lanjut Remedial <ChevronRight size={18}/>
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
