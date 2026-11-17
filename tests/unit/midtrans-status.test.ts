import { describe, expect, it } from 'vitest'
import {
    canonicalMidtransStatus,
    isMidtransFinalNonSuccessStatus,
    isMidtransSuccessStatus,
    isSupportedMidtransStatus,
    normalizeMidtransStatus,
} from '@/lib/midtrans-status'

describe('Midtrans status normalization', () => {
    it('normalizes casing and whitespace', () => {
        expect(normalizeMidtransStatus(' Failure ')).toBe('failure')
        expect(normalizeMidtransStatus('SETTLEMENT')).toBe('settlement')
    })

    it('supports the provider statuses handled by commerce', () => {
        for (const status of [
            'pending',
            'authorize',
            'capture',
            'settlement',
            'expire',
            'cancel',
            'deny',
            'failure',
            'refund',
            'partial_refund',
            'chargeback',
            'partial_chargeback',
        ]) {
            expect(isSupportedMidtransStatus(status)).toBe(true)
        }
        expect(isSupportedMidtransStatus('mystery_status')).toBe(false)
    })

    it('maps provider-specific statuses to canonical fulfillment statuses', () => {
        expect(canonicalMidtransStatus('authorize')).toBe('pending')
        expect(canonicalMidtransStatus('failure')).toBe('deny')
        expect(canonicalMidtransStatus('chargeback')).toBe('deny')
        expect(canonicalMidtransStatus('partial_chargeback')).toBe('deny')
        expect(canonicalMidtransStatus('refund')).toBe('cancel')
        expect(canonicalMidtransStatus('partial_refund')).toBe('cancel')
        expect(canonicalMidtransStatus('expire')).toBe('expire')
        expect(canonicalMidtransStatus('settlement')).toBe('settlement')
    })

    it('only treats capture and settlement as successful', () => {
        expect(isMidtransSuccessStatus('capture')).toBe(true)
        expect(isMidtransSuccessStatus(' settlement ')).toBe(true)
        expect(isMidtransSuccessStatus('authorize')).toBe(false)
        expect(isMidtransSuccessStatus('refund')).toBe(false)
    })

    it('distinguishes final non-success statuses from pending-like statuses', () => {
        expect(isMidtransFinalNonSuccessStatus('failure')).toBe(true)
        expect(isMidtransFinalNonSuccessStatus('refund')).toBe(true)
        expect(isMidtransFinalNonSuccessStatus('chargeback')).toBe(true)
        expect(isMidtransFinalNonSuccessStatus('pending')).toBe(false)
        expect(isMidtransFinalNonSuccessStatus('authorize')).toBe(false)
    })
})
