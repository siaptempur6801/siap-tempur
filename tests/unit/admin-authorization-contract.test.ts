import { readFileSync, readdirSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { canPublishArticle, isAdminRole } from '../../lib/utils/roles'

const repoRoot = resolve(__dirname, '../..')

function walk(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name)
        if (entry.isDirectory()) {
            walk(full, out)
        } else if (['.ts', '.tsx'].includes(extname(entry.name))) {
            out.push(full)
        }
    }
    return out
}

const sourceFiles = ['app', 'src', 'lib', 'components'].flatMap((dir) => {
    try {
        return walk(join(repoRoot, dir))
    } catch {
        return []
    }
})

/**
 * Kolom `profiles.role` sudah dihapus di Schema V2. Membacanya akan error dan —
 * karena `error` sering tidak dicek — membuat aksi admin selalu gagal.
 */
const LEGACY_PROFILE_ROLE_QUERY = /from\(\s*['"]profiles['"]\s*\)[\s\S]{0,300}?select\(\s*['"]role['"]\s*\)/

describe('admin authorization contract', () => {
    it('tidak ada kode yang membaca kolom profiles.role yang sudah dihapus', () => {
        const offenders = sourceFiles.filter((file) => {
            const source = readFileSync(file, 'utf8')
            return LEGACY_PROFILE_ROLE_QUERY.test(source)
        })
        expect(offenders.map((file) => file.replace(repoRoot + '/', ''))).toEqual([])
    })

    /**
     * Penjaga agar pohon admin legacy tidak tumbuh kembali.
     *
     * `app/actions/admin.ts` (1.302 baris) sudah dihapus 2026-09-18 karena
     * seluruh 8 pengimpornya tidak terjangkau dan 12 tabel yang ditulisnya tidak
     * ada di Schema V2. Kalau ada yang mengimpornya kembali, test ini gagal dan
     * memaksa keputusan sadar — bukan diam-diam menghidupkan kode yang sudah
     * terbukti tidak pernah dieksekusi.
     */
    it('tidak ada kode yang mengimpor kembali app/actions/admin yang sudah dihapus', () => {
        const offenders = sourceFiles.filter((file) => {
            const source = readFileSync(file, 'utf8')
            return /from\s+['"]@\/app\/actions\/admin['"]/.test(source)
        })
        expect(offenders.map((file) => file.replace(repoRoot + '/', ''))).toEqual([])
    })

    it('halaman review admin memakai content-review service, bukan action legacy', () => {
        // /admin/content/review adalah halaman hidup yang dulu tinggal di
        // app/cpns/admin/review dan diimpor sebagai modul. Ia harus bergantung
        // pada service Schema V2.
        const source = readFileSync(join(repoRoot, 'components/admin/domain/content/ReviewWorkspace.tsx'), 'utf8')
        expect(source).toContain("from '@/src/services/content-review.service'")
        expect(source).toContain("from '@/app/actions/content-review'")
    })

    it('isAdminRole mengenali kode role Schema V2 (huruf besar)', () => {
        expect(isAdminRole('SUPER_ADMIN')).toBe(true)
        expect(isAdminRole('ADMIN')).toBe(true)
        expect(isAdminRole('super_admin')).toBe(true)
        expect(isAdminRole('CONTENT_EDITOR')).toBe(false)
        expect(isAdminRole('CONTENT_REVIEWER')).toBe(false)
        expect(isAdminRole(null)).toBe(false)
        expect(isAdminRole(undefined)).toBe(false)
    })

    it('canPublishArticle hanya untuk admin atau reviewer', () => {
        expect(canPublishArticle('ADMIN')).toBe(true)
        expect(canPublishArticle('CONTENT_REVIEWER')).toBe(true)
        expect(canPublishArticle('CONTENT_EDITOR')).toBe(false)
    })
})
