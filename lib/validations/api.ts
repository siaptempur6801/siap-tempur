import { z } from 'zod'

export const webhookPayloadSchema = z
  .object({
    order_id: z.string().min(1, 'Order ID is required'),
    transaction_status: z.string().min(1, 'Transaction status is required'),
    status_code: z.string(),
    gross_amount: z.string(),
    signature_key: z.string().min(1, 'Signature key is required'),
  })
  .passthrough() // Allow other Midtrans fields to pass through

export const beaconPayloadSchema = z.object({
  // Dibatasi supaya `last_question_position` (integer) tidak overflow → 500.
  currentQuestionIndex: z.number().int().min(0).max(10_000).optional(),
  markedQuestions: z.record(z.string(), z.boolean()).optional(),
})
