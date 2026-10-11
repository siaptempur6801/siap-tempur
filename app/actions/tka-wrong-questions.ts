'use server'

import { validateCsrf } from '@/lib/csrf'
import { env } from '@/lib/env'
import { logger } from '@/lib/logger'
import { tkaWrongQuestionService } from '@/src/services/tka-wrong-question.service'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isUuid(value: string) {
  return UUID_PATTERN.test(value)
}

function messageFor(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  if (message.includes('ANSWER_REQUIRED')) return 'Pilih jawaban sebelum memeriksa.'
  if (message.includes('OPEN_WRONG_QUESTION_NOT_FOUND'))
    return 'Soal ini sudah selesai atau tidak tersedia lagi.'
  if (message.includes('INVALID_OPTION_SELECTION')) return 'Pilihan jawaban tidak valid.'
  if (message.includes('SINGLE_CHOICE_REQUIRES_ONE_OPTION')) return 'Pilih tepat satu jawaban.'
  return 'Gagal memeriksa jawaban. Coba lagi.'
}

export async function reviewTkaWrongQuestion(input: {
  wrongQuestionId: string
  optionIds: string[]
}) {
  try {
    await validateCsrf()
  } catch {
    return { error: 'Invalid request' }
  }

  if (env.appEnvironment() === 'production') {
    return { error: 'Mode ulang soal salah belum tersedia di production.' }
  }

  const optionIds = Array.from(new Set(input.optionIds))
  if (
    !isUuid(input.wrongQuestionId) ||
    optionIds.length === 0 ||
    optionIds.some((id) => !isUuid(id))
  ) {
    return { error: 'Payload jawaban tidak valid.' }
  }

  try {
    const result = await tkaWrongQuestionService.review(input.wrongQuestionId, optionIds)
    return {
      success: true as const,
      isCorrect: result.isCorrect,
      scoreAwarded: result.scoreAwarded,
      remainingOpen: result.remainingOpen,
      explanation: result.explanation,
    }
  } catch (error) {
    logger.warn('[tka-wrong-question] review failed', {
      error: error instanceof Error ? error.message : String(error),
      wrongQuestionId: input.wrongQuestionId,
    })
    return { error: messageFor(error) }
  }
}
