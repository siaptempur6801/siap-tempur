import { describe, expect, it, vi } from 'vitest'

vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(),
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
    shouldProcessTransactionWithRpc,
} from '@/app/api/payments/webhook/route'

describe('payments webhook helpers', () => {
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
})
