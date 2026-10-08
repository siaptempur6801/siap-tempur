import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    permissions: [] as string[],
    createClient: vi.fn(),
    from: vi.fn(),
}))
vi.mock('server-only', () => ({}))
vi.mock('@/lib/utils/supabase/server', () => ({ createV2AdminClient: mocks.createClient }))
vi.mock('@/src/services/authorization.service', () => ({
    AuthorizationError: class extends Error {},
    authorizationService: {
        requireAuthenticated: async () => ({ permissions: mocks.permissions }),
        requirePermission: async (permission: string) => {
            if (!mocks.permissions.includes(permission)) throw new Error('Forbidden')
        },
    },
}))

import { getAdminOrderDetail, getAdminUserAccess, getAdminUserDetail, listAdminAccessUsers } from '@/src/services/admin-context-details.service'

function query(data: unknown) {
    const result = { data, error: null, count: 0 }
    const chain = {
        select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(), or: vi.fn().mockReturnThis(), range: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue(result),
        then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
    }
    return chain
}

beforeEach(() => {
    mocks.permissions = []
    mocks.createClient.mockReset().mockResolvedValue({ from: mocks.from })
    mocks.from.mockReset()
})

describe('context detail authorization and isolation', () => {
    it('rejects unrelated roles before opening a privileged database client', async () => {
        mocks.permissions = ['event.manage']
        await expect(getAdminUserDetail('user-a')).rejects.toThrow()
        await expect(getAdminUserAccess('user-a')).rejects.toThrow()
        await expect(getAdminOrderDetail('order-a')).rejects.toThrow()
        await expect(listAdminAccessUsers('', 0, 20)).rejects.toThrow()
        expect(mocks.createClient).not.toHaveBeenCalled()
    })

    it('user.read does not grant entitlement or commerce access', async () => {
        mocks.permissions = ['user.read']
        await expect(getAdminUserAccess('user-a')).rejects.toThrow()
        await expect(getAdminOrderDetail('order-a')).rejects.toThrow()
        expect(mocks.createClient).not.toHaveBeenCalled()
    })

    it('entitlement queries are constrained to the selected user', async () => {
        mocks.permissions = ['entitlement.manage']
        const wallets = query([])
        const entitlements = query([])
        mocks.from.mockImplementation(table => table === 'wallets' ? wallets : entitlements)
        expect(await getAdminUserAccess('user-a')).toEqual({ wallets: [], entitlements: [] })
        expect(wallets.eq).toHaveBeenCalledWith('user_id', 'user-a')
        expect(entitlements.eq).toHaveBeenCalledWith('user_id', 'user-a')
        expect(mocks.from).not.toHaveBeenCalledWith('features')
    })

    it('order details only include payments from that order', async () => {
        mocks.permissions = ['order.read']
        const orders = query({ id: 'order-a' })
        const payments = query([])
        mocks.from.mockImplementation(table => table === 'orders' ? orders : payments)
        expect(await getAdminOrderDetail('order-a')).toEqual({ order: { id: 'order-a' }, payments: [] })
        expect(orders.eq).toHaveBeenCalledWith('id', 'order-a')
        expect(payments.eq).toHaveBeenCalledWith('order_id', 'order-a')
    })
})
