import { createClient } from '@/lib/utils/supabase/server'

type RecordValue = Record<string, unknown>

export type TkaWrongQuestionOption = {
    id: string
    key: string
    content: string
    imageUrl: string | null
    responseGroup: string | null
    responseGroupOrder: number | null
}

export type TkaWrongQuestionItem = {
    wrongQuestionId: string
    questionId: string
    subjectCode: string
    questionCode: string
    stem: string
    responseType: string
    cognitiveLevel: string | null
    stimulus: {
        title: string | null
        content: string
        imageUrl: string | null
    } | null
    options: TkaWrongQuestionOption[]
    explanation: string
    failureCount: number
    wrongCount: number
    unansweredCount: number
    latestOutcome: 'wrong' | 'unanswered' | 'correct'
    lastFailedAt: string
}

export type TkaWrongQuestionReviewResult = {
    isCorrect: boolean
    scoreAwarded: number
    remainingOpen: number
}

function asRecord(value: unknown): RecordValue | null {
    if (!value || Array.isArray(value) || typeof value !== 'object') return null
    return value as RecordValue
}

function asArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : []
}

function readString(record: RecordValue | null, key: string) {
    const value = record?.[key]
    return typeof value === 'string' ? value : null
}

function readNumber(record: RecordValue | null, key: string) {
    const value = record?.[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value)
        return Number.isFinite(parsed) ? parsed : null
    }
    return null
}

function parseOption(value: unknown): TkaWrongQuestionOption | null {
    const option = asRecord(value)
    const id = readString(option, 'id')
    const content = readString(option, 'content')
    if (!id || content === null) return null
    return {
        id,
        key: readString(option, 'option_key') ?? '',
        content,
        imageUrl: readString(option, 'image_url'),
        responseGroup: readString(option, 'response_group'),
        responseGroupOrder: readNumber(option, 'response_group_order'),
    }
}

function parseExplanation(snapshot: RecordValue | null) {
    for (const value of asArray(snapshot?.explanations)) {
        const explanation = asRecord(value)
        const content = readString(explanation, 'content')
        if (content) return content
    }
    return ''
}

function parseStimulus(snapshot: RecordValue | null) {
    const stimulus = asRecord(snapshot?.stimulus)
    const content = readString(stimulus, 'content')
    if (!stimulus || content === null) return null
    return {
        title: readString(stimulus, 'title'),
        content,
        imageUrl: readString(stimulus, 'image_url'),
    }
}

function parseItem(row: RecordValue, subjectCodeById: Map<string, string>): TkaWrongQuestionItem | null {
    const snapshot = asRecord(row.question_snapshot)
    const question = asRecord(snapshot?.question)
    const wrongQuestionId = readString(row, 'id')
    const questionId = readString(row, 'question_id')
    const subjectId = readString(row, 'subject_id')
    const stem = readString(question, 'stem')
    const latestOutcome = readString(row, 'latest_outcome')
    const lastFailedAt = readString(row, 'last_failed_at')
    if (!wrongQuestionId || !questionId || !subjectId || stem === null || !lastFailedAt) return null
    if (!['wrong', 'unanswered', 'correct'].includes(latestOutcome ?? '')) return null

    return {
        wrongQuestionId,
        questionId,
        subjectCode: subjectCodeById.get(subjectId) ?? '',
        questionCode: readString(question, 'question_code') ?? '',
        stem,
        responseType: readString(question, 'question_type') ?? 'single_choice',
        cognitiveLevel: readString(question, 'cognitive_level'),
        stimulus: parseStimulus(snapshot),
        options: asArray(snapshot?.options).flatMap((value) => {
            const parsed = parseOption(value)
            return parsed ? [parsed] : []
        }),
        explanation: parseExplanation(snapshot),
        failureCount: readNumber(row, 'failure_count') ?? 1,
        wrongCount: readNumber(row, 'wrong_count') ?? 0,
        unansweredCount: readNumber(row, 'unanswered_count') ?? 0,
        latestOutcome: latestOutcome as TkaWrongQuestionItem['latestOutcome'],
        lastFailedAt,
    }
}

export class TkaWrongQuestionService {
    async listOpen(userId: string, limit = 100): Promise<TkaWrongQuestionItem[]> {
        const supabase = await createClient()
        const { data: rows, error } = await supabase
            .from('user_wrong_questions')
            .select('id, question_id, subject_id, question_snapshot, failure_count, wrong_count, unanswered_count, latest_outcome, last_failed_at')
            .eq('user_id', userId)
            .eq('status', 'open')
            .order('last_failed_at', { ascending: false })
            .limit(Math.max(1, Math.min(limit, 200)))
        if (error) throw error

        const subjectIds = Array.from(new Set((rows ?? []).map((row) => String(row.subject_id))))
        const subjectCodeById = new Map<string, string>()
        if (subjectIds.length > 0) {
            const { data: subjects, error: subjectError } = await supabase
                .from('subjects')
                .select('id, code')
                .in('id', subjectIds)
            if (subjectError) throw subjectError
            for (const subject of subjects ?? []) subjectCodeById.set(String(subject.id), String(subject.code ?? ''))
        }

        const parsed = (rows ?? []).flatMap((row) => {
            const item = parseItem(row as RecordValue, subjectCodeById)
            return item ? [item] : []
        })

        // Put single-choice items first so repeat mode starts with the lowest-friction
        // question type while still preserving recency inside each type.
        return parsed.sort((left, right) => {
            const leftRank = left.responseType === 'single_choice' ? 0 : 1
            const rightRank = right.responseType === 'single_choice' ? 0 : 1
            if (leftRank !== rightRank) return leftRank - rightRank
            return Date.parse(right.lastFailedAt) - Date.parse(left.lastFailedAt)
        })
    }

    async review(wrongQuestionId: string, optionIds: string[]): Promise<TkaWrongQuestionReviewResult> {
        const supabase = await createClient()
        const { data, error } = await supabase.rpc('review_wrong_question', {
            p_wrong_question_id: wrongQuestionId,
            p_option_ids: optionIds,
        })
        if (error) throw error
        const payload = asRecord(data)
        if (!payload) throw new Error('Invalid wrong-question review payload')
        return {
            isCorrect: payload.is_correct === true,
            scoreAwarded: readNumber(payload, 'score_awarded') ?? 0,
            remainingOpen: readNumber(payload, 'remaining_open') ?? 0,
        }
    }
}

export const tkaWrongQuestionService = new TkaWrongQuestionService()
