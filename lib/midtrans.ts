// @ts-nocheck
import midtransClient from 'midtrans-client';

// Since we don't have real keys, we'll expose a function that MOCKS the token creation.
// In production, you would use proper keys.

export const snap = new midtransClient.Snap({
    isProduction: false,
    serverKey: process.env.MIDTRANS_SERVER_KEY || 'SB-Mid-server-placeholder',
    clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || 'SB-Mid-client-placeholder'
});

export async function createTransaction(orderId: string, amount: number) {
    // REAL LOGIC START (Commented out because no keys)
    /*
    let parameter = {
        "transaction_details": {
            "order_id": orderId,
            "gross_amount": amount
        },
        "credit_card":{
            "secure" : true
        }
    };
    return await snap.createTransaction(parameter);
    */
    // REAL LOGIC END

    // MOCK LOGIC for Demo
    console.log(`[Mock Midtrans] Created transaction ${orderId} for ${amount}`);
    return {
        token: "mock_token_" + Math.random().toString(36).substring(7),
        redirect_url: "https://app.sandbox.midtrans.com/snap/v2/vtweb/mock"
    };
}
