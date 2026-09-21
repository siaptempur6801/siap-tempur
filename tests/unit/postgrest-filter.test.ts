import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { escapePostgrestValue } from '@/lib/postgrest-filter'

const repoRoot = resolve(__dirname, '../..')

describe('escapePostgrestValue', () => {
    it('membuang karakter struktural ekspresi `or` PostgREST', () => {
        expect(escapePostgrestValue('a,b')).toBe('a b')
        expect(escapePostgrestValue('x) or (y')).toBe('x  or  y')
        expect(escapePostgrestValue('kata(1)')).toBe('kata 1')
    })

    it('membuang wildcard LIKE dan backslash', () => {
        expect(escapePostgrestValue('%semua%')).toBe('semua')
        expect(escapePostgrestValue('a*b')).toBe('a b')
        expect(escapePostgrestValue('a\\b')).toBe('a b')
    })

    it('meneruskan kata kunci wajar apa adanya', () => {
        expect(escapePostgrestValue('TWK-2026')).toBe('TWK-2026')
        expect(escapePostgrestValue('  pancasila  ')).toBe('pancasila')
        expect(escapePostgrestValue('kata_kunci')).toBe('kata_kunci')
    })

    it('dipakai oleh kedua pencarian admin, bukan salinan lokal', () => {
        for (const file of ['src/services/admin-v2.service.ts', 'src/services/content-review.service.ts']) {
            const text = readFileSync(resolve(repoRoot, file), 'utf8')
            expect(text, `${file} harus memakai helper bersama`).toContain("from '@/lib/postgrest-filter'")
            expect(text).not.toMatch(/function escapePostgrestValue/)
        }
    })
})
