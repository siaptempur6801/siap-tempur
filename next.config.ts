import type { NextConfig } from 'next'
import { LEGACY_ADMIN_REDIRECTS } from './lib/admin-redirects'

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
   * Peta redirect ada di `lib/admin-redirects.ts` supaya dapat diuji tanpa
   * menjalankan pipeline config Next.js. Lihat modul itu untuk alasan lengkap
   * kenapa `/cpns/admin` dan tab legacy (`?tab=...`) TIDAK ada di sini.
   */
  async redirects() {
    return LEGACY_ADMIN_REDIRECTS
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
    ]
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
}

export default nextConfig
