create unique index if not exists learning_recommendations_user_track_type_node_uq
  on public.learning_recommendations(user_id, track_id, recommendation_type, knowledge_node_id);

create or replace function app_private.refresh_tka_smp_learning_recommendations_for_user(
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
  v_active_count integer := 0;
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
    update public.learning_recommendations lr
       set status = 'inactive',
           expires_at = coalesce(lr.expires_at, now())
     where lr.user_id = p_user_id
       and lr.track_id = v_track_id
       and lr.recommendation_type = 'weakest_topic_v1'
       and lr.status = 'active';

    return jsonb_build_object('applied', false, 'reason', 'ACTIVE_USER_TRACK_NOT_FOUND');
  end if;

  update public.learning_recommendations lr
     set status = 'inactive',
         expires_at = coalesce(lr.expires_at, now())
   where lr.user_id = p_user_id
     and lr.track_id = v_track_id
     and lr.recommendation_type = 'weakest_topic_v1'
     and lr.status = 'active';

  with ranked as (
    select
      ukp.knowledge_node_id,
      row_number() over (
        order by
          ukp.mastery_score asc,
          ukp.attempted_questions desc,
          ukp.accuracy asc,
          ukp.knowledge_node_id
      )::integer as priority,
      round(greatest(0::numeric, 1::numeric - ukp.mastery_score), 6) as weakness_score
    from public.user_knowledge_progress ukp
    join public.knowledge_nodes kn on kn.id = ukp.knowledge_node_id
    join public.subjects s on s.id = kn.subject_id
    where ukp.user_id = p_user_id
      and ukp.user_track_id = v_user_track_id
      and s.track_id = v_track_id
      and ukp.attempted_questions > 0
      and ukp.mastery_score < 0.85
      and lower(kn.status) = 'active'
      and lower(s.status) = 'active'
    order by
      ukp.mastery_score asc,
      ukp.attempted_questions desc,
      ukp.accuracy asc,
      ukp.knowledge_node_id
    limit 3
  )
  insert into public.learning_recommendations (
    user_id,
    track_id,
    recommendation_type,
    knowledge_node_id,
    resource_id,
    reason_code,
    priority,
    score,
    status,
    expires_at
  )
  select
    p_user_id,
    v_track_id,
    'weakest_topic_v1',
    r.knowledge_node_id,
    null,
    'weakest_mastery_v1',
    r.priority,
    r.weakness_score,
    'active',
    null
  from ranked r
  on conflict (user_id, track_id, recommendation_type, knowledge_node_id)
  do update set
    reason_code = excluded.reason_code,
    priority = excluded.priority,
    score = excluded.score,
    status = 'active',
    expires_at = null;

  select count(*)::integer
    into v_active_count
  from public.learning_recommendations lr
  where lr.user_id = p_user_id
    and lr.track_id = v_track_id
    and lr.recommendation_type = 'weakest_topic_v1'
    and lr.status = 'active';

  return jsonb_build_object(
    'applied', true,
    'track', 'TKA/SMP',
    'active_recommendations', v_active_count,
    'max_recommendations', 3,
    'rule', 'mastery_asc_evidence_desc_accuracy_asc_v1'
  );
end;
$$;

revoke all on function app_private.refresh_tka_smp_learning_recommendations_for_user(uuid) from public;
revoke all on function app_private.refresh_tka_smp_learning_recommendations_for_user(uuid) from anon;
revoke all on function app_private.refresh_tka_smp_learning_recommendations_for_user(uuid) from authenticated;

create or replace function app_private.refresh_tka_smp_recommendations_from_new_progress()
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
    perform app_private.refresh_tka_smp_learning_recommendations_for_user(v_user_id);
  end loop;
  return null;
end;
$$;

create or replace function app_private.refresh_tka_smp_recommendations_from_old_progress()
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
    perform app_private.refresh_tka_smp_learning_recommendations_for_user(v_user_id);
  end loop;
  return null;
end;
$$;

revoke all on function app_private.refresh_tka_smp_recommendations_from_new_progress() from public, anon, authenticated;
revoke all on function app_private.refresh_tka_smp_recommendations_from_old_progress() from public, anon, authenticated;

drop trigger if exists trg_tka_smp_recommendations_after_progress_insert on public.user_knowledge_progress;
create trigger trg_tka_smp_recommendations_after_progress_insert
after insert on public.user_knowledge_progress
referencing new table as new_rows
for each statement
execute function app_private.refresh_tka_smp_recommendations_from_new_progress();

drop trigger if exists trg_tka_smp_recommendations_after_progress_update on public.user_knowledge_progress;
create trigger trg_tka_smp_recommendations_after_progress_update
after update on public.user_knowledge_progress
referencing new table as new_rows
for each statement
execute function app_private.refresh_tka_smp_recommendations_from_new_progress();

drop trigger if exists trg_tka_smp_recommendations_after_progress_delete on public.user_knowledge_progress;
create trigger trg_tka_smp_recommendations_after_progress_delete
after delete on public.user_knowledge_progress
referencing old table as old_rows
for each statement
execute function app_private.refresh_tka_smp_recommendations_from_old_progress();

create or replace function public.get_tka_smp_learning_focus()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_track_id uuid;
  v_refresh jsonb;
  v_items jsonb := '[]'::jsonb;
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
    return jsonb_build_object(
      'items', '[]'::jsonb,
      'count', 0,
      'refresh', jsonb_build_object('applied', false, 'reason', 'TKA_SMP_TRACK_NOT_FOUND')
    );
  end if;

  v_refresh := app_private.refresh_tka_smp_learning_recommendations_for_user(v_user);

  select coalesce(jsonb_agg(item order by priority), '[]'::jsonb)
    into v_items
  from (
    select
      lr.priority,
      jsonb_build_object(
        'id', lr.id,
        'priority', lr.priority,
        'score', lr.score,
        'reason_code', lr.reason_code,
        'knowledge_node_id', lr.knowledge_node_id,
        'topic_code', kn.code,
        'topic_name', kn.name,
        'parent_topic_name', parent_kn.name,
        'subject_code', s.code,
        'subject_name', s.name,
        'mastery_score', ukp.mastery_score,
        'mastery_level', ukp.mastery_level,
        'attempted_questions', ukp.attempted_questions,
        'correct_questions', ukp.correct_questions,
        'accuracy', ukp.accuracy,
        'open_gap_count', coalesce(gaps.open_gap_count, 0),
        'next_action', case
          when remedial.session_id is not null then jsonb_build_object(
            'type', 'continue_remedial',
            'label', 'Lanjutkan remedial',
            'href', '/tka/smp/remedial/' || remedial.session_id::text
          )
          when coalesce(gaps.open_gap_count, 0) > 0 then jsonb_build_object(
            'type', 'repeat_wrong',
            'label', 'Ulang soal salah',
            'href', '/tka/smp/wrong-questions'
          )
          else jsonb_build_object(
            'type', 'practice_tka',
            'label', 'Latihan TKA SMP',
            'href', '/tka/smp'
          )
        end
      ) as item
    from public.learning_recommendations lr
    join public.knowledge_nodes kn on kn.id = lr.knowledge_node_id
    left join public.knowledge_nodes parent_kn on parent_kn.id = kn.parent_id
    join public.subjects s on s.id = kn.subject_id
    join public.user_tracks ut
      on ut.user_id = lr.user_id
     and ut.track_id = lr.track_id
     and lower(ut.status) = 'active'
    join public.user_knowledge_progress ukp
      on ukp.user_id = lr.user_id
     and ukp.user_track_id = ut.id
     and ukp.knowledge_node_id = lr.knowledge_node_id
    left join lateral (
      select count(*)::integer as open_gap_count
      from public.user_wrong_questions uwq
      where uwq.user_id = lr.user_id
        and uwq.track_id = lr.track_id
        and uwq.knowledge_node_id = lr.knowledge_node_id
        and uwq.status = 'open'
    ) gaps on true
    left join lateral (
      select rs.id as session_id
      from public.remedial_session_items rsi
      join public.remedial_sessions rs on rs.id = rsi.session_id
      where rs.user_id = lr.user_id
        and rs.track_id = lr.track_id
        and rs.status = 'active'
        and rsi.status = 'pending'
        and rsi.knowledge_node_id = lr.knowledge_node_id
      order by rs.created_at desc, rsi.position, rsi.id
      limit 1
    ) remedial on true
    where lr.user_id = v_user
      and lr.track_id = v_track_id
      and lr.recommendation_type = 'weakest_topic_v1'
      and lr.status = 'active'
    order by lr.priority, lr.knowledge_node_id
    limit 3
  ) focus_rows;

  return jsonb_build_object(
    'items', v_items,
    'count', jsonb_array_length(v_items),
    'rule', 'mastery_asc_evidence_desc_accuracy_asc_v1',
    'refresh', v_refresh
  );
end;
$$;

revoke all on function public.get_tka_smp_learning_focus() from public;
revoke all on function public.get_tka_smp_learning_focus() from anon;
grant execute on function public.get_tka_smp_learning_focus() to authenticated;

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
    perform app_private.refresh_tka_smp_learning_recommendations_for_user(r.user_id);
  end loop;
end;
$$;
