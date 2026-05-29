// @ts-expect-error - midtrans-client lacks type definitions
import midtransClient from 'midtrans-client';
import { env } from '@/lib/env'
import { logger } from '@/lib/logger'

export interface MidtransCustomerDetails {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    billing_address?: Record<string, unknown>;
    shipping_address?: Record<string, unknown>;
}

export interface MidtransItemDetails {
    id: string;
    price: number;
    quantity: number;
    name: string;
    brand?: string;
    category?: string;
    merchant_name?: string;
}

export interface MidtransTransactionParameter {
    transaction_details: {
        order_id: string;
        gross_amount: number;
    };
    customer_details?: MidtransCustomerDetails;
    item_details?: MidtransItemDetails[];
    enabled_payments?: string[];
    custom_expiry?: {
        expiry_duration: number;
        unit: string;
    };
    [key: string]: unknown;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _snap: any = null;

function getSnap() {
    if (!_snap) {
        const serverKey = env.midtransServerKey()
        _snap = new midtransClient.Snap({
            isProduction: !serverKey.includes('SB-'),
            serverKey,
            clientKey: env.midtransClientKey()
        });
    }
    return _snap;
}

export async function createTransaction(
    orderId: string,
    amount: number,
    customerDetails?: MidtransCustomerDetails,
    itemDetails?: MidtransItemDetails[],
    enabledPayments?: string[]
) {
    const parameter: MidtransTransactionParameter = {
        "transaction_details": {
            "order_id": orderId,
            "gross_amount": amount
        },
        "customer_details": customerDetails || {},
        "custom_expiry": {
            "expiry_duration": 15,
            "unit": "minute"
        }
    };

    if (itemDetails && itemDetails.length > 0) {
        parameter.item_details = itemDetails;
    }

    if (enabledPayments && enabledPayments.length > 0) {
        parameter.enabled_payments = enabledPayments;
    }

    try {
        const transaction = await getSnap().createTransaction(parameter);
        return transaction;
    } catch (error) {
        logger.error('Midtrans transaction error', error, { orderId });
        throw error;
    }
}
