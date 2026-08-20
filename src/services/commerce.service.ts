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

        const productIds = products.map((product) => product.id)
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
            if (price.ends_at && price.ends_at < now) continue
            if (!activePriceByProduct.has(price.product_id)) activePriceByProduct.set(price.product_id, price)
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
            const price = activePriceByProduct.get(product.id)
            if (!price) return []
            return [{
                id: product.id,
                code: product.code,
                name: product.name,
                description: product.description,
                productType: product.product_type,
                durationDays: product.duration_days,
                price: numberValue(price.amount),
                currency: price.currency,
                tokenGrant: tokenGrantByProduct.get(product.id) ?? 0,
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

        const { data: prices, error: priceError } = await admin
            .from('product_prices')
            .select('currency, amount, starts_at, ends_at')
            .eq('product_id', product.id)
            .in('status', ['active', 'ACTIVE'])
            .lte('starts_at', now)
            .order('starts_at', { ascending: false })
            .limit(20)
        if (priceError) throw priceError
        const price = (prices ?? []).find((row) => !row.ends_at || row.ends_at >= now)
        if (!price) return null

        const untyped = await createAdminClient()
        const { data: grant, error: grantError } = await untyped
            .from('product_wallet_grants')
            .select('amount')
            .eq('product_id', product.id)
            .eq('wallet_type', 'exam_token')
            .maybeSingle()
        if (grantError) throw grantError

        return {
            id: product.id,
            code: product.code,
            name: product.name,
            description: product.description,
            productType: product.product_type,
            durationDays: product.duration_days,
            price: numberValue(price.amount),
            currency: price.currency,
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

        const { error: itemError } = await admin
            .from('order_items')
            .insert({
                order_id: order.id,
                product_id: offer.id,
                quantity: 1,
                unit_price: offer.price,
                discount: 0,
                total: offer.price,
            })
        if (itemError) {
            await admin.from('orders').delete().eq('id', order.id)
            throw itemError
        }

        return {
            id: order.id,
            orderNumber: order.order_number,
            userId: order.user_id,
            status: order.status,
            subtotal: numberValue(order.subtotal),
            totalAmount: numberValue(order.total_amount),
            currency: order.currency,
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
                order_id: order.id,
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
            .eq('id', mapping.product_id)
            .maybeSingle()
        if (productError) throw productError
        if (!product) return null

        const offer = await this.getProductOfferByCode(product.code)
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
        const orderIds = Array.from(new Set((items ?? []).map((item) => item.order_id)))
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

        const { data: payment, error: paymentError } = await admin
            .from('payments')
            .select('status, raw_response')
            .eq('order_id', order.id)
            .eq('provider', 'midtrans')
            .maybeSingle()
        if (paymentError) throw paymentError

        const raw = (payment?.raw_response ?? {}) as Json
        return {
            ...order,
            paymentStatus: payment?.status ?? null,
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
