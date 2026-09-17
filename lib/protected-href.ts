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
