-- Roll back the local-only CPNS instansi schema if it was accidentally applied.
-- This migration is idempotent and intentionally removes organization-scoped exam data.

drop policy if exists "Operators view organization answers" on public.test_answers;
drop policy if exists "Operators view organization sessions" on public.test_sessions;
drop policy if exists "Operators manage organizations" on public.organizations;
drop policy if exists "Participants view own organizations" on public.organizations;
drop policy if exists "Operators manage organization members" on public.organization_members;
drop policy if exists "Operators manage organization batches" on public.organization_batches;
drop policy if exists "Participants view own batches" on public.organization_batches;
drop policy if exists "Operators manage organization participants" on public.organization_participants;
drop policy if exists "Participants view own participant rows" on public.organization_participants;
drop policy if exists "Operators manage organization exam templates" on public.organization_exam_templates;
drop policy if exists "Participants view own organization exam templates" on public.organization_exam_templates;
drop policy if exists "Operators manage organization exam assignments" on public.organization_exam_assignments;
drop policy if exists "Participants view own organization exam assignments" on public.organization_exam_assignments;

do $rollback$
declare
  cleanup_conditions text[] := array[]::text[];
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'test_sessions'
      and column_name = 'source'
  ) then
    cleanup_conditions := array_append(cleanup_conditions, 'source = ''organization''');
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'test_sessions'
      and column_name = 'organization_id'
  ) then
    cleanup_conditions := array_append(cleanup_conditions, 'organization_id is not null');
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'test_sessions'
      and column_name = 'organization_batch_id'
  ) then
    cleanup_conditions := array_append(cleanup_conditions, 'organization_batch_id is not null');
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'test_sessions'
      and column_name = 'organization_assignment_id'
  ) then
    cleanup_conditions := array_append(cleanup_conditions, 'organization_assignment_id is not null');
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'test_sessions'
      and column_name = 'organization_participant_id'
  ) then
    cleanup_conditions := array_append(cleanup_conditions, 'organization_participant_id is not null');
  end if;

  if array_length(cleanup_conditions, 1) > 0 then
    execute format(
      'delete from public.test_sessions where %s',
      array_to_string(cleanup_conditions, ' or ')
    );
  end if;
end
$rollback$;

drop index if exists public.test_sessions_source_idx;
drop index if exists public.test_sessions_org_export_idx;
drop index if exists public.test_sessions_org_participant_idx;
drop index if exists public.test_sessions_org_assignment_idx;

alter table if exists public.test_sessions
  drop constraint if exists test_sessions_source_check,
  drop constraint if exists test_sessions_attempt_number_check,
  drop constraint if exists test_sessions_organization_id_fkey,
  drop constraint if exists test_sessions_organization_batch_id_fkey,
  drop constraint if exists test_sessions_organization_assignment_id_fkey,
  drop constraint if exists test_sessions_organization_participant_id_fkey;

alter table if exists public.test_sessions
  drop column if exists source,
  drop column if exists organization_id,
  drop column if exists organization_batch_id,
  drop column if exists organization_assignment_id,
  drop column if exists organization_participant_id,
  drop column if exists attempt_number;

drop table if exists public.organization_exam_assignments;
drop table if exists public.organization_participants;
drop table if exists public.organization_members;
drop table if exists public.organization_exam_templates;
drop table if exists public.organization_batches;
drop table if exists public.organizations;

drop function if exists public.set_current_timestamp_updated_at();
drop function if exists public.is_platform_operator();
