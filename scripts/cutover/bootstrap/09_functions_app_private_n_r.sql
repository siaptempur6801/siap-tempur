-- Generated from canonical staging lpgrivowdcepcxradavu via pg_get_functiondef().
-- Runtime app_private functions N-R. CPNS migration-only helpers are excluded.
-- DO NOT apply to production before explicit final GO.

CREATE OR REPLACE FUNCTION app_private.publish_question(p_question_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_actor uuid := auth.uid();
  v_q public.questions%rowtype;
begin
  if v_actor is null then raise exception 'Authentication required'; end if;
  if not app_private.current_user_has_permission('content.publish') then
    raise exception 'Content publish permission required';
  end if;

  select * into v_q from public.questions where id=p_question_id for update;
  if not found then raise exception 'Question not found'; end if;
  if v_q.status <> 'approved' then raise exception 'Only approved questions can be published'; end if;
  if exists(select 1 from public.content_reviews where entity_type='question' and entity_id=p_question_id and status='pending') then
    raise exception 'Pending review still exists';
  end if;

  perform set_config('app.workflow_action', 'publish', true);
  update public.questions
     set status='published', reviewer_id=null, published_at=now(), updated_at=now()
   where id=p_question_id;

  return jsonb_build_object('question_id',p_question_id,'status','published','question_version',v_q.version);
end;
$function$

CREATE OR REPLACE FUNCTION app_private.question_snapshot_json(p_question_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select jsonb_build_object(
    'question', jsonb_build_object(
      'question_code', q.question_code,
      'program_id', q.program_id,
      'track_id', q.track_id,
      'subject_id', q.subject_id,
      'question_type', q.question_type,
      'stem', q.stem,
      'difficulty', q.difficulty,
      'cognitive_level', q.cognitive_level,
      'source_type', q.source_type,
      'source_reference', q.source_reference,
      'estimated_seconds', q.estimated_seconds,
      'stimulus_id', q.stimulus_id,
      'stimulus_order', q.stimulus_order,
      'response_config', q.response_config
    ),
    'options', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'option_key', o.option_key,
          'content', o.content,
          'is_correct', o.is_correct,
          'score', o.score,
          'sort_order', o.sort_order,
          'image_url', o.image_url,
          'response_group', o.response_group,
          'response_group_order', o.response_group_order,
          'metadata', o.metadata
        ) order by o.sort_order, o.option_key
      )
      from public.question_options o
      where o.question_id = q.id
    ), '[]'::jsonb),
    'explanations', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'content', e.content,
          'format', e.format,
          'video_url', e.video_url,
          'version', e.version
        ) order by e.version, e.created_at
      )
      from public.question_explanations e
      where e.question_id = q.id
    ), '[]'::jsonb),
    'knowledge_nodes', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'knowledge_node_id', qkn.knowledge_node_id,
          'relation_type', qkn.relation_type
        ) order by qkn.relation_type, qkn.knowledge_node_id
      )
      from public.question_knowledge_nodes qkn
      where qkn.question_id = q.id
    ), '[]'::jsonb),
    'stimulus', case when q.stimulus_id is null then null else (
      select jsonb_build_object(
        'stimulus_code', s.stimulus_code,
        'title', s.title,
        'content', s.content,
        'image_url', s.image_url,
        'source_reference', s.source_reference,
        'metadata', s.metadata
      )
      from public.question_stimuli s
      where s.id = q.stimulus_id
    ) end
  )
  from public.questions q
  where q.id = p_question_id;
$function$

CREATE OR REPLACE FUNCTION app_private.refresh_tka_smp_learning_projection_for_user(p_user_id uuid, p_source_attempt_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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

  delete from public.user_knowledge_progress ukp
  where ukp.user_id = p_user_id
    and ukp.user_track_id = v_user_track_id;

  with exam_evidence as (
    select qkn.knowledge_node_id, aa.is_correct,
      coalesce(aa.score_awarded, 0)::numeric as score_awarded,
      coalesce(aa.time_spent_seconds, 0)::numeric as time_spent_seconds,
      coalesce(ea.submitted_at, ea.updated_at, ea.created_at) as occurred_at
    from public.exam_attempts ea
    join public.exams e on e.id = ea.exam_id
    join public.attempt_questions aq on aq.attempt_id = ea.id
    join public.question_knowledge_nodes qkn on qkn.question_id = aq.question_id and qkn.relation_type = 'primary'
    left join public.attempt_answers aa on aa.attempt_question_id = aq.id
    where ea.user_id = p_user_id and e.track_id = v_track_id and lower(ea.status) = 'completed'
  ), correction_evidence as (
    select uwq.knowledge_node_id, true as is_correct, wqr.score_awarded::numeric as score_awarded,
      null::numeric as time_spent_seconds, wqr.created_at as occurred_at
    from public.wrong_question_reviews wqr
    join public.user_wrong_questions uwq on uwq.id = wqr.user_wrong_question_id
    where wqr.user_id = p_user_id and uwq.track_id = v_track_id
      and uwq.knowledge_node_id is not null and wqr.is_correct is true
  ), all_evidence as (
    select * from exam_evidence union all select * from correction_evidence
  ), knowledge_agg as (
    select knowledge_node_id,
      count(*)::integer as attempted_questions,
      count(*) filter (where is_correct is true)::integer as correct_questions,
      count(*) filter (where is_correct is true)::numeric / nullif(count(*), 0) as accuracy,
      avg(score_awarded)::numeric as average_score,
      (avg(time_spent_seconds) filter (where time_spent_seconds is not null))::numeric as average_time_seconds,
      max(occurred_at) as last_practiced_at
    from all_evidence group by knowledge_node_id
  ), scored as (
    select knowledge_node_id, attempted_questions, correct_questions,
      round(coalesce(accuracy, 0), 6) as accuracy,
      round(coalesce(average_score, 0), 6) as average_score,
      round(coalesce(average_time_seconds, 0), 2) as average_time_seconds,
      round(((0.70 * coalesce(average_score, 0)) + (0.30 * coalesce(accuracy, 0))) * least(1::numeric, attempted_questions::numeric / 5::numeric), 6) as mastery_score,
      last_practiced_at
    from knowledge_agg
  )
  insert into public.user_knowledge_progress (user_id,user_track_id,knowledge_node_id,attempted_questions,correct_questions,accuracy,average_score,average_time_seconds,mastery_score,mastery_level,last_practiced_at,updated_at)
  select p_user_id,v_user_track_id,s.knowledge_node_id,s.attempted_questions,s.correct_questions,s.accuracy,s.average_score,s.average_time_seconds,s.mastery_score,
    case when s.mastery_score >= 0.85 then 'mastered' when s.mastery_score >= 0.70 then 'proficient' when s.mastery_score >= 0.40 then 'developing' else 'needs_work' end,
    s.last_practiced_at,now()
  from scored s;
  get diagnostics v_knowledge_rows = row_count;

  delete from public.user_subject_progress usp
  where usp.user_id = p_user_id and usp.subject_id in (select s.id from public.subjects s where s.track_id = v_track_id);

  with subject_agg as (
    select ats.subject_id,count(distinct ats.attempt_id)::integer as attempts,
      sum(ats.correct_count + ats.wrong_count)::integer as questions_answered,
      sum(ats.correct_count)::numeric as correct_answers,
      sum(ats.correct_count + ats.wrong_count + ats.unanswered_count)::numeric as total_questions,
      sum(coalesce(ats.raw_score, 0))::numeric as raw_score
    from public.attempt_scores ats
    join public.exam_attempts ea on ea.id = ats.attempt_id
    join public.exams e on e.id = ea.exam_id
    where ea.user_id = p_user_id and e.track_id = v_track_id and lower(ea.status) = 'completed' and ats.subject_id is not null
    group by ats.subject_id
  )
  insert into public.user_subject_progress (user_id,subject_id,attempts,questions_answered,accuracy,mastery_score,updated_at)
  select p_user_id,sa.subject_id,sa.attempts,sa.questions_answered,
    case when sa.questions_answered > 0 then round(sa.correct_answers / sa.questions_answered * 100, 2) else 0 end,
    case when sa.total_questions > 0 then round(sa.raw_score / sa.total_questions * 100, 2) else 0 end,now()
  from subject_agg sa;
  get diagnostics v_subject_rows = row_count;

  return jsonb_build_object('applied', true,'track', 'TKA/SMP','knowledge_rows', v_knowledge_rows,'subject_rows', v_subject_rows,'source_attempt_id', p_source_attempt_id);
end;
$function$

CREATE OR REPLACE FUNCTION app_private.refresh_tka_smp_learning_recommendations_for_user(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_track_id uuid;
  v_user_track_id uuid;
  v_active_count integer := 0;
begin
  select t.id into v_track_id from public.programs p join public.tracks t on t.program_id=p.id
  where upper(p.code)='TKA' and upper(t.code)='SMP' limit 1;
  if v_track_id is null then return jsonb_build_object('applied',false,'reason','TKA_SMP_TRACK_NOT_FOUND'); end if;
  select ut.id into v_user_track_id from public.user_tracks ut where ut.user_id=p_user_id and ut.track_id=v_track_id and lower(ut.status)='active'
  order by ut.updated_at desc nulls last,ut.started_at desc nulls last limit 1;
  if v_user_track_id is null then
    update public.learning_recommendations lr set status='inactive',expires_at=coalesce(lr.expires_at,now())
    where lr.user_id=p_user_id and lr.track_id=v_track_id and lr.recommendation_type='weakest_topic_v1' and lr.status='active';
    return jsonb_build_object('applied',false,'reason','ACTIVE_USER_TRACK_NOT_FOUND');
  end if;
  update public.learning_recommendations lr set status='inactive',expires_at=coalesce(lr.expires_at,now())
  where lr.user_id=p_user_id and lr.track_id=v_track_id and lr.recommendation_type='weakest_topic_v1' and lr.status='active';
  with ranked as (
    select ukp.knowledge_node_id,row_number() over(order by ukp.mastery_score asc,ukp.attempted_questions desc,ukp.accuracy asc,ukp.knowledge_node_id)::integer priority,
      round(greatest(0::numeric,1::numeric-ukp.mastery_score),6) weakness_score
    from public.user_knowledge_progress ukp
    join public.knowledge_nodes kn on kn.id=ukp.knowledge_node_id join public.subjects s on s.id=kn.subject_id
    where ukp.user_id=p_user_id and ukp.user_track_id=v_user_track_id and s.track_id=v_track_id and ukp.attempted_questions>0 and ukp.mastery_score<0.85
      and lower(kn.status)='active' and lower(s.status)='active'
    order by ukp.mastery_score asc,ukp.attempted_questions desc,ukp.accuracy asc,ukp.knowledge_node_id limit 3
  )
  insert into public.learning_recommendations(user_id,track_id,recommendation_type,knowledge_node_id,resource_id,reason_code,priority,score,status,expires_at)
  select p_user_id,v_track_id,'weakest_topic_v1',r.knowledge_node_id,null,'weakest_mastery_v1',r.priority,r.weakness_score,'active',null from ranked r
  on conflict(user_id,track_id,recommendation_type,knowledge_node_id) do update set reason_code=excluded.reason_code,priority=excluded.priority,score=excluded.score,status='active',expires_at=null;
  select count(*)::integer into v_active_count from public.learning_recommendations lr
  where lr.user_id=p_user_id and lr.track_id=v_track_id and lr.recommendation_type='weakest_topic_v1' and lr.status='active';
  return jsonb_build_object('applied',true,'track','TKA/SMP','active_recommendations',v_active_count,'max_recommendations',3,'rule','mastery_asc_evidence_desc_accuracy_asc_v1');
end;
$function$

CREATE OR REPLACE FUNCTION app_private.refresh_tka_smp_readiness_for_user(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_track_id uuid; v_user_track_id uuid; v_readiness numeric:=0; v_confidence numeric:=0; v_subject_count integer:=0; v_row public.user_readiness%rowtype;
begin
  select t.id into v_track_id from public.programs p join public.tracks t on t.program_id=p.id where upper(p.code)='TKA' and upper(t.code)='SMP' limit 1;
  if v_track_id is null then return jsonb_build_object('applied',false,'reason','TKA_SMP_TRACK_NOT_FOUND'); end if;
  select ut.id into v_user_track_id from public.user_tracks ut where ut.user_id=p_user_id and ut.track_id=v_track_id and lower(ut.status)='active'
  order by ut.updated_at desc nulls last,ut.started_at desc nulls last limit 1;
  if v_user_track_id is null then
    delete from public.user_readiness ur where ur.user_id=p_user_id and ur.track_id=v_track_id and ur.calculation_version='tka_smp_readiness_v1';
    return jsonb_build_object('applied',false,'reason','ACTIVE_USER_TRACK_NOT_FOUND');
  end if;
  with assessable as (
    select distinct kn.id knowledge_node_id,s.id subject_id from public.knowledge_nodes kn join public.subjects s on s.id=kn.subject_id
    join public.question_knowledge_nodes qkn on qkn.knowledge_node_id=kn.id and lower(qkn.relation_type)='primary'
    join public.questions q on q.id=qkn.question_id
    where s.track_id=v_track_id and lower(s.status)='active' and lower(kn.status)='active' and lower(q.status) in('approved','published')
  ), subject_metrics as (
    select a.subject_id,avg(coalesce(ukp.mastery_score,0::numeric)) subject_readiness,
      avg(least(1::numeric,coalesce(ukp.attempted_questions,0)::numeric/5::numeric)) subject_confidence
    from assessable a left join public.user_knowledge_progress ukp on ukp.user_id=p_user_id and ukp.user_track_id=v_user_track_id and ukp.knowledge_node_id=a.knowledge_node_id
    group by a.subject_id
  )
  select count(*)::integer,coalesce(round(0.75::numeric*avg(sm.subject_readiness)+0.25::numeric*min(sm.subject_readiness),6),0::numeric),coalesce(round(avg(sm.subject_confidence),6),0::numeric)
  into v_subject_count,v_readiness,v_confidence from subject_metrics sm;
  if v_subject_count=0 then
    delete from public.user_readiness ur where ur.user_id=p_user_id and ur.track_id=v_track_id and ur.calculation_version='tka_smp_readiness_v1';
    return jsonb_build_object('applied',false,'reason','NO_ASSESSABLE_SUBJECTS');
  end if;
  insert into public.user_readiness(user_id,track_id,readiness_score,confidence_score,calculation_version,calculated_at)
  values(p_user_id,v_track_id,greatest(0::numeric,least(1::numeric,v_readiness)),greatest(0::numeric,least(1::numeric,v_confidence)),'tka_smp_readiness_v1',now())
  on conflict(user_id,track_id,calculation_version) do update set readiness_score=excluded.readiness_score,confidence_score=excluded.confidence_score,calculated_at=excluded.calculated_at
  where public.user_readiness.readiness_score is distinct from excluded.readiness_score or public.user_readiness.confidence_score is distinct from excluded.confidence_score;
  select ur.* into v_row from public.user_readiness ur where ur.user_id=p_user_id and ur.track_id=v_track_id and ur.calculation_version='tka_smp_readiness_v1' limit 1;
  return jsonb_build_object('applied',true,'track','TKA/SMP','readiness_score',v_row.readiness_score,'confidence_score',v_row.confidence_score,'calculation_version',v_row.calculation_version,'calculated_at',v_row.calculated_at,'formula','0.75_mean_subject_readiness_plus_0.25_weakest_subject_v1');
end;
$function$

CREATE OR REPLACE FUNCTION app_private.refresh_tka_smp_readiness_from_new_progress()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare v_user_id uuid;
begin
  for v_user_id in select distinct nr.user_id from new_rows nr where nr.user_id is not null loop perform app_private.refresh_tka_smp_readiness_for_user(v_user_id); end loop;
  return null;
end;
$function$

CREATE OR REPLACE FUNCTION app_private.refresh_tka_smp_readiness_from_old_progress()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare v_user_id uuid;
begin
  for v_user_id in select distinct orow.user_id from old_rows orow where orow.user_id is not null loop perform app_private.refresh_tka_smp_readiness_for_user(v_user_id); end loop;
  return null;
end;
$function$

CREATE OR REPLACE FUNCTION app_private.refresh_tka_smp_recommendations_from_new_progress()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare v_user_id uuid;
begin
  for v_user_id in select distinct nr.user_id from new_rows nr where nr.user_id is not null loop perform app_private.refresh_tka_smp_learning_recommendations_for_user(v_user_id); end loop;
  return null;
end;
$function$

CREATE OR REPLACE FUNCTION app_private.refresh_tka_smp_recommendations_from_old_progress()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare v_user_id uuid;
begin
  for v_user_id in select distinct orow.user_id from old_rows orow where orow.user_id is not null loop perform app_private.refresh_tka_smp_learning_recommendations_for_user(v_user_id); end loop;
  return null;
end;
$function$

CREATE OR REPLACE FUNCTION app_private.refresh_tka_smp_remedial_session_for_attempt(p_user_id uuid, p_source_attempt_id uuid, p_limit integer DEFAULT 10)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare v_track_id uuid; v_session_id uuid; v_existing_status text; v_limit integer:=greatest(1,least(coalesce(p_limit,10),20)); v_total integer:=0; v_completed integer:=0; v_pending integer:=0;
begin
  select e.track_id into v_track_id from public.exam_attempts ea join public.exams e on e.id=ea.exam_id join public.tracks t on t.id=e.track_id join public.programs p on p.id=t.program_id
  where ea.id=p_source_attempt_id and ea.user_id=p_user_id and lower(ea.status)='completed' and upper(p.code)='TKA' and upper(t.code)='SMP' limit 1;
  if v_track_id is null then return jsonb_build_object('applied',false,'reason','COMPLETED_TKA_SMP_SOURCE_ATTEMPT_NOT_FOUND','source_attempt_id',p_source_attempt_id); end if;
  perform app_private.refresh_tka_smp_wrong_question_state_for_user(p_user_id,p_source_attempt_id);
  perform app_private.sync_tka_smp_remedial_sessions_for_user(p_user_id);
  select rs.id,rs.status into v_session_id,v_existing_status from public.remedial_sessions rs where rs.source_attempt_id=p_source_attempt_id and rs.user_id=p_user_id limit 1;
  if v_session_id is not null then
    select count(*)::integer,count(*) filter(where rsi.status='completed')::integer,count(*) filter(where rsi.status='pending')::integer into v_total,v_completed,v_pending from public.remedial_session_items rsi where rsi.session_id=v_session_id;
    return jsonb_build_object('applied',true,'created',false,'session_id',v_session_id,'status',v_existing_status,'total_items',v_total,'completed_items',v_completed,'pending_items',v_pending,'source_attempt_id',p_source_attempt_id);
  end if;
  if not exists(select 1 from public.attempt_questions aq left join public.attempt_answers aa on aa.attempt_question_id=aq.id
    join public.user_wrong_questions uwq on uwq.user_id=p_user_id and uwq.track_id=v_track_id and uwq.question_id=aq.question_id and uwq.status='open'
    where aq.attempt_id=p_source_attempt_id and (aa.id is null or aa.is_correct is not true)) then
    return jsonb_build_object('applied',false,'reason','NO_OPEN_GAPS','source_attempt_id',p_source_attempt_id);
  end if;
  insert into public.remedial_sessions(user_id,track_id,source_attempt_id,status,created_at,updated_at)
  values(p_user_id,v_track_id,p_source_attempt_id,'active',now(),now()) on conflict(source_attempt_id) where source_attempt_id is not null do nothing returning id into v_session_id;
  if v_session_id is null then select rs.id into v_session_id from public.remedial_sessions rs where rs.source_attempt_id=p_source_attempt_id and rs.user_id=p_user_id limit 1; end if;
  if v_session_id is null then raise exception 'REMEDIAL_SESSION_CREATE_FAILED'; end if;
  if not exists(select 1 from public.remedial_session_items rsi where rsi.session_id=v_session_id) then
    with source_gaps as (
      select aq.question_id,uwq.id user_wrong_question_id,uwq.knowledge_node_id,q.subject_id,coalesce(s.code,s.id::text) subject_order,aq.position attempt_position,
        case when aa.id is null then 'source_attempt_unanswered' else 'source_attempt_wrong' end reason
      from public.attempt_questions aq join public.questions q on q.id=aq.question_id left join public.subjects s on s.id=q.subject_id
      left join public.attempt_answers aa on aa.attempt_question_id=aq.id
      join public.user_wrong_questions uwq on uwq.user_id=p_user_id and uwq.track_id=v_track_id and uwq.question_id=aq.question_id and uwq.status='open'
      where aq.attempt_id=p_source_attempt_id and (aa.id is null or aa.is_correct is not true)
    ), ranked as (select sg.*,row_number() over(partition by sg.subject_id order by sg.attempt_position,sg.question_id) subject_rank from source_gaps sg),
    chosen as (select * from ranked order by subject_rank,subject_order,attempt_position,question_id limit v_limit),
    positioned as (select c.*,row_number() over(order by c.subject_rank,c.subject_order,c.attempt_position,c.question_id)::integer remedial_position from chosen c)
    insert into public.remedial_session_items(session_id,question_id,knowledge_node_id,reason,user_wrong_question_id,position,status,review_count,best_score,updated_at)
    select v_session_id,p.question_id,p.knowledge_node_id,p.reason,p.user_wrong_question_id,p.remedial_position,'pending',0,0,now() from positioned p order by p.remedial_position
    on conflict(session_id,question_id) do nothing;
  end if;
  select count(*)::integer,count(*) filter(where rsi.status='completed')::integer,count(*) filter(where rsi.status='pending')::integer into v_total,v_completed,v_pending
  from public.remedial_session_items rsi where rsi.session_id=v_session_id;
  return jsonb_build_object('applied',true,'created',true,'session_id',v_session_id,'status',case when v_pending=0 then 'completed' else 'active' end,'total_items',v_total,'completed_items',v_completed,'pending_items',v_pending,'source_attempt_id',p_source_attempt_id);
end;
$function$

CREATE OR REPLACE FUNCTION app_private.refresh_tka_smp_wrong_question_state_for_user(p_user_id uuid, p_source_attempt_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare v_track_id uuid; v_source_track_id uuid; v_user_track_id uuid; v_total integer:=0; v_open integer:=0; v_resolved integer:=0;
begin
  select t.id into v_track_id from public.programs p join public.tracks t on t.program_id=p.id where upper(p.code)='TKA' and upper(t.code)='SMP' limit 1;
  if v_track_id is null then return jsonb_build_object('applied',false,'reason','TKA_SMP_TRACK_NOT_FOUND'); end if;
  if p_source_attempt_id is not null then
    select e.track_id into v_source_track_id from public.exam_attempts ea join public.exams e on e.id=ea.exam_id where ea.id=p_source_attempt_id and ea.user_id=p_user_id and lower(ea.status)='completed';
    if v_source_track_id is null then return jsonb_build_object('applied',false,'reason','COMPLETED_SOURCE_ATTEMPT_NOT_FOUND'); end if;
    if v_source_track_id<>v_track_id then return jsonb_build_object('applied',false,'reason','TRACK_NOT_SUPPORTED'); end if;
  end if;
  select ut.id into v_user_track_id from public.user_tracks ut where ut.user_id=p_user_id and ut.track_id=v_track_id and lower(ut.status)='active' order by ut.updated_at desc nulls last,ut.started_at desc nulls last limit 1;
  if v_user_track_id is null then return jsonb_build_object('applied',false,'reason','ACTIVE_USER_TRACK_NOT_FOUND'); end if;
  with exam_evidence as (
    select aq.question_id,q.subject_id,primary_node.knowledge_node_id,aq.id source_attempt_question_id,ea.id source_attempt_id,aq.question_snapshot,
      coalesce(ea.submitted_at,ea.updated_at,ea.created_at) occurred_at,
      case when aa.id is null then 'unanswered' when aa.is_correct is true then 'correct' else 'wrong' end outcome,
      coalesce(aa.score_awarded,0)::numeric score_awarded,1 evidence_priority
    from public.exam_attempts ea join public.exams e on e.id=ea.exam_id join public.attempt_questions aq on aq.attempt_id=ea.id join public.questions q on q.id=aq.question_id
    left join public.attempt_answers aa on aa.attempt_question_id=aq.id
    left join lateral(select qkn.knowledge_node_id from public.question_knowledge_nodes qkn where qkn.question_id=aq.question_id and qkn.relation_type='primary' order by qkn.knowledge_node_id limit 1) primary_node on true
    where ea.user_id=p_user_id and e.track_id=v_track_id and lower(ea.status)='completed'
  ), review_evidence as (
    select uwq.question_id,uwq.subject_id,uwq.knowledge_node_id,uwq.source_attempt_question_id,uwq.last_source_attempt_id source_attempt_id,uwq.question_snapshot,
      wqr.created_at occurred_at,case when wqr.is_correct then 'correct' else 'wrong' end outcome,wqr.score_awarded,2 evidence_priority
    from public.wrong_question_reviews wqr join public.user_wrong_questions uwq on uwq.id=wqr.user_wrong_question_id where wqr.user_id=p_user_id and uwq.track_id=v_track_id
  ), all_evidence as (select * from exam_evidence union all select * from review_evidence),
  failure_stats as (
    select question_id,min(occurred_at) filter(where outcome in('wrong','unanswered')) first_failed_at,max(occurred_at) filter(where outcome in('wrong','unanswered')) last_failed_at,
      count(*) filter(where outcome in('wrong','unanswered'))::integer failure_count,count(*) filter(where outcome='wrong')::integer wrong_count,count(*) filter(where outcome='unanswered')::integer unanswered_count
    from all_evidence group by question_id having count(*) filter(where outcome in('wrong','unanswered'))>0
  ), latest_evidence as (select distinct on(question_id) question_id,outcome,occurred_at from all_evidence order by question_id,occurred_at desc,evidence_priority desc),
  latest_exam_failure as (select distinct on(question_id) question_id,subject_id,knowledge_node_id,source_attempt_question_id,source_attempt_id,question_snapshot from exam_evidence where outcome in('wrong','unanswered') order by question_id,occurred_at desc),
  last_review as (select uwq.question_id,max(wqr.created_at) last_reviewed_at from public.wrong_question_reviews wqr join public.user_wrong_questions uwq on uwq.id=wqr.user_wrong_question_id where wqr.user_id=p_user_id and uwq.track_id=v_track_id group by uwq.question_id)
  insert into public.user_wrong_questions(user_id,user_track_id,track_id,subject_id,question_id,knowledge_node_id,source_attempt_question_id,last_source_attempt_id,question_snapshot,first_failed_at,last_failed_at,failure_count,wrong_count,unanswered_count,latest_outcome,status,resolved_at,last_reviewed_at,updated_at)
  select p_user_id,v_user_track_id,v_track_id,lef.subject_id,fs.question_id,lef.knowledge_node_id,lef.source_attempt_question_id,lef.source_attempt_id,lef.question_snapshot,fs.first_failed_at,fs.last_failed_at,fs.failure_count,fs.wrong_count,fs.unanswered_count,le.outcome,
    case when le.outcome='correct' then 'resolved' else 'open' end,case when le.outcome='correct' then le.occurred_at else null end,lr.last_reviewed_at,now()
  from failure_stats fs join latest_evidence le on le.question_id=fs.question_id join latest_exam_failure lef on lef.question_id=fs.question_id left join last_review lr on lr.question_id=fs.question_id
  on conflict(user_id,track_id,question_id) do update set user_track_id=excluded.user_track_id,subject_id=excluded.subject_id,knowledge_node_id=excluded.knowledge_node_id,
    source_attempt_question_id=excluded.source_attempt_question_id,last_source_attempt_id=excluded.last_source_attempt_id,question_snapshot=excluded.question_snapshot,
    first_failed_at=excluded.first_failed_at,last_failed_at=excluded.last_failed_at,failure_count=excluded.failure_count,wrong_count=excluded.wrong_count,unanswered_count=excluded.unanswered_count,
    latest_outcome=excluded.latest_outcome,status=excluded.status,resolved_at=excluded.resolved_at,last_reviewed_at=excluded.last_reviewed_at,updated_at=now();
  select count(*)::integer,count(*) filter(where status='open')::integer,count(*) filter(where status='resolved')::integer into v_total,v_open,v_resolved
  from public.user_wrong_questions where user_id=p_user_id and track_id=v_track_id;
  return jsonb_build_object('applied',true,'track','TKA/SMP','total',v_total,'open',v_open,'resolved',v_resolved,'source_attempt_id',p_source_attempt_id);
end;
$function$

CREATE OR REPLACE FUNCTION app_private.review_question_stage(p_question_id uuid, p_decision text, p_notes text DEFAULT NULL::text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare v_actor uuid:=auth.uid(); v_q public.questions%rowtype; v_stage text; v_next_stage text; v_next_status text; v_review public.content_reviews%rowtype; v_review_status text;
begin
  if v_actor is null then raise exception 'Authentication required'; end if;
  if p_decision not in('approve','revision_required','reject') then raise exception 'Invalid review decision'; end if;
  if not app_private.current_user_has_permission('content.review') then raise exception 'Content review permission required'; end if;
  select * into v_q from public.questions where id=p_question_id for update; if not found then raise exception 'Question not found'; end if;
  if v_actor=v_q.author_id then raise exception 'Author cannot review their own question'; end if;
  if v_q.reviewer_id is distinct from v_actor then raise exception 'Question is not assigned to current reviewer'; end if;
  v_stage:=case v_q.status when 'editorial_review' then 'editorial' when 'academic_review' then 'academic' when 'technical_qa' then 'technical_qa' else null end;
  if v_stage is null then raise exception 'Question is not in an active review stage'; end if;
  select * into v_review from public.content_reviews where entity_type='question' and entity_id=p_question_id and review_stage=v_stage and status='pending' and reviewer_id=v_actor order by review_round desc,created_at desc limit 1 for update;
  if not found then raise exception 'No pending assigned review found'; end if;
  v_review_status:=case p_decision when 'approve' then 'approved' when 'revision_required' then 'revision_required' else 'rejected' end;
  update public.content_reviews set status=v_review_status,notes=p_notes,started_at=coalesce(started_at,now()),completed_at=now(),updated_at=now() where id=v_review.id;
  if p_decision='approve' then if v_stage='editorial' then v_next_stage:='academic';v_next_status:='academic_review'; elsif v_stage='academic' then v_next_stage:='technical_qa';v_next_status:='technical_qa'; else v_next_stage:=null;v_next_status:='approved'; end if;
  elsif p_decision='revision_required' then v_next_stage:=null;v_next_status:='revision_required'; else v_next_stage:=null;v_next_status:='rejected'; end if;
  perform set_config('app.workflow_action','review_decision',true);
  update public.questions set status=v_next_status,reviewer_id=null,updated_at=now() where id=p_question_id;
  if v_next_stage is not null then insert into public.content_reviews(entity_type,entity_id,reviewer_id,status,review_stage,question_version,review_round,created_at,updated_at)
    values('question',p_question_id,null,'pending',v_next_stage,v_q.version,v_review.review_round,now(),now()); end if;
  return jsonb_build_object('question_id',p_question_id,'decision',p_decision,'completed_stage',v_stage,'next_stage',v_next_stage,'status',v_next_status,'question_version',v_q.version,'review_round',v_review.review_round);
end;
$function$

CREATE OR REPLACE FUNCTION app_private.review_tka_smp_remedial_item_for_user(p_user_id uuid,p_session_id uuid,p_item_id uuid,p_option_ids uuid[])
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare v_session public.remedial_sessions%rowtype; v_item public.remedial_session_items%rowtype; v_wrong public.user_wrong_questions%rowtype; v_evaluation jsonb; v_state jsonb; v_projection jsonb:=null; v_sync jsonb; v_explanation text:=''; v_total integer:=0; v_completed integer:=0; v_pending integer:=0;
begin
  select * into v_session from public.remedial_sessions where id=p_session_id and user_id=p_user_id for update; if v_session.id is null then raise exception 'REMEDIAL_SESSION_NOT_FOUND'; end if;
  select * into v_item from public.remedial_session_items where id=p_item_id and session_id=p_session_id for update; if v_item.id is null then raise exception 'REMEDIAL_ITEM_NOT_FOUND'; end if;
  if v_item.status='completed' then raise exception 'REMEDIAL_ITEM_ALREADY_COMPLETED'; end if;
  select * into v_wrong from public.user_wrong_questions where id=v_item.user_wrong_question_id and user_id=p_user_id for update; if v_wrong.id is null then raise exception 'REMEDIAL_WRONG_QUESTION_STATE_NOT_FOUND'; end if;
  if v_wrong.status<>'open' then perform app_private.sync_tka_smp_remedial_sessions_for_user(p_user_id); raise exception 'REMEDIAL_ITEM_ALREADY_RESOLVED'; end if;
  v_evaluation:=app_private.evaluate_wrong_question_selection(v_wrong.question_snapshot,p_option_ids);
  select coalesce(explanation_row->>'content','') into v_explanation from jsonb_array_elements(coalesce(v_wrong.question_snapshot->'explanations','[]'::jsonb)) explanation_row where coalesce(explanation_row->>'content','')<>'' limit 1;
  insert into public.wrong_question_reviews(user_id,user_wrong_question_id,question_id,selected_option_ids,is_correct,score_awarded,review_source,remedial_session_item_id)
  values(p_user_id,v_wrong.id,v_wrong.question_id,coalesce(p_option_ids,array[]::uuid[]),(v_evaluation->>'is_correct')::boolean,(v_evaluation->>'score_awarded')::numeric,'remedial',v_item.id);
  update public.remedial_session_items set review_count=review_count+1,best_score=greatest(best_score,(v_evaluation->>'score_awarded')::numeric),
    status=case when (v_evaluation->>'is_correct')::boolean then 'completed' else status end,
    completed_at=case when (v_evaluation->>'is_correct')::boolean then coalesce(completed_at,now()) else completed_at end,updated_at=now() where id=v_item.id;
  v_state:=app_private.refresh_tka_smp_wrong_question_state_for_user(p_user_id,null);
  if (v_evaluation->>'is_correct')::boolean then v_projection:=app_private.refresh_tka_smp_learning_projection_for_user(p_user_id,null); end if;
  v_sync:=app_private.sync_tka_smp_remedial_sessions_for_user(p_user_id);
  select count(*)::integer,count(*) filter(where status='completed')::integer,count(*) filter(where status='pending')::integer into v_total,v_completed,v_pending from public.remedial_session_items where session_id=p_session_id;
  return jsonb_build_object('session_id',p_session_id,'item_id',p_item_id,'is_correct',(v_evaluation->>'is_correct')::boolean,'score_awarded',(v_evaluation->>'score_awarded')::numeric,'explanation',v_explanation,'total_items',v_total,'completed_items',v_completed,'pending_items',v_pending,'session_status',case when v_pending=0 then 'completed' else 'active' end,'wrong_question_state',v_state,'learning_projection',v_projection,'remedial_sync',v_sync);
end;
$function$

CREATE OR REPLACE FUNCTION app_private.review_wrong_question_for_user(p_user_id uuid,p_wrong_question_id uuid,p_option_ids uuid[])
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare v_row public.user_wrong_questions%rowtype; v_evaluation jsonb; v_state jsonb; v_projection jsonb:=null; v_sync jsonb; v_remaining integer; v_explanation text:='';
begin
  select * into v_row from public.user_wrong_questions where id=p_wrong_question_id and user_id=p_user_id and status='open' for update;
  if v_row.id is null then raise exception 'OPEN_WRONG_QUESTION_NOT_FOUND'; end if;
  v_evaluation:=app_private.evaluate_wrong_question_selection(v_row.question_snapshot,p_option_ids);
  select coalesce(explanation_row->>'content','') into v_explanation from jsonb_array_elements(coalesce(v_row.question_snapshot->'explanations','[]'::jsonb)) explanation_row where coalesce(explanation_row->>'content','')<>'' limit 1;
  insert into public.wrong_question_reviews(user_id,user_wrong_question_id,question_id,selected_option_ids,is_correct,score_awarded,review_source)
  values(p_user_id,v_row.id,v_row.question_id,coalesce(p_option_ids,array[]::uuid[]),(v_evaluation->>'is_correct')::boolean,(v_evaluation->>'score_awarded')::numeric,'repeat_wrong');
  v_state:=app_private.refresh_tka_smp_wrong_question_state_for_user(p_user_id,null);
  if (v_evaluation->>'is_correct')::boolean then v_projection:=app_private.refresh_tka_smp_learning_projection_for_user(p_user_id,null); end if;
  v_sync:=app_private.sync_tka_smp_remedial_sessions_for_user(p_user_id);
  select count(*)::integer into v_remaining from public.user_wrong_questions where user_id=p_user_id and track_id=v_row.track_id and status='open';
  return jsonb_build_object('wrong_question_id',v_row.id,'is_correct',(v_evaluation->>'is_correct')::boolean,'score_awarded',(v_evaluation->>'score_awarded')::numeric,'remaining_open',v_remaining,'explanation',v_explanation,'state',v_state,'learning_projection',v_projection,'remedial_sync',v_sync);
end;
$function$
