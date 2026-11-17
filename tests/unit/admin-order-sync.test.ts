import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  permissions: ['payment.manage'] as string[],
  order: null as Record<string, unknown> | null,
  syncUserOrder: vi.fn(),
  refreshPaidOrder: vi.fn(),
  audit: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw Object.assign(new Error('NEXT_REDIRECT'), { url })
  }),
}))

vi.mock('next/navigation', () => ({ redirect: mocks.redirect }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/csrf', () => ({ validateCsrf: vi.fn(async () => undefined) }))
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))
vi.mock('@/lib/audit-log', () => ({ auditAdminAction: mocks.audit }))
vi.mock('@/lib/server-rate-limit', () => ({ isServerActionRateLimited: vi.fn(async () => false) }))
vi.mock('@/src/services/authorization.service', () => ({
  authorizationService: {
    requireAuthenticated: async () => ({ userId: 'admin-1', permissions: mocks.permissions }),
  },
}))
vi.mock('@/src/services/commerce.service', () => ({
  commerceService: { getOrderById: async () => mocks.order },
}))
vi.mock('@/src/services/payment.service', () => ({
  paymentService: { syncUserOrder: mocks.syncUserOrder, refreshPaidOrder: mocks.refreshPaidOrder },
}))

import { syncAdminOrderAction } from '@/app/actions/admin-order-sync'

const ORDER_ID = '11111111-1111-4111-8111-111111111111'

async function run() {
  const form = new FormData()
  form.set('order_id', ORDER_ID)
  try {
    await syncAdminOrderAction(form)
  } catch (error) {
    return (error as { url?: string }).url ?? ''
  }
  return ''
}

describe('aksi admin sinkronkan order (B-08)', () => {
  beforeEach(() => {
    mocks.permissions = ['payment.manage']
    mocks.syncUserOrder.mockReset()
    mocks.refreshPaidOrder.mockReset()
    mocks.audit.mockReset()
    mocks.audit.mockResolvedValue(undefined)
  })

  it('order pending: memakai jalur pemenuhan biasa dan mencatat audit', async () => {
    mocks.order = { id: ORDER_ID, user_id: 'user-1', status: 'pending' }
    mocks.syncUserOrder.mockResolvedValue({ status: 'settlement', paid: true })

    const url = await run()

    expect(mocks.syncUserOrder).toHaveBeenCalledWith('user-1', ORDER_ID)
    expect(url).toContain('sync=synced')
    expect(mocks.audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ADMIN_ORDER_SYNC', entityId: ORDER_ID }),
    )
  })

  it('order lunas: mengecek refund yang terlewat', async () => {
    mocks.order = { id: ORDER_ID, user_id: 'user-1', status: 'paid' }
    mocks.refreshPaidOrder.mockResolvedValue({ status: 'refund', reversed: true })

    expect(await run()).toContain('sync=reversed')
  })

  it('tanpa permission payment.manage tidak menyentuh Midtrans', async () => {
    mocks.permissions = ['order.read']
    mocks.order = { id: ORDER_ID, user_id: 'user-1', status: 'pending' }

    expect(await run()).toContain('sync=failed')
    expect(mocks.syncUserOrder).not.toHaveBeenCalled()
  })

  it('order milik akun terhapus tidak dipenuhi', async () => {
    mocks.order = { id: ORDER_ID, user_id: null, status: 'pending' }

    expect(await run()).toContain('sync=owner_deleted')
    expect(mocks.syncUserOrder).not.toHaveBeenCalled()
  })
})
