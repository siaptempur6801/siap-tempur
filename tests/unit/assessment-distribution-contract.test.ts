import { afterEach, describe, expect, it, vi } from 'vitest'
import { eventRepository } from '@/src/repositories/event.repository'
import { EventService } from '@/src/services/event.service'
import { tkaFullExamRpcService } from '@/src/services/tka-full-exam-rpc.service'
import {
    assessmentDomainForProgram,
    assessmentIsReady,
    assessmentKindForExamType,
} from '@/src/domain/assessment'
import {
    parseQuestionSnapshotOption,
    parseQuestionSnapshotStimulus,
} from '@/src/domain/question-snapshot'

describe('assessment distribution contract', () => {
    it('maps only learning domains and first class assessment kinds', () => {
        expect(assessmentDomainForProgram('tka')).toBe('TKA')
        expect(assessmentDomainForProgram('event')).toBeNull()
        expect(assessmentKindForExamType('mini_tryout')).toBe('MINI_TRYOUT')
        expect(assessmentKindForExamType('event')).toBeNull()
    })

    it('requires available status and configured question content', () => {
        expect(assessmentIsReady('active', 1)).toBe(true)
        expect(assessmentIsReady('draft', 100)).toBe(false)
        expect(assessmentIsReady('published', 0)).toBe(false)
    })
})

describe('shared question snapshot parser', () => {
    it('normalizes answer options for both remedial and historical wrong bank views', () => {
        expect(parseQuestionSnapshotOption({
            id: 'option-1',
            option_key: 'A',
            content: 'Pilihan A',
            response_group: 'group-1',
            response_group_order: '2',
        })).toEqual({
            id: 'option-1',
            key: 'A',
            content: 'Pilihan A',
            imageUrl: null,
            responseGroup: 'group-1',
            responseGroupOrder: 2,
        })
    })

    it('returns a stimulus only when it contains usable text', () => {
        expect(parseQuestionSnapshotStimulus({ stimulus: { content: 'Bacaan', title: 'Stimulus' } }))
            .toEqual({ title: 'Stimulus', content: 'Bacaan', imageUrl: null })
        expect(parseQuestionSnapshotStimulus({ stimulus: { title: 'Kosong' } })).toBeNull()
    })
})

describe('event assessment session routing', () => {
    afterEach(() => vi.restoreAllMocks())

    it('starts TKA SMP mini tryouts through the section-aware assessment engine', async () => {
        const eventId = 'event-id'
        const userId = 'user-id'
        const sessionId = 'event-session-id'
        const registrationId = 'registration-id'
        const attemptId = 'attempt-id'
        const now = Date.now()

        vi.spyOn(eventRepository, 'getEvent').mockResolvedValue({
            id: eventId,
            code: 'TKA-1',
            title: 'TKA SMP',
            slug: 'tka-smp',
            event_type: 'tryout',
            program_id: 'program-id',
            track_id: 'track-id',
            description: null,
            flyer_image_url: null,
            registration_start: null,
            registration_end: null,
            starts_at: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
            ends_at: new Date(now + 2 * 60 * 60 * 1000).toISOString(),
            status: 'live',
        })
        vi.spyOn(eventRepository, 'getRegistration').mockResolvedValue({
            id: registrationId,
            event_id: eventId,
            session_id: sessionId,
            user_id: userId,
            order_id: null,
            registration_number: 'REG-1',
            status: 'registered',
            created_at: new Date(now - 1).toISOString(),
        })
        vi.spyOn(eventRepository, 'getSession').mockResolvedValue({
            id: sessionId,
            event_id: eventId,
            exam_id: 'exam-id',
            name: 'Sesi 1',
            starts_at: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
            ends_at: new Date(now + 2 * 60 * 60 * 1000).toISOString(),
            capacity: 30,
            status: 'live',
        })
        vi.spyOn(eventRepository, 'resolveSessionExam').mockResolvedValue({
            id: 'exam-id',
            programId: 'program-id',
            trackId: 'track-id',
            examTypeId: 'mini-type-id',
            examTypeCode: 'MINI_TRYOUT',
            title: 'Mini Tryout Bahasa Indonesia',
            slug: 'mini-tka-smp-bahasa',
            durationSeconds: 60 * 60,
            attemptLimit: 1,
            questionOrder: 'fixed',
            accessType: 'free',
            requiredFeatureId: null,
            tokenCost: 0,
            startsAt: null,
            endsAt: null,
            subjectId: null,
            subjectCode: null,
            programCode: 'TKA',
            trackCode: 'SMP',
        })
        vi.spyOn(eventRepository, 'getUserEventAttempt').mockResolvedValue(null)
        const start = vi.spyOn(tkaFullExamRpcService, 'startSmpExam').mockResolvedValue({ attemptId, resumed: false })
        vi.spyOn(eventRepository, 'updateRegistrationStatus').mockResolvedValue()

        const result = await new EventService().start(userId, eventId)

        expect(start).toHaveBeenCalledWith({
            userId,
            examSlug: 'mini-tka-smp-bahasa',
            context: { type: 'EVENT', eventId },
        })
        expect(result.sessionPath).toBe('/tka/smp/tryout')
    })
})

describe('event timing and registration idempotency', () => {
    afterEach(() => vi.restoreAllMocks())

    function mockEventStartWindow({
        eventStartOffset = -60 * 60_000,
        eventEndOffset = 60 * 60_000,
        sessionStartOffset = -30 * 60_000,
        sessionEndOffset = 60 * 60_000,
        eventStatus = 'live',
    }: {
        eventStartOffset?: number
        eventEndOffset?: number
        sessionStartOffset?: number
        sessionEndOffset?: number
        eventStatus?: string
    }) {
        const now = Date.now()
        vi.spyOn(eventRepository, 'getEvent').mockResolvedValue({
            id: 'event-time', code: 'TIME', title: 'Timing', slug: 'timing', event_type: 'tryout',
            program_id: 'program', track_id: 'track', description: null, flyer_image_url: null,
            registration_start: null, registration_end: null,
            starts_at: new Date(now + eventStartOffset).toISOString(),
            ends_at: new Date(now + eventEndOffset).toISOString(), status: eventStatus,
        })
        vi.spyOn(eventRepository, 'getRegistration').mockResolvedValue({
            id: 'registration', event_id: 'event-time', session_id: 'session', user_id: 'user',
            order_id: null, registration_number: 'REG-1', status: 'registered', created_at: new Date(now).toISOString(),
        })
        vi.spyOn(eventRepository, 'getSession').mockResolvedValue({
            id: 'session', event_id: 'event-time', exam_id: 'exam', name: 'Session',
            starts_at: new Date(now + sessionStartOffset).toISOString(),
            ends_at: new Date(now + sessionEndOffset).toISOString(), capacity: null, status: 'live',
        })
        vi.spyOn(eventRepository, 'resolveSessionExam').mockResolvedValue({
            id: 'exam', programId: 'program', trackId: 'track', examTypeId: 'type', examTypeCode: 'FULL_TRYOUT',
            title: 'CPNS', slug: 'cpns-full', durationSeconds: 3600, attemptLimit: null,
            questionOrder: 'fixed', accessType: 'free', requiredFeatureId: null, tokenCost: 0,
            startsAt: null, endsAt: null, subjectId: null, subjectCode: null,
            programCode: 'CPNS', trackCode: 'SKD',
        })
        vi.spyOn(eventRepository, 'getUserEventAttempt').mockResolvedValue(null)
    }

    it('rejects a new Event attempt before the event start, server-side', async () => {
        mockEventStartWindow({ eventStartOffset: 60 * 60_000, sessionStartOffset: 90 * 60_000 })
        await expect(new EventService().start('user', 'event-time')).rejects.toMatchObject({ code: 'EVENT_NOT_STARTED' })
    })

    it('rejects a new Event attempt after close even if its session row remains open', async () => {
        mockEventStartWindow({ eventStartOffset: -60 * 60_000, eventEndOffset: -60_000, sessionEndOffset: 60 * 60_000, eventStatus: 'closed' })
        await expect(new EventService().start('user', 'event-time')).rejects.toMatchObject({ code: 'EVENT_START_WINDOW_CLOSED' })
    })

    it('returns the canonical registration when simultaneous registration loses the unique race', async () => {
        const now = Date.now()
        const registration = {
            id: 'registration-canonical', event_id: 'event-time', session_id: 'session', user_id: 'user',
            order_id: null, registration_number: 'REG-1', status: 'registered', created_at: new Date(now).toISOString(),
        }
        vi.spyOn(eventRepository, 'getRegistration')
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(registration)
        vi.spyOn(eventRepository, 'getEvent').mockResolvedValue({
            id: 'event-time', code: 'TIME', title: 'Timing', slug: 'timing', event_type: 'tryout',
            program_id: 'program', track_id: 'track', description: null, flyer_image_url: null,
            registration_start: null, registration_end: null,
            starts_at: new Date(now - 60_000).toISOString(), ends_at: new Date(now + 60 * 60_000).toISOString(), status: 'live',
        })
        vi.spyOn(eventRepository, 'listSessionsForEvent').mockResolvedValue([{
            id: 'session', event_id: 'event-time', exam_id: 'exam', name: 'Session',
            starts_at: new Date(now - 60_000).toISOString(), ends_at: new Date(now + 60 * 60_000).toISOString(),
            capacity: null, status: 'live',
        }])
        vi.spyOn(eventRepository, 'countRegistrationsForSessions').mockResolvedValue(new Map())
        vi.spyOn(eventRepository, 'createRegistration').mockRejectedValue({ code: '23505' })

        const result = await new EventService().register('user', 'event-time')
        expect(result).toEqual({ registration, alreadyRegistered: true })
    })

    it('has a database uniqueness boundary for Direct and per-Event active attempts', async () => {
        const { readFileSync } = await import('node:fs')
        const { resolve } = await import('node:path')
        const sql = readFileSync(resolve(process.cwd(), 'supabase/migrations/20261006135702_enforce_active_b2c_attempt_context_uniqueness.sql'), 'utf8')
        expect(sql).toContain('user_id, exam_id, (coalesce(metadata->>\'eventId\',\'\'))')
        expect(sql).toContain("source='b2c'")
        expect(sql).toContain("lower(status) in ('created','in_progress')")
    })
})
