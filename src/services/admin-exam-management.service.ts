import type { Json } from '@/types/database.types'
import { createV2AdminClient } from '@/lib/utils/supabase/server'
import {
  getAdminCatalog,
  nowIso,
  sameId,
  slugify,
  validNonNegative,
  validPositive,
} from '@/src/services/admin-service-utils'
import type { ProgramTrackContext } from '@/src/services/catalog-context.service'
import { requiresTkaTokenForActiveAssessment } from '@/src/tka/context'

class AdminExamManagementService {
  async saveExam(input: {
    id?: string | null
    examTypeCode: string
    title: string
    slug?: string | null
    durationSeconds?: number | null
    attemptLimit?: number | null
    questionOrder: string
    resultVisibility: string
    accessType: string
    status: string
    tokenCost: number
    startsAt?: string | null
    endsAt?: string | null
    actorId: string
    context?: ProgramTrackContext
  }) {
    const admin = await createV2AdminClient()
    const catalog = await getAdminCatalog(input.context)
    const examType = catalog.examTypes.find((row) => row.code === input.examTypeCode)
    if (!examType) throw new Error('EXAM_TYPE_INVALID')
    if (!input.title.trim()) throw new Error('EXAM_TITLE_REQUIRED')
    if (!validPositive(input.durationSeconds)) throw new Error('EXAM_DURATION_INVALID')
    if (!validPositive(input.attemptLimit)) throw new Error('EXAM_ATTEMPT_LIMIT_INVALID')
    if (!Number.isInteger(input.tokenCost) || !validNonNegative(input.tokenCost)) {
      throw new Error('EXAM_TOKEN_COST_INVALID')
    }
    if (
      catalog.program.code.toUpperCase() === 'TKA' &&
      catalog.track.code.toUpperCase() === 'SMP' &&
      requiresTkaTokenForActiveAssessment('SMP', examType.code, input.status) &&
      input.tokenCost < 1
    ) {
      throw new Error('EXAM_TOKEN_COST_REQUIRED')
    }
    if (input.startsAt && input.endsAt && Date.parse(input.startsAt) >= Date.parse(input.endsAt))
      throw new Error('EXAM_TIME_INVALID')
    const slug = slugify(input.slug || input.title)
    if (!slug) throw new Error('EXAM_TITLE_REQUIRED')

    const payload = {
      program_id: catalog.program.id,
      track_id: catalog.track.id,
      exam_type_id: examType.id,
      title: input.title.trim(),
      slug,
      duration_seconds: input.durationSeconds ?? null,
      attempt_limit: input.attemptLimit ?? null,
      question_order: input.questionOrder,
      result_visibility: input.resultVisibility,
      access_type: input.accessType,
      status: input.status,
      starts_at: input.startsAt || null,
      ends_at: input.endsAt || null,
      token_cost: input.tokenCost,
      updated_at: nowIso(),
    }

    if (input.id) {
      const { data: current, error: currentError } = await admin
        .from('exams')
        .select('id, program_id, track_id')
        .eq('id', input.id)
        .maybeSingle()
      if (currentError) throw currentError
      if (
        !current ||
        !sameId(current.program_id, catalog.program.id) ||
        !sameId(current.track_id, catalog.track.id)
      ) {
        throw new Error('EXAM_CATALOG_MISMATCH')
      }
      const { error } = await admin.from('exams').update(payload).eq('id', input.id)
      if (error) throw error
      return input.id
    }
    const { data, error } = await admin
      .from('exams')
      .insert({ ...payload, created_by: input.actorId })
      .select('id')
      .single()
    if (error) throw error
    return String(data.id)
  }

  async archiveExam(examId: string) {
    const admin = await createV2AdminClient()
    const { error } = await admin
      .from('exams')
      .update({ status: 'archived', updated_at: nowIso() })
      .eq('id', examId)
    if (error) throw error
  }

  async saveExamSection(input: {
    id?: string | null
    examId: string
    subjectCode?: string | null
    title: string
    sortOrder: number
    questionCount?: number | null
    durationSeconds?: number | null
    passingScore?: number | null
    context?: ProgramTrackContext
  }) {
    const admin = await createV2AdminClient()
    const catalog = await getAdminCatalog(input.context)
    const subject = input.subjectCode
      ? catalog.subjects.find((row) => row.code === input.subjectCode)
      : null
    if (input.subjectCode && !subject) throw new Error('SUBJECT_INVALID')
    if (!input.title.trim()) throw new Error('SECTION_TITLE_REQUIRED')
    if (!Number.isInteger(input.sortOrder) || input.sortOrder < 0)
      throw new Error('SECTION_SORT_ORDER_INVALID')
    if (!validPositive(input.questionCount)) throw new Error('SECTION_QUESTION_COUNT_INVALID')
    if (!validPositive(input.durationSeconds)) throw new Error('SECTION_DURATION_INVALID')
    if (!validNonNegative(input.passingScore)) throw new Error('SECTION_PASSING_SCORE_INVALID')

    const { data: exam, error: examError } = await admin
      .from('exams')
      .select('id, program_id, track_id')
      .eq('id', input.examId)
      .maybeSingle()
    if (examError) throw examError
    if (
      !exam ||
      !sameId(exam.program_id, catalog.program.id) ||
      !sameId(exam.track_id, catalog.track.id)
    )
      throw new Error('EXAM_NOT_FOUND')

    const payload = {
      exam_id: input.examId,
      subject_id: subject?.id ?? null,
      title: input.title.trim(),
      sort_order: input.sortOrder,
      question_count: input.questionCount ?? null,
      duration_seconds: input.durationSeconds ?? null,
      config:
        input.passingScore === null || input.passingScore === undefined
          ? ({} as Json)
          : ({ passing_score: input.passingScore } as Json),
    }
    if (input.id) {
      const { data, error } = await admin
        .from('exam_sections')
        .update(payload)
        .eq('id', input.id)
        .eq('exam_id', input.examId)
        .select('id')
        .maybeSingle()
      if (error) throw error
      if (!data) throw new Error('SECTION_NOT_FOUND')
      return input.id
    }
    const { data, error } = await admin.from('exam_sections').insert(payload).select('id').single()
    if (error) throw error
    return String(data.id)
  }
}

export const adminExamManagementService = new AdminExamManagementService()
