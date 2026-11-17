import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { expectSql } from './helpers/sql-contract'
/**
 * Aturan C penugasan reviewer:
 *   - klaim untuk diri sendiri cukup `content.review`;
 *   - menugaskan ke orang lain wajib `content.assign`/`question.manage`;
 *   - review yang dipegang reviewer lain tidak bisa direbut lewat klaim diri.
 */
const repoRoot = resolve(__dirname, '../..')
function source(relativePath: string) {
  return readFileSync(resolve(repoRoot, relativePath), 'utf8')
}

const migration = source('supabase/migrations/20260922010000_review_assign_policy_v1.sql')
const action = source('app/actions/content-review.ts')
// The review list computes permissions; the selected-question panel renders the controls.
const page = [
  source('components/admin/domain/content/ReviewWorkspace.tsx'),
  source('components/admin/domain/content/ReviewQuestionWorkspace.tsx'),
].join('\n')
const permissions = source('src/auth/permissions.ts')

describe('kebijakan penugasan reviewer', () => {
  it('permission content.assign hanya diberikan ke manager', () => {
    expect(permissions).toContain("CONTENT_ASSIGN: 'content.assign'")
    expectSql(migration).toContain("'content.assign'")
    expectSql(migration).toMatch(/r\.code in \('ADMIN','SUPER_ADMIN'\)/)
  })

  it('RPC memisahkan klaim diri dari menugaskan orang lain', () => {
    expectSql(migration).toContain('v_can_assign_others')
    expectSql(migration).toMatch(
      /p_reviewer_id is distinct from v_actor and not v_can_assign_others/,
    )
    expectSql(migration).toContain(
      "raise exception 'Review is already assigned to another reviewer'",
    )
  })

  it('action menolak menugaskan orang lain tanpa content.assign', () => {
    expect(action).toContain('PERMISSIONS.CONTENT_ASSIGN')
    expect(action).toMatch(/reviewerId !== authorization\.userId && !canAssignOthers/)
  })

  it('UI memisahkan tombol Klaim dan dropdown Tugaskan', () => {
    expect(page).toContain('canAssignOthers')
    expect(page).toContain('canClaim')
    expect(page).toContain('Klaim untuk saya')
    expect(page).toContain('Tugaskan')
  })
})
