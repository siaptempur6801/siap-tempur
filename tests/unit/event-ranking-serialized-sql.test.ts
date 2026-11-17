import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { expectSql, normalizeSql } from './helpers/sql-contract'

/**
 * Audit fase 1, A-04. Versi lama `recalculate_event_rankings` (DELETE + INSERT tanpa
 * kunci) gagal 23505 pada `event_rankings_pkey` saat dua submit event berjalan
 * bersamaan — direproduksi di Postgres lokal (image supabase/postgres 17, 300 attempt).
 * Versi baru diverifikasi di database yang sama: hasil identik dengan versi lama dan
 * 6 penghitungan ulang serentak tanpa error. Test ini menjaga bentuk kontraknya.
 */
const migrationSql = readFileSync(
  resolve(
    __dirname,
    '../../supabase/migrations/20261118090000_serialize_event_ranking_recalculation.sql',
  ),
  'utf8',
)

describe('recalculate_event_rankings berserialisasi (A-04)', () => {
  it('mengunci per event sebelum membaca atau menulis', () => {
    const sql = normalizeSql(migrationSql).toLowerCase()
    const lock = sql.indexOf('pg_advisory_xact_lock')
    expect(lock).toBeGreaterThan(-1)
    expect(lock).toBeLessThan(sql.indexOf('best_attempts'))
    expectSql(migrationSql).toContain("'event-ranking:' || p_event_id::text")
  })

  it('tidak lagi mengosongkan ranking event; memakai upsert', () => {
    expect(normalizeSql(migrationSql).toLowerCase()).not.toMatch(
      /delete from public\.event_rankings\s+where event_id = p_event_id;/,
    )
    expectSql(migrationSql).toContain('on conflict (event_id, user_id) do update set')
    expectSql(migrationSql).toContain('and a.rank is distinct from er.rank')
  })

  it('search_path kosong dan hanya service_role yang boleh mengeksekusi', () => {
    expectSql(migrationSql).toContain("set search_path = ''")
    for (const role of ['public', 'anon', 'authenticated']) {
      expectSql(migrationSql).toContain(
        `revoke all on function public.recalculate_event_rankings (uuid) from ${role};`,
      )
    }
    expectSql(migrationSql).toContain(
      'grant execute on function public.recalculate_event_rankings (uuid) to service_role;',
    )
  })
})
