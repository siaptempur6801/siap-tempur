-- Generated from canonical staging lpgrivowdcepcxradavu via pg_get_functiondef().
-- Public runtime learning/readiness/wrong-question/ranking functions.
-- DO NOT apply to production before explicit final GO.

CREATE OR REPLACE FUNCTION public.get_tka_smp_learning_focus()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    return jsonb_build_object('items', '[]'::jsonb, 'count', 0, 'refresh', jsonb_build_object('applied', false, 'reason', 'TKA_SMP_TRACK_NOT_FOUND'));
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
$function$

CREATE OR REPLACE FUNCTION public.get_tka_smp_readiness()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$

CREATE OR REPLACE FUNCTION public.get_tka_smp_wrong_questions(p_limit integer DEFAULT 100)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := auth.uid();
  v_limit integer := greatest(1, least(coalesce(p_limit, 100), 200));
  v_items jsonb;
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;

  select coalesce(jsonb_agg(item order by last_failed_at desc), '[]'::jsonb)
    into v_items
  from (
    select
      uwq.last_failed_at,
      jsonb_build_object(
        'id', uwq.id,
        'question_id', uwq.question_id,
        'subject_id', uwq.subject_id,
        'failure_count', uwq.failure_count,
        'wrong_count', uwq.wrong_count,
        'unanswered_count', uwq.unanswered_count,
        'latest_outcome', uwq.latest_outcome,
        'status', uwq.status,
        'last_failed_at', uwq.last_failed_at,
        'question_snapshot', jsonb_build_object(
          'question', uwq.question_snapshot->'question',
          'stimulus', uwq.question_snapshot->'stimulus',
          'options', coalesce((
            select jsonb_agg((option_row - 'is_correct' - 'score') order by coalesce((option_row->>'sort_order')::integer, 0), option_row->>'id')
            from jsonb_array_elements(coalesce(uwq.question_snapshot->'options', '[]'::jsonb)) option_row
          ), '[]'::jsonb),
          'explanations', '[]'::jsonb
        )
      ) as item
    from public.user_wrong_questions uwq
    join public.tracks t on t.id = uwq.track_id
    join public.programs p on p.id = t.program_id
    where uwq.user_id = v_user
      and uwq.status = 'open'
      and upper(p.code) = 'TKA'
      and upper(t.code) = 'SMP'
    order by uwq.last_failed_at desc
    limit v_limit
  ) rows_to_return;

  return jsonb_build_object('items', v_items, 'count', jsonb_array_length(v_items));
end;
$function$

CREATE OR REPLACE FUNCTION public.recalculate_event_rankings(p_event_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
    v_count integer;
begin
    delete from public.event_rankings
    where event_id = p_event_id;

    with best_attempts as (
        select distinct on (a.user_id)
            a.user_id,
            a.id as attempt_id,
            coalesce(a.total_score, 0)::numeric as score,
            coalesce(a.duration_used_seconds, 2147483647) as duration_seconds,
            a.submitted_at,
            a.passed
        from public.exam_attempts a
        where lower(a.status) = 'completed'
          and a.metadata ->> 'eventId' = p_event_id::text
        order by
            a.user_id,
            coalesce(a.total_score, 0) desc,
            coalesce(a.duration_used_seconds, 2147483647) asc,
            a.submitted_at asc nulls last,
            a.id asc
    ), ranked as (
        select
            p_event_id as event_id,
            b.user_id,
            b.attempt_id,
            b.score,
            b.duration_seconds,
            row_number() over (
                order by
                    b.score desc,
                    b.duration_seconds asc,
                    b.submitted_at asc nulls last,
                    b.attempt_id asc
            )::integer as rank,
            case when b.passed is true then 'passed' else 'not_passed' end as rank_group
        from best_attempts b
    )
    insert into public.event_rankings (
        event_id,
        user_id,
        attempt_id,
        score,
        duration_seconds,
        rank,
        rank_group,
        calculated_at
    )
    select
        r.event_id,
        r.user_id,
        r.attempt_id,
        r.score,
        r.duration_seconds,
        r.rank,
        r.rank_group,
        now()
    from ranked r;

    update public.exam_attempts a
       set rank = er.rank,
           updated_at = now()
      from public.event_rankings er
     where er.event_id = p_event_id
       and er.attempt_id = a.id;

    select count(*)::integer
      into v_count
      from public.event_rankings
     where event_id = p_event_id;

    return v_count;
end;
$function$

CREATE OR REPLACE FUNCTION public.recalculate_leaderboard(p_leaderboard_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_board public.leaderboards%rowtype;
begin
  select * into v_board
  from public.leaderboards
  where id = p_leaderboard_id;

  if not found then
    raise exception 'LEADERBOARD_NOT_FOUND';
  end if;

  delete from public.leaderboard_entries
  where leaderboard_id = p_leaderboard_id;

  with candidate_attempts as (
    select
      ea.id as attempt_id,
      ea.user_id,
      coalesce(ea.total_score, 0)::numeric as total_score,
      coalesce(ea.duration_used_seconds, 2147483647) as duration_seconds,
      ea.submitted_at,
      row_number() over (
        partition by ea.user_id
        order by
          coalesce(ea.total_score, 0) desc,
          coalesce(ea.duration_used_seconds, 2147483647) asc,
          ea.submitted_at asc nulls last,
          ea.id asc
      ) as user_best_rank
    from public.exam_attempts ea
    join public.exams e on e.id = ea.exam_id
    join public.exam_types et on et.id = e.exam_type_id
    where lower(ea.status) = 'completed'
      and et.code = 'FULL_TRYOUT'
      and (v_board.program_id is null or e.program_id = v_board.program_id)
      and (v_board.track_id is null or e.track_id = v_board.track_id)
      and ea.submitted_at is not null
      and ea.submitted_at >= v_board.starts_at
      and ea.submitted_at <= v_board.ends_at
  ),
  best_attempts as (
    select * from candidate_attempts where user_best_rank = 1
  ),
  subject_scores as (
    select
      ats.attempt_id,
      max(ats.raw_score) filter (where s.code = 'TWK') as score_twk,
      max(ats.raw_score) filter (where s.code = 'TIU') as score_tiu,
      max(ats.raw_score) filter (where s.code = 'TKP') as score_tkp
    from public.attempt_scores ats
    left join public.subjects s on s.id = ats.subject_id
    join best_attempts ba on ba.attempt_id = ats.attempt_id
    group by ats.attempt_id
  ),
  ranked as (
    select
      ba.*,
      coalesce(ss.score_twk, 0)::numeric as score_twk,
      coalesce(ss.score_tiu, 0)::numeric as score_tiu,
      coalesce(ss.score_tkp, 0)::numeric as score_tkp,
      row_number() over (
        order by
          ba.total_score desc,
          ba.duration_seconds asc,
          ba.submitted_at asc nulls last,
          ba.user_id asc
      )::integer as rank_pos
    from best_attempts ba
    left join subject_scores ss on ss.attempt_id = ba.attempt_id
  )
  insert into public.leaderboard_entries (
    leaderboard_id,
    user_id,
    score,
    rank,
    metadata,
    updated_at
  )
  select
    p_leaderboard_id,
    ranked.user_id,
    ranked.total_score,
    ranked.rank_pos,
    jsonb_build_object(
      'attemptId', ranked.attempt_id,
      'durationSeconds', ranked.duration_seconds,
      'submittedAt', ranked.submitted_at,
      'scoreTWK', ranked.score_twk,
      'scoreTIU', ranked.score_tiu,
      'scoreTKP', ranked.score_tkp
    ),
    now()
  from ranked;
end;
$function$
