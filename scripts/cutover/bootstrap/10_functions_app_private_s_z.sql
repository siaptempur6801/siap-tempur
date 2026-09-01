-- Generated from canonical staging lpgrivowdcepcxradavu via pg_get_functiondef().
-- Runtime app_private functions S-Z. CPNS migration-only helpers are excluded.
-- DO NOT apply to production before explicit final GO.

CREATE OR REPLACE FUNCTION app_private.save_exam_answer_for_user(p_user_id uuid, p_attempt_question_id uuid, p_option_ids uuid[] DEFAULT NULL::uuid[], p_answer_value text DEFAULT NULL::text, p_time_spent_seconds integer DEFAULT 0, p_is_flagged boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_attempt_id uuid;
  v_question_id uuid;
  v_section_id uuid;
  v_question_type text;
  v_snapshot jsonb;
  v_deadline timestamptz;
  v_answer_id uuid;
  v_selected uuid[] := coalesce(p_option_ids,array[]::uuid[]);
  v_selected_option uuid;
  v_position integer;
  v_valid_count integer;
  v_distinct_count integer;
  v_group_count integer;
begin
  select aq.attempt_id,aq.question_id,aq.section_id,
         aq.question_snapshot->'question'->>'question_type',aq.question_snapshot,aq.position,
         ass.deadline_at
    into v_attempt_id,v_question_id,v_section_id,v_question_type,v_snapshot,v_position,v_deadline
  from public.attempt_questions aq
  join public.exam_attempts ea on ea.id=aq.attempt_id
  join public.attempt_section_states ass on ass.attempt_id=aq.attempt_id and ass.section_id=aq.section_id
  where aq.id=p_attempt_question_id
    and ea.user_id=p_user_id
    and ea.status='in_progress'
    and ass.status='active'
  for update of ea,ass;

  if v_attempt_id is null then raise exception 'Question is not in the active section of an in-progress attempt'; end if;
  if v_deadline is not null and now() > v_deadline then raise exception 'SECTION_TIME_EXPIRED'; end if;
  if coalesce(p_time_spent_seconds,0) < 0 then raise exception 'Invalid time spent'; end if;

  if cardinality(v_selected)=0 and nullif(btrim(coalesce(p_answer_value,'')),'') is null then
    delete from public.attempt_answers where attempt_question_id=p_attempt_question_id;
    update public.exam_attempts set last_question_position=v_position,last_saved_at=now(),updated_at=now() where id=v_attempt_id;
    insert into public.attempt_events(attempt_id,event_type,question_id,metadata)
    values(v_attempt_id,'answer_cleared',v_question_id,'{}'::jsonb);
    return jsonb_build_object('attempt_question_id',p_attempt_question_id,'cleared',true);
  end if;

  select count(*),count(distinct x) into v_valid_count,v_distinct_count
  from unnest(v_selected) x;
  if v_valid_count <> v_distinct_count then raise exception 'Duplicate option IDs are not allowed'; end if;

  select count(*) into v_valid_count
  from jsonb_array_elements(v_snapshot->'options') o
  where (o->>'id')::uuid = any(v_selected);
  if v_valid_count <> cardinality(v_selected) then raise exception 'One or more options do not belong to the frozen question'; end if;

  if v_question_type='single_choice' then
    if cardinality(v_selected) <> 1 then raise exception 'single_choice requires exactly one option'; end if;
    v_selected_option := v_selected[1];
  elsif v_question_type='multiple_choice' then
    if cardinality(v_selected) < 1 then raise exception 'multiple_choice requires at least one option'; end if;
    v_selected_option := null;
  elsif v_question_type='category' then
    select count(*),count(distinct o->>'response_group')
      into v_valid_count,v_group_count
    from jsonb_array_elements(v_snapshot->'options') o
    where (o->>'id')::uuid = any(v_selected);
    if v_valid_count <> v_group_count then raise exception 'category allows at most one selected option per response group'; end if;
    v_selected_option := null;
  else
    raise exception 'Unsupported question type %',v_question_type;
  end if;

  insert into public.attempt_answers(
    attempt_question_id,selected_option_id,answer_value,is_correct,score_awarded,answered_at,time_spent_seconds,is_flagged,created_at,updated_at
  ) values (
    p_attempt_question_id,v_selected_option,p_answer_value,null,0,now(),coalesce(p_time_spent_seconds,0),coalesce(p_is_flagged,false),now(),now()
  )
  on conflict(attempt_question_id) do update
    set selected_option_id=excluded.selected_option_id,
        answer_value=excluded.answer_value,
        is_correct=null,
        score_awarded=0,
        answered_at=now(),
        time_spent_seconds=excluded.time_spent_seconds,
        is_flagged=excluded.is_flagged,
        updated_at=now()
  returning id into v_answer_id;

  delete from public.attempt_answer_options where attempt_answer_id=v_answer_id;
  if v_question_type in ('multiple_choice','category') then
    insert into public.attempt_answer_options(attempt_answer_id,option_id)
    select v_answer_id,x from unnest(v_selected) x;
  end if;

  update public.exam_attempts
     set last_question_position=v_position,last_saved_at=now(),updated_at=now()
   where id=v_attempt_id;

  insert into public.attempt_events(attempt_id,event_type,question_id,metadata)
  values(v_attempt_id,'answer_saved',v_question_id,jsonb_build_object('questionType',v_question_type,'selectedCount',cardinality(v_selected)));

  return jsonb_build_object('attempt_question_id',p_attempt_question_id,'saved',true,'selected_count',cardinality(v_selected));
end;
$function$

CREATE OR REPLACE FUNCTION app_private.save_question_draft(p_question_id uuid, p_program_code text, p_track_code text, p_subject_code text, p_question_type text, p_stem text, p_difficulty text, p_cognitive_level text, p_estimated_seconds integer, p_source_reference text, p_stimulus_id uuid, p_explanation text, p_knowledge_node_id uuid, p_options jsonb, p_change_reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_actor uuid := auth.uid();
  v_program_id uuid;
  v_track_id uuid;
  v_subject_id uuid;
  v_q public.questions%rowtype;
  v_question_id uuid;
  v_next_version integer;
  v_option_count integer;
  v_correct_count integer;
  v_distinct_keys integer;
  v_group_count integer;
  v_snapshot jsonb;
  v_can_manage boolean;
  v_is_new boolean := p_question_id is null;
begin
  if v_actor is null then raise exception 'Authentication required'; end if;

  v_can_manage := app_private.current_user_has_permission('question.manage');
  if v_is_new then
    if not app_private.current_user_has_permission('content.create') and not v_can_manage then
      raise exception 'Content create permission required';
    end if;
  else
    if not app_private.current_user_has_permission('content.update') and not v_can_manage then
      raise exception 'Content update permission required';
    end if;
  end if;

  select id into v_program_id
  from public.programs
  where upper(code)=upper(trim(p_program_code)) and upper(status)='ACTIVE'
  limit 1;
  if v_program_id is null then raise exception 'Program not found'; end if;

  select id into v_track_id
  from public.tracks
  where program_id=v_program_id and upper(code)=upper(trim(p_track_code)) and upper(status)='ACTIVE'
  limit 1;
  if v_track_id is null then raise exception 'Track not found'; end if;

  select id into v_subject_id
  from public.subjects
  where track_id=v_track_id and upper(code)=upper(trim(p_subject_code)) and upper(status)='ACTIVE'
  limit 1;
  if v_subject_id is null then raise exception 'Subject not found'; end if;

  if lower(trim(p_question_type)) not in ('single_choice','multiple_choice','category') then
    raise exception 'Invalid question type';
  end if;
  if nullif(trim(p_stem),'') is null then raise exception 'Question stem required'; end if;
  if p_estimated_seconds is not null and p_estimated_seconds <= 0 then raise exception 'Estimated seconds invalid'; end if;

  if p_stimulus_id is not null and not exists(
    select 1 from public.question_stimuli s
    where s.id=p_stimulus_id and s.program_id=v_program_id and s.track_id=v_track_id and s.subject_id=v_subject_id
  ) then
    raise exception 'Stimulus does not match question context';
  end if;

  if p_knowledge_node_id is not null and not exists(
    select 1 from public.knowledge_nodes k
    where k.id=p_knowledge_node_id and k.subject_id=v_subject_id and upper(k.status)='ACTIVE'
  ) then
    raise exception 'Knowledge node does not match subject';
  end if;

  if p_options is null or jsonb_typeof(p_options) <> 'array' then raise exception 'Options must be an array'; end if;
  v_option_count := jsonb_array_length(p_options);
  if v_option_count < 2 then raise exception 'At least two options required'; end if;

  if exists(
    select 1 from jsonb_array_elements(p_options) o
    where nullif(trim(o->>'key'),'') is null or nullif(trim(o->>'content'),'') is null
  ) then raise exception 'Option key and content required'; end if;

  select count(distinct upper(trim(o->>'key'))) into v_distinct_keys from jsonb_array_elements(p_options) o;
  if v_distinct_keys <> v_option_count then raise exception 'Option keys must be unique'; end if;

  if exists(
    select 1 from jsonb_array_elements(p_options) o
    where nullif(o->>'score','') is not null and (o->>'score')::numeric < 0
  ) then raise exception 'Option score cannot be negative'; end if;

  select count(*) filter (where coalesce((o->>'is_correct')::boolean,false))
  into v_correct_count
  from jsonb_array_elements(p_options) o;

  if lower(trim(p_question_type))='single_choice' and v_correct_count <> 1 then
    raise exception 'Single choice requires exactly one correct option';
  end if;

  if lower(trim(p_question_type))='multiple_choice' then
    if v_option_count < 3 or v_correct_count < 2 or v_correct_count >= v_option_count then
      raise exception 'Multiple choice requires at least three options and at least two, but not all, correct options';
    end if;
  end if;

  if lower(trim(p_question_type))='category' then
    select count(distinct nullif(trim(o->>'response_group'),'')) into v_group_count
    from jsonb_array_elements(p_options) o;
    if v_group_count < 2 then raise exception 'Category requires at least two response groups'; end if;
    if exists(
      select 1
      from (
        select nullif(trim(o->>'response_group'),'') as response_group,
               count(*) as option_count,
               count(*) filter (where coalesce((o->>'is_correct')::boolean,false)) as correct_count
        from jsonb_array_elements(p_options) o
        group by nullif(trim(o->>'response_group'),'')
      ) g
      where g.response_group is null or g.option_count < 2 or g.correct_count <> 1
    ) then
      raise exception 'Each category response group requires at least two options and exactly one correct option';
    end if;
  end if;

  if not v_is_new then
    select * into v_q from public.questions where id=p_question_id for update;
    if not found then raise exception 'Question not found'; end if;
    if v_q.program_id<>v_program_id or v_q.track_id<>v_track_id then raise exception 'Question context mismatch'; end if;
    if lower(v_q.status) not in ('draft','revision_required','rejected') then raise exception 'Question not editable in current status'; end if;
    if v_q.author_id<>v_actor and not v_can_manage then raise exception 'Only author or question manager can edit this question'; end if;

    select jsonb_build_object(
      'question', to_jsonb(v_q),
      'options', coalesce((select jsonb_agg(to_jsonb(o) order by o.sort_order) from public.question_options o where o.question_id=v_q.id),'[]'::jsonb),
      'explanations', coalesce((select jsonb_agg(to_jsonb(e) order by e.version desc, e.created_at desc) from public.question_explanations e where e.question_id=v_q.id),'[]'::jsonb),
      'knowledge_nodes', coalesce((select jsonb_agg(to_jsonb(qk)) from public.question_knowledge_nodes qk where qk.question_id=v_q.id),'[]'::jsonb),
      'stimulus', (select to_jsonb(s) from public.question_stimuli s where s.id=v_q.stimulus_id)
    ) into v_snapshot;

    insert into public.question_versions(question_id,version,snapshot,changed_by,change_reason)
    values(v_q.id,v_q.version,v_snapshot,v_actor,coalesce(nullif(trim(p_change_reason),''),'Content workspace update'))
    on conflict (question_id,version) do nothing;

    v_question_id := v_q.id;
    v_next_version := v_q.version + 1;

    update public.questions
    set subject_id=v_subject_id,
        question_type=lower(trim(p_question_type)),
        stem=trim(p_stem),
        difficulty=lower(trim(p_difficulty)),
        cognitive_level=nullif(trim(p_cognitive_level),''),
        source_reference=nullif(trim(p_source_reference),''),
        estimated_seconds=p_estimated_seconds,
        stimulus_id=p_stimulus_id,
        status=case when lower(v_q.status)='rejected' then 'draft' else v_q.status end,
        version=v_next_version,
        reviewer_id=null,
        updated_at=now()
    where id=v_question_id;
  else
    v_next_version := 1;
    insert into public.questions(
      question_code,program_id,track_id,subject_id,question_type,stem,difficulty,cognitive_level,
      source_type,source_reference,estimated_seconds,status,version,author_id,reviewer_id,published_at,
      stimulus_id,stimulus_order,response_config,created_at,updated_at
    ) values (
      format('CWS-%s-%s-%s-%s',upper(trim(p_track_code)),upper(trim(p_subject_code)),to_char(clock_timestamp(),'YYYYMMDDHH24MISSMS'),upper(substr(replace(gen_random_uuid()::text,'-',''),1,6))),
      v_program_id,v_track_id,v_subject_id,lower(trim(p_question_type)),trim(p_stem),lower(trim(p_difficulty)),nullif(trim(p_cognitive_level),''),
      'internal',nullif(trim(p_source_reference),''),p_estimated_seconds,'draft',1,v_actor,null,null,
      p_stimulus_id,0,'{}'::jsonb,now(),now()
    ) returning id into v_question_id;
  end if;

  delete from public.question_options where question_id=v_question_id;
  insert into public.question_options(
    question_id,option_key,content,is_correct,score,sort_order,image_url,response_group,response_group_order,metadata
  )
  select v_question_id,
         upper(trim(o.value->>'key')),
         trim(o.value->>'content'),
         case when o.value ? 'is_correct' then (o.value->>'is_correct')::boolean else null end,
         case when nullif(o.value->>'score','') is null then null else (o.value->>'score')::numeric end,
         coalesce(nullif(o.value->>'sort_order','')::integer,o.ordinality::integer),
         nullif(trim(o.value->>'image_url'),''),
         nullif(trim(o.value->>'response_group'),''),
         case when nullif(o.value->>'response_group_order','') is null then null else (o.value->>'response_group_order')::integer end,
         coalesce(o.value->'metadata','{}'::jsonb)
  from jsonb_array_elements(p_options) with ordinality as o(value,ordinality);

  delete from public.question_explanations where question_id=v_question_id;
  if nullif(trim(p_explanation),'') is not null then
    insert into public.question_explanations(question_id,content,format,video_url,version,created_at,updated_at)
    values(v_question_id,trim(p_explanation),'markdown',null,v_next_version,now(),now());
  end if;

  delete from public.question_knowledge_nodes where question_id=v_question_id and relation_type='primary';
  if p_knowledge_node_id is not null then
    insert into public.question_knowledge_nodes(question_id,knowledge_node_id,relation_type)
    values(v_question_id,p_knowledge_node_id,'primary')
    on conflict (question_id,knowledge_node_id) do update set relation_type='primary';
  end if;

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,old_data,new_data)
  values(
    v_actor,
    case when v_is_new then 'question.content.created' else 'question.content.updated' end,
    'question',
    v_question_id,
    case when v_is_new then null else v_snapshot end,
    jsonb_build_object('version',v_next_version,'status',case when v_is_new then 'draft' else case when lower(v_q.status)='rejected' then 'draft' else v_q.status end end,'subject_id',v_subject_id)
  );

  return jsonb_build_object('question_id',v_question_id,'version',v_next_version,'status',case when v_is_new then 'draft' else case when lower(v_q.status)='rejected' then 'draft' else v_q.status end end);
end;
$function$

CREATE OR REPLACE FUNCTION app_private.score_exam_attempt(p_attempt_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  r record;
  v_selected uuid[];
  v_total_correct integer;
  v_selected_correct integer;
  v_total_groups integer;
  v_correct_groups integer;
  v_score numeric;
  v_correct boolean;
  v_total numeric;
  v_percentage numeric;
begin
  for r in
    select aq.id,aq.question_snapshot,aq.question_snapshot->'question'->>'question_type' question_type,aa.id answer_id,aa.selected_option_id
    from public.attempt_questions aq
    left join public.attempt_answers aa on aa.attempt_question_id=aq.id
    where aq.attempt_id=p_attempt_id
  loop
    if r.answer_id is null then continue; end if;

    if r.question_type='single_choice' then
      v_selected := array[r.selected_option_id];
    else
      select coalesce(array_agg(aao.option_id),array[]::uuid[]) into v_selected
      from public.attempt_answer_options aao where aao.attempt_answer_id=r.answer_id;
    end if;

    if r.question_type='single_choice' then
      select coalesce(bool_or((o->>'is_correct')::boolean) filter(where (o->>'id')::uuid=any(v_selected)),false)
        into v_correct
      from jsonb_array_elements(r.question_snapshot->'options') o;
      v_score := case when v_correct then 1 else 0 end;
    elsif r.question_type='multiple_choice' then
      select count(*) filter(where (o->>'is_correct')::boolean),
             count(*) filter(where (o->>'is_correct')::boolean and (o->>'id')::uuid=any(v_selected))
        into v_total_correct,v_selected_correct
      from jsonb_array_elements(r.question_snapshot->'options') o;
      v_correct := cardinality(v_selected)=v_total_correct and v_selected_correct=v_total_correct;
      v_score := case when v_correct then 1 else 0 end;
    elsif r.question_type='category' then
      select count(distinct o->>'response_group'),
             count(distinct o->>'response_group') filter(where (o->>'is_correct')::boolean and (o->>'id')::uuid=any(v_selected))
        into v_total_groups,v_correct_groups
      from jsonb_array_elements(r.question_snapshot->'options') o;
      v_score := case when v_total_groups>0 then v_correct_groups::numeric/v_total_groups::numeric else 0 end;
      v_correct := v_total_groups>0 and v_correct_groups=v_total_groups and cardinality(v_selected)=v_total_groups;
    else
      v_score := 0; v_correct := false;
    end if;

    update public.attempt_answers
       set is_correct=v_correct,score_awarded=round(v_score,6),updated_at=now()
     where id=r.answer_id;
  end loop;

  delete from public.attempt_scores where attempt_id=p_attempt_id;

  insert into public.attempt_scores(
    attempt_id,subject_id,raw_score,normalized_score,percentage,passing_score,passed,correct_count,wrong_count,unanswered_count,created_at
  )
  select aq.attempt_id,
         q.subject_id,
         coalesce(sum(aa.score_awarded),0),
         round(coalesce(sum(aa.score_awarded),0) / nullif(count(*),0) * 100,4),
         round(coalesce(sum(aa.score_awarded),0) / nullif(count(*),0) * 100,4),
         null,null,
         count(*) filter(where aa.is_correct is true),
         count(*) filter(where aa.id is not null and coalesce(aa.is_correct,false)=false),
         count(*) filter(where aa.id is null),
         now()
  from public.attempt_questions aq
  join public.questions q on q.id=aq.question_id
  left join public.attempt_answers aa on aa.attempt_question_id=aq.id
  where aq.attempt_id=p_attempt_id
  group by aq.attempt_id,q.subject_id;

  select coalesce(sum(aa.score_awarded),0),
         round(coalesce(sum(aa.score_awarded),0)/nullif(count(aq.id),0)*100,4)
    into v_total,v_percentage
  from public.attempt_questions aq
  left join public.attempt_answers aa on aa.attempt_question_id=aq.id
  where aq.attempt_id=p_attempt_id;

  return jsonb_build_object('raw_score',v_total,'percentage',v_percentage);
end;
$function$

CREATE OR REPLACE FUNCTION app_private.start_exam_attempt_for_user(p_exam_id uuid, p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_attempt_id uuid := gen_random_uuid();
  v_attempt_number integer;
  v_attempt_limit integer;
  v_exam_status text;
  v_track_id uuid;
  v_access_type text;
  v_required_feature_id uuid;
  v_program_code text;
  v_track_code text;
  v_monetization_enforced boolean := false;
  v_has_entitlement boolean := false;
  v_bypass_attempt_limit boolean := false;
  v_used_attempts integer := 0;
  v_item_count integer;
  v_expected_count integer;
  v_section_count integer;
  v_first_section uuid;
  v_seed text;
  v_existing_attempt_id uuid;
  v_existing_attempt_number integer;
begin
  if not exists(select 1 from public.profiles where id=p_user_id and status='active') then
    raise exception 'Active user profile not found';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_exam_id::text || ':' || p_user_id::text,0));

  select e.status,e.attempt_limit,e.track_id,e.access_type,e.required_feature_id,pr.code,tr.code
    into v_exam_status,v_attempt_limit,v_track_id,v_access_type,v_required_feature_id,v_program_code,v_track_code
  from public.exams e
  join public.tracks tr on tr.id=e.track_id
  join public.programs pr on pr.id=tr.program_id
  where e.id=p_exam_id;
  if not found then raise exception 'Exam not found'; end if;
  if v_exam_status <> 'active' then raise exception 'Exam is not active'; end if;

  if not exists(
    select 1 from public.user_tracks
    where user_id=p_user_id and track_id=v_track_id and status='active'
  ) then
    raise exception 'Active user track required';
  end if;

  select ea.id,ea.attempt_number
    into v_existing_attempt_id,v_existing_attempt_number
  from public.exam_attempts ea
  where ea.exam_id=p_exam_id and ea.user_id=p_user_id and ea.status='in_progress'
  order by ea.attempt_number desc
  limit 1;

  if v_existing_attempt_id is not null then
    select ass.section_id into v_first_section
    from public.attempt_section_states ass
    join public.exam_sections es on es.id=ass.section_id
    where ass.attempt_id=v_existing_attempt_id and ass.status='active'
    order by es.sort_order limit 1;

    return jsonb_build_object(
      'attempt_id',v_existing_attempt_id,
      'attempt_number',v_existing_attempt_number,
      'status','in_progress',
      'active_section_id',v_first_section,
      'resumed',true
    );
  end if;

  if v_program_code='TKA' and v_track_code='SMP' then
    select coalesce(ff.enabled,false)
      into v_monetization_enforced
    from public.feature_flags ff
    where ff.key='tka.smp.monetization_enforcement';
    v_monetization_enforced := coalesce(v_monetization_enforced,false);
  end if;

  if v_monetization_enforced then
    v_access_type := upper(coalesce(v_access_type,'FREE'));

    if v_access_type in ('PREMIUM','FREEMIUM') then
      if v_required_feature_id is null then
        raise exception 'Exam monetization configuration requires required_feature_id';
      end if;

      select exists(
        select 1
        from public.entitlements en
        where en.user_id=p_user_id
          and en.feature_id=v_required_feature_id
          and lower(en.status)='active'
          and en.starts_at <= now()
          and (en.expires_at is null or en.expires_at > now())
          and (en.usage_limit is null or en.usage_count < en.usage_limit)
      ) into v_has_entitlement;
    end if;

    if v_access_type='PREMIUM' then
      if not v_has_entitlement then
        raise exception 'ENTITLEMENT_REQUIRED';
      end if;
      v_bypass_attempt_limit := true;
    elsif v_access_type='FREEMIUM' then
      if v_has_entitlement then
        v_bypass_attempt_limit := true;
      else
        select count(*)::integer into v_used_attempts
        from public.exam_attempts ea
        where ea.exam_id=p_exam_id and ea.user_id=p_user_id;

        if v_used_attempts >= coalesce(v_attempt_limit,1) then
          raise exception 'ENTITLEMENT_REQUIRED';
        end if;
      end if;
    end if;
  end if;

  select count(*),coalesce(sum(es.question_count),0)
    into v_section_count,v_expected_count
  from public.exam_sections es
  where es.exam_id=p_exam_id;

  if v_section_count = 0 or v_expected_count <= 0 then
    raise exception 'Exam must declare at least one section with a positive question count';
  end if;

  if exists(
    select 1 from public.exam_sections es
    where es.exam_id=p_exam_id and coalesce(es.question_count,0) <= 0
  ) then
    raise exception 'Every exam section must declare a positive question count';
  end if;

  select count(*) into v_item_count
  from public.exam_question_items where exam_id=p_exam_id;

  if v_item_count <> v_expected_count then
    raise exception 'Exam item count mismatch: expected %, got %',v_expected_count,v_item_count;
  end if;

  if exists(
    select 1
    from public.exam_sections es
    left join public.exam_question_items eqi
      on eqi.section_id=es.id and eqi.exam_id=p_exam_id
    where es.exam_id=p_exam_id
    group by es.id,es.question_count
    having count(eqi.id) <> es.question_count
  ) then
    raise exception 'Exam section item count does not match section question_count';
  end if;

  if exists(
    select 1
    from public.exam_question_items eqi
    left join public.exam_sections es on es.id=eqi.section_id
    where eqi.exam_id=p_exam_id
      and (eqi.section_id is null or es.exam_id is distinct from p_exam_id)
  ) then
    raise exception 'Every exam item must belong to a section of the same exam';
  end if;

  if exists(
    select 1
    from public.exam_question_items eqi
    left join public.question_versions qv
      on qv.question_id=eqi.question_id and qv.version=eqi.question_version
    where eqi.exam_id=p_exam_id and qv.question_id is null
  ) then
    raise exception 'Every exam item must reference an existing frozen question version';
  end if;

  select coalesce(max(attempt_number),0)+1 into v_attempt_number
  from public.exam_attempts where exam_id=p_exam_id and user_id=p_user_id;

  if v_attempt_limit is not null
     and v_attempt_number > v_attempt_limit
     and not v_bypass_attempt_limit then
    raise exception 'Attempt limit reached';
  end if;

  v_seed := v_attempt_id::text;

  insert into public.exam_attempts(
    id,exam_id,user_id,attempt_number,status,started_at,metadata,created_at,updated_at
  ) values (
    v_attempt_id,p_exam_id,p_user_id,v_attempt_number,'in_progress',now(),
    jsonb_build_object(
      'orderSeed',v_seed,
      'engineVersion','tka-section-rpc-v2',
      'questionCount',v_expected_count,
      'monetizationEnforced',v_monetization_enforced,
      'entitlementBypass',v_bypass_attempt_limit
    ),now(),now()
  );

  with s as (
    select es.*, row_number() over(order by es.sort_order,es.id) rn
    from public.exam_sections es where es.exam_id=p_exam_id
  )
  insert into public.attempt_section_states(
    attempt_id,section_id,status,started_at,deadline_at,created_at,updated_at
  )
  select v_attempt_id,id,
         case when rn=1 then 'active' else 'locked' end,
         case when rn=1 then now() else null end,
         case when rn=1 then now() + make_interval(secs=>coalesce(duration_seconds,0)) else null end,
         now(),now()
  from s;

  select ass.section_id into v_first_section
  from public.attempt_section_states ass
  join public.exam_sections es on es.id=ass.section_id
  where ass.attempt_id=v_attempt_id and ass.status='active'
  order by es.sort_order limit 1;

  with base as (
    select eqi.question_id,eqi.question_version,eqi.section_id,es.sort_order,
           qv.snapshot,
           row_number() over(order by es.sort_order,md5(v_seed || ':' || eqi.question_id::text)) as pos
    from public.exam_question_items eqi
    join public.exam_sections es on es.id=eqi.section_id and es.exam_id=eqi.exam_id
    join public.question_versions qv
      on qv.question_id=eqi.question_id and qv.version=eqi.question_version
    where eqi.exam_id=p_exam_id
  ), enhanced as (
    select b.*,
      jsonb_set(
        b.snapshot,
        '{options}',
        coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'id',qo.id,'option_key',qo.option_key,'content',qo.content,
              'is_correct',qo.is_correct,'score',qo.score,'sort_order',qo.sort_order,
              'image_url',qo.image_url,'response_group',qo.response_group,
              'response_group_order',qo.response_group_order,'metadata',qo.metadata
            ) order by qo.sort_order
          )
          from public.question_options qo where qo.question_id=b.question_id
        ),'[]'::jsonb),
        true
      ) as frozen_snapshot
    from base b
  )
  insert into public.attempt_questions(
    attempt_id,question_id,question_version,position,section_id,question_snapshot,max_score
  )
  select v_attempt_id,question_id,question_version,pos,section_id,frozen_snapshot,1
  from enhanced;

  insert into public.attempt_events(attempt_id,event_type,metadata)
  values(v_attempt_id,'attempt_started',jsonb_build_object(
    'attemptNumber',v_attempt_number,
    'activeSectionId',v_first_section,
    'questionCount',v_expected_count,
    'monetizationEnforced',v_monetization_enforced,
    'entitlementBypass',v_bypass_attempt_limit
  ));

  return jsonb_build_object(
    'attempt_id',v_attempt_id,
    'attempt_number',v_attempt_number,
    'status','in_progress',
    'active_section_id',v_first_section,
    'resumed',false
  );
end;
$function$

CREATE OR REPLACE FUNCTION app_private.submit_exam_attempt_for_user(p_user_id uuid, p_attempt_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_started timestamptz;
  v_score jsonb;
  v_duration integer;
  v_projection jsonb;
  v_wrong_state jsonb;
  v_remedial jsonb;
begin
  select started_at
    into v_started
  from public.exam_attempts
  where id = p_attempt_id
    and user_id = p_user_id
    and status = 'in_progress'
  for update;

  if v_started is null then
    raise exception 'In-progress attempt not found';
  end if;

  if exists (
    select 1
    from public.attempt_section_states
    where attempt_id = p_attempt_id
      and status <> 'completed'
  ) then
    raise exception 'ALL_SECTIONS_MUST_BE_COMPLETED';
  end if;

  v_score := app_private.score_exam_attempt(p_attempt_id);

  select coalesce(sum(duration_used_seconds), 0)
    into v_duration
  from public.attempt_section_states
  where attempt_id = p_attempt_id
    and status = 'completed';

  update public.exam_attempts
     set status = 'completed',
         submitted_at = now(),
         duration_used_seconds = v_duration,
         total_score = (v_score->>'raw_score')::numeric,
         percentage = (v_score->>'percentage')::numeric,
         passed = null,
         last_saved_at = now(),
         updated_at = now()
   where id = p_attempt_id;

  insert into public.attempt_events(attempt_id, event_type, metadata)
  values (p_attempt_id, 'attempt_submitted', v_score);

  v_projection := app_private.refresh_tka_smp_learning_projection_for_user(p_user_id, p_attempt_id);
  insert into public.attempt_events(attempt_id, event_type, metadata)
  values (p_attempt_id, 'learning_projection_refreshed', v_projection);

  v_wrong_state := app_private.refresh_tka_smp_wrong_question_state_for_user(p_user_id, p_attempt_id);
  insert into public.attempt_events(attempt_id, event_type, metadata)
  values (p_attempt_id, 'wrong_question_state_refreshed', v_wrong_state);

  v_remedial := app_private.refresh_tka_smp_remedial_session_for_attempt(p_user_id, p_attempt_id, 10);
  insert into public.attempt_events(attempt_id, event_type, metadata)
  values (p_attempt_id, 'automatic_remedial_refreshed', v_remedial);

  return jsonb_build_object(
    'attempt_id', p_attempt_id,
    'status', 'completed',
    'raw_score', (v_score->>'raw_score')::numeric,
    'percentage', (v_score->>'percentage')::numeric,
    'duration_used_seconds', v_duration,
    'learning_projection', v_projection,
    'wrong_question_state', v_wrong_state,
    'automatic_remedial', v_remedial
  );
end;
$function$

CREATE OR REPLACE FUNCTION app_private.submit_question_for_review(p_question_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_actor uuid := auth.uid();
  v_q public.questions%rowtype;
  v_version integer;
  v_round integer;
begin
  if v_actor is null then
    raise exception 'Authentication required';
  end if;

  select * into v_q from public.questions where id = p_question_id for update;
  if not found then raise exception 'Question not found'; end if;

  if v_q.status not in ('draft','revision_required') then
    raise exception 'Question % cannot be submitted from status %', v_q.question_code, v_q.status;
  end if;

  if v_actor <> v_q.author_id
     and not app_private.current_user_has_permission('question.manage')
     and not app_private.current_user_has_permission('content.update') then
    raise exception 'Not allowed to submit this question';
  end if;

  v_version := app_private.ensure_question_snapshot(p_question_id, v_actor, 'submitted_for_review');

  select coalesce(max(review_round),0) + 1 into v_round
  from public.content_reviews
  where entity_type = 'question' and entity_id = p_question_id;

  update public.content_reviews
     set status='cancelled', completed_at=now(), updated_at=now()
   where entity_type='question' and entity_id=p_question_id and status='pending';

  perform set_config('app.workflow_action', 'submit', true);
  update public.questions
     set status='submitted', reviewer_id=null, updated_at=now()
   where id=p_question_id;

  insert into public.content_reviews(entity_type, entity_id, reviewer_id, status, notes, review_stage, question_version, review_round, created_at, updated_at)
  values ('question', p_question_id, null, 'pending', null, 'editorial', v_version, v_round, now(), now());

  return jsonb_build_object('question_id',p_question_id,'status','submitted','question_version',v_version,'review_stage','editorial','review_round',v_round);
end;
$function$

CREATE OR REPLACE FUNCTION app_private.sync_tka_smp_remedial_sessions_for_user(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_items_synced integer := 0;
  v_sessions_completed integer := 0;
begin
  update public.remedial_session_items rsi
     set status = 'completed',
         best_score = greatest(rsi.best_score, 1),
         completed_at = coalesce(rsi.completed_at, uwq.resolved_at, now()),
         updated_at = now()
    from public.remedial_sessions rs,
         public.user_wrong_questions uwq
   where rsi.session_id = rs.id
     and rsi.user_wrong_question_id = uwq.id
     and rs.user_id = p_user_id
     and rsi.status = 'pending'
     and uwq.status = 'resolved';

  get diagnostics v_items_synced = row_count;

  update public.remedial_sessions rs
     set status = 'completed',
         completed_at = coalesce(rs.completed_at, now()),
         updated_at = now()
   where rs.user_id = p_user_id
     and rs.status = 'active'
     and exists (
       select 1
       from public.remedial_session_items rsi
       where rsi.session_id = rs.id
     )
     and not exists (
       select 1
       from public.remedial_session_items rsi
       where rsi.session_id = rs.id
         and rsi.status = 'pending'
     );

  get diagnostics v_sessions_completed = row_count;

  return jsonb_build_object(
    'items_synced', v_items_synced,
    'sessions_completed', v_sessions_completed
  );
end;
$function$
