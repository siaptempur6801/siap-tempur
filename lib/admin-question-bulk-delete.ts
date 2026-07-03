export const MAX_BULK_QUESTION_DELETE = 100

export function normalizeBulkQuestionIds(ids: string[]) {
    return Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean))).slice(0, MAX_BULK_QUESTION_DELETE)
}
