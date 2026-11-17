import { readdirSync, statSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

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
  it('hanya mencantumkan route yang benar-benar ada', () => {
    const routes = new Set(staticPageRoutes())
    const missing = sitemap()
      .map((entry) => new URL(entry.url).pathname.replace(/\/$/, '') || '/')
      .filter((pathname) => !routes.has(pathname))
    expect(missing).toEqual([])
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
