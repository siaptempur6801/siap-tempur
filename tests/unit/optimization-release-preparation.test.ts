import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  prepareOptimizationSql,
  REVIEWED_MIGRATIONS,
} from '../../scripts/release/prepare-optimization-migrations.mjs'
const sources = Object.fromEntries(
  REVIEWED_MIGRATIONS.map((m: { version: string; name: string }) => [
    m.version,
    readFileSync(
      resolve(__dirname, `../../supabase/migrations/${m.version}_${m.name}.sql`),
      'utf8',
    ),
  ]),
)
describe('controlled optimization migration preparation', () => {
  it('rejects unreviewed SQL before creating a release bundle', () => {
    expect(() =>
      prepareOptimizationSql({
        ...sources,
        '20261009060323': sources['20261009060323'] + '\nselect 1;',
      }),
    ).toThrow('Unreviewed migration content')
  })
  it('puts schema validation and both exact ledger records in the same transaction', () => {
    const sql = prepareOptimizationSql(sources)
    expect(sql.indexOf('BEGIN;')).toBeLessThan(sql.indexOf('DO $preflight$'))
    expect(sql.indexOf('DO $verify$')).toBeLessThan(sql.indexOf('INSERT INTO supabase_migrations'))
    expect(sql.match(/INSERT INTO supabase_migrations.schema_migrations/g)).toHaveLength(2)
    expect(sql.indexOf('NOTIFY pgrst')).toBeLessThan(sql.lastIndexOf('COMMIT;'))
    expect(sql).toContain('Projection already exists: inspect definitions and ledger')
    expect(sql).toContain('Migration version already recorded: inspect drift')
    expect(sql).not.toContain('ON CONFLICT')
    expect(sql).not.toContain('CASCADE')
  })
})
