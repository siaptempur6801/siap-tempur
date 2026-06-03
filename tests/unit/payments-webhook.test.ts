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

    it('only grants package tokens for successful SKD payment statuses', () => {
        expect(getTokenIncrementForPackage('Paket Perintis', 'capture')).toBe(1)
        expect(getTokenIncrementForPackage('Paket Perintis', 'settlement')).toBe(1)
        expect(getTokenIncrementForPackage('Paket Perintis', 'pending')).toBe(0)
        expect(getTokenIncrementForPackage('Unknown Package', 'settlement')).toBe(0)
    })
})
