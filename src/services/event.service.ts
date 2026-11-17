import { randomUUID } from 'node:crypto'
import { attemptRepository } from '@/src/repositories/attempt.repository'
import {
  eventRepository,
  type CanonicalEventRow,
  type CanonicalEventSessionRow,
} from '@/src/repositories/event.repository'
import { examRepository } from '@/src/repositories/exam.repository'
import { tkaFullExamRpcService } from '@/src/services/tka-full-exam-rpc.service'
import { logger } from '@/lib/logger'
import type { Json } from '@/types/database.types'

export type EventDomainErrorCode =
  | 'EVENT_NOT_FOUND'
  | 'EVENT_REGISTRATION_CLOSED'
  | 'EVENT_SESSION_NOT_FOUND'
  | 'EVENT_SESSION_FULL'
  | 'EVENT_NOT_STARTED'
  | 'EVENT_START_WINDOW_CLOSED'
  | 'EVENT_NOT_REGISTERED'
  | 'EVENT_EXAM_NOT_CONFIGURED'
  | 'QUESTION_BANK_INCOMPLETE'

export class EventDomainError extends Error {
  constructor(
    public readonly code: EventDomainErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'EventDomainError'
  }
}

function statusFor(event: CanonicalEventRow) {
  const now = Date.now()
  if (String(event.status).toLowerCase() === 'closed' || now >= Date.parse(event.ends_at))
    return 'closed' as const
  if (now >= Date.parse(event.starts_at)) return 'live' as const
  return 'scheduled' as const
}

function isRegistrationOpen(event: CanonicalEventRow) {
  if (statusFor(event) === 'closed') return false
  const now = Date.now()
  const start = event.registration_start ? Date.parse(event.registration_start) : null
  const end = event.registration_end
    ? Date.parse(event.registration_end)
    : Date.parse(event.ends_at)
  return (start === null || now >= start) && now <= end
}

function sessionLatestStart(session: CanonicalEventSessionRow, durationSeconds: number | null) {
  const starts = Date.parse(session.starts_at)
  const ends = Date.parse(session.ends_at)
  const sessionSeconds = Math.max(1, Math.floor((ends - starts) / 1000))
  const duration = Math.min(durationSeconds ?? sessionSeconds, sessionSeconds)
  return ends - duration * 1000
}

function remainingDurationSeconds(
  session: CanonicalEventSessionRow,
  configuredDuration: number | null,
) {
  const remaining = Math.max(1, Math.floor((Date.parse(session.ends_at) - Date.now()) / 1000))
  return Math.min(configuredDuration ?? remaining, remaining)
}

function isUniqueViolation(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === '23505')
}

export class EventService {
  /**
   * Menutup event yang sudah melewati `ends_at` (bookkeeping status tersimpan).
   *
   * Halaman TIDAK bergantung pada ini — `statusFor()` sudah menurunkan status
   * saat dibaca. Yang bergantung pada kolom tersimpan adalah leaderboard event,
   * pelepasan sertifikat, filter admin, dan `listVisibleEvents()`.
   *
   * Dijalankan dari cron (`/api/cron/reconcile-payments`), bukan dari render
   * halaman publik — sebelumnya fungsi serupa dipanggil di dalam render GET
   * `/cpns`, sehingga setiap crawl anonim menjalankan UPDATE dengan service role
   * dan halaman itu tidak pernah bisa di-cache.
   *
   * Idempoten: hanya menyentuh baris yang statusnya masih terbuka, jadi aman
   * dijalankan berkali-kali.
   */
  async closeExpiredEvents(now?: string) {
    const closed = await eventRepository.closeExpiredEvents(now)
    if (closed > 0) {
      logger.info('Event kedaluwarsa ditutup otomatis', { closedCount: closed })
    }
    return { closed }
  }

  async getUserEventPageData(userId: string) {
    const events = await eventRepository.listVisibleEvents()
    if (events.length === 0) return []

    const eventIds = events.map((event) => event.id)
    const [sessions, registrations, attempts, certificates] = await Promise.all([
      eventRepository.listSessions(eventIds),
      eventRepository.listRegistrations(userId, eventIds),
      eventRepository.listUserEventAttempts(userId, eventIds),
      eventRepository.listUserEventCertificates(userId, eventIds),
    ])

    const sessionsByEvent = new Map<string, CanonicalEventSessionRow[]>()
    for (const session of sessions) {
      const rows = sessionsByEvent.get(session.event_id) ?? []
      rows.push(session)
      sessionsByEvent.set(session.event_id, rows)
    }
    const registrationByEvent = new Map(registrations.map((row) => [row.event_id, row]))
    const certificateByEvent = new Map(certificates.map((row) => [row.event_id, row]))
    const attemptByEvent = new Map<string, (typeof attempts)[number]>()
    for (const attempt of attempts) {
      const eventId = eventRepository.getAttemptEventId(attempt.metadata)
      if (eventId && !attemptByEvent.has(eventId)) attemptByEvent.set(eventId, attempt)
    }

    const questionCountByExam = new Map<string, number>()
    const durationByExam = new Map<string, number | null>()
    const sessionPathByExam = new Map<string, string>()
    const representativeSessionByExam = new Map<string, CanonicalEventSessionRow>()
    for (const session of sessions) {
      if (!representativeSessionByExam.has(session.exam_id))
        representativeSessionByExam.set(session.exam_id, session)
    }
    await Promise.all(
      Array.from(representativeSessionByExam.entries()).map(async ([examId, session]) => {
        const [questionCount, exam] = await Promise.all([
          eventRepository.getExamQuestionCount(examId),
          eventRepository.resolveSessionExam(session),
        ])
        questionCountByExam.set(examId, questionCount)
        durationByExam.set(examId, exam?.durationSeconds ?? null)
        if (exam) sessionPathByExam.set(examId, this.sessionPath(exam))
      }),
    )

    const sessionRegistrationCounts = await eventRepository.countRegistrationsForSessions(
      sessions.map((row) => row.id),
    )

    return events.map((event) => {
      const registration = registrationByEvent.get(event.id) ?? null
      const certificate = certificateByEvent.get(event.id) ?? null
      const eventSessions = sessionsByEvent.get(event.id) ?? []
      const selectedSession = registration?.session_id
        ? (eventSessions.find((row) => row.id === registration.session_id) ??
          eventSessions[0] ??
          null)
        : (eventSessions[0] ?? null)
      const attempt = attemptByEvent.get(event.id) ?? null
      const sessionSeconds = selectedSession
        ? Math.max(
            1,
            Math.floor(
              (Date.parse(selectedSession.ends_at) - Date.parse(selectedSession.starts_at)) / 1000,
            ),
          )
        : Math.max(1, Math.floor((Date.parse(event.ends_at) - Date.parse(event.starts_at)) / 1000))
      const configuredDuration = selectedSession
        ? (durationByExam.get(selectedSession.exam_id) ?? null)
        : null
      const examDurationSeconds = Math.min(configuredDuration ?? sessionSeconds, sessionSeconds)
      const latestStart = selectedSession
        ? sessionLatestStart(selectedSession, examDurationSeconds)
        : Date.parse(event.starts_at)
      const startGraceMinutes = Math.max(
        0,
        Math.floor(
          (latestStart - Date.parse(selectedSession?.starts_at ?? event.starts_at)) / 60000,
        ),
      )
      const effectiveStatus = statusFor(event)

      return {
        id: event.id,
        title: event.title,
        description: event.description,
        starts_at: selectedSession?.starts_at ?? event.starts_at,
        ends_at: selectedSession?.ends_at ?? event.ends_at,
        start_grace_minutes: startGraceMinutes,
        duration_minutes: Math.max(1, Math.ceil(examDurationSeconds / 60)),
        max_participants: selectedSession?.capacity ?? null,
        registered_participants: selectedSession
          ? (sessionRegistrationCounts.get(selectedSession.id) ?? 0)
          : 0,
        requires_code: false,
        group_link: null,
        flyer_image_url: event.flyer_image_url,
        is_paid: false,
        price: 0,
        status: effectiveStatus,
        certificate_enabled: effectiveStatus === 'closed',
        certificate_released_at: effectiveStatus === 'closed' ? event.ends_at : null,
        certificate_number: certificate?.certificate_number ?? null,
        certificate_name: certificate?.certificate_name ?? null,
        certificate_kind: certificate?.certificate_kind ?? null,
        certificate_name_locked_at: certificate?.name_locked_at ?? null,
        participant_id: registration?.id ?? null,
        participant_status: registration?.status ?? null,
        session_id: attempt?.id ?? null,
        event_session_status: registration?.status ?? null,
        test_session_status: attempt?.status ?? null,
        question_count: selectedSession
          ? (questionCountByExam.get(selectedSession.exam_id) ?? 0)
          : 0,
        session_path: selectedSession
          ? (sessionPathByExam.get(selectedSession.exam_id) ?? '/cpns/dashboard/tryout')
          : '/cpns/dashboard/tryout',
        payment_status: null,
        payment_order_id: null,
        payment_snap_token: null,
      }
    })
  }

  async register(userId: string, eventId: string) {
    const existing = await eventRepository.getRegistration(userId, eventId)
    if (existing) return { registration: existing, alreadyRegistered: true }

    const event = await eventRepository.getEvent(eventId)
    if (!event) throw new EventDomainError('EVENT_NOT_FOUND', 'Event tidak ditemukan')
    if (!isRegistrationOpen(event)) {
      throw new EventDomainError('EVENT_REGISTRATION_CLOSED', 'Pendaftaran event sudah ditutup')
    }

    const sessions = (await eventRepository.listSessionsForEvent(eventId))
      .filter((session) =>
        ['scheduled', 'live', 'active'].includes(String(session.status).toLowerCase()),
      )
      .filter((session) => Date.parse(session.ends_at) > Date.now())
    if (sessions.length === 0) {
      throw new EventDomainError('EVENT_SESSION_NOT_FOUND', 'Sesi event belum tersedia')
    }

    const counts = await eventRepository.countRegistrationsForSessions(
      sessions.map((session) => session.id),
    )
    const session = sessions.find(
      (candidate) =>
        candidate.capacity === null || (counts.get(candidate.id) ?? 0) < candidate.capacity,
    )
    if (!session) throw new EventDomainError('EVENT_SESSION_FULL', 'Kuota sesi event sudah penuh')

    try {
      const registration = await eventRepository.createRegistration({
        eventId,
        sessionId: session.id,
        userId,
        registrationNumber: `EVT-${event.code}-${randomUUID().slice(0, 8).toUpperCase()}`,
      })
      return { registration, alreadyRegistered: false }
    } catch (error) {
      // The unique (event_id, user_id) constraint is the race arbiter.
      // A simultaneous second registration returns that canonical row.
      if (!isUniqueViolation(error)) throw error
      const raced = await eventRepository.getRegistration(userId, eventId)
      if (!raced) throw error
      return { registration: raced, alreadyRegistered: true }
    }
  }

  async start(userId: string, eventId: string) {
    const event = await eventRepository.getEvent(eventId)
    if (!event) throw new EventDomainError('EVENT_NOT_FOUND', 'Event tidak ditemukan')

    const registration = await eventRepository.getRegistration(userId, eventId)
    if (!registration || ['cancelled', 'CANCELLED'].includes(registration.status)) {
      throw new EventDomainError('EVENT_NOT_REGISTERED', 'Daftar event terlebih dahulu')
    }
    if (!registration.session_id) {
      throw new EventDomainError('EVENT_SESSION_NOT_FOUND', 'Registrasi belum memiliki sesi event')
    }

    const session = await eventRepository.getSession(registration.session_id)
    if (!session || session.event_id !== eventId) {
      throw new EventDomainError('EVENT_SESSION_NOT_FOUND', 'Sesi event tidak ditemukan')
    }

    const exam = await eventRepository.resolveSessionExam(session)
    if (!exam)
      throw new EventDomainError(
        'EVENT_EXAM_NOT_CONFIGURED',
        'Assessment katalog event belum tersedia atau belum siap',
      )

    const existing = await eventRepository.getUserEventAttempt(userId, eventId)
    if (existing) {
      if (['in_progress', 'created'].includes(String(existing.status).toLowerCase()))
        await attemptRepository.waitForAttemptQuestions(existing.id)
      return {
        attemptId: existing.id,
        resumed: ['in_progress', 'created'].includes(String(existing.status).toLowerCase()),
        completed: String(existing.status).toLowerCase() === 'completed',
        sessionPath: this.sessionPath(exam),
      }
    }

    const now = Date.now()
    const eventStartsAt = Date.parse(event.starts_at)
    if (Number.isFinite(eventStartsAt) && now < eventStartsAt) {
      throw new EventDomainError('EVENT_NOT_STARTED', 'Event belum dimulai')
    }
    if (statusFor(event) === 'closed') {
      throw new EventDomainError('EVENT_START_WINDOW_CLOSED', 'Waktu masuk event sudah ditutup')
    }
    const startsAt = Date.parse(session.starts_at)
    if (now < startsAt) throw new EventDomainError('EVENT_NOT_STARTED', 'Sesi event belum dimulai')
    if (
      now > sessionLatestStart(session, exam.durationSeconds) ||
      now >= Date.parse(session.ends_at)
    ) {
      throw new EventDomainError('EVENT_START_WINDOW_CLOSED', 'Waktu masuk event sudah ditutup')
    }

    // TKA SMP tryout modes use the existing section-aware RPC engine (the
    // same engine used by direct access). Drill and CPNS keep their existing
    // shared Schema V2 attempt flow.
    if (
      exam.programCode?.toUpperCase() === 'TKA' &&
      exam.trackCode?.toUpperCase() === 'SMP' &&
      ['FULL_TRYOUT', 'MINI_TRYOUT'].includes(exam.examTypeCode)
    ) {
      const started = await tkaFullExamRpcService.startSmpExam({
        userId,
        examSlug: exam.slug,
        context: { type: 'EVENT', eventId },
      })
      await eventRepository.updateRegistrationStatus(registration.id, 'started')
      return {
        attemptId: started.attemptId,
        resumed: started.resumed,
        completed: false,
        sessionPath: this.sessionPath(exam),
      }
    }

    let questions
    try {
      questions = await examRepository.buildQuestionSet({ exam })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (message.startsWith('QUESTION_BANK_INCOMPLETE') || message === 'QUESTION_BANK_EMPTY') {
        throw new EventDomainError('QUESTION_BANK_INCOMPLETE', 'Bank soal event belum lengkap')
      }
      throw error
    }

    const durationSeconds = remainingDurationSeconds(session, exam.durationSeconds)
    const metadata: Record<string, Json> = {
      schemaVersion: 2,
      practiceKind: 'event',
      examTypeCode: exam.examTypeCode,
      programCode: exam.programCode ?? 'CPNS',
      trackCode: exam.trackCode ?? 'SKD',
      eventId,
      eventSessionId: session.id,
      eventRegistrationId: registration.id,
      durationSeconds,
    }
    let attempt
    try {
      attempt = await attemptRepository.createAttemptWithQuestions({
        userId,
        examId: exam.id,
        metadata,
        questions,
      })
    } catch (error) {
      // The database index guarantees one active attempt for this user,
      // assessment, and event. Re-read the winner after a concurrent start.
      if (!isUniqueViolation(error)) throw error
      const raced = await eventRepository.getUserEventAttempt(userId, eventId)
      if (!raced) throw error
      if (['in_progress', 'created'].includes(String(raced.status).toLowerCase()))
        await attemptRepository.waitForAttemptQuestions(raced.id)
      return {
        attemptId: raced.id,
        resumed: ['in_progress', 'created'].includes(String(raced.status).toLowerCase()),
        completed: String(raced.status).toLowerCase() === 'completed',
        sessionPath: this.sessionPath(exam),
      }
    }

    try {
      await eventRepository.updateRegistrationStatus(registration.id, 'started')
    } catch (error) {
      await attemptRepository.deleteAttempt(attempt.id).catch(() => undefined)
      throw error
    }

    return {
      attemptId: attempt.id,
      resumed: false,
      completed: false,
      sessionPath: this.sessionPath(exam),
    }
  }

  private sessionPath(exam: { programCode?: string; trackCode?: string }) {
    return exam.programCode?.toUpperCase() === 'TKA'
      ? `/tka/${(exam.trackCode ?? 'SMP').toLowerCase()}/tryout`
      : '/cpns/dashboard/tryout'
  }
}

export const eventService = new EventService()
