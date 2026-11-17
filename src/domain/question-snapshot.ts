export type QuestionSnapshotOption = {
    id: string
    key: string
    content: string
    imageUrl: string | null
    responseGroup: string | null
    responseGroupOrder: number | null
}

export type QuestionSnapshotStimulus = {
    title: string | null
    content: string
    imageUrl: string | null
}

type RecordValue = Record<string, unknown>

function asRecord(value: unknown): RecordValue | null {
    if (!value || Array.isArray(value) || typeof value !== 'object') return null
    return value as RecordValue
}

function readString(record: RecordValue | null, key: string): string | null {
    const value = record?.[key]
    return typeof value === 'string' ? value : null
}

function readNumber(record: RecordValue | null, key: string): number | null {
    const value = record?.[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value)
        return Number.isFinite(parsed) ? parsed : null
    }
    return null
}

export function parseQuestionSnapshotOption(value: unknown): QuestionSnapshotOption | null {
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

export function parseQuestionSnapshotStimulus(snapshotValue: unknown): QuestionSnapshotStimulus | null {
    const snapshot = asRecord(snapshotValue)
    const stimulus = asRecord(snapshot?.stimulus)
    const content = readString(stimulus, 'content')
    if (!stimulus || content === null) return null
    return {
        title: readString(stimulus, 'title'),
        content,
        imageUrl: readString(stimulus, 'image_url'),
    }
}
