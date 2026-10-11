export type QuestionResponseType = 'single_choice' | 'multiple_choice' | 'category' | string

export type ResponseOption = {
  id: string
  isCorrect: boolean | null
  score: number | null
  responseGroup?: string | null
  responseGroupOrder?: number | null
}

export type ResponseScoringConfig = {
  scoringMode?: 'single_option' | 'exact_set' | 'grouped_sum'
}

export type QuestionScoreResult = {
  score: number
  maxScore: number
  isCorrect: boolean | null
  answered: boolean
}

function numericScore(option: ResponseOption, fallback = 0) {
  return option.score ?? (option.isCorrect === true ? fallback : 0)
}

function sameSet(left: Set<string>, right: Set<string>) {
  if (left.size !== right.size) return false
  for (const value of left) if (!right.has(value)) return false
  return true
}

function inferScoringMode(questionType: QuestionResponseType, config?: ResponseScoringConfig) {
  if (config?.scoringMode) return config.scoringMode
  if (questionType === 'multiple_choice') return 'exact_set' as const
  if (questionType === 'category') return 'grouped_sum' as const
  return 'single_option' as const
}

export function calculateMaxScore(input: {
  questionType: QuestionResponseType
  options: ResponseOption[]
  config?: ResponseScoringConfig
}) {
  const mode = inferScoringMode(input.questionType, input.config)
  if (input.options.length === 0) return 0

  if (mode === 'grouped_sum') {
    const groups = new Map<string, ResponseOption[]>()
    for (const option of input.options) {
      const key = option.responseGroup ?? `__ungrouped_${option.id}`
      const rows = groups.get(key) ?? []
      rows.push(option)
      groups.set(key, rows)
    }
    let total = 0
    for (const rows of groups.values()) {
      total += Math.max(...rows.map((option) => numericScore(option, 1)), 0)
    }
    return total
  }

  if (mode === 'exact_set') {
    const correct = input.options.filter((option) => option.isCorrect === true)
    if (correct.length === 0)
      return Math.max(...input.options.map((option) => numericScore(option, 1)), 0)
    return correct.reduce((sum, option) => sum + Math.max(0, numericScore(option, 1)), 0)
  }

  return Math.max(...input.options.map((option) => numericScore(option, 5)), 0)
}

export function calculateResponseScore(input: {
  questionType: QuestionResponseType
  options: ResponseOption[]
  selectedOptionIds: string[]
  maxScore?: number
  config?: ResponseScoringConfig
}): QuestionScoreResult {
  const selected = new Set(input.selectedOptionIds)
  const answered = selected.size > 0
  const mode = inferScoringMode(input.questionType, input.config)
  const maxScore =
    input.maxScore ??
    calculateMaxScore({
      questionType: input.questionType,
      options: input.options,
      config: input.config,
    })

  if (!answered) return { score: 0, maxScore, isCorrect: null, answered: false }

  if (mode === 'exact_set') {
    const correctIds = new Set(
      input.options.filter((option) => option.isCorrect === true).map((option) => option.id),
    )
    const correct = correctIds.size > 0 && sameSet(selected, correctIds)
    return { score: correct ? maxScore : 0, maxScore, isCorrect: correct, answered: true }
  }

  if (mode === 'grouped_sum') {
    const groups = new Map<string, ResponseOption[]>()
    for (const option of input.options) {
      const key = option.responseGroup ?? `__ungrouped_${option.id}`
      const rows = groups.get(key) ?? []
      rows.push(option)
      groups.set(key, rows)
    }

    let score = 0
    let allGroupsAnswered = true
    let allGroupsCorrect = true
    for (const rows of groups.values()) {
      const selectedRows = rows.filter((option) => selected.has(option.id))
      if (selectedRows.length !== 1) {
        allGroupsAnswered = false
        allGroupsCorrect = false
        continue
      }
      const option = selectedRows[0]
      score += Math.max(0, numericScore(option, 1))
      if (option.isCorrect !== true) allGroupsCorrect = false
    }

    return {
      score: Math.min(maxScore, score),
      maxScore,
      isCorrect: allGroupsAnswered ? allGroupsCorrect : false,
      answered: true,
    }
  }

  const option = input.options.find((row) => selected.has(row.id)) ?? null
  if (!option) return { score: 0, maxScore, isCorrect: false, answered: true }
  return {
    score: Math.max(0, numericScore(option, maxScore)),
    maxScore,
    isCorrect: option.isCorrect,
    answered: true,
  }
}
