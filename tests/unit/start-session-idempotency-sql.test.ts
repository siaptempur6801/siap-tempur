import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { expectSql, normalizeSql } from './helpers/sql-contract'
const migrationSql = readFileSync(
  resolve(__dirname, '../../supabase/migrations/202606170002_start_session_idempotency.sql'),
  'utf8',
)

describe('start session idempotency migration', () => {
  it('serializes full tryout starts per user before checking quota', () => {
    expectSql(migrationSql).toContain(
      "pg_advisory_xact_lock(hashtextextended('start_tryout_session:'",
    )
    expectSql(migrationSql).toContain('where user_id = p_user_id')
    expectSql(migrationSql).toContain("and mode = 'tryout'")
    expectSql(migrationSql).toContain("and status = 'in_progress'")
    expectSql(migrationSql).toContain('return query select v_existing_session_id, null::json')

    const normalizedSql = normalizeSql(migrationSql)
    const activeCheckIndex = normalizedSql.indexOf("andmode='tryout'")
    const quotaUpdateIndex = normalizedSql.indexOf('settryout_quota=tryout_quota-1')
    expect(activeCheckIndex).toBeGreaterThan(-1)
    expect(quotaUpdateIndex).toBeGreaterThan(activeCheckIndex)
  })

  it('serializes mini tryout starts per user and type before checking quota', () => {
    expectSql(migrationSql).toContain(
      "pg_advisory_xact_lock(hashtextextended('start_mini_tryout_session:'",
    )
    expectSql(migrationSql).toContain('q.type = p_type')
    expectSql(migrationSql).toContain("and ts.mode = 'practice'")
    expectSql(migrationSql).toContain("and ts.status = 'in_progress'")
    expectSql(migrationSql).toContain('return query select v_existing_session_id, null::json')
  })
})
