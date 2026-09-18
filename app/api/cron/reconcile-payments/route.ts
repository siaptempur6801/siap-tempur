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

const BATCH_SIZE = 50

type ReconcileSummary = {
    checked: number
    settled: number
    expired: number
    pending: number
    skipped: number
    failed: number
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

    const admin = await createV2AdminClient()
    const { data: pendingPayments, error: paymentError } = await admin
        .from('payments')
        .select('order_id, created_at')
        .eq('provider', 'midtrans')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(BATCH_SIZE)

    if (paymentError) {
        logger.error('Payment reconcile pending payment query failed', paymentError)
        return errorResponse('internal_error', 'Failed to load pending payments', 500)
    }

    const orderIds = Array.from(new Set(
        (pendingPayments ?? [])
            .map((payment) => String(payment.order_id || ''))
            .filter(Boolean)
    ))

    const summary = createSummary()
    if (orderIds.length === 0) {
        logger.info('Payment reconcile completed', { orders: summary })
        return successResponse({ orders: summary })
    }

    const { data: orders, error: orderError } = await admin
        .from('orders')
        .select('id, user_id, status')
        .in('id', orderIds)

    if (orderError) {
        logger.error('Payment reconcile pending order query failed', orderError)
        return errorResponse('internal_error', 'Failed to load pending orders', 500)
    }

    const orderById = new Map(
        (orders ?? []).map((order) => [String(order.id), order])
    )

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
    return successResponse({ orders: summary })
}
