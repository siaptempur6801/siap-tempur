'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { validateCsrf } from '@/lib/csrf'
import { PERMISSIONS } from '@/src/auth/permissions'
import { authorizationService } from '@/src/services/authorization.service'
import { adminV2Service } from '@/src/services/admin-v2.service'
import { adminExamsService } from '@/src/services/admin-exams.service'
import type { ProgramTrackContext } from '@/src/services/catalog-context.service'

function text(form: FormData, key: string) {
  const value = form.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

function nullableText(form: FormData, key: string) {
  return text(form, key) || null
}

function numberValue(form: FormData, key: string, fallback = 0) {
  const raw = text(form, key)
  if (!raw) return fallback
  const value = Number(raw)
  if (!Number.isFinite(value)) throw new Error(`${key.toUpperCase()}_INVALID`)
  return value
}

function nullableNumber(form: FormData, key: string) {
  const raw = text(form, key)
  if (!raw) return null
  const value = Number(raw)
  if (!Number.isFinite(value)) throw new Error(`${key.toUpperCase()}_INVALID`)
  return value
}

function contextFrom(form: FormData): ProgramTrackContext {
  return {
    programCode: text(form, 'program_code') || 'CPNS',
    trackCode: text(form, 'track_code') || 'SKD',
  }
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function friendlyError(error: unknown) {
  const message = error instanceof Error ? error.message : 'EXAM_ACTION_FAILED'
  if (message.includes('DRILL_QUESTION_POOL_INSUFFICIENT')) {
    const match = message.match(/DRILL_QUESTION_POOL_INSUFFICIENT:(\d+)\/(\d+)/)
    return match
      ? `Pool soal submateri hanya ${match[1]} soal, sedangkan Drill meminta ${match[2]} soal.`
      : 'Jumlah soal Drill melebihi pool soal submateri yang tersedia.'
  }
  const friendly: Record<string, string> = {
    EXAM_TYPE_INVALID: 'Tipe exam tidak valid.',
    EXAM_TITLE_REQUIRED: 'Judul exam wajib diisi.',
    EXAM_DURATION_INVALID: 'Durasi exam harus lebih dari 0 detik.',
    EXAM_ATTEMPT_LIMIT_INVALID: 'Attempt limit harus lebih dari 0.',
    EXAM_TOKEN_COST_INVALID: 'Biaya token exam tidak valid.',
    SUBJECT_INVALID: 'Subtes tidak valid untuk context aktif.',
    DRILL_KNOWLEDGE_NODE_INVALID: 'Submateri Drill tidak cocok dengan subtes yang dipilih.',
    DRILL_KNOWLEDGE_NODE_INACTIVE: 'Submateri Drill sedang tidak aktif.',
    DRILL_QUESTION_COUNT_INVALID: 'Jumlah soal Drill harus lebih dari 0.',
    DRILL_ACTIVE_ATTEMPT_LOCKED: 'Drill tidak dapat diubah saat masih ada attempt yang sedang berjalan.',
    DRILL_SECTION_CONFLICT: 'Drill ini memiliki lebih dari satu section. Rapikan struktur exam sebelum mengubah fokus Drill.',
    DRILL_TYPE_IMMUTABLE: 'Exam yang sudah dibuat tidak dapat diubah menjadi/keluar dari tipe Drill melalui editor ini.',
    EXAM_NOT_FOUND: 'Exam tidak ditemukan pada context aktif.',
    SECTION_TITLE_REQUIRED: 'Judul section wajib diisi.',
    SECTION_SORT_ORDER_INVALID: 'Urutan section tidak valid.',
    SECTION_QUESTION_COUNT_INVALID: 'Jumlah soal section harus lebih dari 0.',
    SECTION_DURATION_INVALID: 'Durasi section harus lebih dari 0 detik.',
    SECTION_PASSING_SCORE_INVALID: 'Passing score section tidak valid.',
  }
  const code = Object.keys(friendly).find((key) => message.includes(key))
  return code ? friendly[code] : message
}

async function requireExamManager() {
  await validateCsrf()
  return authorizationService.requirePermission(PERMISSIONS.EXAM_MANAGE)
}

async function finish(context: ProgramTrackContext, success: string, error?: unknown) {
  revalidatePath('/admin/assessment/exams')
  const query = new URLSearchParams({
    program: context.programCode,
    track: context.trackCode,
    ...(error ? { error: friendlyError(error) } : { ok: success }),
  })
  redirect(`/admin/assessment/exams?${query.toString()}`)
}

export async function saveAdminExamAction(form: FormData) {
  const context = contextFrom(form)
  let failure: unknown = null
  try {
    const authorization = await requireExamManager()
    const examTypeCode = text(form, 'exam_type_code').toUpperCase()
    const title = text(form, 'title')
    const requestedSlug = text(form, 'slug')
    const slug = slugify(requestedSlug || title)
    const examId = nullableText(form, 'id')

    if (examTypeCode === 'DRILL') {
      const subjectCode = text(form, 'subject_code')
      const knowledgeNodeId = text(form, 'knowledge_node_id')
      if (!subjectCode) throw new Error('SUBJECT_INVALID')
      if (!knowledgeNodeId) throw new Error('DRILL_KNOWLEDGE_NODE_INVALID')
      await adminExamsService.upsertDrillExam({
        examId,
        context,
        subjectCode,
        knowledgeNodeId,
        title,
        slug,
        durationSeconds: numberValue(form, 'duration_seconds'),
        attemptLimit: numberValue(form, 'attempt_limit'),
        questionCount: numberValue(form, 'question_count'),
        questionOrder: text(form, 'question_order') || 'random',
        resultVisibility: text(form, 'result_visibility') || 'instant',
        accessType: text(form, 'access_type') || 'FREE',
        status: text(form, 'status') || 'draft',
        tokenCost: numberValue(form, 'token_cost', 0),
        actorId: authorization.userId,
      })
    } else {
      await adminV2Service.saveExam({
        id: examId,
        examTypeCode,
        title,
        slug,
        durationSeconds: nullableNumber(form, 'duration_seconds'),
        attemptLimit: nullableNumber(form, 'attempt_limit'),
        questionOrder: text(form, 'question_order') || 'random',
        resultVisibility: text(form, 'result_visibility') || 'instant',
        accessType: text(form, 'access_type') || 'FREE',
        status: text(form, 'status') || 'draft',
        tokenCost: numberValue(form, 'token_cost', 0),
        startsAt: null,
        endsAt: null,
        actorId: authorization.userId,
        context,
      })
    }
  } catch (error) {
    failure = error
  }
  await finish(context, 'Exam tersimpan.', failure)
}

export async function archiveAdminExamAction(form: FormData) {
  const context = contextFrom(form)
  let failure: unknown = null
  try {
    await requireExamManager()
    await adminV2Service.archiveExam(text(form, 'id'))
  } catch (error) {
    failure = error
  }
  await finish(context, 'Exam diarsipkan.', failure)
}

export async function saveAdminExamSectionAction(form: FormData) {
  const context = contextFrom(form)
  let failure: unknown = null
  try {
    await requireExamManager()
    await adminV2Service.saveExamSection({
      id: nullableText(form, 'id'),
      examId: text(form, 'exam_id'),
      subjectCode: nullableText(form, 'subject_code'),
      title: text(form, 'title'),
      sortOrder: numberValue(form, 'sort_order', 0),
      questionCount: nullableNumber(form, 'question_count'),
      durationSeconds: nullableNumber(form, 'duration_seconds'),
      passingScore: nullableNumber(form, 'passing_score'),
      context,
    })
  } catch (error) {
    failure = error
  }
  await finish(context, 'Section exam tersimpan.', failure)
}
