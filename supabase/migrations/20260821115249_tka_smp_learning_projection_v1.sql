-- Milestone 3 / Slice 3.1: deterministic TKA SMP learning projection.
-- Rebuilds user knowledge + subject progress from canonical completed attempts.
-- Primary knowledge mappings only; secondary mappings remain analytics-only.

create or replace function app_private.refresh_tka_smp_learning_projection_for_user(
  p_user_id uuid,
  p_source_attempt_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_track_id uuid;
  v_source_track_id uuid;
  v_user_track_id uuid;
  v_knowledge_rows integer := 0;
  v_subject_rows integer := 0;
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

  if p_source_attempt_id is not null then
    select e.track_id
      into v_source_track_id
    from public.exam_attempts ea
    join public.exams e on e.id = ea.exam_id
    where ea.id = p_source_attempt_id
      and ea.user_id = p_user_id
      and lower(ea.status) = 'completed';

    if v_source_track_id is null then
      return jsonb_build_object('applied', false, 'reason', 'COMPLETED_SOURCE_ATTEMPT_NOT_FOUND');
    end if;

    if v_source_track_id <> v_track_id then
      return jsonb_build_object('applied', false, 'reason', 'TRACK_NOT_SUPPORTED');
    end if;
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
    return jsonb_build_object('applied', false, 'reason', 'ACTIVE_USER_TRACK_NOT_FOUND');
  end if;

  -- Full rebuild makes retries/backfills idempotent and removes stale projections.
  delete from public.user_knowledge_progress ukp
  where ukp.user_id = p_user_id
    and ukp.user_track_id = v_user_track_id;

  with knowledge_agg as (
    select
      qkn.knowledge_node_id,
      count(*)::integer as attempted_questions,
      count(*) filter (where aa.is_correct is true)::integer as correct_questions,
      count(*) filter (where aa.is_correct is true)::numeric / nullif(count(*), 0) as accuracy,
      avg(coalesce(aa.score_awarded, 0))::numeric as average_score,
      avg(coalesce(aa.time_spent_seconds, 0))::numeric as average_time_seconds,
      max(ea.submitted_at) as last_practiced_at
    from public.exam_attempts ea
    join public.exams e on e.id = ea.exam_id
    join public.attempt_questions aq on aq.attempt_id = ea.id
    join public.question_knowledge_nodes qkn
      on qkn.question_id = aq.question_id
     and qkn.relation_type = 'primary'
    left join public.attempt_answers aa on aa.attempt_question_id = aq.id
    where ea.user_id = p_user_id
      and e.track_id = v_track_id
      and lower(ea.status) = 'completed'
    group by qkn.knowledge_node_id
  ), scored as (
    select
      knowledge_node_id,
      attempted_questions,
      correct_questions,
      round(coalesce(accuracy, 0), 6) as accuracy,
      round(coalesce(average_score, 0), 6) as average_score,
      round(coalesce(average_time_seconds, 0), 2) as average_time_seconds,
      round(
        (
          (0.70 * coalesce(average_score, 0)) +
          (0.30 * coalesce(accuracy, 0))
        ) * least(1::numeric, attempted_questions::numeric / 5::numeric),
        6
      ) as mastery_score,
      last_practiced_at
    from knowledge_agg
  )
  insert into public.user_knowledge_progress (
    user_id,
    user_track_id,
    knowledge_node_id,
    attempted_questions,
    correct_questions,
    accuracy,
    average_score,
    average_time_seconds,
    mastery_score,
    mastery_level,
    last_practiced_at,
    updated_at
  )
  select
    p_user_id,
    v_user_track_id,
    s.knowledge_node_id,
    s.attempted_questions,
    s.correct_questions,
    s.accuracy,
    s.average_score,
    s.average_time_seconds,
    s.mastery_score,
    case
      when s.mastery_score >= 0.85 then 'mastered'
      when s.mastery_score >= 0.70 then 'proficient'
      when s.mastery_score >= 0.40 then 'developing'
      else 'needs_work'
    end,
    s.last_practiced_at,
    now()
  from scored s;

  get diagnostics v_knowledge_rows = row_count;

  delete from public.user_subject_progress usp
  where usp.user_id = p_user_id
    and usp.subject_id in (
      select s.id from public.subjects s where s.track_id = v_track_id
    );

  with subject_agg as (
    select
      ats.subject_id,
      count(distinct ats.attempt_id)::integer as attempts,
      sum(ats.correct_count + ats.wrong_count)::integer as questions_answered,
      sum(ats.correct_count)::numeric as correct_answers,
      sum(ats.correct_count + ats.wrong_count + ats.unanswered_count)::numeric as total_questions,
      sum(coalesce(ats.raw_score, 0))::numeric as raw_score
    from public.attempt_scores ats
    join public.exam_attempts ea on ea.id = ats.attempt_id
    join public.exams e on e.id = ea.exam_id
    where ea.user_id = p_user_id
      and e.track_id = v_track_id
      and lower(ea.status) = 'completed'
      and ats.subject_id is not null
    group by ats.subject_id
  )
  insert into public.user_subject_progress (
    user_id,
    subject_id,
    attempts,
    questions_answered,
    accuracy,
    mastery_score,
    updated_at
  )
  select
    p_user_id,
    sa.subject_id,
    sa.attempts,
    sa.questions_answered,
    case
      when sa.questions_answered > 0 then round(sa.correct_answers / sa.questions_answered * 100, 2)
      else 0
    end,
    case
      when sa.total_questions > 0 then round(sa.raw_score / sa.total_questions * 100, 2)
      else 0
    end,
    now()
  from subject_agg sa;

  get diagnostics v_subject_rows = row_count;

  return jsonb_build_object(
    'applied', true,
    'track', 'TKA/SMP',
    'knowledge_rows', v_knowledge_rows,
    'subject_rows', v_subject_rows,
    'source_attempt_id', p_source_attempt_id
  );
end;
$function$;

revoke all on function app_private.refresh_tka_smp_learning_projection_for_user(uuid, uuid) from public;
revoke all on function app_private.refresh_tka_smp_learning_projection_for_user(uuid, uuid) from anon;
revoke all on function app_private.refresh_tka_smp_learning_projection_for_user(uuid, uuid) from authenticated;

create or replace function app_private.submit_exam_attempt_for_user(p_user_id uuid, p_attempt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_started timestamptz;
  v_score jsonb;
  v_duration integer;
  v_projection jsonb;
begin
  select started_at into v_started
  from public.exam_attempts
  where id = p_attempt_id and user_id = p_user_id and status = 'in_progress'
  for update;
  if v_started is null then raise exception 'In-progress attempt not found'; end if;

  if exists(
    select 1 from public.attempt_section_states
    where attempt_id = p_attempt_id and status <> 'completed'
  ) then
    raise exception 'ALL_SECTIONS_MUST_BE_COMPLETED';
  end if;

  v_score := app_private.score_exam_attempt(p_attempt_id);
  select coalesce(sum(duration_used_seconds), 0) into v_duration
  from public.attempt_section_states where attempt_id = p_attempt_id and status = 'completed';

  update public.exam_attempts
     set status = 'completed', submitted_at = now(), duration_used_seconds = v_duration,
         total_score = (v_score->>'raw_score')::numeric,
         percentage = (v_score->>'percentage')::numeric,
         passed = null, last_saved_at = now(), updated_at = now()
   where id = p_attempt_id;

  insert into public.attempt_events(attempt_id, event_type, metadata)
  values(p_attempt_id, 'attempt_submitted', v_score);

  v_projection := app_private.refresh_tka_smp_learning_projection_for_user(p_user_id, p_attempt_id);

  insert into public.attempt_events(attempt_id, event_type, metadata)
  values(p_attempt_id, 'learning_projection_refreshed', v_projection);

  return jsonb_build_object(
    'attempt_id', p_attempt_id,
    'status', 'completed',
    'raw_score', (v_score->>'raw_score')::numeric,
    'percentage', (v_score->>'percentage')::numeric,
    'duration_used_seconds', v_duration,
    'learning_projection', v_projection
  );
end;
$function$;

-- Backfill existing TKA SMP learners deterministically from completed attempts.
do $backfill$
declare
  r record;
begin
  for r in
    select distinct ea.user_id
    from public.exam_attempts ea
    join public.exams e on e.id = ea.exam_id
    join public.tracks t on t.id = e.track_id
    join public.programs p on p.id = t.program_id
    where upper(p.code) = 'TKA'
      and upper(t.code) = 'SMP'
      and lower(ea.status) = 'completed'
  loop
    perform app_private.refresh_tka_smp_learning_projection_for_user(r.user_id, null);
  end loop;
end;
$backfill$;
