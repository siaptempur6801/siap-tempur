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
import { cn } from '@/lib/utils'
import { finishPractice, submitAnswer, submitAnswerOptions } from '@/app/actions/practice'
import type { PracticeQuestionView } from '@/src/services/practice-session.service'

type Props = {
  sessionId: string
  questions: PracticeQuestionView[]
  initialAnswers: Record<string, string>
  initialAnswerOptions: Record<string, string[]>
  initialCurrentIndex: number
  initialMarked: Record<string, boolean>
  endTime?: string
  returnPath: string
  resultPath: (sessionId: string) => string
}

function responseInstruction(type: string) {
  if (type === 'multiple_choice') return 'Pilih semua jawaban yang benar.'
  if (type === 'category') return 'Pilih satu jawaban pada setiap kelompok.'
  return 'Pilih satu jawaban yang paling tepat.'
}

function formatRemaining(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':')
}

export default function UniversalPracticeSessionClient({
  sessionId,
  questions,
  initialAnswers,
  initialAnswerOptions,
  initialCurrentIndex,
  initialMarked,
  endTime,
  returnPath,
  resultPath,
}: Props) {
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(initialCurrentIndex)
  const [singleAnswers, setSingleAnswers] = useState<Record<string, string>>(initialAnswers)
  const [multiAnswers, setMultiAnswers] = useState<Record<string, string[]>>(initialAnswerOptions)
  const [marked, setMarked] = useState<Record<string, boolean>>(initialMarked)
  const [finishing, setFinishing] = useState(false)
  const [finishConfirmMessage, setFinishConfirmMessage] = useState<string | null>(null)
  const [remainingMs, setRemainingMs] = useState<number | null>(null)
  const syncStateRef = useRef(new AnswerSaveQueue<string[]>())
  const finishedRef = useRef(false)

  const currentQuestion = questions[currentIndex] ?? null

  const selectedIdsFor = useCallback(
    (question: PracticeQuestionView) => {
      if (question.response_type === 'single_choice') {
        const selected = singleAnswers[question.id]
        return selected ? [selected] : []
      }
      const selectedOptions = multiAnswers[question.id]
      if (selectedOptions) return selectedOptions

      // The answer RPC stores a one-option selection in selected_option_id.
      // Multi-response questions use attempt_answer_options only when multiple
      // options are selected, so restore the one-option case from that column.
      const singleOptionFallback = singleAnswers[question.id]
      return singleOptionFallback ? [singleOptionFallback] : []
    },
    [multiAnswers, singleAnswers],
  )

  const answeredQuestionIds = useMemo(() => {
    const answered = new Set<string>()
    for (const question of questions) {
      if (selectedIdsFor(question).length > 0) answered.add(question.id)
    }
    return answered
  }, [questions, selectedIdsFor])

  const syncSelection = useCallback(
    (question: PracticeQuestionView) =>
      syncStateRef.current.sync(question.id, async (selection) => {
        const result =
          question.response_type === 'single_choice'
            ? selection[0]
              ? await submitAnswer(sessionId, question.id, selection[0])
              : { error: 'Jawaban kosong.' }
            : await submitAnswerOptions(sessionId, question.id, selection)
        if (result?.error) throw new Error(result.error)
      }),
    [sessionId],
  )

  const queueSelection = useCallback(
    (question: PracticeQuestionView, nextIds: string[]) => {
      syncStateRef.current.set(question.id, [...nextIds])
      void syncSelection(question).catch(() => toast.error('Gagal menyimpan jawaban.'))
    },
    [syncSelection],
  )

  useEffect(() => {
    const retry = () => {
      const pending = new Set(syncStateRef.current.keys())
      for (const question of questions)
        if (pending.has(question.id)) {
          void syncSelection(question).catch(() => toast.error('Gagal menyimpan jawaban.'))
        }
    }
    window.addEventListener('online', retry)
    return () => window.removeEventListener('online', retry)
  }, [questions, syncSelection])

  const handleSelect = useCallback(
    (question: PracticeQuestionView, optionId: string) => {
      if (question.response_type === 'single_choice') {
        setSingleAnswers((previous) => ({ ...previous, [question.id]: optionId }))
        queueSelection(question, [optionId])
        return
      }

      const current = selectedIdsFor(question)
      let next: string[]
      if (question.response_type === 'category') {
        const selectedOption = question.options.find((option) => option.id === optionId)
        const selectedGroup = selectedOption?.response_group ?? null
        const optionIdsInGroup = new Set(
          question.options
            .filter((option) => (option.response_group ?? null) === selectedGroup)
            .map((option) => option.id),
        )
        const withoutGroup = current.filter((id) => !optionIdsInGroup.has(id))
        next = current.includes(optionId) ? withoutGroup : [...withoutGroup, optionId]
      } else {
        next = current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId]
      }
      setMultiAnswers((previous) => ({ ...previous, [question.id]: next }))
      queueSelection(question, next)
    },
    [queueSelection, selectedIdsFor],
  )

  const persistProgress = useCallback(
    (index: number, nextMarked: Record<string, boolean>) => {
      void fetch(`/api/practice-sessions/${sessionId}/beacon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentQuestionIndex: index, markedQuestions: nextMarked }),
      }).catch(() => undefined)
    },
    [sessionId],
  )

  const navigate = useCallback(
    (index: number) => {
      const next = Math.max(0, Math.min(questions.length - 1, index))
      setCurrentIndex(next)
      persistProgress(next, marked)
    },
    [marked, persistProgress, questions.length],
  )

  const toggleMarked = useCallback(() => {
    if (!currentQuestion) return
    setMarked((previous) => {
      const next = { ...previous, [currentQuestion.id]: !previous[currentQuestion.id] }
      persistProgress(currentIndex, next)
      return next
    })
  }, [currentIndex, currentQuestion, persistProgress])

  const flushAnswers = useCallback(
    (automatic = false) => {
      const pending = new Set(syncStateRef.current.keys())
      return flushAnswerSaves(
        questions.filter((q) => pending.has(q.id)).map(syncSelection),
        automatic,
      )
    },
    [questions, syncSelection],
  )

  const finish = useCallback(
    async (automatic = false) => {
      if (finishedRef.current || finishing) return
      finishedRef.current = true
      setFinishing(true)
      try {
        await flushAnswers(automatic)
        const result = await finishPractice(sessionId)
        if (result?.error) {
          finishedRef.current = false
          setFinishing(false)
          toast.error(result.error)
          return
        }
        toast.success(automatic ? 'Waktu habis. Jawaban sudah dikirim.' : 'Tryout selesai.')
        router.push(resultPath(sessionId))
      } catch {
        finishedRef.current = false
        setFinishing(false)
        toast.error('Gagal menyelesaikan tryout.')
      }
    },
    [finishing, flushAnswers, resultPath, router, sessionId],
  )

  const confirmAndFinish = useCallback(() => {
    if (finishedRef.current || finishing) return
    const unansweredCount = Math.max(0, questions.length - answeredQuestionIds.size)
    const message =
      unansweredCount > 0
        ? `Masih ada ${unansweredCount} soal belum dijawab. Yakin ingin mengakhiri tryout? Setelah dikirim, jawaban tidak dapat diubah.`
        : 'Semua soal sudah dijawab. Yakin ingin mengakhiri tryout? Setelah dikirim, jawaban tidak dapat diubah.'
    setFinishConfirmMessage(message)
  }, [answeredQuestionIds.size, finishing, questions.length])

  useEffect(() => {
    if (!endTime || finishing) return
    const tick = () => {
      const remaining = Date.parse(endTime) - Date.now()
      setRemainingMs(Math.max(0, remaining))
      if (remaining <= 0) void finish(true)
    }
    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [endTime, finish, finishing])

  if (!currentQuestion) {
    return (
      <main className="min-h-screen bg-slate-50/70 p-8 text-center font-bold text-slate-700">
        Tidak ada soal pada attempt ini.
      </main>
    )
  }

  const selectedIds = selectedIdsFor(currentQuestion)
  const categoryGroups =
    currentQuestion.response_type === 'category'
      ? Array.from(
          new Map(
            currentQuestion.options.map((option) => [
              option.response_group ?? 'Kelompok',
              option.response_group ?? 'Kelompok',
            ]),
          ).keys(),
        )
      : []
  const markedCount = Object.values(marked).filter(Boolean).length

  const renderOption = (option: PracticeQuestionView['options'][number], index: number) => {
    const selected = selectedIds.includes(option.id)
    return (
      <button
        key={option.id}
        type="button"
        onClick={() => handleSelect(currentQuestion, option.id)}
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
            {selected ? (
              <Check size={15} strokeWidth={2.5} />
            ) : (
              option.key || String.fromCharCode(65 + index)
            )}
          </span>
          <div className="min-w-0 flex-1 space-y-2 text-sm sm:text-base font-medium leading-relaxed text-slate-800">
            {option.image_url && (
              <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white p-2">
                <Image
                  src={option.image_url}
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
    <main className="min-h-screen bg-slate-50/70 p-3 text-slate-900 md:p-6">
      <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[1fr_280px]">
        <section className="min-w-0 space-y-4">
          <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs">
            <div>
              <div className="inline-flex items-center rounded-md bg-indigo-50 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-indigo-700 ring-1 ring-indigo-200/60 shadow-2xs">
                {currentQuestion.type} · {currentQuestion.response_type}
              </div>
              <div className="mt-1.5 text-lg sm:text-xl font-bold tracking-tight text-slate-950">
                Soal {currentIndex + 1} / {questions.length}
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={toggleMarked}
                aria-label="Tandai soal"
                className={cn(
                  'inline-flex min-h-10 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold shadow-2xs transition active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600',
                  marked[currentQuestion.id]
                    ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-300'
                    : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700',
                )}
              >
                <Flag
                  size={16}
                  className={
                    marked[currentQuestion.id] ? 'fill-amber-500 text-amber-600' : 'text-slate-400'
                  }
                />
                <span className="hidden sm:inline">
                  {marked[currentQuestion.id] ? 'Ditandai' : 'Tandai'}
                </span>
              </button>
              {endTime && remainingMs !== null && (
                <div
                  aria-label="Waktu tersisa"
                  className={cn(
                    'inline-flex min-h-10 items-center gap-2 rounded-xl px-3.5 py-2 font-mono text-sm font-bold tabular-nums shadow-2xs transition-colors',
                    remainingMs <= 300000
                      ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/80 animate-pulse'
                      : 'bg-indigo-50 text-indigo-900 ring-1 ring-indigo-200/80',
                  )}
                >
                  <Clock3
                    size={16}
                    className={remainingMs <= 300000 ? 'text-rose-600' : 'text-indigo-600'}
                  />
                  {formatRemaining(remainingMs)}
                </div>
              )}
            </div>
          </header>

          {currentQuestion.stimulus && (
            <article className="rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50/60 via-amber-50/30 to-white p-5 md:p-6 shadow-xs">
              {currentQuestion.stimulus.title && (
                <h2 className="mb-3 text-base sm:text-lg font-bold text-amber-950">
                  {currentQuestion.stimulus.title}
                </h2>
              )}
              {currentQuestion.stimulus.image_url && (
                <div className="mb-4 overflow-hidden rounded-xl border border-amber-200/60 bg-white p-2">
                  <Image
                    src={currentQuestion.stimulus.image_url}
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
              <MathRenderer text={currentQuestion.content} />
            </div>
            <p className="mt-4 border-t border-slate-100 pt-3 text-xs font-bold uppercase tracking-wider text-indigo-600">
              {responseInstruction(currentQuestion.response_type)}
            </p>

            <div className="mt-5 space-y-3">
              {currentQuestion.response_type === 'category'
                ? categoryGroups.map((group) => (
                    <div
                      key={group}
                      className="space-y-2.5 rounded-xl border border-indigo-100 bg-indigo-50/30 p-3.5"
                    >
                      <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                        {group}
                      </h3>
                      {currentQuestion.options
                        .filter((option) => (option.response_group ?? 'Kelompok') === group)
                        .map((option, index) => renderOption(option, index))}
                    </div>
                  ))
                : currentQuestion.options.map((option, index) => renderOption(option, index))}
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
                disabled={finishing}
                onClick={confirmAndFinish}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-indigo-700 transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
              >
                <CheckCircle2 size={18} />
                {finishing ? 'Menghitung...' : 'Selesai'}
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

        <aside className="h-fit rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs lg:sticky lg:top-6">
          <div className="flex items-center justify-between gap-2">
            <h2 className="inline-flex items-center gap-2 font-bold text-sm text-slate-900">
              <MapIcon size={16} className="text-indigo-600" /> Navigasi Soal
            </h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
              {answeredQuestionIds.size}/{questions.length}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-5 gap-2">
            {questions.map((question, index) => {
              const answered = answeredQuestionIds.has(question.id)
              const isCurrent = currentIndex === index
              return (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => navigate(index)}
                  aria-label={`Buka soal ${index + 1}${isCurrent ? ', sedang dikerjakan' : ''}`}
                  aria-current={isCurrent ? 'step' : undefined}
                  style={
                    isCurrent ? { outline: '3px solid #ef4444', outlineOffset: '2px' } : undefined
                  }
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
                    <span
                      aria-hidden="true"
                      className="absolute -left-1 -top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-red-500 shadow-2xs"
                    />
                  )}
                  {marked[question.id] && (
                    <span
                      aria-label="Ditandai"
                      className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-amber-400 shadow-2xs"
                    />
                  )}
                </button>
              )
            })}
          </div>
          <div className="mt-4 space-y-2.5 border-t border-slate-100 pt-4 text-xs font-medium text-slate-600">
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200/70 bg-slate-50/70 p-2.5 text-[11px] font-semibold text-slate-700">
              <div className="flex items-center gap-1.5">
                <span className="flex h-4 w-4 items-center justify-center rounded-md bg-emerald-600 text-[9px] font-bold text-white shadow-2xs">
                  ✓
                </span>
                <span className="text-slate-800">Terjawab</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="flex h-4 w-4 items-center justify-center rounded-md border border-slate-300 bg-slate-100 text-[9px] font-bold text-slate-600">
                  -
                </span>
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
              <span>
                <b className="font-bold text-emerald-700">{answeredQuestionIds.size}</b> dijawab
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-slate-400" />
              <span>
                <b className="font-bold text-slate-900">
                  {questions.length - answeredQuestionIds.size}
                </b>{' '}
                belum dijawab
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              <span>
                <b className="font-bold text-amber-700">{markedCount}</b> ditandai
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.push(returnPath)}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50/70 px-3.5 py-2.5 text-xs font-bold text-rose-700 shadow-2xs hover:bg-rose-100/80 transition active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          >
            <LogOut size={16} /> Keluar & lanjut nanti
          </button>
        </aside>
      </div>

      <TkaSectionConfirmModal
        message={finishConfirmMessage}
        title="Akhiri tryout ini?"
        confirmLabel="Ya, kirim jawaban"
        processing={finishing}
        onCancel={() => setFinishConfirmMessage(null)}
        onConfirm={() => {
          setFinishConfirmMessage(null)
          void finish(false)
        }}
      />
    </main>
  )
}
