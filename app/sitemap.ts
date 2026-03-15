import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://siaptempur.id';

  // Core routes
  const routes = [
    '',
    '/cpns',
    '/login',
    '/register',
    '/kebijakan-pengembalian',
    '/kebijakan-privasi',
    '/syarat-ketentuan',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: (route === '' || route === '/cpns') ? 'daily' as const : 'weekly' as const,
    priority: route === '' ? 1 : route === '/cpns' ? 0.9 : 0.8,
  }));

  return routes;
}
