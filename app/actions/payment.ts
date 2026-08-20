'use server'

import { createClient } from '@/lib/utils/supabase/server'
import { logger } from '@/lib/logger'
import { validateCsrf } from '@/lib/csrf'
import { isServerActionRateLimited } from '@/lib/server-rate-limit'
import { paymentService } from '@/src/services/payment.service'

export async function createPackageTransaction(productCode: string) {
    try { await validateCsrf() } catch { throw new Error('Invalid request') }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    if (await isServerActionRateLimited(user.id, 'create_transaction', 5, 60000)) {
        throw new Error('Terlalu banyak permintaan. Silakan coba lagi nanti.')
    }

    try {
        return await paymentService.createCheckout({
            userId: user.id,
            email: user.email,
            fullName: typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : null,
            productCode,
            adminFee: 500,
            returnPath: '/cpns/dashboard/profile',
        })
    } catch (error) {
        logger.error('Package checkout creation failed', error, { productCode, userId: user.id })
        const message = error instanceof Error ? error.message : 'Gagal membuat transaksi'
        if (message === 'PRODUCT_NOT_AVAILABLE') throw new Error('Paket tidak tersedia')
        throw new Error('Terjadi kesalahan sistem saat memproses pembayaran. Silakan coba lagi.')
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
