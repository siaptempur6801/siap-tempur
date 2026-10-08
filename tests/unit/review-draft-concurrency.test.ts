import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Review P1 — kontrak optimistic concurrency dan pelestarian ID opsi.
 *
 * Jalur Question Bank sudah dikunci lewat unit test + gate staging; jalur
 * Review memakai RPC berbeda (`save_question_draft`), sehingga
 * kontraknya dikunci di sini: token dikirim form, diperiksa RPC, dan opsi
 * di-upsert alih-alih dihapus massal.
 */
const repoRoot = resolve(__dirname, '../..')
function source(relativePath: string) {
    return readFileSync(resolve(repoRoot, relativePath), 'utf8')
}

const migration = source('supabase/migrations/20260921120000_review_queue_draft_concurrency_v1.sql')
const action = source('app/actions/content-review.ts')
const page = source('components/admin/domain/content/ReviewWorkspace.tsx')

describe('Review — concurrency token & ID opsi', () => {
    it('RPC membandingkan versi dan updated_at, lalu menolak token basi', () => {
        expect(migration).toContain('p_expected_version integer')
        expect(migration).toContain('p_expected_updated_at timestamptz')
        expect(migration).toMatch(/p_expected_version is distinct from v_q\.version/)
        expect(migration).toMatch(/p_expected_updated_at is distinct from v_q\.updated_at/)
        expect(migration).toContain("raise exception 'QUESTION_VERSION_CONFLICT'")
    })

    it('opsi di-upsert, bukan dihapus massal', () => {
        expect(migration).toMatch(/on conflict \(question_id,option_key\) do update/i)
        expect(migration).not.toMatch(/delete from public\.question_options where question_id=v_question_id;/)
    })

    it('form mengirim token dan action memetakannya', () => {
        expect(page).toContain('name="expected_version"')
        expect(page).toContain('name="expected_updated_at"')
        expect(action).toContain('p_expected_version')
        expect(action).toContain('p_expected_updated_at')
        expect(action).toContain('QUESTION_VERSION_CONFLICT')
    })
})
