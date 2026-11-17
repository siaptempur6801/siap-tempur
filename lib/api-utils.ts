import { NextResponse } from 'next/server'
import { env } from '@/lib/env'
import { logger } from '@/lib/logger'
import { getClientIp } from '@/lib/request-ip'

/**
 * Standard API Envelope:
 * {
 *   "data": T,
 *   "meta"?: any
 * }
 */
export function successResponse<T>(data: T, meta?: Record<string, unknown>, status = 200) {
  const payload: Record<string, unknown> = { data }
  if (meta) {
    payload.meta = meta
  }
  return NextResponse.json(payload, { status })
}

/**
 * Standard Error Envelope:
 * {
 *   "error": {
 *      "code": "string",
 *      "message": "string",
 *      "details"?: any[]
 *   }
 * }
 */
export function errorResponse(code: string, message: string, status = 400, details?: unknown[]) {
  const payload: Record<string, unknown> = {
    error: {
      code,
      message,
    },
  }

  if (details && details.length > 0) {
    ;(payload.error as Record<string, unknown>).details = details
  }

  return NextResponse.json(payload, { status })
}

// Local/staging fallback only. Production needs a shared counter across instances.
const rateLimitCache = new Map<string, { count: number; resetAt: number }>()
let nextRateLimitCleanup = 0

/** Returns true when the limit is exceeded. */
export function isRateLimited(identifier: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  if (now >= nextRateLimitCleanup) {
    for (const [key, record] of rateLimitCache)
      if (now >= record.resetAt) rateLimitCache.delete(key)
    nextRateLimitCleanup = now + 60_000
  }
  const record = rateLimitCache.get(identifier)
  if (!record || now >= record.resetAt) {
    rateLimitCache.set(identifier, { count: 1, resetAt: now + windowMs })
    return false
  }
  if (record.count >= limit) return true
  record.count += 1
  return false
}

// INCR and expiry must be atomic: a function crash between two HTTP calls used
// to leave a permanent counter. PTTL also repairs counters left by that version.
const RATE_LIMIT_SCRIPT = `local count = redis.call('INCR', KEYS[1])
if count == 1 or redis.call('PTTL', KEYS[1]) < 0 then
    redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
return count`

function rateLimitFallback(identifier: string, limit: number, windowMs: number) {
  // Never silently turn a shared security boundary into per-instance counters.
  if (env.appEnvironment() === 'production') return true
  return isRateLimited(identifier, limit, windowMs)
}

export async function checkRateLimit(
  identifier: string,
  limit: number,
  windowMs: number,
): Promise<boolean> {
  const redisUrl = env.upstashRedisRestUrl()
  const redisToken = env.upstashRedisRestToken()
  if (!redisUrl || !redisToken) {
    if (env.appEnvironment() === 'production')
      logger.warn('Shared production rate limiter is not configured')
    return rateLimitFallback(identifier, limit, windowMs)
  }
  try {
    const response = await fetch(redisUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${redisToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([
        'EVAL',
        RATE_LIMIT_SCRIPT,
        '1',
        `rate-limit:${identifier}`,
        String(Math.max(1, Math.ceil(windowMs))),
      ]),
      cache: 'no-store',
      signal: AbortSignal.timeout(2000),
    })
    if (!response.ok) throw new Error(`Rate limit store returned ${response.status}`)
    const payload = (await response.json()) as { result?: unknown; error?: unknown }
    if (
      payload.error ||
      typeof payload.result !== 'number' ||
      !Number.isSafeInteger(payload.result) ||
      payload.result < 1
    ) {
      throw new Error('Invalid rate limit counter')
    }
    return payload.result > limit
  } catch {
    // Avoid logging response bodies, credentials, URLs, or user identifiers.
    logger.warn('Shared rate limit unavailable', {
      failClosed: env.appEnvironment() === 'production',
    })
    return rateLimitFallback(identifier, limit, windowMs)
  }
}

/**
 * Helper to extract IP from request (for rate limiting).
 *
 * Logikanya dipusatkan di lib/request-ip.ts supaya API route dan server action
 * memakai urutan header yang sama (mendahulukan header yang di-set platform).
 */
export function getIp(req: Request): string {
  return getClientIp(req.headers)
}
