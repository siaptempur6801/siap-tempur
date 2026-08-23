create or replace function app_private.validate_cpns_legacy_mapping_review()
returns trigger
language plpgsql
set search_path = pg_catalog, public, app_private
as $$
declare
  v_subject_id uuid;
  v_primary_subject_id uuid;
  v_secondary_subject_id uuid;
begin
  select s.id into v_subject_id
  from public.subjects s
  join public.tracks t on t.id = s.track_id
  join public.programs p on p.id = t.program_id
  where p.code = 'CPNS' and t.code = 'SKD' and s.code = new.subject_code
  limit 1;

  if v_subject_id is null then
    raise exception 'Invalid CPNS SKD subject_code: %', new.subject_code;
  end if;

  if new.review_status = 'reviewed' then
    if new.primary_node_code is null then
      raise exception 'Reviewed mapping requires primary_node_code for %', new.source_question_code;
    end if;
    if new.review_method is null or new.reviewed_at is null or new.reviewed_by is null then
      raise exception 'Reviewed mapping requires review_method, reviewed_at, and reviewed_by for %', new.source_question_code;
    end if;

    select kn.subject_id into v_primary_subject_id
    from public.knowledge_nodes kn where kn.code = new.primary_node_code limit 1;
    if v_primary_subject_id is null then
      raise exception 'Unknown primary knowledge node % for %', new.primary_node_code, new.source_question_code;
    end if;
    if v_primary_subject_id <> v_subject_id then
      raise exception 'Primary node % does not belong to subject % for %', new.primary_node_code, new.subject_code, new.source_question_code;
    end if;

    if new.secondary_node_code is not null then
      select kn.subject_id into v_secondary_subject_id
      from public.knowledge_nodes kn where kn.code = new.secondary_node_code limit 1;
      if v_secondary_subject_id is null then
        raise exception 'Unknown secondary knowledge node % for %', new.secondary_node_code, new.source_question_code;
      end if;
      if v_secondary_subject_id <> v_subject_id then
        raise exception 'Secondary node % does not belong to subject % for %', new.secondary_node_code, new.subject_code, new.source_question_code;
      end if;
    end if;
  else
    if new.primary_node_code is not null or new.secondary_node_code is not null then
      raise exception 'Unresolved mapping must not contain knowledge-node decisions for %', new.source_question_code;
    end if;
    if new.review_status in ('needs_revision', 'blocked')
       and (new.review_method is null or new.reviewed_at is null or new.reviewed_by is null) then
      raise exception '% mapping requires review_method, reviewed_at, and reviewed_by for %', new.review_status, new.source_question_code;
    end if;
  end if;

  if new.secondary_node_code is not null and new.secondary_node_code = new.primary_node_code then
    raise exception 'Primary and secondary nodes must differ for %', new.source_question_code;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.stage_cpns_legacy_question(
  p_source_question_id uuid,
  p_source_question_code text,
  p_payload jsonb
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, app_private
as $$
declare
  v_payload_subject text;
begin
  if p_source_question_id is null or nullif(btrim(p_source_question_code), '') is null then
    raise exception 'source_question_id and source_question_code are required';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'payload must be a JSON object for %', p_source_question_code;
  end if;
  if p_payload->>'sourceQuestionId' is distinct from p_source_question_id::text then
    raise exception 'payload sourceQuestionId mismatch for %', p_source_question_code;
  end if;
  if p_payload->>'questionCode' is distinct from p_source_question_code then
    raise exception 'payload questionCode mismatch for %', p_source_question_code;
  end if;

  v_payload_subject := p_payload->>'subject';
  if v_payload_subject not in ('TWK','TIU','TKP') then
    raise exception 'invalid payload subject % for %', v_payload_subject, p_source_question_code;
  end if;
  if nullif(btrim(p_payload->>'stem'), '') is null then
    raise exception 'payload stem is required for %', p_source_question_code;
  end if;
  if jsonb_typeof(p_payload->'options') <> 'array' or jsonb_array_length(p_payload->'options') <> 5 then
    raise exception 'payload must contain exactly 5 options for %', p_source_question_code;
  end if;

  insert into app_private.cpns_legacy_import_stage (
    source_question_id, source_question_code, payload, staged_at, updated_at
  ) values (
    p_source_question_id, p_source_question_code, p_payload, now(), now()
  )
  on conflict (source_question_id) do update
    set source_question_code = excluded.source_question_code,
        payload = excluded.payload,
        updated_at = now();
end;
$$;

create or replace function public.import_reviewed_cpns_legacy_question(
  p_source_question_id uuid,
  p_publish boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, app_private
as $$
declare
  v_ready record;
  v_program_id uuid;
  v_track_id uuid;
  v_subject_id uuid;
  v_question_id uuid;
  v_existing_source_type text;
  v_existing_source_reference text;
  v_option jsonb;
  v_sort integer;
  v_option_key text;
  v_correct_count integer;
  v_score numeric;
begin
  select * into v_ready
  from app_private.cpns_legacy_import_ready
  where source_question_id = p_source_question_id;

  if not found then
    raise exception 'Legacy question % is not import-ready: raw payload missing, mapping unresolved, or node invalid', p_source_question_id;
  end if;

  select p.id, t.id, s.id into v_program_id, v_track_id, v_subject_id
  from public.programs p
  join public.tracks t on t.program_id = p.id and t.code = 'SKD'
  join public.subjects s on s.track_id = t.id and s.code = v_ready.subject_code
  where p.code = 'CPNS'
  limit 1;

  if v_program_id is null or v_track_id is null or v_subject_id is null then
    raise exception 'Canonical CPNS/SKD/% catalog is missing', v_ready.subject_code;
  end if;
  if v_ready.payload->>'subject' is distinct from v_ready.subject_code then
    raise exception 'Raw payload subject and reviewed subject differ for %', v_ready.source_question_code;
  end if;

  select count(*)::integer into v_correct_count
  from jsonb_array_elements(v_ready.payload->'options') o
  where coalesce((o->>'isCorrect')::boolean, false);
  if v_correct_count <> 1 then
    raise exception 'Expected exactly one isCorrect option for %, got %', v_ready.source_question_code, v_correct_count;
  end if;

  select q.id, q.source_type, q.source_reference
    into v_question_id, v_existing_source_type, v_existing_source_reference
  from public.questions q where q.question_code = v_ready.source_question_code;

  if v_question_id is not null then
    if v_existing_source_type <> 'legacy_migration'
       or v_existing_source_reference is distinct from v_ready.source_question_code then
      raise exception 'Question code % already exists but is not the same legacy import', v_ready.source_question_code;
    end if;
    return v_question_id;
  end if;

  insert into public.questions (
    question_code, program_id, track_id, subject_id, question_type, stem,
    difficulty, cognitive_level, source_type, source_reference, estimated_seconds,
    status, version, author_id, reviewer_id, published_at, stimulus_id,
    stimulus_order, response_config, created_at, updated_at
  ) values (
    v_ready.source_question_code, v_program_id, v_track_id, v_subject_id,
    'single_choice', v_ready.payload->>'stem', 'unclassified', null,
    'legacy_migration', v_ready.source_question_code, null,
    case when p_publish then 'published' else 'draft' end,
    1, v_ready.reviewed_by, v_ready.reviewed_by,
    case when p_publish then now() else null end,
    null, 1,
    jsonb_build_object(
      'scoringMode','single_option',
      'legacySourceQuestionId',v_ready.source_question_id,
      'legacyCategory',v_ready.legacy_category,
      'legacySubCategory',v_ready.legacy_sub_category,
      'mappingReview',jsonb_build_object(
        'method',v_ready.review_method,
        'notes',v_ready.review_notes,
        'reviewedAt',v_ready.reviewed_at,
        'primaryNodeCode',v_ready.primary_node_code,
        'secondaryNodeCode',v_ready.secondary_node_code
      ),
      'migrationBatch','CPNS-LEGACY-MANUAL-MAPPING'
    ),
    now(), now()
  ) returning id into v_question_id;

  for v_option in select value from jsonb_array_elements(v_ready.payload->'options') loop
    v_sort := nullif(v_option->>'sortOrder','')::integer;
    if v_sort is null or v_sort < 1 or v_sort > 5 then
      raise exception 'Invalid option sortOrder for %', v_ready.source_question_code;
    end if;
    v_option_key := chr(64 + v_sort);
    v_score := coalesce(nullif(v_option->>'score','')::numeric,0);
    insert into public.question_options (
      question_id, option_key, content, is_correct, score, sort_order, metadata
    ) values (
      v_question_id, v_option_key, v_option->>'content',
      coalesce((v_option->>'isCorrect')::boolean,false), v_score, v_sort,
      jsonb_build_object(
        'legacyOptionId',v_option->>'id',
        'legacyImageUrl',v_option->>'imageUrl',
        'legacyResponseGroup',v_option->>'responseGroup',
        'legacyResponseGroupOrder',v_option->>'responseGroupOrder'
      )
    );
  end loop;

  if nullif(btrim(v_ready.payload->>'explanation'),'') is not null then
    insert into public.question_explanations(question_id,content,format,version)
    values(v_question_id,v_ready.payload->>'explanation','html',1);
  end if;

  insert into public.question_knowledge_nodes(question_id,knowledge_node_id,relation_type)
  values(v_question_id,v_ready.primary_node_id,'primary');
  if v_ready.secondary_node_id is not null then
    insert into public.question_knowledge_nodes(question_id,knowledge_node_id,relation_type)
    values(v_question_id,v_ready.secondary_node_id,'secondary');
  end if;

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,old_data,new_data)
  values(
    v_ready.reviewed_by,'question.legacy_import.mapping_reviewed','question',v_question_id,null,
    jsonb_build_object(
      'sourceQuestionId',v_ready.source_question_id,
      'sourceQuestionCode',v_ready.source_question_code,
      'primaryNodeCode',v_ready.primary_node_code,
      'secondaryNodeCode',v_ready.secondary_node_code,
      'published',p_publish,
      'reviewMethod',v_ready.review_method
    )
  );

  return v_question_id;
end;
$$;

create or replace function public.import_reviewed_cpns_legacy_batch(
  p_publish boolean default false,
  p_limit integer default 500
)
returns table(imported_count integer, skipped_existing_count integer, remaining_ready_count integer)
language plpgsql
security definer
set search_path = pg_catalog, public, app_private
as $$
declare
  v_row record;
  v_before uuid;
  v_imported integer := 0;
  v_skipped integer := 0;
begin
  if p_limit < 1 or p_limit > 500 then
    raise exception 'p_limit must be between 1 and 500';
  end if;

  for v_row in
    select r.source_question_id, r.source_question_code
    from app_private.cpns_legacy_import_ready r
    order by r.source_question_code
    limit p_limit
  loop
    select q.id into v_before from public.questions q where q.question_code = v_row.source_question_code;
    perform public.import_reviewed_cpns_legacy_question(v_row.source_question_id,p_publish);
    if v_before is null then v_imported := v_imported + 1; else v_skipped := v_skipped + 1; end if;
  end loop;

  return query
  select v_imported, v_skipped, count(*)::integer
  from app_private.cpns_legacy_import_ready r
  where not exists (select 1 from public.questions q where q.question_code = r.source_question_code);
end;
$$;

create or replace function public.get_cpns_legacy_import_summary()
returns table(
  registry_total bigint,
  reviewed bigint,
  needs_revision bigint,
  raw_staged bigint,
  import_ready bigint,
  canonical_imported bigint
)
language sql
security definer
set search_path = pg_catalog, public, app_private
as $$
  select
    (select count(*) from app_private.cpns_legacy_mapping_reviews),
    (select count(*) from app_private.cpns_legacy_mapping_reviews where review_status='reviewed'),
    (select count(*) from app_private.cpns_legacy_mapping_reviews where review_status='needs_revision'),
    (select count(*) from app_private.cpns_legacy_import_stage),
    (select count(*) from app_private.cpns_legacy_import_ready),
    (select count(*) from public.questions
      where (source_type='legacy_migration' and source_reference like 'TWK-%')
         or (source_type='legacy_migration' and source_reference like 'TIU-%')
         or (source_type='legacy_migration' and source_reference like 'TKP-%'));
$$;

revoke all on function public.stage_cpns_legacy_question(uuid,text,jsonb) from public, anon, authenticated;
revoke all on function public.import_reviewed_cpns_legacy_question(uuid,boolean) from public, anon, authenticated;
revoke all on function public.import_reviewed_cpns_legacy_batch(boolean,integer) from public, anon, authenticated;
revoke all on function public.get_cpns_legacy_import_summary() from public, anon, authenticated;

grant execute on function public.stage_cpns_legacy_question(uuid,text,jsonb) to service_role;
grant execute on function public.import_reviewed_cpns_legacy_question(uuid,boolean) to service_role;
grant execute on function public.import_reviewed_cpns_legacy_batch(boolean,integer) to service_role;
grant execute on function public.get_cpns_legacy_import_summary() to service_role;
