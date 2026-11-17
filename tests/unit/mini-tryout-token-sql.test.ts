import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it } from 'vitest'

import { expectSql } from './helpers/sql-contract'
const migrationSql = readFileSync(
  resolve(__dirname, '../../supabase/migrations/202606170001_mini_tryout_token_rpc.sql'),
  'utf8',
)

describe('mini tryout token RPC migration', () => {
  it('creates a dedicated mini tryout RPC with auth and fixed product limits', () => {
    expectSql(migrationSql).toContain('create or replace function public.start_mini_tryout_session')
    expectSql(migrationSql).toContain('p_user_id <> (select auth.uid())')
    expectSql(migrationSql).toContain('case p_type')
    expectSql(migrationSql).toContain("when 'TWK'::public.question_type then 30")
    expectSql(migrationSql).toContain("when 'TIU'::public.question_type then 35")
    expectSql(migrationSql).toContain("when 'TKP'::public.question_type then 45")
  })

  it('requires a complete question bank before consuming one token atomically', () => {
    expectSql(migrationSql).toContain('if v_selected_questions <> v_expected_limit then')
    expectSql(migrationSql).toContain("raise exception 'Bank soal mini tryout belum lengkap")
    expectSql(migrationSql).toContain('set tryout_quota = tryout_quota - 1')
    expectSql(migrationSql).toContain('and coalesce(tryout_quota, 0) > 0')
    expectSql(migrationSql).toContain("raise exception 'Not enough SKD tickets'")
  })

  it('creates practice sessions and limits direct execute privileges', () => {
    expectSql(migrationSql).toContain("values (p_user_id, 'practice', 'in_progress', now(), now())")
    expectSql(migrationSql).toContain('revoke execute on function public.start_practice_session')
    expectSql(migrationSql).toContain('from public, anon, authenticated')
    expectSql(migrationSql).toContain('grant execute on function public.start_practice_session')
    expectSql(migrationSql).toContain('to service_role')
    expectSql(migrationSql).toContain('revoke execute on function public.start_mini_tryout_session')
    expectSql(migrationSql).toContain('grant execute on function public.start_mini_tryout_session')
    expectSql(migrationSql).toContain('to authenticated, service_role')
  })
})
