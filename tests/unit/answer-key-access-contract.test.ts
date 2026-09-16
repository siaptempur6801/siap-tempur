import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const repoRoot = resolve(__dirname, '../..')
const read = (relativePath: string) => readFileSync(resolve(repoRoot, relativePath), 'utf8')

const fixDetailMigration = read(
    'supabase/migrations/20260916213000_fix_content_question_detail_answer_key_leak.sql',
)
const revokeVersionsMigration = read(
    'supabase/migrations/20260916213100_revoke_authenticated_question_versions_select.sql',
)
const bootstrapDetailFunctions = read('scripts/cutover/bootstrap/08_functions_app_private_a_m.sql')
const bootstrapPolicies = read('scripts/cutover/bootstrap/16_policies_q_z.sql')
const bootstrapAcl = read('scripts/cutover/bootstrap/18_acl.sql')

/** Buang komentar baris penuh agar teks penjelasan tidak dianggap kode. */
function stripLineComments(sql: string) {
    return sql.replace(/^[ \t]*--.*$/gm, '')
}

/**
 * Ambil isi definisi `app_private.get_content_question_detail` — dari header
 * fungsi sampai fungsi berikutnya — supaya assertion tidak tertipu komentar dan
 * tetap bekerja untuk delimiter `$$` maupun `$function$`.
 */
function detailFunctionBody(sql: string) {
    const anchor = 'function app_private.get_content_question_detail'
    const anchorIndex = sql.toLowerCase().indexOf(anchor)
    if (anchorIndex === -1) return ''

    const nextFunction = sql.indexOf('CREATE OR REPLACE FUNCTION', anchorIndex + anchor.length)
    const body = sql.slice(anchorIndex, nextFunction === -1 ? undefined : nextFunction)
    return stripLineComments(body)
}

/** Gabungkan semua blok `GRANT SELECT ON TABLE ... TO authenticated;`. */
function authenticatedSelectGrantBlock(sql: string) {
    const blocks: string[] = []
    const pattern = /GRANT SELECT ON TABLE([\s\S]*?)TO authenticated;/g
    let match: RegExpExecArray | null
    while ((match = pattern.exec(sql)) !== null) blocks.push(match[1])
    return blocks.join('\n')
}

const ANSWER_KEY_STATUS_CLAUSE = /status\s+in\s*\(\s*'approved'\s*,\s*'published'\s*\)/

describe('answer key access contract (P0)', () => {
    it('migration korektif ada dengan timestamp lebih baru dari migration rentan', () => {
        const vulnerable = '202608210004_content_review_workspace_access_v1.sql'
        const fix = '20260916213000_fix_content_question_detail_answer_key_leak.sql'
        expect(fix > vulnerable).toBe(true)
        expect(fixDetailMigration.length).toBeGreaterThan(0)
        expect(revokeVersionsMigration.length).toBeGreaterThan(0)
    })

    it('get_content_question_detail tidak lagi memakai status approved/published sebagai syarat akses', () => {
        for (const [label, sql] of [
            ['migration korektif', fixDetailMigration],
            ['bootstrap snapshot', bootstrapDetailFunctions],
        ] as const) {
            const body = detailFunctionBody(sql)
            expect(body, `${label}: badan fungsi tidak ditemukan`).not.toBe('')
            expect(
                ANSWER_KEY_STATUS_CLAUSE.test(body),
                `${label}: guard masih mengizinkan status approved/published`,
            ).toBe(false)
        }
    })

    it('get_content_question_detail hanya mengizinkan permission workspace konten', () => {
        const body = detailFunctionBody(fixDetailMigration)
        for (const permission of [
            'admin.access',
            'question.manage',
            'content.read',
            'content.create',
            'content.update',
            'content.review',
            'content.publish',
        ]) {
            expect(body, `permission ${permission} hilang dari guard`).toContain(permission)
        }
        expect(body).toContain('auth.uid()')
        expect(detailFunctionBody(bootstrapDetailFunctions)).toContain('content.read')
    })

    it('migration korektif tetap SECURITY DEFINER dengan search_path kosong', () => {
        expect(fixDetailMigration).toMatch(/security\s+definer/i)
        expect(fixDetailMigration).toMatch(/set\s+search_path\s+to\s+''/i)
    })

    it('authenticated tidak lagi punya SELECT pada question_versions', () => {
        expect(revokeVersionsMigration).toMatch(
            /revoke\s+select\s+on\s+table\s+public\.question_versions\s+from\s+public\s*,\s*anon\s*,\s*authenticated/i,
        )
        expect(authenticatedSelectGrantBlock(bootstrapAcl)).not.toContain('question_versions')
        expect(authenticatedSelectGrantBlock(bootstrapAcl)).not.toContain('question_options')
        expect(authenticatedSelectGrantBlock(bootstrapAcl)).not.toContain('question_explanations')
    })

    it('policy question_versions_authoring_select dihapus dari snapshot', () => {
        expect(revokeVersionsMigration).toMatch(
            /drop\s+policy\s+if\s+exists\s+question_versions_authoring_select/i,
        )
        expect(stripLineComments(bootstrapPolicies)).not.toMatch(
            /CREATE\s+POLICY\s+question_versions_authoring_select/i,
        )
    })

    it('service_role tetap punya akses penuh ke question_versions', () => {
        expect(bootstrapAcl).toMatch(/GRANT ALL PRIVILEGES ON TABLE[\s\S]*?question_versions[\s\S]*?TO service_role;/)
    })
})
