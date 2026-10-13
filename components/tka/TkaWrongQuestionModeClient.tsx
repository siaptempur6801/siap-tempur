'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import MathRenderer from '@/components/MathRenderer'
import { cn } from '@/lib/utils'
import { reviewTkaWrongQuestion } from '@/app/actions/tka-wrong-questions'
import type { TkaWrongQuestionItem } from '@/src/services/tka-wrong-question.service'
import { TKA_AVAILABLE_LEVELS, tkaLevelFromPathname } from '@/src/tka/context'
import { usePathname } from 'next/navigation'

type Feedback = {
  isCorrect: boolean
  explanation: string
} | null

function responseInstruction(type: string) {
  if (type === 'multiple_choice') return 'Pilih semua jawaban yang benar.'
  if (type === 'category') return 'Pilih satu jawaban pada setiap kelompok.'
  return 'Pilih satu jawaban yang paling tepat.'
}

function failureLabel(item: TkaWrongQuestionItem) {
  if (item.latestOutcome === 'unanswered') return 'Belum dijawab'
  return 'Belum tepat'
}

function subjectLabel(code: string, level: string) {
  if (code === 'BIN') return 'Bahasa Indonesia'
  if (code === 'MAT') return 'Matematika'
  return code || `TKA ${level}`
}

export default function TkaWrongQuestionModeClient({
  initialItems,
}: {
  initialItems: TkaWrongQuestionItem[]
}) {
  const pathname = usePathname()
  const level = tkaLevelFromPathname(pathname) ?? TKA_AVAILABLE_LEVELS[0]

  const [items, setItems] = useState(initialItems)
  const [sessionIds, setSessionIds] = useState<string[] | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [processing, setProcessing] = useState(false)
  const [sessionSolvedCount, setSessionSolvedCount] = useState(0)

  const subjectGroups = useMemo(() => {
    const groups = new Map<string, TkaWrongQuestionItem[]>()
    for (const item of items) {
      const code = item.subjectCode || ''
      const group = groups.get(code)
      if (group) group.push(item)
      else groups.set(code, [item])
    }
    return Array.from(groups, ([code, questions]) => ({ code, questions }))
  }, [items])

  const sessionItems = useMemo(() => {
    if (!sessionIds) return []
    const byId = new Map(items.map((item) => [item.wrongQuestionId, item]))
    return sessionIds.flatMap((id) => {
      const item = byId.get(id)
      return item ? [item] : []
    })
  }, [items, sessionIds])

  const current = sessionItems[currentIndex] ?? null
  const categoryGroups = useMemo(
    () =>
      current?.responseType === 'category'
        ? Array.from(new Set(current.options.map((option) => option.responseGroup ?? 'Kelompok')))
        : [],
    [current],
  )

  const startSession = (subjectCode?: string) => {
    const candidates =
      subjectCode === undefined ? items : items.filter((item) => item.subjectCode === subjectCode)
    const selected = candidates.slice(0, 10)
    if (selected.length === 0) return
    setSessionIds(selected.map((item) => item.wrongQuestionId))
    setCurrentIndex(0)
    setSelectedIds([])
    setFeedback(null)
    setSessionSolvedCount(0)
  }

  const returnToOverview = () => {
    if (current && feedback?.isCorrect) {
      setItems((previous) =>
        previous.filter((item) => item.wrongQuestionId !== current.wrongQuestionId),
      )
    }
    setSessionIds(null)
    setCurrentIndex(0)
    setSelectedIds([])
    setFeedback(null)
  }

  const chooseOption = (optionId: string) => {
    if (!current || processing || feedback?.isCorrect) return
    const option = current.options.find((candidate) => candidate.id === optionId)
    let next: string[]

    if (current.responseType === 'single_choice') {
      next = [optionId]
    } else if (current.responseType === 'category') {
      const group = option?.responseGroup ?? null
      const groupIds = new Set(
        current.options
          .filter((candidate) => (candidate.responseGroup ?? null) === group)
          .map((candidate) => candidate.id),
      )
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
        explanation: String(result.explanation ?? ''),
      }
      setFeedback(nextFeedback)
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
    setItems((previous) =>
      previous.filter((item) => item.wrongQuestionId !== current.wrongQuestionId),
    )
    setSessionSolvedCount((prev) => prev + 1)
    setCurrentIndex(Math.max(0, Math.min(currentIndex, sessionItems.length - 2)))
    setSelectedIds([])
    setFeedback(null)
  }

  const navigate = (direction: -1 | 1) => {
    if (!current || processing || feedback?.isCorrect) return
    const next = Math.max(0, Math.min(sessionItems.length - 1, currentIndex + direction))
    if (next === currentIndex) return
    setCurrentIndex(next)
    setSelectedIds([])
    setFeedback(null)
  }

  if (sessionIds === null) {
    return (
      <main
        data-experience-mode="learning"
        data-program={`tka-${level.toLowerCase()}`}
        className="min-h-screen px-4 py-6 md:px-8 md:py-10"
      >
        <div className="mx-auto max-w-5xl space-y-6">
          <header className="rounded-2xl border border-border-strong bg-white p-5 shadow-xs md:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-indigo-700">
                  <RotateCcw size={16} /> TKA {level} · Belajar dari riwayat
                </div>
                <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
                  Perbaiki soal yang perlu kamu ulang
                </h1>
                <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600 md:text-base">
                  Pilih mapel untuk mengulang soal dari riwayat belajarmu. Sesi ini gratis, tanpa
                  token, dan berisi maksimal 10 soal.
                </p>
              </div>
              <div className="inline-flex min-h-12 shrink-0 items-center gap-2 self-start rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm font-bold text-indigo-900">
                <CheckCircle2 size={18} className="text-indigo-700" />
                {items.length} soal
              </div>
            </div>
          </header>

          {items.length === 0 ? (
            <section className="rounded-2xl border border-border-strong bg-white px-5 py-10 text-center shadow-xs md:px-8">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <CheckCircle2 size={30} />
              </div>
              <h2 className="mt-5 text-xl font-black tracking-tight text-slate-950">
                Belum ada soal yang perlu diulang
              </h2>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-slate-600">
                Soal yang belum tepat atau belum sempat kamu jawab akan muncul di sini setelah
                dikerjakan.
              </p>
              <Link
                href={`/tka/${level.toLowerCase()}`}
                className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-black text-white transition hover:bg-indigo-700"
              >
                <ArrowLeft size={17} /> Kembali ke TKA {level}
              </Link>
            </section>
          ) : (
            <>
              <section aria-labelledby="wrong-question-subjects-title" className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2
                      id="wrong-question-subjects-title"
                      className="text-lg font-black tracking-tight text-slate-950 md:text-xl"
                    >
                      Pilih mapel
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Mulai dari satu mapel atau gabungkan soal dari semua mapel.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => startSession()}
                    className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 sm:w-auto"
                  >
                    <RotateCcw size={17} />
                    Ulangi {Math.min(items.length, 10)} soal · Gratis
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {subjectGroups.map((group) => {
                    const unanswered = group.questions.filter(
                      (item) => item.latestOutcome === 'unanswered',
                    ).length
                    const notCorrect = group.questions.length - unanswered
                    return (
                      <article
                        key={group.code || 'unassigned'}
                        className="flex min-w-0 flex-col rounded-2xl border border-border-strong bg-white p-5 shadow-xs md:p-6"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate text-base font-black text-slate-950 md:text-lg">
                              {subjectLabel(group.code, level)}
                            </h3>
                            <p className="mt-1 text-sm text-slate-600">
                              {group.questions.length} soal perlu diulang
                            </p>
                          </div>
                          <span className="inline-flex h-10 min-w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 px-3 text-sm font-black text-indigo-800">
                            {group.questions.length}
                          </span>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 pt-3 text-xs font-semibold text-slate-600">
                          <span>{notCorrect} belum tepat</span>
                          <span>{unanswered} belum dijawab</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => startSession(group.code)}
                          className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-black text-indigo-800 transition hover:border-indigo-300 hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
                        >
                          Ulangi {Math.min(group.questions.length, 10)} soal · Gratis
                          <ChevronRight size={17} />
                        </button>
                      </article>
                    )
                  })}
                </div>
              </section>

              <aside className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:flex-row sm:items-center sm:justify-between md:p-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-700 shadow-xs">
                    <BookOpen size={19} />
                  </div>
                  <div>
                    <h2 className="font-black text-slate-950">Ingin mengerjakan soal baru?</h2>
                    <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-600">
                      Latihan Fokus membuat sesi baru dan menggunakan 1 token. Pengulangan dari
                      riwayat di halaman ini tetap gratis.
                    </p>
                  </div>
                </div>
                <Link
                  href={`/tka/${level.toLowerCase()}/focus`}
                  className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl border border-border-strong bg-white px-4 py-3 text-sm font-black text-slate-800 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
                >
                  Latihan Fokus <span className="text-indigo-700">· 1 token</span>
                  <ChevronRight size={17} />
                </Link>
              </aside>

              <p className="text-center text-xs leading-relaxed text-slate-500">
                Setiap sesi pengulangan berisi maksimal 10 soal. Jawaban benar mengeluarkan soal
                dari daftar ini.
              </p>
            </>
          )}
        </div>
      </main>
    )
  }

  if (!current) {
    return (
      <main
        data-experience-mode="learning"
        data-program={`tka-${level.toLowerCase()}`}
        className="min-h-screen px-4 py-10 md:px-8 md:py-16"
      >
        <section className="mx-auto max-w-2xl rounded-2xl border border-border-strong bg-white p-6 text-center shadow-xs md:p-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/50">
            <CheckCircle2 size={36} />
          </div>
          <div className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-emerald-100/70 px-3 py-1 text-xs font-black uppercase tracking-wider text-emerald-800">
            <Sparkles size={14} /> Sesi gratis selesai
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
            Sesi pengulangan selesai
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-base font-medium leading-relaxed text-slate-600">
            {sessionSolvedCount > 0
              ? `Kamu menuntaskan ${sessionSolvedCount} soal pada sesi ini. ${items.length > 0 ? `Masih ada ${items.length} soal lain yang bisa kamu ulang.` : 'Semua soal pada daftar ini sudah tuntas.'}`
              : 'Tidak ada soal tersisa pada sesi ini.'}
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={returnToOverview}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-black text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 sm:w-auto"
            >
              <ArrowLeft size={17} /> Kembali ke daftar soal
            </button>
            {items.length > 0 && (
              <button
                type="button"
                onClick={() => startSession()}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-border-strong bg-white px-6 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 sm:w-auto"
              >
                Ulangi sesi berikutnya <ChevronRight size={17} />
              </button>
            )}
          </div>

          <Link
            href={`/tka/${level.toLowerCase()}/progress`}
            className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 text-sm font-bold text-slate-600 transition hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
          >
            Cek perkembangan belajarmu <ChevronRight size={16} />
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
        data-selected={selected}
        className={cn(
          'group flex w-full items-start gap-3.5 rounded-xl border p-4 text-left transition-all',
          'disabled:cursor-not-allowed disabled:opacity-75',
          selected
            ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 ring-2 ring-indigo-600/20'
            : 'border-border-strong bg-white hover:border-primary hover:bg-slate-50/80 text-slate-800',
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
    <main
      data-experience-mode="learning"
      data-program={`tka-${level.toLowerCase()}`}
      className="min-h-screen px-4 py-6 md:px-8 md:py-8"
    >
      <div className="mx-auto max-w-6xl space-y-6 md:space-y-8">
        <header className="rounded-2xl border border-border-strong bg-white p-5 shadow-xs md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-indigo-700">
              <RotateCcw size={16} /> Pengulangan gratis · tanpa token
            </div>
            <button
              type="button"
              onClick={returnToOverview}
              disabled={processing}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border-strong bg-white px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ArrowLeft size={16} /> Daftar soal
            </button>
          </div>
          <h1 className="mt-3 text-xl font-black tracking-tight text-slate-950 md:text-2xl">
            Ulangi soal · {subjectLabel(current.subjectCode, level)}
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm font-medium leading-relaxed text-slate-600">
            Jawaban benar akan mengeluarkan soal dari daftar pengulangan dan memperbarui kesiapan
            belajarmu.
          </p>
          <div className="mt-5 flex items-center justify-between gap-3 text-sm">
            <span className="font-black text-slate-800">
              Soal {currentIndex + 1} dari {sessionItems.length}
            </span>
            <span className="font-semibold text-slate-600">
              {items.length} soal masih perlu diulang
            </span>
          </div>
          <div
            role="progressbar"
            aria-label="Posisi soal pada sesi ini"
            aria-valuemin={0}
            aria-valuemax={sessionItems.length}
            aria-valuenow={currentIndex + 1}
            className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"
          >
            <div
              className="h-full rounded-full bg-indigo-600 transition-[width]"
              style={{ width: `${((currentIndex + 1) / sessionItems.length) * 100}%` }}
            />
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1fr_18rem]">
          <article className="min-w-0 rounded-2xl border border-border-strong bg-white p-5 md:p-6 shadow-xs">
            {/* Meta Soal */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">
                  {subjectLabel(current.subjectCode, level)}
                </span>
                <span
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-black',
                    current.latestOutcome === 'unanswered'
                      ? 'border-amber-200 bg-amber-50 text-amber-800'
                      : 'border-rose-200 bg-rose-50 text-rose-700',
                  )}
                >
                  {failureLabel(current)}
                </span>
                {current.questionCode && (
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-slate-500">
                    {current.questionCode}
                  </span>
                )}
              </div>
              <span className="text-xs font-bold text-slate-500">
                Tercatat {current.failureCount} kali
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
                    <div
                      key={group}
                      className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-4"
                    >
                      <div className="text-xs font-black uppercase tracking-wider text-slate-600">
                        {group}
                      </div>
                      {current.options
                        .filter((option) => (option.responseGroup ?? 'Kelompok') === group)
                        .map(renderOption)}
                    </div>
                  ))
                : current.options.map(renderOption)}
            </div>

            {/* Panel Hasil & Pembahasan */}
            {feedback && (
              <div
                className={cn(
                  'mt-6 rounded-xl border p-5 transition-all',
                  feedback.isCorrect
                    ? 'border-emerald-200 bg-emerald-50/80 text-emerald-950'
                    : 'border-rose-200 bg-rose-50/80 text-rose-950',
                )}
              >
                <div className="flex items-start gap-3 font-bold">
                  {feedback.isCorrect ? (
                    <CheckCircle2 size={22} className="mt-0.5 shrink-0 text-emerald-600" />
                  ) : (
                    <XCircle size={22} className="mt-0.5 shrink-0 text-rose-600" />
                  )}
                  <div>
                    <div
                      className={cn(
                        'text-base font-black',
                        feedback.isCorrect ? 'text-emerald-900' : 'text-rose-900',
                      )}
                    >
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
                  <div className="mt-4 rounded-lg border border-border-strong bg-white/95 p-4 text-slate-800 shadow-xs">
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
              <button
                type="button"
                onClick={returnToOverview}
                disabled={processing}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border-strong bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ArrowLeft size={16} /> Daftar soal
              </button>

              {feedback?.isCorrect ? (
                <button
                  type="button"
                  onClick={nextResolved}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-700 px-6 py-2.5 text-sm font-black text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
                >
                  Lanjut <ChevronRight size={17} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={checkAnswer}
                  disabled={processing || selectedIds.length === 0}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-6 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-100 disabled:bg-disabled disabled:text-disabled-foreground disabled:border-input"
                >
                  {processing ? 'Memeriksa...' : feedback ? 'Periksa lagi' : 'Periksa jawaban'}
                </button>
              )}
            </div>
          </article>

          {/* Aside: Navigator Cepat Nomor Soal */}
          <aside className="space-y-4 h-fit lg:sticky lg:top-5">
            <div className="rounded-2xl border border-border-strong bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Daftar Soal
                </span>
                <span className="text-xs font-bold text-indigo-600">
                  {currentIndex + 1} dari {sessionItems.length}
                </span>
              </div>

              {/* Quick jump grid */}
              <div className="mt-3.5 max-h-56 overflow-y-auto pr-1">
                <div className="grid grid-cols-4 gap-2">
                  {sessionItems.map((item, idx) => {
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
                          'flex aspect-square min-h-11 min-w-11 items-center justify-center rounded-xl text-xs font-black transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2',
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
                  className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl border border-border-strong bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:opacity-100 disabled:bg-disabled disabled:text-disabled-foreground disabled:border-input"
                >
                  <ChevronLeft size={16} /> Sebelumnya
                </button>
                <button
                  type="button"
                  onClick={() => navigate(1)}
                  disabled={
                    currentIndex >= sessionItems.length - 1 ||
                    processing ||
                    feedback?.isCorrect === true
                  }
                  className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl border border-border-strong bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:opacity-100 disabled:bg-disabled disabled:text-disabled-foreground disabled:border-input"
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
                Soal yang kamu tuntaskan di sini otomatis tercatat ke <b>skor kesiapan</b> pada
                dashboard perkembangan.
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
