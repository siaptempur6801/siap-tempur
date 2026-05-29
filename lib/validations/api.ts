import { z } from 'zod';

export const exportQuerySchema = z.object({
    type: z.enum(['sessions', 'ranking', 'questions', 'vouchers', 'events']),
    format: z.literal('csv').default('csv'),
    status: z.string().optional(),
    date_from: z.string().optional(), // Could be more strictly validated as ISO date
    date_to: z.string().optional(),
    question_type: z.string().optional(),
    event_id: z.string().optional(),
});

export const webhookPayloadSchema = z.object({
    order_id: z.string().min(1, 'Order ID is required'),
    transaction_status: z.string().min(1, 'Transaction status is required'),
    status_code: z.string(),
    gross_amount: z.string(),
    signature_key: z.string().min(1, 'Signature key is required'),
}).passthrough(); // Allow other Midtrans fields to pass through

export const beaconPayloadSchema = z.object({
    currentQuestionIndex: z.number().int().min(0).optional(),
    markedQuestions: z.record(z.string(), z.boolean()).optional(),
});
