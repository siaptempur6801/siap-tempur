/**
 * Ekstraksi IP client untuk rate limiting.
 *
 * Urutan header sengaja mendahulukan header yang **di-set platform** (Vercel),
 * karena header itu ditimpa oleh edge dan tidak bisa ditentukan oleh client.
 * `x-forwarded-for` ditaruh paling akhir dan hanya sebagai fallback: nilai kiriman
 * client bisa ikut terbawa di entri pertama.
 *
 * Untuk memverifikasi urutan ini terhadap deployment nyata, `/api/health`
 * melaporkan `clientIpSource` (nama header yang dipakai, bukan IP-nya) sehingga
 * bisa diuji dengan mengirim header palsu dan melihat apakah sumbernya berubah.
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
