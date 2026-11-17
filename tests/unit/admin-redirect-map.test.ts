import { existsSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
    LEGACY_ADMIN_BASE_PATH,
    LEGACY_ADMIN_REDIRECTS,
    LEGACY_ADMIN_TAB_ROUTES,
} from '@/lib/admin-redirects'

/**
 * Penjaga peta redirect admin.
 *
 * Diperkenalkan setelah pemindahan modul admin 2026-09-18. Insiden yang mendasari:
 * `app/actions/admin-v2.ts` mengarahkan ke `/cpns/admin?tab=...` dan memanggil
 * `revalidatePath('/cpns/admin')` — path yang setelah pohon legacy dihapus tidak
 * punya halaman lagi, sehingga `?ok=`/`?error=` tidak pernah sampai ke layar dan
 * admin tidak melihat pesan sukses maupun kegagalan.
 *
 * Test ini memastikan setiap tujuan redirect benar-benar punya `page.tsx`.
 */

const repoRoot = resolve(__dirname, '../..')
const appDir = join(repoRoot, 'app')

function collectRoutePatterns(dir: string, prefix = ''): string[] {
    const routes: string[] = []
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name)
        // Route group `(legal)` tidak muncul di URL.
        const segment = entry.name.startsWith('(') && entry.name.endsWith(')')
            ? ''
            : `/${entry.name}`
        const next = `${prefix}${segment}`
        if (entry.isDirectory()) {
            if (existsSync(join(full, 'page.tsx'))) routes.push(next === '' ? '/' : next)
            routes.push(...collectRoutePatterns(full, next))
        }
    }
    return routes
}

const routePatterns = collectRoutePatterns(appDir)

/** Cocokkan path konkret ke pola rute Next.js (`[id]` cocok dengan segmen apa pun). */
function routeExists(pathname: string): boolean {
    const target = pathname.split('?')[0].replace(/\/$/, '') || '/'
    return routePatterns.some((pattern) => {
        const patternParts = pattern.split('/')
        const optionalCatchAll = patternParts.at(-1)?.startsWith('[[...')
        if(optionalCatchAll) return target === patternParts.slice(0,-1).join('/') || target.startsWith(patternParts.slice(0,-1).join('/') + '/')
        const targetParts = target.split('/')
        if (patternParts.length !== targetParts.length) return false
        return patternParts.every((part, index) =>
            part === targetParts[index] || (part.startsWith('[') && part.endsWith(']')),
        )
    })
}

describe('peta redirect admin legacy', () => {
    it('setiap tujuan redirect punya halaman nyata', () => {
        const missing = LEGACY_ADMIN_REDIRECTS
            .filter((rule) => !routeExists(rule.destination))
            .map((rule) => `${rule.source} -> ${rule.destination}`)
        expect(missing).toEqual([])
    })

    it('setiap tab legacy punya halaman nyata', () => {
        const missing = Object.entries(LEGACY_ADMIN_TAB_ROUTES)
            .filter(([, destination]) => !routeExists(destination))
            .map(([tab, destination]) => `${tab} -> ${destination}`)
        expect(missing).toEqual([])
    })

    it('semua sumber redirect berada di bawah path legacy', () => {
        for (const rule of LEGACY_ADMIN_REDIRECTS) {
            expect(rule.source.startsWith(`${LEGACY_ADMIN_BASE_PATH}/`)).toBe(true)
        }
    })

    it('semua tujuan berada di dalam namespace admin kanonik', () => {
        for (const rule of LEGACY_ADMIN_REDIRECTS) {
            expect(rule.destination.startsWith('/admin')).toBe(true)
        }
        for (const destination of Object.values(LEGACY_ADMIN_TAB_ROUTES)) {
            expect(destination.startsWith('/admin')).toBe(true)
        }
    })

    it('tidak ada aturan yang tidak permanen di-cache sebagai 308', () => {
        // 307 dipakai sengaja: ini pembersihan URL internal, bukan kontrak publik.
        // 308 akan di-cache permanen oleh browser sehingga kekeliruan sulit diperbaiki.
        for (const rule of LEGACY_ADMIN_REDIRECTS) {
            expect(rule.permanent).toBe(false)
        }
    })

    it('konteks program/track dibawa pada tujuan yang membutuhkannya', () => {
        // Workspace domain memakai `params.program || 'TKA'`. Tanpa konteks
        // eksplisit, pengguna yang membuka /cpns/admin/event mendarat di konteks TKA.
        const needsContext = ['/admin/content/questions', '/admin/assessment/', '/admin/commerce/orders']
        const withoutContext = LEGACY_ADMIN_REDIRECTS
            .filter((rule) => needsContext.some((prefix) => rule.destination.startsWith(prefix)))
            .filter((rule) => !rule.destination.includes('program=CPNS'))
            .map((rule) => rule.source)
        expect(withoutContext).toEqual([])
    })

    it('tidak ada catch-all yang akan menelan tab legacy', () => {
        // `/cpns/admin/:path*` juga cocok untuk `/cpns/admin?tab=...` dan akan menang
        // atas proxy.ts, sehingga penanganan tab tidak pernah tercapai.
        const catchAll = LEGACY_ADMIN_REDIRECTS.filter((rule) => rule.source.includes(':path*'))
        expect(catchAll).toEqual([])
    })

    it('rute base legacy tidak ditangani di sini (harus di proxy.ts)', () => {
        // redirects() tidak dapat mencocokkan query parameter, dan redirect di sini
        // dievaluasi lebih dulu sehingga akan menutupi penanganan tab di proxy.
        const baseRule = LEGACY_ADMIN_REDIRECTS.filter((rule) => rule.source === LEGACY_ADMIN_BASE_PATH)
        expect(baseRule).toEqual([])
    })

    it('setiap path legacy yang dihapus punya redirect atau memang hilang', () => {
        // Daftar path yang benar-benar dihapus dari app/cpns/admin pada 2026-09-18.
        const removedLegacyPaths = [
            '/cpns/admin/review',
            '/cpns/admin/articles',
            '/cpns/admin/articles/create',
            '/cpns/admin/create',
            '/cpns/admin/event',
            '/cpns/admin/tryout-akbar',
            '/cpns/admin/tryout-config',
            '/cpns/admin/keuangan',
            '/cpns/admin/voucher',
            '/cpns/admin/export',
        ]
        const covered = new Set(LEGACY_ADMIN_REDIRECTS.map((rule) => rule.source))
        const uncovered = removedLegacyPaths.filter((path) => !covered.has(path))
        expect(uncovered).toEqual([])
    })
})
