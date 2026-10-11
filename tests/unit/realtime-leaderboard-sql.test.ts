import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it } from 'vitest'

import { expectSql } from './helpers/sql-contract'
const migrationSql = readFileSync(
  resolve(__dirname, '../../supabase/migrations/202606070001_realtime_leaderboard_entries.sql'),
  'utf8',
)

const liveBreakdownMigrationSql = readFileSync(
  resolve(__dirname, '../../supabase/migrations/202606140001_live_leaderboard_score_breakdown.sql'),
  'utf8',
)

describe('realtime leaderboard migration', () => {
  it('creates a Postgres-backed leaderboard table with the expected score index', () => {
    expectSql(migrationSql).toContain('create table if not exists public.leaderboard_entries')
    expectSql(migrationSql).toContain('user_id uuid primary key')
    expectSql(migrationSql).toContain('best_session_id uuid not null')
    expectSql(migrationSql).toContain('leaderboard_entries_score_idx')
    expectSql(migrationSql).toContain('top_score desc, completed_at asc, user_id')
  })

  it('keeps normal clients read-only while exposing authenticated read access', () => {
    expectSql(migrationSql).toContain(
      'alter table public.leaderboard_entries enable row level security',
    )
    expectSql(migrationSql).toContain('grant select on public.leaderboard_entries to authenticated')
    expectSql(migrationSql).toContain(
      'revoke all on public.leaderboard_entries from anon, authenticated',
    )
    expectSql(migrationSql).toContain(
      'grant execute on function public.upsert_leaderboard_from_session(uuid) to authenticated, service_role',
    )
  })

  it('adds the national leaderboard RPCs and only accepts completed tryout sessions for writes', () => {
    expectSql(migrationSql).toContain(
      'create or replace function public.upsert_leaderboard_from_session',
    )
    expectSql(migrationSql).toContain(
      "v_session.mode <> 'tryout' or v_session.status <> 'completed'",
    )
    expectSql(migrationSql).toContain('create or replace function public.get_national_leaderboard')
    expectSql(migrationSql).toContain(
      'order by le.top_score desc, le.completed_at asc, le.user_id asc',
    )
  })

  it('returns event live score in addition to answered progress', () => {
    expectSql(migrationSql).toContain(
      'drop function if exists public.get_live_event_leaderboard(uuid)',
    )
    expectSql(migrationSql).toContain('total_score bigint')
    expectSql(migrationSql).toContain(
      'rank() over (order by ss.total_score desc, ss.started_at asc)',
    )
  })

  it('adds live TWK, TIU, and TKP score breakdown without exposing answer keys to clients', () => {
    expectSql(liveBreakdownMigrationSql).toContain('score_twk bigint')
    expectSql(liveBreakdownMigrationSql).toContain('score_tiu bigint')
    expectSql(liveBreakdownMigrationSql).toContain('score_tkp bigint')
    expectSql(liveBreakdownMigrationSql).toContain("when q.type = 'TWK' and o.is_correct then 5")
    expectSql(liveBreakdownMigrationSql).toContain("when q.type = 'TIU' and o.is_correct then 5")
    expectSql(liveBreakdownMigrationSql).toContain(
      "when q.type = 'TKP' then coalesce(o.score_value, 0)",
    )
    expectSql(liveBreakdownMigrationSql).toContain('if not public.is_admin() then')
    expectSql(liveBreakdownMigrationSql).toContain(
      'revoke execute on function public.get_live_event_leaderboard(uuid) from public, anon',
    )
  })
})
