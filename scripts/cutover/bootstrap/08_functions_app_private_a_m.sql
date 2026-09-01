-- Generated from canonical staging lpgrivowdcepcxradavu via pg_get_functiondef().
-- Runtime app_private functions A-M. CPNS migration-only helpers are excluded.
-- DO NOT apply to production before explicit final GO.

CREATE OR REPLACE FUNCTION app_private.activate_user_track_for_user(p_user_id uuid, p_program_code text, p_track_code text, p_target_year integer DEFAULT NULL::integer, p_school_name text DEFAULT NULL::text, p_school_grade text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_program_id uuid;
  v_program_code text;
  v_track_id uuid;
  v_track_code text;
  v_user_track_id uuid;
  v_school_name text := nullif(btrim(coalesce(p_school_name,'')),'');
  v_school_grade text := nullif(btrim(coalesce(p_school_grade,'')),'');
begin
  if p_user_id is null then raise exception 'Authentication required'; end if;
  if not exists(select 1 from public.profiles where id=p_user_id and status='active') then
    raise exception 'Active user profile not found';
  end if;

  v_program_code := upper(btrim(coalesce(p_program_code,'')));
  v_track_code := upper(btrim(coalesce(p_track_code,'')));
  if v_program_code = '' or length(v_program_code) > 32 then raise exception 'Invalid program code'; end if;
  if v_track_code = '' or length(v_track_code) > 32 then raise exception 'Invalid track code'; end if;
  if p_target_year is not null and (p_target_year < 2025 or p_target_year > 2100) then
    raise exception 'Invalid target year';
  end if;
  if v_school_name is not null and length(v_school_name) > 160 then raise exception 'School name too long'; end if;
  if v_school_grade is not null and length(v_school_grade) > 32 then raise exception 'School grade too long'; end if;

  select p.id,p.code into v_program_id,v_program_code
  from public.programs p
  where upper(p.code)=v_program_code and lower(p.status)='active'
  limit 1;
  if v_program_id is null then raise exception 'Active program not found'; end if;

  select t.id,t.code into v_track_id,v_track_code
  from public.tracks t
  where t.program_id=v_program_id and upper(t.code)=v_track_code and lower(t.status)='active'
  limit 1;
  if v_track_id is null then raise exception 'Active track not found'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || v_track_id::text,0));

  insert into public.user_tracks(
    user_id,track_id,status,target_year,started_at,completed_at,created_at,updated_at
  ) values (
    p_user_id,v_track_id,'active',p_target_year,now(),null,now(),now()
  )
  on conflict(user_id,track_id) do update set
    status='active',
    target_year=excluded.target_year,
    completed_at=null,
    updated_at=now()
  returning id into v_user_track_id;

  if v_school_name is not null or v_school_grade is not null then
    insert into public.user_track_preferences(
      user_track_id,school_name,school_grade,preferences,created_at,updated_at
    ) values (
      v_user_track_id,v_school_name,v_school_grade,jsonb_build_object('source','tka_entry'),now(),now()
    )
    on conflict(user_track_id) do update set
      school_name=excluded.school_name,
      school_grade=excluded.school_grade,
      preferences=coalesce(public.user_track_preferences.preferences,'{}'::jsonb) || jsonb_build_object('source','tka_entry'),
      updated_at=now();
  end if;

  return jsonb_build_object(
    'userTrackId',v_user_track_id,
    'programCode',v_program_code,
    'trackCode',v_track_code,
    'status','active',
    'targetYear',p_target_year
  );
end;
$function$

CREATE OR REPLACE FUNCTION app_private.assign_question_reviewer(p_question_id uuid, p_reviewer_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_actor uuid := auth.uid();
  v_q public.questions%rowtype;
  v_stage text;
  v_review_id uuid;
  v_round integer;
  v_reviewer_ok boolean;
begin
  if v_actor is null then raise exception 'Authentication required'; end if;
  if not app_private.current_user_has_permission('content.review')
     and not app_private.current_user_has_permission('question.manage') then
    raise exception 'Reviewer assignment permission required';
  end if;

  select * into v_q from public.questions where id=p_question_id for update;
  if not found then raise exception 'Question not found'; end if;

  if p_reviewer_id = v_q.author_id then
    raise exception 'Author cannot review their own question';
  end if;

  select exists(
    select 1
    from public.profiles pr
    where pr.id=p_reviewer_id and pr.status='active'
  ) and exists(
    select 1
    from public.user_roles ur
    join public.role_permissions rp on rp.role_id=ur.role_id
    join public.permissions pe on pe.id=rp.permission_id
    where ur.user_id=p_reviewer_id and pe.code='content.review'
  ) into v_reviewer_ok;

  if not v_reviewer_ok then
    raise exception 'Target user is not an active content reviewer';
  end if;

  v_stage := case v_q.status
    when 'submitted' then 'editorial'
    when 'editorial_review' then 'editorial'
    when 'academic_review' then 'academic'
    when 'technical_qa' then 'technical_qa'
    else null end;

  if v_stage is null then
    raise exception 'Question cannot receive reviewer in status %', v_q.status;
  end if;

  select id, review_round into v_review_id, v_round
  from public.content_reviews
  where entity_type='question' and entity_id=p_question_id
    and review_stage=v_stage and status='pending'
  order by review_round desc, created_at desc
  limit 1
  for update;

  if v_review_id is null then
    raise exception 'No pending % review found', v_stage;
  end if;

  update public.content_reviews
     set reviewer_id=p_reviewer_id, assigned_at=now(), updated_at=now()
   where id=v_review_id;

  perform set_config('app.workflow_action', 'assign_reviewer', true);
  update public.questions
     set reviewer_id=p_reviewer_id,
         status=case when status='submitted' then 'editorial_review' else status end,
         updated_at=now()
   where id=p_question_id;

  return jsonb_build_object('question_id',p_question_id,'review_stage',v_stage,'review_round',v_round,'reviewer_id',p_reviewer_id);
end;
$function$

CREATE OR REPLACE FUNCTION app_private.audit_content_review_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_action text;
  v_entity_id uuid;
begin
  v_entity_id := coalesce(new.entity_id, old.entity_id);

  if tg_op = 'INSERT' then
    v_action := 'content.review.created';
  elsif old.reviewer_id is distinct from new.reviewer_id and new.reviewer_id is not null then
    v_action := 'content.review.assigned';
  elsif old.status is distinct from new.status then
    v_action := 'content.review.' || lower(new.status);
  else
    return new;
  end if;

  insert into public.audit_logs(actor_user_id, action, entity_type, entity_id, old_data, new_data)
  values (
    auth.uid(),
    v_action,
    'question',
    v_entity_id,
    case when tg_op = 'INSERT' then null else jsonb_build_object(
      'review_id', old.id,
      'review_stage', old.review_stage,
      'review_round', old.review_round,
      'reviewer_id', old.reviewer_id,
      'status', old.status,
      'notes', old.notes,
      'question_version', old.question_version
    ) end,
    jsonb_build_object(
      'review_id', new.id,
      'review_stage', new.review_stage,
      'review_round', new.review_round,
      'reviewer_id', new.reviewer_id,
      'status', new.status,
      'notes', new.notes,
      'question_version', new.question_version
    )
  );

  return new;
end;
$function$

CREATE OR REPLACE FUNCTION app_private.audit_question_workflow_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_action text;
begin
  if old.status is distinct from new.status then
    v_action := 'question.workflow.' || lower(new.status);
  elsif old.reviewer_id is distinct from new.reviewer_id then
    v_action := 'question.workflow.reviewer_changed';
  else
    return new;
  end if;

  insert into public.audit_logs(actor_user_id, action, entity_type, entity_id, old_data, new_data)
  values (
    auth.uid(),
    v_action,
    'question',
    new.id,
    jsonb_build_object(
      'status', old.status,
      'reviewer_id', old.reviewer_id,
      'version', old.version,
      'published_at', old.published_at
    ),
    jsonb_build_object(
      'status', new.status,
      'reviewer_id', new.reviewer_id,
      'version', new.version,
      'published_at', new.published_at
    )
  );

  return new;
end;
$function$

CREATE OR REPLACE FUNCTION app_private.bulk_review_pilot_stage(p_batch text, p_decision text, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_actor uuid := auth.uid();
  v_count integer := 0;
  v_q record;
begin
  if v_actor is null then
    raise exception 'Authentication required';
  end if;

  if p_decision not in ('approve','revision_required','reject') then
    raise exception 'Invalid review decision';
  end if;

  if not app_private.current_user_has_permission('content.review') then
    raise exception 'Content review permission required';
  end if;

  for v_q in
    select q.id
    from public.questions q
    where q.response_config ->> 'pilotBatch' = p_batch
      and q.reviewer_id = v_actor
      and q.status in ('editorial_review','academic_review','technical_qa')
    order by q.question_code
  loop
    perform app_private.review_question_stage(v_q.id, p_decision, p_notes);
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object(
    'pilot_batch', p_batch,
    'reviewer_id', v_actor,
    'decision', p_decision,
    'reviewed_questions', v_count
  );
end;
$function$

CREATE OR REPLACE FUNCTION app_private.claim_pilot_review_stage(p_batch text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_actor uuid := auth.uid();
  v_count integer := 0;
  v_q record;
begin
  if v_actor is null then
    raise exception 'Authentication required';
  end if;

  if not app_private.current_user_has_permission('content.review') then
    raise exception 'Content review permission required';
  end if;

  for v_q in
    select q.id
    from public.questions q
    where q.response_config ->> 'pilotBatch' = p_batch
      and q.status in ('submitted','editorial_review','academic_review','technical_qa')
      and q.author_id <> v_actor
      and exists (
        select 1
        from public.content_reviews cr
        where cr.entity_type = 'question'
          and cr.entity_id = q.id
          and cr.status = 'pending'
          and cr.reviewer_id is null
      )
    order by q.question_code
  loop
    perform app_private.assign_question_reviewer(v_q.id, v_actor);
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object(
    'pilot_batch', p_batch,
    'reviewer_id', v_actor,
    'claimed_questions', v_count
  );
end;
$function$

CREATE OR REPLACE FUNCTION app_private.complete_exam_section_for_user(p_user_id uuid, p_attempt_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_state_id uuid;
  v_section_id uuid;
  v_started timestamptz;
  v_duration integer;
  v_sort integer;
  v_next_id uuid;
  v_next_duration integer;
  v_used integer;
begin
  if not exists(select 1 from public.exam_attempts where id=p_attempt_id and user_id=p_user_id and status='in_progress') then
    raise exception 'In-progress attempt not found';
  end if;

  select ass.id,ass.section_id,ass.started_at,es.duration_seconds,es.sort_order
    into v_state_id,v_section_id,v_started,v_duration,v_sort
  from public.attempt_section_states ass
  join public.exam_sections es on es.id=ass.section_id
  where ass.attempt_id=p_attempt_id and ass.status='active'
  order by es.sort_order
  limit 1
  for update of ass;

  if v_state_id is null then
    return jsonb_build_object('attempt_id',p_attempt_id,'ready_to_submit',true,'active_section_id',null);
  end if;

  v_used := least(coalesce(v_duration,2147483647),greatest(0,floor(extract(epoch from (now()-v_started)))::integer));
  update public.attempt_section_states
     set status='completed',completed_at=now(),duration_used_seconds=v_used,updated_at=now()
   where id=v_state_id;

  select es.id,es.duration_seconds into v_next_id,v_next_duration
  from public.exam_sections es
  join public.attempt_section_states ass on ass.section_id=es.id and ass.attempt_id=p_attempt_id
  where es.exam_id=(select exam_id from public.exam_attempts where id=p_attempt_id)
    and es.sort_order > v_sort and ass.status='locked'
  order by es.sort_order limit 1;

  if v_next_id is not null then
    update public.attempt_section_states
       set status='active',started_at=now(),deadline_at=now()+make_interval(secs=>coalesce(v_next_duration,0)),updated_at=now()
     where attempt_id=p_attempt_id and section_id=v_next_id;
  end if;

  insert into public.attempt_events(attempt_id,event_type,metadata)
  values(p_attempt_id,'section_completed',jsonb_build_object('sectionId',v_section_id,'durationUsedSeconds',v_used,'nextSectionId',v_next_id));

  return jsonb_build_object('attempt_id',p_attempt_id,'completed_section_id',v_section_id,'active_section_id',v_next_id,'ready_to_submit',v_next_id is null);
end;
$function$

CREATE OR REPLACE FUNCTION app_private.current_user_has_permission(p_permission text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    return false;
  end if;

  return exists (
    select 1
    from public.user_roles ur
    join public.role_permissions rp on rp.role_id = ur.role_id
    join public.permissions p on p.id = rp.permission_id
    where ur.user_id = v_user
      and p.code = p_permission
  );
end;
$function$

CREATE OR REPLACE FUNCTION app_private.enforce_question_workflow_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_action text := current_setting('app.workflow_action', true);
begin
  if (new.status is distinct from old.status
      or new.reviewer_id is distinct from old.reviewer_id
      or new.published_at is distinct from old.published_at)
     and coalesce(v_action, '') = '' then
    raise exception 'Workflow fields must be changed through review workflow functions';
  end if;

  if old.status not in ('draft','revision_required')
     and coalesce(v_action, '') = ''
     and (
       new.question_type is distinct from old.question_type
       or new.stem is distinct from old.stem
       or new.difficulty is distinct from old.difficulty
       or new.cognitive_level is distinct from old.cognitive_level
       or new.source_type is distinct from old.source_type
       or new.source_reference is distinct from old.source_reference
       or new.estimated_seconds is distinct from old.estimated_seconds
       or new.stimulus_id is distinct from old.stimulus_id
       or new.stimulus_order is distinct from old.stimulus_order
       or new.response_config is distinct from old.response_config
     ) then
    raise exception 'Question content is locked while status is %', old.status;
  end if;

  return new;
end;
$function$

CREATE OR REPLACE FUNCTION app_private.ensure_question_snapshot(p_question_id uuid, p_actor uuid, p_reason text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_auth uuid := auth.uid();
  v_snapshot jsonb;
  v_latest_snapshot jsonb;
  v_latest_version integer;
  v_current_version integer;
  v_target_version integer;
begin
  if v_auth is null or v_auth <> p_actor then
    raise exception 'Authenticated actor is required for question snapshot';
  end if;

  select version into v_current_version
  from public.questions
  where id = p_question_id
  for update;

  if v_current_version is null then
    raise exception 'Question % not found', p_question_id;
  end if;

  v_snapshot := app_private.question_snapshot_json(p_question_id);

  select qv.version, qv.snapshot
    into v_latest_version, v_latest_snapshot
  from public.question_versions qv
  where qv.question_id = p_question_id
  order by qv.version desc
  limit 1;

  if v_latest_version is null then
    v_target_version := greatest(v_current_version, 1);
    insert into public.question_versions(question_id, version, snapshot, changed_by, change_reason)
    values (p_question_id, v_target_version, v_snapshot, p_actor, p_reason);
  elsif v_latest_snapshot is distinct from v_snapshot then
    v_target_version := v_latest_version + 1;
    perform set_config('app.workflow_action', 'snapshot_version', true);
    update public.questions
      set version = v_target_version,
          updated_at = now()
    where id = p_question_id;
    insert into public.question_versions(question_id, version, snapshot, changed_by, change_reason)
    values (p_question_id, v_target_version, v_snapshot, p_actor, p_reason);
  else
    v_target_version := v_latest_version;
  end if;

  return v_target_version;
end;
$function$

CREATE OR REPLACE FUNCTION app_private.evaluate_wrong_question_selection(p_snapshot jsonb, p_option_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_type text;
  v_selected uuid[] := coalesce(p_option_ids, array[]::uuid[]);
  v_total_correct integer := 0;
  v_selected_correct integer := 0;
  v_total_groups integer := 0;
  v_correct_groups integer := 0;
  v_correct boolean := false;
  v_score numeric := 0;
begin
  if p_snapshot is null then
    raise exception 'WRONG_QUESTION_SNAPSHOT_NOT_FOUND';
  end if;

  v_type := coalesce(p_snapshot->'question'->>'question_type', 'single_choice');

  if cardinality(v_selected) = 0 then
    raise exception 'ANSWER_REQUIRED';
  end if;

  if exists (
    select 1
    from unnest(v_selected) selected_id
    where not exists (
      select 1
      from jsonb_array_elements(coalesce(p_snapshot->'options', '[]'::jsonb)) option_row
      where (option_row->>'id')::uuid = selected_id
    )
  ) then
    raise exception 'INVALID_OPTION_SELECTION';
  end if;

  if v_type = 'single_choice' then
    if cardinality(v_selected) <> 1 then
      raise exception 'SINGLE_CHOICE_REQUIRES_ONE_OPTION';
    end if;

    select coalesce(bool_or((o->>'is_correct')::boolean) filter (where (o->>'id')::uuid = any(v_selected)), false)
      into v_correct
    from jsonb_array_elements(coalesce(p_snapshot->'options', '[]'::jsonb)) o;
    v_score := case when v_correct then 1 else 0 end;

  elsif v_type = 'multiple_choice' then
    select
      count(*) filter (where (o->>'is_correct')::boolean),
      count(*) filter (where (o->>'is_correct')::boolean and (o->>'id')::uuid = any(v_selected))
      into v_total_correct, v_selected_correct
    from jsonb_array_elements(coalesce(p_snapshot->'options', '[]'::jsonb)) o;

    v_correct := cardinality(v_selected) = v_total_correct and v_selected_correct = v_total_correct;
    v_score := case when v_correct then 1 else 0 end;

  elsif v_type = 'category' then
    select
      count(distinct o->>'response_group'),
      count(distinct o->>'response_group') filter (
        where (o->>'is_correct')::boolean and (o->>'id')::uuid = any(v_selected)
      )
      into v_total_groups, v_correct_groups
    from jsonb_array_elements(coalesce(p_snapshot->'options', '[]'::jsonb)) o;

    v_score := case when v_total_groups > 0 then v_correct_groups::numeric / v_total_groups::numeric else 0 end;
    v_correct := v_total_groups > 0
      and v_correct_groups = v_total_groups
      and cardinality(v_selected) = v_total_groups;
  else
    raise exception 'UNSUPPORTED_QUESTION_TYPE';
  end if;

  return jsonb_build_object(
    'is_correct', v_correct,
    'score_awarded', round(v_score, 6),
    'question_type', v_type
  );
end;
$function$

CREATE OR REPLACE FUNCTION app_private.generate_tka_smp_exam(p_exam_id uuid, p_seed text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_track_id uuid;
  v_program_code text;
  v_track_code text;
  v_rule_id uuid;
  v_bin_id uuid;
  v_mat_id uuid;
  v_bin_section uuid;
  v_mat_section uuid;
  v_bin_count integer;
  v_mat_count integer;
begin
  if p_seed is null or btrim(p_seed) = '' then
    raise exception 'Generation seed is required';
  end if;

  select e.track_id, p.code, t.code, e.exam_rule_id
    into v_track_id, v_program_code, v_track_code, v_rule_id
  from public.exams e
  join public.programs p on p.id=e.program_id
  join public.tracks t on t.id=e.track_id
  where e.id=p_exam_id
  for update;

  if v_track_id is null then raise exception 'Exam not found'; end if;
  if v_program_code <> 'TKA' or v_track_code <> 'SMP' then
    raise exception 'Generator only supports TKA SMP';
  end if;

  select id into v_bin_id from public.subjects where track_id=v_track_id and code='BIN' limit 1;
  select id into v_mat_id from public.subjects where track_id=v_track_id and code='MAT' limit 1;
  select id into v_bin_section from public.exam_sections where exam_id=p_exam_id and subject_id=v_bin_id limit 1;
  select id into v_mat_section from public.exam_sections where exam_id=p_exam_id and subject_id=v_mat_id limit 1;

  if v_bin_section is null or v_mat_section is null then
    raise exception 'BIN and MAT sections must exist before generation';
  end if;

  delete from public.exam_question_items where exam_id=p_exam_id;

  with ranked as (
    select q.id, q.version, q.cognitive_level,
           q.response_config->>'textType' as text_type,
           row_number() over (
             partition by q.cognitive_level, q.response_config->>'textType'
             order by md5(p_seed || ':BIN:' || q.id::text)
           ) as rn
    from public.questions q
    where q.track_id=v_track_id
      and q.subject_id=v_bin_id
      and q.status in ('approved','published')
      and q.response_config->>'blueprintVersion'='TKA-SMP-2026'
      and q.cognitive_level in ('Pemahaman Tekstual','Pemahaman Inferensial','Evaluasi dan Apresiasi')
      and q.response_config->>'textType' in ('teks-informasi','teks-fiksi')
  ), selected as (
    select * from ranked where rn <= 5
  ), ordered as (
    select *, row_number() over(order by md5(p_seed || ':BINORDER:' || id::text)) as pos
    from selected
  )
  insert into public.exam_question_items(exam_id,section_id,question_id,question_version,position,score_weight)
  select p_exam_id,v_bin_section,id,version,pos,1
  from ordered;
  get diagnostics v_bin_count = row_count;

  with eligible as (
    select distinct q.id, q.version, q.cognitive_level, elem.name as element_name
    from public.questions q
    join public.question_knowledge_nodes qkn
      on qkn.question_id=q.id and qkn.relation_type='primary'
    join public.knowledge_node_paths kp on kp.descendant_id=qkn.knowledge_node_id
    join public.knowledge_nodes elem
      on elem.id=kp.ancestor_id and elem.node_type='element'
    where q.track_id=v_track_id
      and q.subject_id=v_mat_id
      and q.status in ('approved','published')
      and q.response_config->>'blueprintVersion'='TKA-SMP-2026'
      and q.cognitive_level in ('Pengetahuan dan Pemahaman','Aplikasi','Penalaran')
      and elem.name in ('Bilangan','Aljabar','Geometri dan Pengukuran','Data dan Peluang')
  ), quotas(element_name,cognitive_level,quota) as (
    values
      ('Bilangan','Pengetahuan dan Pemahaman',3),
      ('Bilangan','Aplikasi',3),
      ('Bilangan','Penalaran',2),
      ('Aljabar','Pengetahuan dan Pemahaman',3),
      ('Aljabar','Aplikasi',2),
      ('Aljabar','Penalaran',3),
      ('Geometri dan Pengukuran','Pengetahuan dan Pemahaman',2),
      ('Geometri dan Pengukuran','Aplikasi',3),
      ('Geometri dan Pengukuran','Penalaran',2),
      ('Data dan Peluang','Pengetahuan dan Pemahaman',2),
      ('Data dan Peluang','Aplikasi',2),
      ('Data dan Peluang','Penalaran',3)
  ), ranked as (
    select e.*,
           q.quota,
           row_number() over(
             partition by e.element_name,e.cognitive_level
             order by md5(p_seed || ':MAT:' || e.id::text)
           ) rn
    from eligible e
    join quotas q using(element_name,cognitive_level)
  ), selected as (
    select * from ranked where rn <= quota
  ), ordered as (
    select *, row_number() over(order by md5(p_seed || ':MATORDER:' || id::text)) as local_pos
    from selected
  )
  insert into public.exam_question_items(exam_id,section_id,question_id,question_version,position,score_weight)
  select p_exam_id,v_mat_section,id,version,30+local_pos,1
  from ordered;
  get diagnostics v_mat_count = row_count;

  if v_bin_count <> 30 or v_mat_count <> 30 then
    raise exception 'Insufficient blueprint coverage: BIN %, MAT %', v_bin_count, v_mat_count;
  end if;

  if v_rule_id is not null then
    update public.exam_rules
       set config = jsonb_set(
                      jsonb_set(coalesce(config,'{}'::jsonb),'{generationSeed}',to_jsonb(p_seed),true),
                      '{generatedAt}',to_jsonb(now()::text),true
                    ),
           updated_at=now()
     where id=v_rule_id;
  end if;

  return jsonb_build_object('exam_id',p_exam_id,'seed',p_seed,'bin',v_bin_count,'mat',v_mat_count,'total',v_bin_count+v_mat_count);
end;
$function$

CREATE OR REPLACE FUNCTION app_private.get_content_question_detail(p_question_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_actor uuid := auth.uid();
  v_q public.questions%rowtype;
  v_allowed boolean;
  v_result jsonb;
begin
  if v_actor is null then raise exception 'Authentication required'; end if;
  select * into v_q from public.questions where id=p_question_id;
  if not found then raise exception 'Question not found'; end if;

  v_allowed :=
    v_q.author_id=v_actor or v_q.reviewer_id=v_actor or v_q.status in ('approved','published') or
    app_private.current_user_has_permission('content.review') or
    app_private.current_user_has_permission('question.manage');
  if not v_allowed then raise exception 'Question detail access denied'; end if;

  select jsonb_build_object(
    'question',to_jsonb(v_q),
    'options',coalesce((select jsonb_agg(to_jsonb(o) order by o.sort_order) from public.question_options o where o.question_id=v_q.id),'[]'::jsonb),
    'explanation',(select to_jsonb(e) from public.question_explanations e where e.question_id=v_q.id order by e.version desc,e.created_at desc limit 1),
    'stimulus',(select to_jsonb(s) from public.question_stimuli s where s.id=v_q.stimulus_id),
    'knowledge_mappings',coalesce((select jsonb_agg(to_jsonb(qk)) from public.question_knowledge_nodes qk where qk.question_id=v_q.id),'[]'::jsonb),
    'knowledge_nodes',coalesce((select jsonb_agg(to_jsonb(k) order by k.depth,k.sort_order,k.name) from public.knowledge_nodes k where k.id in (select qk.knowledge_node_id from public.question_knowledge_nodes qk where qk.question_id=v_q.id)),'[]'::jsonb),
    'versions',coalesce((select jsonb_agg(to_jsonb(v) order by v.version desc) from public.question_versions v where v.question_id=v_q.id),'[]'::jsonb),
    'reviews',coalesce((select jsonb_agg(to_jsonb(r) order by r.review_round desc,r.created_at desc) from public.content_reviews r where r.entity_type='question' and r.entity_id=v_q.id),'[]'::jsonb),
    'audit_logs',coalesce((select jsonb_agg(to_jsonb(a) order by a.created_at desc) from (select * from public.audit_logs a where a.entity_type='question' and a.entity_id=v_q.id order by a.created_at desc limit 100) a),'[]'::jsonb),
    'stimulus_candidates',coalesce((select jsonb_agg(to_jsonb(s) order by s.updated_at desc) from (select * from public.question_stimuli s where s.program_id=v_q.program_id and s.track_id=v_q.track_id and s.subject_id=v_q.subject_id order by s.updated_at desc limit 100) s),'[]'::jsonb),
    'subject_knowledge_nodes',coalesce((select jsonb_agg(to_jsonb(k) order by k.depth,k.sort_order,k.name) from public.knowledge_nodes k where k.subject_id=v_q.subject_id and upper(k.status)='ACTIVE'),'[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$function$

CREATE OR REPLACE FUNCTION app_private.get_exam_attempt_result_for_user(p_user_id uuid, p_attempt_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_attempt public.exam_attempts%rowtype;
  v_subjects jsonb;
  v_cognitive jsonb;
  v_nodes jsonb;
  v_weak jsonb;
begin
  select * into v_attempt from public.exam_attempts where id=p_attempt_id and user_id=p_user_id;
  if not found then raise exception 'Attempt not found'; end if;
  if v_attempt.status <> 'completed' then raise exception 'Result is available only after submission'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'subjectCode',s.code,'subjectName',s.name,'rawScore',sc.raw_score,'percentage',sc.percentage,
    'correctCount',sc.correct_count,'wrongCount',sc.wrong_count,'unansweredCount',sc.unanswered_count
  ) order by s.sort_order),'[]'::jsonb) into v_subjects
  from public.attempt_scores sc join public.subjects s on s.id=sc.subject_id
  where sc.attempt_id=p_attempt_id;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.subject_code,x.cognitive_level),'[]'::jsonb) into v_cognitive
  from (
    select s.code subject_code,
           aq.question_snapshot->'question'->>'cognitive_level' cognitive_level,
           count(*) question_count,
           round(coalesce(sum(aa.score_awarded),0)/nullif(count(*),0)*100,2) percentage
    from public.attempt_questions aq
    join public.questions q on q.id=aq.question_id
    join public.subjects s on s.id=q.subject_id
    left join public.attempt_answers aa on aa.attempt_question_id=aq.id
    where aq.attempt_id=p_attempt_id
    group by s.code,aq.question_snapshot->'question'->>'cognitive_level'
  ) x;

  with primary_nodes as (
    select aq.id aq_id,(n->>'knowledge_node_id')::uuid node_id
    from public.attempt_questions aq
    cross join lateral jsonb_array_elements(aq.question_snapshot->'knowledge_nodes') n
    where aq.attempt_id=p_attempt_id and n->>'relation_type'='primary'
  ), grouped as (
    select kn.id,kn.name,kn.node_type,s.code subject_code,count(*) question_count,
           round(coalesce(sum(aa.score_awarded),0)/nullif(count(*),0)*100,2) percentage
    from primary_nodes pn
    join public.knowledge_nodes kn on kn.id=pn.node_id
    join public.attempt_questions aq on aq.id=pn.aq_id
    join public.questions q on q.id=aq.question_id
    join public.subjects s on s.id=q.subject_id
    left join public.attempt_answers aa on aa.attempt_question_id=aq.id
    group by kn.id,kn.name,kn.node_type,s.code
  )
  select coalesce(jsonb_agg(to_jsonb(grouped) order by subject_code,percentage,name),'[]'::jsonb) into v_nodes from grouped;

  with primary_nodes as (
    select aq.id aq_id,(n->>'knowledge_node_id')::uuid node_id
    from public.attempt_questions aq
    cross join lateral jsonb_array_elements(aq.question_snapshot->'knowledge_nodes') n
    where aq.attempt_id=p_attempt_id and n->>'relation_type'='primary'
  ), grouped as (
    select kn.name,kn.node_type,s.code subject_code,count(*) question_count,
           round(coalesce(sum(aa.score_awarded),0)/nullif(count(*),0)*100,2) percentage
    from primary_nodes pn
    join public.knowledge_nodes kn on kn.id=pn.node_id
    join public.attempt_questions aq on aq.id=pn.aq_id
    join public.questions q on q.id=aq.question_id
    join public.subjects s on s.id=q.subject_id
    left join public.attempt_answers aa on aa.attempt_question_id=aq.id
    group by kn.name,kn.node_type,s.code
  )
  select coalesce(jsonb_agg(to_jsonb(w) order by w.percentage,w.subject_code,w.name),'[]'::jsonb) into v_weak
  from (select * from grouped order by percentage,subject_code,name limit 5) w;

  return jsonb_build_object(
    'attemptId',v_attempt.id,'status',v_attempt.status,'rawScore',v_attempt.total_score,
    'percentage',v_attempt.percentage,'durationUsedSeconds',v_attempt.duration_used_seconds,
    'subjectScores',v_subjects,'cognitiveBreakdown',v_cognitive,'knowledgeBreakdown',v_nodes,'weakestAreas',v_weak
  );
end;
$function$

CREATE OR REPLACE FUNCTION app_private.get_exam_attempt_review_for_user(p_user_id uuid, p_attempt_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_items jsonb;
begin
  if not exists(select 1 from public.exam_attempts where id=p_attempt_id and user_id=p_user_id and status='completed') then
    raise exception 'Completed attempt not found';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'attemptQuestionId',aq.id,'position',aq.position,'sectionId',aq.section_id,
    'snapshot',aq.question_snapshot,
    'answer',jsonb_build_object(
      'selectedOptionId',aa.selected_option_id,
      'selectedOptionIds',coalesce((select jsonb_agg(aao.option_id) from public.attempt_answer_options aao where aao.attempt_answer_id=aa.id),'[]'::jsonb),
      'answerValue',aa.answer_value,'isCorrect',aa.is_correct,'scoreAwarded',aa.score_awarded,
      'timeSpentSeconds',coalesce(aa.time_spent_seconds,0),'isFlagged',coalesce(aa.is_flagged,false)
    )
  ) order by aq.position),'[]'::jsonb) into v_items
  from public.attempt_questions aq
  left join public.attempt_answers aa on aa.attempt_question_id=aq.id
  where aq.attempt_id=p_attempt_id;

  return jsonb_build_object('attemptId',p_attempt_id,'items',v_items);
end;
$function$

CREATE OR REPLACE FUNCTION app_private.get_exam_attempt_state_for_user(p_user_id uuid, p_attempt_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_attempt public.exam_attempts%rowtype;
  v_active_section uuid;
  v_sections jsonb;
  v_questions jsonb;
  v_answered integer;
  v_total_questions integer;
begin
  select * into v_attempt from public.exam_attempts where id=p_attempt_id and user_id=p_user_id;
  if not found then raise exception 'Attempt not found'; end if;

  select section_id into v_active_section from public.attempt_section_states
  where attempt_id=p_attempt_id and status='active' limit 1;

  select coalesce(jsonb_agg(jsonb_build_object(
    'sectionId',ass.section_id,'title',es.title,'subjectCode',s.code,'sortOrder',es.sort_order,
    'status',ass.status,'questionCount',es.question_count,'durationSeconds',es.duration_seconds,
    'startedAt',ass.started_at,'deadlineAt',ass.deadline_at,
    'remainingSeconds',case when ass.status='active' and ass.deadline_at is not null then greatest(0,floor(extract(epoch from (ass.deadline_at-now())))::integer) when ass.status='completed' then 0 else null end,
    'durationUsedSeconds',ass.duration_used_seconds
  ) order by es.sort_order),'[]'::jsonb) into v_sections
  from public.attempt_section_states ass
  join public.exam_sections es on es.id=ass.section_id
  left join public.subjects s on s.id=es.subject_id
  where ass.attempt_id=p_attempt_id;

  if v_active_section is not null then
    select coalesce(jsonb_agg(jsonb_build_object(
      'attemptQuestionId',aq.id,'position',aq.position,
      'question',aq.question_snapshot->'question',
      'stimulus',aq.question_snapshot->'stimulus',
      'knowledgeNodes',aq.question_snapshot->'knowledge_nodes',
      'options',coalesce((select jsonb_agg(o - 'is_correct' - 'score' order by (o->>'sort_order')::integer) from jsonb_array_elements(aq.question_snapshot->'options') o),'[]'::jsonb),
      'answer',jsonb_build_object(
        'selectedOptionId',aa.selected_option_id,
        'selectedOptionIds',coalesce((select jsonb_agg(aao.option_id) from public.attempt_answer_options aao where aao.attempt_answer_id=aa.id),'[]'::jsonb),
        'answerValue',aa.answer_value,'isFlagged',coalesce(aa.is_flagged,false),'timeSpentSeconds',coalesce(aa.time_spent_seconds,0)
      )
    ) order by aq.position),'[]'::jsonb) into v_questions
    from public.attempt_questions aq
    left join public.attempt_answers aa on aa.attempt_question_id=aq.id
    where aq.attempt_id=p_attempt_id and aq.section_id=v_active_section;
  else
    v_questions := '[]'::jsonb;
  end if;

  select count(*) into v_answered
  from public.attempt_answers aa
  join public.attempt_questions aq on aq.id=aa.attempt_question_id
  where aq.attempt_id=p_attempt_id;

  select count(*) into v_total_questions
  from public.attempt_questions aq
  where aq.attempt_id=p_attempt_id;

  return jsonb_build_object(
    'attemptId',v_attempt.id,'examId',v_attempt.exam_id,'status',v_attempt.status,
    'attemptNumber',v_attempt.attempt_number,'startedAt',v_attempt.started_at,
    'activeSectionId',v_active_section,'answeredCount',v_answered,'totalQuestions',v_total_questions,
    'sections',v_sections,'questions',v_questions
  );
end;
$function$

CREATE OR REPLACE FUNCTION app_private.get_tka_smp_remedial_payload_for_user(p_user_id uuid, p_session_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_session public.remedial_sessions%rowtype;
  v_items jsonb := '[]'::jsonb;
  v_total integer := 0;
  v_completed integer := 0;
  v_pending integer := 0;
begin
  perform app_private.sync_tka_smp_remedial_sessions_for_user(p_user_id);

  select rs.*
    into v_session
  from public.remedial_sessions rs
  join public.tracks t on t.id = rs.track_id
  join public.programs p on p.id = t.program_id
  where rs.id = p_session_id
    and rs.user_id = p_user_id
    and upper(p.code) = 'TKA'
    and upper(t.code) = 'SMP';

  if v_session.id is null then
    return jsonb_build_object('session', null, 'items', '[]'::jsonb);
  end if;

  select
    count(*)::integer,
    count(*) filter (where rsi.status = 'completed')::integer,
    count(*) filter (where rsi.status = 'pending')::integer
    into v_total, v_completed, v_pending
  from public.remedial_session_items rsi
  where rsi.session_id = v_session.id;

  select coalesce(jsonb_agg(item order by position), '[]'::jsonb)
    into v_items
  from (
    select
      rsi.position,
      jsonb_build_object(
        'id', rsi.id,
        'position', rsi.position,
        'status', rsi.status,
        'review_count', rsi.review_count,
        'best_score', rsi.best_score,
        'reason', rsi.reason,
        'wrong_question_id', uwq.id,
        'question_id', rsi.question_id,
        'subject_id', uwq.subject_id,
        'failure_count', uwq.failure_count,
        'wrong_count', uwq.wrong_count,
        'unanswered_count', uwq.unanswered_count,
        'latest_outcome', uwq.latest_outcome,
        'question_snapshot', jsonb_build_object(
          'question', uwq.question_snapshot->'question',
          'stimulus', uwq.question_snapshot->'stimulus',
          'options', coalesce((
            select jsonb_agg(
              (option_row - 'is_correct' - 'score')
              order by coalesce((option_row->>'sort_order')::integer, 0), option_row->>'id'
            )
            from jsonb_array_elements(coalesce(uwq.question_snapshot->'options', '[]'::jsonb)) option_row
          ), '[]'::jsonb),
          'explanations', '[]'::jsonb
        )
      ) as item
    from public.remedial_session_items rsi
    join public.user_wrong_questions uwq on uwq.id = rsi.user_wrong_question_id
    where rsi.session_id = v_session.id
    order by rsi.position
  ) payload_rows;

  return jsonb_build_object(
    'session', jsonb_build_object(
      'id', v_session.id,
      'source_attempt_id', v_session.source_attempt_id,
      'status', v_session.status,
      'total_items', v_total,
      'completed_items', v_completed,
      'pending_items', v_pending,
      'created_at', v_session.created_at,
      'completed_at', v_session.completed_at
    ),
    'items', v_items
  );
end;
$function$

CREATE OR REPLACE FUNCTION app_private.get_user_authorization(p_user_id uuid, p_scope_type text DEFAULT NULL::text, p_scope_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_actor uuid := auth.uid();
  v_roles jsonb;
  v_permissions jsonb;
begin
  if v_actor is null then raise exception 'Authentication required'; end if;
  if p_user_id is null then raise exception 'User id required'; end if;
  if p_user_id <> v_actor and not app_private.current_user_has_permission('admin.access') then
    raise exception 'Authorization lookup denied';
  end if;

  with assignments as (
    select ur.role_id
    from public.user_roles ur
    where ur.user_id=p_user_id
      and (
        (p_scope_type is null and ur.scope_type is null)
        or
        (p_scope_type is not null and (ur.scope_type is null or (ur.scope_type=p_scope_type and ur.scope_id=p_scope_id)))
      )
  ), role_codes as (
    select distinct r.code
    from assignments a join public.roles r on r.id=a.role_id
  )
  select coalesce(jsonb_agg(code order by code),'[]'::jsonb) into v_roles from role_codes;

  with assignments as (
    select ur.role_id
    from public.user_roles ur
    where ur.user_id=p_user_id
      and (
        (p_scope_type is null and ur.scope_type is null)
        or
        (p_scope_type is not null and (ur.scope_type is null or (ur.scope_type=p_scope_type and ur.scope_id=p_scope_id)))
      )
  ), permission_codes as (
    select distinct p.code
    from assignments a
    join public.role_permissions rp on rp.role_id=a.role_id
    join public.permissions p on p.id=rp.permission_id
  )
  select coalesce(jsonb_agg(code order by code),'[]'::jsonb) into v_permissions from permission_codes;

  return jsonb_build_object('user_id',p_user_id,'roles',v_roles,'permissions',v_permissions);
end;
$function$

CREATE OR REPLACE FUNCTION app_private.grant_content_reviewer(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_actor uuid := auth.uid();
  v_role_id uuid;
  v_target public.profiles%rowtype;
  v_is_admin boolean;
begin
  if v_actor is null then
    raise exception 'Authentication required';
  end if;

  select exists(
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = v_actor
      and r.code in ('ADMIN','SUPER_ADMIN')
      and ur.scope_type is null
      and ur.scope_id is null
  ) into v_is_admin;

  if not v_is_admin then
    raise exception 'Admin role required';
  end if;

  select * into v_target
  from public.profiles
  where id = p_user_id and status = 'active';

  if not found then
    raise exception 'Target profile not found or inactive';
  end if;

  select id into v_role_id
  from public.roles
  where code = 'CONTENT_REVIEWER';

  if v_role_id is null then
    raise exception 'CONTENT_REVIEWER role not found';
  end if;

  if not exists (
    select 1 from public.user_roles
    where user_id = p_user_id
      and role_id = v_role_id
      and scope_type is null
      and scope_id is null
  ) then
    insert into public.user_roles(user_id, role_id, scope_type, scope_id)
    values (p_user_id, v_role_id, null, null);
  end if;

  return jsonb_build_object(
    'user_id', p_user_id,
    'role', 'CONTENT_REVIEWER',
    'granted', true
  );
end;
$function$

CREATE OR REPLACE FUNCTION app_private.guard_exam_question_item()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_q_status text;
  v_q_version integer;
  v_q_program uuid;
  v_q_track uuid;
  v_exam_program uuid;
  v_exam_track uuid;
begin
  select status, version, program_id, track_id
    into v_q_status, v_q_version, v_q_program, v_q_track
  from public.questions where id=new.question_id;

  if v_q_status is null then raise exception 'Question not found'; end if;
  if v_q_status not in ('approved','published') then
    raise exception 'Only approved/published questions can be added to an exam; question status is %', v_q_status;
  end if;
  if new.question_version <> v_q_version then
    raise exception 'Exam question version % does not match current question version %', new.question_version, v_q_version;
  end if;

  select program_id, track_id into v_exam_program, v_exam_track
  from public.exams where id=new.exam_id;
  if v_exam_program is distinct from v_q_program or v_exam_track is distinct from v_q_track then
    raise exception 'Question program/track does not match exam program/track';
  end if;

  return new;
end;
$function$

CREATE OR REPLACE FUNCTION app_private.has_active_feature(target_feature uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1
    from public.entitlements e
    where e.user_id = (select auth.uid())
      and e.feature_id = target_feature
      and upper(e.status) = 'ACTIVE'
      and e.starts_at <= now()
      and (e.expires_at is null or e.expires_at > now())
      and (e.usage_limit is null or e.usage_count < e.usage_limit)
  );
$function$

CREATE OR REPLACE FUNCTION app_private.has_permission(required_permission text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1
    from public.user_roles ur
    join public.role_permissions rp on rp.role_id = ur.role_id
    join public.permissions p on p.id = rp.permission_id
    where ur.user_id = (select auth.uid())
      and p.code = required_permission
  );
$function$

CREATE OR REPLACE FUNCTION app_private.is_org_member(org_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1 from public.organization_members om
    where om.organization_id = org_id
      and om.user_id = (select auth.uid())
      and upper(om.status) = 'ACTIVE'
  );
$function$

CREATE OR REPLACE FUNCTION app_private.list_content_people()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_actor uuid := auth.uid();
  v_result jsonb;
begin
  if v_actor is null then raise exception 'Authentication required'; end if;
  if not (
    app_private.current_user_has_permission('content.read') or
    app_private.current_user_has_permission('content.create') or
    app_private.current_user_has_permission('content.update') or
    app_private.current_user_has_permission('content.review') or
    app_private.current_user_has_permission('content.publish') or
    app_private.current_user_has_permission('question.manage')
  ) then raise exception 'Content workspace permission required'; end if;

  select coalesce(jsonb_agg(person order by person->>'full_name'),'[]'::jsonb) into v_result
  from (
    select jsonb_build_object(
      'id',pr.id,
      'full_name',pr.full_name,
      'display_name',pr.display_name,
      'avatar_url',pr.avatar_url,
      'status',pr.status,
      'can_review',exists(
        select 1 from public.user_roles ur
        join public.role_permissions rp on rp.role_id=ur.role_id
        join public.permissions pe on pe.id=rp.permission_id
        where ur.user_id=pr.id and pe.code='content.review'
      ),
      'roles',coalesce((
        select jsonb_agg(distinct r.code order by r.code)
        from public.user_roles ur
        join public.roles r on r.id=ur.role_id
        where ur.user_id=pr.id
      ),'[]'::jsonb)
    ) as person
    from public.profiles pr
    where pr.status='active'
      and exists(
        select 1 from public.user_roles ur
        join public.role_permissions rp on rp.role_id=ur.role_id
        join public.permissions pe on pe.id=rp.permission_id
        where ur.user_id=pr.id and pe.code in ('content.read','content.create','content.update','content.review','content.publish','question.manage')
      )
  ) x;
  return v_result;
end;
$function$
