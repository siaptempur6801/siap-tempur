-- Remove legacy tables that are no longer used by the active application flow.
-- Safe to rerun.

do $cleanup$
begin
  if to_regclass('public.materials') is not null then
    drop policy if exists "Authenticated read materials" on public.materials;
  end if;

  if to_regclass('public.tryouts') is not null then
    drop policy if exists "Authenticated read tryouts" on public.tryouts;
  end if;

  if to_regclass('public.tryout_questions') is not null then
    drop policy if exists "Authenticated read tryout questions" on public.tryout_questions;
  end if;
end
$cleanup$;

drop index if exists public.tryout_questions_question_id_idx;

alter table if exists public.test_sessions
  drop constraint if exists test_sessions_tryout_id_fkey;

alter table if exists public.test_sessions
  drop column if exists tryout_id;

drop table if exists public.tryout_questions;
drop table if exists public.tryouts;
drop table if exists public.materials;
