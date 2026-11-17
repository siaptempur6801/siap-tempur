CREATE OR REPLACE FUNCTION public.upsert_cpns_legacy_mapping_review (p_source_question_id uuid, p_source_question_code text, p_subject_code text, p_legacy_category text, p_legacy_sub_category text, p_primary_node_code text, p_secondary_node_code text, p_review_status text, p_review_method text, p_review_notes text, p_reviewed_by uuid)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = pg_catalog, public, app_private
  AS $$
BEGIN
  IF p_source_question_id IS NULL OR nullif (btrim(p_source_question_code), '') IS NULL OR p_subject_code NOT IN ('TWK', 'TIU', 'TKP') THEN
    RAISE EXCEPTION 'source id/code and a valid CPNS subject are required';
  END IF;

  IF p_review_status NOT IN ('reviewed', 'needs_revision', 'blocked') THEN
    RAISE EXCEPTION 'registry sync only accepts an explicit reviewed/needs_revision/blocked decision for %', p_source_question_code;
  END IF;

  IF p_reviewed_by IS NULL THEN
    RAISE EXCEPTION 'reviewed_by is required for explicit mapping decisions';
  END IF;

  INSERT INTO app_private.cpns_legacy_mapping_reviews (source_question_id, source_question_code, subject_code, legacy_category, legacy_sub_category, primary_node_code, secondary_node_code, review_status, review_method, review_notes, reviewed_by, reviewed_at, created_at, updated_at)
    VALUES (p_source_question_id, p_source_question_code, p_subject_code, p_legacy_category, p_legacy_sub_category, p_primary_node_code, p_secondary_node_code, p_review_status, coalesce(nullif (btrim(p_review_method), ''), 'manual_semantic_review'), p_review_notes, p_reviewed_by, now(), now(), now())
  ON CONFLICT (source_question_id)
    DO UPDATE SET
      source_question_code = excluded.source_question_code,
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
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_cpns_legacy_mapping_review (uuid, text, text, text, text, text, text, text, text, text, uuid) FROM public, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.upsert_cpns_legacy_mapping_review (uuid, text, text, text, text, text, text, text, text, text, uuid) TO service_role;
