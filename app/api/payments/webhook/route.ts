import crypto from 'crypto'
import { errorResponse, successResponse } from '@/lib/api-utils'
import { webhookPayloadSchema } from '@/lib/validations/api'
import { env } from '@/lib/env'
import { logger } from '@/lib/logger'
import { paymentService } from '@/src/services/payment.service'

const MIDTRANS_STATUSES = new Set(['pending', 'capture', 'settlement', 'expire', 'cancel', 'deny'])

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
        const { order_id, transaction_status, status_code, gross_amount, signature_key } = payload

        if (!MIDTRANS_STATUSES.has(transaction_status)) {
            return errorResponse('validation_error', 'Unsupported transaction status', 400)
        }

        const serverKey = env.midtransServerKey()
        const expectedSignature = crypto
            .createHash('sha512')
            .update(`${order_id}${status_code}${gross_amount}${serverKey}`)
            .digest('hex')

        if (!crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature_key))) {
            logger.warn('Invalid Midtrans webhook signature', { orderId: order_id })
            return errorResponse('forbidden', 'Invalid signature key', 403)
        }

        const amount = Number(gross_amount)
        if (!Number.isFinite(amount)) {
            return errorResponse('validation_error', 'Gross amount invalid', 400)
        }

        const providerTransactionId = typeof payload.transaction_id === 'string' ? payload.transaction_id : null
        const paymentMethod = typeof payload.payment_type === 'string' ? payload.payment_type : null
        const webhookEventId = providerTransactionId
            ? `${providerTransactionId}:${transaction_status}`
            : `${order_id}:${transaction_status}:${status_code}`

        const result = await paymentService.processWebhook({
            orderNumber: order_id,
            status: transaction_status,
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
