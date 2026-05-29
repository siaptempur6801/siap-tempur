'use server'

import { createClient } from '@/lib/utils/supabase/server'
import { createTransaction } from '@/lib/midtrans'
import { PRICING_PACKAGES } from '@/lib/constants'
import { env } from '@/lib/env'
import { logger } from '@/lib/logger'

const SUCCESS_STATUSES = new Set(['capture', 'settlement'])
const MIDTRANS_STATUSES = new Set(['pending', 'capture', 'settlement', 'expire', 'cancel', 'deny'])

function isValidMidtransStatus(status: unknown): status is string {
    return typeof status === 'string' && MIDTRANS_STATUSES.has(status)
}

export async function createPackageTransaction(packageId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error("Unauthorized")
    }

    // Find the package from constants
    const pkg = PRICING_PACKAGES.find(p => p.id === packageId)
    if (!pkg) {
        throw new Error("Package not found")
    }

    const orderId = `SKD-${pkg.id.toUpperCase()}-${user.id.substring(0, 8)}-${Date.now()}`
    const baseAmount = pkg.price

    // QRIS Flat Rp 500 Admin Fee
    const adminFee = 500
    const grossAmount = baseAmount + adminFee
    const enabledPayments = ['qris', 'other_qris']

    // 1. Call Midtrans API First
    const customerDetails = {
        first_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        email: user.email,
    }

    const itemDetails = [
        {
            id: pkg.id,
            price: baseAmount,
            quantity: 1,
            name: pkg.name
        },
        {
            id: 'admin_fee',
            price: adminFee,
            quantity: 1,
            name: 'Biaya Admin (QRIS)'
        }
    ]

    const transaction = await createTransaction(orderId, grossAmount, customerDetails, itemDetails, enabledPayments)

    if (!transaction || !transaction.token) {
        throw new Error("Gagal memperoleh token pembayaran dari Midtrans.")
    }

    // 2. Log transaction in DB with the snap_token (single INSERT, avoids UPDATE RLS issues)
    const { error: dbError } = await supabase
        .from('transactions')
        .insert({
            user_id: user.id,
            order_id: orderId,
            amount: grossAmount,
            package_name: pkg.name,
            status: 'pending',
            snap_token: transaction.token
        })

    if (dbError) {
        logger.error('Payment transaction insert failed', dbError, { orderId })
        // If DB insertion fails, we should still return the token so the user can pay, 
        // though the webhook might not find the transaction (or maybe webhook creates it via upsert).
        // Best case: it succeeds.
    }

    return {
        ...transaction,
        orderId
    }
}

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function syncPaymentStatus(orderId: string) {
    const supabaseContext = await createClient()
    const { data: { user } } = await supabaseContext.auth.getUser()
    if (!user) return false;
    if (typeof orderId !== 'string' || orderId.trim() === '') return false;

    try {
        const serverKey = env.midtransServerKey()
        const isSandbox = serverKey.includes('SB-')
        const baseUrl = isSandbox ? 'https://api.sandbox.midtrans.com/v2' : 'https://api.midtrans.com/v2'

        const response = await fetch(`${baseUrl}/${orderId}/status`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': 'Basic ' + Buffer.from(serverKey + ':').toString('base64')
            },
            cache: 'no-store'
        })

        if (!response.ok) {
            // Jika Midtrans API melempar 404 (Not Found), seringkali karena snap session expired
            // Mari kita cek umur transaksi di database
            if (response.status === 404) {
                const adminSupabase = createSupabaseClient(
                    env.supabaseUrl(),
                    env.supabaseServiceRoleKey()
                )

                const { data: txInfo } = await adminSupabase
                    .from('transactions')
                    .select('created_at, status')
                    .eq('order_id', orderId)
                    .eq('user_id', user.id)
                    .single()

                if (txInfo && txInfo.status === 'pending') {
                    const txAge = new Date().getTime() - new Date(txInfo.created_at).getTime();
                    const mins15 = 15 * 60 * 1000;

                    if (txAge > mins15) {
                        // Paksa menjadi expire karena sudah terlalu lama dan tidak ditemukan di Midtrans
                        await adminSupabase
                            .from('transactions')
                            .update({ status: 'expire' })
                            .eq('order_id', orderId)
                    }
                }
            }
            return false;
        }

        const result = await response.json()
        const transaction_status = result.transaction_status

        if (!isValidMidtransStatus(transaction_status)) return false;

        // Use Admin client to bypass RLS for updating transaction and quota safely
        const adminSupabase = createSupabaseClient(
            env.supabaseUrl(),
            env.supabaseServiceRoleKey()
        )

        const { data: tx } = await adminSupabase
            .from('transactions')
            .select('*')
            .eq('order_id', orderId)
            .eq('user_id', user.id)
            .single()

        if (!tx) return false;

        const midtransAmount = Number(result.gross_amount)
        if (!Number.isFinite(midtransAmount) || midtransAmount !== tx.amount) {
            logger.warn('Payment gross amount mismatch', { orderId })
            return false
        }

        const pkg = PRICING_PACKAGES.find(p => p.name === tx.package_name)
        const tokenCount = SUCCESS_STATUSES.has(transaction_status) && pkg ? pkg.tokens : 0

        const { error: processError } = await adminSupabase.rpc('process_paid_transaction', {
            p_order_id: orderId,
            p_transaction_status: transaction_status,
            p_increment_by: tokenCount
        })

        if (processError) {
            logger.error('Failed to process transaction status', processError, { orderId })
            return false
        }

        return true;
    } catch (error) {
        logger.error('Payment status sync failed', error, { orderId })
        return false;
    }
}
