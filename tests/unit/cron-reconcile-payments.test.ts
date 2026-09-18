import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
    fromMock,
    syncUserOrderMock,
    createV2AdminClientMock,
    closeExpiredEventsMock,
} = vi.hoisted(() => ({
    fromMock: vi.fn(),
    syncUserOrderMock: vi.fn(),
    createV2AdminClientMock: vi.fn(),
    closeExpiredEventsMock: vi.fn(),
}))

vi.mock('@/lib/utils/supabase/server', () => ({
    createV2AdminClient: createV2AdminClientMock,
}))

vi.mock('@/src/services/payment.service', () => ({
    paymentService: {
        syncUserOrder: syncUserOrderMock,
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

vi.mock('@/lib/logger', () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}))

import { GET } from '@/app/api/cron/reconcile-payments/route'

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
            return {
                select: vi.fn(() => ({
                    eq: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            order: vi.fn(() => ({
                                limit: vi.fn(async () => ({
                                    data: pendingPayments,
                                    error: paymentError,
                                })),
                            })),
                        })),
                    })),
                })),
            }
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
        orders = []
        paymentError = null
        orderError = null

        fromMock.mockReset()
        syncUserOrderMock.mockReset()
        createV2AdminClientMock.mockReset()
        closeExpiredEventsMock.mockReset()
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
})
