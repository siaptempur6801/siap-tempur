import { createV2AdminClient } from '@/lib/utils/supabase/server'
import { chunkValues } from '@/lib/supabase-batch'
import type { Json } from '@/types/database.types'

export type CompletedAttemptSummary = {
  id: string
  submitted_at: string | null
  duration_used_seconds: number | null
  metadata: Json
}

export type AttemptScoreSummary = {
  attempt_id: string
  subject_id: string | null
  percentage: number | null
  correct_count: number
  wrong_count: number
  unanswered_count: number
}

export type DailyActivityRow = {
  user_id: string
  activity_date: string
  questions_answered: number
  practice_seconds: number
  drill_attempts: number
  exam_attempts: number
  correct_answers: number
}

export type SubjectProgressRow = {
  user_id: string
  subject_id: string
  attempts: number
  questions_answered: number
  accuracy: number
  mastery_score: number
  updated_at: string
}

/**
 * Agregat mentah per subjek dari `get_user_subject_progress`.
 *
 * Sengaja mengembalikan komponen mentah (`correct_answers`, `total_questions`,
 * `weighted_percentage`) alih-alih `accuracy`/`mastery_score` yang sudah dibulatkan,
 * supaya pembulatan akhir tetap dilakukan di TypeScript oleh `round2` — sama
 * seperti sebelumnya. Itu menjaga perilaku pembulatan tidak bergantung pada
 * implementasi `round()` PostgreSQL.
 *
 * `weighted_percentage` dan seluruh komponen lain dikembalikan PostgREST sebagai
 * angka JSON. `numeric(7,4)` aman: nilainya kecil, sehingga `Number()` tidak
 * kehilangan presisi yang berarti.
 */
export type SubjectProgressAggregate = {
  subject_id: string
  attempts: number
  questions_answered: number
  correct_answers: number
  total_questions: number
  weighted_percentage: number
}

export class ProgressRepository {
  async getCompletedAttempt(
    userId: string,
    attemptId: string,
  ): Promise<CompletedAttemptSummary | null> {
    const admin = await createV2AdminClient()
    const { data, error } = await admin
      .from('exam_attempts')
      .select('id, submitted_at, duration_used_seconds, metadata')
      .eq('id', attemptId)
      .eq('user_id', userId)
      .in('status', ['completed', 'COMPLETED'])
      .maybeSingle()
    if (error) throw error
    return data as CompletedAttemptSummary | null
  }

  async listCompletedAttemptsInWindow(
    userId: string,
    startIso: string,
    endIso: string,
  ): Promise<CompletedAttemptSummary[]> {
    const admin = await createV2AdminClient()
    const { data, error } = await admin
      .from('exam_attempts')
      .select('id, submitted_at, duration_used_seconds, metadata')
      .eq('user_id', userId)
      .in('status', ['completed', 'COMPLETED'])
      .gte('submitted_at', startIso)
      .lt('submitted_at', endIso)
    if (error) throw error
    return (data ?? []) as CompletedAttemptSummary[]
  }

  /**
   * Skor untuk sekumpulan attempt.
   *
   * Nilai `attemptIds` berasal dari riwayat user dan tumbuh seiring waktu, jadi
   * filter `.in(...)` WAJIB di-batch: satu daftar UUID yang panjang membuat URL
   * PostgREST melewati batas header (±16KB) dan permintaan gagal dengan
   * `UND_ERR_HEADERS_OVERFLOW`. Sebelum perbaikan ini, pengguna dengan riwayat
   * banyak tidak dapat menyelesaikan ujian karena kegagalan tersebut terjadi di
   * dalam `exam_completion_service.completeAttempt`.
   */
  /**
   * Agregat progres per subjek untuk satu user, dihitung di database.
   *
   * Menggantikan pasangan `listAllCompletedAttemptIds` + `listScores` pada
   * `SubjectProgressService.sync`. Cara lama menarik SELURUH id attempt user
   * (tumbuh tanpa batas) lalu mem-batch skornya per ~16 KB URL — puluhan round
   * trip untuk menghasilkan ~3 angka, dan gagal keras begitu ambang
   * `MAX_ATTEMPTS_PER_AGGREGATE` tersentuh.
   *
   * Sekarang: satu round trip, dan yang menyeberangi jaringan hanya satu baris
   * per subjek, bukan seluruh riwayat.
   *
   * Pembulatan TIDAK dilakukan di sini — pemanggil memakai `round2` yang sama
   * seperti sebelumnya (lihat catatan paritas di migration
   * `20260918130000_subject_progress_aggregate_rpc.sql`).
   */
  async getSubjectProgressAggregates(userId: string): Promise<SubjectProgressAggregate[]> {
    const admin = await createV2AdminClient()
    const { data, error } = await admin.rpc('get_user_subject_progress', { p_user_id: userId })
    if (error) throw error
    return (data ?? []) as SubjectProgressAggregate[]
  }

  async listScores(attemptIds: string[]): Promise<AttemptScoreSummary[]> {
    if (attemptIds.length === 0) return []
    const admin = await createV2AdminClient()

    const chunks = chunkValues(attemptIds)
    const pages = await Promise.all(
      chunks.map(async (chunk) => {
        const { data, error } = await admin
          .from('attempt_scores')
          .select(
            'attempt_id, subject_id, percentage, correct_count, wrong_count, unanswered_count',
          )
          .in('attempt_id', chunk)
        if (error) throw error
        return (data ?? []) as AttemptScoreSummary[]
      }),
    )

    return pages.flat()
  }

  async upsertDailyActivity(row: DailyActivityRow) {
    const admin = await createV2AdminClient()
    const { error } = await admin
      .from('user_activity_daily')
      .upsert(row, { onConflict: 'user_id,activity_date' })
    if (error) throw error
  }

  async listActivityDays(userId: string): Promise<DailyActivityRow[]> {
    const admin = await createV2AdminClient()
    const { data, error } = await admin
      .from('user_activity_daily')
      .select(
        'user_id, activity_date, questions_answered, practice_seconds, drill_attempts, exam_attempts, correct_answers',
      )
      .eq('user_id', userId)
      .order('activity_date', { ascending: true })
    if (error) throw error
    return (data ?? []) as DailyActivityRow[]
  }

  async upsertStreak(input: {
    userId: string
    currentStreak: number
    longestStreak: number
    lastActiveDate: string | null
  }) {
    const admin = await createV2AdminClient()
    const { error } = await admin.from('user_streaks').upsert(
      {
        user_id: input.userId,
        current_streak: input.currentStreak,
        longest_streak: input.longestStreak,
        last_active_date: input.lastActiveDate,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
    if (error) throw error
  }

  async upsertSubjectProgress(rows: SubjectProgressRow[]) {
    if (rows.length === 0) return
    const admin = await createV2AdminClient()
    const { error } = await admin
      .from('user_subject_progress')
      .upsert(rows, { onConflict: 'user_id,subject_id' })
    if (error) throw error
  }
}

export const progressRepository = new ProgressRepository()
