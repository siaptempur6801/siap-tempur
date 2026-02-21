import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { PRICING_PACKAGES } from '@/lib/constants'
import crypto from 'crypto'

// Initialize Supabase with Service Role for backend updates
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { order_id, transaction_status, status_code, gross_amount, signature_key } = body

        // === Signature Verification ===
        const serverKey = process.env.MIDTRANS_SERVER_KEY || ''
        const hash = crypto.createHash('sha512').update(`${order_id}${status_code}${gross_amount}${serverKey}`).digest('hex')

        if (hash !== signature_key) {
            console.error('[Webhook] Invalid signature key for order:', order_id)
            return NextResponse.json({ message: 'Invalid signature key' }, { status: 403 })
        }
        // === End Signature Verification ===

        console.log(`[Webhook] Received status for ${order_id}: ${transaction_status}`)

        // 1. Get current transaction from DB
        const { data: transaction, error: txError } = await supabase
            .from('transactions')
            .select('*')
            .eq('order_id', order_id)
            .single()

        if (txError || !transaction) {
            return NextResponse.json({ message: 'Transaction not found' }, { status: 404 })
        }

        // If transaction already settled, don't double count
        if (transaction.status === 'settlement') {
            return NextResponse.json({ message: 'Already processed' })
        }

        // 2. Update status in DB
        const { error: updateError } = await supabase
            .from('transactions')
            .update({ status: transaction_status })
            .eq('order_id', order_id)

        if (updateError) throw updateError

        // 3. If settled/success, update user quota
        if (transaction_status === 'settlement' || transaction_status === 'capture') {
            // Find package to get token count
            // Note: package_name matches pkg.name from constants
            const pkg = PRICING_PACKAGES.find(p => p.name === transaction.package_name)
            const tokenCount = pkg ? pkg.tokens : 0

            if (tokenCount > 0) {
                // Increment quota in profiles
                const { error: quotaError } = await supabase.rpc('increment_tryout_quota', {
                    user_id_param: transaction.user_id,
                    increment_by: tokenCount
                })

                if (quotaError) {
                    console.error('[Webhook] Failed to increment quota:', quotaError)
                    // Fallback to direct update if RPC fails
                    await supabase
                        .from('profiles')
                        .update({
                            tryout_quota: (await supabase.from('profiles').select('tryout_quota').eq('id', transaction.user_id).single()).data?.tryout_quota + tokenCount
                        })
                        .eq('id', transaction.user_id)
                }

                console.log(`[Webhook] Successfully added ${tokenCount} tokens to user ${transaction.user_id}`)
            }
        }

        return NextResponse.json({ message: 'OK' })
    } catch (error) {
        console.error('[Webhook] Error:', error)
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 })
    }
}
