import { describe, expect, it } from 'vitest'
import { getReusableEventPaymentResult } from '@/lib/event-payment'

describe('event payment reuse', () => {
    it('returns the existing Snap token for a pending event payment', () => {
        const result = getReusableEventPaymentResult({
            id: 'payment-id',
            status: 'pending',
            order_id: 'EVT-event-user-123',
            snap_token: 'snap-token',
        })

        expect(result).toEqual({
            success: true,
            token: 'snap-token',
            orderId: 'EVT-event-user-123',
        })
    })

    it('blocks already-settled event payments', () => {
        const result = getReusableEventPaymentResult({
            id: 'payment-id',
            status: 'settlement',
            order_id: 'EVT-event-user-123',
            snap_token: 'snap-token',
        })

        expect(result).toEqual({
            success: false,
            message: 'Tiket sudah dibeli. Kamu sudah terdaftar di event ini.',
        })
    })

    it('allows terminal non-success payments to be replaced by a new order', () => {
        const result = getReusableEventPaymentResult({
            id: 'payment-id',
            status: 'expire',
            order_id: 'EVT-event-user-123',
            snap_token: 'snap-token',
        })

        expect(result).toBeNull()
    })
})
