import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  resolve(
    __dirname,
    '../../supabase/migrations/20261117090000_scope_ranking_reads_and_drop_unused_write_policies.sql',
  ),
  'utf8',
).replace(/^\s*--.*$/gm, '')

function policyBlock(name: string) {
  const match = migration.match(new RegExp(`CREATE POLICY ${name}\\b[^;]*;`, 'i'))
  return match?.[0] ?? ''
}

describe('migration 20261117090000 — ranking reads & policy tulis mati', () => {
  it('preflight menolak bila authenticated punya hak tulis', () => {
    expect(migration).toMatch(/has_table_privilege\('authenticated', v_table, 'INSERT'\)/)
    expect(migration).toMatch(/has_any_column_privilege\('authenticated', v_table, 'UPDATE'\)/)
    expect(migration).toMatch(/RAISE EXCEPTION/)
    expect(migration.indexOf('RAISE EXCEPTION')).toBeLessThan(migration.indexOf('DROP POLICY'))
  })

  it.each([
    ['exam_attempts_insert_own', 'exam_attempts'],
    ['exam_attempts_update_own', 'exam_attempts'],
    ['attempt_answers_insert_own', 'attempt_answers'],
    ['attempt_answers_update_own', 'attempt_answers'],
    ['event_registrations_insert_own', 'event_registrations'],
  ])('menghapus policy %s', (policy, table) => {
    expect(migration).toContain(`DROP POLICY IF EXISTS ${policy} ON public.${table};`)
    expect(policyBlock(policy)).toBe('')
  })

  it.each(['leaderboard_entries_read', 'event_rankings_read'])(
    '%s hanya membuka baris sendiri atau admin',
    (policy) => {
      const block = policyBlock(policy)
      expect(block).toMatch(/FOR SELECT TO authenticated/)
      expect(block).toMatch(/user_id = \(\s*SELECT\s+auth\.uid \(\)/)
      expect(block).toContain("app_private.has_permission ('admin.access'::text)")
      expect(block).not.toMatch(/USING \(TRUE\)/i)
    },
  )
})
