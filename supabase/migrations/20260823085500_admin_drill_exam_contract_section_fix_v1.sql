create or replace function public.admin_upsert_drill_exam_v1(
  p_exam_id uuid,
  p_program_code text,
  p_track_code text,
  p_subject_code text,
  p_knowledge_node_id uuid,
  p_title text,
  p_slug text,
  p_duration_seconds integer,
  p_attempt_limit integer,
  p_question_count integer,
  p_question_order text,
  p_result_visibility text,
  p_access_type text,
  p_status text,
  p_token_cost integer,
  p_actor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_program_id uuid;
  v_track_id uuid;
  v_subject_id uuid;
  v_subject_name text;
  v_node_name text;
  v_node_status text;
  v_drill_type_id uuid;
  v_exam_id uuid := p_exam_id;
  v_blueprint_id uuid;
  v_section_id uuid;
  v_current_type_id uuid;
  v_section_count integer;
  v_available_count integer;
  v_materialized_count integer;
begin
  if p_actor_id is null or not exists (
    select 1 from public.profiles p where p.id=p_actor_id and p.status='active'
  ) then
    raise exception 'DRILL_ACTOR_INVALID';
  end if;
  if p_title is null or btrim(p_title)='' or p_slug is null or btrim(p_slug)='' then
    raise exception 'EXAM_TITLE_REQUIRED';
  end if;
  if p_duration_seconds is null or p_duration_seconds <= 0 then raise exception 'EXAM_DURATION_INVALID'; end if;
  if p_attempt_limit is null or p_attempt_limit <= 0 then raise exception 'EXAM_ATTEMPT_LIMIT_INVALID'; end if;
  if p_question_count is null or p_question_count <= 0 then raise exception 'DRILL_QUESTION_COUNT_INVALID'; end if;
  if p_token_cost is null or p_token_cost < 0 then raise exception 'EXAM_TOKEN_COST_INVALID'; end if;

  select id into v_program_id from public.programs where upper(code)=upper(btrim(p_program_code)) limit 1;
  if v_program_id is null then raise exception 'PROGRAM_NOT_FOUND'; end if;
  select id into v_track_id from public.tracks where program_id=v_program_id and upper(code)=upper(btrim(p_track_code)) limit 1;
  if v_track_id is null then raise exception 'TRACK_NOT_FOUND'; end if;
  select id,name into v_subject_id,v_subject_name from public.subjects where track_id=v_track_id and upper(code)=upper(btrim(p_subject_code)) limit 1;
  if v_subject_id is null then raise exception 'SUBJECT_INVALID'; end if;
  select name,status into v_node_name,v_node_status from public.knowledge_nodes where id=p_knowledge_node_id and subject_id=v_subject_id;
  if v_node_name is null then raise exception 'DRILL_KNOWLEDGE_NODE_INVALID'; end if;
  if lower(coalesce(v_node_status,'')) <> 'active' then raise exception 'DRILL_KNOWLEDGE_NODE_INACTIVE'; end if;
  select id into v_drill_type_id from public.exam_types where upper(code)='DRILL' limit 1;
  if v_drill_type_id is null then raise exception 'EXAM_TYPE_INVALID'; end if;

  perform pg_advisory_xact_lock(hashtextextended(coalesce(v_exam_id::text,btrim(p_slug)),0));

  if v_exam_id is not null then
    select e.exam_type_id,e.blueprint_id into v_current_type_id,v_blueprint_id
    from public.exams e
    where e.id=v_exam_id and e.program_id=v_program_id and e.track_id=v_track_id
    for update;
    if not found then raise exception 'EXAM_NOT_FOUND'; end if;
    if v_current_type_id <> v_drill_type_id then raise exception 'DRILL_TYPE_IMMUTABLE'; end if;
    if exists(select 1 from public.exam_attempts ea where ea.exam_id=v_exam_id and ea.status='in_progress') then
      raise exception 'DRILL_ACTIVE_ATTEMPT_LOCKED';
    end if;
  end if;

  select count(distinct q.id)::integer into v_available_count
  from public.questions q
  join public.question_knowledge_nodes qkn on qkn.question_id=q.id and qkn.relation_type='primary'
  join public.knowledge_node_paths knp on knp.descendant_id=qkn.knowledge_node_id
  join public.question_versions qv on qv.question_id=q.id and qv.version=q.version
  where q.program_id=v_program_id
    and q.track_id=v_track_id
    and q.subject_id=v_subject_id
    and q.status in ('approved','published')
    and knp.ancestor_id=p_knowledge_node_id;

  if v_available_count < p_question_count then
    raise exception 'DRILL_QUESTION_POOL_INSUFFICIENT:%/%',v_available_count,p_question_count;
  end if;

  if v_blueprint_id is null then
    insert into public.exam_blueprints(name,program_id,track_id,period_id,description,status,created_at,updated_at)
    values('Drill · '||v_subject_name||' · '||v_node_name,v_program_id,v_track_id,null,'Auto-managed blueprint untuk Drill submateri.','active',now(),now())
    returning id into v_blueprint_id;
  else
    update public.exam_blueprints
       set name='Drill · '||v_subject_name||' · '||v_node_name,
           description='Auto-managed blueprint untuk Drill submateri.',status='active',updated_at=now()
     where id=v_blueprint_id;
  end if;

  if v_exam_id is null then
    insert into public.exams(
      program_id,track_id,exam_type_id,blueprint_id,title,slug,duration_seconds,attempt_limit,
      question_order,result_visibility,access_type,status,created_by,token_cost,created_at,updated_at
    ) values (
      v_program_id,v_track_id,v_drill_type_id,v_blueprint_id,btrim(p_title),btrim(p_slug),p_duration_seconds,p_attempt_limit,
      coalesce(nullif(btrim(p_question_order),''),'random'),coalesce(nullif(btrim(p_result_visibility),''),'instant'),
      coalesce(nullif(btrim(p_access_type),''),'FREE'),coalesce(nullif(btrim(p_status),''),'draft'),p_actor_id,p_token_cost,now(),now()
    ) returning id into v_exam_id;
  else
    update public.exams set
      blueprint_id=v_blueprint_id,
      title=btrim(p_title),slug=btrim(p_slug),duration_seconds=p_duration_seconds,attempt_limit=p_attempt_limit,
      question_order=coalesce(nullif(btrim(p_question_order),''),'random'),
      result_visibility=coalesce(nullif(btrim(p_result_visibility),''),'instant'),
      access_type=coalesce(nullif(btrim(p_access_type),''),'FREE'),
      status=coalesce(nullif(btrim(p_status),''),'draft'),token_cost=p_token_cost,updated_at=now()
    where id=v_exam_id;
  end if;

  delete from public.exam_blueprint_rules where blueprint_id=v_blueprint_id;
  insert into public.exam_blueprint_rules(blueprint_id,subject_id,knowledge_node_id,difficulty,question_count,weight,sort_order)
  values(v_blueprint_id,v_subject_id,p_knowledge_node_id,null,p_question_count,1,1);

  select count(*)::integer into v_section_count from public.exam_sections where exam_id=v_exam_id;
  select id into v_section_id from public.exam_sections where exam_id=v_exam_id order by sort_order,id limit 1;
  if v_section_count > 1 then raise exception 'DRILL_SECTION_CONFLICT'; end if;
  if v_section_id is null then
    insert into public.exam_sections(exam_id,subject_id,title,sort_order,question_count,duration_seconds,config)
    values(v_exam_id,v_subject_id,v_node_name,1,p_question_count,p_duration_seconds,jsonb_build_object('mode','drill','knowledge_node_id',p_knowledge_node_id))
    returning id into v_section_id;
  else
    update public.exam_sections set
      subject_id=v_subject_id,title=v_node_name,sort_order=1,question_count=p_question_count,
      duration_seconds=p_duration_seconds,config=jsonb_build_object('mode','drill','knowledge_node_id',p_knowledge_node_id)
    where id=v_section_id;
  end if;

  delete from public.exam_question_items where exam_id=v_exam_id;
  with eligible as (
    select distinct q.id,q.version,q.question_code
    from public.questions q
    join public.question_knowledge_nodes qkn on qkn.question_id=q.id and qkn.relation_type='primary'
    join public.knowledge_node_paths knp on knp.descendant_id=qkn.knowledge_node_id
    join public.question_versions qv on qv.question_id=q.id and qv.version=q.version
    where q.program_id=v_program_id
      and q.track_id=v_track_id
      and q.subject_id=v_subject_id
      and q.status in ('approved','published')
      and knp.ancestor_id=p_knowledge_node_id
  ), chosen as (
    select *,row_number() over(order by md5(v_exam_id::text||':'||id::text)) as pos
    from eligible
    order by md5(v_exam_id::text||':'||id::text)
    limit p_question_count
  )
  insert into public.exam_question_items(exam_id,section_id,question_id,question_version,position,score_weight)
  select v_exam_id,v_section_id,id,version,pos,1 from chosen;
  get diagnostics v_materialized_count=row_count;

  if v_materialized_count <> p_question_count then
    raise exception 'DRILL_MATERIALIZATION_MISMATCH:%/%',v_materialized_count,p_question_count;
  end if;

  return jsonb_build_object(
    'exam_id',v_exam_id,'blueprint_id',v_blueprint_id,'section_id',v_section_id,
    'subject_id',v_subject_id,'knowledge_node_id',p_knowledge_node_id,
    'available_question_count',v_available_count,'question_count',v_materialized_count
  );
end;
$function$;

revoke all on function public.admin_upsert_drill_exam_v1(uuid,text,text,text,uuid,text,text,integer,integer,integer,text,text,text,text,integer,uuid) from public,anon,authenticated;
grant execute on function public.admin_upsert_drill_exam_v1(uuid,text,text,text,uuid,text,text,integer,integer,integer,text,text,text,text,integer,uuid) to service_role;
