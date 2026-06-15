import { createClient } from '@supabase/supabase-js'
import { PRICING_PACKAGES } from '@/lib/constants'
import { errorResponse, successResponse } from '@/lib/api-utils'
import { env } from '@/lib/env'
import { logger } from '@/lib/logger'
import { getTransactionStatus, type MidtransTransactionStatus } from '@/lib/midtrans'

const BATCH_SIZE = 50
const SNAP_EXPIRY_MS = 15 * 60 * 1000
const SUCCESS_STATUSES = new Set(['capture', 'settlement'])
const FINAL_FAILURE_STATUSES = new Set(['expire', 'cancel', 'deny'])

type PendingPackagePayment = {
    order_id: string
    amount: number
    package_name: string
    created_at: string
}

type PendingEventPayment = {
    order_id: string
    user_id: string
    event_id: string
    amount: number
    created_at: string
}

type ReconcileSummary = {
    checked: number
    settled: number
    expired: number
    skipped: number
    failed: number
}

type SupabaseReconcileClient = {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ error: unknown }>
    from: (table: 'event_payments') => {
        update: (values: Record<string, unknown>) => {
            eq: (column: string, value: string) => Promise<{ error: unknown }>
        }
    }
}

function createSummary(): ReconcileSummary {
    return { checked: 0, settled: 0, expired: 0, skipped: 0, failed: 0 }
}

function isAuthorized(request: Request) {
    const cronSecret = process.env.CRON_SECRET
    return Boolean(cronSecret && request.headers.get('authorization') === `Bearer ${cronSecret}`)
}

function getTokenIncrement(packageName: string, transactionStatus: string) {
    if (!SUCCESS_STATUSES.has(transactionStatus)) return 0
    return PRICING_PACKAGES.find((pkg) => pkg.name === packageName)?.tokens ?? 0
}

function amountMatches(midtransStatus: MidtransTransactionStatus, expectedAmount: number) {
    const amount = Number(midtransStatus.gross_amount)
    return Number.isFinite(amount) && amount === expectedAmount
}

function isPastSnapExpiry(createdAt: string) {
    const createdTime = Date.parse(createdAt)
    return Number.isFinite(createdTime) && Date.now() - createdTime > SNAP_EXPIRY_MS
}

async function reconcilePackagePayments(
    supabase: SupabaseReconcileClient,
    payments: PendingPackagePayment[]
) {
    const summary = createSummary()

    for (const payment of payments) {
        summary.checked += 1

        try {
            const midtransStatus = await getTransactionStatus(payment.order_id)
            const transactionStatus = midtransStatus?.transaction_status

            if (!midtransStatus || !transactionStatus) {
                if (isPastSnapExpiry(payment.created_at)) {
                    const { error } = await supabase.rpc('process_paid_transaction', {
                        p_order_id: payment.order_id,
                        p_transaction_status: 'expire',
                        p_increment_by: 0,
                    })

                    if (error) {
                        logger.error('Payment reconcile stale pending expire failed', error, { orderId: payment.order_id })
                        summary.failed += 1
                        continue
                    }

                    summary.expired += 1
                    continue
                }

                summary.skipped += 1
                continue
            }

            if (!amountMatches(midtransStatus, payment.amount)) {
                logger.warn('Payment reconcile amount mismatch', { orderId: payment.order_id })
                summary.skipped += 1
                continue
            }

            if (SUCCESS_STATUSES.has(transactionStatus)) {
                const tokenCount = getTokenIncrement(payment.package_name, transactionStatus)
                if (tokenCount <= 0) {
                    logger.warn('Payment reconcile unknown package', {
                        orderId: payment.order_id,
                        packageName: payment.package_name,
                    })
                    summary.skipped += 1
                    continue
                }

                const { error } = await supabase.rpc('process_paid_transaction', {
                    p_order_id: payment.order_id,
                    p_transaction_status: transactionStatus,
                    p_increment_by: tokenCount,
                })

                if (error) {
                    logger.error('Payment reconcile token RPC failed', error, { orderId: payment.order_id })
                    summary.failed += 1
                    continue
                }

                summary.settled += 1
                continue
            }

            if (FINAL_FAILURE_STATUSES.has(transactionStatus)) {
                const { error } = await supabase.rpc('process_paid_transaction', {
                    p_order_id: payment.order_id,
                    p_transaction_status: transactionStatus,
                    p_increment_by: 0,
                })

                if (error) {
                    logger.error('Payment reconcile final status RPC failed', error, { orderId: payment.order_id })
                    summary.failed += 1
                    continue
                }

                summary.expired += 1
                continue
            }

            summary.skipped += 1
        } catch (error) {
            logger.error('Payment reconcile package check failed', error, { orderId: payment.order_id })
            summary.failed += 1
        }
    }

    return summary
}

async function reconcileEventPayments(
    supabase: SupabaseReconcileClient,
    payments: PendingEventPayment[]
) {
    const summary = createSummary()

    for (const payment of payments) {
        summary.checked += 1

        try {
            const midtransStatus = await getTransactionStatus(payment.order_id)
            const transactionStatus = midtransStatus?.transaction_status

            if (!midtransStatus || !transactionStatus) {
                if (isPastSnapExpiry(payment.created_at)) {
                    const { error } = await supabase
                        .from('event_payments')
                        .update({ status: 'expire', updated_at: new Date().toISOString() })
                        .eq('order_id', payment.order_id)

                    if (error) {
                        logger.error('Event payment reconcile stale pending expire failed', error, { orderId: payment.order_id })
                        summary.failed += 1
                        continue
                    }

                    summary.expired += 1
                    continue
                }

                summary.skipped += 1
                continue
            }

            if (!amountMatches(midtransStatus, payment.amount)) {
                logger.warn('Event payment reconcile amount mismatch', { orderId: payment.order_id })
                summary.skipped += 1
                continue
            }

            if (SUCCESS_STATUSES.has(transactionStatus)) {
                const { error } = await supabase.rpc('register_event_after_payment', {
                    p_user_id: payment.user_id,
                    p_event_id: payment.event_id,
                    p_order_id: payment.order_id,
                })

                if (error) {
                    logger.error('Event payment reconcile registration RPC failed', error, { orderId: payment.order_id })
                    summary.failed += 1
                    continue
                }

                summary.settled += 1
                continue
            }

            if (FINAL_FAILURE_STATUSES.has(transactionStatus)) {
                const { error } = await supabase
                    .from('event_payments')
                    .update({ status: transactionStatus, updated_at: new Date().toISOString() })
                    .eq('order_id', payment.order_id)

                if (error) {
                    logger.error('Event payment reconcile status update failed', error, { orderId: payment.order_id })
                    summary.failed += 1
                    continue
                }

                summary.expired += 1
                continue
            }

            summary.skipped += 1
        } catch (error) {
            logger.error('Payment reconcile event check failed', error, { orderId: payment.order_id })
            summary.failed += 1
        }
    }

    return summary
}

export async function GET(request: Request) {
    if (!isAuthorized(request)) {
        return errorResponse('unauthorized', 'Unauthorized', 401)
    }

    const supabase = createClient(env.supabaseUrl(), env.supabaseServiceRoleKey())

    const [
        { data: packagePayments, error: packageError },
        { data: eventPayments, error: eventError },
    ] = await Promise.all([
        supabase
            .from('transactions')
            .select('order_id, amount, package_name, created_at')
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(BATCH_SIZE),
        supabase
            .from('event_payments')
            .select('order_id, user_id, event_id, amount, created_at')
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(BATCH_SIZE),
    ])

    if (packageError || eventError) {
        logger.error('Payment reconcile pending query failed', packageError || eventError)
        return errorResponse('internal_error', 'Failed to load pending payments', 500)
    }

    const reconcileClient = supabase as unknown as SupabaseReconcileClient

    const [packages, events] = await Promise.all([
        reconcilePackagePayments(reconcileClient, (packagePayments || []) as PendingPackagePayment[]),
        reconcileEventPayments(reconcileClient, (eventPayments || []) as PendingEventPayment[]),
    ])

    const summary = { packages, events }
    logger.info('Payment reconcile completed', summary)

    return successResponse(summary)
}
