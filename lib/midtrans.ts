/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-expect-error - midtrans-client lacks type definitions
import midtransClient from 'midtrans-client';

export const snap = new midtransClient.Snap({
    isProduction: true, // User requested to use production keys unconditionally
    serverKey: process.env.MIDTRANS_SERVER_KEY || 'Mid-server-placeholder',
    clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || 'Mid-client-placeholder'
});

export async function createTransaction(
    orderId: string,
    amount: number,
    customerDetails?: any,
    itemDetails?: any[],
    enabledPayments?: string[]
) {
    const parameter: any = {
        "transaction_details": {
            "order_id": orderId,
            "gross_amount": amount
        },
        "customer_details": customerDetails || {}
    };

    if (itemDetails && itemDetails.length > 0) {
        parameter.item_details = itemDetails;
    }

    if (enabledPayments && enabledPayments.length > 0) {
        parameter.enabled_payments = enabledPayments;
    }

    try {
        const transaction = await snap.createTransaction(parameter);
        return transaction;
    } catch (error) {
        console.error("Midtrans Transaction Error:", error);
        throw error;
    }
}
