import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { isLegacyHistoryPlaceholder } from '@/lib/question-source'

/**
 * Placeholder riwayat (`legacy_history_placeholder`) adalah penampung attempt
 * lama: tanpa opsi, tanpa kunci, dan direferensikan riwayat peserta. Ia harus
 * terlihat sebagai placeholder dan tidak dapat diedit — bukan tampak seperti
 * draft yang belum lengkap.
 */
const repoRoot = resolve(__dirname, '../..')
function source(relativePath: string) {
    return readFileSync(resolve(repoRoot, relativePath), 'utf8')
}

describe('placeholder riwayat', () => {
    it('mengenali source_type placeholder saja', () => {
        expect(isLegacyHistoryPlaceholder('legacy_history_placeholder')).toBe(true)
        expect(isLegacyHistoryPlaceholder('internal')).toBe(false)
        expect(isLegacyHistoryPlaceholder(null)).toBe(false)
        expect(isLegacyHistoryPlaceholder(undefined)).toBe(false)
    })

    it('dipakai di kedua daftar dan editor Question Bank', () => {
        for (const file of ['app/admin/AdminOperationsWorkspace.tsx', 'app/admin/content/review/page.tsx', 'components/admin/QuestionBankEditorModal.tsx']) {
            expect(source(file), file).toContain('isLegacyHistoryPlaceholder')
        }
    })

    it('query kedua daftar mengambil source_type', () => {
        expect(source('src/services/admin-v2.service.ts')).toMatch(/select: '[^']*source_type[^']*'/)
        expect(source('src/services/content-review.service.ts')).toMatch(/QUEUE_COLUMNS = '[^']*source_type[^']*'/)
    })
})
