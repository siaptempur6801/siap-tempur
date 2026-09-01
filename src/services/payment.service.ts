import { createQrisCharge, createTransaction } from '@/lib/midtrans'
import { env } from '@/lib/env'
import {
    canonicalMidtransStatus,
    isMidtransSuccessStatus,
    isSupportedMidtransStatus,
    normalizeMidtransStatus,
} from '@/lib/midtrans-status'
import { createAdminClient, createV2AdminClient } from '@/lib/utils/supabase/server'
import { commerceService } from '@/src/services/commerce.service'
import type { Json } from '@/types/database.types'

const QRIS_SIMULATOR_URL = 'https://simulator.sandbox.midtrans.com/openapi/qris/index'
const PENDING_PROVIDER_GRACE_MS = 15 * 60 * 1000

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

function isOlderThanProviderGrace(createdAt: string) {
    const createdAtMs = Date.parse(createdAt)
    const age = Number.isFinite(createdAtMs) ? Date.now() - createdAtMs : 0
    return age > PENDING_PROVIDER_GRACE_MS
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

    async createQrisQaCheckout(input: {
        userId: string
        email?: string | null
        fullName?: string | null
        productCode: string
        adminFee?: number
    }) {
        if (env.appEnvironment() !== 'staging') throw new Error('QA_QRIS_STAGING_ONLY')

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
            const charge = await createQrisCharge(
                order.orderNumber,
                order.totalAmount,
                {
                    first_name: input.fullName || input.email?.split('@')[0] || 'QA Admin',
                    email: input.email || undefined,
                },
                itemDetails,
            )

            const providerTransactionId = charge.transaction_id || ''
            const qrImageUrl = charge.actions?.find((action) => action.name === 'generate-qr-code')?.url || null
            const qrImageUrlV2 = charge.actions?.find((action) => action.name === 'generate-qr-code-v2')?.url || null
            if (!providerTransactionId) throw new Error('MIDTRANS_QRIS_TRANSACTION_ID_MISSING')
            if (!qrImageUrl && !qrImageUrlV2) throw new Error('MIDTRANS_QRIS_IMAGE_URL_MISSING')

            const safeCharge = { ...charge } as Record<string, unknown>
            delete safeCharge.signature_key

            const admin = await createV2AdminClient()
            const { error: paymentError } = await admin
                .from('payments')
                .upsert({
                    order_id: order.id,
                    provider: 'midtrans',
                    provider_transaction_id: providerTransactionId,
                    payment_method: 'qris',
                    amount: order.totalAmount,
                    status: 'pending',
                    raw_response: asJson({
                        ...safeCharge,
                        integration: 'core_api_qris_qa',
                        qrImageUrl,
                        qrImageUrlV2,
                        simulatorUrl: QRIS_SIMULATOR_URL,
                    }),
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'order_id,provider' })
            if (paymentError) throw paymentError

            return {
                orderId: order.id,
                orderNumber: order.orderNumber,
                providerTransactionId,
                qrImageUrl: qrImageUrl || qrImageUrlV2!,
                qrImageUrlV2,
                simulatorUrl: QRIS_SIMULATOR_URL,
                amount: order.totalAmount,
            }
        } catch (error) {
            await commerceService.markOrderFailed(order.id).catch(() => undefined)
            throw error
        }
    }

    async syncUserOrder(userId: string, orderId: string) {
        const order = await commerceService.getOrderForUser(orderId, userId)
        if (!order) throw new Error('ORDER_NOT_FOUND')
        const orderStatus = asString(order.status).trim().toLowerCase()
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
            if (response.status === 404 && orderStatus === 'pending' && isOlderThanProviderGrace(createdAt)) {
                await commerceService.applyProviderStatus({
                    orderId: canonicalOrderId,
                    status: 'expire',
                    amount: totalAmount,
                    rawResponse: asJson({ reason: 'provider_status_not_found_after_15m' }),
                })
                return { status: 'expire', paid: false }
            }
            return { status: 'pending', paid: false }
        }

        const result = await response.json() as Record<string, unknown>
        const status = normalizeMidtransStatus(result.transaction_status)
        const providerStatusCode = normalizeMidtransStatus(result.status_code)

        // Midtrans may return an application-level 404 payload with HTTP 200.
        // Once the local pending order is older than the checkout grace period,
        // treat that provider-not-found response the same as an HTTP 404.
        if (!status && providerStatusCode === '404' && orderStatus === 'pending') {
            if (isOlderThanProviderGrace(createdAt)) {
                await commerceService.applyProviderStatus({
                    orderId: canonicalOrderId,
                    status: 'expire',
                    amount: totalAmount,
                    rawResponse: asJson({
                        ...result,
                        reconciliation_reason: 'provider_status_not_found_after_15m',
                    }),
                })
                return { status: 'expire', paid: false }
            }
            return { status: 'pending', paid: false }
        }

        if (!isSupportedMidtransStatus(status)) throw new Error('UNSUPPORTED_PAYMENT_STATUS')

        const amount = Number(result.gross_amount)
        if (!Number.isFinite(amount) || amount !== totalAmount) {
            throw new Error('PAYMENT_AMOUNT_MISMATCH')
        }

        await commerceService.applyProviderStatus({
            orderId: canonicalOrderId,
            status: canonicalMidtransStatus(status),
            providerTransactionId: typeof result.transaction_id === 'string' ? result.transaction_id : null,
            paymentMethod: typeof result.payment_type === 'string' ? result.payment_type : null,
            amount,
            rawResponse: asJson(result),
        })

        return { status, paid: isMidtransSuccessStatus(status) }
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
        const status = normalizeMidtransStatus(input.status)
        if (!isSupportedMidtransStatus(status)) throw new Error('UNSUPPORTED_PAYMENT_STATUS')

        const order = await commerceService.getOrderByNumber(input.orderNumber)
        if (!order) throw new Error('ORDER_NOT_FOUND')
        const canonicalOrderId = asString(order.id)
        const orderStatus = asString(order.status).trim().toLowerCase()
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
                    event_type: status,
                    payload: asJson(input.payload),
                    processed: false,
                })
                .select('id')
                .single()
            if (webhookError) {
                if (webhookError.code === '23505') {
                    return this.processWebhook({ ...input, status })
                }
                throw webhookError
            }
            webhookId = String(webhook.id)
        }

        await commerceService.applyProviderStatus({
            orderId: canonicalOrderId,
            status: canonicalMidtransStatus(status),
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

        return { alreadyProcessed: false, paid: isMidtransSuccessStatus(status) }
    }
}

export const paymentService = new PaymentService()
