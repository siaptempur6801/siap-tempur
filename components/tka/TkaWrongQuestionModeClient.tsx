'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
    ArrowLeft,
    BarChart3,
    BookOpen,
    Check,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    ListChecks,
    RotateCcw,
    Sparkles,
    XCircle,
} from 'lucide-react'
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
    if (item.latestOutcome === 'unanswered') return 'Terlewat saat Tryout'
    return 'Perlu Dimantapkan'
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
    const [sessionSolvedCount, setSessionSolvedCount] = useState(0)
    const [subjectFilter, setSubjectFilter] = useState<'ALL' | string>('ALL')

    const availableSubjects = useMemo(() => {
        const set = new Set(items.map((i) => i.subjectCode))
        return Array.from(set).filter(Boolean)
    }, [items])

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
            if (nextFeedback.isCorrect) {
                toast.success('Benar. Soal ini sudah selesai diulang.')
            }
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
        setSessionSolvedCount((prev) => prev + 1)
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
            <main data-experience-mode="learning" data-program="tka-smp" className="min-h-screen px-4 py-12 md:py-16">
                <section className="mx-auto max-w-2xl rounded-2xl border border-slate-200/80 bg-white p-6 text-center shadow-xs md:p-8">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/50">
                        <CheckCircle2 size={36} />
                    </div>
                    <div className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-emerald-100/70 px-3 py-1 text-xs font-black uppercase tracking-wider text-emerald-800">
                        <Sparkles size={14} /> Evaluasi Tuntas
                    </div>
                    <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                        Semua soal sudah diulang.
                    </h1>
                    <p className="mx-auto mt-3 max-w-lg text-base font-medium leading-relaxed text-slate-600">
                        {sessionSolvedCount > 0
                            ? `Hebat! Kamu berhasil menuntaskan ${sessionSolvedCount} soal pada sesi ini. Tidak ada lagi soal salah yang tersisa.`
                            : 'Tidak ada soal salah atau belum dijawab yang masih perlu kamu ulang saat ini. Pemahamanmu sudah sangat baik!'}
                    </p>

                    <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                        <Link
                            href="/tka/smp/progress"
                            className="inline-flex min-h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-black text-white shadow-md shadow-blue-600/20 transition hover:bg-indigo-700"
                        >
                            <BarChart3 size={18} /> Cek Kesiapan Belajar
                        </Link>
                        <Link
                            href="/tka/smp/tryout"
                            className="inline-flex min-h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                        >
                            <ListChecks size={18} /> Coba Tryout Baru
                        </Link>
                    </div>

                    <div className="mt-6 border-t border-slate-100 pt-5">
                        <Link
                            href="/tka/smp"
                            className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800"
                        >
                            <ArrowLeft size={16} /> Kembali ke TKA SMP
                        </Link>
                    </div>
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
                    'group flex w-full items-start gap-3.5 rounded-xl border p-4 text-left transition-all',
                    'disabled:cursor-not-allowed disabled:opacity-75',
                    selected
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 ring-2 ring-indigo-600/20'
                        : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50/80 text-slate-800',
                )}
            >
                <span
                    className={cn(
                        'flex h-8 w-8 min-w-8 shrink-0 items-center justify-center rounded-lg border text-xs font-black transition-colors',
                        selected
                            ? 'border-indigo-600 bg-indigo-600 text-white'
                            : 'border-slate-200 bg-slate-100 text-slate-700 group-hover:border-slate-300',
                    )}
                >
                    {selected ? <Check size={16} /> : option.key || String.fromCharCode(65 + index)}
                </span>
                <div className="min-w-0 flex-1 space-y-2 text-sm md:text-base font-semibold leading-relaxed">
                    {option.imageUrl && (
                        <Image
                            src={option.imageUrl}
                            alt="Pilihan jawaban"
                            width={640}
                            height={360}
                            unoptimized
                            className="max-h-56 w-auto max-w-full rounded-lg border border-slate-200 object-contain"
                        />
                    )}
                    <MathRenderer text={option.content} />
                </div>
            </button>
        )
    }

    return (
        <main data-experience-mode="learning" data-program="tka-smp" className="min-h-screen px-4 py-6 md:px-8 md:py-8">
            <div className="mx-auto max-w-6xl space-y-6 md:space-y-8">
                {/* Header Evaluasi Soal Salah */}
                <header className="rounded-2xl border border-slate-200/80 bg-white p-5 md:p-6 shadow-xs">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-rose-600">
                                <RotateCcw size={16} /> TKA SMP · Soal yang perlu diulang
                            </div>
                            <h1 className="mt-2 text-xl md:text-2xl font-black tracking-tight text-slate-950">
                                Kuasai kembali soal yang belum tepat, satu per satu.
                            </h1>
                            <p className="mt-1.5 max-w-2xl text-sm font-medium leading-relaxed text-slate-600">
                                Setelah kamu menjawab dengan benar, soal akan keluar dari daftar yang perlu diulang. Setiap pemahaman tuntas langsung memperkuat skor kesiapan belajarmu.
                            </p>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                            <div className="rounded-xl border border-rose-100 bg-rose-50/80 px-4 py-3 text-center min-w-24">
                                <div className="text-[11px] font-black uppercase tracking-wider text-rose-700">Tersisa</div>
                                <div className="mt-0.5 text-2xl font-black text-rose-950">{remainingOpen}</div>
                            </div>
                            {sessionSolvedCount > 0 && (
                                <div className="rounded-xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-center min-w-24">
                                    <div className="text-[11px] font-black uppercase tracking-wider text-emerald-700">Tuntas Sesi</div>
                                    <div className="mt-0.5 text-2xl font-black text-emerald-950">+{sessionSolvedCount}</div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Filter Mata Pelajaran */}
                    {availableSubjects.length > 1 && (
                        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                            <span className="mr-1 text-xs font-bold text-slate-400">Filter Mapel:</span>
                            <button
                                type="button"
                                onClick={() => setSubjectFilter('ALL')}
                                className={cn(
                                    'rounded-lg px-3 py-1.5 text-xs font-bold transition',
                                    subjectFilter === 'ALL'
                                        ? 'bg-slate-900 text-white shadow-sm'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                                )}
                            >
                                Semua ({items.length})
                            </button>
                            {availableSubjects.map((code) => {
                                const count = items.filter((i) => i.subjectCode === code).length
                                const label = code === 'BIN' ? 'Bahasa Indonesia' : code === 'MAT' ? 'Matematika' : code
                                return (
                                    <button
                                        key={code}
                                        type="button"
                                        onClick={() => {
                                            setSubjectFilter(code)
                                            const firstIndex = items.findIndex((i) => i.subjectCode === code)
                                            if (firstIndex >= 0 && items[currentIndex]?.subjectCode !== code) {
                                                setCurrentIndex(firstIndex)
                                                setSelectedIds([])
                                                setFeedback(null)
                                            }
                                        }}
                                        className={cn(
                                            'rounded-lg px-3 py-1.5 text-xs font-bold transition',
                                            subjectFilter === code
                                                ? 'bg-indigo-600 text-white shadow-sm'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                                        )}
                                    >
                                        {label} ({count})
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </header>

                <section className="grid gap-6 lg:grid-cols-[1fr_18rem]">
                    <article className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-5 md:p-6 shadow-xs">
                        {/* Meta Soal */}
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">
                                    {current.subjectCode === 'BIN' ? 'Bahasa Indonesia' : current.subjectCode === 'MAT' ? 'Matematika' : (current.subjectCode || 'TKA SMP')}
                                </span>
                                <span className={cn(
                                    'rounded-full border px-3 py-1 text-xs font-black',
                                    current.latestOutcome === 'unanswered'
                                        ? 'border-amber-200 bg-amber-50 text-amber-800'
                                        : 'border-rose-200 bg-rose-50 text-rose-700',
                                )}>
                                    {failureLabel(current)}
                                </span>
                                {current.questionCode && (
                                    <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-slate-500">
                                        {current.questionCode}
                                    </span>
                                )}
                            </div>
                            <span className="text-xs font-bold text-slate-500">
                                Perlu diulang {current.failureCount}x
                            </span>
                        </div>

                        {/* Stimulus jika ada */}
                        {current.stimulus && (
                            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/70 p-5">
                                {current.stimulus.title && (
                                    <div className="mb-2.5 flex items-center gap-2 text-sm font-black text-slate-800">
                                        <BookOpen size={16} className="text-indigo-600" />
                                        <span>{current.stimulus.title}</span>
                                    </div>
                                )}
                                {current.stimulus.imageUrl && (
                                    <Image
                                        src={current.stimulus.imageUrl}
                                        alt="Stimulus soal"
                                        width={960}
                                        height={540}
                                        unoptimized
                                        className="mb-4 max-h-80 w-auto max-w-full rounded-lg border border-slate-200 object-contain"
                                    />
                                )}
                                <div className="text-sm md:text-base font-normal leading-relaxed text-slate-700">
                                    <MathRenderer text={current.stimulus.content} />
                                </div>
                            </div>
                        )}

                        {/* Pertanyaan Utama */}
                        <div className="mt-6 text-lg md:text-xl font-bold leading-relaxed text-slate-950">
                            <MathRenderer text={current.stem} />
                        </div>

                        {/* Petunjuk Pengisian */}
                        <p className="mt-3 text-xs md:text-sm font-semibold text-slate-500">
                            {responseInstruction(current.responseType)}
                        </p>

                        {/* Pilihan Jawaban */}
                        <div className="mt-5 space-y-3">
                            {current.responseType === 'category'
                                ? categoryGroups.map((group) => (
                                    <div key={group} className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                                        <div className="text-xs font-black uppercase tracking-wider text-slate-600">{group}</div>
                                        {current.options.filter((option) => (option.responseGroup ?? 'Kelompok') === group).map(renderOption)}
                                    </div>
                                ))
                                : current.options.map(renderOption)}
                        </div>

                        {/* Panel Hasil & Pembahasan */}
                        {feedback && (
                            <div className={cn(
                                'mt-6 rounded-xl border p-5 transition-all',
                                feedback.isCorrect
                                    ? 'border-emerald-200 bg-emerald-50/80 text-emerald-950'
                                    : 'border-rose-200 bg-rose-50/80 text-rose-950',
                            )}>
                                <div className="flex items-start gap-3 font-bold">
                                    {feedback.isCorrect ? (
                                        <CheckCircle2 size={22} className="mt-0.5 shrink-0 text-emerald-600" />
                                    ) : (
                                        <XCircle size={22} className="mt-0.5 shrink-0 text-rose-600" />
                                    )}
                                    <div>
                                        <div className={cn('text-base font-black', feedback.isCorrect ? 'text-emerald-900' : 'text-rose-900')}>
                                            {feedback.isCorrect
                                                ? 'Benar. Soal ini sudah selesai diulang.'
                                                : 'Belum tepat. Pelajari pembahasan lalu coba jawaban lain.'}
                                        </div>
                                        <p className="mt-1 text-xs md:text-sm font-medium opacity-90">
                                            {feedback.isCorrect
                                                ? 'Bagus sekali! Pemahamanmu sudah tuntas dan butir ini telah dikeluarkan dari antrean bank soal salah.'
                                                : 'Jangan berkecil hati. Pelajari alur penyelesaian di bawah ini agar konsep dasarnya semakin jelas.'}
                                        </p>
                                    </div>
                                </div>

                                {feedback.explanation && (
                                    <div className="mt-4 rounded-lg border border-slate-200/90 bg-white/95 p-4 text-slate-800 shadow-xs">
                                        <div className="mb-2 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-indigo-700">
                                            <Sparkles size={14} /> Pembahasan
                                        </div>
                                        <div className="text-sm font-medium leading-relaxed text-slate-700">
                                            <MathRenderer text={feedback.explanation} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Tombol Aksi di Bawah Soal */}
                        <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-5">
                            <Link
                                href="/tka/smp"
                                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                            >
                                <ArrowLeft size={16} /> Kembali ke TKA SMP
                            </Link>

                            {feedback?.isCorrect ? (
                                <button
                                    type="button"
                                    onClick={nextResolved}
                                    className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-black text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700"
                                >
                                    Lanjut <ChevronRight size={17} />
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={checkAnswer}
                                    disabled={processing || selectedIds.length === 0}
                                    className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-6 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    {processing ? 'Memeriksa...' : feedback ? 'Periksa lagi' : 'Periksa jawaban'}
                                </button>
                            )}
                        </div>
                    </article>

                    {/* Aside: Navigator Cepat Nomor Soal */}
                    <aside className="space-y-4 h-fit lg:sticky lg:top-5">
                        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                                    Daftar Soal
                                </span>
                                <span className="text-xs font-bold text-indigo-600">
                                    {currentIndex + 1} dari {items.length}
                                </span>
                            </div>

                            {/* Quick jump grid */}
                            <div className="mt-3.5 max-h-56 overflow-y-auto pr-1">
                                <div className="grid grid-cols-5 gap-2">
                                    {items.map((item, idx) => {
                                        const isActive = idx === currentIndex
                                        return (
                                            <button
                                                key={item.wrongQuestionId}
                                                type="button"
                                                onClick={() => {
                                                    if (processing || feedback?.isCorrect === true) return
                                                    setCurrentIndex(idx)
                                                    setSelectedIds([])
                                                    setFeedback(null)
                                                }}
                                                disabled={processing || feedback?.isCorrect === true}
                                                className={cn(
                                                    'flex aspect-square items-center justify-center rounded-xl text-xs font-black transition-all',
                                                    isActive
                                                        ? 'scale-105 bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-600/30'
                                                        : 'border border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100',
                                                    'disabled:cursor-not-allowed disabled:opacity-50',
                                                )}
                                            >
                                                {idx + 1}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Navigasi Sebelumnya & Berikutnya */}
                            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
                                <button
                                    type="button"
                                    onClick={() => navigate(-1)}
                                    disabled={currentIndex === 0 || processing || feedback?.isCorrect === true}
                                    className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
                                >
                                    <ChevronLeft size={16} /> Sebelumnya
                                </button>
                                <button
                                    type="button"
                                    onClick={() => navigate(1)}
                                    disabled={currentIndex >= items.length - 1 || processing || feedback?.isCorrect === true}
                                    className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
                                >
                                    Berikutnya <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Tips & Catatan Belajar */}
                        <div className="space-y-2 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 text-xs font-medium leading-relaxed text-slate-600">
                            <div className="flex items-center gap-1.5 font-bold text-slate-900">
                                <Sparkles size={14} className="text-amber-500" /> Tips Belajar
                            </div>
                            <p>
                                Soal yang kamu tuntaskan di sini otomatis tercatat ke <b>skor kesiapan</b> pada dashboard perkembangan.
                            </p>
                            <p className="text-slate-500">
                                Fokus pada pemahaman konsep di pembahasan saat jawaban belum tepat.
                            </p>
                        </div>
                    </aside>
                </section>
            </div>
        </main>
    )
}

