import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://siaptempur.id'

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Aturan robots adalah pencocokan prefiks. Pola lama `/*/dashboard/`
      // (dengan garis miring penutup) tidak mencocokkan `/cpns/dashboard` itu sendiri.
      // Halaman privat juga memasang `robots: noindex` lewat metadata.
      disallow: [
        '/api/',
        '/auth/',
        '/admin',
        '/*/dashboard',
        '/onboarding',
        '/cpns/join/',
        '/verify-certificate/',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
