'use server'

import { createAdminClient } from '@/lib/utils/supabase/server'

import { adminReturnUrl } from '@/lib/admin-return-url'
import { adminRouteState } from '@/lib/admin-routes'
import { assessmentCatalogService } from '@/src/services/assessment-catalog.service'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { validateCsrf } from '@/lib/csrf'
import { PERMISSIONS, type PermissionCode } from '@/src/auth/permissions'
import { authorizationService } from '@/src/services/authorization.service'
import { adminProductService } from '@/src/services/admin-product.service'
import { adminEventManagementService } from '@/src/services/admin-event-management.service'
import { adminExamManagementService } from '@/src/services/admin-exam-management.service'
import { auditAdminAction } from '@/lib/audit-log'
import type { ProgramTrackContext } from '@/src/services/catalog-context.service'

function text(form: FormData, key: string) {
  const value = form.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

function nullableText(form: FormData, key: string) {
  const value = text(form, key)
  return value || null
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

function catalogContext(form: FormData): ProgramTrackContext {
  return {
    programCode: text(form, 'program_code') || 'CPNS',
    trackCode: text(form, 'track_code') || 'SKD',
  }
}

function contextQuery(context: ProgramTrackContext) {
  return `program=${encodeURIComponent(context.programCode)}&track=${encodeURIComponent(context.trackCode)}`
}

function jakartaIso(form: FormData, key: string) {
  const value = text(form, key)
  if (!value) return null
  if (/Z$|[+-]\d{2}:\d{2}$/.test(value)) {
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) throw new Error(`${key.toUpperCase()}_INVALID`)
    return parsed.toISOString()
  }
  const normalized = value.length === 16 ? `${value}:00+07:00` : `${value}+07:00`
  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) throw new Error(`${key.toUpperCase()}_INVALID`)
  return parsed.toISOString()
}

function errorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : 'ADMIN_ACTION_FAILED'
  const friendly: Record<string, string> = {
    PRODUCT_FIELDS_REQUIRED: 'Kode dan nama produk wajib diisi.',
    PRODUCT_PRICE_INVALID: 'Harga produk tidak valid.',
    PRODUCT_CATALOG_MISMATCH: 'Produk tidak berada pada program/track yang sedang aktif.',
    TOKEN_GRANT_INVALID: 'Jumlah token tidak valid.',
    PRODUCT_DURATION_INVALID: 'Durasi produk harus lebih dari 0 hari.',
    EVENT_FIELDS_REQUIRED: 'Data event belum lengkap.',
    EVENT_TIME_INVALID: 'Waktu selesai event harus setelah waktu mulai.',
    EVENT_TIME_CONFLICTS_WITH_SESSION:
      'Jadwal event harus mencakup semua sesi aktif. Perbarui jadwal sesi terlebih dahulu.',
    EVENT_REGISTRATION_TIME_INVALID: 'Rentang waktu registrasi event tidak valid.',
    EVENT_FLYER_URL_INVALID: 'URL foto event tidak valid. Upload ulang melalui form event.',
    EVENT_SESSION_TIME_INVALID: 'Waktu sesi tidak valid.',
    EVENT_ASSESSMENT_NOT_READY: 'Pilih assessment aktif yang memiliki soal pada katalog CPNS/TKA.',
    EVENT_SESSION_CAPACITY_INVALID: 'Kapasitas sesi harus lebih dari 0.',
    EVENT_SESSION_NAME_REQUIRED: 'Nama sesi event wajib diisi.',
    EVENT_SESSION_MISMATCH: 'Sesi tidak berasal dari event yang dipilih.',
    EVENT_SESSION_HAS_REGISTRATIONS:
      'Sesi tidak dapat dihapus karena sudah memiliki peserta terdaftar. Sesi ini perlu dipertahankan untuk riwayat event.',
    EVENT_SESSION_HAS_TICKETS:
      'Sesi tidak dapat dihapus karena masih terhubung ke produk tiket. Lepaskan tiket dari sesi terlebih dahulu.',
    EVENT_NOT_FOUND: 'Event tidak ditemukan.',
    EVENT_CATALOG_MISMATCH: 'Event tidak berada pada program/track yang sedang aktif.',
    EVENT_EXAM_MISMATCH: 'Assessment harus berasal dari domain dan level event yang sama.',
    EVENT_SESSION_OUTSIDE_EVENT: 'Waktu sesi harus berada di dalam rentang waktu event.',
    EVENT_PRODUCT_MISMATCH: 'Produk tiket tidak cocok dengan event yang dipilih.',
    EVENT_PRODUCT_ARCHIVED: 'Produk tiket sudah diarsipkan.',
    EXAM_TYPE_INVALID: 'Tipe exam tidak valid.',
    EXAM_TITLE_REQUIRED: 'Judul exam wajib diisi.',
    EXAM_TOKEN_COST_INVALID: 'Biaya token exam tidak valid.',
    EXAM_DURATION_INVALID: 'Durasi exam harus lebih dari 0 detik.',
    EXAM_ATTEMPT_LIMIT_INVALID: 'Attempt limit harus lebih dari 0.',
    EXAM_TIME_INVALID: 'Rentang waktu exam tidak valid.',
    EXAM_NOT_FOUND: 'Exam tidak ditemukan pada program/track aktif.',
    EXAM_CATALOG_MISMATCH: 'Exam tidak berada pada program/track yang sedang aktif.',
    SUBJECT_INVALID: 'Mapel/subtes tidak valid untuk track yang sedang aktif.',
    SECTION_TITLE_REQUIRED: 'Judul section wajib diisi.',
    SECTION_SORT_ORDER_INVALID: 'Urutan section tidak valid.',
    SECTION_QUESTION_COUNT_INVALID: 'Jumlah soal section harus lebih dari 0.',
    SECTION_DURATION_INVALID: 'Durasi section harus lebih dari 0 detik.',
    SECTION_PASSING_SCORE_INVALID: 'Passing score section tidak valid.',
    QUESTION_STEM_REQUIRED: 'Isi pertanyaan wajib diisi.',
    QUESTION_OPTIONS_REQUIRED: 'Soal membutuhkan minimal dua opsi.',
    QUESTION_OPTION_KEYS_DUPLICATE: 'Key opsi harus unik.',
    QUESTION_OPTION_CONTENT_REQUIRED: 'Semua opsi harus memiliki isi.',
    QUESTION_OPTION_SCORE_INVALID: 'Skor opsi tidak valid.',
    QUESTION_CORRECT_OPTION_REQUIRED: 'Konfigurasi jawaban benar belum valid.',
    QUESTION_TYPE_INVALID: 'Tipe respons soal tidak didukung.',
    QUESTION_RESPONSE_GROUP_REQUIRED: 'Soal category membutuhkan response group pada setiap opsi.',
    QUESTION_RESPONSE_GROUP_CORRECT_REQUIRED:
      'Setiap response group harus memiliki tepat satu jawaban benar.',
    QUESTION_CATALOG_MISMATCH: 'Soal tidak berada pada program/track yang sedang aktif.',
    QUESTION_LOCKED_BY_ACTIVE_ATTEMPT:
      'Kunci jawaban tidak bisa diubah saat soal sedang dipakai attempt aktif.',
  }
  return friendly[message] || message
}

async function actor(permission: PermissionCode) {
  await validateCsrf()
  return authorizationService.requirePermission(permission)
}

/**
 * Jejak audit untuk satu aksi admin.
 *
 * `actorId` diteruskan dari `actor()` sehingga setiap aksi yang berhasil dapat
 * mencatat SIAPA yang mengubah APA. Sebelumnya hanya modul artikel yang menulis
 * jejak; perubahan produk, exam, event, dan soal tidak meninggalkan jejak sama
 * sekali — termasuk perubahan harga dan kunci jawaban.
 */
type AdminAudit = {
  action: string
  entityType: string
  entityId?: string | null
  label?: string | null
  before?: Record<string, unknown> | null
  after?: Record<string, unknown> | null
}

/**
 * Halaman kanonik untuk setiap tab workspace admin.
 *
 * Sebelumnya `finish()` mengarahkan ke `/cpns/admin?tab=...`. Setelah pohon admin
 * legacy dihapus, path itu tidak punya halaman lagi dan hanya menghasilkan
 * redirect 307 — sehingga `revalidatePath` menunjuk rute yang tidak pernah
 * dirender dan `?ok=`/`?error=` tidak pernah sampai ke layar, artinya admin
 * tidak melihat pesan sukses maupun kegagalan.
 */
const ADMIN_TAB_ROUTES = {
  products: '/admin/commerce/products',
  commerce: '/admin/commerce/orders',
  events: '/admin/events',
  exams: '/admin/assessments',
  questions: '/admin/content/questions',
} as const

type AdminTab = keyof typeof ADMIN_TAB_ROUTES

/**
 * Menulis jejak audit satu aksi, bila aksinya berhasil.
 *
 * SENGAJA dipisah dari `finish` dan di-await SEBELUM `finish` dipanggil, karena
 * `finish` harus tetap fungsi SINKRON yang melempar `redirect()`. `redirect()`
 * yang dilempar dari dalam fungsi `async` tidak lagi tertangkap mekanisme Server
 * Action Next: respons menjadi penolakan yang tidak tertangani, browser tidak
 * berpindah halaman, dan pesan sukses tidak pernah muncul — meskipun datanya
 * sudah berubah. Dijaga `tests/unit/admin-async-redirect-guard.test.ts`.
 */
async function auditAdminV2Action(
  audit: (AdminAudit & { actorId: string }) | null | undefined,
  error: unknown = null,
) {
  if (!audit || error) return
  await auditAdminAction({
    action: audit.action,
    actorId: audit.actorId,
    entityType: audit.entityType,
    entityId: audit.entityId ?? null,
    label: audit.label ?? null,
    before: audit.before ?? null,
    after: audit.after ?? null,
  })
}

function finish(
  tab: AdminTab,
  success: string,
  context: ProgramTrackContext,
  error: unknown = null,
  editId?: string | null,
  extraParams: Record<string, string | null | undefined> = {},
) {
  const params = new URLSearchParams(contextQuery(context))
  for (const [key, value] of Object.entries(extraParams)) {
    if (value) params.set(key, value)
  }
  const base = `${ADMIN_TAB_ROUTES[tab]}?${params.toString()}`
  // Revalidasi rute kanonik, bukan path legacy yang hanya me-redirect.
  revalidatePath(ADMIN_TAB_ROUTES[tab])
  const edit = editId ? `&edit=${encodeURIComponent(editId)}` : ''
  if (error) {
    redirect(`${base}&error=${encodeURIComponent(errorMessage(error))}`)
  }
  redirect(`${base}&ok=${encodeURIComponent(success)}${edit}`)
}

export async function saveProductAction(form: FormData) {
  let failure: unknown = null
  const context = catalogContext(form)
  const requestedId = nullableText(form, 'id')
  let savedId = requestedId
  let actorId = ''
  const submittedPrice = nullableNumber(form, 'price')
  const currentPrice = nullableNumber(form, 'current_price')
  const price =
    requestedId &&
    submittedPrice !== null &&
    currentPrice !== null &&
    submittedPrice === currentPrice
      ? null
      : submittedPrice
  try {
    const authorization = await actor(PERMISSIONS.PRODUCT_MANAGE)
    actorId = authorization.userId
    savedId = await adminProductService.saveProduct({
      id: requestedId,
      code: text(form, 'code'),
      name: text(form, 'name'),
      description: nullableText(form, 'description'),
      productType: text(form, 'product_type') || 'TOKEN_PACK',
      durationDays: nullableNumber(form, 'duration_days'),
      status: text(form, 'status') || 'draft',
      price,
      currency: text(form, 'currency') || 'IDR',
      tokenGrant: nullableNumber(form, 'token_grant'),
      context,
    })
  } catch (error) {
    failure = error
  }
  await auditAdminV2Action(
    {
      actorId,
      action: requestedId ? 'UPDATE_PRODUCT' : 'CREATE_PRODUCT',
      entityType: 'product',
      entityId: savedId,
      label: text(form, 'name') || text(form, 'code'),
      after: {
        code: text(form, 'code'),
        status: text(form, 'status') || 'draft',
        price,
        currency: text(form, 'currency') || 'IDR',
        token_grant: nullableNumber(form, 'token_grant'),
      },
    },
    failure,
  )
  if (text(form, 'return_to')) {
    revalidatePath('/admin/commerce/products')
    const target = new URL(
      adminReturnUrl(form.get('return_to'), '/admin/commerce/products'),
      'http://admin.local',
    )
    if (failure && savedId) target.searchParams.set('edit', savedId)
    target.searchParams.set(
      failure ? 'error' : 'ok',
      failure
        ? errorMessage(failure)
        : 'Produk tersimpan. Tinjau readiness dan availability sebelum aktivasi.',
    )
    redirect(`${target.pathname}${target.search}`)
  }
  finish('products', 'Produk tersimpan.', context, failure, savedId)
}

export async function archiveProductAction(form: FormData) {
  let failure: unknown = null
  const context = catalogContext(form)
  const productId = text(form, 'id')
  let actorId = ''
  try {
    const authorization = await actor(PERMISSIONS.PRODUCT_MANAGE)
    actorId = authorization.userId
    await adminProductService.archiveProduct(productId)
  } catch (error) {
    failure = error
  }
  await auditAdminV2Action(
    {
      actorId,
      action: 'ARCHIVE_PRODUCT',
      entityType: 'product',
      entityId: productId,
      before: { status: 'active' },
      after: { status: 'archived' },
    },
    failure,
  )
  if (text(form, 'return_to')) {
    revalidatePath('/admin/commerce/products')
    const target = new URL(
      adminReturnUrl(form.get('return_to'), '/admin/commerce/products'),
      'http://admin.local',
    )
    target.searchParams.set(
      failure ? 'error' : 'ok',
      failure ? errorMessage(failure) : 'Produk diarsipkan.',
    )
    redirect(`${target.pathname}${target.search}`)
  }
  finish('products', 'Produk diarsipkan.', context, failure)
}

export async function saveEventAction(form: FormData) {
  let failure: unknown = null
  const context = catalogContext(form)
  const requestedId = nullableText(form, 'id')
  const nextExamId = nullableText(form, 'next_exam_id')
  let savedId = requestedId
  let actorId = ''
  try {
    const authorization = await actor(PERMISSIONS.EVENT_MANAGE)
    actorId = authorization.userId
    const startsAt = jakartaIso(form, 'starts_at')
    const endsAt = jakartaIso(form, 'ends_at')
    if (!startsAt || !endsAt) throw new Error('EVENT_FIELDS_REQUIRED')
    if (text(form, 'workflow') === '1' && !requestedId) {
      const assessment = nextExamId ? await assessmentCatalogService.getById(nextExamId) : null
      if (!assessment) throw new Error('EVENT_ASSESSMENT_NOT_READY')
      if (
        assessment.programCode.toUpperCase() !== context.programCode.toUpperCase() ||
        assessment.trackCode.toUpperCase() !== context.trackCode.toUpperCase()
      )
        throw new Error('EVENT_EXAM_MISMATCH')
      if (numberValue(form, 'capacity') < 1) throw new Error('EVENT_SESSION_CAPACITY_INVALID')
    }
    if (
      text(form, 'workflow') === '1' &&
      requestedId &&
      ['live', 'scheduled'].includes(text(form, 'status'))
    ) {
      const db = await createAdminClient()
      const { data: sessions, error } = await db
        .from('event_sessions')
        .select('exam_id')
        .eq('event_id', requestedId)
        .not('status', 'in', '(archived,cancelled)')
      if (error) throw error
      const catalog = await assessmentCatalogService.listDistributable()
      if (!sessions?.some((session) => catalog.some((exam) => exam.id === session.exam_id)))
        throw new Error('Konfigurasi sesi dengan assessment yang siap sebelum mengaktifkan Event.')
    }
    savedId = await adminEventManagementService.saveEvent({
      id: requestedId,
      code: text(form, 'code'),
      title: text(form, 'title'),
      slug: nullableText(form, 'slug'),
      description: nullableText(form, 'description'),
      flyerImageUrl: nullableText(form, 'flyer_image_url'),
      registrationStart: jakartaIso(form, 'registration_start'),
      registrationEnd: jakartaIso(form, 'registration_end'),
      startsAt,
      endsAt,
      status: text(form, 'status') || 'draft',
      context,
    })
    if (text(form, 'workflow') === '1' && !requestedId && nextExamId && savedId) {
      await adminEventManagementService.saveEventSession({
        eventId: savedId,
        examId: nextExamId,
        name: text(form, 'title'),
        startsAt,
        endsAt,
        capacity: numberValue(form, 'capacity'),
        status: 'scheduled',
        context,
      })
    }
  } catch (error) {
    failure = error
  }
  await auditAdminV2Action(
    {
      actorId,
      action: requestedId ? 'UPDATE_EVENT' : 'CREATE_EVENT',
      entityType: 'event',
      entityId: savedId,
      label: text(form, 'title') || text(form, 'code'),
      after: { code: text(form, 'code'), status: text(form, 'status') || 'draft' },
    },
    failure,
  )
  if (text(form, 'workflow') === '1') {
    revalidatePath('/admin/events')
    const target = new URL(
      adminReturnUrl(form.get('return_to'), `/admin/events?${contextQuery(context)}`),
      'http://admin.local',
    )
    if (savedId) {
      const returnState = adminRouteState(target.pathname)
      const returnsToCurrentEvent =
        returnState?.workspace === 'events' && returnState.context.event === savedId
      const returnTab = returnsToCurrentEvent ? returnState.context.tab || 'overview' : 'overview'
      const settingsSection =
        returnsToCurrentEvent && returnTab === 'settings'
          ? target.searchParams.get('settings_section') || 'event'
          : null
      target.pathname = '/admin/events'
      target.searchParams.set('program', context.programCode)
      target.searchParams.set('track', context.trackCode)
      target.searchParams.set('event', savedId)
      target.searchParams.set('tab', failure ? 'settings' : returnTab)
      target.searchParams.delete('new')
      target.searchParams.delete('edit')
      if (settingsSection) target.searchParams.set('settings_section', settingsSection)
      else target.searchParams.delete('settings_section')
    }
    if (failure) target.searchParams.set('error', errorMessage(failure))
    else
      target.searchParams.set('ok', requestedId ? 'Perubahan event tersimpan.' : 'Event tersimpan.')
    redirect(`${target.pathname}${target.search}`)
  }
  if (failure) {
    finish('events', 'Event tersimpan.', context, failure, requestedId, {
      new: requestedId ? null : '1',
      exam: nextExamId,
    })
  }
  if (nextExamId && savedId) {
    finish('events', 'Event tersimpan.', context, null, null, {
      session_event: savedId,
      exam: nextExamId,
    })
  }
  finish('events', 'Event tersimpan.', context, null, savedId)
}

export async function archiveEventAction(form: FormData) {
  let failure: unknown = null
  const context = catalogContext(form)
  const eventId = text(form, 'id')
  let actorId = ''
  try {
    const authorization = await actor(PERMISSIONS.EVENT_MANAGE)
    actorId = authorization.userId
    await adminEventManagementService.archiveEvent(eventId)
  } catch (error) {
    failure = error
  }
  await auditAdminV2Action(
    {
      actorId,
      action: 'ARCHIVE_EVENT',
      entityType: 'event',
      entityId: eventId,
      after: { status: 'archived' },
    },
    failure,
  )
  if (text(form, 'return_to')) {
    revalidatePath('/admin/events')
    const target = new URL(
      adminReturnUrl(form.get('return_to'), '/admin/events'),
      'http://admin.local',
    )
    target.searchParams.set(
      failure ? 'error' : 'ok',
      failure ? errorMessage(failure) : 'Event diarsipkan.',
    )
    redirect(`${target.pathname}${target.search}`)
  }
  finish('events', 'Event diarsipkan.', context, failure)
}

export async function saveEventSessionAction(form: FormData) {
  let failure: unknown = null
  const context = catalogContext(form)
  const eventId = text(form, 'event_id')
  const examId = text(form, 'exam_id')
  const sessionId = nullableText(form, 'id')
  let actorId = ''
  try {
    const authorization = await actor(PERMISSIONS.EVENT_MANAGE)
    actorId = authorization.userId
    const startsAt = jakartaIso(form, 'starts_at')
    const endsAt = jakartaIso(form, 'ends_at')
    if (!startsAt || !endsAt) throw new Error('EVENT_SESSION_TIME_INVALID')
    await adminEventManagementService.saveEventSession({
      id: sessionId,
      eventId,
      examId,
      name: text(form, 'name'),
      startsAt,
      endsAt,
      capacity: nullableNumber(form, 'capacity'),
      status: text(form, 'status') || 'scheduled',
      context,
    })
  } catch (error) {
    failure = error
  }
  await auditAdminV2Action(
    {
      actorId,
      action: sessionId ? 'UPDATE_EVENT_SESSION' : 'CREATE_EVENT_SESSION',
      entityType: 'event_session',
      entityId: sessionId,
      label: text(form, 'name'),
      after: { event_id: eventId, status: text(form, 'status') || 'scheduled' },
    },
    failure,
  )
  if (text(form, 'return_to')) {
    revalidatePath('/admin/events')
    const target = new URL(
      adminReturnUrl(form.get('return_to'), '/admin/events'),
      'http://admin.local',
    )
    target.searchParams.set(
      failure ? 'error' : 'ok',
      failure ? errorMessage(failure) : 'Sesi event tersimpan. Pantau peserta dari event ini.',
    )
    redirect(`${target.pathname}${target.search}`)
  }
  finish(
    'events',
    'Sesi event tersimpan.',
    context,
    failure,
    null,
    failure
      ? {
          session_event: eventId,
          exam: examId,
        }
      : {},
  )
}

export async function deleteEventSessionAction(form: FormData) {
  let failure: unknown = null
  const context = catalogContext(form)
  const eventId = text(form, 'event_id')
  const sessionId = text(form, 'id')
  let actorId = ''
  try {
    const authorization = await actor(PERMISSIONS.EVENT_MANAGE)
    actorId = authorization.userId
    await adminEventManagementService.deleteEventSession({ eventId, sessionId, context })
  } catch (error) {
    failure = error
  }
  await auditAdminV2Action(
    {
      actorId,
      action: 'DELETE_EVENT_SESSION',
      entityType: 'event_session',
      entityId: sessionId,
      before: { event_id: eventId },
    },
    failure,
  )
  if (text(form, 'return_to')) {
    revalidatePath('/admin/events')
    const target = new URL(
      adminReturnUrl(form.get('return_to'), '/admin/events'),
      'http://admin.local',
    )
    target.searchParams.set(
      failure ? 'error' : 'ok',
      failure ? errorMessage(failure) : 'Sesi event dihapus.',
    )
    redirect(`${target.pathname}${target.search}`)
  }
  finish('events', 'Sesi event dihapus.', context, failure, eventId || null)
}

export async function linkEventProductAction(form: FormData) {
  let failure: unknown = null
  const context = catalogContext(form)
  const eventId = text(form, 'event_id')
  let actorId = ''
  try {
    const authorization = await actor(PERMISSIONS.EVENT_MANAGE)
    actorId = authorization.userId
    await adminEventManagementService.linkEventProduct({
      eventId,
      sessionId: text(form, 'session_id'),
      productId: text(form, 'product_id'),
      status: text(form, 'status') || 'active',
    })
  } catch (error) {
    failure = error
  }
  await auditAdminV2Action(
    {
      actorId,
      action: 'LINK_EVENT_PRODUCT',
      entityType: 'event',
      entityId: eventId,
      after: { product_id: text(form, 'product_id'), session_id: text(form, 'session_id') },
    },
    failure,
  )
  if (text(form, 'return_to')) {
    revalidatePath('/admin/events')
    const target = new URL(
      adminReturnUrl(form.get('return_to'), '/admin/events'),
      'http://admin.local',
    )
    target.searchParams.set(
      failure ? 'error' : 'ok',
      failure
        ? errorMessage(failure)
        : 'Tiket terhubung. Aktifkan produk setelah readiness terpenuhi.',
    )
    redirect(`${target.pathname}${target.search}`)
  }
  finish('events', 'Tiket produk terhubung ke event.', context, failure, eventId || null)
}

export async function saveExamAction(form: FormData) {
  let failure: unknown = null
  const context = catalogContext(form)
  const requestedId = nullableText(form, 'id')
  let savedId = requestedId
  let actorId = ''
  try {
    const authorization = await actor(PERMISSIONS.EXAM_MANAGE)
    actorId = authorization.userId
    savedId = await adminExamManagementService.saveExam({
      id: requestedId,
      examTypeCode: text(form, 'exam_type_code'),
      title: text(form, 'title'),
      slug: nullableText(form, 'slug'),
      durationSeconds: nullableNumber(form, 'duration_seconds'),
      attemptLimit: nullableNumber(form, 'attempt_limit'),
      questionOrder: text(form, 'question_order') || 'random',
      resultVisibility: text(form, 'result_visibility') || 'instant',
      accessType: text(form, 'access_type') || 'FREE',
      status: text(form, 'status') || 'draft',
      tokenCost: numberValue(form, 'token_cost', 0),
      startsAt: jakartaIso(form, 'starts_at'),
      endsAt: jakartaIso(form, 'ends_at'),
      actorId: authorization.userId,
      context,
    })
  } catch (error) {
    failure = error
  }
  await auditAdminV2Action(
    {
      actorId,
      action: requestedId ? 'UPDATE_EXAM' : 'CREATE_EXAM',
      entityType: 'exam',
      entityId: savedId,
      label: text(form, 'title'),
      after: {
        exam_type_code: text(form, 'exam_type_code'),
        status: text(form, 'status') || 'draft',
        token_cost: numberValue(form, 'token_cost', 0),
      },
    },
    failure,
  )
  finish('exams', 'Exam tersimpan.', context, failure, savedId)
}

export async function archiveExamAction(form: FormData) {
  let failure: unknown = null
  const context = catalogContext(form)
  const examId = text(form, 'id')
  let actorId = ''
  try {
    const authorization = await actor(PERMISSIONS.EXAM_MANAGE)
    actorId = authorization.userId
    await adminExamManagementService.archiveExam(examId)
  } catch (error) {
    failure = error
  }
  await auditAdminV2Action(
    {
      actorId,
      action: 'ARCHIVE_EXAM',
      entityType: 'exam',
      entityId: examId,
      after: { status: 'archived' },
    },
    failure,
  )
  finish('exams', 'Exam diarsipkan.', context, failure)
}

export async function saveExamSectionAction(form: FormData) {
  let failure: unknown = null
  const context = catalogContext(form)
  const examId = text(form, 'exam_id')
  const sectionId = nullableText(form, 'id')
  let actorId = ''
  try {
    const authorization = await actor(PERMISSIONS.EXAM_MANAGE)
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
  await auditAdminV2Action(
    {
      actorId,
      action: sectionId ? 'UPDATE_EXAM_SECTION' : 'CREATE_EXAM_SECTION',
      entityType: 'exam',
      entityId: examId,
      label: text(form, 'title'),
      after: {
        question_count: nullableNumber(form, 'question_count'),
        passing_score: nullableNumber(form, 'passing_score'),
      },
    },
    failure,
  )
  finish('exams', 'Section exam tersimpan.', context, failure, examId || null)
}
