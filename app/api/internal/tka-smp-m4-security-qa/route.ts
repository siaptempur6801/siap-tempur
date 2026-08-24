import crypto from 'crypto'
import { env } from '@/lib/env'
import { createV2AdminClient } from '@/lib/utils/supabase/server'
import { commerceService } from '@/src/services/commerce.service'
import { POST as paymentWebhook } from '@/app/api/payments/webhook/route'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const QA_TAG = '[m4-security-qa]'
const QA_EMAIL_PREFIX = 'm4-security-qa-'

function enabled() {
    return env.appEnvironment() === 'staging'
        && process.env.VERCEL_ENV === 'preview'
        && (process.env.VERCEL_GIT_COMMIT_MESSAGE || '').includes(QA_TAG)
}

function signature(orderNumber: string, statusCode: string, grossAmount: string) {
    return crypto
        .createHash('sha512')
        .update(`${orderNumber}${statusCode}${grossAmount}${env.midtransServerKey()}`)
        .digest('hex')
}

async function callWebhook(input: {
    orderNumber: string
    amount: number
    status: 'pending' | 'settlement' | 'expire' | 'cancel' | 'deny'
    transactionId: string
    badSignature?: boolean
    overrideAmount?: number
}) {
    const amount = input.overrideAmount ?? input.amount
    const grossAmount = amount.toFixed(2)
    const statusCode = '200'
    const payload = {
        order_id: input.orderNumber,
        transaction_status: input.status,
        status_code: statusCode,
        gross_amount: grossAmount,
        transaction_id: input.transactionId,
        payment_type: 'qris',
        signature_key: input.badSignature
            ? '0'.repeat(128)
            : signature(input.orderNumber, statusCode, grossAmount),
    }
    const response = await paymentWebhook(new Request('https://qa.invalid/api/payments/webhook', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
    }))
    const body = await response.json().catch(() => ({})) as Record<string, unknown>
    return { status: response.status, body }
}

async function createQaOrder(userId: string) {
    return commerceService.createOrder(userId, 'TKA_SMP_PASS_30', 500)
}

export async function GET() {
    if (!enabled()) {
        return Response.json({ error: 'NOT_AVAILABLE' }, { status: 404 })
    }

    const admin = await createV2AdminClient()
    const email = `${QA_EMAIL_PREFIX}${Date.now()}-${crypto.randomUUID().slice(0, 8)}@example.invalid`
    const eventIds: string[] = []
    let userId: string | null = null

    try {
        const { data: created, error: createError } = await admin.auth.admin.createUser({
            email,
            password: `M4Security!${crypto.randomUUID()}-${crypto.randomUUID().slice(0, 8)}`,
            email_confirm: true,
            user_metadata: { full_name: 'M4 Security QA', m4_security_qa: true },
        })
        if (createError || !created.user) throw createError ?? new Error('QA_USER_CREATE_FAILED')
        userId = created.user.id

        const pendingOrder = await createQaOrder(userId)
        const pendingTx = `m4sec-pending-${crypto.randomUUID()}`
        eventIds.push(`${pendingTx}:pending`)
        const pending = await callWebhook({
            orderNumber: pendingOrder.orderNumber,
            amount: pendingOrder.totalAmount,
            status: 'pending',
            transactionId: pendingTx,
        })
        const pendingDuplicate = await callWebhook({
            orderNumber: pendingOrder.orderNumber,
            amount: pendingOrder.totalAmount,
            status: 'pending',
            transactionId: pendingTx,
        })

        const invalidSignatureOrder = await createQaOrder(userId)
        const invalidSignature = await callWebhook({
            orderNumber: invalidSignatureOrder.orderNumber,
            amount: invalidSignatureOrder.totalAmount,
            status: 'pending',
            transactionId: `m4sec-invalid-signature-${crypto.randomUUID()}`,
            badSignature: true,
        })

        const mismatchOrder = await createQaOrder(userId)
        const mismatchTx = `m4sec-mismatch-${crypto.randomUUID()}`
        const amountMismatch = await callWebhook({
            orderNumber: mismatchOrder.orderNumber,
            amount: mismatchOrder.totalAmount,
            overrideAmount: mismatchOrder.totalAmount + 1,
            status: 'pending',
            transactionId: mismatchTx,
        })

        const terminalResults: Record<string, unknown> = {}
        for (const status of ['expire', 'cancel', 'deny'] as const) {
            const order = await createQaOrder(userId)
            const tx = `m4sec-${status}-${crypto.randomUUID()}`
            eventIds.push(`${tx}:${status}`)
            const response = await callWebhook({
                orderNumber: order.orderNumber,
                amount: order.totalAmount,
                status,
                transactionId: tx,
            })
            const { data: storedOrder, error: orderError } = await admin
                .from('orders')
                .select('status')
                .eq('id', order.id)
                .single()
            if (orderError) throw orderError
            const { data: storedPayment, error: paymentError } = await admin
                .from('payments')
                .select('status')
                .eq('order_id', order.id)
                .eq('provider', 'midtrans')
                .single()
            if (paymentError) throw paymentError
            terminalResults[status] = {
                webhookStatus: response.status,
                orderStatus: storedOrder.status,
                paymentStatus: storedPayment.status,
            }
        }

        const paidOrder = await createQaOrder(userId)
        const paidTx = `m4sec-paid-${crypto.randomUUID()}`
        eventIds.push(`${paidTx}:settlement`, `${paidTx}:cancel`)
        const settlement = await callWebhook({
            orderNumber: paidOrder.orderNumber,
            amount: paidOrder.totalAmount,
            status: 'settlement',
            transactionId: paidTx,
        })
        const settlementDuplicate = await callWebhook({
            orderNumber: paidOrder.orderNumber,
            amount: paidOrder.totalAmount,
            status: 'settlement',
            transactionId: paidTx,
        })

        const { data: paidItems, error: itemError } = await admin
            .from('order_items')
            .select('id')
            .eq('order_id', paidOrder.id)
        if (itemError) throw itemError
        const paidItemIds = (paidItems ?? []).map((item) => String(item.id))
        const { count: entitlementCountBeforeCancel, error: entitlementBeforeError } = await admin
            .from('entitlements')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('source_type', 'order_item')
            .in('source_id', paidItemIds)
        if (entitlementBeforeError) throw entitlementBeforeError

        const cancelAfterPaid = await callWebhook({
            orderNumber: paidOrder.orderNumber,
            amount: paidOrder.totalAmount,
            status: 'cancel',
            transactionId: paidTx,
        })
        const { data: paidStoredOrder, error: paidOrderError } = await admin
            .from('orders')
            .select('status, paid_at')
            .eq('id', paidOrder.id)
            .single()
        if (paidOrderError) throw paidOrderError
        const { data: paidStoredPayment, error: paidPaymentError } = await admin
            .from('payments')
            .select('status, paid_at')
            .eq('order_id', paidOrder.id)
            .eq('provider', 'midtrans')
            .single()
        if (paidPaymentError) throw paidPaymentError
        const { count: entitlementCountAfterCancel, error: entitlementAfterError } = await admin
            .from('entitlements')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('source_type', 'order_item')
            .in('source_id', paidItemIds)
        if (entitlementAfterError) throw entitlementAfterError

        const result = {
            staging: true,
            signatureRejection: invalidSignature.status === 403,
            amountMismatchRejection: amountMismatch.status === 400,
            pendingAccepted: pending.status === 200,
            duplicatePendingAccepted: pendingDuplicate.status === 200,
            duplicatePendingMessage: ((pendingDuplicate.body.data as Record<string, unknown> | undefined)?.message ?? null),
            terminalResults,
            settlementAccepted: settlement.status === 200,
            duplicateSettlementAccepted: settlementDuplicate.status === 200,
            duplicateSettlementMessage: ((settlementDuplicate.body.data as Record<string, unknown> | undefined)?.message ?? null),
            entitlementCountBeforeCancel: entitlementCountBeforeCancel ?? 0,
            cancelAfterPaidAccepted: cancelAfterPaid.status === 200,
            paidOrderStatusAfterCancel: paidStoredOrder.status,
            paidPaymentStatusAfterCancel: paidStoredPayment.status,
            paidAtPreserved: Boolean(paidStoredOrder.paid_at && paidStoredPayment.paid_at),
            entitlementCountAfterCancel: entitlementCountAfterCancel ?? 0,
        }

        return Response.json(result)
    } catch (error) {
        return Response.json({
            error: error instanceof Error ? error.message : String(error),
        }, { status: 500 })
    } finally {
        if (eventIds.length > 0) {
            try {
                await admin.from('payment_webhook_events').delete().in('event_id', eventIds)
            } catch {
                // Best-effort cleanup; the disposable user cleanup below removes commerce rows.
            }
        }
        if (userId) {
            try {
                await admin.auth.admin.deleteUser(userId)
            } catch {
                // Best-effort cleanup is verified by the final staging audit.
            }
        }
    }
}
