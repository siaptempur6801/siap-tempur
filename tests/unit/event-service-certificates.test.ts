import { afterEach, describe, expect, it, vi } from 'vitest'
import { eventRepository } from '@/src/repositories/event.repository'
import { EventService } from '@/src/services/event.service'

describe('event certificate visibility', () => {
  afterEach(() => vi.restoreAllMocks())

  it('exposes an event certificate after the event and attempt are completed', async () => {
    const eventId = '11111111-1111-4111-8111-111111111111'
    const userId = '22222222-2222-4222-8222-222222222222'
    const sessionId = '33333333-3333-4333-8333-333333333333'
    const examId = '44444444-4444-4444-8444-444444444444'

    vi.spyOn(eventRepository, 'listVisibleEvents').mockResolvedValue([
      {
        id: eventId,
        code: 'EVENT-1',
        title: 'Tryout Akbar',
        slug: 'tryout-akbar',
        event_type: 'tryout_akbar',
        program_id: 'program-id',
        track_id: 'track-id',
        description: null,
        flyer_image_url:
          'https://lpgrivowdcepcxradavu.supabase.co/storage/v1/object/public/event-flyers/admin/event.webp',
        registration_start: null,
        registration_end: null,
        starts_at: '2026-09-01T00:00:00.000Z',
        ends_at: '2026-09-01T02:00:00.000Z',
        status: 'live',
      },
    ])
    vi.spyOn(eventRepository, 'listSessions').mockResolvedValue([
      {
        id: sessionId,
        event_id: eventId,
        exam_id: examId,
        name: 'Sesi 1',
        starts_at: '2026-09-01T00:00:00.000Z',
        ends_at: '2026-09-01T02:00:00.000Z',
        capacity: 100,
        status: 'closed',
      },
    ])
    vi.spyOn(eventRepository, 'listRegistrations').mockResolvedValue([
      {
        id: 'registration-id',
        event_id: eventId,
        session_id: sessionId,
        user_id: userId,
        order_id: null,
        registration_number: 'REG-1',
        status: 'completed',
        created_at: '2026-09-01T00:00:00.000Z',
      },
    ])
    vi.spyOn(eventRepository, 'listUserEventAttempts').mockResolvedValue([
      {
        id: 'attempt-id',
        exam_id: examId,
        status: 'completed',
        started_at: '2026-09-01T00:00:00.000Z',
        submitted_at: '2026-09-01T01:30:00.000Z',
        duration_used_seconds: 5400,
        total_score: 420,
        metadata: { eventId },
      },
    ])
    vi.spyOn(eventRepository, 'listUserEventCertificates').mockResolvedValue([
      {
        event_id: eventId,
        certificate_number: 'ST-EVENT-1-W1-11111111-22222222',
        certificate_name: 'Budi Santoso',
        certificate_kind: 'winner_1',
        name_locked_at: '2026-09-01T02:01:00.000Z',
      },
    ])
    vi.spyOn(eventRepository, 'getExamQuestionCount').mockResolvedValue(110)
    vi.spyOn(eventRepository, 'resolveSessionExam').mockResolvedValue({
      id: examId,
      programId: 'program-id',
      trackId: 'track-id',
      examTypeId: 'event-type-id',
      examTypeCode: 'EVENT',
      title: 'Tryout Akbar',
      slug: 'tryout-akbar',
      durationSeconds: 7200,
      attemptLimit: 1,
      questionOrder: 'fixed',
      accessType: 'free',
      requiredFeatureId: null,
      tokenCost: 0,
      startsAt: null,
      endsAt: null,
      subjectId: null,
      subjectCode: null,
    })
    vi.spyOn(eventRepository, 'countRegistrationsForSessions').mockResolvedValue(
      new Map([[sessionId, 1]]),
    )

    const [event] = await new EventService().getUserEventPageData(userId)

    expect(event).toMatchObject({
      status: 'closed',
      participant_status: 'completed',
      test_session_status: 'completed',
      certificate_enabled: true,
      certificate_released_at: '2026-09-01T02:00:00.000Z',
      certificate_number: 'ST-EVENT-1-W1-11111111-22222222',
      certificate_name_locked_at: '2026-09-01T02:01:00.000Z',
      flyer_image_url:
        'https://lpgrivowdcepcxradavu.supabase.co/storage/v1/object/public/event-flyers/admin/event.webp',
    })
  })
})
