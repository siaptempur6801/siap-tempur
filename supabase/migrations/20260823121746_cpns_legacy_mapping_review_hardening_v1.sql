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
