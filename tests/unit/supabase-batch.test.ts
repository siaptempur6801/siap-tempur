import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SUPABASE_IN_FILTER_BATCH_SIZE, chunkValues } from '../../lib/supabase-batch'

const repoRoot = resolve(__dirname, '../..')
const adminExamsSource = readFileSync(resolve(repoRoot, 'src/services/admin-exams.service.ts'), 'utf8')

describe('chunkValues', () => {
    it('memakai ukuran batch default yang aman untuk URL PostgREST', () => {
        expect(SUPABASE_IN_FILTER_BATCH_SIZE).toBeGreaterThan(0)
        // 100 UUID (±37 karakter) ≈ 3.7KB, jauh di bawah batas header ±16KB.
        expect(SUPABASE_IN_FILTER_BATCH_SIZE).toBeLessThanOrEqual(200)
    })

    it('mengembalikan array kosong untuk input kosong', () => {
        expect(chunkValues([])).toEqual([])
    })

    it('memecah tepat pada ukuran batch', () => {
        const values = Array.from({ length: 250 }, (_, index) => `id-${index}`)
        const batches = chunkValues(values)

        expect(batches.map((batch) => batch.length)).toEqual([100, 100, 50])
        expect(batches.flat()).toEqual(values)
    })

    it('menghormati ukuran batch kustom', () => {
        expect(chunkValues([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
    })

    it('tidak menduplikasi atau membuang nilai', () => {
        const values = Array.from({ length: 1000 }, (_, index) => `q-${index}`)
        const flattened = chunkValues(values).flat()

        expect(flattened).toHaveLength(values.length)
        expect(new Set(flattened).size).toBe(values.length)
    })
})

describe('kontrak: filter .in() besar di admin-exams harus di-batch', () => {
    it('memakai chunkValues untuk daftar soal', () => {
        expect(adminExamsSource).toContain('chunkValues')
        expect(adminExamsSource).toMatch(/for \(const batch of chunkValues\(questionIds\)\)/)
        expect(adminExamsSource).toMatch(/chunkValues\(questions\.map\(\(row\) => String\(row\.id\)\)\)/)
    })

    it('tidak lagi mengirim daftar soal tanpa batch ke PostgREST', () => {
        expect(adminExamsSource).not.toMatch(/\.in\(\s*'id'\s*,\s*questionIds\s*\)/)
        expect(adminExamsSource).not.toMatch(/\.in\(\s*'question_id'\s*,\s*questions\.map/)
    })
})
