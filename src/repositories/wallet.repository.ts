import { createAdminClient, createV2AdminClient } from '@/lib/utils/supabase/server'

export type AttemptCharge = {
    tokenCost: number
}

export type WalletDebitResult = {
    debited: boolean
    balanceAfter: number
    amount: number
}

type RpcDebitRow = {
    debited: boolean
    balance_after: number
    amount: number
}

export class WalletRepository {
    async getBalance(userId: string, walletType = 'exam_token') {
        const admin = await createV2AdminClient()
        const { data, error } = await admin
            .from('wallets')
            .select('balance')
            .eq('user_id', userId)
            .eq('wallet_type', walletType)
            .maybeSingle()
        if (error) throw error
        return typeof data?.balance === 'number' ? data.balance : 0
    }

    async getAttemptCharge(userId: string, attemptId: string): Promise<AttemptCharge | null> {
        const admin = await createV2AdminClient()
        const { data: attempt, error: attemptError } = await admin
            .from('exam_attempts')
            .select('exam_id')
            .eq('id', attemptId)
            .eq('user_id', userId)
            .maybeSingle()
        if (attemptError) throw attemptError
        if (!attempt?.exam_id) return null

        const { data: exam, error: examError } = await admin
            .from('exams')
            .select('token_cost')
            .eq('id', attempt.exam_id)
            .maybeSingle()
        if (examError) throw examError
        if (!exam) return null

        return { tokenCost: typeof exam.token_cost === 'number' ? exam.token_cost : 0 }
    }

    async debitAttemptOnce(userId: string, attemptId: string): Promise<WalletDebitResult> {
        // The current checked-in database type snapshot predates this RPC.
        // Use the server-only untyped admin client until the full staging types
        // are regenerated; lib/env.ts still enforces the staging project guard.
        const admin = await createAdminClient()
        const { data, error } = await admin.rpc('debit_exam_token_once', {
            p_user_id: userId,
            p_attempt_id: attemptId,
        })
        if (error) throw error

        const row = Array.isArray(data) ? data[0] as RpcDebitRow | undefined : undefined
        if (!row) {
            throw new Error('WALLET_DEBIT_RESULT_MISSING')
        }

        return {
            debited: row.debited,
            balanceAfter: row.balance_after,
            amount: row.amount,
        }
    }
}

export const walletRepository = new WalletRepository()
