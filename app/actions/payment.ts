'use server'

import { createClient } from '@/lib/utils/supabase/server'
import { logger } from '@/lib/logger'
import { validateCsrf } from '@/lib/csrf'
import { isServerActionRateLimited } from '@/lib/server-rate-limit'
import { paymentService } from '@/src/services/payment.service'

export type CreatePackageTransactionResult =
    | {
        success: true
        token: string
        orderId: string
        orderNumber: string
        redirectUrl: string | null
    }
    | {
        success: false
        message: string
    }

function checkoutErrorMessage(error: unknown) {
    const message = error instanceof Error ? error.message : ''

    if (message === 'PRODUCT_NOT_AVAILABLE') return 'Paket tidak tersedia.'
    if (message.includes('must use a Midtrans Sandbox key on staging')) {
        return 'Midtrans Sandbox belum dikonfigurasi untuk Preview staging. Admin perlu memasang Sandbox Server Key dan Sandbox Client Key di environment Preview.'
    }
    if (message === 'MIDTRANS_TOKEN_MISSING') {
        return 'Midtrans tidak mengembalikan token pembayaran. Silakan coba lagi.'
    }

    return 'Terjadi kesalahan sistem saat memproses pembayaran. Silakan coba lagi.'
}

export async function createPackageTransaction(productCode: string): Promise<CreatePackageTransactionResult> {
    try {
        await validateCsrf()
    } catch {
        return { success: false, message: 'Sesi keamanan kadaluarsa. Muat ulang halaman lalu coba lagi.' }
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, message: 'Sesi login tidak ditemukan. Silakan login ulang.' }

    if (await isServerActionRateLimited(user.id, 'create_transaction', 5, 60000)) {
        return { success: false, message: 'Terlalu banyak permintaan. Silakan coba lagi nanti.' }
    }

    try {
        const checkout = await paymentService.createCheckout({
            userId: user.id,
            email: user.email,
            fullName: typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : null,
            productCode,
            adminFee: 500,
            returnPath: '/cpns/dashboard/profile',
        })

        return {
            success: true,
            token: checkout.token,
            orderId: checkout.orderId,
            orderNumber: checkout.orderNumber,
            redirectUrl: checkout.redirectUrl,
        }
    } catch (error) {
        logger.error('Package checkout creation failed', error, { productCode, userId: user.id })
        return { success: false, message: checkoutErrorMessage(error) }
    }
}

export async function syncPaymentStatus(orderId: string) {
    try { await validateCsrf() } catch { return false }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || typeof orderId !== 'string' || orderId.trim() === '') return false

    if (await isServerActionRateLimited(user.id, 'sync_payment', 10, 60000)) {
        logger.warn('Rate limit exceeded for syncPaymentStatus', { userId: user.id, orderId })
        return false
    }

    try {
        await paymentService.syncUserOrder(user.id, orderId)
        return true
    } catch (error) {
        logger.error('Payment status sync failed', error, { orderId, userId: user.id })
        return false
    }
}
