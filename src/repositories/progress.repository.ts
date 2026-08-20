import { createV2AdminClient } from '@/lib/utils/supabase/server'
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

    async listAllCompletedAttemptIds(userId: string): Promise<string[]> {
        const admin = await createV2AdminClient()
        const { data, error } = await admin
            .from('exam_attempts')
            .select('id')
            .eq('user_id', userId)
            .in('status', ['completed', 'COMPLETED'])
        if (error) throw error
        return (data ?? []).map((row) => row.id as string)
    }

    async listScores(attemptIds: string[]): Promise<AttemptScoreSummary[]> {
        if (attemptIds.length === 0) return []
        const admin = await createV2AdminClient()
        const { data, error } = await admin
            .from('attempt_scores')
            .select('attempt_id, subject_id, percentage, correct_count, wrong_count, unanswered_count')
            .in('attempt_id', attemptIds)
        if (error) throw error
        return (data ?? []) as AttemptScoreSummary[]
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
