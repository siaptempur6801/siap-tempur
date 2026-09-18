import { createV2AdminClient } from '@/lib/utils/supabase/server'
import { chunkValues } from '@/lib/supabase-batch'
import { logger } from '@/lib/logger'
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

export class ProgressRepository {
    async getCompletedAttempt(userId: string, attemptId: string): Promise<CompletedAttemptSummary | null> {
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

    async listCompletedAttemptsInWindow(userId: string, startIso: string, endIso: string): Promise<CompletedAttemptSummary[]> {
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
     * Ambang batas keras untuk agregat progres per user.
     *
     * Progres subjek dihitung sebagai agregat penuh dari SELURUH attempt yang
     * pernah diselesaikan (`subject_progress_service.sync` memakai upsert penuh,
     * bukan inkremental). Membatasi jumlah baris secara diam-diam akan
     * menghasilkan angka yang salah tanpa ada yang menyadarinya — jadi bila
     * ambang ini terlampaui kita gagal keras, bukan menampilkan data keliru.
     *
     * 20.000 attempt per user jauh di atas pemakaian wajar sebuah platform
     * tryout; bila ini pernah tersentuh, itu sinyal bahwa agregatnya memang
     * harus dipindahkan ke SQL (lihat rekomendasi audit).
     */
    static readonly MAX_ATTEMPTS_PER_AGGREGATE = 20_000

    async listAllCompletedAttemptIds(userId: string): Promise<string[]> {
        const admin = await createV2AdminClient()
        const { data, error } = await admin
            .from('exam_attempts')
            .select('id')
            .eq('user_id', userId)
            .in('status', ['completed', 'COMPLETED'])
            .order('id', { ascending: true })
            .limit(ProgressRepository.MAX_ATTEMPTS_PER_AGGREGATE)
        if (error) throw error
        const rows = data ?? []
        if (rows.length >= ProgressRepository.MAX_ATTEMPTS_PER_AGGREGATE) {
            const error = new Error('PROGRESS_AGGREGATE_LIMIT_EXCEEDED')
            logger.error(
                '[progress] Batas attempt per agregat terlampaui — agregat progres tidak dihitung',
                error,
                { userId, limit: ProgressRepository.MAX_ATTEMPTS_PER_AGGREGATE },
            )
            throw error
        }
        return rows.map((row) => row.id as string)
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
    async listScores(attemptIds: string[]): Promise<AttemptScoreSummary[]> {
        if (attemptIds.length === 0) return []
        const admin = await createV2AdminClient()

        const chunks = chunkValues(attemptIds)
        const pages = await Promise.all(chunks.map(async (chunk) => {
            const { data, error } = await admin
                .from('attempt_scores')
                .select('attempt_id, subject_id, percentage, correct_count, wrong_count, unanswered_count')
                .in('attempt_id', chunk)
            if (error) throw error
            return (data ?? []) as AttemptScoreSummary[]
        }))

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
            .select('user_id, activity_date, questions_answered, practice_seconds, drill_attempts, exam_attempts, correct_answers')
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
        const { error } = await admin
            .from('user_streaks')
            .upsert({
                user_id: input.userId,
                current_streak: input.currentStreak,
                longest_streak: input.longestStreak,
                last_active_date: input.lastActiveDate,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' })
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
