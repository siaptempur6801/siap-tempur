import { createClient, createV2Client } from '@/lib/utils/supabase/server'
import { configuredExamRepository } from '@/src/repositories/configured-exam.repository'
import type {
    PracticeResultView,
    SubjectResultView,
    UniversalReviewItem,
} from '@/src/services/practice-result.service'

type RecordValue = Record<string, unknown>

type StartRpcPayload = {
    attempt_id?: string
    attempt_number?: number
    status?: string
    active_section_id?: string | null
}

export type TkaFullExamOptionView = {
    id: string
    key: string
    content: string
    imageUrl: string | null
    responseGroup: string | null
    responseGroupOrder: number | null
}

export type TkaFullExamStimulusView = {
    title: string | null
    content: string
    imageUrl: string | null
} | null

export type TkaFullExamQuestionView = {
    attemptQuestionId: string
    position: number
    questionCode: string
    stem: string
    responseType: string
    cognitiveLevel: string | null
    stimulus: TkaFullExamStimulusView
    options: TkaFullExamOptionView[]
    selectedOptionIds: string[]
    isFlagged: boolean
    timeSpentSeconds: number
}

export type TkaFullExamSectionView = {
    sectionId: string
    title: string
    subjectCode: string
    sortOrder: number
    status: string
    questionCount: number
    durationSeconds: number
    startedAt: string | null
    deadlineAt: string | null
    remainingSeconds: number | null
    durationUsedSeconds: number
}

export type TkaFullExamState = {
    attemptId: string
    examId: string
    status: string
    attemptNumber: number
    startedAt: string | null
    activeSectionId: string | null
    answeredCount: number
    totalQuestions: number
    sections: TkaFullExamSectionView[]
    questions: TkaFullExamQuestionView[]
}

export type TkaFullExamStartResult = {
    attemptId: string
    resumed: boolean
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

function readBoolean(record: RecordValue | null, key: string) {
    const value = record?.[key]
    return typeof value === 'boolean' ? value : null
}

function readUuidArray(record: RecordValue | null, key: string) {
    return asArray(record?.[key]).flatMap((value) => typeof value === 'string' ? [value] : [])
}

function parseOption(value: unknown): TkaFullExamOptionView | null {
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

function parseStimulus(value: unknown): TkaFullExamStimulusView {
    const stimulus = asRecord(value)
    const content = readString(stimulus, 'content')
    if (!stimulus || content === null) return null
    return {
        title: readString(stimulus, 'title'),
        content,
        imageUrl: readString(stimulus, 'image_url'),
    }
}

function parseQuestion(value: unknown): TkaFullExamQuestionView | null {
    const item = asRecord(value)
    const question = asRecord(item?.question)
    const answer = asRecord(item?.answer)
    const attemptQuestionId = readString(item, 'attemptQuestionId')
    const stem = readString(question, 'stem')
    if (!attemptQuestionId || stem === null) return null

    const selectedOptionId = readString(answer, 'selectedOptionId')
    const selectedOptionIds = readUuidArray(answer, 'selectedOptionIds')
    if (selectedOptionId && !selectedOptionIds.includes(selectedOptionId)) selectedOptionIds.push(selectedOptionId)

    return {
        attemptQuestionId,
        position: readNumber(item, 'position') ?? 0,
        questionCode: readString(question, 'question_code') ?? '',
        stem,
        responseType: readString(question, 'question_type') ?? 'single_choice',
        cognitiveLevel: readString(question, 'cognitive_level'),
        stimulus: parseStimulus(item?.stimulus),
        options: asArray(item?.options).flatMap((option) => {
            const parsed = parseOption(option)
            return parsed ? [parsed] : []
        }),
        selectedOptionIds,
        isFlagged: readBoolean(answer, 'isFlagged') ?? false,
        timeSpentSeconds: readNumber(answer, 'timeSpentSeconds') ?? 0,
    }
}

function parseSection(value: unknown): TkaFullExamSectionView | null {
    const section = asRecord(value)
    const sectionId = readString(section, 'sectionId')
    if (!sectionId) return null
    return {
        sectionId,
        title: readString(section, 'title') ?? 'Section',
        subjectCode: readString(section, 'subjectCode') ?? '',
        sortOrder: readNumber(section, 'sortOrder') ?? 0,
        status: readString(section, 'status') ?? 'locked',
        questionCount: readNumber(section, 'questionCount') ?? 0,
        durationSeconds: readNumber(section, 'durationSeconds') ?? 0,
        startedAt: readString(section, 'startedAt'),
        deadlineAt: readString(section, 'deadlineAt'),
        remainingSeconds: readNumber(section, 'remainingSeconds'),
        durationUsedSeconds: readNumber(section, 'durationUsedSeconds') ?? 0,
    }
}

function parseState(value: unknown): TkaFullExamState {
    const state = asRecord(value)
    const attemptId = readString(state, 'attemptId')
    const examId = readString(state, 'examId')
    if (!attemptId || !examId) throw new Error('Invalid TKA full exam state payload')

    return {
        attemptId,
        examId,
        status: readString(state, 'status') ?? 'created',
        attemptNumber: readNumber(state, 'attemptNumber') ?? 1,
        startedAt: readString(state, 'startedAt'),
        activeSectionId: readString(state, 'activeSectionId'),
        answeredCount: readNumber(state, 'answeredCount') ?? 0,
        totalQuestions: readNumber(state, 'totalQuestions') ?? 60,
        sections: asArray(state?.sections).flatMap((section) => {
            const parsed = parseSection(section)
            return parsed ? [parsed] : []
        }),
        questions: asArray(state?.questions).flatMap((question) => {
            const parsed = parseQuestion(question)
            return parsed ? [parsed] : []
        }),
    }
}

function parseReviewOption(value: unknown) {
    const option = asRecord(value)
    const id = readString(option, 'id')
    const content = readString(option, 'content')
    if (!id || content === null) return null
    return {
        id,
        key: readString(option, 'option_key') ?? '',
        content,
        imageUrl: readString(option, 'image_url'),
        isCorrect: readBoolean(option, 'is_correct') === true,
        score: readNumber(option, 'score') ?? 0,
        responseGroup: readString(option, 'response_group'),
        responseGroupOrder: readNumber(option, 'response_group_order'),
    }
}

function readExplanation(snapshot: RecordValue | null) {
    for (const value of asArray(snapshot?.explanations)) {
        const explanation = asRecord(value)
        const content = readString(explanation, 'content')
        if (content) return content
    }
    return ''
}

function toReviewItem(value: unknown, sectionCodeById: Map<string, string>): UniversalReviewItem | null {
    const item = asRecord(value)
    const snapshot = asRecord(item?.snapshot)
    const question = asRecord(snapshot?.question)
    const answer = asRecord(item?.answer)
    const attemptQuestionId = readString(item, 'attemptQuestionId')
    const stem = readString(question, 'stem')
    if (!attemptQuestionId || stem === null) return null

    const sectionId = readString(item, 'sectionId') ?? ''
    const selectedOptionIds = readUuidArray(answer, 'selectedOptionIds')
    const selectedOptionId = readString(answer, 'selectedOptionId')
    if (selectedOptionId && !selectedOptionIds.includes(selectedOptionId)) selectedOptionIds.push(selectedOptionId)

    const stimulus = asRecord(snapshot?.stimulus)
    const stimulusContent = readString(stimulus, 'content')
    const stimulusView = stimulusContent === null ? null : {
        id: readString(stimulus, 'id') ?? readString(stimulus, 'stimulus_code') ?? `stimulus-${attemptQuestionId}`,
        code: readString(stimulus, 'stimulus_code'),
        title: readString(stimulus, 'title'),
        content: stimulusContent,
        imageUrl: readString(stimulus, 'image_url'),
        sourceReference: readString(stimulus, 'source_reference'),
    }

    return {
        questionId: attemptQuestionId,
        position: readNumber(item, 'position') ?? 0,
        subjectCode: sectionCodeById.get(sectionId) ?? '',
        stem,
        responseType: readString(question, 'question_type') ?? 'single_choice',
        stimulus: stimulusView,
        options: asArray(snapshot?.options).flatMap((option) => {
            const parsed = parseReviewOption(option)
            return parsed ? [parsed] : []
        }),
        selectedOptionIds,
        isCorrect: readBoolean(answer, 'isCorrect'),
        scoreAwarded: readNumber(answer, 'scoreAwarded') ?? 0,
        maxScore: 1,
        explanation: readExplanation(snapshot),
    }
}

export class TkaFullExamRpcService {
    private async rpc<T>(name: string, args: Record<string, unknown>) {
        const supabase = await createClient()
        const { data, error } = await supabase.rpc(name, args)
        if (error) throw new Error(error.message)
        return data as T
    }

    async startSmpFullExam(input: { userId: string; examSlug: string }): Promise<TkaFullExamStartResult> {
        const supabase = await createV2Client()
        const exam = await configuredExamRepository.findBySlug({
            programCode: 'TKA',
            trackCode: 'SMP',
            slug: input.examSlug,
        }, supabase)
        if (!exam || exam.examTypeCode !== 'FULL_TRYOUT') throw new Error('Tryout TKA SMP belum aktif.')

        const { data: activeAttempt, error: activeError } = await supabase
            .from('exam_attempts')
            .select('id')
            .eq('exam_id', exam.id)
            .eq('user_id', input.userId)
            .eq('status', 'in_progress')
            .order('attempt_number', { ascending: false })
            .limit(1)
            .maybeSingle()
        if (activeError) throw activeError
        if (activeAttempt?.id) return { attemptId: activeAttempt.id, resumed: true }

        const payload = await this.rpc<StartRpcPayload>('start_exam_attempt', { p_exam_id: exam.id })
        if (!payload?.attempt_id) throw new Error('RPC start_exam_attempt tidak mengembalikan attempt id.')
        return { attemptId: payload.attempt_id, resumed: false }
    }

    async getState(attemptId: string) {
        return parseState(await this.rpc<unknown>('get_exam_attempt_state', { p_attempt_id: attemptId }))
    }

    async saveAnswer(input: {
        attemptQuestionId: string
        optionIds: string[]
        timeSpentSeconds: number
        isFlagged: boolean
    }) {
        return this.rpc<RecordValue>('save_exam_answer', {
            p_attempt_question_id: input.attemptQuestionId,
            p_option_ids: input.optionIds,
            p_answer_value: null,
            p_time_spent_seconds: Math.max(0, Math.floor(input.timeSpentSeconds)),
            p_is_flagged: input.isFlagged,
        })
    }

    async completeSection(attemptId: string) {
        return this.rpc<RecordValue>('complete_exam_section', { p_attempt_id: attemptId })
    }

    async submitAttempt(attemptId: string) {
        return this.rpc<RecordValue>('submit_exam_attempt', { p_attempt_id: attemptId })
    }

    async getResultView(attemptId: string): Promise<PracticeResultView> {
        const [state, rawResult, rawReview] = await Promise.all([
            this.getState(attemptId),
            this.rpc<unknown>('get_exam_attempt_result', { p_attempt_id: attemptId }),
            this.rpc<unknown>('get_exam_attempt_review', { p_attempt_id: attemptId }),
        ])
        const result = asRecord(rawResult)
        const review = asRecord(rawReview)
        if (!result || !review) throw new Error('Invalid TKA result payload')

        const sectionCodeById = new Map(state.sections.map((section) => [section.sectionId, section.subjectCode]))
        const reviewItems = asArray(review.items).flatMap((item) => {
            const parsed = toReviewItem(item, sectionCodeById)
            return parsed ? [parsed] : []
        })

        const subjectResults: SubjectResultView[] = asArray(result.subjectScores).flatMap((value) => {
            const row = asRecord(value)
            const code = readString(row, 'subjectCode')
            if (!code) return []
            const correctCount = readNumber(row, 'correctCount') ?? 0
            const wrongCount = readNumber(row, 'wrongCount') ?? 0
            const unansweredCount = readNumber(row, 'unansweredCount') ?? 0
            return [{
                subjectId: code,
                code,
                score: readNumber(row, 'rawScore') ?? 0,
                maxScore: correctCount + wrongCount + unansweredCount,
                percentage: readNumber(row, 'percentage'),
                passingScore: null,
                passed: null,
                correctCount,
                wrongCount,
                unansweredCount,
                totalQuestions: correctCount + wrongCount + unansweredCount,
            }]
        })

        const durationUsedSeconds = readNumber(result, 'durationUsedSeconds') ?? 0
        const submittedAt = state.startedAt
            ? new Date(Date.parse(state.startedAt) + durationUsedSeconds * 1000).toISOString()
            : null

        return {
            attemptId,
            status: readString(result, 'status') ?? state.status,
            totalScore: readNumber(result, 'rawScore') ?? 0,
            percentage: readNumber(result, 'percentage'),
            passed: null,
            startedAt: state.startedAt,
            submittedAt,
            practiceKind: 'full_tryout',
            knowledgeNode: null,
            programCode: 'TKA',
            trackCode: 'SMP',
            answeredCount: reviewItems.filter((item) => item.selectedOptionIds.length > 0).length,
            subjectResults,
            answers: [],
            reviewItems,
        }
    }
}

export const tkaFullExamRpcService = new TkaFullExamRpcService()
