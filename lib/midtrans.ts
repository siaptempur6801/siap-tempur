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
    callbacks?: {
        finish?: string;
    };
    [key: string]: unknown;
}

export interface MidtransTransactionStatus {
    order_id?: string;
    transaction_id?: string;
    payment_type?: string;
    transaction_time?: string;
    transaction_status?: string;
    gross_amount?: string;
    currency?: string;
    status_code?: string;
    status_message?: string;
    fraud_status?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _snap: any = null;

function getMidtransApiBaseUrl(serverKey: string) {
    return serverKey.includes('SB-') ? 'https://api.sandbox.midtrans.com' : 'https://api.midtrans.com'
}

function getMidtransAuthHeader(serverKey: string) {
    return `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`
}

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

function buildFinishRedirectUrl(path: string) {
    const baseUrl = env.siteUrl().replace(/\/+$/, '')
    const normalizedPath = path.startsWith('/') ? path : `/${path}`
    return `${baseUrl}${normalizedPath}`
}

export async function createTransaction(
    orderId: string,
    amount: number,
    customerDetails?: MidtransCustomerDetails,
    itemDetails?: MidtransItemDetails[],
    enabledPayments?: string[],
    finishRedirectPath = '/cpns/dashboard'
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
        },
        "callbacks": {
            "finish": buildFinishRedirectUrl(finishRedirectPath)
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

export async function getTransactionStatus(orderId: string): Promise<MidtransTransactionStatus | null> {
    const serverKey = env.midtransServerKey()
    const response = await fetch(`${getMidtransApiBaseUrl(serverKey)}/v2/${encodeURIComponent(orderId)}/status`, {
        method: 'GET',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: getMidtransAuthHeader(serverKey),
        },
        cache: 'no-store',
    })

    if (response.status === 404) {
        return null
    }

    if (!response.ok) {
        throw new Error(`Midtrans status request failed for ${orderId}: ${response.status}`)
    }

    return response.json()
}

export async function expireTransaction(orderId: string) {
    const serverKey = env.midtransServerKey()
    const response = await fetch(`${getMidtransApiBaseUrl(serverKey)}/v2/${encodeURIComponent(orderId)}/expire`, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: getMidtransAuthHeader(serverKey),
        },
        cache: 'no-store',
    })

    if (response.status === 404) return false

    if (!response.ok) {
        throw new Error(`Midtrans expire request failed for ${orderId}: ${response.status}`)
    }

    return true
}
