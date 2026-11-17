import { createAdminClient, createV2AdminClient } from '@/lib/utils/supabase/server'
import { logger } from '@/lib/logger'
import { examCompletionService } from '@/src/services/exam-completion.service'
import { eventRankingService } from '@/src/services/event-ranking.service'

type ExpiredAttempt = {
  attempt_id: string
  user_id: string
  engine: 'shared' | 'sectioned'
  deadline: string
}

type FinalizationSummary = {
  checked: number
  finalized: number
  skipped: number
  failed: number
}

type EventRankingRefreshSummary = {
  events: number
  failed: number
}

const FINALIZE_BATCH = 25
/** Event yang masih berjalan atau berakhir dalam 3 hari terakhir dihitung ulang tiap cron. */
const RECENT_EVENT_WINDOW_MS = 3 * 24 * 60 * 60 * 1000

/**
 * Finalisasi attempt yang melewati tenggat (audit A-07, keputusan pemilik 2026-11-17).
 *
 * Tenggat dihitung di SQL (`app_private.attempt_finalization_deadline`): mesin bersama
 * memakai `metadata.durationSeconds`, mesin bersesi (TKA) memakai tenggat seksi aktif
 * ditambah masa tenggang (Event: setelah sesi berakhir; lainnya: 24 jam). Attempt
 * impor legacy dan drill tanpa durasi tidak pernah difinalisasi. Skor dihitung dari
 * jawaban yang sudah tersimpan, lewat jalur yang sama dengan submit peserta.
 */
class AttemptFinalizationService {
  async finalizeExpired(limit = FINALIZE_BATCH): Promise<FinalizationSummary> {
    const summary: FinalizationSummary = { checked: 0, finalized: 0, skipped: 0, failed: 0 }
    const admin = await createAdminClient()
    const { data, error } = await admin.rpc('list_expired_in_progress_attempts', {
      p_limit: limit,
    })
    if (error) throw error

    for (const candidate of (data ?? []) as ExpiredAttempt[]) {
      summary.checked += 1
      try {
        if (candidate.engine === 'sectioned') {
          const { data: result, error: finalizeError } = await admin.rpc(
            'finalize_expired_sectioned_attempt',
            { p_attempt_id: candidate.attempt_id },
          )
          if (finalizeError) throw finalizeError
          if (!(result as { finalized?: boolean } | null)?.finalized) {
            summary.skipped += 1
            continue
          }
          // Jalur submit TKA tidak menyinkronkan ranking event; lakukan di sini.
          await eventRankingService
            .syncForAttempt(candidate.user_id, candidate.attempt_id)
            .catch((rankingError) =>
              logger.warn('Ranking event setelah finalisasi otomatis gagal', {
                attemptId: candidate.attempt_id,
                error: rankingError instanceof Error ? rankingError.message : String(rankingError),
              }),
            )
        } else {
          await examCompletionService.completeAttempt(candidate.user_id, candidate.attempt_id)
        }
        summary.finalized += 1
        logger.info('Attempt kedaluwarsa difinalisasi otomatis', {
          attemptId: candidate.attempt_id,
          engine: candidate.engine,
          deadline: candidate.deadline,
        })
      } catch (finalizeError) {
        summary.failed += 1
        logger.error('Finalisasi otomatis attempt gagal', finalizeError, {
          alert: 'attempt_auto_finalize_failed',
          attemptId: candidate.attempt_id,
          engine: candidate.engine,
        })
      }
    }
    return summary
  }

  /**
   * Hitung ulang ranking event yang sedang berjalan atau baru selesai. Menjadi jaring
   * pengaman bila sinkronisasi saat submit gagal (A-11) dan untuk submit TKA bersesi
   * yang tidak menyinkronkan ranking event sendiri.
   */
  async refreshRecentEventRankings(now = Date.now()): Promise<EventRankingRefreshSummary> {
    const admin = await createV2AdminClient()
    const { data, error } = await admin
      .from('events')
      .select('id')
      .lte('starts_at', new Date(now).toISOString())
      .gte('ends_at', new Date(now - RECENT_EVENT_WINDOW_MS).toISOString())
      .not('status', 'in', '(draft,DRAFT,archived,ARCHIVED,cancelled,CANCELLED)')
    if (error) throw error

    const summary: EventRankingRefreshSummary = { events: 0, failed: 0 }
    const rpcAdmin = await createAdminClient()
    for (const event of data ?? []) {
      summary.events += 1
      const { error: rankingError } = await rpcAdmin.rpc('recalculate_event_rankings', {
        p_event_id: String(event.id),
      })
      if (rankingError) {
        summary.failed += 1
        logger.error('Hitung ulang ranking event terjadwal gagal', rankingError, {
          alert: 'event_ranking_refresh_failed',
          eventId: String(event.id),
        })
      }
    }
    return summary
  }
}

export const attemptFinalizationService = new AttemptFinalizationService()
