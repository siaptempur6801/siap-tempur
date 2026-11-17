import { readdirSync, statSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const articles = vi.hoisted(() => ({
  list: vi.fn(async () => [
    { slug: 'strategi-twk', published_at: '2026-10-01T00:00:00.000Z' } as {
      slug: string
      published_at: string | null
    },
  ]),
}))

vi.mock('@/src/services/article-read.service', () => ({
  listPublishedArticles: articles.list,
}))

import robots from '@/app/robots'
import sitemap from '@/app/sitemap'

const appDir = resolve(__dirname, '../../app')

/** Daftar route statis dari `app/**\/page.tsx`, tanpa route group `(nama)`. */
function staticPageRoutes(dir = appDir): string[] {
  const routes: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      routes.push(...staticPageRoutes(full))
    } else if (entry === 'page.tsx') {
      const segments = relative(appDir, dir)
        .split(sep)
        .filter((segment) => segment && !/^\(.+\)$/.test(segment))
      if (segments.some((segment) => segment.startsWith('['))) continue
      routes.push(`/${segments.join('/')}`.replace(/\/$/, '') || '/')
    }
  }
  return routes
}

describe('sitemap', () => {
  beforeEach(() => articles.list.mockClear())

  it('hanya mencantumkan route yang benar-benar ada', async () => {
    const routes = new Set(staticPageRoutes())
    const missing = (await sitemap())
      .map((entry) => new URL(entry.url).pathname.replace(/\/$/, '') || '/')
      .filter((pathname) => !pathname.startsWith('/blog/'))
      .filter((pathname) => !routes.has(pathname))
    expect(missing).toEqual([])
  })

  it('memuat artikel terbit dengan tanggal terbit sebagai lastModified', async () => {
    const entry = (await sitemap()).find((item) => item.url.endsWith('/blog/strategi-twk'))
    expect(entry?.lastModified).toEqual(new Date('2026-10-01T00:00:00.000Z'))
  })

  it('tetap mengembalikan halaman statis bila artikel gagal dimuat', async () => {
    articles.list.mockRejectedValueOnce(new Error('db down'))
    const entries = await sitemap()
    expect(entries.length).toBeGreaterThan(5)
    expect(entries.some((item) => item.url.includes('/blog/'))).toBe(false)
  })
})

describe('robots', () => {
  it('memblokir dashboard tanpa bergantung pada garis miring penutup', () => {
    const rules = robots().rules
    const disallow = (Array.isArray(rules) ? rules[0] : rules).disallow
    expect(disallow).toContain('/*/dashboard')
    expect(disallow).toEqual(
      expect.arrayContaining(['/admin', '/api/', '/auth/', '/verify-certificate/']),
    )
  })
})
