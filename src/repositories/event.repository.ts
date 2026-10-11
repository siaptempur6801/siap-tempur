import { createV2AdminClient } from '@/lib/utils/supabase/server'
import type { Json } from '@/types/database.types'
import type { ResolvedExam } from '@/src/repositories/exam.repository'
import { assessmentKindForExamType, assessmentIsReady } from '@/src/domain/assessment'

export type CanonicalEventRow = {
  id: string
  code: string
  title: string
  slug: string
  event_type: string
  program_id: string
  track_id: string
  description: string | null
  flyer_image_url: string | null
  registration_start: string | null
  registration_end: string | null
  starts_at: string
  ends_at: string
  status: string
}

export type CanonicalEventSessionRow = {
  id: string
  event_id: string
  exam_id: string
  name: string
  starts_at: string
  ends_at: string
  capacity: number | null
  status: string
}

type CanonicalEventRegistrationRow = {
  id: string
  event_id: string
  session_id: string | null
  user_id: string
  order_id: string | null
  registration_number: string
  status: string
  created_at: string
}

type CanonicalEventAttemptRow = {
  id: string
  exam_id: string
  status: string
  started_at: string | null
  submitted_at: string | null
  duration_used_seconds: number | null
  total_score: number | null
  metadata: Json
}

type CanonicalEventCertificateRow = {
  event_id: string
  certificate_number: string
  certificate_name: string
  certificate_kind: string
  name_locked_at: string | null
}

function metadataString(metadata: Json, key: string) {
  if (!metadata || Array.isArray(metadata) || typeof metadata !== 'object') return null
  const value = metadata[key]
  return typeof value === 'string' ? value : null
}

class EventRepository {
  async listVisibleEvents(): Promise<CanonicalEventRow[]> {
    const admin = await createV2AdminClient()
    const { data, error } = await admin
      .from('events')
      .select(
        'id, code, title, slug, event_type, program_id, track_id, description, flyer_image_url, registration_start, registration_end, starts_at, ends_at, status',
      )
      .in('status', [
        'scheduled',
        'SCHEDULED',
        'live',
        'LIVE',
        'closed',
        'CLOSED',
        'active',
        'ACTIVE',
      ])
      .order('starts_at', { ascending: true })
    if (error) throw error
    return (data ?? []) as CanonicalEventRow[]
  }

  async getEvent(eventId: string): Promise<CanonicalEventRow | null> {
    const admin = await createV2AdminClient()
    const { data, error } = await admin
      .from('events')
      .select(
        'id, code, title, slug, event_type, program_id, track_id, description, flyer_image_url, registration_start, registration_end, starts_at, ends_at, status',
      )
      .eq('id', eventId)
      .maybeSingle()
    if (error) throw error
    return data as CanonicalEventRow | null
  }

  /**
   * Menutup event yang sudah melewati `ends_at` tetapi status tersimpannya masih
   * terbuka.
   *
   * ## Kenapa ini perlu
   *
   * `event.service.ts` menurunkan status saat dibaca (`statusFor()` → `closed`
   * bila `now > ends_at`), jadi halaman tidak pernah menampilkan status yang
   * salah. Yang basi adalah KOLOM `events.status` — dan kolom itu dipakai
   * pembaca yang tidak menurunkan status sendiri:
   *   - leaderboard event (`getLiveLeaderboardAction`)
   *   - pelepasan sertifikat (`certificate_enabled` / `certificate_released_at`)
   *   - filter daftar event admin
   *   - `listVisibleEvents()` yang memfilter `.in('status', [...])`
   *
   * ## Kenapa IDEMPOTEN
   *
   * Hanya menyentuh baris yang statusnya masih terbuka, sehingga dijalankan
   * berkali-kali tidak berefek tambahan. Ini juga membuatnya aman dijalankan
   * sebagai cron tanpa penyimpanan state.
   *
   * ## Kenapa `.lt('ends_at', now)` bukan `<=`
   *
   * Event yang baru saja berakhir tepat pada detik ini masih dianggap berjalan;
   * cron berikutnya akan menutupnya.
   *
   * @returns jumlah baris yang benar-benar ditutup
   */
  async closeExpiredEvents(now = new Date().toISOString()): Promise<number> {
    const admin = await createV2AdminClient()
    const { data, error } = await admin
      .from('events')
      .update({ status: 'closed' })
      .in('status', ['scheduled', 'SCHEDULED', 'live', 'LIVE', 'active', 'ACTIVE'])
      .lt('ends_at', now)
      .select('id')
    if (error) throw error
    return (data ?? []).length
  }

  async listSessions(eventIds: string[]): Promise<CanonicalEventSessionRow[]> {
    if (eventIds.length === 0) return []
    const admin = await createV2AdminClient()
    const { data, error } = await admin
      .from('event_sessions')
      .select('id, event_id, exam_id, name, starts_at, ends_at, capacity, status')
      .in('event_id', eventIds)
      .order('starts_at', { ascending: true })
    if (error) throw error
    return (data ?? []) as CanonicalEventSessionRow[]
  }

  async listSessionsForEvent(eventId: string): Promise<CanonicalEventSessionRow[]> {
    return this.listSessions([eventId])
  }

  async getSession(sessionId: string): Promise<CanonicalEventSessionRow | null> {
    const admin = await createV2AdminClient()
    const { data, error } = await admin
      .from('event_sessions')
      .select('id, event_id, exam_id, name, starts_at, ends_at, capacity, status')
      .eq('id', sessionId)
      .maybeSingle()
    if (error) throw error
    return data as CanonicalEventSessionRow | null
  }

  async listRegistrations(
    userId: string,
    eventIds: string[],
  ): Promise<CanonicalEventRegistrationRow[]> {
    if (eventIds.length === 0) return []
    const admin = await createV2AdminClient()
    const { data, error } = await admin
      .from('event_registrations')
      .select(
        'id, event_id, session_id, user_id, order_id, registration_number, status, created_at',
      )
      .eq('user_id', userId)
      .in('event_id', eventIds)
    if (error) throw error
    return (data ?? []) as CanonicalEventRegistrationRow[]
  }

  async getRegistration(
    userId: string,
    eventId: string,
  ): Promise<CanonicalEventRegistrationRow | null> {
    const rows = await this.listRegistrations(userId, [eventId])
    return rows[0] ?? null
  }

  async createRegistration(input: {
    eventId: string
    sessionId: string | null
    userId: string
    registrationNumber: string
  }): Promise<CanonicalEventRegistrationRow> {
    const admin = await createV2AdminClient()
    const { data, error } = await admin
      .from('event_registrations')
      .insert({
        event_id: input.eventId,
        session_id: input.sessionId,
        user_id: input.userId,
        registration_number: input.registrationNumber,
        status: 'registered',
      })
      .select(
        'id, event_id, session_id, user_id, order_id, registration_number, status, created_at',
      )
      .single()
    if (error) throw error
    return data as CanonicalEventRegistrationRow
  }

  async updateRegistrationStatus(registrationId: string, status: string) {
    const admin = await createV2AdminClient()
    const { error } = await admin
      .from('event_registrations')
      .update({ status })
      .eq('id', registrationId)
    if (error) throw error
  }

  async countRegistrationsForSessions(sessionIds: string[]) {
    if (sessionIds.length === 0) return new Map<string, number>()
    const admin = await createV2AdminClient()
    const { data, error } = await admin
      .from('event_registrations')
      .select('session_id, status')
      .in('session_id', sessionIds)
      .not('status', 'in', '(cancelled,CANCELLED)')
    if (error) throw error

    const counts = new Map<string, number>()
    for (const row of (data ?? []) as Array<{ session_id: string | null; status: string }>) {
      if (!row.session_id) continue
      counts.set(row.session_id, (counts.get(row.session_id) ?? 0) + 1)
    }
    return counts
  }

  async listUserEventAttempts(
    userId: string,
    eventIds?: string[],
  ): Promise<CanonicalEventAttemptRow[]> {
    const admin = await createV2AdminClient()
    const { data, error } = await admin
      .from('exam_attempts')
      .select(
        'id, exam_id, status, started_at, submitted_at, duration_used_seconds, total_score, metadata',
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) throw error

    const allowed = eventIds ? new Set(eventIds) : null
    return ((data ?? []) as CanonicalEventAttemptRow[]).filter((row) => {
      const eventId = metadataString(row.metadata, 'eventId')
      return Boolean(eventId && (!allowed || allowed.has(eventId)))
    })
  }

  async getUserEventAttempt(
    userId: string,
    eventId: string,
  ): Promise<CanonicalEventAttemptRow | null> {
    const admin = await createV2AdminClient()
    const { data, error } = await admin
      .from('exam_attempts')
      .select(
        'id, exam_id, status, started_at, submitted_at, duration_used_seconds, total_score, metadata',
      )
      .eq('user_id', userId)
      .filter('source', 'eq', 'b2c')
      .is('assignment_id', null)
      .eq('metadata->>eventId', eventId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw error
    return data as CanonicalEventAttemptRow | null
  }

  async listUserEventCertificates(
    userId: string,
    eventIds: string[],
  ): Promise<CanonicalEventCertificateRow[]> {
    if (eventIds.length === 0) return []
    const admin = await createV2AdminClient()
    const { data, error } = await admin
      .from('certificates')
      .select('event_id, certificate_number, certificate_name, certificate_kind, name_locked_at')
      .eq('user_id', userId)
      .in('event_id', eventIds)
    if (error) throw error
    return (data ?? []) as CanonicalEventCertificateRow[]
  }

  async resolveSessionExam(
    session: CanonicalEventSessionRow,
  ): Promise<(ResolvedExam & { programCode?: string; trackCode?: string }) | null> {
    const admin = await createV2AdminClient()
    const { data: examData, error: examError } = await admin
      .from('exams')
      .select(
        'id, program_id, track_id, exam_type_id, title, slug, duration_seconds, attempt_limit, question_order, access_type, required_feature_id, token_cost, starts_at, ends_at, status',
      )
      .eq('id', session.exam_id)
      .maybeSingle()
    if (examError) throw examError
    if (!examData) return null

    const exam = examData as {
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
    }

    const { data: typeData, error: typeError } = await admin
      .from('exam_types')
      .select('code')
      .eq('id', exam.exam_type_id)
      .maybeSingle()
    if (typeError) throw typeError
    if (!typeData) return null
    const typeCode = String(typeData.code).toUpperCase()
    const legacyEventType = typeCode === 'EVENT'
    if (!legacyEventType && !assessmentKindForExamType(typeCode)) return null
    if (
      !legacyEventType &&
      !assessmentIsReady(exam.status, await this.getExamQuestionCount(exam.id))
    )
      return null

    const [{ data: program, error: programError }, { data: track, error: trackError }] =
      await Promise.all([
        admin.from('programs').select('code').eq('id', exam.program_id).maybeSingle(),
        admin.from('tracks').select('code').eq('id', exam.track_id).maybeSingle(),
      ])
    if (programError) throw programError
    if (trackError) throw trackError

    return {
      id: exam.id,
      programId: exam.program_id,
      trackId: exam.track_id,
      examTypeId: exam.exam_type_id,
      examTypeCode: typeCode as ResolvedExam['examTypeCode'],
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
      subjectId: null,
      subjectCode: null,
      programCode: String(program?.code ?? ''),
      trackCode: String(track?.code ?? ''),
    }
  }

  async getExamQuestionCount(examId: string) {
    const admin = await createV2AdminClient()
    const { count: staticCount, error: staticError } = await admin
      .from('exam_question_items')
      .select('question_id', { head: true, count: 'exact' })
      .eq('exam_id', examId)
    if (staticError) throw staticError
    if ((staticCount ?? 0) > 0) return staticCount ?? 0

    const { data, error } = await admin
      .from('exam_sections')
      .select('question_count')
      .eq('exam_id', examId)
    if (error) throw error
    return ((data ?? []) as Array<{ question_count: number | null }>).reduce(
      (sum, row) => sum + (row.question_count ?? 0),
      0,
    )
  }

  getAttemptEventId(metadata: Json) {
    return metadataString(metadata, 'eventId')
  }
}

export const eventRepository = new EventRepository()
