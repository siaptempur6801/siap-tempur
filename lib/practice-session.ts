const TRYOUT_DURATION_MS = 100 * 60 * 1000

type ProgressColumnError = {
    message?: string | null
    details?: string | null
}

const PROGRESS_COLUMNS = ['last_activity_at', 'current_question_index', 'marked_questions'] as const

export function isMissingProgressColumnError(error: ProgressColumnError | null) {
    const text = `${error?.message ?? ''} ${error?.details ?? ''}`.toLowerCase()
    return PROGRESS_COLUMNS.some((column) => text.includes(column))
}

export function isTryoutExpired(startTime?: string | null, now = Date.now()) {
    if (!startTime) return false
    return now - new Date(startTime).getTime() >= TRYOUT_DURATION_MS
}
