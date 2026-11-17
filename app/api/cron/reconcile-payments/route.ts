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
import { attemptFinalizationService } from '@/src/services/attempt-finalization.service'

// Satu jalan cron memanggil Midtrans dan menilai attempt satu per satu; batas 60 detik
// berlaku di semua paket Vercel (termasuk Hobby).
export const maxDuration = 60

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
  const refunds = await reconcileRecentPaidOrders()

  // Finalisasi attempt yang melewati tenggat, lalu hitung ulang ranking event yang
  // berjalan/baru selesai (audit A-07/A-11). Masing-masing terisolasi: kegagalannya
  // tidak membatalkan langkah lain.
  let attempts:
    | Awaited<ReturnType<typeof attemptFinalizationService.finalizeExpired>>
    | {
        error: string
      }
  try {
    attempts = await attemptFinalizationService.finalizeExpired()
  } catch (error) {
    logger.error('Finalisasi attempt kedaluwarsa gagal', error)
    attempts = { error: error instanceof Error ? error.message : String(error) }
  }

  let rankings:
    | Awaited<ReturnType<typeof attemptFinalizationService.refreshRecentEventRankings>>
    | { error: string }
  try {
    rankings = await attemptFinalizationService.refreshRecentEventRankings()
  } catch (error) {
    logger.error('Hitung ulang ranking event terjadwal gagal', error)
    rankings = { error: error instanceof Error ? error.message : String(error) }
  }

  // Respons tetap 200 agar cron tidak diulang membabi buta, tetapi kegagalan dan
  // backlog dinaikkan ke level error dengan pesan tetap supaya bisa dipasangi
  // alert log (Vercel log drain / filter `level=error`). Tanpa ini, rekonsiliasi
  // yang gagal sebagian hanya terlihat sebagai log `info`.
  const eventsFailed = 'error' in events
  const attemptsFailed = 'error' in attempts || attempts.failed > 0
  const rankingsFailed = 'error' in rankings || rankings.failed > 0
  if (
    orders.failed > 0 ||
    orders.hasMorePending ||
    refunds.failed > 0 ||
    eventsFailed ||
    attemptsFailed ||
    rankingsFailed
  ) {
    logger.error('Cron reconcile-payments perlu perhatian', undefined, {
      alert: 'cron_reconcile_payments_attention',
      orders,
      refunds,
      eventsFailed,
      attempts,
      rankings,
    })
  }

  return successResponse({ orders, refunds, events, attempts, rankings })
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
    // Rotasi berdasarkan waktu terakhir dicek (audit A-12): baris yang dicek
    // diperbarui `updated_at`-nya, sehingga baris yang terus gagal atau ordernya
    // sudah final pindah ke belakang dan tidak memblokir antrean selamanya.
    .order('updated_at', { ascending: true })
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
      await markPaymentChecked(admin, orderId)
      continue
    }

    const userId = String(order.user_id || '')
    if (!userId) {
      logger.warn('Payment reconcile order missing user', { orderId })
      summary.failed += 1
      await markPaymentChecked(admin, orderId)
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
      await markPaymentChecked(admin, orderId)
    }
  }

  logger.info('Payment reconcile completed', { orders: summary })
  return summary
}

/** Tandai baris pembayaran sudah dicek agar rotasi antrean berjalan (A-12). */
async function markPaymentChecked(
  admin: Awaited<ReturnType<typeof createV2AdminClient>>,
  orderId: string,
) {
  const { error } = await admin
    .from('payments')
    .update({ updated_at: new Date().toISOString() })
    .eq('order_id', orderId)
    .eq('provider', 'midtrans')
  if (error) logger.warn('Payment reconcile could not mark row checked', { orderId })
}

type RefundSummary = { checked: number; reversed: number; failed: number }

const REFUND_BATCH_SIZE = 20
const REFUND_WINDOW_MS = 30 * 24 * 60 * 60 * 1000

/**
 * Cek ulang order lunas 30 hari terakhir untuk refund/chargeback yang notifikasinya
 * hilang (audit A-06). Rotasi memakai `payments.updated_at`, sehingga setiap jalan
 * memeriksa batch berikutnya.
 */
async function reconcileRecentPaidOrders(): Promise<RefundSummary> {
  const summary: RefundSummary = { checked: 0, reversed: 0, failed: 0 }
  const admin = await createV2AdminClient()
  const { data, error } = await admin
    .from('payments')
    .select('order_id')
    .eq('provider', 'midtrans')
    .in('status', ['capture', 'settlement'])
    .gte('paid_at', new Date(Date.now() - REFUND_WINDOW_MS).toISOString())
    .order('updated_at', { ascending: true })
    .limit(REFUND_BATCH_SIZE)
  if (error) {
    logger.error('Payment refund reconcile query failed', error)
    summary.failed += 1
    return summary
  }

  for (const row of data ?? []) {
    const orderId = String(row.order_id || '')
    if (!orderId) continue
    summary.checked += 1
    try {
      const result = await paymentService.refreshPaidOrder(orderId)
      if (result.reversed) summary.reversed += 1
      else await markPaymentChecked(admin, orderId)
    } catch (refundError) {
      logger.error('Payment refund reconcile order check failed', refundError, { orderId })
      summary.failed += 1
      await markPaymentChecked(admin, orderId)
    }
  }
  return summary
}
