import { useRef, useCallback, useEffect } from 'react'
import { submitAnswer } from '@/app/actions/practice'
import { toast } from 'sonner'

export type SessionProgressSnapshot = {
    sessionId: string
    currentQuestionIndex: number
    markedQuestions: Record<string, boolean>
}

export type AnswerSyncState = {
    inFlight: boolean
    latestOptionId: string | null
    inflightPromise: Promise<void> | null
}

function getSessionStorageKey(sessionId: string) {
    return `cpns-practice-session:${sessionId}`
}

export function saveProgressToLocalStorage(snapshot: SessionProgressSnapshot) {
    if (typeof window === 'undefined') return

    window.localStorage.setItem(
        getSessionStorageKey(snapshot.sessionId),
        JSON.stringify({
            currentQuestionIndex: snapshot.currentQuestionIndex,
            markedQuestions: snapshot.markedQuestions
        })
    )
}

export function loadProgressFromLocalStorage(sessionId: string) {
    if (typeof window === 'undefined') return null

    try {
        const raw = window.localStorage.getItem(getSessionStorageKey(sessionId))
        if (!raw) return null

        const parsed = JSON.parse(raw) as {
            currentQuestionIndex?: number
            markedQuestions?: Record<string, boolean>
        }

        return {
            currentQuestionIndex: typeof parsed.currentQuestionIndex === 'number' ? parsed.currentQuestionIndex : null,
            markedQuestions: parsed.markedQuestions && typeof parsed.markedQuestions === 'object' ? parsed.markedQuestions : null
        }
    } catch {
        return null
    }
}

export function clearProgressFromLocalStorage(sessionId: string) {
    if (typeof window === 'undefined') return
    window.localStorage.removeItem(getSessionStorageKey(sessionId))
}

export async function saveProgressSnapshot(snapshot: SessionProgressSnapshot, previousSerializedSnapshot: string, force = false) {
    const serialized = JSON.stringify(snapshot)

    if (!force && serialized === previousSerializedSnapshot) {
        return { serialized, skipped: true, success: false }
    }

    const response = await fetch(`/api/practice-sessions/${snapshot.sessionId}/beacon`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            currentQuestionIndex: snapshot.currentQuestionIndex,
            markedQuestions: snapshot.markedQuestions
        })
    })

    if (!response.ok) {
        return { serialized, skipped: false, success: false }
    }

    return { serialized, skipped: false, success: true }
}

export function flushProgressWithBeacon(snapshot: SessionProgressSnapshot) {
    const payload = JSON.stringify({
        currentQuestionIndex: snapshot.currentQuestionIndex,
        markedQuestions: snapshot.markedQuestions
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
            'Content-Type': 'application/json'
        },
        body: payload,
        keepalive: true
    })

    return false
}

export function usePracticeSync({
    sessionId,
    currentIndex,
    marked,
    hasFinished,
    hasHydratedResumeState
}: {
    sessionId: string
    currentIndex: number
    marked: Record<string, boolean>
    hasFinished: boolean
    hasHydratedResumeState: boolean
}) {
    const lastSavedSnapshotRef = useRef('')
    const latestSnapshotRef = useRef<SessionProgressSnapshot | null>(null)
    const answerSyncStateRef = useRef<Record<string, AnswerSyncState>>({})

    const syncProgressSnapshot = useCallback((nextIndex: number, nextMarked: Record<string, boolean>) => {
        if (hasFinished) return

        const snapshot = {
            sessionId,
            currentQuestionIndex: nextIndex,
            markedQuestions: nextMarked
        }

        latestSnapshotRef.current = snapshot
        saveProgressToLocalStorage(snapshot)
    }, [hasFinished, sessionId])

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
            markedQuestions: marked
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

    const syncAnswerForQuestion = useCallback(async function syncAnswer(questionId: string): Promise<void> {
        const state = answerSyncStateRef.current[questionId]
        if (!state?.latestOptionId) return
        if (state.inFlight) {
            return state.inflightPromise ?? Promise.resolve()
        }

        const optionId = state.latestOptionId
        state.inFlight = true

        const request = submitAnswer(sessionId, questionId, optionId)
            .then((result) => {
                if (result?.error && state.latestOptionId === optionId) {
                    toast.error('Gagal menyimpan jawaban')
                }
            })
            .catch(() => {
                if (state.latestOptionId === optionId) {
                    toast.error('Gagal menyimpan jawaban')
                }
            })
            .then(async () => {
                state.inFlight = false
                if (state.latestOptionId !== optionId) {
                    await syncAnswer(questionId)
                }
            })

        state.inflightPromise = request
        return request
    }, [sessionId])

    const flushPendingAnswers = useCallback(async () => {
        const pendingQuestionIds = Object.keys(answerSyncStateRef.current)
        if (pendingQuestionIds.length === 0) return

        await Promise.all(pendingQuestionIds.map((questionId) => syncAnswerForQuestion(questionId)))
    }, [syncAnswerForQuestion])

    const registerAnswerSelection = useCallback((questionId: string, optionId: string) => {
        const currentState = answerSyncStateRef.current[questionId] ?? {
            inFlight: false,
            latestOptionId: null,
            inflightPromise: null
        }
        currentState.latestOptionId = optionId
        answerSyncStateRef.current[questionId] = currentState

        void syncAnswerForQuestion(questionId)
    }, [syncAnswerForQuestion])

    const getLatestSnapshot = useCallback(() => latestSnapshotRef.current, [])
    const getLastSavedSnapshot = useCallback(() => lastSavedSnapshotRef.current, [])
    const setLastSavedSnapshot = useCallback((val: string) => { lastSavedSnapshotRef.current = val }, [])

    return {
        syncProgressSnapshot,
        flushPendingAnswers,
        registerAnswerSelection,
        getLatestSnapshot,
        getLastSavedSnapshot,
        setLastSavedSnapshot
    }
}
