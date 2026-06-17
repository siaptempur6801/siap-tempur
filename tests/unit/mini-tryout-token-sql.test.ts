import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationSql = readFileSync(
    resolve(__dirname, '../../supabase/migrations/202606170001_mini_tryout_token_rpc.sql'),
    'utf8'
)

describe('mini tryout token RPC migration', () => {
    it('creates a dedicated mini tryout RPC with auth and fixed product limits', () => {
        expect(migrationSql).toContain('create or replace function public.start_mini_tryout_session')
        expect(migrationSql).toContain("p_user_id <> (select auth.uid())")
        expect(migrationSql).toContain('case p_type')
        expect(migrationSql).toContain("when 'TWK'::public.question_type then 30")
        expect(migrationSql).toContain("when 'TIU'::public.question_type then 35")
        expect(migrationSql).toContain("when 'TKP'::public.question_type then 45")
    })

    it('requires a complete question bank before consuming one token atomically', () => {
        expect(migrationSql).toContain('if v_selected_questions <> v_expected_limit then')
        expect(migrationSql).toContain("raise exception 'Bank soal mini tryout belum lengkap")
        expect(migrationSql).toContain('set tryout_quota = tryout_quota - 1')
        expect(migrationSql).toContain('and coalesce(tryout_quota, 0) > 0')
        expect(migrationSql).toContain("raise exception 'Not enough SKD tickets'")
    })

    it('creates practice sessions and limits direct execute privileges', () => {
        expect(migrationSql).toContain("values (p_user_id, 'practice', 'in_progress', now(), now())")
        expect(migrationSql).toContain('revoke execute on function public.start_practice_session')
        expect(migrationSql).toContain('from public, anon, authenticated')
        expect(migrationSql).toContain('grant execute on function public.start_practice_session')
        expect(migrationSql).toContain('to service_role')
        expect(migrationSql).toContain('revoke execute on function public.start_mini_tryout_session')
        expect(migrationSql).toContain('grant execute on function public.start_mini_tryout_session')
        expect(migrationSql).toContain('to authenticated, service_role')
    })
})
