import crypto from 'crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const supabaseRpc = vi.fn()
const transactionSingle = vi.fn()
const fromMock = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => ({
        from: fromMock,
        rpc: supabaseRpc,
    })),
}))

vi.mock('@/lib/env', () => ({
    env: {
        supabaseUrl: () => 'https://example.supabase.co',
        supabaseServiceRoleKey: () => 'service-role',
        midtransServerKey: () => 'midtrans-server-key',
    },
}))

import {
    getTokenIncrementForPackage,
    POST,
    shouldProcessTransactionWithRpc,
} from '@/app/api/payments/webhook/route'

function signedMidtransPayload(overrides: Partial<{
    order_id: string
    transaction_status: string
    status_code: string
    gross_amount: string
}> = {}) {
    const payload = {
        order_id: 'SKD-SKD-PAKET-5-userid-1234567890',
        transaction_status: 'settlement',
        status_code: '200',
        gross_amount: '40500.00',
        ...overrides,
    }

    return {
        ...payload,
        signature_key: crypto
            .createHash('sha512')
            .update(`${payload.order_id}${payload.status_code}${payload.gross_amount}midtrans-server-key`)
            .digest('hex'),
    }
}

function mockTransactionLookup(transaction: { amount: number; package_name: string } | null) {
    transactionSingle.mockResolvedValueOnce(
        transaction
            ? { data: { order_id: 'SKD-SKD-PAKET-5-userid-1234567890', ...transaction }, error: null }
            : { data: null, error: { message: 'not found' } }
    )

    const eqOrderId = vi.fn(() => ({ single: transactionSingle }))
    const select = vi.fn(() => ({ eq: vi.fn(() => ({ eq: eqOrderId, single: transactionSingle })) }))

    fromMock.mockReturnValueOnce({ select })
}

describe('payments webhook helpers', () => {
    beforeEach(() => {
        fromMock.mockReset()
        supabaseRpc.mockReset()
        transactionSingle.mockReset()
    })

    it('uses the idempotent transaction RPC for every SKD status update', () => {
        expect(shouldProcessTransactionWithRpc('pending')).toBe(true)
        expect(shouldProcessTransactionWithRpc('capture')).toBe(true)
        expect(shouldProcessTransactionWithRpc('settlement')).toBe(true)
        expect(shouldProcessTransactionWithRpc('expire')).toBe(true)
    })

    it('grants the configured token quota for all main SKD packages on successful statuses', () => {
        expect(getTokenIncrementForPackage('Paket Perintis', 'capture')).toBe(1)
        expect(getTokenIncrementForPackage('Paket Perintis', 'settlement')).toBe(1)

        expect(getTokenIncrementForPackage('Paket Pejuang', 'capture')).toBe(5)
        expect(getTokenIncrementForPackage('Paket Pejuang', 'settlement')).toBe(5)

        expect(getTokenIncrementForPackage('Paket Pasukan', 'capture')).toBe(10)
        expect(getTokenIncrementForPackage('Paket Pasukan', 'settlement')).toBe(10)
    })

    it('does not grant token quota for non-successful or unknown SKD payments', () => {
        expect(getTokenIncrementForPackage('Paket Perintis', 'pending')).toBe(0)
        expect(getTokenIncrementForPackage('Paket Pejuang', 'expire')).toBe(0)
        expect(getTokenIncrementForPackage('Paket Pasukan', 'cancel')).toBe(0)
        expect(getTokenIncrementForPackage('Unknown Package', 'settlement')).toBe(0)
    })

    it('processes a settled Paket Pejuang webhook and grants the configured quota through the RPC', async () => {
        mockTransactionLookup({ amount: 40500, package_name: 'Paket Pejuang' })
        supabaseRpc.mockResolvedValueOnce({ data: [{ status: 'settlement', quota_granted: true }], error: null })

        const response = await POST(new Request('http://localhost/api/payments/webhook', {
            method: 'POST',
            body: JSON.stringify(signedMidtransPayload()),
        }))

        expect(response.status).toBe(200)
        expect(supabaseRpc).toHaveBeenCalledWith('process_paid_transaction', {
            p_order_id: 'SKD-SKD-PAKET-5-userid-1234567890',
            p_transaction_status: 'settlement',
            p_increment_by: 5,
        })
    })

    it('rejects a settled package webhook when the Midtrans amount does not match the stored transaction', async () => {
        mockTransactionLookup({ amount: 40500, package_name: 'Paket Pejuang' })

        const response = await POST(new Request('http://localhost/api/payments/webhook', {
            method: 'POST',
            body: JSON.stringify(signedMidtransPayload({ gross_amount: '40000.00' })),
        }))

        expect(response.status).toBe(400)
        expect(supabaseRpc).not.toHaveBeenCalled()
    })
})
