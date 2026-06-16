export type AnswerProgressRow = {
    session_id: string
    option_id: string | null
}

export function buildAnsweredProgressMap(rows: AnswerProgressRow[]) {
    const progressMap = new Map<string, number>()

    for (const row of rows) {
        if (!row.option_id) continue
        progressMap.set(row.session_id, (progressMap.get(row.session_id) || 0) + 1)
    }

    return progressMap
}
