import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

/**
 * Standard API Envelope:
 * {
 *   "data": T,
 *   "meta"?: any
 * }
 */
export function successResponse<T>(data: T, meta?: Record<string, unknown>, status = 200) {
    const payload: Record<string, unknown> = { data };
    if (meta) {
        payload.meta = meta;
    }
    return NextResponse.json(payload, { status });
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
    };
    
    if (details && details.length > 0) {
        (payload.error as Record<string, unknown>).details = details;
    }
    
    return NextResponse.json(payload, { status });
}

// Simple in-memory rate limiter using Map.
// Key: IP or User ID, Value: { count: number, resetAt: number }
const rateLimitCache = new Map<string, { count: number; resetAt: number }>();

/**
 * Basic memory-based rate limiting.
 * Returns true if allowed, false if limit exceeded.
 */
export function isRateLimited(identifier: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const record = rateLimitCache.get(identifier);

    if (!record) {
        rateLimitCache.set(identifier, { count: 1, resetAt: now + windowMs });
        return false;
    }

    if (now > record.resetAt) {
        // Window expired, reset
        rateLimitCache.set(identifier, { count: 1, resetAt: now + windowMs });
        return false;
    }

    if (record.count >= limit) {
        return true;
    }

    record.count += 1;
    return false;
}

export async function checkRateLimit(identifier: string, limit: number, windowMs: number): Promise<boolean> {
    const redisUrl = env.upstashRedisRestUrl()
    const redisToken = env.upstashRedisRestToken()

    if (!redisUrl || !redisToken) {
        return isRateLimited(identifier, limit, windowMs)
    }

    const key = `rate-limit:${identifier}`
    const ttlSeconds = Math.max(1, Math.ceil(windowMs / 1000))

    try {
        const incrementResponse = await fetch(`${redisUrl}/incr/${encodeURIComponent(key)}`, {
            headers: { Authorization: `Bearer ${redisToken}` },
            cache: 'no-store',
        })

        if (!incrementResponse.ok) {
            logger.warn('External rate limit increment failed; using memory fallback', {
                status: incrementResponse.status,
            })
            return isRateLimited(identifier, limit, windowMs)
        }

        const incrementPayload = await incrementResponse.json() as { result?: number }
        const count = Number(incrementPayload.result || 0)

        if (count === 1) {
            await fetch(`${redisUrl}/expire/${encodeURIComponent(key)}/${ttlSeconds}`, {
                headers: { Authorization: `Bearer ${redisToken}` },
                cache: 'no-store',
            })
        }

        return count > limit
    } catch (error) {
        logger.warn('External rate limit unavailable; using memory fallback', { error })
        return isRateLimited(identifier, limit, windowMs)
    }
}

/**
 * Helper to extract IP from request (for rate limiting).
 */
export function getIp(req: Request): string {
    const realIp = req.headers.get('x-real-ip') || req.headers.get('cf-connecting-ip');
    if (realIp) {
        return realIp.trim();
    }

    const forwarded = req.headers.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    return '127.0.0.1'; // Fallback
}
