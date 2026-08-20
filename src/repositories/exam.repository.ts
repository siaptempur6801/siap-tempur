import { createV2AdminClient } from '@/lib/utils/supabase/server'
import { calculateMaxScore, type ResponseScoringConfig } from '@/src/domain/question-response'
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

type IdRow = { id: string }
type ExamTypeRow = { id: string; code: string }
type ExamIdRow = { exam_id: string }
type KnowledgeNodeRow = { id: string; name: string; slug: string }
type DescendantRow = { descendant_id: string }
type QuestionIdRow = { id: string }
type QuestionLinkRow = { question_id: string }

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
    stimulus_id: string | null
    stimulus_order: number | null
    response_config: Json
}

type OptionRow = {
    id: string
    question_id: string
    option_key: string
    content: string
    is_correct: boolean | null
    score: number | null
    sort_order: number
    image_url: string | null
    response_group: string | null
    response_group_order: number | null
}

type StimulusRow = {
    id: string
    stimulus_code: string
    title: string | null
    content: string
    image_url: string | null
    source_reference: string | null
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

function readNumericConfig(config: Json, ...keys: string[]) {
    if (!config || Array.isArray(config) || typeof config !== 'object') return null
    for (const key of keys) {
        const value = config[key]
        if (typeof value === 'number' && Number.isFinite(value)) return value
        if (typeof value === 'string' && value.trim() !== '') {
            const parsed = Number(value)
            if (Number.isFinite(parsed)) return parsed
        }
    }
    return null
}

function sectionPassingScore(section: SectionRow | undefined) {
    if (!section) return null
    return readNumericConfig(section.config, 'passing_score', 'passingScore', 'passing_grade', 'passingGrade')
}

function responseScoringConfig(config: Json): ResponseScoringConfig | undefined {
    if (!config || Array.isArray(config) || typeof config !== 'object') return undefined
    const rawMode = config.scoringMode ?? config.scoring_mode
    if (rawMode === 'single_option' || rawMode === 'exact_set' || rawMode === 'grouped_sum') {
        return { scoringMode: rawMode }
    }
    return undefined
}

export class ExamRepository {
    async findExam(input: {
        programCode: string
        trackCode: string
        examTypeCode: CanonicalExamType
        subjectCode?: string
    }): Promise<ResolvedExam | null> {
        const admin = await createV2AdminClient()

        const { data: rawProgram, error: programError } = await admin
            .from('programs')
            .select('id')
            .eq('code', input.programCode)
            .maybeSingle()
        if (programError) throw programError
        const program = rawProgram as IdRow | null
        if (!program) return null

        const { data: rawTrack, error: trackError } = await admin
            .from('tracks')
            .select('id')
            .eq('program_id', program.id)
            .eq('code', input.trackCode)
            .maybeSingle()
        if (trackError) throw trackError
        const track = rawTrack as IdRow | null
        if (!track) return null

        const { data: rawExamType, error: typeError } = await admin
            .from('exam_types')
            .select('id, code')
            .eq('code', input.examTypeCode)
            .maybeSingle()
        if (typeError) throw typeError
        const examType = rawExamType as ExamTypeRow | null
        if (!examType) return null

        let subjectId: string | null = null
        let candidateExamIds: string[] | null = null

        if (input.subjectCode) {
            const { data: rawSubject, error: subjectError } = await admin
                .from('subjects')
                .select('id')
                .eq('track_id', track.id)
                .eq('code', input.subjectCode)
                .maybeSingle()
            if (subjectError) throw subjectError
            const subject = rawSubject as IdRow | null
            if (!subject) return null

            subjectId = subject.id
            const { data: rawSections, error: sectionError } = await admin
                .from('exam_sections')
                .select('exam_id')
                .eq('subject_id', subject.id)
            if (sectionError) throw sectionError

            const sections = (rawSections ?? []) as ExamIdRow[]
            candidateExamIds = Array.from(new Set(sections.map((row) => row.exam_id)))
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

        const { data: rawExams, error: examError } = await query
        if (examError) throw examError

        const exam = ((rawExams ?? []) as ExamRow[]).find(isAvailableNow)
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
        const sectionById = new Map(sections.map((section) => [section.id, section]))

        if (input.knowledgeNodeName) {
            if (!input.exam.subjectId) throw new Error('Drill exam must resolve a subject')
            const section = sections.find((item) => item.subject_id === input.exam.subjectId) ?? sections[0]
            const count = input.requestedQuestionCount ?? section?.question_count ?? 10
            const ids = await this.findQuestionIdsForKnowledgeNode(
                input.exam.subjectId,
                input.knowledgeNodeName,
            )
            const selected = shuffle(ids).slice(0, count)
            if (selected.length < count) {
                throw new Error(`QUESTION_BANK_INCOMPLETE:${selected.length}:${count}`)
            }
            const passingScore = sectionPassingScore(section)
            return this.hydrateQuestions(selected, {
                questionOrder: input.exam.questionOrder,
                sectionByQuestion: new Map(selected.map((id) => [id, section?.id ?? null])),
                passingScoreByQuestion: new Map(selected.map((id) => [id, passingScore])),
            })
        }

        const { data: rawStaticItems, error: itemError } = await admin
            .from('exam_question_items')
            .select('question_id, question_version, position, section_id')
            .eq('exam_id', input.exam.id)
            .order('position', { ascending: true })
        if (itemError) throw itemError

        const staticItems = (rawStaticItems ?? []) as ExamItemRow[]
        if (staticItems.length > 0) {
            const ids = staticItems.map((item) => item.question_id)
            const hydrated = await this.hydrateQuestions(ids, {
                questionOrder: input.exam.questionOrder,
                sectionByQuestion: new Map(staticItems.map((item) => [item.question_id, item.section_id])),
                passingScoreByQuestion: new Map(staticItems.map((item) => [
                    item.question_id,
                    item.section_id ? sectionPassingScore(sectionById.get(item.section_id)) : null,
                ])),
                expectedVersionByQuestion: new Map(staticItems.map((item) => [item.question_id, item.question_version])),
            })
            return input.requestedQuestionCount ? hydrated.slice(0, input.requestedQuestionCount) : hydrated
        }

        if (sections.length === 0) throw new Error('EXAM_HAS_NO_SECTIONS')

        const selectedIds: string[] = []
        const sectionByQuestion = new Map<string, string | null>()
        const passingScoreByQuestion = new Map<string, number | null>()

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
            const passingScore = sectionPassingScore(section)
            selected.forEach((id) => {
                selectedIds.push(id)
                sectionByQuestion.set(id, section.id)
                passingScoreByQuestion.set(id, passingScore)
            })
        }

        if (selectedIds.length === 0) throw new Error('QUESTION_BANK_EMPTY')
        return this.hydrateQuestions(selectedIds, {
            questionOrder: input.exam.questionOrder,
            sectionByQuestion,
            passingScoreByQuestion,
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
        return ((data ?? []) as QuestionIdRow[]).map((row) => row.id)
    }

    private async findQuestionIdsForKnowledgeNode(subjectId: string, name: string): Promise<string[]> {
        const admin = await createV2AdminClient()
        const { data: rawNodes, error: nodeError } = await admin
            .from('knowledge_nodes')
            .select('id, name, slug')
            .eq('subject_id', subjectId)
            .in('status', ['ACTIVE', 'active'])
        if (nodeError) throw nodeError

        const nodes = (rawNodes ?? []) as KnowledgeNodeRow[]
        const needle = normalize(name)
        const node = nodes.find((row) => normalize(row.name) === needle || normalize(row.slug) === needle)
        if (!node) return []

        const { data: rawPaths, error: pathError } = await admin
            .from('knowledge_node_paths')
            .select('descendant_id')
            .eq('ancestor_id', node.id)
        if (pathError) throw pathError

        const paths = (rawPaths ?? []) as DescendantRow[]
        const nodeIds = Array.from(new Set([node.id, ...paths.map((row) => row.descendant_id)]))
        const { data: rawLinks, error: linkError } = await admin
            .from('question_knowledge_nodes')
            .select('question_id')
            .in('knowledge_node_id', nodeIds)
        if (linkError) throw linkError

        const links = (rawLinks ?? []) as QuestionLinkRow[]
        const linkedIds = Array.from(new Set(links.map((row) => row.question_id)))
        if (linkedIds.length === 0) return []

        const { data: rawQuestions, error: questionError } = await admin
            .from('questions')
            .select('id')
            .eq('subject_id', subjectId)
            .in('id', linkedIds)
            .in('status', ['PUBLISHED', 'published', 'ACTIVE', 'active'])
        if (questionError) throw questionError
        return ((rawQuestions ?? []) as QuestionIdRow[]).map((row) => row.id)
    }

    private async hydrateQuestions(
        questionIds: string[],
        input: {
            questionOrder: string
            sectionByQuestion: Map<string, string | null>
            passingScoreByQuestion?: Map<string, number | null>
            expectedVersionByQuestion?: Map<string, number>
        },
    ): Promise<AttemptQuestionSeed[]> {
        if (questionIds.length === 0) return []
        const admin = await createV2AdminClient()

        const [{ data: rawQuestions, error: questionError }, { data: rawOptions, error: optionError }] = await Promise.all([
            admin
                .from('questions')
                .select('id, question_code, stem, question_type, subject_id, version, difficulty, status, stimulus_id, stimulus_order, response_config')
                .in('id', questionIds),
            admin
                .from('question_options')
                .select('id, question_id, option_key, content, is_correct, score, sort_order, image_url, response_group, response_group_order')
                .in('question_id', questionIds)
                .order('sort_order', { ascending: true }),
        ])
        if (questionError) throw questionError
        if (optionError) throw optionError

        const questions = (rawQuestions ?? []) as QuestionRow[]
        const options = (rawOptions ?? []) as OptionRow[]
        const stimulusIds = Array.from(new Set(questions.map((row) => row.stimulus_id).filter((value): value is string => Boolean(value))))
        let stimuli: StimulusRow[] = []
        if (stimulusIds.length > 0) {
            const { data, error } = await admin
                .from('question_stimuli')
                .select('id, stimulus_code, title, content, image_url, source_reference')
                .in('id', stimulusIds)
            if (error) throw error
            stimuli = (data ?? []) as StimulusRow[]
        }

        const questionMap = new Map(questions.map((row) => [row.id, row]))
        const stimulusMap = new Map(stimuli.map((row) => [row.id, row]))
        const optionMap = new Map<string, OptionRow[]>()
        for (const option of options) {
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

            const responseConfig = responseScoringConfig(question.response_config)
            const maxScore = calculateMaxScore({
                questionType: question.question_type,
                options: questionOptions.map((option) => ({
                    id: option.id,
                    isCorrect: option.is_correct,
                    score: option.score,
                    responseGroup: option.response_group,
                    responseGroupOrder: option.response_group_order,
                })),
                config: responseConfig,
            })
            const passingScore = input.passingScoreByQuestion?.get(questionId) ?? null
            const stimulus = question.stimulus_id ? stimulusMap.get(question.stimulus_id) ?? null : null

            const snapshot: Json = {
                questionId: question.id,
                questionCode: question.question_code,
                stem: question.stem,
                questionType: question.question_type,
                subjectId: question.subject_id,
                difficulty: question.difficulty,
                passingScore,
                responseConfig: question.response_config ?? {},
                stimulusOrder: question.stimulus_order,
                stimulus: stimulus ? {
                    id: stimulus.id,
                    code: stimulus.stimulus_code,
                    title: stimulus.title,
                    content: stimulus.content,
                    imageUrl: stimulus.image_url,
                    sourceReference: stimulus.source_reference,
                } : null,
                options: questionOptions.map((option) => ({
                    id: option.id,
                    key: option.option_key,
                    content: option.content,
                    imageUrl: option.image_url,
                    responseGroup: option.response_group,
                    responseGroupOrder: option.response_group_order,
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
