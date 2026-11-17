'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { ArrowLeft, BookOpen, CheckCircle2, ChevronRight, RotateCcw, Sparkles } from 'lucide-react'
import MathRenderer from '@/components/MathRenderer'
import { reviewTkaRemedialItem } from '@/app/actions/tka-remedial'
import type { TkaRemedialItem, TkaRemedialSession } from '@/src/services/tka-remedial.service'
import { cn } from '@/lib/utils'
import ProgressBar from '@/components/ui/ProgressBar'
import { TKA_AVAILABLE_LEVELS, tkaLevelFromPathname } from '@/src/tka/context'
import { usePathname } from 'next/navigation'

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
  const pathname = usePathname()
  const level = tkaLevelFromPathname(pathname) ?? TKA_AVAILABLE_LEVELS[0]

  const [items, setItems] = useState(initialItems)
  const firstPending = Math.max(
    0,
    initialItems.findIndex((item) => item.status === 'pending'),
  )
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
    () => items.flatMap((item, index) => (item.status === 'pending' ? [index] : [])),
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
    setSelectedIds((previous) =>
      previous.includes(id) ? previous.filter((value) => value !== id) : [...previous, id],
    )
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
        setItems((previous) =>
          previous.map((item) =>
            item.id === current.id
              ? {
                  ...item,
                  status: 'completed',
                  bestScore: Math.max(item.bestScore, result.scoreAwarded),
                }
              : item,
          ),
        )
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
      <main
        data-experience-mode="learning"
        data-program={`tka-${level.toLowerCase()}`}
        className="min-h-screen px-4 py-12 md:py-16"
      >
        <div className="mx-auto max-w-2xl rounded-2xl border border-border-strong bg-white p-6 text-center shadow-xs md:p-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/50">
            <CheckCircle2 size={36} />
          </div>
          <h1 className="mt-5 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
            Tidak ada latihan perbaikan aktif.
          </h1>
          <p className="mx-auto mt-3 max-w-lg font-medium leading-relaxed text-slate-600">
            Kamu bisa kembali ke TKA {level} untuk melanjutkan latihan atau melihat perkembangan
            belajar.
          </p>
          <Link
            href={`/tka/${level.toLowerCase()}`}
            className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-slate-950 px-6 py-2.5 text-sm font-black text-white hover:bg-slate-800 transition"
          >
            Kembali ke TKA {level}
          </Link>
        </div>
      </main>
    )
  }

  const allDone = sessionStatus === 'completed' || pendingItems === 0
  const instruction =
    current.responseType === 'single_choice'
      ? 'Pilih satu jawaban yang paling tepat.'
      : current.responseType === 'multiple_choice'
        ? 'Pilih semua jawaban yang menurutmu benar.'
        : 'Pasangkan pilihan sesuai kategori yang diminta.'

  return (
    <main
      data-experience-mode="learning"
      data-program={`tka-${level.toLowerCase()}`}
      className="min-h-screen px-4 py-6 md:px-8 md:py-8"
    >
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/tka/${level.toLowerCase()}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border-strong bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft size={16} /> Kembali ke TKA {level}
          </Link>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3.5 py-1 text-xs font-black text-amber-800">
            Latihan perbaikan
          </span>
        </div>

        {/* Header Sesi Remedial */}
        <section className="rounded-2xl border border-border-strong bg-white p-5 md:p-6 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-amber-700">
                <Sparkles size={16} /> Fokus pada bagian yang perlu diperbaiki
              </div>
              <h1 className="mt-2 text-xl md:text-2xl font-black tracking-tight text-slate-950">
                Latihan perbaikan
              </h1>
              <p className="mt-1.5 max-w-2xl text-sm font-medium leading-relaxed text-slate-600">
                SiapTempur memilih beberapa soal dari bagian yang masih perlu kamu pahami. Jawab
                dengan benar untuk menuntaskan satu per satu.
              </p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-center min-w-28 shrink-0">
              <div className="text-[11px] font-black uppercase tracking-wider text-amber-800">
                Perkembangan
              </div>
              <div className="mt-0.5 text-2xl font-black text-slate-950">
                {completedItems}/{totalItems}
              </div>
            </div>
          </div>
          <div className="mt-5">
            <ProgressBar
              value={progress}
              label="Perkembangan latihan perbaikan"
              size="sm"
              className="bg-slate-100 rounded-full"
              indicatorClassName="bg-gradient-to-r from-amber-400 to-amber-500 rounded-full"
            />
          </div>
        </section>

        {allDone ? (
          <section className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-8 text-center md:p-12 shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 ring-8 ring-emerald-100/50">
              <CheckCircle2 size={36} />
            </div>
            <h2 className="mt-5 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
              Latihan perbaikan selesai.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-base font-medium leading-relaxed text-slate-600">
              Semua soal pada sesi ini sudah dituntaskan dan perkembangan belajarmu sudah
              diperbarui.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href={`/tka/${level.toLowerCase()}/progress`}
                className="inline-flex min-h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-black text-white shadow-md shadow-blue-600/20 transition hover:bg-indigo-700"
              >
                Lihat Perkembangan
              </Link>
              <Link
                href={`/tka/${level.toLowerCase()}`}
                className="inline-flex min-h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-border-strong bg-white px-6 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
              >
                Kembali ke TKA {level}
              </Link>
            </div>
          </section>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
            {/* Aside: Navigator Latihan Perbaikan */}
            <aside className="space-y-4 h-fit lg:sticky lg:top-5">
              <div className="rounded-2xl border border-border-strong bg-white p-5 shadow-sm">
                <div className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Daftar latihan
                </div>
                <div className="mt-3.5 grid grid-cols-5 gap-2 lg:grid-cols-4">
                  {items.map((item, index) => (
                    <button
                      key={item.id}
                      type="button"
                      disabled={item.status === 'completed'}
                      onClick={() => chooseIndex(index)}
                      aria-label={`Latihan perbaikan ${item.position}`}
                      className={cn(
                        'flex aspect-square items-center justify-center rounded-xl text-xs font-black transition-all',
                        item.status === 'completed'
                          ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 opacity-80 cursor-default'
                          : index === activeIndex
                            ? 'scale-105 bg-amber-400 text-slate-950 shadow-sm ring-2 ring-amber-400/30'
                            : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
                      )}
                    >
                      {item.status === 'completed' ? '✓' : item.position}
                    </button>
                  ))}
                </div>
                <div className="mt-4 border-t border-slate-100 pt-3 text-xs font-bold text-slate-500">
                  Tersisa {pendingItems} soal.
                </div>
              </div>
            </aside>

            {/* Question Card */}
            <article className="min-w-0 rounded-2xl border border-border-strong bg-white p-5 md:p-6 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex flex-wrap gap-2 text-xs font-black">
                  <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-emerald-800">
                    {current.subjectCode}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-slate-700">
                    Soal {current.position}/{totalItems}
                  </span>
                  {current.questionCode && (
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-slate-500">
                      {current.questionCode}
                    </span>
                  )}
                </div>
                <span className="text-xs font-bold text-slate-500">
                  {current.reason === 'source_attempt_unanswered'
                    ? 'Sebelumnya belum dijawab'
                    : 'Sebelumnya salah'}
                </span>
              </div>

              {current.stimulus && (
                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/70 p-5">
                  {current.stimulus.title && (
                    <div className="mb-2.5 flex items-center gap-2 text-sm font-black text-slate-800">
                      <BookOpen size={16} className="text-amber-600" />
                      <span>{current.stimulus.title}</span>
                    </div>
                  )}
                  <div className="text-sm md:text-base font-normal leading-relaxed text-slate-700">
                    <MathRenderer text={current.stimulus.content} />
                  </div>
                </div>
              )}

              <div className="mt-6 text-lg md:text-xl font-bold leading-relaxed text-slate-950">
                <MathRenderer text={current.stem} />
              </div>
              <p className="mt-3 text-xs md:text-sm font-semibold text-slate-500">{instruction}</p>

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
                      className={cn(
                        'group flex min-h-12 w-full items-start gap-3.5 rounded-xl border p-4 text-left transition-all',
                        'disabled:cursor-not-allowed disabled:opacity-75',
                        selected
                          ? 'border-amber-500 bg-amber-50/70 text-amber-950 ring-2 ring-amber-500/20'
                          : 'border-slate-200 bg-white hover:border-amber-200 hover:bg-slate-50/80 text-slate-800',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-8 w-8 min-w-8 shrink-0 items-center justify-center rounded-lg border text-xs font-black transition-colors',
                          selected
                            ? 'border-amber-500 bg-amber-400 text-slate-950'
                            : 'border-slate-200 bg-slate-100 text-slate-700 group-hover:border-slate-300',
                        )}
                      >
                        {option.key || '•'}
                      </span>
                      <span className="min-w-0 flex-1 text-sm md:text-base font-semibold leading-relaxed">
                        <MathRenderer text={option.content} />
                      </span>
                    </button>
                  )
                })}
              </div>

              {feedback && (
                <div
                  className={cn(
                    'mt-6 rounded-xl border p-5 transition-all',
                    feedback.error
                      ? 'border-rose-200 bg-rose-50/80 text-rose-950'
                      : feedback.isCorrect
                        ? 'border-emerald-200 bg-emerald-50/80 text-emerald-950'
                        : 'border-amber-200 bg-amber-50/80 text-amber-950',
                  )}
                >
                  {feedback.error ? (
                    <div className="font-black text-rose-700">{feedback.error}</div>
                  ) : feedback.isCorrect ? (
                    <>
                      <div className="flex items-center gap-2 font-black text-emerald-800">
                        <CheckCircle2 size={20} className="text-emerald-600" />
                        <span>Benar. Perkembangan topik ini sudah diperbarui.</span>
                      </div>
                      {feedback.explanation && (
                        <div className="mt-3.5 rounded-lg border border-border-strong bg-white/95 p-4 text-slate-800 shadow-xs">
                          <div className="mb-2 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-800">
                            <Sparkles size={14} /> Pembahasan
                          </div>
                          <div className="text-sm font-medium leading-relaxed text-slate-700">
                            <MathRenderer text={feedback.explanation} />
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="font-black text-amber-900">
                      Belum tepat. Pelajari kembali pilihannya lalu coba lagi.
                    </div>
                  )}
                </div>
              )}

              <div className="mt-7 flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
                {!feedback?.isCorrect && (
                  <button
                    type="button"
                    disabled={selectedIds.length === 0 || isPending}
                    onClick={review}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-6 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <RotateCcw size={16} /> {feedback ? 'Periksa lagi' : 'Periksa jawaban'}
                  </button>
                )}
                {feedback?.isCorrect && pendingIndexes.length > 1 && (
                  <button
                    type="button"
                    onClick={nextPending}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-400 px-6 py-2.5 text-sm font-black text-slate-950 shadow-md shadow-amber-400/20 transition hover:bg-amber-300"
                  >
                    Lanjut latihan <ChevronRight size={17} />
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
