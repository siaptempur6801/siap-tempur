import { checkRateLimit } from '@/lib/api-utils'

/**
 * Helper for applying rate limiting inside Next.js Server Actions.
 * It uses the userId and actionName as the identifier.
 * 
 * @param userId The authenticated user ID
 * @param actionName Name of the action (e.g., 'sync_payment', 'claim_voucher')
 * @param limit Maximum number of requests allowed in the window
 * @param windowMs The time window in milliseconds
 * @returns boolean true if rate limited, false if allowed
 */
export async function isServerActionRateLimited(
    userId: string,
    actionName: string,
    limit: number,
    windowMs: number
): Promise<boolean> {
    const identifier = `action_${actionName}_${userId}`
    return checkRateLimit(identifier, limit, windowMs)
}
