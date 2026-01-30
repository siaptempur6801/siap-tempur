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
    // We haven't created a 'transactions' table yet in the visible schema files,
    // but assuming it exists or we just create logic.
    // Let's assume we skip DB log for this strictly frontend demo step
    // or we'd add a 'transactions' table properly in a migration.

    // 2. Call Midtrans
    const transaction = await createTransaction(orderId, amount)

    return transaction
}
