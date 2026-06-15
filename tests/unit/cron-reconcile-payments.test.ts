import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
    selectMock,
    eqMock,
    orderMock,
    limitMock,
    fromMock,
    rpcMock,
    getTransactionStatusMock,
} = vi.hoisted(() => ({
    selectMock: vi.fn(),
    eqMock: vi.fn(),
    orderMock: vi.fn(),
    limitMock: vi.fn(),
    fromMock: vi.fn(),
    rpcMock: vi.fn(),
    getTransactionStatusMock: vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => ({
        from: fromMock,
        rpc: rpcMock,
    })),
}))

vi.mock('@/lib/env', () => ({
    env: {
        supabaseUrl: () => 'https://example.supabase.co',
        supabaseServiceRoleKey: () => 'service-role',
        midtransServerKey: () => 'midtrans-server-key',
    },
}))

vi.mock('@/lib/midtrans', () => ({
    getTransactionStatus: getTransactionStatusMock,
}))

vi.mock('@/lib/logger', () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}))

import { GET } from '@/app/api/cron/reconcile-payments/route'

type MockTableResult = {
    data?: unknown[]
    error?: unknown
}

function mockTableResult(result: MockTableResult) {
    limitMock.mockResolvedValueOnce({
        data: result.data ?? [],
        error: result.error ?? null,
    })

    orderMock.mockReturnValueOnce({ limit: limitMock })
    eqMock.mockReturnValueOnce({ order: orderMock })
    selectMock.mockReturnValueOnce({ eq: eqMock })
    fromMock.mockReturnValueOnce({ select: selectMock })
}

function authorizedRequest() {
    return new Request('http://localhost/api/cron/reconcile-payments', {
        headers: { authorization: 'Bearer cron-secret' },
    })
}

describe('payment reconciliation cron', () => {
    beforeEach(() => {
        process.env.CRON_SECRET = 'cron-secret'
        selectMock.mockReset()
        eqMock.mockReset()
        orderMock.mockReset()
        limitMock.mockReset()
        fromMock.mockReset()
        rpcMock.mockReset()
        getTransactionStatusMock.mockReset()
    })

    it('rejects requests without the cron bearer token', async () => {
        const response = await GET(new Request('http://localhost/api/cron/reconcile-payments'))

        expect(response.status).toBe(401)
        expect(fromMock).not.toHaveBeenCalled()
        expect(rpcMock).not.toHaveBeenCalled()
    })

    it('reconciles a settled package payment through the idempotent token RPC', async () => {
        mockTableResult({
            data: [{
                order_id: 'SKD-SKD-PAKET-5-userid-123',
                amount: 40500,
                package_name: 'Paket Pejuang',
            }],
        })
        mockTableResult({ data: [] })
        getTransactionStatusMock.mockResolvedValueOnce({
            transaction_status: 'settlement',
            gross_amount: '40500.00',
        })
        rpcMock.mockResolvedValueOnce({ data: [{ status: 'settlement', quota_granted: true }], error: null })

        const response = await GET(authorizedRequest())

        expect(response.status).toBe(200)
        expect(rpcMock).toHaveBeenCalledWith('process_paid_transaction', {
            p_order_id: 'SKD-SKD-PAKET-5-userid-123',
            p_transaction_status: 'settlement',
            p_increment_by: 5,
        })
    })

    it('skips package reconciliation when Midtrans amount does not match the stored transaction', async () => {
        mockTableResult({
            data: [{
                order_id: 'SKD-SKD-PAKET-5-userid-123',
                amount: 40500,
                package_name: 'Paket Pejuang',
            }],
        })
        mockTableResult({ data: [] })
        getTransactionStatusMock.mockResolvedValueOnce({
            transaction_status: 'settlement',
            gross_amount: '40000.00',
        })

        const response = await GET(authorizedRequest())

        expect(response.status).toBe(200)
        expect(rpcMock).not.toHaveBeenCalled()
    })

    it('expires an old pending package payment when Midtrans no longer has the order', async () => {
        mockTableResult({
            data: [{
                order_id: 'SKD-SKD-PAKET-5-userid-123',
                amount: 40500,
                package_name: 'Paket Pejuang',
                created_at: '2020-01-01T00:00:00.000Z',
            }],
        })
        mockTableResult({ data: [] })
        getTransactionStatusMock.mockResolvedValueOnce(null)
        rpcMock.mockResolvedValueOnce({ data: [{ status: 'expire', quota_granted: false }], error: null })

        const response = await GET(authorizedRequest())

        expect(response.status).toBe(200)
        expect(rpcMock).toHaveBeenCalledWith('process_paid_transaction', {
            p_order_id: 'SKD-SKD-PAKET-5-userid-123',
            p_transaction_status: 'expire',
            p_increment_by: 0,
        })
    })

    it('reconciles a settled event payment by registering the participant', async () => {
        mockTableResult({ data: [] })
        mockTableResult({
            data: [{
                order_id: 'EVT-eventid-userid-123',
                user_id: 'user-id',
                event_id: 'event-id',
                amount: 35000,
            }],
        })
        getTransactionStatusMock.mockResolvedValueOnce({
            transaction_status: 'settlement',
            gross_amount: '35000.00',
        })
        rpcMock.mockResolvedValueOnce({ data: null, error: null })

        const response = await GET(authorizedRequest())

        expect(response.status).toBe(200)
        expect(rpcMock).toHaveBeenCalledWith('register_event_after_payment', {
            p_user_id: 'user-id',
            p_event_id: 'event-id',
            p_order_id: 'EVT-eventid-userid-123',
        })
    })
})
