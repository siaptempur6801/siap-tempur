'use server'

import { adminReturnUrl } from '@/lib/admin-return-url'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { validateCsrf } from '@/lib/csrf'
import { PERMISSIONS } from '@/src/auth/permissions'
import { auditAdminAction } from '@/lib/audit-log'
import { authorizationService } from '@/src/services/authorization.service'
import { adminExamManagementService } from '@/src/services/admin-exam-management.service'
import { adminExamsService, drillRuleForExam } from '@/src/services/admin-exams.service'
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
    EXAM_TYPE_INVALID: 'Tipe ujian tidak valid.',
    EXAM_TITLE_REQUIRED: 'Judul exam wajib diisi.',
    EXAM_DURATION_INVALID: 'Durasi exam harus lebih dari 0 detik.',
    EXAM_ATTEMPT_LIMIT_INVALID: 'Batas percobaan harus lebih dari 0.',
    EXAM_TOKEN_COST_INVALID: 'Biaya token exam tidak valid.',
    EXAM_TOKEN_COST_REQUIRED:
      'Tryout, Mini Tryout, dan Drill TKA SMP aktif membutuhkan minimal 1 token.',
    SUBJECT_INVALID: 'Subtes tidak valid untuk context aktif.',
    DRILL_KNOWLEDGE_NODE_INVALID: 'Submateri Drill tidak cocok dengan subtes yang dipilih.',
    DRILL_KNOWLEDGE_NODE_INACTIVE: 'Submateri Drill sedang tidak aktif.',
    DRILL_QUESTION_COUNT_INVALID: 'Jumlah soal Drill harus lebih dari 0.',
    DRILL_ACTIVE_ATTEMPT_LOCKED:
      'Drill tidak dapat diubah saat masih ada attempt yang sedang berjalan.',
    DRILL_SECTION_CONFLICT:
      'Drill ini memiliki lebih dari satu section. Rapikan struktur exam sebelum mengubah fokus Drill.',
    DRILL_TYPE_IMMUTABLE:
      'Exam yang sudah dibuat tidak dapat diubah menjadi/keluar dari tipe Drill melalui editor ini.',
    EXAM_NOT_FOUND: 'Exam tidak ditemukan pada context aktif.',
    SECTION_NOT_FOUND: 'Bagian assessment tidak ditemukan pada assessment ini.',
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

/**
 * Menutup satu aksi exam: revalidasi, catat jejak audit, lalu redirect.
 *
 * Jejak ditulis SEBELUM `redirect()` karena redirect melempar — apa pun yang
 * diletakkan setelahnya tidak akan pernah dijalankan.
 */
type ExamAudit = {
  actorId: string
  action: string
  entityType: string
  entityId?: string | null
  label?: string | null
  before?: Record<string, unknown> | null
  after?: Record<string, unknown> | null
}

/**
 * Menulis jejak audit satu aksi exam, bila aksinya berhasil.
 *
 * Dipisah dari `finish` dan di-await SEBELUM `finish` dipanggil, karena `finish`
 * harus tetap fungsi SINKRON yang melempar `redirect()`: `redirect()` yang
 * dilempar dari dalam fungsi `async` tidak lagi tertangkap mekanisme Server
 * Action Next — browser tidak berpindah halaman dan pesan sukses tidak pernah
 * sampai ke layar, meskipun datanya sudah berubah di database.
 */
async function auditExamAction(audit: ExamAudit, error?: unknown) {
  if (error) return
  await auditAdminAction(audit)
}

function finish(
  context: ProgramTrackContext,
  success: string,
  error?: unknown,
  form?: FormData,
  savedId?: string,
) {
  revalidatePath('/admin/assessments')
  const query = new URLSearchParams({
    program: context.programCode,
    track: context.trackCode,
    ...(error ? { error: friendlyError(error) } : { ok: success }),
  })
  const target = new URL(
    adminReturnUrl(form?.get('return_to'), `/admin/assessments?${query}`),
    'http://admin.local',
  )
  target.searchParams.delete('ok')
  target.searchParams.delete('error')
  target.searchParams.set(error ? 'error' : 'ok', error ? friendlyError(error) : success)
  if (savedId && !error) {
    target.searchParams.set('assessment', savedId)
    target.searchParams.set('tab', target.searchParams.get('tab') || 'overview')
    target.searchParams.delete('new')
    target.searchParams.delete('edit')
  }
  redirect(`${target.pathname}${target.search}`)
}

export async function saveAdminExamAction(form: FormData) {
  const context = contextFrom(form)
  let failure: unknown = null
  let actorId = ''
  const existingId = nullableText(form, 'id')
  let savedId = existingId
  try {
    const authorization = await requireExamManager()
    actorId = authorization.userId
    const examTypeCode = text(form, 'exam_type_code').toUpperCase()
    const title = text(form, 'title')
    const requestedSlug = text(form, 'slug')
    const slug = slugify(requestedSlug || title)
    const examId = nullableText(form, 'id')
    if (
      examTypeCode !== 'DRILL' &&
      ['active', 'scheduled', 'ready', 'published'].includes(text(form, 'status').toLowerCase())
    ) {
      if (!examId)
        throw new Error('Buat assessment sebagai Draft, lalu lengkapi soal sebelum aktivasi.')
      const data = await adminExamsService.getWorkspace(context, { id: examId })
      const current = data.exams[0]
      if (!current) throw new Error('EXAM_NOT_FOUND')
      if (!['active', 'scheduled', 'ready', 'published'].includes(current.status.toLowerCase())) {
        const { assessmentReadiness } = await import('@/src/services/admin-assessment-ux.service')
        if (!(await assessmentReadiness(current, data.examSections)).configurationReady)
          throw new Error('Lengkapi soal dan konfigurasi sebelum aktivasi Assessment.')
      }
    }

    if (examTypeCode === 'DRILL') {
      const subjectCode = text(form, 'subject_code')
      const knowledgeNodeId = text(form, 'knowledge_node_id')
      if (!subjectCode) throw new Error('SUBJECT_INVALID')
      if (!knowledgeNodeId) throw new Error('DRILL_KNOWLEDGE_NODE_INVALID')
      const saved = await adminExamsService.upsertDrillExam({
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
      savedId = saved.exam_id
    } else {
      savedId = await adminExamManagementService.saveExam({
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
  await auditExamAction(
    {
      actorId,
      action: existingId ? 'UPDATE_EXAM' : 'CREATE_EXAM',
      entityType: 'exam',
      entityId: existingId,
      label: text(form, 'title'),
      after: {
        exam_type_code: text(form, 'exam_type_code').toUpperCase(),
        status: text(form, 'status') || 'draft',
        token_cost: numberValue(form, 'token_cost', 0),
      },
    },
    failure,
  )
  finish(
    context,
    'Assessment tersimpan. Lengkapi soal, lalu distribusikan.',
    failure,
    form,
    savedId || undefined,
  )
}

export async function archiveAdminExamAction(form: FormData) {
  const context = contextFrom(form)
  let failure: unknown = null
  const examId = text(form, 'id')
  let actorId = ''
  try {
    const authorization = await requireExamManager()
    actorId = authorization.userId
    await adminExamManagementService.archiveExam(examId)
  } catch (error) {
    failure = error
  }
  await auditExamAction(
    {
      actorId,
      action: 'ARCHIVE_EXAM',
      entityType: 'exam',
      entityId: examId,
      after: { status: 'archived' },
    },
    failure,
  )
  finish(context, 'Assessment diarsipkan.', failure, form)
}

export async function saveAdminExamSectionAction(form: FormData) {
  const context = contextFrom(form)
  let failure: unknown = null
  let actorId = ''
  const sectionId = nullableText(form, 'id')
  const examId = text(form, 'exam_id')
  try {
    const authorization = await requireExamManager()
    actorId = authorization.userId
    await adminExamManagementService.saveExamSection({
      id: sectionId,
      examId,
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
  await auditExamAction(
    {
      actorId,
      action: sectionId ? 'UPDATE_EXAM_SECTION' : 'CREATE_EXAM_SECTION',
      entityType: 'exam',
      entityId: examId,
      label: text(form, 'title'),
      after: {
        subject_code: nullableText(form, 'subject_code'),
        title: text(form, 'title'),
        sort_order: numberValue(form, 'sort_order', 0),
        question_count: nullableNumber(form, 'question_count'),
        duration_seconds: nullableNumber(form, 'duration_seconds'),
        passing_score: nullableNumber(form, 'passing_score'),
      },
    },
    failure,
  )
  finish(context, 'Bagian assessment tersimpan.', failure, form)
}

export async function publishAdminExamAction(form: FormData) {
  const context = contextFrom(form)
  const id = text(form, 'id')
  let failure: unknown = null
  let actorId = ''

  try {
    const actor = await requireExamManager()
    actorId = actor.userId

    const data = await adminExamsService.getWorkspace(context, { id })
    const exam = data.exams[0]
    if (!exam) throw new Error('Assessment tidak ditemukan.')
    if (!['draft', 'ready'].includes(exam.status.toLowerCase())) {
      throw new Error('Assessment tidak dalam status yang dapat dipublish.')
    }

    const { assessmentReadiness } = await import('@/src/services/admin-assessment-ux.service')
    const isDrill =
      data.catalog.examTypes.find((type) => type.id === exam.exam_type_id)?.code === 'DRILL'
    const sections = data.examSections.filter((section) => section.exam_id === exam.id)
    const rule = isDrill
      ? drillRuleForExam(exam, sections, data.drillRules, data.drillNodes)
      : undefined
    const node = rule && data.drillNodes.find((candidate) => candidate.id === rule.knowledgeNodeId)
    const drillSection =
      sections.find((section) => section.config?.mode === 'drill') ??
      sections.find((section) => typeof section.config?.knowledge_node_id === 'string') ??
      sections[0]
    const drillSupply = isDrill
      ? {
          available: node?.availableQuestionCount ?? 0,
          required: rule?.questionCount ?? Number(drillSection?.question_count ?? 0),
        }
      : undefined
    const readiness = await assessmentReadiness(exam, sections, drillSupply)
    if (!readiness.ready) {
      throw new Error(
        'Assessment belum siap. Lengkapi soal, review, dan konfigurasi sebelum publish.',
      )
    }

    const { createAdminClient } = await import('@/lib/utils/supabase/server')
    const db = await createAdminClient()
    const { error } = await db
      .from('exams')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('program_id', data.catalog.program.id)
      .eq('track_id', data.catalog.track.id)
      .in('status', ['draft', 'DRAFT', 'ready', 'READY'])
    if (error) throw error
  } catch (error) {
    failure = error
  }

  await auditExamAction(
    {
      actorId,
      action: 'PUBLISH_EXAM',
      entityType: 'exam',
      entityId: id,
      after: { status: 'active' },
    },
    failure,
  )
  finish(
    context,
    'Assessment aktif. Pilih Event atau Instansi untuk distribusi.',
    failure,
    form,
    id,
  )
}
