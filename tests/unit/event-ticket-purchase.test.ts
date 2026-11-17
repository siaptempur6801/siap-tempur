import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getEventTicket: vi.fn(),
  register: vi.fn(),
  registration: null as { id: string } | null,
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('@/lib/csrf', () => ({ validateCsrf: vi.fn(async () => undefined) }))
vi.mock('@/lib/server-rate-limit', () => ({
  EXAM_ACTION_RATE_LIMITED_MESSAGE: 'rate limited',
  isExamActionRateLimited: vi.fn(async () => false),
}))
vi.mock('@/lib/utils/supabase/server', () => ({
  createV2Client: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'user-1' } } }) },
  }),
  createV2AdminClient: async () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: mocks.registration, error: null }) }),
        }),
      }),
    }),
  }),
  createAdminClient: async () => ({}),
}))
vi.mock('@/src/services/commerce.service', () => ({
  commerceService: { getEventTicket: mocks.getEventTicket },
}))

import { registerTryoutEvent } from '@/app/actions/event'
import { eventRepository } from '@/src/repositories/event.repository'
import { EventService, eventService } from '@/src/services/event.service'

const EVENT_ID = '11111111-1111-4111-8111-111111111111'
const SESSION_ID = '33333333-3333-4333-8333-333333333333'
const HOUR = 60 * 60 * 1000

function eventRow(overrides: Record<string, unknown> = {}) {
  return {
    id: EVENT_ID,
    code: 'AKBAR',
    title: 'Tryout Akbar',
    slug: 'tryout-akbar',
    event_type: 'tryout_akbar',
    program_id: 'program',
    track_id: 'track',
    description: null,
    flyer_image_url: null,
    registration_start: null,
    registration_end: new Date(Date.now() + HOUR).toISOString(),
    starts_at: new Date(Date.now() + 2 * HOUR).toISOString(),
    ends_at: new Date(Date.now() + 4 * HOUR).toISOString(),
    status: 'scheduled',
    ...overrides,
  }
}

function sessionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: SESSION_ID,
    event_id: EVENT_ID,
    exam_id: 'exam',
    name: 'Sesi 1',
    starts_at: new Date(Date.now() + 2 * HOUR).toISOString(),
    ends_at: new Date(Date.now() + 4 * HOUR).toISOString(),
    capacity: 2,
    status: 'scheduled',
    ...overrides,
  }
}

describe('syarat membeli tiket event (A-01)', () => {
  const service = new EventService()
  beforeEach(() => {
    vi.spyOn(eventRepository, 'getEvent').mockResolvedValue(eventRow())
    vi.spyOn(eventRepository, 'getSession').mockResolvedValue(sessionRow())
    vi.spyOn(eventRepository, 'countRegistrationsForSessions').mockResolvedValue(
      new Map([[SESSION_ID, 1]]),
    )
  })
  afterEach(() => vi.restoreAllMocks())

  it('mengizinkan saat pendaftaran buka dan kuota tersisa', async () => {
    await expect(service.assertTicketPurchaseAllowed(EVENT_ID, SESSION_ID)).resolves.toBeUndefined()
  })

  it('menolak setelah pendaftaran ditutup', async () => {
    vi.mocked(eventRepository.getEvent).mockResolvedValue(
      eventRow({ registration_end: new Date(Date.now() - HOUR).toISOString() }),
    )
    await expect(service.assertTicketPurchaseAllowed(EVENT_ID, SESSION_ID)).rejects.toMatchObject({
      code: 'EVENT_REGISTRATION_CLOSED',
    })
  })

  it('menolak saat kuota sesi penuh', async () => {
    vi.mocked(eventRepository.countRegistrationsForSessions).mockResolvedValue(
      new Map([[SESSION_ID, 2]]),
    )
    await expect(service.assertTicketPurchaseAllowed(EVENT_ID, SESSION_ID)).rejects.toMatchObject({
      code: 'EVENT_SESSION_FULL',
    })
  })

  it('menolak sesi yang sudah berakhir atau milik event lain', async () => {
    vi.mocked(eventRepository.getSession).mockResolvedValue(
      sessionRow({ ends_at: new Date(Date.now() - HOUR).toISOString() }),
    )
    await expect(service.assertTicketPurchaseAllowed(EVENT_ID, SESSION_ID)).rejects.toMatchObject({
      code: 'EVENT_SESSION_NOT_FOUND',
    })
    vi.mocked(eventRepository.getSession).mockResolvedValue(sessionRow({ event_id: 'other' }))
    await expect(service.assertTicketPurchaseAllowed(EVENT_ID, SESSION_ID)).rejects.toMatchObject({
      code: 'EVENT_SESSION_NOT_FOUND',
    })
  })

  it('kuota tanpa batas (capacity null) tidak menghitung pendaftaran', async () => {
    vi.mocked(eventRepository.getSession).mockResolvedValue(sessionRow({ capacity: null }))
    await service.assertTicketPurchaseAllowed(EVENT_ID, SESSION_ID)
    expect(eventRepository.countRegistrationsForSessions).not.toHaveBeenCalled()
  })
})

describe('event bertiket tidak pernah jadi gratis (A-02)', () => {
  beforeEach(() => {
    mocks.registration = null
    mocks.getEventTicket.mockReset()
    vi.spyOn(eventService, 'register').mockImplementation(mocks.register)
    mocks.register.mockReset()
    mocks.register.mockResolvedValue({ registration: {}, alreadyRegistered: false })
  })
  afterEach(() => vi.restoreAllMocks())

  it('menolak pendaftaran gratis bila produk tiket ada tetapi harganya tidak berlaku', async () => {
    mocks.getEventTicket.mockResolvedValue({ mapped: true, offer: null })

    const result = await registerTryoutEvent(EVENT_ID)

    expect(result).toEqual({ success: false, message: expect.stringContaining('tidak dijual') })
    expect(mocks.register).not.toHaveBeenCalled()
  })

  it('menolak bila tiket berbayar belum dibayar', async () => {
    mocks.getEventTicket.mockResolvedValue({ mapped: true, offer: { price: 25000 } })

    const result = await registerTryoutEvent(EVENT_ID)

    expect(result.success).toBe(false)
    expect(mocks.register).not.toHaveBeenCalled()
  })

  it('event tanpa produk tiket tetap bisa didaftar gratis', async () => {
    mocks.getEventTicket.mockResolvedValue({ mapped: false, offer: null })

    const result = await registerTryoutEvent(EVENT_ID)

    expect(result.success).toBe(true)
    expect(mocks.register).toHaveBeenCalledWith('user-1', EVENT_ID)
  })
})
