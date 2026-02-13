'use server'

import { createClient } from '@/utils/supabase/server'
import { createTransaction } from '@/lib/midtrans'
import { PRICING_PACKAGES } from '@/lib/constants'

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
    const amount = pkg.price

    // 1. Log transaction in DB
    const { error: dbError } = await supabase
        .from('transactions')
        .insert({
            user_id: user.id,
            order_id: orderId,
            amount: amount,
            package_name: pkg.name,
            status: 'pending'
        })

    if (dbError) {
        console.error('Failed to log transaction:', dbError)
    }

    // 2. Call Midtrans (Mock for now)
    const transaction = await createTransaction(orderId, amount)

    // 3. Update DB with snap_token
    if (transaction.token) {
        await supabase
            .from('transactions')
            .update({ snap_token: transaction.token })
            .eq('order_id', orderId)
    }

    return {
        ...transaction,
        orderId
    }
}
