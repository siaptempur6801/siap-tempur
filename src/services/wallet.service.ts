import { walletRepository } from '@/src/repositories/wallet.repository'

export type WalletErrorCode =
    | 'INSUFFICIENT_TOKEN_BALANCE'
    | 'WALLET_NOT_FOUND'
    | 'WALLET_DEBIT_FAILED'

export class WalletDomainError extends Error {
    constructor(
        public readonly code: WalletErrorCode,
        message: string,
    ) {
        super(message)
        this.name = 'WalletDomainError'
    }
}

function errorMessage(error: unknown) {
    if (error instanceof Error) return error.message
    if (error && typeof error === 'object' && 'message' in error) return String(error.message)
    return String(error)
}

export class WalletService {
    async getExamTokenBalance(userId: string) {
        return walletRepository.getBalance(userId, 'exam_token')
    }

    async assertCanAfford(userId: string, tokenCost: number) {
        if (tokenCost <= 0) return
        const balance = await this.getExamTokenBalance(userId)
        if (balance < tokenCost) {
            throw new WalletDomainError(
                'INSUFFICIENT_TOKEN_BALANCE',
                `Exam requires ${tokenCost} token(s), current balance is ${balance}`,
            )
        }
    }

    async debitForAttempt(userId: string, attemptId: string) {
        try {
            return await walletRepository.debitAttemptOnce(userId, attemptId)
        } catch (error) {
            const message = errorMessage(error)
            if (message.includes('INSUFFICIENT_TOKEN_BALANCE')) {
                throw new WalletDomainError('INSUFFICIENT_TOKEN_BALANCE', message)
            }
            if (message.includes('WALLET_NOT_FOUND')) {
                throw new WalletDomainError('WALLET_NOT_FOUND', message)
            }
            throw new WalletDomainError('WALLET_DEBIT_FAILED', message)
        }
    }
}

export const walletService = new WalletService()
