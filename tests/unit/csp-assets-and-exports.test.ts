import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { ArticleFormSchema } from '@/lib/validations/admin'
import { config } from '@/proxy'

const repoRoot = resolve(__dirname, '../..')
const read = (file: string) => readFileSync(resolve(repoRoot, file), 'utf8')

const baseArticle = {
  title: 'Strategi TWK untuk pemula',
  slug: 'strategi-twk-untuk-pemula',
  excerpt: 'Ringkasan',
  content: 'Konten artikel yang cukup panjang untuk lolos validasi.',
  category: 'CPNS',
}

function coverResult(cover: string) {
  return ArticleFormSchema.safeParse({ ...baseArticle, cover_image_url: cover })
}

describe('cover artikel mengikuti CSP img-src (N-12)', () => {
  it('menerima URL Supabase Storage HTTPS dan cover kosong', () => {
    expect(
      coverResult(
        'https://abcdefghijklmnopqrst.supabase.co/storage/v1/object/public/article-images/a.png',
      ).success,
    ).toBe(true)
    expect(coverResult('').success).toBe(true)
  })

  it.each([
    'https://example.com/cover.png',
    'http://abcdefghijklmnopqrst.supabase.co/a.png',
    'https://user:pass@abcdefghijklmnopqrst.supabase.co/a.png',
    'javascript:alert(1)',
  ])('menolak %s', (cover) => {
    expect(coverResult(cover).success).toBe(false)
  })
})

describe('CSP proxy', () => {
  it('mengizinkan gambar QR Midtrans', () => {
    const proxy = read('proxy.ts')
    expect(proxy).toMatch(/img-src[^;]*https:\/\/api\.sandbox\.midtrans\.com/)
    expect(proxy).toMatch(/img-src[^;]*https:\/\/api\.midtrans\.com/)
  })

  it('matcher melewati berkas metadata statis tetapi tetap mencakup halaman dan API', () => {
    const matcher = new RegExp(`^${config.matcher[0]}$`)
    for (const path of ['/robots.txt', '/sitemap.xml', '/manifest.webmanifest', '/fonts/a.woff2'])
      expect(matcher.test(path), path).toBe(false)
    for (const path of ['/', '/login', '/admin/users', '/api/health', '/blog/strategi-twk'])
      expect(matcher.test(path), path).toBe(true)
  })
})

describe('ekspor CSV monitoring', () => {
  it('menetralkan awalan formula termasuk tab dan carriage return', () => {
    const route = read('app/admin/monitoring/export/route.ts')
    expect(route).toContain(String.raw`.replace(/^[=+@\-\t\r]/, "'$&")`)
  })
})
