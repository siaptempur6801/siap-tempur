import { createHash } from 'node:crypto'
import { headers } from 'next/headers'
import { checkRateLimit } from '@/lib/api-utils'
import { getClientIp } from '@/lib/request-ip'
import { env } from '@/lib/env'

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
  windowMs: number,
): Promise<boolean> {
  const identifier = `action_${actionName}_${userId}`
  return checkRateLimit(identifier, limit, windowMs)
}

type RateWindow = { limit: number; windowMs: number }

/**
 * Batas per pengguna untuk action ujian/event (audit 2026-11-17, N-05).
 *
 * Nilainya sengaja longgar: tujuannya membatasi amplifikasi tulis dan pemicu
 * hitung ulang ranking, bukan menghambat peserta. Antrean autosave
 * (`lib/answer-save-queue.ts`) menahan jawaban yang gagal disimpan dan
 * mengirimnya ulang, jadi penolakan tidak menghilangkan jawaban.
 * Satu kategori berbagi satu kuota lintas action agar tidak bisa dihindari
 * dengan berganti endpoint.
 */
export const EXAM_ACTION_RATE_LIMITS = {
  answer_save: { limit: 300, windowMs: 60_000 },
  attempt_start: { limit: 15, windowMs: 60_000 },
  attempt_finish: { limit: 15, windowMs: 60_000 },
  event_register: { limit: 10, windowMs: 60_000 },
  certificate_claim: { limit: 5, windowMs: 60_000 },
  ranking_recalculate: { limit: 12, windowMs: 60_000 },
} as const satisfies Record<string, RateWindow>

export type ExamActionRateLimitKey = keyof typeof EXAM_ACTION_RATE_LIMITS

export const EXAM_ACTION_RATE_LIMITED_MESSAGE =
  'Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.'

/**
 * Rate limit action ujian/event per pengguna.
 *
 * Fail-OPEN: bila Upstash tidak tersedia, jatuh ke penghitung per-instance alih-alih
 * menolak semua permintaan — gangguan Redis tidak boleh menghentikan ujian yang
 * sedang berjalan. Auth/payment tetap fail-closed lewat `isServerActionRateLimited`.
 */
export async function isExamActionRateLimited(
  userId: string,
  key: ExamActionRateLimitKey,
): Promise<boolean> {
  const { limit, windowMs } = EXAM_ACTION_RATE_LIMITS[key]
  return checkRateLimit(`exam_action_${key}_${userId}`, limit, windowMs, { failClosed: false })
}

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
export const AUTH_RATE_LIMITS: Record<AuthRateLimitAction, { ip: RateWindow; email?: RateWindow }> =
  {
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

/** Action auth yang jatuh ke limiter memori (bukan ditolak) saat store bersama gagal. */
const AUTH_ACTIONS_WITH_MEMORY_FALLBACK: ReadonlySet<AuthRateLimitAction> = new Set([
  'login',
  'signup',
])

/**
 * Kunci rate limit yang memuat data pribadi (email) di-hash supaya Redis tidak
 * menyimpan PII dan key-nya tidak bisa dibaca balik.
 */
export function hashRateLimitSubject(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex').slice(0, 32)
}

/** IP request saat ini. `headers()` hanya tersedia di dalam scope request. */
async function getRequestIp(): Promise<string> {
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
  return env.appEnvironment() !== 'production' && process.env.E2E_DISABLE_AUTH_RATE_LIMIT === '1'
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

  // Login/daftar memakai limiter memori per-instance saat Upstash tidak tersedia
  // (keputusan pemilik 2026-11-17, audit B-06): gangguan Redis tidak boleh
  // mematikan login. Rate limit Supabase Auth tetap menjadi lapis terluar.
  // Aksi yang mengirim email tetap fail-closed karena berbiaya dan berisiko spam.
  const ipOptions = AUTH_ACTIONS_WITH_MEMORY_FALLBACK.has(action) ? { failClosed: false } : {}
  if (
    await checkRateLimit(`auth_ip_${action}_${ip}`, policy.ip.limit, policy.ip.windowMs, ipOptions)
  ) {
    return true
  }

  if (policy.email && email) {
    const subject = hashRateLimitSubject(email)
    if (
      await checkRateLimit(
        `auth_email_${action}_${subject}`,
        policy.email.limit,
        policy.email.windowMs,
      )
    ) {
      return true
    }
  }

  return false
}
