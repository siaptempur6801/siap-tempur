import { beforeEach, describe, expect, it, vi } from 'vitest'

const { rpc, getEvent, listSessions, requirePermission } = vi.hoisted(() => ({
  rpc: vi.fn(),
  getEvent: vi.fn(),
  listSessions: vi.fn(),
  requirePermission: vi.fn(),
}))

vi.mock('@/lib/utils/supabase/server', () => ({
  createAdminClient: vi.fn(async () => ({ rpc })),
}))
vi.mock('@/src/services/authorization.service', () => ({
  authorizationService: { requirePermission },
}))
vi.mock('@/src/repositories/event.repository', () => ({
  eventRepository: { getEvent, listSessionsForEvent: listSessions },
}))

import { getAdminMonitoringSummary } from '@/src/services/admin-monitoring.service'

const eventId = 'event-123'
const summary = { total: 1, notStarted: 0, inProgress: 0, completed: 1 }
const report = { bands: [{ label: '75–100%', count: 1 }], scored: 1, completionRate: 100 }

describe('admin monitoring summary rollout compatibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getEvent.mockResolvedValue({ id: eventId, title: 'Event QA' })
    listSessions.mockResolvedValue([])
  })

  it('falls back to the existing RPC without returning participant rows or unauthorized report metrics', async () => {
    rpc
      .mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST202', message: 'function missing' },
      })
      .mockResolvedValueOnce({
        data: {
          total: 1,
          summary,
          report,
          rows: [{ id: 'participant-1', progress: { total: 30, answered: 29 } }],
        },
        error: null,
      })

    const result = await getAdminMonitoringSummary({ event: eventId }, false)

    expect(rpc).toHaveBeenNthCalledWith(
      1,
      'admin_monitoring_summary',
      expect.objectContaining({ p_event_id: eventId, p_include_report: false }),
    )
    expect(rpc).toHaveBeenNthCalledWith(
      2,
      'admin_monitoring_page',
      expect.objectContaining({ p_event_id: eventId, p_page: 1 }),
    )
    expect(result).toEqual({
      context: expect.objectContaining({ title: 'Event QA' }),
      total: 1,
      summary,
      report: null,
    })
    expect(result).not.toHaveProperty('rows')
    expect(requirePermission).toHaveBeenCalledTimes(1)
  })

  it('does not hide unrelated database errors behind the compatibility fallback', async () => {
    const databaseError = { code: '42501', message: 'permission denied' }
    rpc.mockResolvedValueOnce({ data: null, error: databaseError })

    await expect(getAdminMonitoringSummary({ event: eventId }, false)).rejects.toBe(databaseError)
    expect(rpc).toHaveBeenCalledTimes(1)
  })
})
