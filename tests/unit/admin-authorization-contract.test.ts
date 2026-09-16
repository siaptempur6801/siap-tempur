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

function functionBody(source: string, exportName: string, nextMarker: string) {
    const start = source.indexOf(`export async function ${exportName}`)
    if (start === -1) return ''
    const end = source.indexOf(nextMarker, start)
    return source.slice(start, end === -1 ? undefined : end)
}

describe('admin authorization contract', () => {
    it('tidak ada kode yang membaca kolom profiles.role yang sudah dihapus', () => {
        const offenders = sourceFiles.filter((file) => {
            const source = readFileSync(file, 'utf8')
            return LEGACY_PROFILE_ROLE_QUERY.test(source)
        })
        expect(offenders.map((file) => file.replace(repoRoot + '/', ''))).toEqual([])
    })

    it('updateEventCertificateName memakai permission service, bukan role legacy', () => {
        const source = readFileSync(join(repoRoot, 'app/actions/admin.ts'), 'utf8')
        const body = functionBody(source, 'updateEventCertificateName', '\nfunction isEventQuestionGenerationMode')

        expect(body, 'fungsi tidak ditemukan').not.toBe('')
        expect(body).toContain('isAdmin()')
        expect(body).not.toMatch(/select\(\s*['"]role['"]\s*\)/)
        expect(body).not.toContain('superadmin')
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
