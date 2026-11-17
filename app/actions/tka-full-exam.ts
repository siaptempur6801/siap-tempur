'use server'

import { validateCsrf } from '@/lib/csrf'
import { logger } from '@/lib/logger'
import { eventRankingService } from '@/src/services/event-ranking.service'
import { EXAM_ACTION_RATE_LIMITED_MESSAGE, isExamActionRateLimited } from '@/lib/server-rate-limit'
import { createV2Client, getAuthUserIdVerified } from '@/lib/utils/supabase/server'
import { activityService } from '@/src/services/activity.service'
import { streakService } from '@/src/services/streak.service'
import { tkaFullExamRpcService } from '@/src/services/tka-full-exam-rpc.service'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isUuid(value: string) {
  return UUID_PATTERN.test(value)
}

function messageFor(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  if (message.includes('SECTION_TIME_EXPIRED')) return 'Waktu section sudah habis.'
  if (message.includes('ALL_SECTIONS_MUST_BE_COMPLETED'))
    return 'Selesaikan seluruh section sebelum mengirim tryout.'
  if (message.includes('Attempt limit reached')) return 'Batas percobaan tryout sudah tercapai.'
  if (message.includes('active section')) return 'Soal ini tidak berada pada section aktif.'
  return 'Gagal memproses tryout TKA.'
}

export async function saveTkaFullExamAnswer(input: {
  attemptQuestionId: string
  optionIds: string[]
  timeSpentSeconds: number
  isFlagged: boolean
}) {
  try {
    await validateCsrf()
  } catch {
    return { error: 'Invalid request' }
  }

  const optionIds = Array.from(new Set(input.optionIds))
  if (!isUuid(input.attemptQuestionId) || optionIds.some((id) => !isUuid(id))) {
    return { error: 'Payload jawaban tidak valid.' }
  }
  const rateLimitUserId = await getAuthUserIdVerified()
  if (rateLimitUserId && (await isExamActionRateLimited(rateLimitUserId, 'answer_save'))) {
    return { error: EXAM_ACTION_RATE_LIMITED_MESSAGE }
  }

  try {
    await tkaFullExamRpcService.saveAnswer({
      attemptQuestionId: input.attemptQuestionId,
      optionIds,
      timeSpentSeconds: input.timeSpentSeconds,
      isFlagged: input.isFlagged,
    })
    return { success: true as const }
  } catch (error) {
    logger.warn('[tka-full-exam] save answer failed', {
      error: error instanceof Error ? error.message : String(error),
      attemptQuestionId: input.attemptQuestionId,
    })
    return { error: messageFor(error) }
  }
}

export async function completeTkaFullExamSection(attemptId: string) {
  try {
    await validateCsrf()
  } catch {
    return { error: 'Invalid request' }
  }
  if (!isUuid(attemptId)) return { error: 'Attempt tidak valid.' }
  const rateLimitUserId = await getAuthUserIdVerified()
  if (rateLimitUserId && (await isExamActionRateLimited(rateLimitUserId, 'attempt_finish'))) {
    return { error: EXAM_ACTION_RATE_LIMITED_MESSAGE }
  }

  try {
    const result = await tkaFullExamRpcService.completeSection(attemptId)
    return {
      success: true as const,
      readyToSubmit: result.ready_to_submit === true,
      activeSectionId:
        typeof result.active_section_id === 'string' ? result.active_section_id : null,
    }
  } catch (error) {
    logger.warn('[tka-full-exam] complete section failed', {
      error: error instanceof Error ? error.message : String(error),
      attemptId,
    })
    return { error: messageFor(error) }
  }
}

export async function submitTkaFullExamAttempt(attemptId: string) {
  try {
    await validateCsrf()
  } catch {
    return { error: 'Invalid request' }
  }
  if (!isUuid(attemptId)) return { error: 'Attempt tidak valid.' }
  const rateLimitUserId = await getAuthUserIdVerified()
  if (rateLimitUserId && (await isExamActionRateLimited(rateLimitUserId, 'attempt_finish'))) {
    return { error: EXAM_ACTION_RATE_LIMITED_MESSAGE }
  }

  try {
    const result = await tkaFullExamRpcService.submitAttempt(attemptId)
    const supabase = await createV2Client()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      try {
        await activityService.syncAttemptDay(user.id, attemptId)
        await streakService.sync(user.id)
      } catch (syncError) {
        logger.warn('[tka-full-exam] gamification sync failed', {
          error: syncError instanceof Error ? syncError.message : String(syncError),
          attemptId,
          userId: user.id,
        })
      }
      // Attempt Event TKA: jalur RPC ini tidak menyinkronkan ranking event, sehingga
      // ranking baru muncul saat admin menghitung ulang. Best-effort; cron menjadi
      // jaring pengaman (audit A-07/A-11).
      try {
        await eventRankingService.syncForAttempt(user.id, attemptId)
      } catch (rankingError) {
        logger.warn('[tka-full-exam] event ranking sync failed', {
          error: rankingError instanceof Error ? rankingError.message : String(rankingError),
          attemptId,
          userId: user.id,
        })
      }
    }
    return {
      success: true as const,
      rawScore:
        typeof result.raw_score === 'number' ? result.raw_score : Number(result.raw_score ?? 0),
      percentage:
        typeof result.percentage === 'number' ? result.percentage : Number(result.percentage ?? 0),
    }
  } catch (error) {
    logger.warn('[tka-full-exam] submit attempt failed', {
      error: error instanceof Error ? error.message : String(error),
      attemptId,
    })
    return { error: messageFor(error) }
  }
}
