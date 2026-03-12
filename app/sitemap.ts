import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://siaptempur.id';

  // Core routes
  const routes = [
    '',
    '/login',
    '/register',
    '/kebijakan-pengembalian',
    '/kebijakan-privasi',
    '/syarat-ketentuan',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1 : 0.8,
  }));

  return routes;
}
