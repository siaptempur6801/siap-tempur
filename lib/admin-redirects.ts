/**
 * Peta redirect rute admin legacy `/cpns/admin/**` → namespace kanonik `/admin/**`.
 *
 * ## Kenapa modul terpisah
 *
 * Peta ini dulu ada di `proxy.ts` dan dijalankan dengan `return` di AWAL `proxy()`,
 * sebelum `updateSession()` dipanggil. Akibatnya request ke rute legacy tidak
 * pernah melewati refresh cookie sesi dan tidak pernah menerima header CSP.
 * Sekarang redirect dievaluasi oleh `next.config.ts`, yang berjalan sebelum proxy —
 * jadi request tetap melewati refresh sesi, CSP, dan cookie CSRF.
 *
 * Dipisahkan dari `next.config.ts` supaya dapat diuji: `next.config.ts` tidak bisa
 * diimpor dari unit test tanpa menjalankan seluruh pipeline config Next.js.
 * `tests/unit/admin-redirect-map.test.ts` memakainya untuk memastikan setiap
 * tujuan redirect benar-benar punya halaman — kelas kesalahan yang membuat
 * `revalidatePath` menunjuk rute yang tidak pernah dirender.
 *
 * ## Kenapa `permanent: false` (307)
 *
 * Ini pembersihan URL internal, bukan kontrak publik. 308 akan di-cache permanen
 * oleh browser sehingga kekeliruan menjadi sulit diperbaiki.
 *
 * ## Yang TIDAK ada di sini
 *
 * - `/cpns/admin` (tanpa path tambahan) dan tab legacy (`?tab=...`).
 *   `redirects()` tidak dapat mencocokkan query parameter, jadi keduanya
 *   ditangani di `proxy.ts` — dan hanya boleh di sana, karena redirect di sini
 *   dievaluasi lebih dulu sehingga akan menang dan membuat penanganan tab
 *   tidak pernah tercapai.
 * - Catch-all `/cpns/admin/:path*`. Pola itu juga cocok untuk
 *   `/cpns/admin?tab=...` dan akan menang atas proxy.
 */

export type LegacyAdminRedirect = {
    source: string
    destination: string
    permanent: boolean
}

/**
 * Workspace domain memakai `params.program || 'TKA'`, sedangkan peta
 * redirect lama selalu menambahkan `program=CPNS&track=SKD`. Tanpa konteks ini,
 * pengguna yang membuka `/cpns/admin/event` mendarat di konteks TKA — berbeda
 * dari perilaku sebelumnya.
 */
function withAdminContext(destination: string) {
    return `${destination}${destination.includes('?') ? '&' : '?'}program=CPNS&track=SKD`
}

export const LEGACY_ADMIN_REDIRECTS: LegacyAdminRedirect[] = [
    { source: '/cpns/admin/review', destination: '/admin/content/review', permanent: false },
    { source: '/cpns/admin/articles', destination: '/admin/content/articles', permanent: false },
    { source: '/cpns/admin/articles/create', destination: '/admin/content/articles/new', permanent: false },
    { source: '/cpns/admin/articles/:id/edit', destination: '/admin/content/articles/:id/edit', permanent: false },
    { source: '/cpns/admin/create', destination: withAdminContext('/admin/content/questions/new'), permanent: false },
    { source: '/cpns/admin/edit/:id', destination: withAdminContext('/admin/content/questions/:id/edit'), permanent: false },
    { source: '/cpns/admin/event', destination: withAdminContext('/admin/events'), permanent: false },
    { source: '/cpns/admin/tryout-akbar', destination: withAdminContext('/admin/events'), permanent: false },
    { source: '/cpns/admin/tryout-config', destination: withAdminContext('/admin/assessments'), permanent: false },
    { source: '/cpns/admin/keuangan', destination: withAdminContext('/admin/commerce/orders'), permanent: false },
    { source: '/cpns/admin/voucher', destination: withAdminContext('/admin/commerce/products'), permanent: false },
    // `/cpns/admin/export` dulu satu-satunya rute legacy yang benar-benar dirender
    // (tidak ada di peta redirect proxy) lalu redirect sendiri.
    { source: '/cpns/admin/export', destination: withAdminContext('/admin'), permanent: false },
]

/**
 * Tab legacy → halaman kanonik. Dipakai `proxy.ts` (bukan `next.config.ts`) karena
 * memerlukan pencocokan query parameter.
 */
export const LEGACY_ADMIN_TAB_ROUTES: Record<string, string> = {
    products: '/admin/commerce/products',
    events: '/admin/events',
    exams: '/admin/assessments',
    questions: '/admin/content/questions',
    commerce: '/admin/commerce/orders',
    articles: '/admin/content/articles',
    review: '/admin/content/review',
}

/** Rute legacy yang ditangani proxy tanpa membaca tab. */
export const LEGACY_ADMIN_BASE_PATH = '/cpns/admin'
