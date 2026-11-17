/**
 * Ekstraksi IP client untuk rate limiting.
 *
 * Di deployment Vercel, dokumentasi platform menyatakan ketiga header ini
 * mengidentifikasi IP client dan Vercel menimpa `x-forwarded-for`. Header
 * `x-vercel-forwarded-for` diprioritaskan. Jika ada proxy/CDN lain di depan
 * Vercel, sanitasi header di proxy tersebut tetap perlu diverifikasi.
 *
 * `/api/health` melaporkan nama header sumber untuk diagnosis. Nama ini tidak
 * membuktikan bahwa nilai yang diterima aman atau telah disanitasi oleh ingress.
 */
export type ClientIpSource = 'x-vercel-forwarded-for' | 'x-real-ip' | 'x-forwarded-for' | 'fallback'

const CLIENT_IP_CANDIDATES: readonly Exclude<ClientIpSource, 'fallback'>[] = [
  'x-vercel-forwarded-for',
  'x-real-ip',
  'x-forwarded-for',
]

const CLIENT_IP_FALLBACK = '0.0.0.0'

/** Header mana yang dipakai sebagai IP client, beserta nilainya. */
export function resolveClientIp(headers: Headers): { ip: string; source: ClientIpSource } {
  for (const candidate of CLIENT_IP_CANDIDATES) {
    const value = headers.get(candidate)
    if (!value) continue
    const ip = value.split(',')[0]?.trim()
    if (ip) return { ip, source: candidate }
  }

  return { ip: CLIENT_IP_FALLBACK, source: 'fallback' }
}

/** IP client untuk rate limiting. */
export function getClientIp(headers: Headers): string {
  return resolveClientIp(headers).ip
}
