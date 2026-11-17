import { createHash } from 'node:crypto'
import { headers } from 'next/headers'
import { checkRateLimit } from '@/lib/api-utils'
import { getClientIp } from '@/lib/request-ip'

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

type RateWindow = { limit: number; windowMs: number }

type AuthRateLimitAction = 'login' | 'signup' | 'forgotPassword' | 'resendVerification'

/**
 * Kebijakan rate limit untuk action auth yang belum terautentikasi, jadi kuncinya
 * berbasis IP (bukan userId).
 *
 * `login` dan `signup` sengaja TIDAK dibatasi per-email: mengunci per-email bisa
 * dipakai penyerang untuk mengunci akun orang lain (lockout DoS).
 * `forgotPassword`/`resendVerification` dibatasi per-email karena memicu kirim
 * email — itu vektor biaya dan risiko domain masuk blacklist.
 *
 * Bandingkan dengan rate limit bawaan Supabase Auth
 * (`supabase/config.toml`: sign_in_sign_ups = 30 / 5 menit / IP) — nilai di sini
 * lebih ketat sehingga Supabase tetap menjadi lapis terluar.
 */
export const AUTH_RATE_LIMITS: Record<AuthRateLimitAction, { ip: RateWindow; email?: RateWindow }> = {
    login: { ip: { limit: 10, windowMs: 5 * 60_000 } },
    signup: { ip: { limit: 5, windowMs: 15 * 60_000 } },
    forgotPassword: {
        ip: { limit: 10, windowMs: 15 * 60_000 },
        email: { limit: 3, windowMs: 15 * 60_000 },
    },
    resendVerification: {
        ip: { limit: 10, windowMs: 15 * 60_000 },
        email: { limit: 3, windowMs: 15 * 60_000 },
    },
}

/**
 * Kunci rate limit yang memuat data pribadi (email) di-hash supaya Redis tidak
 * menyimpan PII dan key-nya tidak bisa dibaca balik.
 */
export function hashRateLimitSubject(value: string): string {
    return createHash('sha256').update(value.trim().toLowerCase()).digest('hex').slice(0, 32)
}

/** IP request saat ini. `headers()` hanya tersedia di dalam scope request. */
export async function getRequestIp(): Promise<string> {
    try {
        return getClientIp(await headers())
    } catch {
        return '0.0.0.0'
    }
}

/**
 * Uji E2E staging membuat banyak user disposabel dan login berkali-kali dari satu alamat
 * (runner CI), sehingga limit per-IP memblokir skenario yang sah. Bypass hanya aktif bila
 * env `E2E_DISABLE_AUTH_RATE_LIMIT === '1'` diset eksplisit — **tidak pernah** diset di
 * produksi, dan default tanpa env tetap memakai limit ketat di atas.
 */
export function isAuthRateLimitBypassed() {
    return process.env.E2E_DISABLE_AUTH_RATE_LIMIT === '1'
}

/**
 * Rate limit untuk action auth tanpa sesi. Mengecek IP selalu, dan email (bila
 * disediakan) hanya untuk action yang memicunya.
 *
 * @returns true bila permintaan harus ditolak
 */
export async function isAuthActionRateLimited(
    action: AuthRateLimitAction,
    email?: string | null,
): Promise<boolean> {
    if (isAuthRateLimitBypassed()) return false

    const policy = AUTH_RATE_LIMITS[action]
    const ip = await getRequestIp()

    if (await checkRateLimit(`auth_ip_${action}_${ip}`, policy.ip.limit, policy.ip.windowMs)) {
        return true
    }

    if (policy.email && email) {
        const subject = hashRateLimitSubject(email)
        if (await checkRateLimit(`auth_email_${action}_${subject}`, policy.email.limit, policy.email.windowMs)) {
            return true
        }
    }

    return false
}
