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
            if (nextFeedback.isCorrect) toast.success('Benar. Soal ini sudah dituntaskan!')
        } catch {
            toast.error('Gagal memeriksa jawaban.')
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
            <main className="min-h-screen bg-[#fdfbf7] px-4 py-10 text-gray-900">
                <section className="mx-auto max-w-2xl border-2 border-gray-900 bg-green-100 p-8 text-center shadow-[6px_6px_0_0_#111]">
                    <CheckCircle2 className="mx-auto" size={44}/>
                    <h1 className="mt-3 font-handwriting text-4xl font-black">Semua sudah dituntaskan.</h1>
                    <p className="mt-2 font-semibold text-gray-700">
                        Tidak ada soal salah atau kosong yang tersisa di queue TKA SMP saat ini.
                    </p>
                    <Link href="/tka/smp" className="mt-5 inline-flex border-2 border-gray-900 bg-white px-5 py-3 font-black shadow-[3px_3px_0_0_#111] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none">
                        Kembali ke TKA SMP
                    </Link>
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
                className={cn(
                    'w-full border-2 p-3 text-left transition shadow-[2px_2px_0_0_#bbb] disabled:cursor-not-allowed',
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
            <div className="mx-auto max-w-6xl space-y-4">
                <header className="border-2 border-gray-900 bg-white p-4 shadow-[4px_4px_0_0_#111]">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-red-700">
                                <RotateCcw size={15}/> TKA SMP · Mode Ulang Soal Salah
                            </div>
                            <h1 className="mt-1 text-2xl font-black">Perbaiki gap satu per satu.</h1>
                            <p className="mt-1 text-sm font-semibold text-gray-600">Soal keluar dari queue setelah kamu menjawabnya dengan benar.</p>
                        </div>
                        <div className="border-2 border-gray-900 bg-yellow-100 px-4 py-2 text-center shadow-[2px_2px_0_0_#111]">
                            <div className="text-[10px] font-black uppercase text-gray-500">Tersisa</div>
                            <div className="text-2xl font-black">{remainingOpen}</div>
                        </div>
                    </div>
                </header>

                <section className="grid gap-4 lg:grid-cols-[1fr_280px]">
                    <article className="min-w-0 border-2 border-gray-900 bg-white p-4 shadow-[4px_4px_0_0_#111] md:p-6">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="border border-gray-900 bg-cyan-100 px-2 py-1 text-xs font-black">{current.subjectCode || 'TKA SMP'}</span>
                                <span className="border border-gray-900 bg-red-50 px-2 py-1 text-xs font-black text-red-800">{failureLabel(current)}</span>
                                {current.questionCode && <span className="text-xs font-bold text-gray-500">{current.questionCode}</span>}
                            </div>
                            <span className="text-xs font-bold text-gray-500">Pernah gagal {current.failureCount}x</span>
                        </div>

                        {current.stimulus && (
                            <div className="mt-4 border-2 border-gray-900 bg-gray-50 p-4">
                                {current.stimulus.title && <h2 className="mb-2 font-black">{current.stimulus.title}</h2>}
                                {current.stimulus.imageUrl && (
                                    <Image src={current.stimulus.imageUrl} alt="Stimulus soal" width={960} height={540} unoptimized className="mb-3 max-h-80 w-auto max-w-full object-contain" />
                                )}
                                <MathRenderer text={current.stimulus.content} />
                            </div>
                        )}

                        <div className="mt-5 text-lg font-bold leading-relaxed">
                            <MathRenderer text={current.stem} />
                        </div>
                        <p className="mt-2 text-sm font-semibold text-gray-500">{responseInstruction(current.responseType)}</p>

                        <div className="mt-4 space-y-3">
                            {current.responseType === 'category'
                                ? categoryGroups.map((group) => (
                                    <div key={group} className="space-y-2 border-l-4 border-cyan-300 pl-3">
                                        <div className="text-xs font-black uppercase text-gray-500">{group}</div>
                                        {current.options.filter((option) => (option.responseGroup ?? 'Kelompok') === group).map(renderOption)}
                                    </div>
                                ))
                                : current.options.map(renderOption)}
                        </div>

                        {feedback && (
                            <div className={cn(
                                'mt-5 border-2 border-gray-900 p-4 shadow-[3px_3px_0_0_#111]',
                                feedback.isCorrect ? 'bg-green-100' : 'bg-red-100',
                            )}>
                                <div className="flex items-center gap-2 font-black">
                                    {feedback.isCorrect ? <CheckCircle2 size={20}/> : <XCircle size={20}/>}
                                    {feedback.isCorrect ? 'Benar! Soal ini sudah dituntaskan.' : 'Belum tepat. Pilih jawaban lain lalu coba lagi.'}
                                </div>
                                {feedback.explanation && (
                                    <div className="mt-3 border-t border-gray-900/20 pt-3 text-sm font-semibold text-gray-700">
                                        <div className="mb-1 text-xs font-black uppercase text-gray-500">Pembahasan</div>
                                        <MathRenderer text={feedback.explanation} />
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                            <Link href="/tka/smp" className="border-2 border-gray-900 bg-white px-4 py-2 font-black shadow-[2px_2px_0_0_#bbb]">Keluar</Link>
                            {feedback?.isCorrect ? (
                                <button type="button" onClick={nextResolved} className="inline-flex items-center gap-2 border-2 border-gray-900 bg-green-200 px-5 py-2 font-black shadow-[3px_3px_0_0_#111] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none">
                                    Lanjut <ChevronRight size={18}/>
                                </button>
                            ) : (
                                <button type="button" onClick={checkAnswer} disabled={processing || selectedIds.length === 0} className="border-2 border-gray-900 bg-gray-900 px-5 py-2 font-black text-white shadow-[3px_3px_0_0_#aaa] disabled:cursor-not-allowed disabled:opacity-50">
                                    {processing ? 'Memeriksa...' : feedback ? 'Periksa lagi' : 'Periksa jawaban'}
                                </button>
                            )}
                        </div>
                    </article>

                    <aside className="h-fit border-2 border-gray-900 bg-white p-4 shadow-[3px_3px_0_0_#111]">
                        <div className="text-xs font-black uppercase text-gray-500">Queue lokal</div>
                        <div className="mt-1 text-2xl font-black">{currentIndex + 1}/{items.length}</div>
                        <div className="mt-4 grid grid-cols-2 gap-2">
                            <button type="button" onClick={() => navigate(-1)} disabled={currentIndex === 0 || processing || feedback?.isCorrect === true} className="inline-flex items-center justify-center gap-1 border-2 border-gray-900 bg-white px-3 py-2 font-black disabled:opacity-40">
                                <ChevronLeft size={17}/> Prev
                            </button>
                            <button type="button" onClick={() => navigate(1)} disabled={currentIndex >= items.length - 1 || processing || feedback?.isCorrect === true} className="inline-flex items-center justify-center gap-1 border-2 border-gray-900 bg-white px-3 py-2 font-black disabled:opacity-40">
                                Next <ChevronRight size={17}/>
                            </button>
                        </div>
                        <div className="mt-4 space-y-2 text-xs font-semibold text-gray-600">
                            <p><b>Salah:</b> {current.wrongCount}x</p>
                            <p><b>Kosong:</b> {current.unansweredCount}x</p>
                            <p>Jawaban benar di mode ini akan mengubah state soal menjadi <b>resolved</b>.</p>
                        </div>
                    </aside>
                </section>
            </div>
        </main>
    )
}
