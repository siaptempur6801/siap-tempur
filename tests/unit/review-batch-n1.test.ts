import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Aksi massal Review Queue tidak boleh kembali ke N+1: satu RPC per soal membuat
 * batch 500 soal berarti 500 round-trip berurutan dari server action.
 *
 * Fungsi batch harus memanggil fungsi workflow yang sama (`submit_question_for_review`,
 * `publish_question`) di dalam satu transaksi — bukan menggandakan aturannya.
 */
const repoRoot = resolve(__dirname, '../..')
function source(relativePath: string) {
    return readFileSync(resolve(repoRoot, relativePath), 'utf8')
}

const migration = source('supabase/migrations/20260921140000_review_batch_submit_publish_v1.sql')
const action = source('app/actions/content-review-batch.ts')

describe('aksi massal Review Queue', () => {
    it('RPC batch memanggil fungsi workflow yang sama dan membatasi ukuran', () => {
        expect(migration).toMatch(/perform app_private\.submit_question_for_review\(v_id\)/)
        expect(migration).toMatch(/perform app_private\.publish_question\(v_id\)/)
        expect(migration).toContain('BATCH_TOO_LARGE')
        expect(migration).toContain('array_length(p_question_ids, 1) > 1000')
    })

    it('action memakai satu panggilan batch, bukan loop RPC per soal', () => {
        expect(action).toContain("rpc('submit_questions_for_review'")
        expect(action).toContain("rpc('publish_questions'")
        expect(action).not.toContain("rpc('submit_question_for_review'")
        expect(action).not.toContain("rpc('publish_question'")
    })
})
