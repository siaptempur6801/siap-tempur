import { createClient } from '@/lib/utils/supabase/server'

type RecordValue = Record<string, unknown>

export type TkaLearningFocusAction = {
    type: 'continue_remedial' | 'repeat_wrong' | 'practice_tka'
    label: string
    href: string
}

export type TkaLearningFocusItem = {
    id: string
    priority: number
    score: number
    reasonCode: string
    knowledgeNodeId: string
    topicCode: string | null
    topicName: string
    parentTopicName: string | null
    subjectCode: string
    subjectName: string
    masteryScore: number
    masteryLevel: string
    attemptedQuestions: number
    correctQuestions: number
    accuracy: number
    openGapCount: number
    nextAction: TkaLearningFocusAction
}

export type TkaLearningFocusView = {
    items: TkaLearningFocusItem[]
    rule: string
}

function asRecord(value: unknown): RecordValue | null {
    if (!value || Array.isArray(value) || typeof value !== 'object') return null
    return value as RecordValue
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

function parseAction(value: unknown): TkaLearningFocusAction | null {
    const action = asRecord(value)
    const type = readString(action, 'type')
    const label = readString(action, 'label')
    const href = readString(action, 'href')
    if (!type || !label || !href) return null
    if (!['continue_remedial', 'repeat_wrong', 'practice_tka'].includes(type)) return null
    if (!href.startsWith('/tka/smp')) return null
    return { type: type as TkaLearningFocusAction['type'], label, href }
}

function parseItem(value: unknown): TkaLearningFocusItem | null {
    const row = asRecord(value)
    const id = readString(row, 'id')
    const knowledgeNodeId = readString(row, 'knowledge_node_id')
    const topicName = readString(row, 'topic_name')
    const subjectCode = readString(row, 'subject_code')
    const subjectName = readString(row, 'subject_name')
    const nextAction = parseAction(row?.next_action)
    if (!id || !knowledgeNodeId || !topicName || !subjectCode || !subjectName || !nextAction) return null

    return {
        id,
        priority: readNumber(row, 'priority') ?? 0,
        score: readNumber(row, 'score') ?? 0,
        reasonCode: readString(row, 'reason_code') ?? '',
        knowledgeNodeId,
        topicCode: readString(row, 'topic_code'),
        topicName,
        parentTopicName: readString(row, 'parent_topic_name'),
        subjectCode,
        subjectName,
        masteryScore: readNumber(row, 'mastery_score') ?? 0,
        masteryLevel: readString(row, 'mastery_level') ?? 'needs_work',
        attemptedQuestions: readNumber(row, 'attempted_questions') ?? 0,
        correctQuestions: readNumber(row, 'correct_questions') ?? 0,
        accuracy: readNumber(row, 'accuracy') ?? 0,
        openGapCount: readNumber(row, 'open_gap_count') ?? 0,
        nextAction,
    }
}

export class TkaLearningFocusService {
    async getFocus(): Promise<TkaLearningFocusView> {
        const supabase = await createClient()
        const { data, error } = await supabase.rpc('get_tka_smp_learning_focus')
        if (error) throw error

        const payload = asRecord(data)
        const rawItems = Array.isArray(payload?.items) ? payload.items : []
        const items = rawItems
            .flatMap((value) => {
                const item = parseItem(value)
                return item ? [item] : []
            })
            .sort((left, right) => left.priority - right.priority)
            .slice(0, 3)

        return {
            items,
            rule: readString(payload, 'rule') ?? 'mastery_asc_evidence_desc_accuracy_asc_v1',
        }
    }
}

export const tkaLearningFocusService = new TkaLearningFocusService()
