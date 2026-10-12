import { errorResponse, successResponse } from '@/lib/api-utils'
import { logger } from '@/lib/logger'
import {
  isMidtransFinalNonSuccessStatus,
  isMidtransSuccessStatus,
  normalizeMidtransStatus,
} from '@/lib/midtrans-status'
import { createV2AdminClient } from '@/lib/utils/supabase/server'
import { isBearerTokenValid } from '@/lib/timing-safe'
import { paymentService } from '@/src/services/payment.service'
import { eventService } from '@/src/services/event.service'

const BATCH_SIZE = 50

type ReconcileSummary = {
  checked: number
  settled: number
  expired: number
  pending: number
  skipped: number
  failed: number
  hasMorePending?: boolean
}

function createSummary(): ReconcileSummary {
  return { checked: 0, settled: 0, expired: 0, pending: 0, skipped: 0, failed: 0 }
}

function isAuthorized(request: Request) {
  // Dibandingkan dengan waktu konstan. Sebelumnya memakai `===` sehingga
  // rahasia cron berpotensi dibocorkan lewat timing. Fail-closed bila
  // CRON_SECRET belum dikonfigurasi (lihat lib/env.schema-v2.example).
  return isBearerTokenValid(request.headers.get('authorization'), process.env.CRON_SECRET)
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return errorResponse('unauthorized', 'Unauthorized', 401)
  }

  /**
   * Bookkeeping status event dijalankan di cron yang sama.
   *
   * Sebelumnya ini dijalankan di dalam render GET `/cpns` dengan klien service
   * role, sehingga setiap crawl anonim menjalankan UPDATE dan halaman publik itu
   * tidak pernah bisa di-cache. Sifatnya pemeliharaan terjadwal, jadi tempatnya
   * di sini.
   *
   * Dijalankan lebih dulu dan TERPISAH dari rekonsiliasi pembayaran supaya tidak
   * bisa terlewat oleh jalur keluar lebih awal milik rekonsiliasi (mis. saat
   * tidak ada pembayaran pending — justru kondisi normal).
   */
  let events: { closed: number } | { error: string }
  try {
    events = await eventService.closeExpiredEvents()
  } catch (error) {
    logger.error('Auto-close event kedaluwarsa gagal', error)
    events = { error: error instanceof Error ? error.message : String(error) }
  }

  const orders = await reconcilePendingPayments()
  return successResponse({ orders, events })
}

/**
 * Rekonsiliasi pembayaran pending terhadap status kanonik Midtrans.
 *
 * Mengembalikan ringkasan alih-alih `Response` supaya `GET` hanya punya SATU
 * titik keluar. Sebelumnya fungsi ini punya `return` lebih awal saat tidak ada
 * pembayaran pending, yang membuat pekerjaan lain di cron yang sama tidak pernah
 * dijalankan.
 */
async function reconcilePendingPayments(): Promise<ReconcileSummary> {
  const summary = createSummary()
  const admin = await createV2AdminClient()
  const { data: pendingPayments, error: paymentError } = await admin
    .from('payments')
    .select('order_id, created_at')
    .eq('provider', 'midtrans')
    .eq('status', 'pending')
    // Proses yang paling lama lebih dulu agar transaksi lama tidak terus
    // tersisih ketika ada lebih dari satu batch pembayaran baru.
    .order('created_at', { ascending: true })
    // Satu baris tambahan hanya untuk mendeteksi backlog tanpa memperbesar batch.
    .limit(BATCH_SIZE + 1)

  if (paymentError) {
    logger.error('Payment reconcile pending payment query failed', paymentError)
    summary.failed += 1
    return summary
  }

  const paymentsToCheck = pendingPayments ?? []
  if (paymentsToCheck.length > BATCH_SIZE) {
    summary.hasMorePending = true
    logger.warn('Payment reconcile has pending rows outside the current batch', {
      batchSize: BATCH_SIZE,
    })
  }

  const orderIds = Array.from(
    new Set(
      paymentsToCheck
        .slice(0, BATCH_SIZE)
        .map((payment) => String(payment.order_id || ''))
        .filter(Boolean),
    ),
  )

  if (orderIds.length === 0) {
    logger.info('Payment reconcile completed', { orders: summary })
    return summary
  }

  const { data: orders, error: orderError } = await admin
    .from('orders')
    .select('id, user_id, status')
    .in('id', orderIds)

  if (orderError) {
    logger.error('Payment reconcile pending order query failed', orderError)
    summary.failed += 1
    return summary
  }

  const orderById = new Map((orders ?? []).map((order) => [String(order.id), order]))

  for (const orderId of orderIds) {
    const order = orderById.get(orderId)
    if (!order || String(order.status).trim().toLowerCase() !== 'pending') {
      summary.skipped += 1
      continue
    }

    const userId = String(order.user_id || '')
    if (!userId) {
      logger.warn('Payment reconcile order missing user', { orderId })
      summary.failed += 1
      continue
    }

    summary.checked += 1

    try {
      const result = await paymentService.syncUserOrder(userId, orderId)
      const status = normalizeMidtransStatus(result.status)

      if (isMidtransSuccessStatus(status)) {
        summary.settled += 1
      } else if (isMidtransFinalNonSuccessStatus(status)) {
        summary.expired += 1
      } else {
        summary.pending += 1
      }
    } catch (error) {
      logger.error('Payment reconcile order check failed', error, { orderId })
      summary.failed += 1
    }
  }

  logger.info('Payment reconcile completed', { orders: summary })
  return summary
}
