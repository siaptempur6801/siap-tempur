import { createAdminClient } from '@/lib/utils/supabase/server'
import { adminOffset, parseAdminPage } from '@/lib/admin-pagination'
import { escapePostgrestValue } from '@/lib/postgrest-filter'
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

/** Resolve a drill rule from the assessment's own section before falling back to its blueprint. */
export function drillRuleForExam(
  exam: Pick<AdminExamRow, 'blueprint_id'>,
  sections: AdminExamSectionRow[],
  rules: DrillBlueprintRule[],
  nodes: DrillKnowledgeNode[] = [],
) {
  const drillSection =
    sections.find((section) => section.config?.mode === 'drill') ??
    sections.find((section) => typeof section.config?.knowledge_node_id === 'string') ??
    (sections.length === 1 ? sections[0] : undefined)
  const candidates = exam.blueprint_id
    ? rules.filter((rule) => rule.blueprintId === exam.blueprint_id)
    : []
  const configuredNodeId = drillSection?.config?.knowledge_node_id
  const sectionNode =
    nodes.find(
      (node) => node.subjectId === drillSection?.subject_id && node.id === configuredNodeId,
    ) ??
    nodes.find(
      (node) => node.subjectId === drillSection?.subject_id && node.name === drillSection?.title,
    )

  // Drill's generated section is scoped to one exam, so it is the safest source
  // when a legacy or imported blueprint points at another drill's rule.
  if (drillSection?.subject_id && sectionNode) {
    return {
      blueprintId: exam.blueprint_id ?? '',
      subjectId: drillSection.subject_id,
      knowledgeNodeId: sectionNode.id,
      questionCount: Number(drillSection.question_count ?? 0),
    }
  }

  if (typeof configuredNodeId === 'string') {
    return candidates.find(
      (rule) =>
        rule.knowledgeNodeId === configuredNodeId &&
        (!drillSection?.subject_id || rule.subjectId === drillSection.subject_id),
    )
  }

  const sectionSubjectId = drillSection?.subject_id
  const subjectCandidates = sectionSubjectId
    ? candidates.filter((rule) => rule.subjectId === sectionSubjectId)
    : []
  if (subjectCandidates.length === 1) return subjectCandidates[0]
  if (!drillSection && candidates.length === 1) return candidates[0]
  return undefined
}

function contextOrDefault(context?: ProgramTrackContext) {
  return context ?? CPNS_SKD_CONTEXT
}

class AdminExamsService {
  async getWorkspace(
    context?: ProgramTrackContext,
    filters?: { search?: string; type?: string; status?: string; page?: string; id?: string },
  ) {
    const catalog = await catalogContextService.resolve(contextOrDefault(context))
    const admin = await createAdminClient()

    let query = admin
      .from('exams')
      .select(
        'id, exam_type_id, blueprint_id, title, slug, duration_seconds, attempt_limit, question_order, result_visibility, access_type, status, starts_at, ends_at, token_cost, updated_at',
        { count: 'exact' },
      )
      .eq('program_id', catalog.program.id)
      .eq('track_id', catalog.track.id)
      .order('updated_at', { ascending: false })

    if (filters?.id) query = query.eq('id', filters.id)
    else {
      if (filters?.search) query = query.ilike('title', `%${escapePostgrestValue(filters.search)}%`)
      if (filters?.status)
        query = query.in('status', [filters.status.toLowerCase(), filters.status.toUpperCase()])
      if (filters?.type)
        query = query.eq(
          'exam_type_id',
          catalog.examTypes.find((row) => row.code === filters.type)?.id ??
            '00000000-0000-0000-0000-000000000000',
        )
    }
    const page = parseAdminPage(filters?.page)
    query = filters
      ? query.range(filters.id ? 0 : adminOffset(page), filters.id ? 0 : adminOffset(page) + 24)
      : query.limit(100)
    const { data: examsData, error: examsError, count } = await query
    if (examsError) throw examsError

    const exams = (examsData ?? []) as AdminExamRow[]
    const examIds = exams.map((row) => row.id)
    const blueprintIds = exams.flatMap((row) => (row.blueprint_id ? [row.blueprint_id] : []))
    const subjectIds = catalog.subjects.map((row) => row.id)

    const [sectionsResult, rulesResult, nodesResult] = await Promise.all([
      examIds.length
        ? admin
            .from('exam_sections')
            .select(
              'id, exam_id, subject_id, title, sort_order, question_count, duration_seconds, config',
            )
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
    const { data: counts, error: countError } = nodeIds.length
      ? await admin.rpc('admin_drill_supply', {
          p_program_id: catalog.program.id,
          p_track_id: catalog.track.id,
          p_node_ids: nodeIds,
        })
      : { data: [], error: null }
    if (countError) throw countError
    const poolCountByNode = new Map<string, number>(
      (counts || []).map((row: { node_id: string; available_count: number }) => [
        row.node_id,
        Number(row.available_count),
      ]),
    )

    const drillNodes: DrillKnowledgeNode[] = rawNodes.map((row) => ({
      id: String(row.id),
      subjectId: String(row.subject_id),
      parentId: row.parent_id ? String(row.parent_id) : null,
      code: row.code ? String(row.code) : null,
      name: String(row.name),
      nodeType: String(row.node_type),
      depth: Number(row.depth ?? 0),
      sortOrder: Number(row.sort_order ?? 0),
      availableQuestionCount: poolCountByNode.get(String(row.id)) ?? 0,
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
      total: count ?? 0,
      page,
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
