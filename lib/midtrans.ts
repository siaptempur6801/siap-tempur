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

export interface MidtransQrisAction {
    name?: string;
    method?: string;
    url?: string;
}

export interface MidtransQrisChargeResponse extends MidtransTransactionStatus {
    merchant_id?: string;
    acquirer?: string;
    actions?: MidtransQrisAction[];
    signature_key?: string;
    error_messages?: string[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _snap: any = null;

function getMidtransApiBaseUrl() {
    return env.midtransApiBaseUrl()
}

function getMidtransAuthHeader(serverKey: string) {
    return `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`
}

function getSnap() {
    if (!_snap) {
        const serverKey = env.midtransServerKey()
        _snap = new midtransClient.Snap({
            isProduction: env.midtransIsProduction(),
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

export async function createQrisCharge(
    orderId: string,
    amount: number,
    customerDetails?: MidtransCustomerDetails,
    itemDetails?: MidtransItemDetails[],
): Promise<MidtransQrisChargeResponse> {
    const serverKey = env.midtransServerKey()
    const payload: Record<string, unknown> = {
        payment_type: 'qris',
        transaction_details: {
            order_id: orderId,
            gross_amount: amount,
        },
        qris: {
            acquirer: 'gopay',
        },
    }

    if (customerDetails) payload.customer_details = customerDetails
    if (itemDetails?.length) payload.item_details = itemDetails

    const response = await fetch(`${getMidtransApiBaseUrl()}/v2/charge`, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: getMidtransAuthHeader(serverKey),
        },
        body: JSON.stringify(payload),
        cache: 'no-store',
    })

    const result = await response.json().catch(() => ({})) as MidtransQrisChargeResponse
    if (!response.ok || result.status_code !== '201') {
        const detail = Array.isArray(result.error_messages)
            ? result.error_messages.join('; ')
            : result.status_message || `HTTP ${response.status}`
        logger.error('Midtrans QRIS charge error', { orderId, status: response.status, detail })
        throw new Error(`MIDTRANS_QRIS_CHARGE_FAILED:${detail}`)
    }

    return result
}

export async function getTransactionStatus(orderId: string): Promise<MidtransTransactionStatus | null> {
    const serverKey = env.midtransServerKey()
    const response = await fetch(`${getMidtransApiBaseUrl()}/v2/${encodeURIComponent(orderId)}/status`, {
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
    const response = await fetch(`${getMidtransApiBaseUrl()}/v2/${encodeURIComponent(orderId)}/expire`, {
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
