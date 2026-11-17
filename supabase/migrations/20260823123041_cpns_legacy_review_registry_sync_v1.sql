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
