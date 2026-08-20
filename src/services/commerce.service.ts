import { randomUUID } from 'node:crypto'
import { createAdminClient, createV2AdminClient } from '@/lib/utils/supabase/server'
import type { Json } from '@/types/database.types'

export type ProductOffer = {
    id: string
    code: string
    name: string
    description: string | null
    productType: string
    durationDays: number | null
    price: number
    currency: string
    tokenGrant: number
}

export type CommerceOrder = {
    id: string
    orderNumber: string
    userId: string
    status: string
    subtotal: number
    totalAmount: number
    currency: string
    productId: string
    productCode: string
    productName: string
    productType: string
    unitPrice: number
}

function numberValue(value: unknown) {
    return typeof value === 'number' ? value : Number(value ?? 0) || 0
}

function stringValue(value: unknown) {
    return typeof value === 'string' ? value : String(value ?? '')
}

function nullableString(value: unknown) {
    return typeof value === 'string' ? value : null
}

function nullableNumber(value: unknown) {
    if (value === null || value === undefined || value === '') return null
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
}

export class CommerceService {
    async listActiveProductOffers(programCode = 'CPNS', trackCode = 'SKD'): Promise<ProductOffer[]> {
        const admin = await createV2AdminClient()
        const now = new Date().toISOString()

        const { data: program, error: programError } = await admin
            .from('programs')
            .select('id')
            .eq('code', programCode)
            .maybeSingle()
        if (programError) throw programError
        if (!program) return []

        const { data: track, error: trackError } = await admin
            .from('tracks')
            .select('id')
            .eq('program_id', program.id)
            .eq('code', trackCode)
            .maybeSingle()
        if (trackError) throw trackError
        if (!track) return []

        const { data: products, error: productError } = await admin
            .from('products')
            .select('id, code, name, description, product_type, duration_days')
            .eq('program_id', program.id)
            .eq('track_id', track.id)
            .in('status', ['active', 'ACTIVE'])
            .order('created_at', { ascending: true })
        if (productError) throw productError
        if (!products?.length) return []

        const productIds = products.map((product) => stringValue(product.id)).filter(Boolean)
        const { data: prices, error: priceError } = await admin
            .from('product_prices')
            .select('id, product_id, currency, amount, starts_at, ends_at, status')
            .in('product_id', productIds)
            .in('status', ['active', 'ACTIVE'])
            .lte('starts_at', now)
            .order('starts_at', { ascending: false })
        if (priceError) throw priceError

        const activePriceByProduct = new Map<string, (typeof prices)[number]>()
        for (const price of prices ?? []) {
            const endsAt = nullableString(price.ends_at)
            if (endsAt && endsAt < now) continue
            const productId = stringValue(price.product_id)
            if (productId && !activePriceByProduct.has(productId)) activePriceByProduct.set(productId, price)
        }

        const untyped = await createAdminClient()
        const { data: grants, error: grantError } = await untyped
            .from('product_wallet_grants')
            .select('product_id, wallet_type, amount')
            .in('product_id', productIds)
            .eq('wallet_type', 'exam_token')
        if (grantError) throw grantError
        const tokenGrantByProduct = new Map<string, number>(
            (grants ?? []).map((grant) => [String(grant.product_id), numberValue(grant.amount)])
        )

        return products.flatMap((product) => {
            const productId = stringValue(product.id)
            const price = activePriceByProduct.get(productId)
            if (!price) return []
            return [{
                id: productId,
                code: stringValue(product.code),
                name: stringValue(product.name),
                description: nullableString(product.description),
                productType: stringValue(product.product_type),
                durationDays: nullableNumber(product.duration_days),
                price: numberValue(price.amount),
                currency: stringValue(price.currency) || 'IDR',
                tokenGrant: tokenGrantByProduct.get(productId) ?? 0,
            }]
        })
    }

    async getProductOfferByCode(productCode: string): Promise<ProductOffer | null> {
        const admin = await createV2AdminClient()
        const now = new Date().toISOString()
        const { data: product, error: productError } = await admin
            .from('products')
            .select('id, code, name, description, product_type, duration_days')
            .eq('code', productCode)
            .in('status', ['active', 'ACTIVE'])
            .maybeSingle()
        if (productError) throw productError
        if (!product) return null

        const productId = stringValue(product.id)
        const { data: prices, error: priceError } = await admin
            .from('product_prices')
            .select('currency, amount, starts_at, ends_at')
            .eq('product_id', productId)
            .in('status', ['active', 'ACTIVE'])
            .lte('starts_at', now)
            .order('starts_at', { ascending: false })
            .limit(20)
        if (priceError) throw priceError
        const price = (prices ?? []).find((row) => {
            const endsAt = nullableString(row.ends_at)
            return !endsAt || endsAt >= now
        })
        if (!price) return null

        const untyped = await createAdminClient()
        const { data: grant, error: grantError } = await untyped
            .from('product_wallet_grants')
            .select('amount')
            .eq('product_id', productId)
            .eq('wallet_type', 'exam_token')
            .maybeSingle()
        if (grantError) throw grantError

        return {
            id: productId,
            code: stringValue(product.code),
            name: stringValue(product.name),
            description: nullableString(product.description),
            productType: stringValue(product.product_type),
            durationDays: nullableNumber(product.duration_days),
            price: numberValue(price.amount),
            currency: stringValue(price.currency) || 'IDR',
            tokenGrant: numberValue(grant?.amount),
        }
    }

    async createOrder(userId: string, productCode: string, adminFee = 0): Promise<CommerceOrder> {
        const offer = await this.getProductOfferByCode(productCode)
        if (!offer) throw new Error('PRODUCT_NOT_AVAILABLE')
        if (offer.price <= 0) throw new Error('PRODUCT_PRICE_INVALID')
        if (!Number.isInteger(adminFee) || adminFee < 0) throw new Error('ADMIN_FEE_INVALID')

        const admin = await createV2AdminClient()
        const orderNumber = `ORD-${offer.code}-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`
        const subtotal = offer.price
        const totalAmount = subtotal + adminFee

        const { data: order, error: orderError } = await admin
            .from('orders')
            .insert({
                order_number: orderNumber,
                user_id: userId,
                status: 'pending',
                subtotal,
                discount_amount: 0,
                total_amount: totalAmount,
                currency: offer.currency,
            })
            .select('id, order_number, user_id, status, subtotal, total_amount, currency')
            .single()
        if (orderError) throw orderError

        const orderId = stringValue(order.id)
        const { error: itemError } = await admin
            .from('order_items')
            .insert({
                order_id: orderId,
                product_id: offer.id,
                quantity: 1,
                unit_price: offer.price,
                discount: 0,
                total: offer.price,
            })
        if (itemError) {
            await admin.from('orders').delete().eq('id', orderId)
            throw itemError
        }

        return {
            id: orderId,
            orderNumber: stringValue(order.order_number),
            userId: stringValue(order.user_id),
            status: stringValue(order.status),
            subtotal: numberValue(order.subtotal),
            totalAmount: numberValue(order.total_amount),
            currency: stringValue(order.currency) || 'IDR',
            productId: offer.id,
            productCode: offer.code,
            productName: offer.name,
            productType: offer.productType,
            unitPrice: offer.price,
        }
    }

    async attachPendingPayment(orderId: string, snapToken: string, rawResponse: Json = {}) {
        const admin = await createV2AdminClient()
        const { data: order, error: orderError } = await admin
            .from('orders')
            .select('id, total_amount')
            .eq('id', orderId)
            .maybeSingle()
        if (orderError) throw orderError
        if (!order) throw new Error('ORDER_NOT_FOUND')

        const { error } = await admin
            .from('payments')
            .upsert({
                order_id: stringValue(order.id),
                provider: 'midtrans',
                provider_transaction_id: null,
                payment_method: null,
                amount: numberValue(order.total_amount),
                status: 'pending',
                raw_response: {
                    ...(rawResponse && !Array.isArray(rawResponse) && typeof rawResponse === 'object' ? rawResponse : {}),
                    snapToken,
                },
                updated_at: new Date().toISOString(),
            }, { onConflict: 'order_id,provider' })
        if (error) throw error
    }

    async markOrderFailed(orderId: string) {
        const admin = await createV2AdminClient()
        const { error } = await admin
            .from('orders')
            .update({ status: 'failed' })
            .eq('id', orderId)
            .neq('status', 'paid')
        if (error) throw error
    }

    async getOrderForUser(orderId: string, userId: string) {
        const admin = await createV2AdminClient()
        const { data, error } = await admin
            .from('orders')
            .select('id, order_number, user_id, status, subtotal, total_amount, currency, paid_at, created_at')
            .eq('id', orderId)
            .eq('user_id', userId)
            .maybeSingle()
        if (error) throw error
        return data
    }

    async getOrderByNumber(orderNumber: string) {
        const admin = await createV2AdminClient()
        const { data, error } = await admin
            .from('orders')
            .select('id, order_number, user_id, status, subtotal, total_amount, currency, paid_at, created_at')
            .eq('order_number', orderNumber)
            .maybeSingle()
        if (error) throw error
        return data
    }

    async applyProviderStatus(input: {
        orderId: string
        status: string
        providerTransactionId?: string | null
        paymentMethod?: string | null
        amount: number
        rawResponse: Json
    }) {
        const admin = await createAdminClient()
        const { error } = await admin.rpc('fulfill_paid_order', {
            p_order_id: input.orderId,
            p_provider: 'midtrans',
            p_status: input.status,
            p_provider_transaction_id: input.providerTransactionId ?? '',
            p_payment_method: input.paymentMethod ?? '',
            p_amount: input.amount,
            p_raw_response: input.rawResponse,
        })
        if (error) throw error
    }

    async getEventOffer(eventId: string) {
        const untyped = await createAdminClient()
        const { data: mapping, error: mappingError } = await untyped
            .from('event_products')
            .select('product_id, event_id, session_id, status')
            .eq('event_id', eventId)
            .eq('status', 'active')
            .maybeSingle()
        if (mappingError) throw mappingError
        if (!mapping) return null

        const admin = await createV2AdminClient()
        const { data: product, error: productError } = await admin
            .from('products')
            .select('code')
            .eq('id', String(mapping.product_id))
            .maybeSingle()
        if (productError) throw productError
        if (!product) return null

        const offer = await this.getProductOfferByCode(stringValue(product.code))
        if (!offer) return null
        return { ...offer, eventId, sessionId: String(mapping.session_id || '') || null }
    }

    async getLatestOrderForProduct(userId: string, productId: string) {
        const admin = await createV2AdminClient()
        const { data: items, error: itemError } = await admin
            .from('order_items')
            .select('order_id')
            .eq('product_id', productId)
            .order('id', { ascending: false })
            .limit(100)
        if (itemError) throw itemError
        const orderIds = Array.from(new Set((items ?? []).map((item) => stringValue(item.order_id)).filter(Boolean)))
        if (orderIds.length === 0) return null

        const { data: orders, error: orderError } = await admin
            .from('orders')
            .select('id, order_number, status, total_amount, created_at')
            .eq('user_id', userId)
            .in('id', orderIds)
            .order('created_at', { ascending: false })
            .limit(1)
        if (orderError) throw orderError
        const order = orders?.[0]
        if (!order) return null
        const orderId = stringValue(order.id)

        const { data: payment, error: paymentError } = await admin
            .from('payments')
            .select('status, raw_response')
            .eq('order_id', orderId)
            .eq('provider', 'midtrans')
            .maybeSingle()
        if (paymentError) throw paymentError

        const raw = (payment?.raw_response ?? {}) as Json
        return {
            id: orderId,
            order_number: stringValue(order.order_number),
            status: stringValue(order.status),
            total_amount: numberValue(order.total_amount),
            created_at: nullableString(order.created_at),
            paymentStatus: payment ? stringValue(payment.status) : null,
            snapToken: readSnapToken(raw),
        }
    }
}

function readSnapToken(value: Json) {
    if (!value || Array.isArray(value) || typeof value !== 'object') return null
    const token = value.snapToken
    return typeof token === 'string' ? token : null
}

export const commerceService = new CommerceService()
