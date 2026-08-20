import { createV2AdminClient } from '@/lib/utils/supabase/server'
import { attemptRepository } from '@/src/repositories/attempt.repository'
import type { Answer, Option, Question } from '@/components/practice/review/types'
import type { Json } from '@/types/database.types'

type JsonObject = { [key: string]: Json | undefined }

type OptionRow = {
    id: string
    question_id: string
    content: string
    is_correct: boolean | null
    score: number | null
    sort_order: number
}

type ExplanationRow = {
    question_id: string
    content: string
    version: number
}

type ScoreRow = {
    subject_id: string | null
    raw_score: number
    percentage: number | null
    passing_score: number | null
    passed: boolean | null
    correct_count: number
    wrong_count: number
    unanswered_count: number
}

export type SubjectResultView = {
    subjectId: string
    code: string
    score: number
    maxScore: number
    percentage: number | null
    passingScore: number | null
    passed: boolean | null
    correctCount: number
    wrongCount: number
    unansweredCount: number
    totalQuestions: number
}

export type PracticeResultView = {
    attemptId: string
    status: string
    totalScore: number
    percentage: number | null
    passed: boolean | null
    startedAt: string | null
    submittedAt: string | null
    practiceKind: string | null
    knowledgeNode: string | null
    subjectResults: SubjectResultView[]
    answers: Answer[]
}

function asObject(value: Json): JsonObject | null {
    if (!value || Array.isArray(value) || typeof value !== 'object') return null
    return value as JsonObject
}

function readString(object: JsonObject | null, key: string) {
    const value = object?.[key]
    return typeof value === 'string' ? value : null
}

export class PracticeResultService {
    async getResult(userId: string, attemptId: string): Promise<PracticeResultView | null> {
        const bundle = await attemptRepository.getAttemptBundle(userId, attemptId)
        if (!bundle) return null

        const admin = await createV2AdminClient()
        const questionIds = bundle.questions.map((question) => question.question_id)
        const subjectIds = Array.from(new Set(bundle.questions.flatMap((question) => {
            const subjectId = readString(asObject(question.question_snapshot), 'subjectId')
            return subjectId ? [subjectId] : []
        })))

        const [optionResponse, explanationResponse, scoreResponse, subjectResponse] = await Promise.all([
            questionIds.length > 0
                ? admin
                    .from('question_options')
                    .select('id, question_id, content, is_correct, score, sort_order')
                    .in('question_id', questionIds)
                    .order('sort_order', { ascending: true })
                : Promise.resolve({ data: [], error: null }),
            questionIds.length > 0
                ? admin
                    .from('question_explanations')
                    .select('question_id, content, version')
                    .in('question_id', questionIds)
                    .order('version', { ascending: false })
                : Promise.resolve({ data: [], error: null }),
            admin
                .from('attempt_scores')
                .select('subject_id, raw_score, percentage, passing_score, passed, correct_count, wrong_count, unanswered_count')
                .eq('attempt_id', attemptId),
            subjectIds.length > 0
                ? admin.from('subjects').select('id, code').in('id', subjectIds)
                : Promise.resolve({ data: [], error: null }),
        ])

        if (optionResponse.error) throw optionResponse.error
        if (explanationResponse.error) throw explanationResponse.error
        if (scoreResponse.error) throw scoreResponse.error
        if (subjectResponse.error) throw subjectResponse.error

        const options = (optionResponse.data ?? []) as OptionRow[]
        const explanations = (explanationResponse.data ?? []) as ExplanationRow[]
        const scores = (scoreResponse.data ?? []) as ScoreRow[]
        const subjectCodes = new Map(
            ((subjectResponse.data ?? []) as Array<{ id: string; code: string }>).map((row) => [row.id, row.code]),
        )

        const optionsByQuestion = new Map<string, OptionRow[]>()
        for (const option of options) {
            const rows = optionsByQuestion.get(option.question_id) ?? []
            rows.push(option)
            optionsByQuestion.set(option.question_id, rows)
        }

        const explanationByQuestion = new Map<string, string>()
        for (const explanation of explanations) {
            if (!explanationByQuestion.has(explanation.question_id)) {
                explanationByQuestion.set(explanation.question_id, explanation.content)
            }
        }

        const answerByAttemptQuestion = new Map(bundle.answers.map((answer) => [answer.attempt_question_id, answer]))
        const maxScoreBySubject = new Map<string, number>()
        const questionCountBySubject = new Map<string, number>()
        const metadata = asObject(bundle.attempt.metadata)
        const knowledgeNode = readString(metadata, 'knowledgeNode')

        const reviewAnswers: Answer[] = bundle.questions.map((attemptQuestion) => {
            const snapshot = asObject(attemptQuestion.question_snapshot)
            const subjectId = readString(snapshot, 'subjectId') ?? ''
            const subjectCode = subjectCodes.get(subjectId) ?? readString(metadata, 'subjectCode') ?? 'CPNS'
            const rawOptions = optionsByQuestion.get(attemptQuestion.question_id) ?? []

            if (subjectId) {
                maxScoreBySubject.set(subjectId, (maxScoreBySubject.get(subjectId) ?? 0) + attemptQuestion.max_score)
                questionCountBySubject.set(subjectId, (questionCountBySubject.get(subjectId) ?? 0) + 1)
            }

            const mappedOptions: Option[] = rawOptions.map((option) => ({
                id: option.id,
                content: option.content,
                image_url: null,
                is_correct: option.is_correct === true,
                score_value: option.score ?? (option.is_correct === true ? attemptQuestion.max_score : 0),
            }))

            const question: Question = {
                id: attemptQuestion.question_id,
                content: readString(snapshot, 'stem') ?? '',
                image_url: null,
                explanation: explanationByQuestion.get(attemptQuestion.question_id) ?? '',
                type: subjectCode,
                category: knowledgeNode ?? '',
                options: mappedOptions,
            }

            const answer = answerByAttemptQuestion.get(attemptQuestion.id)
            const selectedOption = answer?.selected_option_id
                ? mappedOptions.find((option) => option.id === answer.selected_option_id) ?? null
                : null

            return {
                id: answer?.id ?? `unanswered-${attemptQuestion.id}`,
                question_id: attemptQuestion.question_id,
                option_id: answer?.selected_option_id ?? '',
                questions: question,
                selected_option: selectedOption,
            }
        })

        const subjectResults: SubjectResultView[] = scores.flatMap((score) => {
            if (!score.subject_id) return []
            const code = subjectCodes.get(score.subject_id) ?? 'CPNS'
            return [{
                subjectId: score.subject_id,
                code,
                score: score.raw_score,
                maxScore: maxScoreBySubject.get(score.subject_id) ?? 0,
                percentage: score.percentage,
                passingScore: score.passing_score,
                passed: score.passed,
                correctCount: score.correct_count,
                wrongCount: score.wrong_count,
                unansweredCount: score.unanswered_count,
                totalQuestions: questionCountBySubject.get(score.subject_id) ?? 0,
            }]
        })

        return {
            attemptId,
            status: bundle.attempt.status,
            totalScore: bundle.attempt.total_score ?? 0,
            percentage: bundle.attempt.percentage,
            passed: bundle.attempt.passed,
            startedAt: bundle.attempt.started_at,
            submittedAt: bundle.attempt.submitted_at,
            practiceKind: readString(metadata, 'practiceKind'),
            knowledgeNode,
            subjectResults,
            answers: reviewAnswers,
        }
    }
}

export const practiceResultService = new PracticeResultService()
