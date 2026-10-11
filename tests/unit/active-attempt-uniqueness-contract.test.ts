import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it } from 'vitest'

import { expectSql } from './helpers/sql-contract'
const root = process.cwd()
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')

describe('legacy-safe active attempt uniqueness', () => {
  const migration = read(
    'supabase/migrations/20261006172558_scope_active_b2c_attempt_uniqueness_to_operational_rows.sql',
  )
  const probe = read('scripts/db-verify/active-attempt-uniqueness-legacy-safe.sql')

  it('excludes only explicitly imported legacy history from B2C operational uniqueness', () => {
    expectSql(migration).toContain(
      "metadata->>'migration_source' is distinct from 'production_legacy_rehearsal'",
    )
    expectSql(migration).toContain("lower(status) in ('created','in_progress')")
    expectSql(migration).not.toMatch(/legacy-history-[a-z-]+/)
    expectSql(migration).not.toMatch(/[0-9a-f]{8}-[0-9a-f-]{27}/i)
  })

  it('keeps Direct, per-Event, and Organization assignment boundaries covered', () => {
    expectSql(migration).toContain("coalesce(metadata->>'eventId','')")
    expectSql(probe).toContain("'production_legacy_rehearsal'")
    expectSql(probe).toContain('expected modern Direct duplicate to violate unique index')
    expectSql(probe).toContain('expected same-Event duplicate to violate unique index')
    expectSql(probe).toContain('expected same-Assignment duplicate to violate unique index')
    expectSql(probe).toContain("'accessContext','EVENT','eventId'")
  })
})
