import crypto from 'crypto'
import { errorResponse, successResponse } from '@/lib/api-utils'
import { webhookPayloadSchema } from '@/lib/validations/api'
import { env } from '@/lib/env'
import { logger } from '@/lib/logger'
import { isSupportedMidtransStatus, normalizeFraudStatus, normalizeMidtransStatus, resolveMidtransFulfilment } from '@/lib/midtrans-status'
import { paymentService } from '@/src/services/payment.service'

function signaturesMatch(expected: string, provided: string) {
    if (!/^[a-f0-9]{128}$/i.test(provided)) return false
    const expectedBuffer = Buffer.from(expected, 'utf8')
    const providedBuffer = Buffer.from(provided, 'utf8')
    if (expectedBuffer.length !== providedBuffer.length) return false
    return crypto.timingSafeEqual(expectedBuffer, providedBuffer)
}

export async function POST(req: Request) {
    try {
        let body: unknown
        try {
            body = await req.json()
        } catch {
            return errorResponse('invalid_json', 'Invalid JSON payload', 400)
        }

        const parsed = webhookPayloadSchema.safeParse(body)
        if (!parsed.success) {
            return errorResponse('validation_error', 'Invalid payload format', 400, parsed.error.issues)
        }

        const payload = parsed.data as Record<string, unknown> & {
            order_id: string
            transaction_status: string
            status_code: string
            gross_amount: string
            signature_key: string
        }
        const { order_id, status_code, gross_amount, signature_key } = payload
        const transactionStatus = normalizeMidtransStatus(payload.transaction_status)

        if (!isSupportedMidtransStatus(transactionStatus)) {
            return errorResponse('validation_error', 'Unsupported transaction status', 400)
        }

        const serverKey = env.midtransServerKey()
        const expectedSignature = crypto
            .createHash('sha512')
            .update(`${order_id}${status_code}${gross_amount}${serverKey}`)
            .digest('hex')

        if (!signaturesMatch(expectedSignature, signature_key)) {
            logger.warn('Invalid Midtrans webhook signature', { orderId: order_id })
            return errorResponse('forbidden', 'Invalid signature key', 403)
        }

        const amount = Number(gross_amount)
        if (!Number.isFinite(amount)) {
            return errorResponse('validation_error', 'Gross amount invalid', 400)
        }

        const providerTransactionId = typeof payload.transaction_id === 'string' ? payload.transaction_id : null
        const paymentMethod = typeof payload.payment_type === 'string' ? payload.payment_type : null

        /**
         * `fraud_status` wajib dihormati sebelum order dipenuhi.
         *
         * Midtrans dapat mengirim `transaction_status='capture'` bersama
         * `fraud_status='deny'` (transaksi ditolak hasil review fraud). Tanpa
         * pemeriksaan ini, notifikasi tersebut akan ditandai sukses, token dan
         * entitlement bertambah, dan guard status yang monotonik membuatnya tidak
         * dapat ditarik kembali.
         */
        const fulfilment = resolveMidtransFulfilment(transactionStatus, payload.fraud_status)
        if (fulfilment.blockedReason) {
            logger.warn('Midtrans webhook tidak memenuhi order karena keputusan fraud', {
                orderId: order_id,
                transactionStatus,
                fraudStatus: normalizeFraudStatus(payload.fraud_status),
                reason: fulfilment.blockedReason,
            })
        }
        const effectiveStatus = fulfilment.status

        // `fraud_status` ikut menjadi bagian dari idempotency key. Tanpa itu,
        // `capture:deny` dan `capture:accept` untuk transaksi yang sama akan
        // dianggap sebagai peristiwa yang sama dan notifikasi kedua diabaikan.
        const fraudStatus = normalizeFraudStatus(payload.fraud_status)
        const webhookEventId = providerTransactionId
            ? `${providerTransactionId}:${effectiveStatus}${fraudStatus ? `:${fraudStatus}` : ''}`
            : `${order_id}:${effectiveStatus}:${status_code}${fraudStatus ? `:${fraudStatus}` : ''}`

        const result = await paymentService.processWebhook({
            orderNumber: order_id,
            status: effectiveStatus,
            amount,
            providerTransactionId,
            paymentMethod,
            payload,
            eventId: webhookEventId,
        })

        return successResponse({
            message: result.alreadyProcessed ? 'Already processed' : 'OK',
            paid: result.paid,
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        if (message === 'ORDER_NOT_FOUND') return errorResponse('not_found', 'Order not found', 404)
        if (message === 'PAYMENT_AMOUNT_MISMATCH') {
            return errorResponse('validation_error', 'Gross amount mismatch', 400)
        }
        logger.error('Payment webhook failed', error)
        return errorResponse('internal_error', 'Internal Server Error', 500)
    }
}
