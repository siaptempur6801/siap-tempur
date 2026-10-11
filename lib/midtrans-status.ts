const MIDTRANS_STATUSES = new Set([
  'pending',
  'authorize',
  'capture',
  'settlement',
  'expire',
  'cancel',
  'deny',
  'failure',
  'refund',
  'partial_refund',
  'chargeback',
  'partial_chargeback',
])

const SUCCESS_STATUSES = new Set(['capture', 'settlement'])
const FINAL_NON_SUCCESS_STATUSES = new Set([
  'expire',
  'cancel',
  'deny',
  'failure',
  'refund',
  'partial_refund',
  'chargeback',
  'partial_chargeback',
])

export function normalizeMidtransStatus(value: unknown) {
  return typeof value === 'string'
    ? value.trim().toLowerCase()
    : String(value ?? '')
        .trim()
        .toLowerCase()
}

export function isSupportedMidtransStatus(value: unknown) {
  return MIDTRANS_STATUSES.has(normalizeMidtransStatus(value))
}

export function isMidtransSuccessStatus(value: unknown) {
  return SUCCESS_STATUSES.has(normalizeMidtransStatus(value))
}

export function isMidtransFinalNonSuccessStatus(value: unknown) {
  return FINAL_NON_SUCCESS_STATUSES.has(normalizeMidtransStatus(value))
}

export function canonicalMidtransStatus(value: unknown) {
  const status = normalizeMidtransStatus(value)

  switch (status) {
    case 'authorize':
      return 'pending'
    case 'failure':
    case 'chargeback':
    case 'partial_chargeback':
      return 'deny'
    case 'refund':
    case 'partial_refund':
      return 'cancel'
    default:
      return status
  }
}

/**
 * Keputusan fraud Midtrans. Hanya relevan untuk `transaction_status = 'capture'`.
 *
 * `fraud_status` sebelumnya TIDAK PERNAH dibaca di mana pun — satu-satunya
 * kemunculannya adalah deklarasi tipe. Akibatnya kanal yang mengembalikan
 * `capture` + `fraud_status='deny'` tetap diproses sebagai pembayaran sukses:
 * order ditandai paid, token/entitlement bertambah, dan karena guard status
 * bersifat monotonik, keputusan itu tidak dapat ditarik kembali.
 */
export type FraudStatus = 'accept' | 'challenge' | 'deny' | null

export function normalizeFraudStatus(value: unknown): FraudStatus {
  const status = normalizeMidtransStatus(value)
  if (status === 'accept' || status === 'challenge' || status === 'deny') return status
  return null
}

export type MidtransFulfilmentDecision = {
  /** Status efektif yang boleh dipakai untuk memutuskan pemenuhan order. */
  status: string
  /** Alasan bila pemenuhan sengaja tidak diberikan; `null` bila aman diproses. */
  blockedReason: 'FRAUD_DENIED' | 'FRAUD_CHALLENGED' | null
}

/**
 * Menentukan status efektif sebuah notifikasi Midtrans dengan menghormati
 * `fraud_status`.
 *
 * Aturan Midtrans:
 * - `settlement` sudah final dan tidak lagi membawa keputusan fraud → diteruskan.
 * - `capture` HANYA final bila `fraud_status='accept'`.
 *   - `deny`     → diturunkan menjadi `deny`  (tidak boleh memenuhi order)
 *   - `challenge`→ diturunkan menjadi `pending` (menunggu review manual Midtrans)
 * - Status lain diteruskan apa adanya.
 *
 * Fungsi ini murni supaya keputusannya dapat diuji tanpa jaringan.
 */
export function resolveMidtransFulfilment(
  transactionStatus: unknown,
  fraudStatus: unknown,
): MidtransFulfilmentDecision {
  const status = normalizeMidtransStatus(transactionStatus)
  if (status !== 'capture') return { status, blockedReason: null }

  const fraud = normalizeFraudStatus(fraudStatus)
  if (fraud === 'deny') return { status: 'deny', blockedReason: 'FRAUD_DENIED' }
  if (fraud === 'challenge') return { status: 'pending', blockedReason: 'FRAUD_CHALLENGED' }
  return { status, blockedReason: null }
}
