export function getPracticeSessionStorageKey(sessionId: string) {
  return `cpns-practice-session:${sessionId}`
}

export function getResumeQuestionNumberFromStoredProgress(raw: string | null): number | null {
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as { currentQuestionIndex?: unknown }
    const currentQuestionIndex = parsed.currentQuestionIndex

    if (
      typeof currentQuestionIndex === 'number' &&
      Number.isInteger(currentQuestionIndex) &&
      currentQuestionIndex >= 0
    ) {
      return currentQuestionIndex + 1
    }
  } catch {
    return null
  }

  return null
}
