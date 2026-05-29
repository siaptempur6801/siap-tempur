import { createClient } from '@supabase/supabase-js'
import { PRICING_PACKAGES } from '@/lib/constants'
import crypto from 'crypto'
import { errorResponse, successResponse } from '@/lib/api-utils'
import { webhookPayloadSchema } from '@/lib/validations/api'
import { env } from '@/lib/env'
import { logger } from '@/lib/logger'

const SUCCESS_STATUSES = new Set(['capture', 'settlement'])

function getWebhookSupabase() {
    return createClient(
        env.supabaseUrl(),
        env.supabaseServiceRoleKey()
    )
}

export async function POST(req: Request) {
    const supabase = getWebhookSupabase()

    try {
        let body;
        try {
            body = await req.json()
        } catch {
            return errorResponse('invalid_json', 'Invalid JSON payload', 400)
        }

        const parsed = webhookPayloadSchema.safeParse(body)
        if (!parsed.success) {
            return errorResponse('validation_error', 'Invalid payload format', 400, parsed.error.issues)
        }

        const { order_id, transaction_status, status_code, gross_amount, signature_key } = parsed.data

        // === Signature Verification ===
        const serverKey = env.midtransServerKey()
        const hash = crypto.createHash('sha512').update(`${order_id}${status_code}${gross_amount}${serverKey}`).digest('hex')

        if (hash !== signature_key) {
            logger.warn('Invalid Midtrans webhook signature', { orderId: order_id })
            return errorResponse('forbidden', 'Invalid signature key', 403)
        }
        // === End Signature Verification ===

        // Route by order ID prefix
        // EVT-* = event ticket payment → event_payments table
        // SKD-* = tryout token purchase → transactions table
        if (order_id.startsWith('EVT-')) {
            return handleEventPaymentWebhook(order_id, transaction_status)
        }

        // === Original token payment flow ===

        // 1. Get current transaction from DB
        const { data: transaction, error: txError } = await supabase
            .from('transactions')
            .select('*')
            .eq('order_id', order_id)
            .single()

        if (txError || !transaction) {
            return errorResponse('not_found', 'Transaction not found', 404)
        }

        // If transaction already settled, don't double count
        if (transaction.status === 'settlement') {
            return successResponse({ message: 'Already processed' })
        }

        // 2. Update status in DB
        const { error: updateError } = await supabase
            .from('transactions')
            .update({ status: transaction_status })
            .eq('order_id', order_id)

        if (updateError) throw updateError

        // 3. If settled/success, update user quota
        if (transaction_status === 'settlement' || transaction_status === 'capture') {
            // Find package to get token count
            // Note: package_name matches pkg.name from constants
            const pkg = PRICING_PACKAGES.find(p => p.name === transaction.package_name)
            const tokenCount = pkg ? pkg.tokens : 0

            if (tokenCount > 0) {
                // Increment quota in profiles
                const { error: quotaError } = await supabase.rpc('increment_tryout_quota', {
                    user_id_param: transaction.user_id,
                    increment_by: tokenCount
                })

                if (quotaError) {
                    logger.error('Failed to increment quota from webhook', quotaError, { orderId: order_id })
                    // Fallback to direct update if RPC fails
                    const profileData = await supabase.from('profiles').select('tryout_quota').eq('id', transaction.user_id).single()
                    await supabase
                        .from('profiles')
                        .update({
                            tryout_quota: (profileData.data?.tryout_quota || 0) + tokenCount
                        })
                        .eq('id', transaction.user_id)
                }
                // Successfully added tokens
            }
        }

        return successResponse({ message: 'OK' })
    } catch (error: unknown) {
        logger.error('Payment webhook failed', error)
        return errorResponse('internal_error', 'Internal Server Error', 500)
    }
}

// ─── Event Payment Handler ────────────────────────────────────────────────────
async function handleEventPaymentWebhook(orderId: string, transactionStatus: string) {
    const supabase = getWebhookSupabase()

    const { data: payment, error: paymentError } = await supabase
        .from('event_payments')
        .select('id, user_id, event_id, status, amount')
        .eq('order_id', orderId)
        .single()

    if (paymentError || !payment) {
        logger.warn('Event payment not found for webhook', { orderId })
        return errorResponse('not_found', 'Event payment not found', 404)
    }

    // Idempotency — already settled
    if (SUCCESS_STATUSES.has(payment.status)) {
        return successResponse({ message: 'Already processed' })
    }

    const isSuccess = SUCCESS_STATUSES.has(transactionStatus)

    if (isSuccess) {
        // Use atomic RPC: settle payment + register participant
        const { error: rpcError } = await supabase.rpc('register_event_after_payment', {
            p_user_id: payment.user_id,
            p_event_id: payment.event_id,
            p_order_id: orderId,
        })

        if (rpcError) {
            logger.error('Event payment webhook registration RPC failed', rpcError, { orderId })
            return errorResponse('internal_error', 'Failed to register participant', 500)
        }
    } else {
        // Non-success: just update status
        const { error: updateError } = await supabase
            .from('event_payments')
            .update({ status: transactionStatus, updated_at: new Date().toISOString() })
            .eq('order_id', orderId)

        if (updateError) {
            logger.error('Event payment webhook status update failed', updateError, { orderId })
        }
    }

    return successResponse({ message: 'OK' })
}
