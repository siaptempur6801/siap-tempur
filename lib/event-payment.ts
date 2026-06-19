const SUCCESS_STATUSES = new Set(['capture', 'settlement'])

export type CreateEventPaymentTransactionResult =
    | { success: true; token: string; orderId: string }
    | { success: false; message: string }

export type ExistingEventPayment = {
    id: string
    status: string
    order_id: string
    snap_token: string | null
}

export function getReusableEventPaymentResult(
    existingPayment: ExistingEventPayment | null
): CreateEventPaymentTransactionResult | null {
    if (!existingPayment) return null

    if (SUCCESS_STATUSES.has(existingPayment.status)) {
        return { success: false, message: 'Tiket sudah dibeli. Kamu sudah terdaftar di event ini.' }
    }

    if (existingPayment.status === 'pending') {
        if (existingPayment.snap_token) {
            return {
                success: true,
                token: existingPayment.snap_token,
                orderId: existingPayment.order_id,
            }
        }

        return {
            success: false,
            message: 'Tagihan lama tidak bisa dibuka lagi. Cek status pembayaran lalu coba lagi.',
        }
    }

    return null
}
