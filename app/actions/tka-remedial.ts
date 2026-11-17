'use server'

import { validateCsrf } from '@/lib/csrf'
import { env } from '@/lib/env'
import { logger } from '@/lib/logger'
import { EXAM_ACTION_RATE_LIMITED_MESSAGE, isExamActionRateLimited } from '@/lib/server-rate-limit'
import { getAuthUserIdVerified } from '@/lib/utils/supabase/server'
import { tkaRemedialService } from '@/src/services/tka-remedial.service'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isUuid(value: string) {
  return UUID_PATTERN.test(value)
}

function messageFor(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  if (message.includes('ANSWER_REQUIRED')) return 'Pilih jawaban sebelum memeriksa.'
  if (message.includes('REMEDIAL_SESSION_NOT_FOUND')) return 'Sesi remedial tidak tersedia.'
  if (message.includes('REMEDIAL_ITEM_NOT_FOUND')) return 'Soal remedial tidak tersedia.'
  if (
    message.includes('REMEDIAL_ITEM_ALREADY_COMPLETED') ||
    message.includes('REMEDIAL_ITEM_ALREADY_RESOLVED')
  ) {
    return 'Soal ini sudah dituntaskan.'
  }
  if (message.includes('INVALID_OPTION_SELECTION')) return 'Pilihan jawaban tidak valid.'
  if (message.includes('SINGLE_CHOICE_REQUIRES_ONE_OPTION')) return 'Pilih tepat satu jawaban.'
  return 'Gagal memeriksa remedial. Coba lagi.'
}

export async function reviewTkaRemedialItem(input: {
  sessionId: string
  itemId: string
  optionIds: string[]
}) {
  try {
    await validateCsrf()
  } catch {
    return { error: 'Invalid request' }
  }

  if (env.appEnvironment() === 'production') {
    return { error: 'Remedial otomatis belum tersedia di production.' }
  }

  const optionIds = Array.from(new Set(input.optionIds))
  if (
    !isUuid(input.sessionId) ||
    !isUuid(input.itemId) ||
    optionIds.length === 0 ||
    optionIds.some((id) => !isUuid(id))
  ) {
    return { error: 'Payload jawaban tidak valid.' }
  }
  const rateLimitUserId = await getAuthUserIdVerified()
  if (rateLimitUserId && (await isExamActionRateLimited(rateLimitUserId, 'answer_save'))) {
    return { error: EXAM_ACTION_RATE_LIMITED_MESSAGE }
  }

  try {
    const result = await tkaRemedialService.review(input.sessionId, input.itemId, optionIds)
    return {
      success: true as const,
      isCorrect: result.isCorrect,
      scoreAwarded: result.scoreAwarded,
      explanation: result.explanation,
      totalItems: result.totalItems,
      completedItems: result.completedItems,
      pendingItems: result.pendingItems,
      sessionStatus: result.sessionStatus,
    }
  } catch (error) {
    logger.warn('[tka-remedial] review failed', {
      error: error instanceof Error ? error.message : String(error),
      sessionId: input.sessionId,
      itemId: input.itemId,
    })
    return { error: messageFor(error) }
  }
}
