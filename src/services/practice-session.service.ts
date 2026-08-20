import { createV2AdminClient } from '@/lib/utils/supabase/server'
import { attemptRepository } from '@/src/repositories/attempt.repository'
import type { Json } from '@/types/database.types'

type JsonObject = { [key: string]: Json | undefined }

type SafeOption = {
    id: string
    content: string
    image_url?: string | null
}

export type PracticeQuestionView = {
    id: string
    content: string
    type: string
    category: string
    sub_category: string
    image_url?: string | null
    options: SafeOption[]
    sort_order: number
}

export type PracticeSessionView = {
    attemptId: string
    status: string
    questions: PracticeQuestionView[]
    initialAnswers: Record<string, string>
    initialCurrentIndex: number
    initialMarked: Record<string, boolean>
    endTime?: string
    isTryout: boolean
    returnTo: 'tryout' | 'mini-tryout' | 'drilling-materi' | 'event'
}

function asObject(value: Json): JsonObject | null {
    if (!value || Array.isArray(value) || typeof value !== 'object') return null
    return value as JsonObject
}

function readString(object: JsonObject | null, key: string) {
    const value = object?.[key]
    return typeof value === 'string' ? value : null
}

function readNumber(object: JsonObject | null, key: string) {
    const value = object?.[key]
    return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function readOptions(object: JsonObject | null): SafeOption[] {
    const raw = object?.options
    if (!Array.isArray(raw)) return []

    return raw.flatMap((value) => {
        const option = asObject(value)
        const id = readString(option, 'id')
        const content = readString(option, 'content')
        if (!id || content === null) return []
        return [{ id, content, image_url: null }]
    })
}

function resolveReturnTo(kind: string | null): PracticeSessionView['returnTo'] {
    if (kind === 'drill') return 'drilling-materi'
    if (kind === 'mini_tryout') return 'mini-tryout'
    if (kind === 'event') return 'event'
    return 'tryout'
}

export class PracticeSessionService {
    async getSessionView(userId: string, attemptId: string): Promise<PracticeSessionView | null> {
        const bundle = await attemptRepository.getAttemptBundle(userId, attemptId)
        if (!bundle) return null

        const metadata = asObject(bundle.attempt.metadata)
        const practiceKind = readString(metadata, 'practiceKind')
        const knowledgeNode = readString(metadata, 'knowledgeNode') ?? ''
        const metadataSubjectCode = readString(metadata, 'subjectCode')
        const durationSeconds = readNumber(metadata, 'durationSeconds')

        const subjectIds = Array.from(new Set(bundle.questions.flatMap((question) => {
            const snapshot = asObject(question.question_snapshot)
            const subjectId = readString(snapshot, 'subjectId')
            return subjectId ? [subjectId] : []
        })))

        const subjectCodes = new Map<string, string>()
        if (subjectIds.length > 0) {
            const admin = await createV2AdminClient()
            const { data, error } = await admin
                .from('subjects')
                .select('id, code')
                .in('id', subjectIds)
            if (error) throw error
            for (const row of (data ?? []) as Array<{ id: string; code: string }>) {
                subjectCodes.set(row.id, row.code)
            }
        }

        const questions: PracticeQuestionView[] = bundle.questions.map((question) => {
            const snapshot = asObject(question.question_snapshot)
            const subjectId = readString(snapshot, 'subjectId')
            const type = (subjectId ? subjectCodes.get(subjectId) : null)
                ?? metadataSubjectCode
                ?? 'CPNS'

            return {
                id: question.question_id,
                content: readString(snapshot, 'stem') ?? '',
                type,
                category: knowledgeNode,
                sub_category: knowledgeNode,
                image_url: null,
                options: readOptions(snapshot),
                sort_order: question.position,
            }
        })

        const questionByAttemptQuestionId = new Map(bundle.questions.map((question) => [question.id, question]))
        const initialAnswers: Record<string, string> = {}
        const initialMarked: Record<string, boolean> = {}

        for (const answer of bundle.answers) {
            const question = questionByAttemptQuestionId.get(answer.attempt_question_id)
            if (!question) continue
            if (answer.selected_option_id) initialAnswers[question.question_id] = answer.selected_option_id
            if (answer.is_flagged) initialMarked[question.question_id] = true
        }

        const maxIndex = Math.max(questions.length - 1, 0)
        const storedPosition = bundle.attempt.last_question_position
        const initialCurrentIndex = storedPosition === null
            ? 0
            : Math.max(0, Math.min(storedPosition - 1, maxIndex))

        const isTryout = practiceKind === 'full_tryout' || practiceKind === 'event'
        let endTime: string | undefined
        if (isTryout && durationSeconds && bundle.attempt.started_at) {
            endTime = new Date(Date.parse(bundle.attempt.started_at) + durationSeconds * 1000).toISOString()
        }

        return {
            attemptId,
            status: bundle.attempt.status,
            questions,
            initialAnswers,
            initialCurrentIndex,
            initialMarked,
            endTime,
            isTryout,
            returnTo: resolveReturnTo(practiceKind),
        }
    }
}

export const practiceSessionService = new PracticeSessionService()
