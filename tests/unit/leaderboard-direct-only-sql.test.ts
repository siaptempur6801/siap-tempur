import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { expectSql, normalizeSql } from './helpers/sql-contract'

/**
 * Audit fase 1, A-08 (keputusan pemilik 2026-11-17: leaderboard nasional hanya Direct).
 * Diverifikasi di Postgres lokal: sebelum migration, attempt Event (450) dan Organisasi
 * (400) menempati peringkat 1–2; sesudahnya hanya dua attempt Direct yang tersisa, dan
 * hitung ulang inkremental untuk peserta Event/Organisasi tidak menambahkannya kembali.
 */
const migrationSql = readFileSync(
  resolve(
    __dirname,
    '../../supabase/migrations/20261118091000_leaderboard_direct_attempts_only.sql',
  ),
  'utf8',
)

const DIRECT_PREDICATE = [
  'and ea.assignment_id is null',
  "and coalesce(ea.metadata ->> 'eventid', '') = ''",
  "and upper(coalesce(ea.metadata ->> 'accesscontext', 'direct')) = 'direct'",
]

describe('leaderboard nasional hanya attempt Direct (A-08)', () => {
  it('kedua fungsi papan memakai predikat konteks Direct', () => {
    const sql = normalizeSql(migrationSql).toLowerCase().replace(/\s+/g, '')
    const recalc = sql.slice(
      sql.indexOf('functionpublic.recalculate_leaderboard'),
      sql.indexOf('functionpublic.rebuild_leaderboard'),
    )
    const rebuild = sql.slice(sql.indexOf('functionpublic.rebuild_leaderboard'))
    for (const body of [recalc, rebuild]) {
      for (const clause of DIRECT_PREDICATE) expect(body).toContain(clause.replace(/\s+/g, ''))
    }
  })

  it('papan aktif dibangun ulang dan ACL tetap service_role saja', () => {
    expectSql(migrationSql).toContain('public.rebuild_leaderboard (v_board_id)')
    expectSql(migrationSql).toContain(
      'grant execute on function public.recalculate_leaderboard (uuid, uuid) to service_role;',
    )
    expectSql(migrationSql).toContain(
      'revoke all on function public.rebuild_leaderboard (uuid) from authenticated;',
    )
  })
})
