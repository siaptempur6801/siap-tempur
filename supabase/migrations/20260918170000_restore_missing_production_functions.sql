-- =============================================================================
-- PULIHKAN objek yang hilang di produksi (ledger produksi tidak akurat)
--
-- MASALAH
--   Tujuh migration tercatat "applied" di ledger PRODUKSI, tetapi objek yang
--   mereka buat TIDAK ADA di database produksi:
--
--     20260823114955  app_private.cpns_legacy_mapping_reviews   (tabel)
--     20260823115204  app_private.cpns_legacy_import_stage      (tabel)
--     20260823121746  app_private.cpns_legacy_import_ready      (view)
--                     app_private.cpns_legacy_mapping_review_summary (view)
--     20260823121937  get_cpns_legacy_import_summary()
--                     import_reviewed_cpns_legacy_batch()
--                     import_reviewed_cpns_legacy_question()
--                     stage_cpns_legacy_question()
--     20260823122113  (guard aset + stage)
--     20260823123041  upsert_cpns_legacy_mapping_review()
--     20260902082133  get_tka_smp_learning_hierarchy()
--
--   Tidak ada satu pun migration yang menjatuhkan objek-objek itu. Jadi ledger
--   produksi menyatakan sesuatu yang tidak benar — kemungkinan sisa cutover
--   Schema V2, di mana migration ditandai berjalan tetapi objeknya tidak ikut
--   terbawa.
--
-- DAMPAK NYATA (bukan teoretis)
--   `get_tka_smp_learning_hierarchy` dipanggil
--   `TkaLearningHierarchyService.getHierarchy()` TANPA try/catch, dan service
--   itu dirender `components/tka/TkaLearningHierarchy.tsx` di halaman
--   `/tka/[level]/focus`. Karena RPC-nya tidak ada, halaman fokus TKA GAGAL
--   dimuat di produksi.
--
--   Lima fungsi CPNS legacy hanya dipanggil
--   `scripts/migrate_cpns_legacy_reviewed_to_schema_v2.mjs` (alat impor
--   konten), bukan aplikasi berjalan. Tetap dipulihkan supaya kedua environment
--   benar-benar setara dan skrip impor masih bisa dijalankan.
--
-- CARA
--   Isi migration ini adalah migration-migration asli yang dipakai ulang apa
--   adanya, dalam urutan aslinya. Itu menjaga ketergantungan antar-objek
--   (view bergantung pada tabel, fungsi bergantung pada view) dan memastikan
--   hasil akhirnya identik dengan yang dimiliki staging.
--
--   Hanya SATU objek staging yang sengaja TIDAK dipulihkan:
--   `app_private.cpns_skd_p1_import_stage`. Tabel itu tidak punya migration
--   pembuat di repo dan disebut di
--   `scripts/production_cutover_extract_staging_runtime_schema.sql` sebagai
--   artefak cutover — jadi ia memang milik staging saja.
--
-- IDEMPOTEN
--   Seluruh pernyataan memakai `if not exists` / `create or replace`.
--   Diverifikasi dengan menjalankan migration ini dua kali di staging tanpa
--   perubahan hasil.
-- =============================================================================

create table if not exists app_private.cpns_legacy_mapping_reviews (
  source_question_id uuid primary key,
  source_question_code text not null unique,
  subject_code text not null,
  legacy_category text,
  legacy_sub_category text,
  primary_node_code text,
  secondary_node_code text,
  review_status text not null default 'pending',
  review_method text,
  review_notes text,
  reviewed_by uuid references public.profiles(id) on delete restrict,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cpns_legacy_mapping_reviews_subject_check check (subject_code in ('TWK','TIU','TKP')),
  constraint cpns_legacy_mapping_reviews_status_check check (review_status in ('pending','reviewed','needs_revision','blocked')),
  constraint cpns_legacy_mapping_reviews_reviewed_check check (
    review_status <> 'reviewed'
    or (
      primary_node_code is not null
      and reviewed_at is not null
      and review_method is not null
    )
  ),
  constraint cpns_legacy_mapping_reviews_secondary_distinct_check check (
    secondary_node_code is null or secondary_node_code is distinct from primary_node_code
  )
);

create index if not exists idx_cpns_legacy_mapping_reviews_queue
  on app_private.cpns_legacy_mapping_reviews(review_status, subject_code, source_question_code);

comment on table app_private.cpns_legacy_mapping_reviews is
  'Manual mapping review registry for legacy CPNS questions. Migration must never derive target knowledge nodes from legacy categories automatically.';

comment on column app_private.cpns_legacy_mapping_reviews.primary_node_code is
  'Explicit reviewer decision. NULL while pending. Never auto-filled from legacy_category by migration.';

comment on column app_private.cpns_legacy_mapping_reviews.secondary_node_code is
  'Optional explicit reviewer decision for cross-topic questions.';

create table if not exists app_private.cpns_legacy_import_stage (
  source_question_id uuid primary key,
  source_question_code text not null unique,
  payload jsonb not null,
  staged_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_cpns_legacy_import_stage_code
  on app_private.cpns_legacy_import_stage(source_question_code);

comment on table app_private.cpns_legacy_import_stage is
  'Raw legacy CPNS question payload staged before canonical Schema V2 import. Knowledge mapping is intentionally absent here and must come only from cpns_legacy_mapping_reviews.';

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
  select s.id
    into v_subject_id
  from public.subjects s
  join public.tracks t on t.id = s.track_id
  join public.programs p on p.id = t.program_id
  where p.code = 'CPNS'
    and t.code = 'SKD'
    and s.code = new.subject_code
  limit 1;

  if v_subject_id is null then
    raise exception 'Invalid CPNS SKD subject_code: %', new.subject_code;
  end if;

  if new.review_status = 'reviewed' then
    if new.primary_node_code is null then
      raise exception 'Reviewed mapping requires primary_node_code for %', new.source_question_code;
    end if;

    select kn.subject_id
      into v_primary_subject_id
    from public.knowledge_nodes kn
    where kn.code = new.primary_node_code
    limit 1;

    if v_primary_subject_id is null then
      raise exception 'Unknown primary knowledge node % for %', new.primary_node_code, new.source_question_code;
    end if;

    if v_primary_subject_id <> v_subject_id then
      raise exception 'Primary node % does not belong to subject % for %', new.primary_node_code, new.subject_code, new.source_question_code;
    end if;

    if new.secondary_node_code is not null then
      select kn.subject_id
        into v_secondary_subject_id
      from public.knowledge_nodes kn
      where kn.code = new.secondary_node_code
      limit 1;

      if v_secondary_subject_id is null then
        raise exception 'Unknown secondary knowledge node % for %', new.secondary_node_code, new.source_question_code;
      end if;

      if v_secondary_subject_id <> v_subject_id then
        raise exception 'Secondary node % does not belong to subject % for %', new.secondary_node_code, new.subject_code, new.source_question_code;
      end if;
    end if;

    if new.review_method is null or new.reviewed_at is null then
      raise exception 'Reviewed mapping requires review_method and reviewed_at for %', new.source_question_code;
    end if;
  else
    if new.primary_node_code is not null or new.secondary_node_code is not null then
      raise exception 'Unresolved mapping must not contain knowledge-node decisions for %', new.source_question_code;
    end if;

    if new.review_status in ('needs_revision', 'blocked')
       and (new.review_method is null or new.reviewed_at is null) then
      raise exception '% mapping requires review_method and reviewed_at for %', new.review_status, new.source_question_code;
    end if;
  end if;

  if new.secondary_node_code is not null
     and new.secondary_node_code = new.primary_node_code then
    raise exception 'Primary and secondary nodes must differ for %', new.source_question_code;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_validate_cpns_legacy_mapping_review
  on app_private.cpns_legacy_mapping_reviews;

create trigger trg_validate_cpns_legacy_mapping_review
before insert or update on app_private.cpns_legacy_mapping_reviews
for each row
execute function app_private.validate_cpns_legacy_mapping_review();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'app_private.cpns_legacy_mapping_reviews'::regclass
      and conname = 'cpns_legacy_mapping_reviews_unresolved_has_no_nodes_check'
  ) then
    alter table app_private.cpns_legacy_mapping_reviews
      add constraint cpns_legacy_mapping_reviews_unresolved_has_no_nodes_check
      check (
        review_status = 'reviewed'
        or (primary_node_code is null and secondary_node_code is null)
      ) not valid;
  end if;
end
$$;

alter table app_private.cpns_legacy_mapping_reviews
  validate constraint cpns_legacy_mapping_reviews_unresolved_has_no_nodes_check;

create index if not exists idx_cpns_legacy_mapping_reviews_primary_node
  on app_private.cpns_legacy_mapping_reviews(primary_node_code)
  where review_status = 'reviewed';

create or replace view app_private.cpns_legacy_import_ready as
select
  st.source_question_id,
  st.source_question_code,
  st.payload,
  r.subject_code,
  r.legacy_category,
  r.legacy_sub_category,
  r.primary_node_code,
  pkn.id as primary_node_id,
  r.secondary_node_code,
  skn.id as secondary_node_id,
  r.review_method,
  r.review_notes,
  r.reviewed_by,
  r.reviewed_at
from app_private.cpns_legacy_import_stage st
join app_private.cpns_legacy_mapping_reviews r
  on r.source_question_id = st.source_question_id
 and r.source_question_code = st.source_question_code
join public.subjects s
  on s.code = r.subject_code
join public.tracks t
  on t.id = s.track_id
 and t.code = 'SKD'
join public.programs p
  on p.id = t.program_id
 and p.code = 'CPNS'
join public.knowledge_nodes pkn
  on pkn.code = r.primary_node_code
 and pkn.subject_id = s.id
left join public.knowledge_nodes skn
  on skn.code = r.secondary_node_code
 and skn.subject_id = s.id
where r.review_status = 'reviewed'
  and (r.secondary_node_code is null or skn.id is not null);

comment on view app_private.cpns_legacy_import_ready is
  'Only raw-staged CPNS legacy questions with an explicit reviewed mapping and valid same-subject knowledge nodes. Importers must consume this view rather than infer mappings from legacy categories.';

create or replace view app_private.cpns_legacy_mapping_review_summary as
select
  subject_code,
  review_status,
  count(*)::bigint as question_count
from app_private.cpns_legacy_mapping_reviews
group by subject_code, review_status;

comment on view app_private.cpns_legacy_mapping_review_summary is
  'Operational summary of the manual CPNS legacy mapping review registry.';

revoke all on function app_private.validate_cpns_legacy_mapping_review() from public;
revoke all on app_private.cpns_legacy_import_ready from public;
revoke all on app_private.cpns_legacy_mapping_review_summary from public;

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
  v_review_subject text;
  v_review_code text;
begin
  if p_source_question_id is null or nullif(btrim(p_source_question_code), '') is null then
    raise exception 'source_question_id and source_question_code are required';
  end if;

  select r.subject_code, r.source_question_code
    into v_review_subject, v_review_code
  from app_private.cpns_legacy_mapping_reviews r
  where r.source_question_id = p_source_question_id;

  if v_review_subject is null then
    raise exception 'No mapping-review registry row exists for source question %', p_source_question_id;
  end if;
  if v_review_code is distinct from p_source_question_code then
    raise exception 'Registry question code mismatch: expected %, got %', v_review_code, p_source_question_code;
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
  if v_payload_subject is distinct from v_review_subject then
    raise exception 'Payload subject % does not match reviewed subject % for %', v_payload_subject, v_review_subject, p_source_question_code;
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

create or replace view app_private.cpns_legacy_import_ready as
select
  st.source_question_id,
  st.source_question_code,
  st.payload,
  r.subject_code,
  r.legacy_category,
  r.legacy_sub_category,
  r.primary_node_code,
  pkn.id as primary_node_id,
  r.secondary_node_code,
  skn.id as secondary_node_id,
  r.review_method,
  r.review_notes,
  r.reviewed_by,
  r.reviewed_at
from app_private.cpns_legacy_import_stage st
join app_private.cpns_legacy_mapping_reviews r
  on r.source_question_id = st.source_question_id
 and r.source_question_code = st.source_question_code
join public.subjects s on s.code = r.subject_code
join public.tracks t on t.id = s.track_id and t.code = 'SKD'
join public.programs p on p.id = t.program_id and p.code = 'CPNS'
join public.knowledge_nodes pkn
  on pkn.code = r.primary_node_code
 and pkn.subject_id = s.id
left join public.knowledge_nodes skn
  on skn.code = r.secondary_node_code
 and skn.subject_id = s.id
where r.review_status = 'reviewed'
  and (r.secondary_node_code is null or skn.id is not null)
  and (
    nullif(btrim(st.payload->>'imageUrl'), '') is null
    or nullif(btrim(st.payload->>'canonicalAssetStoragePath'), '') is not null
  );

comment on view app_private.cpns_legacy_import_ready is
  'Only raw-staged CPNS legacy questions with explicit reviewed mappings, valid same-subject nodes, and any required legacy question image already copied to canonical storage.';

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
  v_asset_path text;
begin
  select * into v_ready
  from app_private.cpns_legacy_import_ready
  where source_question_id = p_source_question_id;

  if not found then
    raise exception 'Legacy question % is not import-ready: raw payload missing, mapping unresolved, node invalid, or required asset not migrated', p_source_question_id;
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
  from public.questions q
  where q.question_code = v_ready.source_question_code;

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
    v_ready.source_question_code,
    v_program_id,
    v_track_id,
    v_subject_id,
    'single_choice',
    v_ready.payload->>'stem',
    'unclassified',
    null,
    'legacy_migration',
    v_ready.source_question_code,
    null,
    case when p_publish then 'published' else 'draft' end,
    1,
    v_ready.reviewed_by,
    v_ready.reviewed_by,
    case when p_publish then now() else null end,
    null,
    1,
    jsonb_build_object(
      'scoringMode','single_option',
      'legacySourceQuestionId',v_ready.source_question_id,
      'legacyCategory',v_ready.legacy_category,
      'legacySubCategory',v_ready.legacy_sub_category,
      'legacyImageUrl',nullif(v_ready.payload->>'imageUrl',''),
      'mappingReview',jsonb_build_object(
        'method',v_ready.review_method,
        'notes',v_ready.review_notes,
        'reviewedAt',v_ready.reviewed_at,
        'primaryNodeCode',v_ready.primary_node_code,
        'secondaryNodeCode',v_ready.secondary_node_code
      ),
      'migrationBatch','CPNS-LEGACY-MANUAL-MAPPING'
    ),
    now(),
    now()
  ) returning id into v_question_id;

  for v_option in select value from jsonb_array_elements(v_ready.payload->'options') loop
    v_sort := nullif(v_option->>'sortOrder','')::integer;
    if v_sort is null or v_sort < 1 or v_sort > 5 then
      raise exception 'Invalid option sortOrder for %', v_ready.source_question_code;
    end if;
    v_option_key := chr(64 + v_sort);
    v_score := coalesce(nullif(v_option->>'score','')::numeric,0);

    insert into public.question_options(
      question_id,option_key,content,is_correct,score,sort_order,metadata
    ) values (
      v_question_id,v_option_key,v_option->>'content',
      coalesce((v_option->>'isCorrect')::boolean,false),v_score,v_sort,
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

  v_asset_path := nullif(btrim(v_ready.payload->>'canonicalAssetStoragePath'),'');
  if v_asset_path is not null then
    insert into public.question_assets(question_id,asset_type,storage_path,alt_text,sort_order)
    values(
      v_question_id,
      'image',
      v_asset_path,
      'Legacy CPNS question image for ' || v_ready.source_question_code,
      0
    );
  end if;

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,old_data,new_data)
  values(
    v_ready.reviewed_by,
    'question.legacy_import.mapping_reviewed',
    'question',
    v_question_id,
    null,
    jsonb_build_object(
      'sourceQuestionId',v_ready.source_question_id,
      'sourceQuestionCode',v_ready.source_question_code,
      'primaryNodeCode',v_ready.primary_node_code,
      'secondaryNodeCode',v_ready.secondary_node_code,
      'canonicalAssetStoragePath',v_asset_path,
      'published',p_publish,
      'reviewMethod',v_ready.review_method
    )
  );

  return v_question_id;
end;
$$;

revoke all on function public.stage_cpns_legacy_question(uuid,text,jsonb) from public, anon, authenticated;
revoke all on function public.import_reviewed_cpns_legacy_question(uuid,boolean) from public, anon, authenticated;
grant execute on function public.stage_cpns_legacy_question(uuid,text,jsonb) to service_role;
grant execute on function public.import_reviewed_cpns_legacy_question(uuid,boolean) to service_role;

create or replace function public.upsert_cpns_legacy_mapping_review(
  p_source_question_id uuid,
  p_source_question_code text,
  p_subject_code text,
  p_legacy_category text,
  p_legacy_sub_category text,
  p_primary_node_code text,
  p_secondary_node_code text,
  p_review_status text,
  p_review_method text,
  p_review_notes text,
  p_reviewed_by uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, app_private
as $$
begin
  if p_source_question_id is null
     or nullif(btrim(p_source_question_code), '') is null
     or p_subject_code not in ('TWK','TIU','TKP') then
    raise exception 'source id/code and a valid CPNS subject are required';
  end if;

  if p_review_status not in ('reviewed','needs_revision','blocked') then
    raise exception 'registry sync only accepts an explicit reviewed/needs_revision/blocked decision for %', p_source_question_code;
  end if;

  if p_reviewed_by is null then
    raise exception 'reviewed_by is required for explicit mapping decisions';
  end if;

  insert into app_private.cpns_legacy_mapping_reviews (
    source_question_id,
    source_question_code,
    subject_code,
    legacy_category,
    legacy_sub_category,
    primary_node_code,
    secondary_node_code,
    review_status,
    review_method,
    review_notes,
    reviewed_by,
    reviewed_at,
    created_at,
    updated_at
  ) values (
    p_source_question_id,
    p_source_question_code,
    p_subject_code,
    p_legacy_category,
    p_legacy_sub_category,
    p_primary_node_code,
    p_secondary_node_code,
    p_review_status,
    coalesce(nullif(btrim(p_review_method), ''), 'manual_semantic_review'),
    p_review_notes,
    p_reviewed_by,
    now(),
    now(),
    now()
  )
  on conflict (source_question_id) do update
    set source_question_code = excluded.source_question_code,
        subject_code = excluded.subject_code,
        legacy_category = excluded.legacy_category,
        legacy_sub_category = excluded.legacy_sub_category,
        primary_node_code = excluded.primary_node_code,
        secondary_node_code = excluded.secondary_node_code,
        review_status = excluded.review_status,
        review_method = excluded.review_method,
        review_notes = excluded.review_notes,
        reviewed_by = excluded.reviewed_by,
        reviewed_at = excluded.reviewed_at,
        updated_at = now();
end;
$$;

revoke all on function public.upsert_cpns_legacy_mapping_review(uuid,text,text,text,text,text,text,text,text,text,uuid)
  from public, anon, authenticated;
grant execute on function public.upsert_cpns_legacy_mapping_review(uuid,text,text,text,text,text,text,text,text,text,uuid)
  to service_role;

-- TKA SMP Learning Hierarchy V1
-- Materialize safe 10-question drills for sufficiently populated lower-level
-- knowledge nodes and expose one authenticated, read-only hierarchy projection.

do $migration$
declare
  v_created_by uuid;
  v_feature_id uuid;
  v_exam_id uuid;
  v_exam_slug text;
  v_payload jsonb;
  r record;
begin
  select e.created_by
    into v_created_by
  from public.exams e
  where e.slug = 'tka-smp-diagnostic-awal'
  limit 1;

  if v_created_by is null then
    raise exception 'TKA SMP diagnostic creator not found';
  end if;

  select f.id
    into v_feature_id
  from public.features f
  where f.code = 'tka.smp.drill.unlimited'
  limit 1;

  if v_feature_id is null then
    raise exception 'TKA SMP drill feature not found';
  end if;

  for r in
    with candidates as (
      select
        kn.id as knowledge_node_id,
        kn.name as knowledge_node_name,
        kn.slug as knowledge_node_slug,
        kn.depth,
        kn.sort_order,
        s.code as subject_code,
        count(distinct q.id)::integer as published_question_count
      from public.knowledge_nodes kn
      join public.subjects s on s.id = kn.subject_id
      join public.tracks t on t.id = s.track_id
      join public.programs p on p.id = t.program_id
      left join public.knowledge_node_paths knp on knp.ancestor_id = kn.id
      left join public.question_knowledge_nodes qkn
        on qkn.knowledge_node_id = knp.descendant_id
       and lower(qkn.relation_type) = 'primary'
      left join public.questions q
        on q.id = qkn.question_id
       and q.track_id = t.id
       and lower(q.status) = 'published'
      where upper(p.code) = 'TKA'
        and upper(t.code) = 'SMP'
        and lower(kn.status) = 'active'
        and (
          (upper(s.code) = 'BIN' and lower(kn.node_type) = 'subcompetency')
          or
          (upper(s.code) = 'MAT' and lower(kn.node_type) in ('subelement', 'topic'))
        )
      group by kn.id, kn.name, kn.slug, kn.depth, kn.sort_order, s.code
    )
    select *
    from candidates
    where published_question_count >= 10
    order by subject_code, depth, sort_order, knowledge_node_name
  loop
    v_exam_slug := 'tka-smp-drill-' || lower(r.subject_code) || '-' || r.knowledge_node_slug;

    select e.id
      into v_exam_id
    from public.exams e
    where e.slug = v_exam_slug
    limit 1;

    v_payload := public.admin_upsert_drill_exam_v1(
      v_exam_id,
      'TKA',
      'SMP',
      r.subject_code,
      r.knowledge_node_id,
      'Latihan Fokus ' || r.knowledge_node_name || ' TKA SMP',
      v_exam_slug,
      900,
      1,
      10,
      'random',
      'instant',
      'FREEMIUM',
      'active',
      0,
      v_created_by
    );

    v_exam_id := nullif(v_payload ->> 'exam_id', '')::uuid;
    if v_exam_id is null then
      raise exception 'TKA SMP hierarchy drill materialization failed for %', r.knowledge_node_name;
    end if;

    update public.exams
       set required_feature_id = v_feature_id,
           attempt_limit = null,
           description = 'Drill 10 soal untuk ' || r.knowledge_node_name || '. Satu percobaan awal gratis; Tempur Pass membuka latihan lanjutan.',
           updated_at = now()
     where id = v_exam_id;
  end loop;

  if exists (
    with candidates as (
      select kn.id, kn.slug, s.code as subject_code
      from public.knowledge_nodes kn
      join public.subjects s on s.id = kn.subject_id
      join public.tracks t on t.id = s.track_id
      join public.programs p on p.id = t.program_id
      join public.knowledge_node_paths knp on knp.ancestor_id = kn.id
      join public.question_knowledge_nodes qkn
        on qkn.knowledge_node_id = knp.descendant_id
       and lower(qkn.relation_type) = 'primary'
      join public.questions q
        on q.id = qkn.question_id
       and q.track_id = t.id
       and lower(q.status) = 'published'
      where upper(p.code) = 'TKA'
        and upper(t.code) = 'SMP'
        and lower(kn.status) = 'active'
        and (
          (upper(s.code) = 'BIN' and lower(kn.node_type) = 'subcompetency')
          or
          (upper(s.code) = 'MAT' and lower(kn.node_type) in ('subelement', 'topic'))
        )
      group by kn.id, kn.slug, s.code
      having count(distinct q.id) >= 10
    )
    select 1
    from candidates c
    left join public.exams e
      on e.slug = 'tka-smp-drill-' || lower(c.subject_code) || '-' || c.slug
     and lower(e.status) = 'active'
    left join public.exam_sections es on es.exam_id = e.id
    left join public.exam_question_items eqi
      on eqi.exam_id = e.id
     and eqi.section_id = es.id
    group by c.id, e.id, es.id, es.question_count
    having e.id is null or es.question_count <> 10 or count(eqi.id) <> 10
  ) then
    raise exception 'TKA SMP learning hierarchy frozen Drill gate failed';
  end if;
end;
$migration$;

create or replace function public.get_tka_smp_learning_hierarchy()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user uuid := auth.uid();
  v_track_id uuid;
  v_user_track_id uuid;
  v_items jsonb := '[]'::jsonb;
begin
  if v_user is null then
    raise exception 'AUTHENTICATION_REQUIRED';
  end if;

  select t.id
    into v_track_id
  from public.programs p
  join public.tracks t on t.program_id = p.id
  where upper(p.code) = 'TKA'
    and upper(t.code) = 'SMP'
  limit 1;

  if v_track_id is null then
    raise exception 'TKA_SMP_TRACK_NOT_FOUND';
  end if;

  select ut.id
    into v_user_track_id
  from public.user_tracks ut
  where ut.user_id = v_user
    and ut.track_id = v_track_id
    and lower(ut.status) = 'active'
  limit 1;

  if v_user_track_id is null then
    raise exception 'ACTIVE_USER_TRACK_REQUIRED';
  end if;

  with nodes as (
    select
      kn.id,
      kn.subject_id,
      kn.parent_id,
      kn.code,
      kn.name,
      kn.slug,
      kn.node_type,
      kn.depth,
      kn.sort_order,
      s.code as subject_code,
      s.name as subject_name,
      s.sort_order as subject_sort_order
    from public.knowledge_nodes kn
    join public.subjects s on s.id = kn.subject_id
    where s.track_id = v_track_id
      and lower(kn.status) = 'active'
  ), question_counts as (
    select
      n.id,
      count(distinct q.id)::integer as question_count
    from nodes n
    left join public.knowledge_node_paths knp on knp.ancestor_id = n.id
    left join public.question_knowledge_nodes qkn
      on qkn.knowledge_node_id = knp.descendant_id
     and lower(qkn.relation_type) = 'primary'
    left join public.questions q
      on q.id = qkn.question_id
     and q.track_id = v_track_id
     and lower(q.status) = 'published'
    group by n.id
  ), hierarchy_rows as (
    select
      n.*,
      qc.question_count,
      coalesce(ukp.attempted_questions, 0)::integer as attempted_questions,
      coalesce(ukp.correct_questions, 0)::integer as correct_questions,
      coalesce(ukp.accuracy, 0)::numeric as accuracy,
      coalesce(ukp.mastery_score, 0)::numeric as mastery_score,
      coalesce(ukp.mastery_level, 'not_started') as mastery_level,
      exact_drill.exam_slug as exact_drill_slug,
      nearest_drill.knowledge_node_id as drill_knowledge_node_id,
      nearest_drill.knowledge_node_code as drill_knowledge_node_code,
      nearest_drill.knowledge_node_name as drill_knowledge_node_name,
      nearest_drill.exam_slug as drill_exam_slug,
      nearest_drill.distance as drill_distance,
      path_nodes.path as path
    from nodes n
    join question_counts qc on qc.id = n.id
    left join public.user_knowledge_progress ukp
      on ukp.user_id = v_user
     and ukp.user_track_id = v_user_track_id
     and ukp.knowledge_node_id = n.id
    left join lateral (
      select e.slug as exam_slug
      from public.exams e
      join public.exam_types et on et.id = e.exam_type_id
      where upper(et.code) = 'DRILL'
        and lower(e.status) = 'active'
        and e.slug = 'tka-smp-drill-' || lower(n.subject_code) || '-' || n.slug
      limit 1
    ) exact_drill on true
    left join lateral (
      select
        anc.id as knowledge_node_id,
        anc.code as knowledge_node_code,
        anc.name as knowledge_node_name,
        e.slug as exam_slug,
        knp.depth::integer as distance
      from public.knowledge_node_paths knp
      join public.knowledge_nodes anc on anc.id = knp.ancestor_id
      join public.exams e
        on e.slug = 'tka-smp-drill-' || lower(n.subject_code) || '-' || anc.slug
       and lower(e.status) = 'active'
      join public.exam_types et on et.id = e.exam_type_id and upper(et.code) = 'DRILL'
      where knp.descendant_id = n.id
        and anc.subject_id = n.subject_id
        and lower(anc.status) = 'active'
      order by knp.depth asc, anc.depth desc, anc.sort_order, anc.id
      limit 1
    ) nearest_drill on true
    left join lateral (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', anc.id,
            'code', anc.code,
            'name', anc.name,
            'node_type', anc.node_type,
            'depth', anc.depth
          ) order by knp.depth desc
        ),
        '[]'::jsonb
      ) as path
      from public.knowledge_node_paths knp
      join public.knowledge_nodes anc on anc.id = knp.ancestor_id
      where knp.descendant_id = n.id
        and anc.subject_id = n.subject_id
        and lower(anc.status) = 'active'
    ) path_nodes on true
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'knowledge_node_id', hr.id,
        'knowledge_node_code', hr.code,
        'name', hr.name,
        'node_type', hr.node_type,
        'depth', hr.depth,
        'parent_id', hr.parent_id,
        'sort_order', hr.sort_order,
        'subject_id', hr.subject_id,
        'subject_code', hr.subject_code,
        'subject_name', hr.subject_name,
        'subject_sort_order', hr.subject_sort_order,
        'published_question_count', hr.question_count,
        'attempted_questions', hr.attempted_questions,
        'correct_questions', hr.correct_questions,
        'accuracy', hr.accuracy,
        'mastery_score', hr.mastery_score,
        'mastery_level', hr.mastery_level,
        'path', hr.path,
        'drill', case
          when hr.drill_exam_slug is null then null
          else jsonb_build_object(
            'available', true,
            'exact', hr.drill_distance = 0,
            'distance', hr.drill_distance,
            'knowledge_node_id', hr.drill_knowledge_node_id,
            'knowledge_node_code', hr.drill_knowledge_node_code,
            'knowledge_node_name', hr.drill_knowledge_node_name,
            'exam_slug', hr.drill_exam_slug,
            'question_count', 10,
            'duration_seconds', 900
          )
        end
      ) order by hr.subject_sort_order, hr.subject_code, hr.depth, hr.sort_order, hr.code
    ),
    '[]'::jsonb
  )
  into v_items
  from hierarchy_rows hr;

  return jsonb_build_object(
    'version', 'tka_smp_learning_hierarchy_v1',
    'items', v_items,
    'count', jsonb_array_length(v_items)
  );
end;
$function$;

revoke all on function public.get_tka_smp_learning_hierarchy() from public;
revoke all on function public.get_tka_smp_learning_hierarchy() from anon;
grant execute on function public.get_tka_smp_learning_hierarchy() to authenticated;
