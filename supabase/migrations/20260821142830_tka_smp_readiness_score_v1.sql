create unique index if not exists user_readiness_user_track_version_uq
  on public.user_readiness(user_id, track_id, calculation_version);

create or replace function app_private.refresh_tka_smp_readiness_for_user(
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_track_id uuid;
  v_user_track_id uuid;
  v_readiness numeric := 0;
  v_confidence numeric := 0;
  v_subject_count integer := 0;
  v_row public.user_readiness%rowtype;
begin
  select t.id
    into v_track_id
  from public.programs p
  join public.tracks t on t.program_id = p.id
  where upper(p.code) = 'TKA'
    and upper(t.code) = 'SMP'
  limit 1;

  if v_track_id is null then
    return jsonb_build_object('applied', false, 'reason', 'TKA_SMP_TRACK_NOT_FOUND');
  end if;

  select ut.id
    into v_user_track_id
  from public.user_tracks ut
  where ut.user_id = p_user_id
    and ut.track_id = v_track_id
    and lower(ut.status) = 'active'
  order by ut.updated_at desc nulls last, ut.started_at desc nulls last
  limit 1;

  if v_user_track_id is null then
    delete from public.user_readiness ur
    where ur.user_id = p_user_id
      and ur.track_id = v_track_id
      and ur.calculation_version = 'tka_smp_readiness_v1';

    return jsonb_build_object('applied', false, 'reason', 'ACTIVE_USER_TRACK_NOT_FOUND');
  end if;

  with assessable as (
    select distinct
      kn.id as knowledge_node_id,
      s.id as subject_id
    from public.knowledge_nodes kn
    join public.subjects s on s.id = kn.subject_id
    join public.question_knowledge_nodes qkn
      on qkn.knowledge_node_id = kn.id
     and lower(qkn.relation_type) = 'primary'
    join public.questions q on q.id = qkn.question_id
    where s.track_id = v_track_id
      and lower(s.status) = 'active'
      and lower(kn.status) = 'active'
      and lower(q.status) in ('approved', 'published')
  ),
  subject_metrics as (
    select
      a.subject_id,
      avg(coalesce(ukp.mastery_score, 0::numeric)) as subject_readiness,
      avg(least(1::numeric, coalesce(ukp.attempted_questions, 0)::numeric / 5::numeric)) as subject_confidence
    from assessable a
    left join public.user_knowledge_progress ukp
      on ukp.user_id = p_user_id
     and ukp.user_track_id = v_user_track_id
     and ukp.knowledge_node_id = a.knowledge_node_id
    group by a.subject_id
  )
  select
    count(*)::integer,
    coalesce(round(0.75::numeric * avg(sm.subject_readiness) + 0.25::numeric * min(sm.subject_readiness), 6), 0::numeric),
    coalesce(round(avg(sm.subject_confidence), 6), 0::numeric)
    into v_subject_count, v_readiness, v_confidence
  from subject_metrics sm;

  if v_subject_count = 0 then
    delete from public.user_readiness ur
    where ur.user_id = p_user_id
      and ur.track_id = v_track_id
      and ur.calculation_version = 'tka_smp_readiness_v1';

    return jsonb_build_object('applied', false, 'reason', 'NO_ASSESSABLE_SUBJECTS');
  end if;

  insert into public.user_readiness (
    user_id,
    track_id,
    readiness_score,
    confidence_score,
    calculation_version,
    calculated_at
  )
  values (
    p_user_id,
    v_track_id,
    greatest(0::numeric, least(1::numeric, v_readiness)),
    greatest(0::numeric, least(1::numeric, v_confidence)),
    'tka_smp_readiness_v1',
    now()
  )
  on conflict (user_id, track_id, calculation_version)
  do update set
    readiness_score = excluded.readiness_score,
    confidence_score = excluded.confidence_score,
    calculated_at = excluded.calculated_at
  where public.user_readiness.readiness_score is distinct from excluded.readiness_score
     or public.user_readiness.confidence_score is distinct from excluded.confidence_score;

  select ur.*
    into v_row
  from public.user_readiness ur
  where ur.user_id = p_user_id
    and ur.track_id = v_track_id
    and ur.calculation_version = 'tka_smp_readiness_v1'
  limit 1;

  return jsonb_build_object(
    'applied', true,
    'track', 'TKA/SMP',
    'readiness_score', v_row.readiness_score,
    'confidence_score', v_row.confidence_score,
    'calculation_version', v_row.calculation_version,
    'calculated_at', v_row.calculated_at,
    'formula', '0.75_mean_subject_readiness_plus_0.25_weakest_subject_v1'
  );
end;
$$;

revoke all on function app_private.refresh_tka_smp_readiness_for_user(uuid) from public, anon, authenticated;

create or replace function app_private.refresh_tka_smp_readiness_from_new_progress()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  for v_user_id in
    select distinct nr.user_id
    from new_rows nr
    where nr.user_id is not null
  loop
    perform app_private.refresh_tka_smp_readiness_for_user(v_user_id);
  end loop;
  return null;
end;
$$;

create or replace function app_private.refresh_tka_smp_readiness_from_old_progress()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  for v_user_id in
    select distinct orow.user_id
    from old_rows orow
    where orow.user_id is not null
  loop
    perform app_private.refresh_tka_smp_readiness_for_user(v_user_id);
  end loop;
  return null;
end;
$$;

revoke all on function app_private.refresh_tka_smp_readiness_from_new_progress() from public, anon, authenticated;
revoke all on function app_private.refresh_tka_smp_readiness_from_old_progress() from public, anon, authenticated;

drop trigger if exists trg_tka_smp_readiness_after_progress_insert on public.user_knowledge_progress;
create trigger trg_tka_smp_readiness_after_progress_insert
after insert on public.user_knowledge_progress
referencing new table as new_rows
for each statement
execute function app_private.refresh_tka_smp_readiness_from_new_progress();

drop trigger if exists trg_tka_smp_readiness_after_progress_update on public.user_knowledge_progress;
create trigger trg_tka_smp_readiness_after_progress_update
after update on public.user_knowledge_progress
referencing new table as new_rows
for each statement
execute function app_private.refresh_tka_smp_readiness_from_new_progress();

drop trigger if exists trg_tka_smp_readiness_after_progress_delete on public.user_knowledge_progress;
create trigger trg_tka_smp_readiness_after_progress_delete
after delete on public.user_knowledge_progress
referencing old table as old_rows
for each statement
execute function app_private.refresh_tka_smp_readiness_from_old_progress();

create or replace function public.get_tka_smp_readiness()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_track_id uuid;
  v_user_track_id uuid;
  v_refresh jsonb;
  v_readiness public.user_readiness%rowtype;
  v_subjects jsonb := '[]'::jsonb;
  v_level text;
  v_confidence_level text;
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;

  select t.id
    into v_track_id
  from public.programs p
  join public.tracks t on t.program_id = p.id
  where upper(p.code) = 'TKA'
    and upper(t.code) = 'SMP'
  limit 1;

  if v_track_id is null then
    return jsonb_build_object('available', false, 'reason', 'TKA_SMP_TRACK_NOT_FOUND');
  end if;

  select ut.id
    into v_user_track_id
  from public.user_tracks ut
  where ut.user_id = v_user
    and ut.track_id = v_track_id
    and lower(ut.status) = 'active'
  order by ut.updated_at desc nulls last, ut.started_at desc nulls last
  limit 1;

  if v_user_track_id is null then
    return jsonb_build_object('available', false, 'reason', 'ACTIVE_USER_TRACK_NOT_FOUND');
  end if;

  v_refresh := app_private.refresh_tka_smp_readiness_for_user(v_user);

  select ur.*
    into v_readiness
  from public.user_readiness ur
  where ur.user_id = v_user
    and ur.track_id = v_track_id
    and ur.calculation_version = 'tka_smp_readiness_v1'
  limit 1;

  if v_readiness.id is null then
    return jsonb_build_object('available', false, 'reason', 'READINESS_NOT_AVAILABLE', 'refresh', v_refresh);
  end if;

  with assessable as (
    select distinct
      kn.id as knowledge_node_id,
      s.id as subject_id,
      s.code as subject_code,
      s.name as subject_name
    from public.knowledge_nodes kn
    join public.subjects s on s.id = kn.subject_id
    join public.question_knowledge_nodes qkn
      on qkn.knowledge_node_id = kn.id
     and lower(qkn.relation_type) = 'primary'
    join public.questions q on q.id = qkn.question_id
    where s.track_id = v_track_id
      and lower(s.status) = 'active'
      and lower(kn.status) = 'active'
      and lower(q.status) in ('approved', 'published')
  ), subject_metrics as (
    select
      a.subject_id,
      a.subject_code,
      a.subject_name,
      count(*)::integer as assessable_nodes,
      count(*) filter (where coalesce(ukp.attempted_questions, 0) > 0)::integer as evidenced_nodes,
      round(avg(coalesce(ukp.mastery_score, 0::numeric)), 6) as readiness_score,
      round(avg(least(1::numeric, coalesce(ukp.attempted_questions, 0)::numeric / 5::numeric)), 6) as confidence_score
    from assessable a
    left join public.user_knowledge_progress ukp
      on ukp.user_id = v_user
     and ukp.user_track_id = v_user_track_id
     and ukp.knowledge_node_id = a.knowledge_node_id
    group by a.subject_id, a.subject_code, a.subject_name
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'subject_id', sm.subject_id,
    'subject_code', sm.subject_code,
    'subject_name', sm.subject_name,
    'readiness_score', sm.readiness_score,
    'confidence_score', sm.confidence_score,
    'assessable_nodes', sm.assessable_nodes,
    'evidenced_nodes', sm.evidenced_nodes
  ) order by sm.subject_code), '[]'::jsonb)
    into v_subjects
  from subject_metrics sm;

  v_level := case
    when v_readiness.readiness_score >= 0.80 then 'ready'
    when v_readiness.readiness_score >= 0.65 then 'almost_ready'
    when v_readiness.readiness_score >= 0.40 then 'developing'
    else 'building_foundation'
  end;

  v_confidence_level := case
    when coalesce(v_readiness.confidence_score, 0) >= 0.70 then 'high'
    when coalesce(v_readiness.confidence_score, 0) >= 0.35 then 'moderate'
    else 'low'
  end;

  return jsonb_build_object(
    'available', true,
    'readiness_score', v_readiness.readiness_score,
    'readiness_percent', round(v_readiness.readiness_score * 100, 1),
    'readiness_level', v_level,
    'confidence_score', v_readiness.confidence_score,
    'confidence_percent', round(coalesce(v_readiness.confidence_score, 0) * 100, 1),
    'confidence_level', v_confidence_level,
    'calculation_version', v_readiness.calculation_version,
    'calculated_at', v_readiness.calculated_at,
    'formula', '0.75_mean_subject_readiness_plus_0.25_weakest_subject_v1',
    'subjects', v_subjects
  );
end;
$$;

revoke all on function public.get_tka_smp_readiness() from public;
revoke all on function public.get_tka_smp_readiness() from anon;
grant execute on function public.get_tka_smp_readiness() to authenticated;

do $$
declare
  r record;
begin
  for r in
    select distinct ukp.user_id
    from public.user_knowledge_progress ukp
    join public.user_tracks ut on ut.id = ukp.user_track_id
    join public.tracks t on t.id = ut.track_id
    join public.programs p on p.id = t.program_id
    where upper(p.code) = 'TKA'
      and upper(t.code) = 'SMP'
  loop
    perform app_private.refresh_tka_smp_readiness_for_user(r.user_id);
  end loop;
end;
$$;
