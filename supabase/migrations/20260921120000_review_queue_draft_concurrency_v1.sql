-- Review Queue P1 — optimistic concurrency + pelestarian ID opsi pada draft.
--
-- DUA MASALAH YANG DITUTUP
--   1. `save_question_draft` tidak memeriksa versi sama sekali. Dua editor yang
--      membuka soal yang sama dapat saling menimpa tanpa peringatan
--      (last-write-wins). Jalur Question Bank (`mutate_question_bank`) sudah
--      memakai version + updated_at + row lock; RPC ini disamakan.
--   2. Setiap simpan menghapus lalu menyisipkan ulang SELURUH opsi, sehingga ID
--      opsi berubah. Kini opsi di-upsert `on conflict (question_id, option_key)`;
--      hanya opsi yang benar-benar dihapus dari form yang hilang.
--
-- Signature berubah (dua parameter token di akhir), jadi fungsi lama di-drop
-- lebih dulu; grant ulang dilakukan di akhir migration ini.
begin;

drop function if exists public.save_question_draft(uuid,text,text,text,text,text,text,text,integer,text,uuid,text,uuid,jsonb,text);
drop function if exists app_private.save_question_draft(uuid,text,text,text,text,text,text,text,integer,text,uuid,text,uuid,jsonb,text);

create function app_private.save_question_draft(
  p_question_id uuid,
  p_program_code text,
  p_track_code text,
  p_subject_code text,
  p_question_type text,
  p_stem text,
  p_difficulty text,
  p_cognitive_level text,
  p_estimated_seconds integer,
  p_source_reference text,
  p_stimulus_id uuid,
  p_explanation text,
  p_knowledge_node_id uuid,
  p_options jsonb,
  p_change_reason text,
  p_expected_version integer,
  p_expected_updated_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
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

  select id into v_program_id from public.programs
  where upper(code)=upper(trim(p_program_code)) and upper(status)='ACTIVE' limit 1;
  if v_program_id is null then raise exception 'Program not found'; end if;

  select id into v_track_id from public.tracks
  where program_id=v_program_id and upper(code)=upper(trim(p_track_code)) and upper(status)='ACTIVE' limit 1;
  if v_track_id is null then raise exception 'Track not found'; end if;

  select id into v_subject_id from public.subjects
  where track_id=v_track_id and upper(code)=upper(trim(p_subject_code)) and upper(status)='ACTIVE' limit 1;
  if v_subject_id is null then raise exception 'Subject not found'; end if;

  if lower(trim(p_question_type)) not in ('single_choice','multiple_choice','category') then raise exception 'Invalid question type'; end if;
  if nullif(trim(p_stem),'') is null then raise exception 'Question stem required'; end if;
  if p_estimated_seconds is not null and p_estimated_seconds <= 0 then raise exception 'Estimated seconds invalid'; end if;

  if p_stimulus_id is not null and not exists(
    select 1 from public.question_stimuli s
    where s.id=p_stimulus_id and s.program_id=v_program_id and s.track_id=v_track_id and s.subject_id=v_subject_id
  ) then raise exception 'Stimulus does not match question context'; end if;

  if p_knowledge_node_id is not null and not exists(
    select 1 from public.knowledge_nodes k
    where k.id=p_knowledge_node_id and k.subject_id=v_subject_id and upper(k.status)='ACTIVE'
  ) then raise exception 'Knowledge node does not match subject'; end if;

  if p_options is null or jsonb_typeof(p_options) <> 'array' then raise exception 'Options must be an array'; end if;
  v_option_count := jsonb_array_length(p_options);
  if v_option_count < 2 then raise exception 'At least two options required'; end if;
  if exists(select 1 from jsonb_array_elements(p_options) o where nullif(trim(o->>'key'),'') is null or nullif(trim(o->>'content'),'') is null) then raise exception 'Option key and content required'; end if;
  select count(distinct upper(trim(o->>'key'))) into v_distinct_keys from jsonb_array_elements(p_options) o;
  if v_distinct_keys <> v_option_count then raise exception 'Option keys must be unique'; end if;
  if exists(select 1 from jsonb_array_elements(p_options) o where nullif(o->>'score','') is not null and (o->>'score')::numeric < 0) then raise exception 'Option score cannot be negative'; end if;
  select count(*) filter (where coalesce((o->>'is_correct')::boolean,false)) into v_correct_count from jsonb_array_elements(p_options) o;

  if lower(trim(p_question_type))='single_choice' and v_correct_count <> 1 then raise exception 'Single choice requires exactly one correct option'; end if;
  if lower(trim(p_question_type))='multiple_choice' and (v_option_count < 3 or v_correct_count < 2 or v_correct_count >= v_option_count) then
    raise exception 'Multiple choice requires at least three options and at least two, but not all, correct options';
  end if;
  if lower(trim(p_question_type))='category' then
    select count(distinct nullif(trim(o->>'response_group'),'')) into v_group_count from jsonb_array_elements(p_options) o;
    if v_group_count < 2 then raise exception 'Category requires at least two response groups'; end if;
    if exists(
      select 1 from (
        select nullif(trim(o->>'response_group'),'') as response_group,
               count(*) as option_count,
               count(*) filter (where coalesce((o->>'is_correct')::boolean,false)) as correct_count
        from jsonb_array_elements(p_options) o
        group by nullif(trim(o->>'response_group'),'')
      ) g
      where g.response_group is null or g.option_count < 2 or g.correct_count <> 1
    ) then raise exception 'Each category response group requires at least two options and exactly one correct option'; end if;
  end if;

  if not v_is_new then
    select * into v_q from public.questions where id=p_question_id for update;
    if not found then raise exception 'Question not found'; end if;
    if v_q.program_id<>v_program_id or v_q.track_id<>v_track_id then raise exception 'Question context mismatch'; end if;
    if lower(v_q.status) not in ('draft','revision_required','rejected') then raise exception 'Question not editable in current status'; end if;
    if v_q.author_id<>v_actor and not v_can_manage then raise exception 'Only author or question manager can edit this question'; end if;

    -- Token concurrency: form harus membawa versi + updated_at yang sedang
    -- dilihat editor. Bila soal sudah berubah, tolak alih-alih menimpa.
    if p_expected_version is distinct from v_q.version
       or p_expected_updated_at is distinct from v_q.updated_at then
      raise exception 'QUESTION_VERSION_CONFLICT';
    end if;

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
    update public.questions set
      subject_id=v_subject_id,
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
    if p_expected_version is not null or p_expected_updated_at is not null then
      raise exception 'QUESTION_VERSION_INVALID';
    end if;
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

  -- Hanya opsi yang benar-benar dihapus dari form yang dihapus dari database;
  -- opsi yang masih ada di-upsert sehingga ID-nya dipertahankan.
  delete from public.question_options where question_id=v_question_id
    and option_key not in (select upper(trim(o->>'key')) from jsonb_array_elements(p_options) o);
  insert into public.question_options(question_id,option_key,content,is_correct,score,sort_order,image_url,response_group,response_group_order,metadata)
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
  from jsonb_array_elements(p_options) with ordinality as o(value,ordinality)
  on conflict (question_id,option_key) do update set
    content=excluded.content,
    is_correct=excluded.is_correct,
    score=excluded.score,
    sort_order=excluded.sort_order,
    image_url=excluded.image_url,
    response_group=excluded.response_group,
    response_group_order=excluded.response_group_order,
    metadata=excluded.metadata;

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
$$;

create function public.save_question_draft(
  p_question_id uuid,p_program_code text,p_track_code text,p_subject_code text,p_question_type text,p_stem text,p_difficulty text,
  p_cognitive_level text,p_estimated_seconds integer,p_source_reference text,p_stimulus_id uuid,p_explanation text,
  p_knowledge_node_id uuid,p_options jsonb,p_change_reason text,p_expected_version integer,p_expected_updated_at timestamptz
)
returns jsonb language sql set search_path = '' as $$
  select app_private.save_question_draft(p_question_id,p_program_code,p_track_code,p_subject_code,p_question_type,p_stem,p_difficulty,p_cognitive_level,p_estimated_seconds,p_source_reference,p_stimulus_id,p_explanation,p_knowledge_node_id,p_options,p_change_reason,p_expected_version,p_expected_updated_at);
$$;

revoke all on function public.save_question_draft(uuid,text,text,text,text,text,text,text,integer,text,uuid,text,uuid,jsonb,text,integer,timestamptz) from public, anon;
grant execute on function public.save_question_draft(uuid,text,text,text,text,text,text,text,integer,text,uuid,text,uuid,jsonb,text,integer,timestamptz) to authenticated;
grant execute on function app_private.save_question_draft(uuid,text,text,text,text,text,text,text,integer,text,uuid,text,uuid,jsonb,text,integer,timestamptz) to authenticated;

notify pgrst,'reload schema';
commit;
