/**
 * Arahkan tautan ke halaman tujuan bila pengguna sudah login; kalau belum, ke `/login`
 * dengan `returnTo` supaya setelah masuk ia kembali ke halaman yang dituju.
 *
 * Dipakai di halaman publik ber-CTA (mis. `/cpns/full-tryout`, `/cpns/mini-tryout`) agar
 * pengguna yang sudah login tidak dilempar ke halaman login lagi.
 */
export function protectedHref(href: string, isLoggedIn: boolean) {
    return isLoggedIn ? href : `/login?returnTo=${href}`
}

/**
 * Untuk CTA di halaman publik yang punya padanan di dalam aplikasi:
 * pengguna yang sudah login diarahkan langsung ke area aplikasi, pengguna anonim tetap
 * ke halaman publik (yang di dalamnya sudah menawarkan masuk).
 *
 * Contoh: `appHref('/cpns/mini-tryout', '/cpns/dashboard/mini-tryout', authed)`.
 */
export function appHref(publicHref: string, appRouteHref: string, isLoggedIn: boolean) {
    return isLoggedIn ? appRouteHref : publicHref
}
