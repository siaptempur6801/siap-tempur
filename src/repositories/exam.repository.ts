import { createV2AdminClient } from '@/lib/utils/supabase/server'
import type { Json } from '@/types/database.types'

export type CanonicalExamType = 'DRILL' | 'MINI_TRYOUT' | 'FULL_TRYOUT' | 'DIAGNOSTIC' | 'EVENT' | 'REMEDIAL'

export type ResolvedExam = {
    id: string
    programId: string
    trackId: string
    examTypeId: string
    examTypeCode: CanonicalExamType
    title: string
    slug: string
    durationSeconds: number | null
    attemptLimit: number | null
    questionOrder: string
    accessType: string
    requiredFeatureId: string | null
    tokenCost: number
    startsAt: string | null
    endsAt: string | null
    subjectId: string | null
    subjectCode: string | null
}

export type AttemptQuestionSeed = {
    questionId: string
    questionVersion: number
    position: number
    sectionId: string | null
    subjectId: string
    maxScore: number
    snapshot: Json
}

type ExamRow = {
    id: string
    program_id: string
    track_id: string
    exam_type_id: string
    title: string
    slug: string
    duration_seconds: number | null
    attempt_limit: number | null
    question_order: string
    access_type: string
    required_feature_id: string | null
    token_cost: number
    starts_at: string | null
    ends_at: string | null
    status: string
    created_at: string
}

type SectionRow = {
    id: string
    exam_id: string
    subject_id: string | null
    question_count: number | null
    sort_order: number
    config: Json
}

type QuestionRow = {
    id: string
    question_code: string
    stem: string
    question_type: string
    subject_id: string
    version: number
    difficulty: string
    status: string
}

type OptionRow = {
    id: string
    question_id: string
    option_key: string
    content: string
    is_correct: boolean | null
    score: number | null
    sort_order: number
}

type ExamItemRow = {
    question_id: string
    question_version: number
    position: number
    section_id: string | null
}

function isAvailableNow(exam: ExamRow) {
    const now = Date.now()
    const starts = exam.starts_at ? Date.parse(exam.starts_at) : null
    const ends = exam.ends_at ? Date.parse(exam.ends_at) : null
    return (starts === null || starts <= now) && (ends === null || ends >= now)
}

function normalize(value: string) {
    return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

function shuffle<T>(items: T[]) {
    const result = [...items]
    for (let i = result.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[result[i], result[j]] = [result[j], result[i]]
    }
    return result
}

export class ExamRepository {
    async findExam(input: {
        programCode: string
        trackCode: string
        examTypeCode: CanonicalExamType
        subjectCode?: string
    }): Promise<ResolvedExam | null> {
        const admin = await createV2AdminClient()

        const { data: program, error: programError } = await admin
            .from('programs')
            .select('id')
            .eq('code', input.programCode)
            .maybeSingle()
        if (programError) throw programError
        if (!program) return null

        const { data: track, error: trackError } = await admin
            .from('tracks')
            .select('id')
            .eq('program_id', program.id)
            .eq('code', input.trackCode)
            .maybeSingle()
        if (trackError) throw trackError
        if (!track) return null

        const { data: examType, error: typeError } = await admin
            .from('exam_types')
            .select('id, code')
            .eq('code', input.examTypeCode)
            .maybeSingle()
        if (typeError) throw typeError
        if (!examType) return null

        let subjectId: string | null = null
        let candidateExamIds: string[] | null = null

        if (input.subjectCode) {
            const { data: subject, error: subjectError } = await admin
                .from('subjects')
                .select('id, code')
                .eq('track_id', track.id)
                .eq('code', input.subjectCode)
                .maybeSingle()
            if (subjectError) throw subjectError
            if (!subject) return null

            subjectId = subject.id
            const { data: sections, error: sectionError } = await admin
                .from('exam_sections')
                .select('exam_id')
                .eq('subject_id', subject.id)
            if (sectionError) throw sectionError

            candidateExamIds = Array.from(new Set((sections ?? []).map((row) => row.exam_id)))
            if (candidateExamIds.length === 0) return null
        }

        let query = admin
            .from('exams')
            .select('id, program_id, track_id, exam_type_id, title, slug, duration_seconds, attempt_limit, question_order, access_type, required_feature_id, token_cost, starts_at, ends_at, status, created_at')
            .eq('program_id', program.id)
            .eq('track_id', track.id)
            .eq('exam_type_id', examType.id)
            .in('status', ['ACTIVE', 'active', 'SCHEDULED', 'scheduled'])
            .order('created_at', { ascending: false })

        if (candidateExamIds) query = query.in('id', candidateExamIds)

        const { data: exams, error: examError } = await query
        if (examError) throw examError

        const exam = ((exams ?? []) as ExamRow[]).find(isAvailableNow)
        if (!exam) return null

        return {
            id: exam.id,
            programId: exam.program_id,
            trackId: exam.track_id,
            examTypeId: exam.exam_type_id,
            examTypeCode: examType.code as CanonicalExamType,
            title: exam.title,
            slug: exam.slug,
            durationSeconds: exam.duration_seconds,
            attemptLimit: exam.attempt_limit,
            questionOrder: exam.question_order,
            accessType: exam.access_type,
            requiredFeatureId: exam.required_feature_id,
            tokenCost: exam.token_cost,
            startsAt: exam.starts_at,
            endsAt: exam.ends_at,
            subjectId,
            subjectCode: input.subjectCode ?? null,
        }
    }

    async buildQuestionSet(input: {
        exam: ResolvedExam
        requestedQuestionCount?: number
        knowledgeNodeName?: string
    }): Promise<AttemptQuestionSeed[]> {
        const admin = await createV2AdminClient()
        const sections = await this.listSections(input.exam.id)

        if (input.knowledgeNodeName) {
            if (!input.exam.subjectId) throw new Error('Drill exam must resolve a subject')
            const count = input.requestedQuestionCount ?? sections[0]?.question_count ?? 10
            const ids = await this.findQuestionIdsForKnowledgeNode(
                input.exam.subjectId,
                input.knowledgeNodeName,
            )
            const selected = shuffle(ids).slice(0, count)
            if (selected.length < count) {
                throw new Error(`QUESTION_BANK_INCOMPLETE:${selected.length}:${count}`)
            }
            return this.hydrateQuestions(selected, {
                questionOrder: input.exam.questionOrder,
                sectionByQuestion: new Map(selected.map((id) => [id, sections[0]?.id ?? null])),
            })
        }

        const { data: staticItems, error: itemError } = await admin
            .from('exam_question_items')
            .select('question_id, question_version, position, section_id')
            .eq('exam_id', input.exam.id)
            .order('position', { ascending: true })
        if (itemError) throw itemError

        if (staticItems?.length) {
            const items = staticItems as ExamItemRow[]
            const ids = items.map((item) => item.question_id)
            const hydrated = await this.hydrateQuestions(ids, {
                questionOrder: input.exam.questionOrder,
                sectionByQuestion: new Map(items.map((item) => [item.question_id, item.section_id])),
                expectedVersionByQuestion: new Map(items.map((item) => [item.question_id, item.question_version])),
            })
            return input.requestedQuestionCount ? hydrated.slice(0, input.requestedQuestionCount) : hydrated
        }

        if (sections.length === 0) {
            throw new Error('EXAM_HAS_NO_SECTIONS')
        }

        const selectedIds: string[] = []
        const sectionByQuestion = new Map<string, string | null>()

        for (const section of sections) {
            if (!section.subject_id) continue
            const count = input.requestedQuestionCount && sections.length === 1
                ? input.requestedQuestionCount
                : section.question_count
            if (!count || count <= 0) continue

            const candidates = await this.listPublishedQuestionIds(section.subject_id)
            const selected = shuffle(candidates.filter((id) => !selectedIds.includes(id))).slice(0, count)
            if (selected.length < count) {
                throw new Error(`QUESTION_BANK_INCOMPLETE:${selected.length}:${count}`)
            }
            selected.forEach((id) => {
                selectedIds.push(id)
                sectionByQuestion.set(id, section.id)
            })
        }

        if (selectedIds.length === 0) throw new Error('QUESTION_BANK_EMPTY')
        return this.hydrateQuestions(selectedIds, {
            questionOrder: input.exam.questionOrder,
            sectionByQuestion,
        })
    }

    private async listSections(examId: string): Promise<SectionRow[]> {
        const admin = await createV2AdminClient()
        const { data, error } = await admin
            .from('exam_sections')
            .select('id, exam_id, subject_id, question_count, sort_order, config')
            .eq('exam_id', examId)
            .order('sort_order', { ascending: true })
        if (error) throw error
        return (data ?? []) as SectionRow[]
    }

    private async listPublishedQuestionIds(subjectId: string): Promise<string[]> {
        const admin = await createV2AdminClient()
        const { data, error } = await admin
            .from('questions')
            .select('id')
            .eq('subject_id', subjectId)
            .in('status', ['PUBLISHED', 'published', 'ACTIVE', 'active'])
            .limit(1000)
        if (error) throw error
        return (data ?? []).map((row) => row.id)
    }

    private async findQuestionIdsForKnowledgeNode(subjectId: string, name: string) {
        const admin = await createV2AdminClient()
        const { data: nodes, error: nodeError } = await admin
            .from('knowledge_nodes')
            .select('id, name, slug')
            .eq('subject_id', subjectId)
            .in('status', ['ACTIVE', 'active'])
        if (nodeError) throw nodeError

        const needle = normalize(name)
        const node = (nodes ?? []).find((row) => normalize(row.name) === needle || normalize(row.slug) === needle)
        if (!node) return []

        const { data: paths, error: pathError } = await admin
            .from('knowledge_node_paths')
            .select('descendant_id')
            .eq('ancestor_id', node.id)
        if (pathError) throw pathError

        const nodeIds = Array.from(new Set([node.id, ...(paths ?? []).map((row) => row.descendant_id)]))
        const { data: links, error: linkError } = await admin
            .from('question_knowledge_nodes')
            .select('question_id')
            .in('knowledge_node_id', nodeIds)
        if (linkError) throw linkError

        const linkedIds = Array.from(new Set((links ?? []).map((row) => row.question_id)))
        if (linkedIds.length === 0) return []

        const { data: questions, error: questionError } = await admin
            .from('questions')
            .select('id')
            .eq('subject_id', subjectId)
            .in('id', linkedIds)
            .in('status', ['PUBLISHED', 'published', 'ACTIVE', 'active'])
        if (questionError) throw questionError
        return (questions ?? []).map((row) => row.id)
    }

    private async hydrateQuestions(
        questionIds: string[],
        input: {
            questionOrder: string
            sectionByQuestion: Map<string, string | null>
            expectedVersionByQuestion?: Map<string, number>
        },
    ): Promise<AttemptQuestionSeed[]> {
        if (questionIds.length === 0) return []
        const admin = await createV2AdminClient()

        const [{ data: questions, error: questionError }, { data: options, error: optionError }] = await Promise.all([
            admin
                .from('questions')
                .select('id, question_code, stem, question_type, subject_id, version, difficulty, status')
                .in('id', questionIds),
            admin
                .from('question_options')
                .select('id, question_id, option_key, content, is_correct, score, sort_order')
                .in('question_id', questionIds)
                .order('sort_order', { ascending: true }),
        ])
        if (questionError) throw questionError
        if (optionError) throw optionError

        const questionMap = new Map(((questions ?? []) as QuestionRow[]).map((row) => [row.id, row]))
        const optionMap = new Map<string, OptionRow[]>()
        for (const option of (options ?? []) as OptionRow[]) {
            const rows = optionMap.get(option.question_id) ?? []
            rows.push(option)
            optionMap.set(option.question_id, rows)
        }

        const orderedIds = input.questionOrder.toLowerCase() === 'random'
            ? shuffle(questionIds)
            : questionIds

        return orderedIds.map((questionId, index) => {
            const question = questionMap.get(questionId)
            if (!question) throw new Error(`QUESTION_NOT_FOUND:${questionId}`)

            const expectedVersion = input.expectedVersionByQuestion?.get(questionId)
            if (expectedVersion !== undefined && expectedVersion !== question.version) {
                throw new Error(`QUESTION_VERSION_MISMATCH:${questionId}:${expectedVersion}:${question.version}`)
            }

            const questionOptions = optionMap.get(questionId) ?? []
            if (questionOptions.length === 0) throw new Error(`QUESTION_OPTIONS_EMPTY:${questionId}`)

            const maxScore = Math.max(
                ...questionOptions.map((option) => option.score ?? (option.is_correct ? 5 : 0)),
                0,
            )

            const snapshot: Json = {
                questionId: question.id,
                questionCode: question.question_code,
                stem: question.stem,
                questionType: question.question_type,
                subjectId: question.subject_id,
                difficulty: question.difficulty,
                options: questionOptions.map((option) => ({
                    id: option.id,
                    key: option.option_key,
                    content: option.content,
                })),
            }

            return {
                questionId: question.id,
                questionVersion: question.version,
                position: index + 1,
                sectionId: input.sectionByQuestion.get(question.id) ?? null,
                subjectId: question.subject_id,
                maxScore,
                snapshot,
            }
        })
    }
}

export const examRepository = new ExamRepository()
