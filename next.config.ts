import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ['192.168.1.5', '*.192.168.1.5', '192.168.1.6', '*.192.168.1.6'],
  serverExternalPackages: ['@resvg/resvg-js'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.in',
      },
    ],
  },
  /**
   * Rute admin legacy `/cpns/admin/**` → namespace kanonik `/admin/**`.
   *
   * Sebelumnya peta ini ada di `proxy.ts` dan dijalankan SEBELUM cookie sesi
   * di-refresh (`if (legacyRedirect) return legacyRedirect` di awal `proxy()`),
   * sehingga request ke rute legacy tidak pernah melewati `updateSession()` —
   * sesi yang seharusnya diperbarui tidak diperbarui. Redirect di sini
   * dievaluasi sebelum proxy, jadi request tetap melewati refresh sesi, header
   * CSP, dan cookie CSRF.
   *
   * `permanent: false` (307) dipakai sengaja: ini pembersihan URL internal, bukan
   * kontrak publik, dan 308 akan di-cache permanen oleh browser sehingga sulit
   * diperbaiki bila ada kekeliruan.
   */
  async redirects() {
    /**
     * Konteks program/track wajib ikut dibawa.
     *
     * `AdminOperationsWorkspace` memakai `params.program || 'TKA'`, sedangkan peta
     * redirect lama di `proxy.ts` selalu menambahkan `program=CPNS&track=SKD`
     * sebelum mengarahkan. Tanpa ini, pengguna yang membuka `/cpns/admin/event`
     * akan mendarat di konteks TKA — perilaku yang berbeda dari sebelumnya.
     */
    const withAdminContext = (destination: string) =>
      `${destination}${destination.includes('?') ? '&' : '?'}program=CPNS&track=SKD`;

    return [
      // CATATAN: `/cpns/admin` (tanpa path tambahan) TIDAK ada di sini.
      // Redirect `next.config.ts` dievaluasi sebelum proxy, sedangkan tab legacy
      // (`?tab=...`) hanya bisa dicocokkan di proxy karena `redirects()` tidak
      // mendukung pencocokan query. Kalau entri itu ada di sini, ia akan menang
      // dan tab tidak pernah sampai ke proxy. Keduanya ditangani di proxy.ts.
      { source: '/cpns/admin/review', destination: '/admin/content/review', permanent: false },
      { source: '/cpns/admin/articles', destination: '/admin/content/articles', permanent: false },
      { source: '/cpns/admin/articles/create', destination: '/admin/content/articles/create', permanent: false },
      { source: '/cpns/admin/articles/:id/edit', destination: '/admin/content/articles/:id/edit', permanent: false },
      { source: '/cpns/admin/create', destination: withAdminContext('/admin/content/questions'), permanent: false },
      { source: '/cpns/admin/edit/:id', destination: withAdminContext('/admin/content/questions'), permanent: false },
      { source: '/cpns/admin/event', destination: withAdminContext('/admin/assessment/events'), permanent: false },
      { source: '/cpns/admin/tryout-akbar', destination: withAdminContext('/admin/assessment/events'), permanent: false },
      { source: '/cpns/admin/tryout-config', destination: withAdminContext('/admin/assessment/exams'), permanent: false },
      { source: '/cpns/admin/keuangan', destination: withAdminContext('/admin/commerce'), permanent: false },
      { source: '/cpns/admin/voucher', destination: withAdminContext('/admin/commerce/products'), permanent: false },
      // `/cpns/admin/export` dulu satu-satunya rute legacy yang benar-benar
      // dirender (tidak ada di peta redirect proxy) lalu redirect sendiri.
      // Sekarang ditangani di sini seperti rute legacy lain.
      { source: '/cpns/admin/export', destination: withAdminContext('/admin'), permanent: false },
      // TIDAK ADA catch-all `/cpns/admin/:path*` di sini dengan sengaja.
      // Pola itu juga cocok untuk `/cpns/admin?tab=...` dan akan menang atas
      // proxy (redirect dievaluasi lebih dulu), sehingga tab legacy tidak pernah
      // sampai ke proxy dan malah kehilangan `program`/`track` dari URL asal.
      // Seluruh path legacy sudah didaftarkan eksplisit di atas.
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          // Content-Security-Policy sengaja TIDAK diatur di sini.
          // Satu-satunya sumber CSP adalah proxy.ts (nonce + strict-dynamic).
          // Dua header CSP sekaligus membuat kebijakan saling bertabrakan dan
          // menyulitkan audit.
        ],
      },
    ];
  },
  // Cache revalidation: Next.js defaults to no-store in prod, but setting
  // explicit revalidate on layout pages or using fetch cache/revalidate is
  // recommended. Uncomment and tune as needed:
  // experimental: {
  //   staleTimes: {
  //     dynamic: 30,
  //     static: 180,
  //   },
  // },
};

export default nextConfig;
