import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  commerce: {
    getOrderById: vi.fn(),
    getOrderByNumber: vi.fn(),
    applyProviderStatus: vi.fn(),
    applyOrderReversal: vi.fn(),
  },
  webhookRow: null as { id: string; processed: boolean } | null,
}))

vi.mock('@/src/services/commerce.service', () => ({ commerceService: mocks.commerce }))
vi.mock('@/lib/env', () => ({
  env: {
    midtransServerKey: () => 'server-key',
    midtransApiBaseUrl: () => 'https://api.midtrans.test',
    appEnvironment: () => 'production',
  },
}))
vi.mock('@/lib/utils/supabase/server', () => {
  const table = {
    select: () => table,
    eq: () => table,
    maybeSingle: async () => ({ data: mocks.webhookRow, error: null }),
    insert: () => ({
      select: () => ({ single: async () => ({ data: { id: 'webhook-1' }, error: null }) }),
    }),
    update: () => ({ eq: async () => ({ error: null }) }),
  }
  return {
    createAdminClient: async () => ({ from: () => table }),
    createV2AdminClient: async () => ({ from: () => table }),
  }
})

import { paymentService } from '@/src/services/payment.service'

const ORDER = {
  id: 'order-1',
  order_number: 'ORD-EVT-1',
  user_id: 'user-1',
  status: 'paid',
  total_amount: 50000,
  created_at: '2026-11-01T00:00:00Z',
}

function midtransReturns(body: Record<string, unknown>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(body), { status: 200 })),
  )
}

describe('reversal pembayaran untuk semua produk (A-05/A-06)', () => {
  beforeEach(() => {
    for (const fn of Object.values(mocks.commerce)) fn.mockReset()
    mocks.webhookRow = null
    mocks.commerce.getOrderById.mockResolvedValue(ORDER)
    mocks.commerce.getOrderByNumber.mockResolvedValue(ORDER)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('webhook refund memanggil reversal umum (bukan hanya token TKA)', async () => {
    await paymentService.processWebhook({
      orderNumber: 'ORD-EVT-1',
      status: 'refund',
      amount: 50000,
      providerTransactionId: 'tx-1',
      payload: {},
      eventId: 'tx-1:refund',
    })

    expect(mocks.commerce.applyProviderStatus).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'cancel' }),
    )
    expect(mocks.commerce.applyOrderReversal).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: 'order-1', status: 'refund', eventId: 'tx-1:refund' }),
    )
  })

  it('cek ulang order lunas menemukan refund yang notifikasinya hilang', async () => {
    midtransReturns({
      transaction_status: 'refund',
      gross_amount: '50000.00',
      transaction_id: 'tx-1',
      payment_type: 'qris',
    })

    const result = await paymentService.refreshPaidOrder('order-1')

    expect(result).toEqual({ status: 'refund', reversed: true })
    expect(mocks.commerce.applyOrderReversal).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: 'order-1', eventId: 'tx-1:refund:reconcile' }),
    )
  })

  it('cek ulang order lunas yang masih settlement tidak mengubah apa pun', async () => {
    midtransReturns({ transaction_status: 'settlement', gross_amount: '50000.00' })

    expect(await paymentService.refreshPaidOrder('order-1')).toEqual({
      status: 'settlement',
      reversed: false,
    })
    expect(mocks.commerce.applyProviderStatus).not.toHaveBeenCalled()
    expect(mocks.commerce.applyOrderReversal).not.toHaveBeenCalled()
  })

  it('nominal refund yang tidak cocok ditolak', async () => {
    midtransReturns({ transaction_status: 'refund', gross_amount: '1.00' })
    await expect(paymentService.refreshPaidOrder('order-1')).rejects.toThrow(
      'PAYMENT_AMOUNT_MISMATCH',
    )
    expect(mocks.commerce.applyOrderReversal).not.toHaveBeenCalled()
  })
})
