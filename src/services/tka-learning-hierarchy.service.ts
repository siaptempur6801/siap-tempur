import { createClient } from '@/lib/utils/supabase/server'

type RecordValue = Record<string, unknown>

export type TkaHierarchyDrill = {
    available: true
    exact: boolean
    distance: number
    knowledgeNodeId: string
    knowledgeNodeCode: string | null
    knowledgeNodeName: string
    examSlug: string
    questionCount: number
    durationSeconds: number
}

export type TkaHierarchyPathItem = {
    id: string
    code: string | null
    name: string
    nodeType: string
    depth: number
}

export type TkaHierarchyItem = {
    knowledgeNodeId: string
    knowledgeNodeCode: string | null
    name: string
    nodeType: string
    depth: number
    parentId: string | null
    sortOrder: number
    subjectId: string
    subjectCode: string
    subjectName: string
    subjectSortOrder: number
    publishedQuestionCount: number
    attemptedQuestions: number
    correctQuestions: number
    accuracy: number
    masteryScore: number
    masteryLevel: string
    path: TkaHierarchyPathItem[]
    drill: TkaHierarchyDrill | null
}

export type TkaLearningHierarchyView = {
    version: string
    items: TkaHierarchyItem[]
}

function asRecord(value: unknown): RecordValue | null {
    if (!value || Array.isArray(value) || typeof value !== 'object') return null
    return value as RecordValue
}

function readString(record: RecordValue | null, key: string) {
    const value = record?.[key]
    return typeof value === 'string' && value.trim() !== '' ? value : null
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

function parsePath(value: unknown): TkaHierarchyPathItem[] {
    if (!Array.isArray(value)) return []
    return value.flatMap((entry) => {
        const row = asRecord(entry)
        const id = readString(row, 'id')
        const name = readString(row, 'name')
        if (!id || !name) return []
        return [{
            id,
            code: readString(row, 'code'),
            name,
            nodeType: readString(row, 'node_type') ?? 'topic',
            depth: readNumber(row, 'depth') ?? 0,
        }]
    })
}

function parseDrill(value: unknown): TkaHierarchyDrill | null {
    const row = asRecord(value)
    if (!row || row.available !== true) return null
    const knowledgeNodeId = readString(row, 'knowledge_node_id')
    const knowledgeNodeName = readString(row, 'knowledge_node_name')
    const examSlug = readString(row, 'exam_slug')
    if (!knowledgeNodeId || !knowledgeNodeName || !examSlug) return null
    if (!/^tka-smp-drill-[a-z0-9-]+$/.test(examSlug)) return null

    return {
        available: true,
        exact: row.exact === true,
        distance: Math.max(0, readNumber(row, 'distance') ?? 0),
        knowledgeNodeId,
        knowledgeNodeCode: readString(row, 'knowledge_node_code'),
        knowledgeNodeName,
        examSlug,
        questionCount: Math.max(0, readNumber(row, 'question_count') ?? 0),
        durationSeconds: Math.max(0, readNumber(row, 'duration_seconds') ?? 0),
    }
}

function parseItem(value: unknown): TkaHierarchyItem | null {
    const row = asRecord(value)
    const knowledgeNodeId = readString(row, 'knowledge_node_id')
    const name = readString(row, 'name')
    const subjectId = readString(row, 'subject_id')
    const subjectCode = readString(row, 'subject_code')
    const subjectName = readString(row, 'subject_name')
    if (!knowledgeNodeId || !name || !subjectId || !subjectCode || !subjectName) return null

    return {
        knowledgeNodeId,
        knowledgeNodeCode: readString(row, 'knowledge_node_code'),
        name,
        nodeType: readString(row, 'node_type') ?? 'topic',
        depth: Math.max(0, readNumber(row, 'depth') ?? 0),
        parentId: readString(row, 'parent_id'),
        sortOrder: readNumber(row, 'sort_order') ?? 0,
        subjectId,
        subjectCode: subjectCode.toUpperCase(),
        subjectName,
        subjectSortOrder: readNumber(row, 'subject_sort_order') ?? 0,
        publishedQuestionCount: Math.max(0, readNumber(row, 'published_question_count') ?? 0),
        attemptedQuestions: Math.max(0, readNumber(row, 'attempted_questions') ?? 0),
        correctQuestions: Math.max(0, readNumber(row, 'correct_questions') ?? 0),
        accuracy: Math.max(0, Math.min(1, readNumber(row, 'accuracy') ?? 0)),
        masteryScore: Math.max(0, Math.min(1, readNumber(row, 'mastery_score') ?? 0)),
        masteryLevel: readString(row, 'mastery_level') ?? 'not_started',
        path: parsePath(row?.path),
        drill: parseDrill(row?.drill),
    }
}

export class TkaLearningHierarchyService {
    async getHierarchy(): Promise<TkaLearningHierarchyView> {
        const supabase = await createClient()
        const { data, error } = await supabase.rpc('get_tka_smp_learning_hierarchy')
        if (error) throw error

        const payload = asRecord(data)
        const rawItems = Array.isArray(payload?.items) ? payload.items : []
        const items = rawItems.flatMap((value) => {
            const item = parseItem(value)
            return item ? [item] : []
        }).sort((left, right) => (
            left.subjectSortOrder - right.subjectSortOrder
            || left.depth - right.depth
            || left.sortOrder - right.sortOrder
            || left.name.localeCompare(right.name, 'id')
        ))

        return {
            version: readString(payload, 'version') ?? 'tka_smp_learning_hierarchy_v1',
            items,
        }
    }
}

export const tkaLearningHierarchyService = new TkaLearningHierarchyService()
