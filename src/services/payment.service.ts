import { createTransaction } from '@/lib/midtrans'
import { env } from '@/lib/env'
import { createAdminClient } from '@/lib/utils/supabase/server'
import { commerceService } from '@/src/services/commerce.service'
import type { Json } from '@/types/database.types'

const SUCCESS_STATUSES = new Set(['capture', 'settlement'])
const MIDTRANS_STATUSES = new Set(['pending', 'capture', 'settlement', 'expire', 'cancel', 'deny'])

type WebhookProcessResult = {
    alreadyProcessed: boolean
    paid: boolean
}

function asJson(value: unknown): Json {
    return JSON.parse(JSON.stringify(value ?? {})) as Json
}

function asString(value: unknown) {
    return typeof value === 'string' ? value : String(value ?? '')
}

function asNumber(value: unknown) {
    const parsed = typeof value === 'number' ? value : Number(value)
    return Number.isFinite(parsed) ? parsed : 0
}

function providerBaseUrl() {
    return {
        serverKey: env.midtransServerKey(),
        baseUrl: `${env.midtransApiBaseUrl()}/v2`,
    }
}

export class PaymentService {
    async createCheckout(input: {
        userId: string
        email?: string | null
        fullName?: string | null
        productCode: string
        adminFee?: number
        returnPath: string
    }) {
        const adminFee = input.adminFee ?? 0
        const order = await commerceService.createOrder(input.userId, input.productCode, adminFee)

        const itemDetails = [
            {
                id: order.productCode,
                price: order.unitPrice,
                quantity: 1,
                name: order.productName,
            },
            ...(adminFee > 0 ? [{
                id: 'admin_fee',
                price: adminFee,
                quantity: 1,
                name: 'Biaya Admin (QRIS)',
            }] : []),
        ]

        try {
            const transaction = await createTransaction(
                order.orderNumber,
                order.totalAmount,
                {
                    first_name: input.fullName || input.email?.split('@')[0] || 'User',
                    email: input.email || undefined,
                },
                itemDetails,
                ['qris', 'other_qris'],
                input.returnPath,
            )

            if (!transaction?.token) throw new Error('MIDTRANS_TOKEN_MISSING')

            await commerceService.attachPendingPayment(
                order.id,
                transaction.token,
                asJson({
                    snapToken: transaction.token,
                    redirectUrl: transaction.redirect_url ?? null,
                }),
            )

            return {
                token: transaction.token as string,
                redirectUrl: transaction.redirect_url ?? null,
                orderId: order.id,
                orderNumber: order.orderNumber,
            }
        } catch (error) {
            await commerceService.markOrderFailed(order.id).catch(() => undefined)
            throw error
        }
    }

    async syncUserOrder(userId: string, orderId: string) {
        const order = await commerceService.getOrderForUser(orderId, userId)
        if (!order) throw new Error('ORDER_NOT_FOUND')
        const orderStatus = asString(order.status).toLowerCase()
        const orderNumber = asString(order.order_number)
        const canonicalOrderId = asString(order.id)
        const totalAmount = asNumber(order.total_amount)
        const createdAt = asString(order.created_at)

        if (orderStatus === 'paid') {
            return { status: 'settlement', paid: true }
        }

        const { serverKey, baseUrl } = providerBaseUrl()
        const response = await fetch(`${baseUrl}/${encodeURIComponent(orderNumber)}/status`, {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`,
            },
            cache: 'no-store',
        })

        if (!response.ok) {
            if (response.status === 404 && orderStatus === 'pending') {
                const createdAtMs = Date.parse(createdAt)
                const age = Number.isFinite(createdAtMs) ? Date.now() - createdAtMs : 0
                if (age > 15 * 60 * 1000) {
                    await commerceService.applyProviderStatus({
                        orderId: canonicalOrderId,
                        status: 'expire',
                        amount: totalAmount,
                        rawResponse: asJson({ reason: 'provider_status_not_found_after_15m' }),
                    })
                    return { status: 'expire', paid: false }
                }
            }
            return { status: 'pending', paid: false }
        }

        const result = await response.json() as Record<string, unknown>
        const status = typeof result.transaction_status === 'string' ? result.transaction_status : ''
        if (!MIDTRANS_STATUSES.has(status)) throw new Error('UNSUPPORTED_PAYMENT_STATUS')

        const amount = Number(result.gross_amount)
        if (!Number.isFinite(amount) || amount !== totalAmount) {
            throw new Error('PAYMENT_AMOUNT_MISMATCH')
        }

        await commerceService.applyProviderStatus({
            orderId: canonicalOrderId,
            status,
            providerTransactionId: typeof result.transaction_id === 'string' ? result.transaction_id : null,
            paymentMethod: typeof result.payment_type === 'string' ? result.payment_type : null,
            amount,
            rawResponse: asJson(result),
        })

        return { status, paid: SUCCESS_STATUSES.has(status) }
    }

    async processWebhook(input: {
        orderNumber: string
        status: string
        amount: number
        providerTransactionId?: string | null
        paymentMethod?: string | null
        payload: unknown
        eventId: string
    }): Promise<WebhookProcessResult> {
        if (!MIDTRANS_STATUSES.has(input.status)) throw new Error('UNSUPPORTED_PAYMENT_STATUS')

        const order = await commerceService.getOrderByNumber(input.orderNumber)
        if (!order) throw new Error('ORDER_NOT_FOUND')
        const canonicalOrderId = asString(order.id)
        const orderStatus = asString(order.status).toLowerCase()
        const totalAmount = asNumber(order.total_amount)
        if (!Number.isFinite(input.amount) || input.amount !== totalAmount) {
            throw new Error('PAYMENT_AMOUNT_MISMATCH')
        }

        const admin = await createAdminClient()
        const { data: existing, error: existingError } = await admin
            .from('payment_webhook_events')
            .select('id, processed')
            .eq('provider', 'midtrans')
            .eq('event_id', input.eventId)
            .maybeSingle()
        if (existingError) throw existingError
        if (existing?.processed) return { alreadyProcessed: true, paid: orderStatus === 'paid' }

        let webhookId = existing?.id ? String(existing.id) : undefined
        if (!webhookId) {
            const { data: webhook, error: webhookError } = await admin
                .from('payment_webhook_events')
                .insert({
                    provider: 'midtrans',
                    event_id: input.eventId,
                    event_type: input.status,
                    payload: asJson(input.payload),
                    processed: false,
                })
                .select('id')
                .single()
            if (webhookError) {
                if (webhookError.code === '23505') {
                    return this.processWebhook(input)
                }
                throw webhookError
            }
            webhookId = String(webhook.id)
        }

        await commerceService.applyProviderStatus({
            orderId: canonicalOrderId,
            status: input.status,
            providerTransactionId: input.providerTransactionId ?? null,
            paymentMethod: input.paymentMethod ?? null,
            amount: input.amount,
            rawResponse: asJson(input.payload),
        })

        const { error: processedError } = await admin
            .from('payment_webhook_events')
            .update({ processed: true, processed_at: new Date().toISOString() })
            .eq('id', webhookId)
        if (processedError) throw processedError

        return { alreadyProcessed: false, paid: SUCCESS_STATUSES.has(input.status) }
    }
}

export const paymentService = new PaymentService()
