'use server'

import { createClient } from '@/utils/supabase/server'
import { createTransaction } from '@/lib/midtrans'

export async function createUpgradeTransaction() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error("Unauthorized")
    }

    const orderId = `PREMIUM-${user.id}-${Date.now()}`
    const amount = 99000 // Rp 99.000

    // 1. Log transaction in DB
    const { error: dbError } = await supabase
        .from('transactions')
        .insert({
            user_id: user.id,
            order_id: orderId,
            amount: amount,
            package_name: 'PREMIUM PACKAGE',
            status: 'pending'
        })

    if (dbError) {
        console.error('Failed to log transaction:', dbError)
        // We continue anyway for the mock, but log it.
    }

    // 2. Call Midtrans
    const transaction = await createTransaction(orderId, amount)

    return transaction
}
