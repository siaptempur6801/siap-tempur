'use client'

import { useState, useMemo, useEffect, useCallback, useRef, useId } from 'react'
import { submitAnswer, finishPractice } from '@/app/actions/practice'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, CheckCircle2, Clock, Map, Flag, LogOut } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn, formatSubjectName } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import DialogSurface from '@/components/ui/DialogSurface'
import ExamConfirmDialog from './ExamConfirmDialog'
import { getPracticeSessionStorageKey } from '@/lib/practice-progress'
import { acquireSingleFlightLock, releaseSingleFlightLock } from '@/lib/single-flight-lock'
import { AnswerSaveQueue, flushAnswerSaves } from '@/lib/answer-save-queue'
import { trackProductEvent } from '@/lib/product-analytics'
import type { Question } from './PracticeSessionParts'
import { QuestionOptionCard, QuestionPrompt, TryoutTimerBadge } from './PracticeSessionParts'

interface Props {
  sessionId: string
  questions: Question[]
  initialAnswers: Record<string, string> // questionId -> optionId
  initialCurrentIndex: number
  initialMarked: Record<string, boolean>
  endTime?: string // ISO string for tryout mode
  isTryout?: boolean
  returnTo?: 'tryout' | 'mini-tryout' | 'drilling-materi' | 'event' | 'organization'
}

type SessionProgressSnapshot = {
  sessionId: string
  currentQuestionIndex: number
  markedQuestions: Record<string, boolean>
}

function getSessionStorageKey(sessionId: string) {
  return getPracticeSessionStorageKey(sessionId)
}

function saveProgressToLocalStorage(snapshot: SessionProgressSnapshot) {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(
    getSessionStorageKey(snapshot.sessionId),
    JSON.stringify({
      currentQuestionIndex: snapshot.currentQuestionIndex,
      markedQuestions: snapshot.markedQuestions,
    }),
  )
}

function loadProgressFromLocalStorage(sessionId: string) {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(getSessionStorageKey(sessionId))
    if (!raw) return null

    const parsed = JSON.parse(raw) as {
      currentQuestionIndex?: number
      markedQuestions?: Record<string, boolean>
    }

    return {
      currentQuestionIndex:
        typeof parsed.currentQuestionIndex === 'number' ? parsed.currentQuestionIndex : null,
      markedQuestions:
        parsed.markedQuestions && typeof parsed.markedQuestions === 'object'
          ? parsed.markedQuestions
          : null,
    }
  } catch {
    return null
  }
}

function clearProgressFromLocalStorage(sessionId: string) {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(getSessionStorageKey(sessionId))
}

async function saveProgressSnapshot(
  snapshot: SessionProgressSnapshot,
  previousSerializedSnapshot: string,
  force = false,
) {
  const serialized = JSON.stringify(snapshot)

  if (!force && serialized === previousSerializedSnapshot) {
    return { serialized, skipped: true, success: false }
  }

  const response = await fetch(`/api/practice-sessions/${snapshot.sessionId}/beacon`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      currentQuestionIndex: snapshot.currentQuestionIndex,
      markedQuestions: snapshot.markedQuestions,
    }),
  })

  if (!response.ok) {
    return { serialized, skipped: false, success: false }
  }

  return { serialized, skipped: false, success: true }
}

function flushProgressWithBeacon(snapshot: SessionProgressSnapshot) {
  const payload = JSON.stringify({
    currentQuestionIndex: snapshot.currentQuestionIndex,
    markedQuestions: snapshot.markedQuestions,
  })
  const endpoint = `/api/practice-sessions/${snapshot.sessionId}/beacon`

  if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    const blob = new Blob([payload], { type: 'application/json' })
    const queued = navigator.sendBeacon(endpoint, blob)

    if (queued) {
      return true
    }
  }

  void fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: payload,
    keepalive: true,
  })

  return false
}

export default function PracticeSessionClient({
  sessionId,
  questions,
  initialAnswers,
  initialCurrentIndex,
  initialMarked,
  endTime,
  isTryout = false,
  returnTo = 'tryout',
}: Props) {
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(initialCurrentIndex)
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers)
  const [marked, setMarked] = useState<Record<string, boolean>>(initialMarked)
  const [finishing, setFinishing] = useState(false)

  const [hasFinished, setHasFinished] = useState(false)
  const [showWarning5Min, setShowWarning5Min] = useState(false)
  const [showWarning1Min, setShowWarning1Min] = useState(false)
  const mobileNavigationTitleId = useId()
  const [showMobileNav, setShowMobileNav] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showExitModal, setShowExitModal] = useState(false)
  const [exiting, setExiting] = useState(false)
  const [showNav, setShowNav] = useState(true) // Toggleable desktop side nav
  const [hasHydratedResumeState, setHasHydratedResumeState] = useState(false)
  const lastSavedSnapshotRef = useRef('')
  const latestSnapshotRef = useRef<SessionProgressSnapshot | null>(null)
  const answerSyncStateRef = useRef(new AnswerSaveQueue<string>())
  const finishLockRef = useRef(false)
  const exitLockRef = useRef(false)
  const sessionKindLabel = isTryout
    ? 'Tryout'
    : returnTo === 'drilling-materi'
      ? 'Latihan Fokus'
      : 'Mini Tryout'
  const analyticsMode = isTryout
    ? 'full_tryout'
    : returnTo === 'drilling-materi'
      ? 'latihan_fokus'
      : returnTo === 'event'
        ? 'event'
        : 'mini_tryout'
  const sessionKindLabelLower = sessionKindLabel.toLowerCase()
  const resultFromQuery =
    returnTo === 'event'
      ? '?from=event&completed=1'
      : returnTo === 'organization'
        ? '?from=organization&completed=1'
        : returnTo === 'drilling-materi'
          ? '?from=drilling-materi&completed=1'
          : returnTo === 'mini-tryout'
            ? '?from=mini-tryout&completed=1'
            : '?completed=1'
  const returnPath =
    returnTo === 'event'
      ? '/cpns/dashboard/event'
      : returnTo === 'organization'
        ? '/cpns/dashboard/assignments'
        : returnTo === 'drilling-materi'
          ? '/cpns/dashboard/drilling-materi'
          : returnTo === 'mini-tryout'
            ? '/cpns/dashboard/mini-tryout'
            : '/cpns/dashboard/tryout'
  const returnLocationLabel =
    returnTo === 'event'
      ? 'halaman event'
      : returnTo === 'organization'
        ? 'halaman assignment'
        : returnTo === 'drilling-materi'
          ? 'halaman latihan fokus'
          : returnTo === 'mini-tryout'
            ? 'halaman mini tryout'
            : 'dashboard'

  // Subcategory sorting and limits are now handled by dynamic tryout_configurations in the database fetch
  const sortedQuestions = useMemo(() => {
    return questions
  }, [questions])

  const currentQuestion = sortedQuestions[currentIndex]
  const currentQuestionId = currentQuestion?.id ?? ''

  const syncProgressSnapshot = useCallback(
    (nextIndex: number, nextMarked: Record<string, boolean>) => {
      if (hasFinished) return

      const snapshot = {
        sessionId,
        currentQuestionIndex: nextIndex,
        markedQuestions: nextMarked,
      }

      latestSnapshotRef.current = snapshot
      saveProgressToLocalStorage(snapshot)
    },
    [hasFinished, sessionId],
  )

  const handleNavigateToIndex = useCallback(
    (nextIndex: number) => {
      const safeIndex = Math.max(0, Math.min(sortedQuestions.length - 1, nextIndex))
      setCurrentIndex(safeIndex)
      syncProgressSnapshot(safeIndex, marked)
    },
    [marked, sortedQuestions.length, syncProgressSnapshot],
  )

  const handlePreviousQuestion = useCallback(() => {
    handleNavigateToIndex(currentIndex - 1)
  }, [currentIndex, handleNavigateToIndex])

  const handleNextQuestion = useCallback(() => {
    handleNavigateToIndex(currentIndex + 1)
  }, [currentIndex, handleNavigateToIndex])

  const finishSessionAfterLockAcquired = useCallback(async () => {
    let didFinish = false

    try {
      const result = await finishPractice(sessionId)

      if (result?.error) {
        toast.error(result.error)
        return
      }

      if (result?.success) {
        didFinish = true
        setHasFinished(true)
        clearProgressFromLocalStorage(sessionId)
        trackProductEvent('px_exam_complete', {
          program: 'cpns',
          surface: 'exam',
          mode: analyticsMode,
        })
        toast.success(`${sessionKindLabel} selesai`)
        router.push(`/cpns/dashboard/tryout/${sessionId}/result${resultFromQuery}`)
      }
    } catch (error) {
      console.error('Error finishing practice:', error)
      toast.error(`${sessionKindLabel} belum bisa diselesaikan`)
    } finally {
      if (!didFinish) {
        setFinishing(false)
        releaseSingleFlightLock(finishLockRef)
      }
    }
  }, [analyticsMode, resultFromQuery, sessionId, sessionKindLabel, router])

  useEffect(() => {
    const savedProgress = loadProgressFromLocalStorage(sessionId)
    if (savedProgress) {
      if (
        typeof savedProgress.currentQuestionIndex === 'number' &&
        savedProgress.currentQuestionIndex >= 0 &&
        savedProgress.currentQuestionIndex < sortedQuestions.length
      ) {
        setCurrentIndex(savedProgress.currentQuestionIndex)
      }

      if (savedProgress.markedQuestions) {
        setMarked(savedProgress.markedQuestions)
      }
    }

    setHasHydratedResumeState(true)
  }, [sessionId, sortedQuestions.length])

  useEffect(() => {
    if (!hasHydratedResumeState) {
      return
    }

    if (hasFinished) {
      latestSnapshotRef.current = null
      clearProgressFromLocalStorage(sessionId)
      return
    }

    latestSnapshotRef.current = {
      sessionId,
      currentQuestionIndex: currentIndex,
      markedQuestions: marked,
    }

    saveProgressToLocalStorage(latestSnapshotRef.current)

    const timeout = window.setTimeout(() => {
      const snapshot = latestSnapshotRef.current
      if (!snapshot) return

      void saveProgressSnapshot(snapshot, lastSavedSnapshotRef.current)
        .then((result) => {
          if (result.success || result.skipped) {
            lastSavedSnapshotRef.current = result.serialized
          }
        })
        .catch((error) => {
          console.error('Failed to persist practice session progress:', error)
        })
    }, 700)

    return () => window.clearTimeout(timeout)
  }, [sessionId, currentIndex, marked, hasFinished, hasHydratedResumeState])

  useEffect(() => {
    const flushProgress = () => {
      if (latestSnapshotRef.current) {
        flushProgressWithBeacon(latestSnapshotRef.current)
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushProgress()
      }
    }

    window.addEventListener('pagehide', flushProgress)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('pagehide', flushProgress)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  // Warn on browser refresh/close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!finishing && !hasFinished) {
        e.preventDefault()
        e.returnValue = '' // Chrome requires returnValue to be set
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [finishing, hasFinished])

  const toggleMark = () => {
    setMarked((prev) => {
      const nextMarked = {
        ...prev,
        [currentQuestionId]: !prev[currentQuestionId],
      }

      syncProgressSnapshot(currentIndex, nextMarked)
      return nextMarked
    })
  }

  const syncAnswerForQuestion = useCallback(
    (questionId: string) =>
      answerSyncStateRef.current.sync(questionId, async (optionId) => {
        const result = await submitAnswer(sessionId, questionId, optionId)
        if (result?.error) throw new Error(result.error)
      }),
    [sessionId],
  )

  const retryPendingAnswers = useCallback(() => {
    for (const questionId of answerSyncStateRef.current.keys()) {
      void syncAnswerForQuestion(questionId).catch(() => toast.error('Gagal menyimpan jawaban'))
    }
  }, [syncAnswerForQuestion])

  useEffect(() => {
    window.addEventListener('online', retryPendingAnswers)
    return () => window.removeEventListener('online', retryPendingAnswers)
  }, [retryPendingAnswers])

  const flushPendingAnswers = useCallback(
    (automatic = false) =>
      flushAnswerSaves(answerSyncStateRef.current.keys().map(syncAnswerForQuestion), automatic),
    [syncAnswerForQuestion],
  )

  const startFinishFlow = useCallback(
    async (automatic = false) => {
      if (!acquireSingleFlightLock(finishLockRef)) return false
      setFinishing(true)
      setShowConfirmModal(false)
      try {
        await flushPendingAnswers(automatic)
        await finishSessionAfterLockAcquired()
      } catch (error) {
        console.error('Error preparing finish practice:', error)
        toast.error('Jawaban belum berhasil disimpan. Coba lagi sebelum menyelesaikan sesi.')
        setFinishing(false)
        releaseSingleFlightLock(finishLockRef)
      }
      return true
    },
    [finishSessionAfterLockAcquired, flushPendingAnswers],
  )

  const handleAutoFinish = useCallback(async () => {
    if (finishLockRef.current || hasFinished) return
    toast.info('Waktu selesai. Jawaban akan dikumpulkan otomatis.')
    await startFinishFlow(true)
  }, [hasFinished, startFinishFlow])

  const handleSelectOption = useCallback(
    (optionId: string) => {
      const questionId = currentQuestionId
      if (!questionId || answers[questionId] === optionId) return
      setAnswers((prev) => ({ ...prev, [questionId]: optionId }))
      answerSyncStateRef.current.set(questionId, optionId)
      void syncAnswerForQuestion(questionId).catch(() => toast.error('Gagal menyimpan jawaban'))
    },
    [answers, currentQuestionId, syncAnswerForQuestion],
  )

  const handleShowWarning5Min = useCallback(() => {
    setShowWarning5Min(true)
  }, [])

  const handleShowWarning1Min = useCallback(() => {
    setShowWarning1Min(true)
  }, [])

  const handleTimeExpired = useCallback(() => {
    if (finishing || finishLockRef.current || hasFinished) return
    void handleAutoFinish()
  }, [finishing, handleAutoFinish, hasFinished])

  // Calculate Answer Stats
  const totalQuestions = sortedQuestions.length
  const answeredCount = Object.keys(answers).length
  const unansweredCount = totalQuestions - answeredCount
  const markedCount = Object.values(marked).filter(Boolean).length

  const onFinishClick = () => {
    if (finishing || finishLockRef.current) return
    setShowConfirmModal(true)
  }

  const handleConfirmFinish = async () => {
    await startFinishFlow()
  }

  const handleExit = async () => {
    if (exitLockRef.current) return

    exitLockRef.current = true
    setExiting(true)

    try {
      await flushPendingAnswers()

      const snapshot = latestSnapshotRef.current

      if (snapshot) {
        const result = await saveProgressSnapshot(snapshot, lastSavedSnapshotRef.current, true)
        if (result.success || result.skipped) {
          lastSavedSnapshotRef.current = result.serialized
        }
      }
    } catch (error) {
      console.error('Failed to save progress before exit:', error)

      if (latestSnapshotRef.current) {
        flushProgressWithBeacon(latestSnapshotRef.current)
      }
    } finally {
      router.push(returnPath)
    }
  }

  // Safety check - prevent crash if no questions available
  if (!currentQuestion || sortedQuestions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center text-muted-foreground">
          <p className="text-lg font-semibold">Tidak ada soal tersedia</p>
          <p className="text-sm">Silakan kembali ke {returnLocationLabel}</p>
        </div>
      </div>
    )
  }

  return (
    <div
      data-experience-mode="exam"
      className="flex flex-col lg:flex-row gap-4 xl:gap-6 p-2 md:p-4 xl:p-6 h-auto md:h-[calc(100vh-56px)] xl:h-[calc(100vh-64px)] md:overflow-hidden relative font-body text-foreground"
    >
      {/* Native drawer shares focus containment; question order/handlers are unchanged. */}
      <DialogSurface
        isOpen={showMobileNav}
        onClose={() => setShowMobileNav(false)}
        labelledBy={mobileNavigationTitleId}
        className="fixed inset-y-0 right-0 left-auto m-0 ml-auto h-dvh max-h-dvh w-[calc(100%-2rem)] max-w-sm rounded-none border-l border-border bg-white"
      >
        <div className="flex h-full min-h-0 flex-col p-5">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
            <h2
              id={mobileNavigationTitleId}
              className="font-semibold text-lg flex items-center gap-2 font-body text-foreground"
            >
              <Map size={20} /> Navigasi Soal
            </h2>
            <button
              type="button"
              data-autofocus
              aria-label="Tutup navigasi soal"
              onClick={() => setShowMobileNav(false)}
              className="flex size-11 shrink-0 items-center justify-center rounded-xl hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-1">
            <div className="grid grid-cols-5 gap-2">
              {sortedQuestions.map((q, idx) => (
                <button
                  key={q.id}
                  onClick={() => {
                    handleNavigateToIndex(idx)
                    setShowMobileNav(false)
                  }}
                  aria-label={`Buka soal ${idx + 1}${currentIndex === idx ? ', sedang dikerjakan' : ''}`}
                  aria-current={currentIndex === idx ? 'step' : undefined}
                  style={
                    currentIndex === idx
                      ? { outline: '3px solid #ef4444', outlineOffset: '2px' }
                      : undefined
                  }
                  className={cn(
                    'relative min-h-11 min-w-11 rounded-lg font-body font-semibold text-sm flex items-center justify-center transition-colors border',
                    currentIndex === idx ? 'z-10' : '',
                    marked[q.id]
                      ? 'bg-warning-muted text-warning border-warning-border'
                      : answers[q.id]
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-white text-muted-foreground border-border hover:bg-muted',
                  )}
                >
                  {idx + 1}
                  {currentIndex === idx && (
                    <span
                      aria-hidden="true"
                      className="absolute -right-1.5 -top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-red-500 shadow-sm"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Exit ButtonMobile */}
          <div className="mt-4 pt-4 border-t border-border bg-gray-50/50 rounded-lg p-4">
            <button
              onClick={() => setShowExitModal(true)}
              className="st-focus min-h-11 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-danger-border text-danger bg-danger-muted hover:bg-danger-muted/70 font-body font-medium transition-colors"
            >
              <LogOut size={18} /> Keluar {sessionKindLabel}
            </button>

            <div className="mt-4 p-3 bg-white border border-border text-xs text-muted-foreground space-y-1.5 rounded-lg font-body font-medium">
              <div className="flex items-center gap-2">
                <div className="relative h-3 w-3 rounded-full border border-foreground bg-white">
                  <span className="absolute -right-1.5 -top-1.5 h-2 w-2 rounded-full bg-red-500" />
                </div>
                <span>Sedang dikerjakan</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500 border border-blue-700"></div>
                <span>Dijawab</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-400 border border-yellow-600"></div>
                <span>Ditandai</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-white border border-border"></div>
                <span>Belum dijawab</span>
              </div>
            </div>
          </div>
        </div>
      </DialogSurface>

      {/* Exit confirmation retains the existing save/resume handler. */}
      {showExitModal && (
        <ExamConfirmDialog
          title={`Keluar ${sessionKindLabel}?`}
          description={
            <>
              Progres {sessionKindLabelLower} dan nomor soal terakhir akan tersimpan. Kamu bisa
              lanjut lagi nanti dari {returnLocationLabel}.
            </>
          }
          pending={exiting}
          onCancel={() => {
            if (!exiting) setShowExitModal(false)
          }}
          actions={
            <>
              <Button
                type="button"
                variant="outline"
                data-autofocus
                disabled={exiting}
                onClick={() => {
                  if (!exiting) setShowExitModal(false)
                }}
              >
                Batal
              </Button>
              <Button
                type="button"
                variant="danger"
                disabled={exiting}
                aria-busy={exiting}
                onClick={handleExit}
              >
                {exiting ? 'Menyimpan...' : 'Keluar'}
              </Button>
            </>
          }
        />
      )}

      {isTryout && showWarning5Min && (
        <ExamConfirmDialog
          title="Sisa waktu 5 menit"
          description="Periksa soal yang belum dijawab atau masih kamu tandai. Gunakan waktu tersisa dengan tenang."
          pending={false}
          actionLayout="single"
          onCancel={() => setShowWarning5Min(false)}
          actions={
            <Button type="button" data-autofocus onClick={() => setShowWarning5Min(false)}>
              Lanjutkan mengerjakan
            </Button>
          }
        />
      )}

      {isTryout && showWarning1Min && (
        <ExamConfirmDialog
          title="Sisa waktu 1 menit"
          description="Pastikan jawaban yang ingin kamu kumpulkan sudah terisi. Saat waktu habis, sesi akan dikumpulkan otomatis."
          pending={false}
          actionLayout="single"
          onCancel={() => setShowWarning1Min(false)}
          actions={
            <Button type="button" data-autofocus onClick={() => setShowWarning1Min(false)}>
              Lanjutkan mengerjakan
            </Button>
          }
        />
      )}

      {/* Completion presentation does not bypass the acknowledged-answer save barrier. */}
      {showConfirmModal && (
        <ExamConfirmDialog
          title="Kumpulkan jawaban?"
          description="Setelah dikumpulkan, jawaban tidak bisa diubah."
          pending={finishing}
          onCancel={() => {
            if (!finishing) setShowConfirmModal(false)
          }}
          actions={
            <>
              <Button
                type="button"
                variant="outline"
                data-autofocus
                disabled={finishing}
                onClick={() => {
                  if (!finishing) setShowConfirmModal(false)
                }}
              >
                Batal
              </Button>
              <Button
                type="button"
                data-prevent-double="true"
                disabled={finishing}
                aria-busy={finishing}
                onClick={handleConfirmFinish}
              >
                {finishing ? 'Mengumpulkan...' : 'Kumpulkan jawaban'}
              </Button>
            </>
          }
        >
          <dl className="mt-5 divide-y divide-border rounded-xl border border-border bg-slate-50 px-4">
            {[
              ['Total Soal', totalQuestions, 'text-foreground'],
              ['Dijawab', answeredCount, 'text-green-700'],
              ['Ditandai', markedCount, 'text-amber-800'],
              ['Belum Dijawab', unansweredCount, 'text-red-700'],
            ].map(([label, count, tone]) => (
              <div key={String(label)} className="flex items-center justify-between gap-3 py-3">
                <dt className="text-sm text-muted-foreground">{label}</dt>
                <dd className={cn('text-lg font-semibold tabular-nums', String(tone))}>{count}</dd>
              </div>
            ))}
          </dl>
        </ExamConfirmDialog>
      )}

      {/* LEFT: Question Area Wrapper */}
      <div
        className={cn(
          'flex-1 min-w-0 flex flex-col md:h-full relative',
          showNav ? '' : 'lg:max-w-6xl lg:mx-auto',
        )}
      >
        <div className="flex-1 flex flex-col bg-white border border-border rounded-xl md:overflow-hidden relative">
          {/* Header - Optimized for Mobile */}
          <div className="border-b border-border bg-slate-50 p-2 md:p-4">
            <div className="flex items-center justify-between gap-2">
              {/* Left: Nav & Info */}
              <div className="flex items-center gap-2 overflow-hidden min-w-0">
                <div className="flex flex-col gap-0.5 md:gap-1 overflow-hidden">
                  <div className="flex items-baseline gap-1">
                    <span className="font-semibold text-lg md:text-xl text-foreground leading-tight">
                      Soal {currentIndex + 1}
                    </span>
                    <span className="font-body text-sm text-muted-foreground">
                      dari {sortedQuestions.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-1 bg-muted text-muted-foreground text-xs font-medium rounded-md">
                      {currentQuestion.type}
                    </span>
                    {currentQuestion.category && (
                      <span className="px-2 py-1 bg-info-muted text-info-foreground border border-info-border text-xs font-medium rounded-md">
                        {formatSubjectName(currentQuestion.category)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Actions & Timer */}
              <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
                <button
                  onClick={toggleMark}
                  className={cn(
                    'st-focus flex min-h-11 min-w-11 items-center justify-center rounded-lg border transition-colors md:px-3 md:py-2 text-sm gap-1.5 font-body font-medium',
                    marked[currentQuestion.id]
                      ? 'bg-warning-muted text-warning border-warning-border'
                      : 'bg-white border-border text-muted-foreground hover:bg-muted',
                  )}
                  title={marked[currentQuestion.id] ? 'Hilangkan tanda ragu' : 'Tandai ragu'}
                >
                  <Flag
                    size={14}
                    className={cn(marked[currentQuestion.id] ? 'fill-current' : '')}
                  />
                  <span className="hidden md:inline ml-2">
                    {marked[currentQuestion.id] ? 'Ditandai' : 'Tandai untuk ditinjau'}
                  </span>
                </button>

                {isTryout ? (
                  <TryoutTimerBadge
                    endTime={endTime!}
                    hasFinished={hasFinished}
                    onShowWarning5Min={handleShowWarning5Min}
                    onShowWarning1Min={handleShowWarning1Min}
                    onTimeExpired={handleTimeExpired}
                  />
                ) : (
                  <div className="hidden md:flex min-h-11 px-3 bg-white border border-border rounded-lg text-sm font-medium items-center gap-2 text-muted-foreground">
                    <Clock size={14} />
                    <span>{sessionKindLabel}</span>
                  </div>
                )}

                <button
                  onClick={() => setShowNav(!showNav)}
                  className={cn(
                    'st-focus hidden lg:flex size-11 rounded-lg border transition-colors items-center justify-center',
                    showNav
                      ? 'bg-primary/5 text-primary border-primary/40 hover:bg-primary/10'
                      : 'bg-white text-muted-foreground border-border hover:bg-muted',
                  )}
                  title={showNav ? 'Sembunyikan Navigasi' : 'Tampilkan Navigasi'}
                >
                  <motion.div animate={{ rotate: showNav ? 0 : 180 }} className="transition-colors">
                    <Map size={14} />
                  </motion.div>
                </button>

                <button
                  onClick={() => setShowMobileNav(true)}
                  type="button"
                  aria-label="Buka navigasi soal"
                  aria-expanded={showMobileNav}
                  className="st-focus lg:hidden size-11 rounded-lg border border-border bg-white text-muted-foreground hover:bg-muted shrink-0 flex items-center justify-center"
                >
                  <Map size={14} className="md:w-4 md:h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Content Area - Unified Scroll */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 md:p-6 flex flex-col gap-6">
                <div className="pb-4 md:pb-6 border-b-2 border-dashed border-gray-200 flex flex-col gap-4">
                  <QuestionPrompt question={currentQuestion} />
                </div>

                <div className="space-y-2 md:space-y-3">
                  {currentQuestion.options.map((option, i) => {
                    const isSelected = answers[currentQuestion.id] === option.id
                    return (
                      <QuestionOptionCard
                        key={option.id}
                        option={option}
                        index={i}
                        isSelected={isSelected}
                        onSelect={handleSelectOption}
                      />
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Mobile Navigation - Slimmed Down */}
            <div className="shrink-0 p-4 border-t-2 border-dashed border-gray-300 flex justify-between items-center sm:hidden gap-3 bg-white/50 backdrop-blur-sm z-10">
              <button
                onClick={handlePreviousQuestion}
                aria-label="Soal sebelumnya"
                disabled={currentIndex === 0}
                className="st-focus flex size-12 items-center justify-center rounded-xl border border-border bg-white hover:bg-muted disabled:opacity-50 transition-colors"
              >
                <ChevronLeft size={24} />
              </button>

              {currentIndex === sortedQuestions.length - 1 ? (
                <button
                  data-prevent-double="true"
                  onClick={onFinishClick}
                  aria-label="Kumpulkan jawaban"
                  disabled={finishing}
                  className="st-focus flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-primary bg-primary px-4 text-primary-foreground font-body font-semibold text-base hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {finishing ? '...' : 'Kumpulkan'}
                  <CheckCircle2 size={20} />
                </button>
              ) : (
                <button
                  onClick={handleNextQuestion}
                  aria-label="Soal berikutnya"
                  className="st-focus flex size-12 items-center justify-center bg-primary text-primary-foreground rounded-xl border border-primary hover:bg-primary/90"
                >
                  <ChevronRight size={24} />
                </button>
              )}
            </div>
          </div>

          {/* Footer Nav - Desktop Only - Styled */}
          <div className="hidden sm:flex p-4 border-t border-border justify-between items-center bg-white">
            <button
              onClick={handlePreviousQuestion}
              disabled={currentIndex === 0}
              className="st-focus flex min-h-11 items-center gap-2 px-4 py-2 rounded-lg border border-border font-body font-medium text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={20} />
              Sebelumnya
            </button>

            {currentIndex === sortedQuestions.length - 1 ? (
              <button
                data-prevent-double="true"
                onClick={onFinishClick}
                disabled={finishing}
                className="st-focus flex min-h-11 items-center gap-2 px-5 py-2 bg-primary text-primary-foreground border border-primary rounded-lg hover:bg-primary/90 transition-colors font-body font-semibold text-base disabled:cursor-not-allowed disabled:opacity-60"
              >
                {finishing ? 'Mengumpulkan...' : 'Kumpulkan jawaban'}
                <CheckCircle2 size={20} />
              </button>
            ) : (
              <button
                onClick={handleNextQuestion}
                className="st-focus flex min-h-11 items-center gap-2 px-4 py-2 bg-foreground text-background border border-foreground rounded-lg hover:opacity-90 transition-colors font-body font-medium"
              >
                Selanjutnya
                <ChevronRight size={20} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT: Navigation Panel - Hidden on Mobile - Styled */}
      {showNav && (
        <div className="hidden lg:flex w-full lg:w-80 xl:w-88 2xl:w-96 shrink-0 flex-col bg-white border border-border rounded-xl h-full z-10 relative">
          <div className="p-4 border-b border-border font-body font-semibold text-lg flex items-center gap-2 text-foreground">
            <Map size={20} />
            Navigasi Soal
          </div>
          <div className="p-4 flex-1 overflow-y-auto">
            <div className="grid grid-cols-5 gap-2.5">
              {sortedQuestions.map((q, idx) => (
                <button
                  key={q.id}
                  onClick={() => handleNavigateToIndex(idx)}
                  aria-label={`Buka soal ${idx + 1}${currentIndex === idx ? ', sedang dikerjakan' : ''}`}
                  aria-current={currentIndex === idx ? 'step' : undefined}
                  style={
                    currentIndex === idx
                      ? { outline: '3px solid #ef4444', outlineOffset: '2px' }
                      : undefined
                  }
                  className={cn(
                    'relative min-h-11 min-w-11 rounded-lg font-body font-semibold text-sm flex items-center justify-center transition-colors border',
                    currentIndex === idx ? 'z-10' : '',
                    marked[q.id]
                      ? 'bg-warning-muted text-warning border-warning-border'
                      : answers[q.id]
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-white text-muted-foreground border-border hover:bg-muted',
                  )}
                >
                  {idx + 1}
                  {currentIndex === idx && (
                    <span
                      aria-hidden="true"
                      className="absolute -right-1.5 -top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-red-500 shadow-sm"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
          <div className="p-4 border-t border-border bg-gray-50/50 rounded-b-lg">
            <button
              onClick={() => setShowExitModal(true)}
              className="st-focus min-h-11 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-danger-border text-danger bg-danger-muted hover:bg-danger-muted/70 font-body font-medium transition-colors"
            >
              <LogOut size={18} /> Keluar {sessionKindLabel}
            </button>
            <div className="mt-4 p-3 bg-white border border-border text-xs text-muted-foreground space-y-1.5 rounded-lg font-body font-medium">
              <div className="flex items-center gap-2">
                <div className="relative h-3 w-3 rounded-full border border-foreground bg-white">
                  <span className="absolute -right-1.5 -top-1.5 h-2 w-2 rounded-full bg-red-500" />
                </div>
                <span>Sedang dikerjakan</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500 border border-blue-700"></div>
                <span>Dijawab</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-400 border border-yellow-600"></div>
                <span>Ditandai</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-white border border-border"></div>
                <span>Belum dijawab</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
