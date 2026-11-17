import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  fromMock,
  syncUserOrderMock,
  refreshPaidOrderMock,
  createV2AdminClientMock,
  closeExpiredEventsMock,
} = vi.hoisted(() => ({
  fromMock: vi.fn(),
  syncUserOrderMock: vi.fn(),
  refreshPaidOrderMock: vi.fn(),
  createV2AdminClientMock: vi.fn(),
  closeExpiredEventsMock: vi.fn(),
}))

vi.mock('@/lib/utils/supabase/server', () => ({
  createV2AdminClient: createV2AdminClientMock,
}))

vi.mock('@/src/services/payment.service', () => ({
  paymentService: {
    syncUserOrder: syncUserOrderMock,
    refreshPaidOrder: refreshPaidOrderMock,
  },
}))

/**
 * Cron yang sama juga menjalankan bookkeeping status event. Di-mock di sini supaya
 * test rekonsiliasi pembayaran tidak ikut menyentuh tabel `events`; perilaku
 * auto-close diuji tersendiri di `event-auto-close.test.ts`.
 */
vi.mock('@/src/services/event.service', () => ({
  eventService: {
    closeExpiredEvents: closeExpiredEventsMock,
  },
}))

const finalizationMocks = vi.hoisted(() => ({
  finalizeExpired: vi.fn(),
  refreshRecentEventRankings: vi.fn(),
}))

vi.mock('@/src/services/attempt-finalization.service', () => ({
  attemptFinalizationService: finalizationMocks,
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import { GET } from '@/app/api/cron/reconcile-payments/route'
import { logger } from '@/lib/logger'

type PendingPaymentRow = {
  order_id: string
  created_at?: string
}

type OrderRow = {
  id: string
  user_id: string
  status: string
}

let pendingPayments: PendingPaymentRow[]
let paidPayments: Array<{ order_id: string }>
let checkedOrderIds: string[]
let orders: OrderRow[]
let paymentError: unknown
let orderError: unknown

function authorizedRequest() {
  return new Request('http://localhost/api/cron/reconcile-payments', {
    headers: { authorization: 'Bearer cron-secret' },
  })
}

function installCanonicalQueryMocks() {
  fromMock.mockImplementation((table: string) => {
    if (table === 'payments') {
      let refundQuery = false
      const query = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        in: vi.fn(() => {
          refundQuery = true
          return query
        }),
        gte: vi.fn(() => query),
        order: vi.fn(() => query),
        limit: vi.fn(async () =>
          refundQuery
            ? { data: paidPayments, error: null }
            : { data: pendingPayments, error: paymentError },
        ),
        update: vi.fn((values: unknown) => {
          const chain = {
            eq: vi.fn((column: string, value: string) => {
              if (column === 'order_id') checkedOrderIds.push(value)
              return chain
            }),
            then: (resolve: (value: { error: null }) => void) => resolve({ error: null }),
          }
          void values
          return chain
        }),
      }
      return query
    }

    if (table === 'orders') {
      return {
        select: vi.fn(() => ({
          in: vi.fn(async () => ({
            data: orders,
            error: orderError,
          })),
        })),
      }
    }

    throw new Error(`Unexpected table: ${table}`)
  })
}

describe('payment reconciliation cron', () => {
  beforeEach(() => {
    process.env.CRON_SECRET = 'cron-secret'
    pendingPayments = []
    paidPayments = []
    checkedOrderIds = []
    refreshPaidOrderMock.mockReset()
    refreshPaidOrderMock.mockResolvedValue({ status: 'settlement', reversed: false })
    orders = []
    paymentError = null
    orderError = null

    fromMock.mockReset()
    syncUserOrderMock.mockReset()
    createV2AdminClientMock.mockReset()
    closeExpiredEventsMock.mockReset()
    vi.mocked(logger.error).mockClear()
    finalizationMocks.finalizeExpired.mockReset()
    finalizationMocks.refreshRecentEventRankings.mockReset()
    finalizationMocks.finalizeExpired.mockResolvedValue({
      checked: 0,
      finalized: 0,
      skipped: 0,
      failed: 0,
    })
    finalizationMocks.refreshRecentEventRankings.mockResolvedValue({ events: 0, failed: 0 })
    createV2AdminClientMock.mockResolvedValue({ from: fromMock })
    closeExpiredEventsMock.mockResolvedValue({ closed: 0 })
    installCanonicalQueryMocks()
  })

  it('rejects requests without the cron bearer token', async () => {
    const response = await GET(new Request('http://localhost/api/cron/reconcile-payments'))

    expect(response.status).toBe(401)
    expect(createV2AdminClientMock).not.toHaveBeenCalled()
    expect(syncUserOrderMock).not.toHaveBeenCalled()
    // Endpoint tidak berautorisasi juga tidak boleh menyentuh tabel events.
    expect(closeExpiredEventsMock).not.toHaveBeenCalled()
  })

  it('menutup event kedaluwarsa dan melaporkan jumlahnya', async () => {
    closeExpiredEventsMock.mockResolvedValueOnce({ closed: 3 })

    const response = await GET(authorizedRequest())
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(closeExpiredEventsMock).toHaveBeenCalledTimes(1)
    expect(payload.data.events).toEqual({ closed: 3 })
  })

  it('kegagalan auto-close event TIDAK menggagalkan rekonsiliasi pembayaran', async () => {
    // Rekonsiliasi pembayaran sudah selesai saat auto-close dijalankan. Menjadikan
    // kegagalannya fatal akan membuang pekerjaan yang sudah berhasil, dan
    // sebaliknya membuat cron terlihat gagal padahal pembayaran sudah direkonsiliasi.
    pendingPayments = [{ order_id: 'order-1' }]
    orders = [{ id: 'order-1', user_id: 'user-1', status: 'pending' }]
    syncUserOrderMock.mockResolvedValueOnce({ status: 'settlement', paid: true })
    closeExpiredEventsMock.mockRejectedValueOnce(new Error('EVENTS_TABLE_DOWN'))

    const response = await GET(authorizedRequest())
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.data.orders.settled).toBe(1)
    expect(payload.data.events).toEqual({ error: 'EVENTS_TABLE_DOWN' })
  })

  it('reconciles a settled canonical pending order through the payment service', async () => {
    pendingPayments = [{ order_id: 'order-1' }]
    orders = [{ id: 'order-1', user_id: 'user-1', status: 'pending' }]
    syncUserOrderMock.mockResolvedValueOnce({ status: 'settlement', paid: true })

    const response = await GET(authorizedRequest())
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(syncUserOrderMock).toHaveBeenCalledWith('user-1', 'order-1')
    expect(payload.data.orders).toEqual({
      checked: 1,
      settled: 1,
      expired: 0,
      pending: 0,
      skipped: 0,
      failed: 0,
    })
  })

  it('keeps a provider-pending canonical order pending', async () => {
    pendingPayments = [{ order_id: 'order-1' }]
    orders = [{ id: 'order-1', user_id: 'user-1', status: 'pending' }]
    syncUserOrderMock.mockResolvedValueOnce({ status: 'pending', paid: false })

    const response = await GET(authorizedRequest())
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.data.orders.pending).toBe(1)
    expect(payload.data.orders.failed).toBe(0)
  })

  it('counts a final provider failure as expired', async () => {
    pendingPayments = [{ order_id: 'order-1' }]
    orders = [{ id: 'order-1', user_id: 'user-1', status: 'pending' }]
    syncUserOrderMock.mockResolvedValueOnce({ status: 'expire', paid: false })

    const response = await GET(authorizedRequest())
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.data.orders.expired).toBe(1)
    expect(payload.data.orders.pending).toBe(0)
  })

  it('skips a pending payment when its canonical order is already final', async () => {
    pendingPayments = [{ order_id: 'order-1' }]
    orders = [{ id: 'order-1', user_id: 'user-1', status: 'paid' }]

    const response = await GET(authorizedRequest())
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(syncUserOrderMock).not.toHaveBeenCalled()
    expect(payload.data.orders.skipped).toBe(1)
    expect(payload.data.orders.checked).toBe(0)
  })
  it('menaikkan log error beralert bila ada order yang gagal direkonsiliasi', async () => {
    pendingPayments = [{ order_id: 'order-1' }]
    orders = [{ id: 'order-1', user_id: 'user-1', status: 'pending' }]
    syncUserOrderMock.mockRejectedValueOnce(new Error('PAYMENT_AMOUNT_MISMATCH'))

    const response = await GET(authorizedRequest())

    expect(response.status).toBe(200)
    expect(logger.error).toHaveBeenCalledWith(
      'Cron reconcile-payments perlu perhatian',
      undefined,
      expect.objectContaining({
        alert: 'cron_reconcile_payments_attention',
        orders: expect.objectContaining({ failed: 1 }),
      }),
    )
  })

  it('menaikkan log error beralert bila backlog pending melebihi satu batch', async () => {
    pendingPayments = Array.from({ length: 51 }, (_, index) => ({ order_id: `order-${index}` }))
    orders = []

    await GET(authorizedRequest())

    expect(logger.error).toHaveBeenCalledWith(
      'Cron reconcile-payments perlu perhatian',
      undefined,
      expect.objectContaining({ orders: expect.objectContaining({ hasMorePending: true }) }),
    )
  })

  it('tidak membuat log alert saat rekonsiliasi bersih', async () => {
    pendingPayments = [{ order_id: 'order-1' }]
    orders = [{ id: 'order-1', user_id: 'user-1', status: 'pending' }]
    syncUserOrderMock.mockResolvedValueOnce({ status: 'settlement', paid: true })

    await GET(authorizedRequest())

    expect(logger.error).not.toHaveBeenCalledWith(
      'Cron reconcile-payments perlu perhatian',
      expect.anything(),
      expect.anything(),
    )
  })

  it('menjalankan finalisasi attempt dan ranking event, dan melaporkan hasilnya', async () => {
    finalizationMocks.finalizeExpired.mockResolvedValueOnce({
      checked: 2,
      finalized: 2,
      skipped: 0,
      failed: 0,
    })
    finalizationMocks.refreshRecentEventRankings.mockResolvedValueOnce({ events: 1, failed: 0 })

    const payload = await (await GET(authorizedRequest())).json()

    expect(payload.data.attempts.finalized).toBe(2)
    expect(payload.data.rankings.events).toBe(1)
  })

  it('kegagalan finalisasi tidak menggagalkan rekonsiliasi dan memicu log alert', async () => {
    pendingPayments = [{ order_id: 'order-1' }]
    orders = [{ id: 'order-1', user_id: 'user-1', status: 'pending' }]
    syncUserOrderMock.mockResolvedValueOnce({ status: 'settlement', paid: true })
    finalizationMocks.finalizeExpired.mockRejectedValueOnce(new Error('rpc down'))

    const response = await GET(authorizedRequest())
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.data.orders.settled).toBe(1)
    expect(payload.data.attempts).toEqual({ error: 'rpc down' })
    expect(logger.error).toHaveBeenCalledWith(
      'Cron reconcile-payments perlu perhatian',
      undefined,
      expect.objectContaining({ alert: 'cron_reconcile_payments_attention' }),
    )
  })

  it('baris yang gagal dicek ditandai agar berpindah ke belakang antrean (A-12)', async () => {
    pendingPayments = [{ order_id: 'order-1' }, { order_id: 'order-2' }]
    orders = [
      { id: 'order-1', user_id: 'user-1', status: 'pending' },
      { id: 'order-2', user_id: 'user-2', status: 'paid' },
    ]
    syncUserOrderMock.mockRejectedValueOnce(new Error('PAYMENT_AMOUNT_MISMATCH'))

    await GET(authorizedRequest())

    expect(checkedOrderIds).toEqual(expect.arrayContaining(['order-1', 'order-2']))
  })

  it('memeriksa ulang order lunas untuk refund yang notifikasinya hilang (A-06)', async () => {
    paidPayments = [{ order_id: 'paid-1' }, { order_id: 'paid-2' }]
    refreshPaidOrderMock
      .mockResolvedValueOnce({ status: 'refund', reversed: true })
      .mockResolvedValueOnce({ status: 'settlement', reversed: false })

    const payload = await (await GET(authorizedRequest())).json()

    expect(refreshPaidOrderMock).toHaveBeenCalledWith('paid-1')
    expect(payload.data.refunds).toEqual({ checked: 2, reversed: 1, failed: 0 })
    expect(checkedOrderIds).toContain('paid-2')
  })
})
