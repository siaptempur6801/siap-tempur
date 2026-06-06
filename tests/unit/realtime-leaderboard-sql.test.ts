import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationSql = readFileSync(
  resolve(__dirname, '../../supabase/migrations/202606070001_realtime_leaderboard_entries.sql'),
  'utf8'
)

describe('realtime leaderboard migration', () => {
  it('creates a Postgres-backed leaderboard table with the expected score index', () => {
    expect(migrationSql).toContain('create table if not exists public.leaderboard_entries')
    expect(migrationSql).toContain('user_id uuid primary key')
    expect(migrationSql).toContain('best_session_id uuid not null')
    expect(migrationSql).toContain('leaderboard_entries_score_idx')
    expect(migrationSql).toContain('top_score desc, completed_at asc, user_id')
  })

  it('keeps normal clients read-only while exposing authenticated read access', () => {
    expect(migrationSql).toContain('alter table public.leaderboard_entries enable row level security')
    expect(migrationSql).toContain('grant select on public.leaderboard_entries to authenticated')
    expect(migrationSql).toContain('revoke all on public.leaderboard_entries from anon, authenticated')
    expect(migrationSql).toContain('grant execute on function public.upsert_leaderboard_from_session(uuid) to authenticated, service_role')
  })

  it('adds the national leaderboard RPCs and only accepts completed tryout sessions for writes', () => {
    expect(migrationSql).toContain('create or replace function public.upsert_leaderboard_from_session')
    expect(migrationSql).toContain("v_session.mode <> 'tryout' or v_session.status <> 'completed'")
    expect(migrationSql).toContain('create or replace function public.get_national_leaderboard')
    expect(migrationSql).toContain('order by le.top_score desc, le.completed_at asc, le.user_id asc')
  })

  it('returns event live score in addition to answered progress', () => {
    expect(migrationSql).toContain('drop function if exists public.get_live_event_leaderboard(uuid)')
    expect(migrationSql).toContain('total_score bigint')
    expect(migrationSql).toContain('rank() over (order by ss.total_score desc, ss.started_at asc)')
  })
})
