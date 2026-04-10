import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Siap Tempur - Tryout SKD CPNS',
    short_name: 'Siap Tempur',
    description: 'Platform tryout SKD CPNS 2026 dengan simulasi CAT BKN terakurat.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#000000',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '1024x1024',
        type: 'image/png',
      },
    ],
  }
}
