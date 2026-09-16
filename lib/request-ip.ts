/**
 * Ekstraksi IP client untuk rate limiting.
 *
 * Urutan header sengaja mendahulukan header yang **di-set platform** (Vercel),
 * karena header itu ditimpa oleh edge dan tidak bisa ditentukan oleh client.
 * `x-forwarded-for` ditaruh paling akhir dan hanya sebagai fallback: nilai kiriman
 * client bisa ikut terbawa di entri pertama.
 *
 * PENTING — belum diverifikasi terhadap deployment nyata. Sebelum mengandalkan
 * fungsi ini sebagai kontrol keamanan, buktikan dulu di staging:
 *
 *   curl -H 'x-real-ip: 1.2.3.4' \
 *        -H 'x-vercel-forwarded-for: 1.2.3.4' \
 *        -H 'x-forwarded-for: 5.6.7.8' \
 *        https://<staging>/api/health
 *
 * lalu catat nilai yang dibaca aplikasi. Selama belum terbukti, anggap lapis ini
 * sebagai pertahanan tambahan — rate limit bawaan Supabase Auth (per-IP, dihitung
 * dari koneksi TCP, bukan header) tetap menjadi jaring pengaman yang otoritatif.
 */
export function getClientIp(headers: Headers): string {
    const candidates = [
        headers.get('x-vercel-forwarded-for'),
        headers.get('x-real-ip'),
        headers.get('x-forwarded-for'),
    ]

    for (const candidate of candidates) {
        if (!candidate) continue
        const value = candidate.split(',')[0]?.trim()
        if (value) return value
    }

    return '0.0.0.0'
}
