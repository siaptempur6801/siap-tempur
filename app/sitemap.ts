import { MetadataRoute } from 'next'
import { logger } from '@/lib/logger'
import { listPublishedArticles } from '@/src/services/article-read.service'

// Dibangun ulang paling lama tiap jam; daftar artikel sendiri di-cache 5 menit.
export const revalidate = 3600

const STATIC_ROUTES = [
  '',
  '/cpns',
  '/tka',
  '/login',
  '/register',
  '/kebijakan-pengembalian',
  '/kebijakan-privasi',
  '/syarat-ketentuan',
  // SEO Routes
  '/cpns/mini-tryout',
  '/cpns/full-tryout',
  '/cpns/event',
  '/cpns/twk',
  '/cpns/tiu',
  '/cpns/tkp',
  '/blog',
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://siaptempur.id'

  // `lastModified` sengaja tidak diisi untuk halaman statis: mengisinya dengan
  // waktu build membuat setiap halaman tampak berubah setiap deploy.
  const routes: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${baseUrl}${route}`,
    changeFrequency: route === '/cpns' || route === '/blog' ? 'daily' : 'weekly',
    priority: route === '' || route === '/cpns' ? 1 : 0.8,
  }))

  try {
    const articles = await listPublishedArticles()
    for (const article of articles) {
      if (!article.slug) continue
      routes.push({
        url: `${baseUrl}/blog/${encodeURIComponent(article.slug)}`,
        ...(article.published_at ? { lastModified: new Date(article.published_at) } : {}),
        changeFrequency: 'monthly',
        priority: 0.6,
      })
    }
  } catch (error) {
    // Sitemap tetap tersedia tanpa artikel bila database tidak terjangkau.
    logger.warn('[sitemap] daftar artikel gagal dimuat', {
      error: error instanceof Error ? error.message : String(error),
    })
  }

  return routes
}
