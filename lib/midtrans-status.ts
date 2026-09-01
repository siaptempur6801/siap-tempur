export const MIDTRANS_STATUSES = new Set([
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
        : String(value ?? '').trim().toLowerCase()
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
