import { createAdminClient } from '@/lib/utils/supabase/server'
import {
  catalogContextService,
  CPNS_SKD_CONTEXT,
  type ProgramTrackContext,
} from '@/src/services/catalog-context.service'

export type AdminExamRow = {
  id: string
  exam_type_id: string
  blueprint_id: string | null
  title: string
  slug: string
  duration_seconds: number | null
  attempt_limit: number | null
  question_order: string
  result_visibility: string
  access_type: string
  status: string
  starts_at: string | null
  ends_at: string | null
  token_cost: number
  updated_at: string
}

export type AdminExamSectionRow = {
  id: string
  exam_id: string
  subject_id: string | null
  title: string
  sort_order: number
  question_count: number | null
  duration_seconds: number | null
  config: Record<string, unknown> | null
}

export type DrillKnowledgeNode = {
  id: string
  subjectId: string
  parentId: string | null
  code: string | null
  name: string
  nodeType: string
  depth: number
  sortOrder: number
  availableQuestionCount: number
}

export type DrillBlueprintRule = {
  blueprintId: string
  subjectId: string
  knowledgeNodeId: string
  questionCount: number
}

function contextOrDefault(context?: ProgramTrackContext) {
  return context ?? CPNS_SKD_CONTEXT
}

export class AdminExamsService {
  async getWorkspace(context?: ProgramTrackContext) {
    const catalog = await catalogContextService.resolve(contextOrDefault(context))
    const admin = await createAdminClient()

    const { data: examsData, error: examsError } = await admin
      .from('exams')
      .select('id, exam_type_id, blueprint_id, title, slug, duration_seconds, attempt_limit, question_order, result_visibility, access_type, status, starts_at, ends_at, token_cost, updated_at')
      .eq('program_id', catalog.program.id)
      .eq('track_id', catalog.track.id)
      .order('updated_at', { ascending: false })
      .limit(100)
    if (examsError) throw examsError

    const exams = (examsData ?? []) as AdminExamRow[]
    const examIds = exams.map((row) => row.id)
    const blueprintIds = exams.flatMap((row) => row.blueprint_id ? [row.blueprint_id] : [])
    const subjectIds = catalog.subjects.map((row) => row.id)

    const [sectionsResult, rulesResult, nodesResult] = await Promise.all([
      examIds.length
        ? admin
            .from('exam_sections')
            .select('id, exam_id, subject_id, title, sort_order, question_count, duration_seconds, config')
            .in('exam_id', examIds)
            .order('sort_order', { ascending: true })
        : Promise.resolve({ data: [], error: null }),
      blueprintIds.length
        ? admin
            .from('exam_blueprint_rules')
            .select('blueprint_id, subject_id, knowledge_node_id, question_count, sort_order')
            .in('blueprint_id', blueprintIds)
            .not('knowledge_node_id', 'is', null)
            .order('sort_order', { ascending: true })
        : Promise.resolve({ data: [], error: null }),
      subjectIds.length
        ? admin
            .from('knowledge_nodes')
            .select('id, subject_id, parent_id, code, name, node_type, depth, sort_order, status')
            .in('subject_id', subjectIds)
            .in('status', ['active', 'ACTIVE'])
            .order('depth', { ascending: true })
            .order('sort_order', { ascending: true })
        : Promise.resolve({ data: [], error: null }),
    ])

    if (sectionsResult.error) throw sectionsResult.error
    if (rulesResult.error) throw rulesResult.error
    if (nodesResult.error) throw nodesResult.error

    const rawNodes = nodesResult.data ?? []
    const nodeIds = rawNodes.map((row) => String(row.id))
    const nodeSubjectById = new Map(rawNodes.map((row) => [String(row.id), String(row.subject_id)]))
    const poolCountByNode = new Map<string, Set<string>>()
    for (const nodeId of nodeIds) poolCountByNode.set(nodeId, new Set())

    if (nodeIds.length) {
      const { data: pathsData, error: pathsError } = await admin
        .from('knowledge_node_paths')
        .select('ancestor_id, descendant_id')
        .in('ancestor_id', nodeIds)
      if (pathsError) throw pathsError

      const paths = pathsData ?? []
      const descendantIds = [...new Set(paths.map((row) => String(row.descendant_id)))]
      if (descendantIds.length) {
        const { data: mappingsData, error: mappingsError } = await admin
          .from('question_knowledge_nodes')
          .select('question_id, knowledge_node_id, relation_type')
          .in('knowledge_node_id', descendantIds)
          .eq('relation_type', 'primary')
        if (mappingsError) throw mappingsError

        const mappings = mappingsData ?? []
        const questionIds = [...new Set(mappings.map((row) => String(row.question_id)))]
        if (questionIds.length) {
          const { data: questionsData, error: questionsError } = await admin
            .from('questions')
            .select('id, subject_id, version, status')
            .eq('program_id', catalog.program.id)
            .eq('track_id', catalog.track.id)
            .in('id', questionIds)
            .in('status', ['approved', 'published'])
          if (questionsError) throw questionsError

          const questions = questionsData ?? []
          const { data: versionsData, error: versionsError } = await admin
            .from('question_versions')
            .select('question_id, version')
            .in('question_id', questions.map((row) => String(row.id)))
          if (versionsError) throw versionsError

          const frozen = new Set((versionsData ?? []).map((row) => `${String(row.question_id)}:${Number(row.version)}`))
          const validQuestions = new Map(
            questions
              .filter((row) => frozen.has(`${String(row.id)}:${Number(row.version)}`))
              .map((row) => [String(row.id), String(row.subject_id)])
          )
          const questionsByDescendant = new Map<string, Set<string>>()
          for (const mapping of mappings) {
            const questionId = String(mapping.question_id)
            if (!validQuestions.has(questionId)) continue
            const descendantId = String(mapping.knowledge_node_id)
            const bucket = questionsByDescendant.get(descendantId) ?? new Set<string>()
            bucket.add(questionId)
            questionsByDescendant.set(descendantId, bucket)
          }

          for (const path of paths) {
            const ancestorId = String(path.ancestor_id)
            const descendantId = String(path.descendant_id)
            const ancestorSubjectId = nodeSubjectById.get(ancestorId)
            const bucket = poolCountByNode.get(ancestorId)
            if (!bucket || !ancestorSubjectId) continue
            for (const questionId of questionsByDescendant.get(descendantId) ?? []) {
              if (validQuestions.get(questionId) === ancestorSubjectId) bucket.add(questionId)
            }
          }
        }
      }
    }

    const drillNodes: DrillKnowledgeNode[] = rawNodes.map((row) => ({
      id: String(row.id),
      subjectId: String(row.subject_id),
      parentId: row.parent_id ? String(row.parent_id) : null,
      code: row.code ? String(row.code) : null,
      name: String(row.name),
      nodeType: String(row.node_type),
      depth: Number(row.depth ?? 0),
      sortOrder: Number(row.sort_order ?? 0),
      availableQuestionCount: poolCountByNode.get(String(row.id))?.size ?? 0,
    }))

    const drillRules: DrillBlueprintRule[] = (rulesResult.data ?? [])
      .filter((row) => row.knowledge_node_id)
      .map((row) => ({
        blueprintId: String(row.blueprint_id),
        subjectId: String(row.subject_id),
        knowledgeNodeId: String(row.knowledge_node_id),
        questionCount: Number(row.question_count),
      }))

    return {
      catalog,
      exams,
      examSections: (sectionsResult.data ?? []) as AdminExamSectionRow[],
      drillNodes,
      drillRules,
    }
  }

  async upsertDrillExam(input: {
    examId?: string | null
    context: ProgramTrackContext
    subjectCode: string
    knowledgeNodeId: string
    title: string
    slug: string
    durationSeconds: number
    attemptLimit: number
    questionCount: number
    questionOrder: string
    resultVisibility: string
    accessType: string
    status: string
    tokenCost: number
    actorId: string
  }) {
    const admin = await createAdminClient()
    const { data, error } = await admin.rpc('admin_upsert_drill_exam_v1', {
      p_exam_id: input.examId ?? null,
      p_program_code: input.context.programCode,
      p_track_code: input.context.trackCode,
      p_subject_code: input.subjectCode,
      p_knowledge_node_id: input.knowledgeNodeId,
      p_title: input.title,
      p_slug: input.slug,
      p_duration_seconds: input.durationSeconds,
      p_attempt_limit: input.attemptLimit,
      p_question_count: input.questionCount,
      p_question_order: input.questionOrder,
      p_result_visibility: input.resultVisibility,
      p_access_type: input.accessType,
      p_status: input.status,
      p_token_cost: input.tokenCost,
      p_actor_id: input.actorId,
    })
    if (error) throw error
    return data as {
      exam_id: string
      blueprint_id: string
      section_id: string
      subject_id: string
      knowledge_node_id: string
      available_question_count: number
      question_count: number
    }
  }
}

export const adminExamsService = new AdminExamsService()
