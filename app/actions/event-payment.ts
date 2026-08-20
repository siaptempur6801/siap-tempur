'use server'

import { createV2AdminClient, createV2Client } from '@/lib/utils/supabase/server'
import { expireTransaction } from '@/lib/midtrans'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/logger'
import { validateCsrf } from '@/lib/csrf'
import type { CreateEventPaymentTransactionResult } from '@/lib/event-payment'
import { commerceService } from '@/src/services/commerce.service'
import { paymentService } from '@/src/services/payment.service'

export async function createEventPaymentTransaction(
    eventId: string,
    options: { refreshPending?: boolean } = {}
): Promise<CreateEventPaymentTransactionResult> {
    try {
        await validateCsrf()
    } catch {
        return { success: false, message: 'Sesi keamanan kadaluarsa. Muat ulang halaman lalu coba lagi.' }
    }

    const supabase = await createV2Client()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login?next=/cpns/dashboard/event')

    try {
        const offer = await commerceService.getEventOffer(eventId)
        if (!offer || offer.price <= 0) {
            return { success: false, message: 'Event ini tidak memiliki tiket berbayar aktif' }
        }
        if (!offer.sessionId) {
            return { success: false, message: 'Sesi tiket event belum dikonfigurasi admin' }
        }

        const admin = await createV2AdminClient()
        const { data: registration, error: registrationError } = await admin
            .from('event_registrations')
            .select('id')
            .eq('event_id', eventId)
            .eq('user_id', user.id)
            .maybeSingle()
        if (registrationError) throw registrationError
        if (registration) {
            return { success: false, message: 'Kamu sudah terdaftar di event ini.' }
        }

        const existingOrder = await commerceService.getLatestOrderForProduct(user.id, offer.id)
        if (existingOrder?.paymentStatus === 'pending' && existingOrder.snapToken && !options.refreshPending) {
            return { success: true, token: existingOrder.snapToken, orderId: existingOrder.id }
        }
        if (existingOrder && String(existingOrder.status).toLowerCase() === 'paid') {
            return { success: false, message: 'Tiket sudah dibayar. Muat ulang halaman event.' }
        }

        if (existingOrder?.paymentStatus === 'pending' && options.refreshPending) {
            try {
                await expireTransaction(existingOrder.order_number)
            } catch (error) {
                logger.warn('Failed to expire old canonical event payment', {
                    orderId: existingOrder.id,
                    error: error instanceof Error ? error.message : String(error),
                })
                return { success: false, message: 'Gagal membatalkan tagihan lama. Cek status pembayaran dulu.' }
            }
            await commerceService.applyProviderStatus({
                orderId: existingOrder.id,
                status: 'expire',
                amount: Number(existingOrder.total_amount),
                rawResponse: { reason: 'replaced_by_new_checkout' },
            })
        }

        const checkout = await paymentService.createCheckout({
            userId: user.id,
            email: user.email,
            fullName: typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : null,
            productCode: offer.code,
            adminFee: 0,
            returnPath: '/cpns/dashboard/event',
        })

        return { success: true, token: checkout.token, orderId: checkout.orderId }
    } catch (error) {
        logger.error('Canonical event checkout creation failed', error, { eventId, userId: user.id })
        return { success: false, message: 'Gagal membuat pembayaran tiket event. Coba lagi.' }
    }
}

export async function syncEventPaymentStatus(orderId: string): Promise<{
    status: string
    registered: boolean
    message: string
}> {
    try { await validateCsrf() } catch {
        return { status: 'error', registered: false, message: 'Invalid request' }
    }

    const supabase = await createV2Client()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { status: 'error', registered: false, message: 'Unauthorized' }

    try {
        const result = await paymentService.syncUserOrder(user.id, orderId)
        const admin = await createV2AdminClient()
        const { data: registration, error } = await admin
            .from('event_registrations')
            .select('id')
            .eq('user_id', user.id)
            .eq('order_id', orderId)
            .maybeSingle()
        if (error) throw error

        if (result.paid) {
            revalidatePath('/cpns/dashboard/event')
            revalidatePath('/cpns/dashboard')
        }

        const messages: Record<string, string> = {
            pending: 'Pembayaran masih pending',
            capture: 'Pembayaran berhasil! Kamu sudah terdaftar.',
            settlement: 'Pembayaran berhasil! Kamu sudah terdaftar.',
            expire: 'Pembayaran sudah kadaluarsa',
            cancel: 'Pembayaran dibatalkan',
            deny: 'Pembayaran ditolak',
        }

        return {
            status: result.status,
            registered: Boolean(registration),
            message: messages[result.status] || `Status: ${result.status}`,
        }
    } catch (error) {
        logger.error('Canonical event payment sync failed', error, { orderId, userId: user.id })
        return { status: 'error', registered: false, message: 'Gagal cek status pembayaran' }
    }
}
