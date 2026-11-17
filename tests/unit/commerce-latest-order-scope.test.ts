import { describe, expect, it, vi } from 'vitest'

/**
 * Temuan audit fase 1 (A-03): `getLatestOrderForProduct` mengambil 100 `order_items`
 * untuk satu produk TANPA filter pengguna, diurutkan menurut `id` (UUID acak), lalu
 * baru menyaring `orders` milik pengguna. Begitu satu produk tiket event punya lebih
 * dari 100 order dari peserta lain, order milik peserta bisa tidak terbaca:
 * tagihan pending tidak dipakai ulang (order ganda / bayar dobel) dan UI event
 * kehilangan status pembayaran.
 *
 * Test ini memodelkan semantik query apa adanya. Ditandai `it.fails` sampai
 * perbaikan disetujui (logika pembayaran tidak diubah dalam audit); setelah query
 * di-scope ke pengguna, ubah menjadi `it` biasa.
 */

type OrderItem = { order_id: string; product_id: string; id: string }
type Order = { id: string; user_id: string; order_number: string; status: string }

const db = vi.hoisted(() => ({
  orderItems: [] as OrderItem[],
  orders: [] as Order[],
}))

vi.mock('@/lib/utils/supabase/server', () => {
  const client = {
    from(table: string) {
      if (table === 'order_items') {
        return {
          select: () => ({
            eq: (_column: string, productId: string) => ({
              order: () => ({
                limit: async (count: number) => ({
                  data: db.orderItems
                    .filter((item) => item.product_id === productId)
                    .sort((a, b) => (a.id < b.id ? 1 : -1))
                    .slice(0, count),
                  error: null,
                }),
              }),
            }),
          }),
        }
      }
      if (table === 'orders') {
        return {
          select: () => ({
            eq: (_column: string, userId: string) => ({
              in: (_idColumn: string, ids: string[]) => ({
                order: () => ({
                  limit: async () => ({
                    data: db.orders
                      .filter((order) => order.user_id === userId && ids.includes(order.id))
                      .map((order) => ({ ...order, total_amount: 50000, created_at: null })),
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }
      }
      if (table === 'payments') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { status: 'pending', raw_response: { snapToken: 'snap-1' } },
                  error: null,
                }),
              }),
            }),
          }),
        }
      }
      throw new Error(`Unexpected table ${table}`)
    },
  }
  return {
    createV2AdminClient: async () => client,
    createAdminClient: async () => client,
  }
})

vi.mock('@/src/services/assessment-catalog.service', () => ({
  assessmentCatalogService: { listDistributable: async () => [] },
}))

import { commerceService } from '@/src/services/commerce.service'

function seed(otherOrders: number) {
  db.orderItems = []
  db.orders = []
  for (let index = 0; index < otherOrders; index += 1) {
    const orderId = `order-other-${index}`
    // UUID acak → urutan `id` tidak berkorelasi dengan waktu; di sini item milik
    // peserta lain kebetulan berada di atas.
    db.orderItems.push({
      id: `f${String(index).padStart(5, '0')}`,
      order_id: orderId,
      product_id: 'ticket',
    })
    db.orders.push({
      id: orderId,
      user_id: `user-${index}`,
      order_number: `ORD-${index}`,
      status: 'paid',
    })
  }
  db.orderItems.push({ id: '00000-mine', order_id: 'order-mine', product_id: 'ticket' })
  db.orders.push({ id: 'order-mine', user_id: 'me', order_number: 'ORD-MINE', status: 'pending' })
}

describe('commerceService.getLatestOrderForProduct — cakupan pengguna (A-03)', () => {
  it('menemukan order pending peserta bila produk punya sedikit order', async () => {
    seed(10)
    const order = await commerceService.getLatestOrderForProduct('me', 'ticket')
    expect(order?.id).toBe('order-mine')
    expect(order?.snapToken).toBe('snap-1')
  })

  it.fails('tetap menemukan order pending peserta setelah >100 order peserta lain', async () => {
    seed(150)
    const order = await commerceService.getLatestOrderForProduct('me', 'ticket')
    expect(order?.id).toBe('order-mine')
  })
})
