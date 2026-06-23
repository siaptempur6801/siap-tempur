import type { MiniTryoutType } from './constants'

export const TRYOUT_DURATION_MINUTES = 100
export const DRILLING_MATERI_QUESTION_COUNT = 30

const TRYOUT_DURATION_MS = TRYOUT_DURATION_MINUTES * 60 * 1000

export const TEST_SESSION_KINDS = ['full_tryout', 'mini_tryout', 'drilling_materi', 'event'] as const
export type TestSessionKind = typeof TEST_SESSION_KINDS[number]
export type DashboardActiveSessionKind = 'full-tryout' | 'mini-tryout' | 'drilling-materi' | 'event'

type ProgressColumnError = {
    message?: string | null
    details?: string | null
}

const SESSION_COMPATIBILITY_COLUMNS = ['last_activity_at', 'current_question_index', 'marked_questions', 'session_kind'] as const

export function isMissingProgressColumnError(error: ProgressColumnError | null) {
    const text = `${error?.message ?? ''} ${error?.details ?? ''}`.toLowerCase()
    return SESSION_COMPATIBILITY_COLUMNS.some((column) => text.includes(column))
}

export function isTryoutExpired(startTime?: string | null, now = Date.now()) {
    if (!startTime) return false
    return now - new Date(startTime).getTime() >= TRYOUT_DURATION_MS
}

export function normalizeTestSessionKind(value: unknown): TestSessionKind | null {
    return typeof value === 'string' && TEST_SESSION_KINDS.includes(value as TestSessionKind)
        ? value as TestSessionKind
        : null
}

export function getDashboardActiveSessionKind(
    mode: 'practice' | 'tryout' | string | null | undefined,
    sessionKind: unknown
): DashboardActiveSessionKind | null {
    const kind = normalizeTestSessionKind(sessionKind)

    if (kind === 'event') return 'event'
    if (kind === 'drilling_materi') return 'drilling-materi'
    if (kind === 'mini_tryout') return 'mini-tryout'
    if (kind === 'full_tryout') return 'full-tryout'
    if (mode === 'practice') return 'mini-tryout'
    if (mode === 'tryout') return 'full-tryout'

    return null
}

export function getDrillingMaterialKey(type: MiniTryoutType, subCategory: string) {
    return `${type}::${subCategory}`
}

export function isDrillingMateriQuestionSet({
    sessionKind,
    isCombined,
    answerCount,
    uniqueSubCategoryCount,
    isEventSession = false,
}: {
    sessionKind: unknown
    isCombined: boolean
    answerCount: number
    uniqueSubCategoryCount: number
    isEventSession?: boolean
}) {
    const kind = normalizeTestSessionKind(sessionKind)

    return kind === 'drilling_materi' || (
        !kind &&
        !isCombined &&
        !isEventSession &&
        answerCount === DRILLING_MATERI_QUESTION_COUNT &&
        uniqueSubCategoryCount === 1
    )
}
