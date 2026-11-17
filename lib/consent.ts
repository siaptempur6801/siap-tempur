/**
 * Persetujuan S&K, Kebijakan Privasi, dan keterangan usia (audit 2026-11-17, N-03).
 *
 * Modul murni tanpa dependensi server sehingga dipakai bersama oleh form klien,
 * server action, dan `proxy.ts`. Catatan persetujuan disimpan di `user_metadata.consent`
 * akun Supabase.
 *
 * UU PDP Pasal 25: pemrosesan data pribadi anak memerlukan persetujuan orang tua/wali.
 * Peserta TKA SD/SMP umumnya anak, jadi pengguna di bawah 18 tahun wajib menyatakan
 * bahwa orang tua/walinya telah menyetujui pendaftaran.
 *
 * Mengubah `CONSENT_VERSION` membuat semua pengguna diminta menyetujui ulang — lakukan
 * hanya bila isi S&K atau Kebijakan Privasi berubah secara material.
 */
export const CONSENT_VERSION = '2026-11-17'

export const AGE_BASES = ['adult', 'guardian_consent'] as const
export type AgeBasis = (typeof AGE_BASES)[number]

export type ConsentRecord = {
  version: string
  accepted_at: string
  age_basis: AgeBasis
}

export const CONSENT_MESSAGES = {
  acceptTerms: 'Setujui Syarat & Ketentuan dan Kebijakan Privasi untuk melanjutkan.',
  ageBasis: 'Pilih keterangan usia untuk melanjutkan.',
} as const

function isAgeBasis(value: unknown): value is AgeBasis {
  return typeof value === 'string' && (AGE_BASES as readonly string[]).includes(value)
}

/** Validasi ringan untuk klien; server memakai `consentSchema` dengan aturan yang sama. */
export function consentFieldErrors(values: { acceptTerms?: unknown; ageBasis?: unknown }) {
  const errors: Partial<Record<'acceptTerms' | 'ageBasis', string>> = {}
  if (values.acceptTerms !== true && values.acceptTerms !== 'true') {
    errors.acceptTerms = CONSENT_MESSAGES.acceptTerms
  }
  if (!isAgeBasis(values.ageBasis)) errors.ageBasis = CONSENT_MESSAGES.ageBasis
  return errors
}

export function buildConsentRecord(ageBasis: AgeBasis, now = new Date()): ConsentRecord {
  return { version: CONSENT_VERSION, accepted_at: now.toISOString(), age_basis: ageBasis }
}

export function hasCurrentConsent(userMetadata: unknown): boolean {
  if (!userMetadata || typeof userMetadata !== 'object') return false
  const consent = (userMetadata as { consent?: unknown }).consent
  if (!consent || typeof consent !== 'object') return false
  const record = consent as Partial<ConsentRecord>
  return (
    record.version === CONSENT_VERSION &&
    typeof record.accepted_at === 'string' &&
    isAgeBasis(record.age_basis)
  )
}

const GATED_PREFIXES = ['/onboarding', '/cpns/dashboard', '/admin', '/cpns/join']
const TKA_APP_PATH = /^\/tka\/[^/]+(?:\/|$)/

/**
 * Halaman pengerjaan ujian tidak pernah dialihkan: peserta yang sedang mengerjakan
 * saat fitur ini dirilis harus bisa menyelesaikan ujiannya lebih dulu.
 */
const EXAM_SESSION_PATHS = [
  /^\/cpns\/dashboard\/tryout\/[^/]+\/?$/,
  /^\/tka\/[^/]+\/(?:tryout|diagnostic|remedial)\/[^/]+\/?$/,
]

/** Halaman aplikasi (wajib login) yang memerlukan persetujuan sebelum dibuka. */
export function isConsentGatedPath(pathname: string): boolean {
  if (EXAM_SESSION_PATHS.some((pattern) => pattern.test(pathname))) return false
  return (
    GATED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)) ||
    TKA_APP_PATH.test(pathname)
  )
}
