'use server'

import { createAdminClient, createClient } from '@/lib/utils/supabase/server'
import { createTransaction } from '@/lib/midtrans'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { env } from '@/lib/env'
import { logger } from '@/lib/logger'
import { validateCsrf } from '@/lib/csrf'
import {
    getReusableEventPaymentResult,
    type CreateEventPaymentTransactionResult,
} from '@/lib/event-payment'

const SUCCESS_STATUSES = new Set(['capture', 'settlement'])

/**
 * Creates a Midtrans Snap transaction for an event ticket.
 * Order ID format: EVT-{eventId[0..7]}-{userId[0..7]}-{timestamp}
 * Does NOT consume tryout tokens.
 */
export async function createEventPaymentTransaction(eventId: string): Promise<CreateEventPaymentTransactionResult> {
    try {
        await validateCsrf()
    } catch {
        return { success: false, message: 'Sesi keamanan kadaluarsa. Muat ulang halaman lalu coba lagi.' }
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login?next=/cpns/dashboard/event')

    const admin = await createAdminClient()

    // Fetch event details
    const { data: event, error: eventError } = await admin
        .from('tryout_events')
        .select('id, title, price, is_paid, status, max_participants')
        .eq('id', eventId)
        .single()

    if (eventError || !event) {
        return { success: false, message: 'Event tidak ditemukan' }
    }

    if (!event.is_paid || event.price <= 0) {
        return { success: false, message: 'Event ini tidak berbayar' }
    }

    if (!['scheduled', 'live'].includes(event.status)) {
        return { success: false, message: 'Event belum dibuka' }
    }

    const { data: existingParticipant } = await admin
        .from('tryout_event_participants')
        .select('id')
        .eq('user_id', user.id)
        .eq('event_id', eventId)
        .maybeSingle()

    if (existingParticipant) {
        return { success: false, message: 'Kamu sudah terdaftar di event ini.' }
    }

    // Check if user already paid / registered
    const { data: existingPayment } = await admin
        .from('event_payments')
        .select('id, status, order_id, snap_token')
        .eq('user_id', user.id)
        .eq('event_id', eventId)
        .maybeSingle()

    const reusablePayment = getReusableEventPaymentResult(existingPayment)
    if (reusablePayment) return reusablePayment

    if (existingPayment && existingPayment.status === 'pending') {
        if (SUCCESS_STATUSES.has(existingPayment.status)) {
            return { success: false, message: 'Tiket sudah dibeli. Kamu sudah terdaftar di event ini.' }
        }
        // Pending payment exists — should not create new
        return { success: false, message: 'Kamu sudah punya tagihan yang belum selesai. Cek status pembayaran.' }
    }

    // Check quota
    if (event.max_participants) {
        const { count } = await admin
            .from('tryout_event_participants')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', eventId)

        if ((count || 0) >= event.max_participants) {
            return { success: false, message: 'Kuota peserta event sudah penuh' }
        }
    }

    const orderId = `EVT-${eventId.substring(0, 8)}-${user.id.substring(0, 8)}-${Date.now()}`
    const amount = event.price // No admin fee per user preference

    const customerDetails = {
        first_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        email: user.email,
    }

    const itemDetails = [
        {
            id: `ticket-${event.id}`,
            price: amount,
            quantity: 1,
            name: `Tiket ${event.title}`,
        },
    ]

    const transaction = await createTransaction(
        orderId,
        amount,
        customerDetails,
        itemDetails,
        ['qris', 'other_qris']
    ).catch((error) => {
        logger.error('Event payment transaction failed', error, { eventId, orderId })
        return null
    })

    if (!transaction?.token) {
        return { success: false, message: 'Gagal memperoleh token pembayaran. Coba lagi.' }
    }

    const paymentPayload = {
        user_id: user.id,
        event_id: eventId,
        order_id: orderId,
        amount,
        status: 'pending',
        snap_token: transaction.token,
    }

    const { error: dbError } = existingPayment
        ? await admin
            .from('event_payments')
            .update({
                ...paymentPayload,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', existingPayment.id)
            .eq('user_id', user.id)
            .eq('event_id', eventId)
        : await admin
            .from('event_payments')
            .insert(paymentPayload)

    if (dbError) {
        logger.error('Event payment save failed', dbError, { eventId, orderId })
        return { success: false, message: 'Gagal menyimpan transaksi pembayaran. Coba lagi.' }
    }

    return { success: true, token: transaction.token as string, orderId }
}

/**
 * Manual polling — called by UI "Cek Status" button.
 * Checks Midtrans status and if settled, auto-registers user as participant.
 */
export async function syncEventPaymentStatus(orderId: string): Promise<{
    status: string
    registered: boolean
    message: string
}> {
    try { await validateCsrf() } catch { return { status: 'error', registered: false, message: 'Invalid request' } }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { status: 'error', registered: false, message: 'Unauthorized' }
    if (!orderId || !orderId.startsWith('EVT-')) {
        return { status: 'error', registered: false, message: 'Order ID tidak valid' }
    }

    const admin = await createAdminClient()

    try {
        const serverKey = env.midtransServerKey()
        const isSandbox = serverKey.includes('SB-')
        const baseUrl = isSandbox ? 'https://api.sandbox.midtrans.com/v2' : 'https://api.midtrans.com/v2'

        const response = await fetch(`${baseUrl}/${orderId}/status`, {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: 'Basic ' + Buffer.from(serverKey + ':').toString('base64'),
            },
            cache: 'no-store',
        })

        if (!response.ok) {
            // Check DB for expired pending
            if (response.status === 404) {
                const { data: paymentInfo } = await admin
                    .from('event_payments')
                    .select('created_at, status')
                    .eq('order_id', orderId)
                    .eq('user_id', user.id)
                    .single()

                if (paymentInfo?.status === 'pending') {
                    const age = Date.now() - new Date(paymentInfo.created_at).getTime()
                    if (age > 15 * 60 * 1000) {
                        await admin
                            .from('event_payments')
                            .update({ status: 'expire', updated_at: new Date().toISOString() })
                            .eq('order_id', orderId)
                        return { status: 'expire', registered: false, message: 'Pembayaran sudah kadaluarsa' }
                    }
                }
            }
            return { status: 'pending', registered: false, message: 'Pembayaran belum dikonfirmasi' }
        }

        const result = await response.json()
        const txStatus: string = result.transaction_status

        // Fetch payment from DB to get event_id
        const { data: payment } = await admin
            .from('event_payments')
            .select('id, event_id, status, amount')
            .eq('order_id', orderId)
            .eq('user_id', user.id)
            .single()

        if (!payment) {
            return { status: 'error', registered: false, message: 'Data pembayaran tidak ditemukan' }
        }

        // Validate amount
        const midtransAmount = Number(result.gross_amount)
        if (!Number.isFinite(midtransAmount) || midtransAmount !== payment.amount) {
            logger.warn('Event payment amount mismatch', { orderId })
            return { status: 'error', registered: false, message: 'Verifikasi jumlah pembayaran gagal' }
        }

        const isSuccess = SUCCESS_STATUSES.has(txStatus)

        if (isSuccess && !SUCCESS_STATUSES.has(payment.status)) {
            // Use RPC to atomically settle + register
            const { error: rpcError } = await admin.rpc('register_event_after_payment', {
                p_user_id: user.id,
                p_event_id: payment.event_id,
                p_order_id: orderId,
            })

            if (rpcError) {
                logger.error('Event payment registration RPC failed', rpcError, { orderId })
                return { status: txStatus, registered: false, message: 'Gagal mendaftarkan ke event' }
            }

            revalidatePath('/cpns/dashboard/event')
            revalidatePath('/cpns/dashboard')
            return { status: txStatus, registered: true, message: 'Pembayaran berhasil! Kamu sudah terdaftar.' }
        }

        // Just update status in DB (non-success)
        await admin
            .from('event_payments')
            .update({ status: txStatus, updated_at: new Date().toISOString() })
            .eq('order_id', orderId)

        const messages: Record<string, string> = {
            pending: 'Pembayaran masih pending',
            expire: 'Pembayaran sudah kadaluarsa',
            cancel: 'Pembayaran dibatalkan',
            deny: 'Pembayaran ditolak',
        }

        return {
            status: txStatus,
            registered: isSuccess,
            message: messages[txStatus] || `Status: ${txStatus}`,
        }
    } catch (err) {
        logger.error('Event payment status sync failed', err, { orderId })
        return { status: 'error', registered: false, message: 'Gagal cek status pembayaran' }
    }
}
