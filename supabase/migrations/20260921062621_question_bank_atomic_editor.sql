-- Question Bank: authenticated, transactional writes with optimistic concurrency.
-- Apply to staging first. Production requires explicit GO.
begin;
create or replace function app_private.assert_question_bank_permission(p_permission text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and lower(status)='active') then
    raise exception 'QUESTION_ACCESS_DENIED';
  end if;
  if not exists(select 1 from public.user_roles ur join public.role_permissions rp on rp.role_id=ur.role_id
    join public.permissions p on p.id=rp.permission_id where ur.user_id=auth.uid() and ur.scope_type is null and p.code=p_permission) then
    raise exception 'QUESTION_ACCESS_DENIED';
  end if;
end $$;
revoke all on function app_private.assert_question_bank_permission(text) from public, anon, authenticated;

create or replace function app_private.question_bank_editor(p_program text, p_track text, p_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_program uuid; v_track uuid; v_q public.questions%rowtype;
begin
  perform app_private.assert_question_bank_permission('question.manage');
  select p.id,t.id into v_program,v_track from public.programs p join public.tracks t on t.program_id=p.id
    where p.code=p_program and t.code=p_track and upper(p.status)='ACTIVE' and upper(t.status)='ACTIVE';
  if v_track is null then raise exception 'QUESTION_CATALOG_MISMATCH'; end if;
  -- A single SQL statement below reads question, options and version from one MVCC snapshot.
  if p_id is not null and not exists(select 1 from public.questions where id=p_id and program_id=v_program and track_id=v_track) then
    raise exception 'QUESTION_NOT_FOUND';
  end if;
  return jsonb_build_object(
    'question',(select to_jsonb(q) from public.questions q where q.id=p_id and q.track_id=v_track),
    'options',coalesce((select jsonb_agg(to_jsonb(o) order by o.sort_order,o.id) from public.question_options o where question_id=p_id),'[]'),
    'explanation',coalesce((select content from public.question_explanations where question_id=p_id order by version desc,created_at desc limit 1),''),
    'knowledgeNodeId',coalesce((select knowledge_node_id::text from public.question_knowledge_nodes where question_id=p_id and relation_type='primary' limit 1),''),
    'stimuli',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'subject_id',s.subject_id,'title',s.title,'content',s.content,'image_url',s.image_url) order by s.stimulus_code) from public.question_stimuli s where s.track_id=v_track),'[]'),
    'knowledgeNodes',coalesce((select jsonb_agg(jsonb_build_object('id',k.id,'subject_id',k.subject_id,'name',k.name) order by k.name) from public.knowledge_nodes k join public.subjects s on s.id=k.subject_id where s.track_id=v_track and upper(k.status)='ACTIVE'),'[]'),
    'versions',coalesce((select jsonb_agg(to_jsonb(v) order by v.version desc) from (select version,change_reason,created_at from public.question_versions where question_id=p_id order by version desc limit 20) v),'[]')
  );
end $$;

create or replace function app_private.mutate_question_bank(p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid(); v_q public.questions%rowtype; v_id uuid := nullif(p_payload->>'id','')::uuid;
  v_program uuid; v_track uuid; v_subject uuid; v_version integer; v_snapshot jsonb; v_old_action text;
  v_op text := p_payload->>'operation'; v_options jsonb := p_payload->'options'; v_type text := p_payload->>'questionType';
  v_count integer; v_correct integer; v_stimulus uuid := nullif(p_payload->>'stimulusId','')::uuid;
  v_node uuid := nullif(p_payload->>'knowledgeNodeId','')::uuid; v_reason text := btrim(p_payload->>'changeReason');
  v_explanation public.question_explanations%rowtype;
begin
  perform app_private.assert_question_bank_permission('question.manage');
  if v_op is null or v_op not in ('save','publish','archive','revise') then raise exception 'QUESTION_OPERATION_INVALID'; end if;
  if v_reason is null or length(v_reason)=0 or length(v_reason)>2000 then raise exception 'QUESTION_REASON_REQUIRED'; end if;
  select p.id,t.id into v_program,v_track from public.programs p join public.tracks t on t.program_id=p.id
    where p.code=p_payload->>'program' and t.code=p_payload->>'track' and upper(p.status)='ACTIVE' and upper(t.status)='ACTIVE';
  if v_track is null then raise exception 'QUESTION_CATALOG_MISMATCH'; end if;
  if v_id is not null then
    select * into v_q from public.questions where id=v_id for update;
    if not found or v_q.program_id<>v_program or v_q.track_id<>v_track then raise exception 'QUESTION_NOT_FOUND'; end if;
    if (p_payload->>'expectedVersion')::integer is distinct from v_q.version
       or (p_payload->>'expectedUpdatedAt')::timestamptz is distinct from v_q.updated_at then raise exception 'QUESTION_VERSION_CONFLICT'; end if;
    v_snapshot := app_private.question_snapshot_json(v_id);
  elsif v_op<>'save' then raise exception 'QUESTION_NOT_FOUND';
  end if;
  v_old_action := current_setting('app.workflow_action',true);
  perform set_config('app.workflow_action','question_bank',true);

  if v_op='publish' then
    perform app_private.assert_question_bank_permission('content.publish');
    perform app_private.publish_question(v_id);
  elsif v_op in ('archive','revise') then
    if v_q.status='published' then perform app_private.assert_question_bank_permission('content.publish'); end if;
    if v_op='revise' and v_q.status not in ('approved','published','archived','rejected') then raise exception 'QUESTION_WORKFLOW_LOCKED'; end if;
    -- Returning to draft invalidates old review approvals; subsequent submission creates a fresh round.
    update public.content_reviews set status='cancelled' where entity_type='question' and entity_id=v_id and status='pending';
    update public.questions set status=case when v_op='archive' then 'archived' else 'draft' end,
      reviewer_id=null,updated_at=clock_timestamp() where id=v_id;
  else
    if v_id is not null and v_q.status not in ('draft','revision_required','rejected') then raise exception 'QUESTION_WORKFLOW_LOCKED'; end if;
    select id into v_subject from public.subjects where track_id=v_track and code=p_payload->>'subject' and upper(status)='ACTIVE';
    if v_subject is null then raise exception 'SUBJECT_INVALID'; end if;
    if v_type is null or v_type not in ('single_choice','multiple_choice','category') then raise exception 'QUESTION_TYPE_INVALID'; end if;
    if coalesce(length(btrim(p_payload->>'stem')),0)=0 or length(p_payload->>'stem')>50000 then raise exception 'QUESTION_STEM_REQUIRED'; end if;
    if coalesce(p_payload->>'difficulty','') not in ('easy','medium','hard') then raise exception 'QUESTION_DIFFICULTY_INVALID'; end if;
    if length(coalesce(p_payload->>'explanation',''))>50000 or length(coalesce(p_payload->>'sourceReference',''))>2000 or length(coalesce(p_payload->>'cognitiveLevel',''))>100 then raise exception 'QUESTION_FIELDS_TOO_LONG'; end if;
    if nullif(p_payload->>'estimatedSeconds','') is not null and (p_payload->>'estimatedSeconds')::integer not between 1 and 86400 then raise exception 'QUESTION_ESTIMATED_SECONDS_INVALID'; end if;
    if v_stimulus is not null and not exists(select 1 from public.question_stimuli where id=v_stimulus and program_id=v_program and track_id=v_track and subject_id=v_subject) then raise exception 'QUESTION_STIMULUS_MISMATCH'; end if;
    if v_node is not null and not exists(select 1 from public.knowledge_nodes where id=v_node and subject_id=v_subject and upper(status)='ACTIVE') then raise exception 'QUESTION_NODE_MISMATCH'; end if;
    if v_options is null or jsonb_typeof(v_options)<>'array' then raise exception 'QUESTION_OPTIONS_REQUIRED'; end if;
    v_count := jsonb_array_length(v_options);
    if v_count<2 or v_count>100 then raise exception 'QUESTION_OPTIONS_REQUIRED'; end if;
    if exists(select 1 from jsonb_array_elements(v_options) o where jsonb_typeof(o)<>'object'
      or coalesce(o->>'key','') !~ '^[A-Z0-9_-]{1,16}$' or coalesce(length(btrim(o->>'content')),0)=0
      or length(o->>'content')>20000 or length(coalesce(o->>'responseGroup',''))>200
      or (o->'isCorrect' is not null and jsonb_typeof(o->'isCorrect') not in ('boolean','null'))
      or (nullif(o->>'score','') is not null and ((o->>'score')::numeric not between 0 and 99999999.99 or (o->>'score')::numeric<>round((o->>'score')::numeric,2)))
      or (nullif(o->>'responseGroupOrder','') is not null and (o->>'responseGroupOrder')::integer<1)
      or (nullif(o->>'imageUrl','') is not null and (length(o->>'imageUrl')>2000 or o->>'imageUrl' !~ '^https://[^/@[:space:]]+([/:?#][^[:space:]]*)?$'))
    ) then raise exception 'QUESTION_OPTIONS_INVALID'; end if;
    if (select count(distinct o->>'key') from jsonb_array_elements(v_options) o)<>v_count then raise exception 'QUESTION_OPTION_KEYS_DUPLICATE'; end if;
    select count(*) into v_correct from jsonb_array_elements(v_options) o where (o->>'isCorrect')::boolean is true;
    if v_type='single_choice' and v_correct<>1 then raise exception 'QUESTION_CORRECT_OPTION_REQUIRED'; end if;
    if v_type='multiple_choice' and (v_count<3 or v_correct<2 or v_correct>=v_count) then raise exception 'QUESTION_MULTIPLE_CHOICE_INVALID'; end if;
    if v_type='category' then
      if (select count(distinct nullif(btrim(o->>'responseGroup'),'')) from jsonb_array_elements(v_options) o)<2 then raise exception 'QUESTION_CATEGORY_INVALID'; end if;
      if exists(select 1 from jsonb_array_elements(v_options) o group by nullif(btrim(o->>'responseGroup'),'')
        having nullif(btrim(o->>'responseGroup'),'') is null or count(*)<2 or count(*) filter(where (o->>'isCorrect')::boolean is true)<>1) then raise exception 'QUESTION_CATEGORY_INVALID'; end if;
    end if;
    if v_id is not null and exists(select 1 from public.attempt_questions aq join public.exam_attempts ea on ea.id=aq.attempt_id where aq.question_id=v_id and lower(ea.status) in ('created','in_progress')) then raise exception 'QUESTION_LOCKED_BY_ACTIVE_ATTEMPT'; end if;
    if v_id is null then
      insert into public.questions(question_code,program_id,track_id,subject_id,question_type,stem,difficulty,author_id,status,version)
      values('QB-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,16)),v_program,v_track,v_subject,v_type,p_payload->>'stem',p_payload->>'difficulty',v_actor,'draft',1) returning id into v_id;
      v_version := 1;
    else
      -- Preserve canonical snapshots without overwriting a historical version.
      perform app_private.ensure_question_snapshot(v_id,v_actor,v_reason);
      select greatest(q.version,coalesce((select max(version) from public.question_versions where question_id=v_id),0))+1 into v_version from public.questions q where q.id=v_id;
    end if;
    update public.questions set subject_id=v_subject,question_type=v_type,stem=p_payload->>'stem',difficulty=p_payload->>'difficulty',
      cognitive_level=nullif(p_payload->>'cognitiveLevel',''),source_reference=nullif(p_payload->>'sourceReference',''),
      estimated_seconds=nullif(p_payload->>'estimatedSeconds','')::integer,stimulus_id=v_stimulus,
      status=case when v_q.status='revision_required' then 'revision_required' else 'draft' end,
      version=v_version,reviewer_id=null,updated_at=clock_timestamp() where id=v_id;
    delete from public.question_options where question_id=v_id and option_key not in (select o->>'key' from jsonb_array_elements(v_options) o);
    insert into public.question_options(question_id,option_key,content,is_correct,score,sort_order,response_group,response_group_order,image_url)
    select v_id,o->>'key',o->>'content',(o->>'isCorrect')::boolean,nullif(o->>'score','')::numeric,ord::integer,
      nullif(btrim(o->>'responseGroup'),''),nullif(o->>'responseGroupOrder','')::integer,nullif(o->>'imageUrl','')
    from jsonb_array_elements(v_options) with ordinality as opts(o,ord)
    on conflict(question_id,option_key) do update set content=excluded.content,is_correct=excluded.is_correct,score=excluded.score,
      sort_order=excluded.sort_order,response_group=excluded.response_group,response_group_order=excluded.response_group_order,image_url=excluded.image_url;
    select * into v_explanation from public.question_explanations where question_id=v_id order by version desc,created_at desc limit 1;
    if found then
      update public.question_explanations set content=coalesce(p_payload->>'explanation',''),version=v_version,updated_at=clock_timestamp() where id=v_explanation.id;
    elsif coalesce(p_payload->>'explanation','')<>'' then
      insert into public.question_explanations(question_id,content,version) values(v_id,p_payload->>'explanation',v_version);
    end if;
    -- A subject move must not leave secondary mappings pointing into the old subject.
    -- The pre-edit snapshot retains all previous mappings for history.
    delete from public.question_knowledge_nodes qk using public.knowledge_nodes k
      where qk.question_id=v_id and qk.knowledge_node_id=k.id and k.subject_id<>v_subject;
    delete from public.question_knowledge_nodes where question_id=v_id and relation_type='primary' and knowledge_node_id is distinct from v_node;
    if v_node is not null then insert into public.question_knowledge_nodes(question_id,knowledge_node_id,relation_type) values(v_id,v_node,'primary')
      on conflict(question_id,knowledge_node_id) do update set relation_type='primary'; end if;
  end if;
  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,old_data,new_data)
    values(v_actor,case v_op when 'publish' then 'PUBLISH_QUESTION' when 'archive' then 'ARCHIVE_QUESTION' when 'revise' then 'REVISE_QUESTION'
      else case when v_q.id is null then 'CREATE_QUESTION' else 'UPDATE_QUESTION' end end,'question',v_id,
      case when v_q.id is null then null else jsonb_build_object('version',v_q.version,'status',v_q.status) end,
      jsonb_build_object('reason',v_reason,'label',(select question_code from public.questions where id=v_id),'version',(select version from public.questions where id=v_id)));
  perform set_config('app.workflow_action',coalesce(v_old_action,''),true);
  return (select jsonb_build_object('id',id,'version',version,'status',status,'updated_at',updated_at) from public.questions where id=v_id);
end $$;

create or replace function public.get_question_bank_editor(p_program text,p_track text,p_id uuid default null)
returns jsonb language sql security invoker set search_path='' as $$ select app_private.question_bank_editor(p_program,p_track,p_id); $$;
create or replace function public.mutate_question_bank(p_payload jsonb)
returns jsonb language sql security invoker set search_path='' as $$ select app_private.mutate_question_bank(p_payload); $$;
revoke all on function app_private.question_bank_editor(text,text,uuid),app_private.mutate_question_bank(jsonb),public.get_question_bank_editor(text,text,uuid),public.mutate_question_bank(jsonb) from public,anon;
grant execute on function app_private.question_bank_editor(text,text,uuid),app_private.mutate_question_bank(jsonb),public.get_question_bank_editor(text,text,uuid),public.mutate_question_bank(jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
