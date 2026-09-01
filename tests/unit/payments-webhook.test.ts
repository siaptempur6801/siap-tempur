import crypto from 'crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const processWebhook = vi.hoisted(() => vi.fn())

vi.mock('@/src/services/payment.service', () => ({
    paymentService: { processWebhook },
}))

vi.mock('@/lib/env', () => ({
    env: {
        midtransServerKey: () => 'midtrans-server-key',
    },
}))

import { POST } from '@/app/api/payments/webhook/route'

function signedMidtransPayload(overrides: Partial<{
    order_id: string
    transaction_status: string
    status_code: string
    gross_amount: string
    transaction_id: string
    payment_type: string
}> = {}) {
    const payload = {
        order_id: 'TKA-SMP-E2E-ORDER-001',
        transaction_status: 'settlement',
        status_code: '200',
        gross_amount: '40500.00',
        transaction_id: 'midtrans-tx-001',
        payment_type: 'qris',
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

function requestFor(payload: unknown) {
    return new Request('http://localhost/api/payments/webhook', {
        method: 'POST',
        body: JSON.stringify(payload),
    })
}

describe('payments webhook route', () => {
    beforeEach(() => {
        processWebhook.mockReset()
    })

    it('passes a valid signed Midtrans status to the payment service', async () => {
        processWebhook.mockResolvedValueOnce({ alreadyProcessed: false, paid: true })
        const payload = signedMidtransPayload()

        const response = await POST(requestFor(payload))

        expect(response.status).toBe(200)
        expect(processWebhook).toHaveBeenCalledWith(expect.objectContaining({
            orderNumber: payload.order_id,
            status: 'settlement',
            amount: 40500,
            providerTransactionId: 'midtrans-tx-001',
            paymentMethod: 'qris',
            eventId: 'midtrans-tx-001:settlement',
        }))
    })

    it('normalizes and accepts a supported Midtrans refund status', async () => {
        processWebhook.mockResolvedValueOnce({ alreadyProcessed: false, paid: false })
        const payload = signedMidtransPayload({ transaction_status: ' Refund ' })

        const response = await POST(requestFor(payload))

        expect(response.status).toBe(200)
        expect(processWebhook).toHaveBeenCalledWith(expect.objectContaining({
            status: 'refund',
            eventId: 'midtrans-tx-001:refund',
        }))
    })

    it('rejects an invalid Midtrans signature before the payment service is called', async () => {
        const payload = { ...signedMidtransPayload(), signature_key: '0'.repeat(128) }

        const response = await POST(requestFor(payload))

        expect(response.status).toBe(403)
        expect(processWebhook).not.toHaveBeenCalled()
    })

    it('rejects unsupported transaction statuses', async () => {
        const payload = signedMidtransPayload({ transaction_status: 'mystery_status' })

        const response = await POST(requestFor(payload))

        expect(response.status).toBe(400)
        expect(processWebhook).not.toHaveBeenCalled()
    })

    it('maps an amount mismatch from the payment service to 400', async () => {
        processWebhook.mockRejectedValueOnce(new Error('PAYMENT_AMOUNT_MISMATCH'))

        const response = await POST(requestFor(signedMidtransPayload()))

        expect(response.status).toBe(400)
    })

    it('maps a missing order from the payment service to 404', async () => {
        processWebhook.mockRejectedValueOnce(new Error('ORDER_NOT_FOUND'))

        const response = await POST(requestFor(signedMidtransPayload()))

        expect(response.status).toBe(404)
    })

    it('returns success for an already processed idempotent webhook event', async () => {
        processWebhook.mockResolvedValueOnce({ alreadyProcessed: true, paid: true })

        const response = await POST(requestFor(signedMidtransPayload()))

        expect(response.status).toBe(200)
        expect(processWebhook).toHaveBeenCalledTimes(1)
    })
})
