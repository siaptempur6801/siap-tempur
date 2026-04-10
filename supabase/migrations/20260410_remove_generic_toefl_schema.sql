-- Remove deprecated generic/TOEFL schema now that the product is CPNS-only.
-- Safe to rerun.

do $cleanup$
begin
  if to_regclass('public.generic_tests') is not null then
    drop policy if exists "Public read generic_tests" on public.generic_tests;
  end if;

  if to_regclass('public.generic_questions') is not null then
    drop policy if exists "Public read generic_questions" on public.generic_questions;
  end if;

  if to_regclass('public.generic_options') is not null then
    drop policy if exists "Public read generic_options" on public.generic_options;
  end if;

  if to_regclass('public.generic_sessions') is not null then
    drop policy if exists "Users can view own generic_sessions" on public.generic_sessions;
    drop policy if exists "Users can insert own generic_sessions" on public.generic_sessions;
    drop policy if exists "Users can update own generic_sessions" on public.generic_sessions;
  end if;

  if to_regclass('public.generic_answers') is not null then
    drop policy if exists "Users can view own generic_answers" on public.generic_answers;
    drop policy if exists "Users can insert own generic_answers" on public.generic_answers;
    drop policy if exists "Users can update own generic_answers" on public.generic_answers;
  end if;
end
$cleanup$;

drop table if exists public.generic_answers;
drop table if exists public.generic_sessions;
drop table if exists public.generic_options;
drop table if exists public.generic_questions;
drop table if exists public.generic_tests;

drop function if exists public.increment_toefl_quota(uuid, int);

alter table if exists public.profiles
  drop column if exists tryout_quota_toefl;
