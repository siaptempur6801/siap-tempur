import { createV2AdminClient } from '@/lib/utils/supabase/server'
import type { Json, TablesUpdate } from '@/types/database.types'
import type { AttemptQuestionSeed } from '@/src/repositories/exam.repository'

export type AttemptRow = {
    id: string
    exam_id: string
    user_id: string
    attempt_number: number
    status: string
    started_at: string | null
    submitted_at: string | null
    duration_used_seconds: number | null
    total_score: number | null
    percentage: number | null
    passed: boolean | null
    last_question_position: number | null
    last_saved_at: string | null
    metadata: Json
}

export type AttemptQuestionRow = {
    id: string
    attempt_id: string
    question_id: string
    question_version: number
    position: number
    section_id: string | null
    question_snapshot: Json
    max_score: number
}

export type AttemptAnswerRow = {
    id: string
    attempt_question_id: string
    selected_option_id: string | null
    answer_value: string | null
    is_correct: boolean | null
    score_awarded: number
    answered_at: string | null
    is_flagged: boolean
}

export type ScoringOptionRow = {
    id: string
    question_id: string
    is_correct: boolean | null
    score: number | null
    response_group: string | null
    response_group_order: number | null
}

export type AttemptAnswerOptionRow = {
    attempt_answer_id: string
    option_id: string
}

export type AttemptBundle = {
    attempt: AttemptRow
    questions: AttemptQuestionRow[]
    answers: AttemptAnswerRow[]
}

export class AttemptRepository {
    async findActiveAttempt(
        userId: string,
        examId: string,
        metadataFilter?: Record<string, Json>,
    ): Promise<AttemptRow | null> {
        const admin = await createV2AdminClient()
        let query = admin
            .from('exam_attempts')
            .select('id, exam_id, user_id, attempt_number, status, started_at, submitted_at, duration_used_seconds, total_score, percentage, passed, last_question_position, last_saved_at, metadata')
            .eq('user_id', userId)
            .eq('exam_id', examId)
            .in('status', ['in_progress', 'IN_PROGRESS', 'created', 'CREATED'])
            .order('created_at', { ascending: false })
            .limit(1)

        if (metadataFilter && Object.keys(metadataFilter).length > 0) {
            query = query.contains('metadata', metadataFilter)
        }

        const { data, error } = await query.maybeSingle()
        if (error) throw error
        return data as AttemptRow | null
    }

    async countAttempts(userId: string, examId: string) {
        const admin = await createV2AdminClient()
        const { count, error } = await admin
            .from('exam_attempts')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('exam_id', examId)
        if (error) throw error
        return count ?? 0
    }

    async createAttempt(input: {
        userId: string
        examId: string
        metadata: Json
    }): Promise<AttemptRow> {
        const admin = await createV2AdminClient()
        const { data: last, error: lastError } = await admin
            .from('exam_attempts')
            .select('attempt_number')
            .eq('user_id', input.userId)
            .eq('exam_id', input.examId)
            .order('attempt_number', { ascending: false })
            .limit(1)
            .maybeSingle()
        if (lastError) throw lastError

        const lastAttemptNumber = typeof last?.attempt_number === 'number' ? last.attempt_number : 0
        const attemptNumber = lastAttemptNumber + 1
        const now = new Date().toISOString()
        const { data, error } = await admin
            .from('exam_attempts')
            .insert({
                user_id: input.userId,
                exam_id: input.examId,
                attempt_number: attemptNumber,
                status: 'in_progress',
                started_at: now,
                last_saved_at: now,
                metadata: input.metadata,
            })
            .select('id, exam_id, user_id, attempt_number, status, started_at, submitted_at, duration_used_seconds, total_score, percentage, passed, last_question_position, last_saved_at, metadata')
            .single()
        if (error) throw error
        return data as AttemptRow
    }

    async addAttemptQuestions(attemptId: string, questions: AttemptQuestionSeed[]) {
        const admin = await createV2AdminClient()
        const { error } = await admin
            .from('attempt_questions')
            .insert(questions.map((question) => ({
                attempt_id: attemptId,
                question_id: question.questionId,
                question_version: question.questionVersion,
                position: question.position,
                section_id: question.sectionId,
                question_snapshot: question.snapshot,
                max_score: question.maxScore,
            })))
        if (error) throw error
    }

    async deleteAttempt(attemptId: string) {
        const admin = await createV2AdminClient()
        const { error } = await admin.from('exam_attempts').delete().eq('id', attemptId)
        if (error) throw error
    }

    async getActiveOwnedAttempt(userId: string, attemptId: string): Promise<AttemptRow | null> {
        const admin = await createV2AdminClient()
        const { data, error } = await admin
            .from('exam_attempts')
            .select('id, exam_id, user_id, attempt_number, status, started_at, submitted_at, duration_used_seconds, total_score, percentage, passed, last_question_position, last_saved_at, metadata')
            .eq('id', attemptId)
            .eq('user_id', userId)
            .in('status', ['in_progress', 'IN_PROGRESS', 'created', 'CREATED'])
            .maybeSingle()
        if (error) throw error
        return data as AttemptRow | null
    }

    async getAttemptQuestion(attemptId: string, questionId: string): Promise<AttemptQuestionRow | null> {
        const admin = await createV2AdminClient()
        const { data, error } = await admin
            .from('attempt_questions')
            .select('id, attempt_id, question_id, question_version, position, section_id, question_snapshot, max_score')
            .eq('attempt_id', attemptId)
            .eq('question_id', questionId)
            .maybeSingle()
        if (error) throw error
        return data as AttemptQuestionRow | null
    }

    async getOptionForQuestion(questionId: string, optionId: string): Promise<ScoringOptionRow | null> {
        const admin = await createV2AdminClient()
        const { data, error } = await admin
            .from('question_options')
            .select('id, question_id, is_correct, score, response_group, response_group_order')
            .eq('id', optionId)
            .eq('question_id', questionId)
            .maybeSingle()
        if (error) throw error
        return data as ScoringOptionRow | null
    }

    async getOptionsForQuestion(questionId: string, optionIds: string[]): Promise<ScoringOptionRow[]> {
        if (optionIds.length === 0) return []
        const admin = await createV2AdminClient()
        const { data, error } = await admin
            .from('question_options')
            .select('id, question_id, is_correct, score, response_group, response_group_order')
            .eq('question_id', questionId)
            .in('id', optionIds)
        if (error) throw error
        return (data ?? []) as ScoringOptionRow[]
    }

    async upsertAnswer(input: {
        attemptQuestionId: string
        optionId: string
    }) {
        const admin = await createV2AdminClient()
        const now = new Date().toISOString()
        const { data, error } = await admin
            .from('attempt_answers')
            .upsert({
                attempt_question_id: input.attemptQuestionId,
                selected_option_id: input.optionId,
                answer_value: null,
                answered_at: now,
                updated_at: now,
            }, { onConflict: 'attempt_question_id' })
            .select('id')
            .single()
        if (error) throw error

        const { error: clearError } = await admin
            .from('attempt_answer_options')
            .delete()
            .eq('attempt_answer_id', data.id)
        if (clearError) throw clearError
    }

    async upsertAnswerOptions(input: {
        attemptQuestionId: string
        optionIds: string[]
    }) {
        const admin = await createV2AdminClient()
        const now = new Date().toISOString()
        const normalized = Array.from(new Set(input.optionIds))
        const { data, error } = await admin
            .from('attempt_answers')
            .upsert({
                attempt_question_id: input.attemptQuestionId,
                selected_option_id: null,
                answer_value: null,
                answered_at: normalized.length > 0 ? now : null,
                updated_at: now,
            }, { onConflict: 'attempt_question_id' })
            .select('id')
            .single()
        if (error) throw error

        const { error: clearError } = await admin
            .from('attempt_answer_options')
            .delete()
            .eq('attempt_answer_id', data.id)
        if (clearError) throw clearError

        if (normalized.length > 0) {
            const { error: insertError } = await admin
                .from('attempt_answer_options')
                .insert(normalized.map((optionId) => ({
                    attempt_answer_id: data.id,
                    option_id: optionId,
                })))
            if (insertError) throw insertError
        }
    }

    async touchAttempt(attemptId: string, position?: number) {
        const admin = await createV2AdminClient()
        const payload: TablesUpdate<'exam_attempts'> = {
            last_saved_at: new Date().toISOString(),
        }
        if (position !== undefined) payload.last_question_position = position
        const { error } = await admin.from('exam_attempts').update(payload).eq('id', attemptId)
        if (error) throw error
    }

    async getAttemptBundle(userId: string, attemptId: string): Promise<AttemptBundle | null> {
        const admin = await createV2AdminClient()
        const { data: attempt, error: attemptError } = await admin
            .from('exam_attempts')
            .select('id, exam_id, user_id, attempt_number, status, started_at, submitted_at, duration_used_seconds, total_score, percentage, passed, last_question_position, last_saved_at, metadata')
            .eq('id', attemptId)
            .eq('user_id', userId)
            .maybeSingle()
        if (attemptError) throw attemptError
        if (!attempt) return null

        const { data: questions, error: questionError } = await admin
            .from('attempt_questions')
            .select('id, attempt_id, question_id, question_version, position, section_id, question_snapshot, max_score')
            .eq('attempt_id', attemptId)
            .order('position', { ascending: true })
        if (questionError) throw questionError

        const questionRows = (questions ?? []) as AttemptQuestionRow[]
        const questionIds = questionRows.map((row) => row.id)
        let answerRows: AttemptAnswerRow[] = []

        if (questionIds.length > 0) {
            const { data: answers, error: answerError } = await admin
                .from('attempt_answers')
                .select('id, attempt_question_id, selected_option_id, answer_value, is_correct, score_awarded, answered_at, is_flagged')
                .in('attempt_question_id', questionIds)
            if (answerError) throw answerError
            answerRows = (answers ?? []) as AttemptAnswerRow[]
        }

        return {
            attempt: attempt as AttemptRow,
            questions: questionRows,
            answers: answerRows,
        }
    }

    async getAnswerOptionSelections(answerIds: string[]): Promise<AttemptAnswerOptionRow[]> {
        if (answerIds.length === 0) return []
        const admin = await createV2AdminClient()
        const { data, error } = await admin
            .from('attempt_answer_options')
            .select('attempt_answer_id, option_id')
            .in('attempt_answer_id', answerIds)
        if (error) throw error
        return (data ?? []) as AttemptAnswerOptionRow[]
    }

    async getScoringOptions(optionIds: string[]): Promise<ScoringOptionRow[]> {
        if (optionIds.length === 0) return []
        const admin = await createV2AdminClient()
        const { data, error } = await admin
            .from('question_options')
            .select('id, question_id, is_correct, score, response_group, response_group_order')
            .in('id', optionIds)
        if (error) throw error
        return (data ?? []) as ScoringOptionRow[]
    }

    async getScoringOptionsForQuestions(questionIds: string[]): Promise<ScoringOptionRow[]> {
        if (questionIds.length === 0) return []
        const admin = await createV2AdminClient()
        const { data, error } = await admin
            .from('question_options')
            .select('id, question_id, is_correct, score, response_group, response_group_order')
            .in('question_id', questionIds)
            .order('sort_order', { ascending: true })
        if (error) throw error
        return (data ?? []) as ScoringOptionRow[]
    }

    async updateAnswerScore(answerId: string, input: { isCorrect: boolean | null; score: number }) {
        const admin = await createV2AdminClient()
        const { error } = await admin
            .from('attempt_answers')
            .update({ is_correct: input.isCorrect, score_awarded: input.score, updated_at: new Date().toISOString() })
            .eq('id', answerId)
        if (error) throw error
    }

    async upsertScores(scores: Array<{
        attemptId: string
        subjectId: string
        rawScore: number
        percentage: number | null
        passingScore: number | null
        passed: boolean | null
        correctCount: number
        wrongCount: number
        unansweredCount: number
    }>) {
        if (scores.length === 0) return
        const admin = await createV2AdminClient()
        const { error } = await admin
            .from('attempt_scores')
            .upsert(scores.map((score) => ({
                attempt_id: score.attemptId,
                subject_id: score.subjectId,
                raw_score: score.rawScore,
                normalized_score: score.rawScore,
                percentage: score.percentage,
                passing_score: score.passingScore,
                passed: score.passed,
                correct_count: score.correctCount,
                wrong_count: score.wrongCount,
                unanswered_count: score.unansweredCount,
            })), { onConflict: 'attempt_id,subject_id' })
        if (error) throw error
    }

    async completeAttempt(input: {
        attemptId: string
        totalScore: number
        percentage: number | null
        passed: boolean | null
        durationUsedSeconds: number | null
    }) {
        const admin = await createV2AdminClient()
        const now = new Date().toISOString()
        const { error } = await admin
            .from('exam_attempts')
            .update({
                status: 'completed',
                submitted_at: now,
                last_saved_at: now,
                total_score: input.totalScore,
                percentage: input.percentage,
                passed: input.passed,
                duration_used_seconds: input.durationUsedSeconds,
            })
            .eq('id', input.attemptId)
        if (error) throw error
    }
}

export const attemptRepository = new AttemptRepository()
