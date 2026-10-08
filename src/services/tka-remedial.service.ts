import { createClient } from '@/lib/utils/supabase/server'
import { parseQuestionSnapshotOption, parseQuestionSnapshotStimulus } from '@/src/domain/question-snapshot'

type RecordValue = Record<string, unknown>

export type TkaRemedialOption = {
    id: string
    key: string
    content: string
    imageUrl: string | null
    responseGroup: string | null
    responseGroupOrder: number | null
}

export type TkaRemedialItem = {
    id: string
    position: number
    status: 'pending' | 'completed'
    reviewCount: number
    bestScore: number
    reason: string
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
    options: TkaRemedialOption[]
}

export type TkaRemedialSession = {
    id: string
    sourceAttemptId: string
    status: 'active' | 'completed'
    totalItems: number
    completedItems: number
    pendingItems: number
    createdAt: string | null
    completedAt: string | null
}

export type TkaRemedialView = {
    session: TkaRemedialSession | null
    items: TkaRemedialItem[]
}

export type TkaRemedialReviewResult = {
    isCorrect: boolean
    scoreAwarded: number
    explanation: string
    totalItems: number
    completedItems: number
    pendingItems: number
    sessionStatus: 'active' | 'completed'
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

function parseSession(value: unknown): TkaRemedialSession | null {
    const session = asRecord(value)
    const id = readString(session, 'id')
    const sourceAttemptId = readString(session, 'source_attempt_id')
    const status = readString(session, 'status')
    if (!id || !sourceAttemptId || !['active', 'completed'].includes(status ?? '')) return null
    return {
        id,
        sourceAttemptId,
        status: status as TkaRemedialSession['status'],
        totalItems: readNumber(session, 'total_items') ?? 0,
        completedItems: readNumber(session, 'completed_items') ?? 0,
        pendingItems: readNumber(session, 'pending_items') ?? 0,
        createdAt: readString(session, 'created_at'),
        completedAt: readString(session, 'completed_at'),
    }
}

function parseItem(value: unknown, subjectCodeById: Map<string, string>): TkaRemedialItem | null {
    const row = asRecord(value)
    const snapshot = asRecord(row?.question_snapshot)
    const question = asRecord(snapshot?.question)
    const id = readString(row, 'id')
    const questionId = readString(row, 'question_id')
    const wrongQuestionId = readString(row, 'wrong_question_id')
    const subjectId = readString(row, 'subject_id')
    const stem = readString(question, 'stem')
    const status = readString(row, 'status')
    if (!id || !questionId || !wrongQuestionId || !subjectId || stem === null) return null
    if (!['pending', 'completed'].includes(status ?? '')) return null

    return {
        id,
        position: readNumber(row, 'position') ?? 0,
        status: status as TkaRemedialItem['status'],
        reviewCount: readNumber(row, 'review_count') ?? 0,
        bestScore: readNumber(row, 'best_score') ?? 0,
        reason: readString(row, 'reason') ?? '',
        wrongQuestionId,
        questionId,
        subjectCode: subjectCodeById.get(subjectId) ?? '',
        questionCode: readString(question, 'question_code') ?? '',
        stem,
        responseType: readString(question, 'question_type') ?? 'single_choice',
        cognitiveLevel: readString(question, 'cognitive_level'),
        stimulus: parseQuestionSnapshotStimulus(snapshot),
        options: asArray(snapshot?.options).flatMap((option) => {
            const parsed = parseQuestionSnapshotOption(option)
            return parsed ? [parsed] : []
        }),
    }
}

async function parsePayload(data: unknown): Promise<TkaRemedialView> {
    const payload = asRecord(data)
    const session = parseSession(payload?.session)
    const rawItems = asArray(payload?.items)
    if (!session) return { session: null, items: [] }

    const subjectIds = Array.from(new Set(rawItems.flatMap((value) => {
        const row = asRecord(value)
        const subjectId = readString(row, 'subject_id')
        return subjectId ? [subjectId] : []
    })))

    const subjectCodeById = new Map<string, string>()
    if (subjectIds.length > 0) {
        const supabase = await createClient()
        const { data: subjects, error } = await supabase.from('subjects').select('id, code').in('id', subjectIds)
        if (error) throw error
        for (const subject of subjects ?? []) subjectCodeById.set(String(subject.id), String(subject.code ?? ''))
    }

    const items = rawItems.flatMap((value) => {
        const item = parseItem(value, subjectCodeById)
        return item ? [item] : []
    }).sort((left, right) => left.position - right.position)

    return { session, items }
}

export class TkaRemedialService {
    async findBySourceAttempt(sourceAttemptId: string): Promise<TkaRemedialView> {
        const supabase = await createClient()
        const { data, error } = await supabase.rpc('get_tka_smp_remedial_for_attempt', {
            p_source_attempt_id: sourceAttemptId,
        })
        if (error) throw error
        return parsePayload(data)
    }

    async getSession(sessionId: string): Promise<TkaRemedialView> {
        const supabase = await createClient()
        const { data, error } = await supabase.rpc('get_tka_smp_remedial_session', {
            p_session_id: sessionId,
        })
        if (error) throw error
        return parsePayload(data)
    }

    async review(sessionId: string, itemId: string, optionIds: string[]): Promise<TkaRemedialReviewResult> {
        const supabase = await createClient()
        const { data, error } = await supabase.rpc('review_tka_smp_remedial_item', {
            p_session_id: sessionId,
            p_item_id: itemId,
            p_option_ids: optionIds,
        })
        if (error) throw error
        const payload = asRecord(data)
        if (!payload) throw new Error('Invalid remedial review payload')
        const sessionStatus = readString(payload, 'session_status')
        return {
            isCorrect: payload.is_correct === true,
            scoreAwarded: readNumber(payload, 'score_awarded') ?? 0,
            explanation: readString(payload, 'explanation') ?? '',
            totalItems: readNumber(payload, 'total_items') ?? 0,
            completedItems: readNumber(payload, 'completed_items') ?? 0,
            pendingItems: readNumber(payload, 'pending_items') ?? 0,
            sessionStatus: sessionStatus === 'completed' ? 'completed' : 'active',
        }
    }
}

export const tkaRemedialService = new TkaRemedialService()
