import { DEFAULT_TOKEN_WALLET_TYPE, walletRepository } from '@/src/repositories/wallet.repository'

export type WalletErrorCode =
  'INSUFFICIENT_TOKEN_BALANCE' | 'WALLET_NOT_FOUND' | 'WALLET_DEBIT_FAILED'

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

class WalletService {
  /**
   * Saldo token pengguna. Saldo dipisah per program: kirim `programId` agar terbaca wallet
   * program tersebut (CPNS → `exam_token_cpns`, TKA → `exam_token_tka`).
   */
  async getExamTokenBalance(userId: string, programId?: string | null) {
    if (programId) return walletRepository.getBalanceForProgram(userId, programId)
    return walletRepository.getBalance(userId, DEFAULT_TOKEN_WALLET_TYPE)
  }

  /** Tipe wallet token program (dipakai UI untuk label saldo). */
  async getTokenWalletTypeForProgram(programId: string | null | undefined) {
    return walletRepository.getTokenWalletTypeForProgram(programId)
  }

  async assertCanAfford(userId: string, tokenCost: number, programId?: string | null) {
    if (tokenCost <= 0) return
    const balance = await this.getExamTokenBalance(userId, programId)
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
