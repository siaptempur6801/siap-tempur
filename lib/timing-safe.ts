/**
 * Perbandingan string yang tahan terhadap serangan timing.
 *
 * Sebelumnya ada dua implementasi terpisah: `constantTimeEqual` di `lib/csrf.ts`
 * (memakai XOR per karakter) dan `signaturesMatch` di route webhook pembayaran
 * (memakai `crypto.timingSafeEqual`). `CRON_SECRET` di route cron dibandingkan
 * dengan `===` biasa, sehingga rahasia itu berpotensi dibocorkan lewat timing.
 *
 * Modul ini menyatukan ketiganya supaya tidak ada lagi jalur yang memakai
 * perbandingan yang tidak aman.
 */

/**
 * Membandingkan dua string dalam waktu yang tidak bergantung pada posisi
 * perbedaan pertama (selama panjangnya sama).
 *
 * Panjang string memang bocor lewat waktu eksekusi, tetapi untuk rahasia
 * berukuran tetap (token heksadesimal, secret acak) kebocoran itu tidak berguna
 * bagi penyerang.
 */
export function constantTimeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false
    let result = 0
    for (let index = 0; index < a.length; index += 1) {
        result |= a.charCodeAt(index) ^ b.charCodeAt(index)
    }
    return result === 0
}

/**
 * Membandingkan header `Authorization: Bearer <secret>` dengan rahasia yang
 * diharapkan, tanpa membocorkan rahasianya lewat timing.
 *
 * Fail-closed: bila rahasia belum dikonfigurasi, hasilnya selalu `false`
 * (jangan pernah menganggap "secret kosong" sebagai cocok).
 */
export function isBearerTokenValid(authorizationHeader: string | null, expectedSecret: string | undefined | null): boolean {
    if (!expectedSecret) return false
    if (!authorizationHeader) return false

    const prefix = 'Bearer '
    if (!authorizationHeader.startsWith(prefix)) return false

    const provided = authorizationHeader.slice(prefix.length)
    return constantTimeEqual(provided, expectedSecret)
}
