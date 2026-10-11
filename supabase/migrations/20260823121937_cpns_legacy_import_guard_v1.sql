CREATE OR REPLACE FUNCTION app_private.validate_cpns_legacy_mapping_review ()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path = pg_catalog, public, app_private
  AS $$
DECLARE
  v_subject_id uuid;
  v_primary_subject_id uuid;
  v_secondary_subject_id uuid;
BEGIN
  SELECT
    s.id
  INTO
    v_subject_id
  FROM
    public.subjects s
    JOIN public.tracks t ON t.id = s.track_id
    JOIN public.programs p ON p.id = t.program_id
  WHERE
    p.code = 'CPNS'
    AND t.code = 'SKD'
    AND s.code = NEW.subject_code
  LIMIT 1;

  IF v_subject_id IS NULL THEN
    RAISE EXCEPTION 'Invalid CPNS SKD subject_code: %', NEW.subject_code;
  END IF;

  IF NEW.review_status = 'reviewed' THEN
    IF NEW.primary_node_code IS NULL THEN
      RAISE EXCEPTION 'Reviewed mapping requires primary_node_code for %', NEW.source_question_code;
    END IF;
    IF NEW.review_method IS NULL OR NEW.reviewed_at IS NULL OR NEW.reviewed_by IS NULL THEN
      RAISE EXCEPTION 'Reviewed mapping requires review_method, reviewed_at, and reviewed_by for %', NEW.source_question_code;
    END IF;

    SELECT
      kn.subject_id
    INTO
      v_primary_subject_id
    FROM
      public.knowledge_nodes kn
    WHERE
      kn.code = NEW.primary_node_code
    LIMIT 1;
    IF v_primary_subject_id IS NULL THEN
      RAISE EXCEPTION 'Unknown primary knowledge node % for %', NEW.primary_node_code, NEW.source_question_code;
    END IF;
    IF v_primary_subject_id <> v_subject_id THEN
      RAISE EXCEPTION 'Primary node % does not belong to subject % for %', NEW.primary_node_code, NEW.subject_code, NEW.source_question_code;
    END IF;

    IF NEW.secondary_node_code IS NOT NULL THEN
      SELECT
        kn.subject_id
      INTO
        v_secondary_subject_id
      FROM
        public.knowledge_nodes kn
      WHERE
        kn.code = NEW.secondary_node_code
      LIMIT 1;
      IF v_secondary_subject_id IS NULL THEN
        RAISE EXCEPTION 'Unknown secondary knowledge node % for %', NEW.secondary_node_code, NEW.source_question_code;
      END IF;
      IF v_secondary_subject_id <> v_subject_id THEN
        RAISE EXCEPTION 'Secondary node % does not belong to subject % for %', NEW.secondary_node_code, NEW.subject_code, NEW.source_question_code;
      END IF;
    END IF;
  ELSE
    IF NEW.primary_node_code IS NOT NULL OR NEW.secondary_node_code IS NOT NULL THEN
      RAISE EXCEPTION 'Unresolved mapping must not contain knowledge-node decisions for %', NEW.source_question_code;
    END IF;
    IF NEW.review_status IN ('needs_revision', 'blocked') AND (NEW.review_method IS NULL OR NEW.reviewed_at IS NULL OR NEW.reviewed_by IS NULL) THEN
      RAISE EXCEPTION '% mapping requires review_method, reviewed_at, and reviewed_by for %', NEW.review_status, NEW.source_question_code;
    END IF;
  END IF;

  IF NEW.secondary_node_code IS NOT NULL AND NEW.secondary_node_code = NEW.primary_node_code THEN
    RAISE EXCEPTION 'Primary and secondary nodes must differ for %', NEW.source_question_code;
  END IF;

  NEW.updated_at := now();
  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION public.stage_cpns_legacy_question (p_source_question_id uuid, p_source_question_code text, p_payload jsonb)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = pg_catalog, public, app_private
  AS $$
DECLARE
  v_payload_subject text;
BEGIN
  IF p_source_question_id IS NULL OR nullif (btrim(p_source_question_code), '') IS NULL THEN
    RAISE EXCEPTION 'source_question_id and source_question_code are required';
  END IF;
  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
    RAISE EXCEPTION 'payload must be a JSON object for %', p_source_question_code;
  END IF;
  IF p_payload ->> 'sourceQuestionId' IS DISTINCT FROM p_source_question_id::text THEN
    RAISE EXCEPTION 'payload sourceQuestionId mismatch for %', p_source_question_code;
  END IF;
  IF p_payload ->> 'questionCode' IS DISTINCT FROM p_source_question_code THEN
    RAISE EXCEPTION 'payload questionCode mismatch for %', p_source_question_code;
  END IF;

  v_payload_subject := p_payload ->> 'subject';
  IF v_payload_subject NOT IN ('TWK', 'TIU', 'TKP') THEN
    RAISE EXCEPTION 'invalid payload subject % for %', v_payload_subject, p_source_question_code;
  END IF;
  IF nullif (btrim(p_payload ->> 'stem'), '') IS NULL THEN
    RAISE EXCEPTION 'payload stem is required for %', p_source_question_code;
  END IF;
  IF jsonb_typeof(p_payload -> 'options') <> 'array' OR jsonb_array_length(p_payload -> 'options') <> 5 THEN
    RAISE EXCEPTION 'payload must contain exactly 5 options for %', p_source_question_code;
  END IF;

  INSERT INTO app_private.cpns_legacy_import_stage (source_question_id, source_question_code, payload, staged_at, updated_at)
    VALUES (p_source_question_id, p_source_question_code, p_payload, now(), now())
  ON CONFLICT (source_question_id)
    DO UPDATE SET
      source_question_code = excluded.source_question_code,
      payload = excluded.payload,
      updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.import_reviewed_cpns_legacy_question (p_source_question_id uuid, p_publish boolean DEFAULT FALSE)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = pg_catalog, public, app_private
  AS $$
DECLARE
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
BEGIN
  SELECT
    *
  INTO
    v_ready
  FROM
    app_private.cpns_legacy_import_ready
  WHERE
    source_question_id = p_source_question_id;

  IF NOT found THEN
    RAISE EXCEPTION 'Legacy question % is not import-ready: raw payload missing, mapping unresolved, or node invalid', p_source_question_id;
  END IF;

  SELECT
    p.id,
    t.id,
    s.id
  INTO
    v_program_id,
    v_track_id,
    v_subject_id
  FROM
    public.programs p
    JOIN public.tracks t ON t.program_id = p.id
      AND t.code = 'SKD'
    JOIN public.subjects s ON s.track_id = t.id
      AND s.code = v_ready.subject_code
  WHERE
    p.code = 'CPNS'
  LIMIT 1;

  IF v_program_id IS NULL OR v_track_id IS NULL OR v_subject_id IS NULL THEN
    RAISE EXCEPTION 'Canonical CPNS/SKD/% catalog is missing', v_ready.subject_code;
  END IF;
  IF v_ready.payload ->> 'subject' IS DISTINCT FROM v_ready.subject_code THEN
    RAISE EXCEPTION 'Raw payload subject and reviewed subject differ for %', v_ready.source_question_code;
  END IF;

  SELECT
    count(*)::integer
  INTO
    v_correct_count
  FROM
    jsonb_array_elements(v_ready.payload -> 'options') o
WHERE
  coalesce((o ->> 'isCorrect')::boolean, FALSE);
  IF v_correct_count <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one isCorrect option for %, got %', v_ready.source_question_code, v_correct_count;
  END IF;

  SELECT
    q.id,
    q.source_type,
    q.source_reference
  INTO
    v_question_id,
    v_existing_source_type,
    v_existing_source_reference
  FROM
    public.questions q
  WHERE
    q.question_code = v_ready.source_question_code;

  IF v_question_id IS NOT NULL THEN
    IF v_existing_source_type <> 'legacy_migration' OR v_existing_source_reference IS DISTINCT FROM v_ready.source_question_code THEN
      RAISE EXCEPTION 'Question code % already exists but is not the same legacy import', v_ready.source_question_code;
    END IF;
    RETURN v_question_id;
  END IF;

  INSERT INTO public.questions (question_code, program_id, track_id, subject_id, question_type, stem, difficulty, cognitive_level, source_type, source_reference, estimated_seconds, status, version, author_id, reviewer_id, published_at, stimulus_id, stimulus_order, response_config, created_at, updated_at)
    VALUES (v_ready.source_question_code, v_program_id, v_track_id, v_subject_id, 'single_choice', v_ready.payload ->> 'stem', 'unclassified', NULL, 'legacy_migration', v_ready.source_question_code, NULL, CASE WHEN p_publish THEN
        'published'
      ELSE
        'draft'
      END, 1, v_ready.reviewed_by, v_ready.reviewed_by, CASE WHEN p_publish THEN
        now()
      ELSE
        NULL
      END, NULL, 1, jsonb_build_object('scoringMode', 'single_option', 'legacySourceQuestionId', v_ready.source_question_id, 'legacyCategory', v_ready.legacy_category, 'legacySubCategory', v_ready.legacy_sub_category, 'mappingReview', jsonb_build_object('method', v_ready.review_method, 'notes', v_ready.review_notes, 'reviewedAt', v_ready.reviewed_at, 'primaryNodeCode', v_ready.primary_node_code, 'secondaryNodeCode', v_ready.secondary_node_code), 'migrationBatch', 'CPNS-LEGACY-MANUAL-MAPPING'), now(), now())
  RETURNING
    id
  INTO
    v_question_id;

  FOR v_option IN
  SELECT
    value
  FROM
    jsonb_array_elements(v_ready.payload -> 'options')
    LOOP
      v_sort := nullif (v_option ->> 'sortOrder', '')::integer;
      IF v_sort IS NULL OR v_sort < 1 OR v_sort > 5 THEN
        RAISE EXCEPTION 'Invalid option sortOrder for %', v_ready.source_question_code;
      END IF;
      v_option_key := chr(64 + v_sort);
      v_score := coalesce(nullif (v_option ->> 'score', '')::numeric, 0);
      INSERT INTO public.question_options (question_id, option_key, content, is_correct, score, sort_order, metadata)
        VALUES (v_question_id, v_option_key, v_option ->> 'content', coalesce((v_option ->> 'isCorrect')::boolean, FALSE), v_score, v_sort, jsonb_build_object('legacyOptionId', v_option ->> 'id', 'legacyImageUrl', v_option ->> 'imageUrl', 'legacyResponseGroup', v_option ->> 'responseGroup', 'legacyResponseGroupOrder', v_option ->> 'responseGroupOrder'));
    END LOOP;

  IF nullif (btrim(v_ready.payload ->> 'explanation'), '') IS NOT NULL THEN
    INSERT INTO public.question_explanations (question_id, content, format, version)
      VALUES (v_question_id, v_ready.payload ->> 'explanation', 'html', 1);
  END IF;

  INSERT INTO public.question_knowledge_nodes (question_id, knowledge_node_id, relation_type)
    VALUES (v_question_id, v_ready.primary_node_id, 'primary');
  IF v_ready.secondary_node_id IS NOT NULL THEN
    INSERT INTO public.question_knowledge_nodes (question_id, knowledge_node_id, relation_type)
      VALUES (v_question_id, v_ready.secondary_node_id, 'secondary');
  END IF;

  INSERT INTO public.audit_logs (actor_user_id, action, entity_type, entity_id, old_data, new_data)
    VALUES (v_ready.reviewed_by, 'question.legacy_import.mapping_reviewed', 'question', v_question_id, NULL, jsonb_build_object('sourceQuestionId', v_ready.source_question_id, 'sourceQuestionCode', v_ready.source_question_code, 'primaryNodeCode', v_ready.primary_node_code, 'secondaryNodeCode', v_ready.secondary_node_code, 'published', p_publish, 'reviewMethod', v_ready.review_method));

  RETURN v_question_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.import_reviewed_cpns_legacy_batch (p_publish boolean DEFAULT FALSE, p_limit integer DEFAULT 500)
  RETURNS TABLE (
    imported_count integer,
    skipped_existing_count integer,
    remaining_ready_count integer)
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = pg_catalog,
  public,
  app_private
  AS $$
DECLARE
  v_row record;
  v_before uuid;
  v_imported integer := 0;
  v_skipped integer := 0;
BEGIN
  IF p_limit < 1 OR p_limit > 500 THEN
    RAISE EXCEPTION 'p_limit must be between 1 and 500';
  END IF;

  FOR v_row IN
  SELECT
    r.source_question_id,
    r.source_question_code
  FROM
    app_private.cpns_legacy_import_ready r
  ORDER BY
    r.source_question_code
  LIMIT p_limit LOOP
    SELECT
      q.id
    INTO
      v_before
    FROM
      public.questions q
    WHERE
      q.question_code = v_row.source_question_code;
    PERFORM
      public.import_reviewed_cpns_legacy_question (v_row.source_question_id, p_publish);
    IF v_before IS NULL THEN
      v_imported := v_imported + 1;
    ELSE
      v_skipped := v_skipped + 1;
    END IF;
  END LOOP;

  RETURN QUERY
  SELECT
    v_imported,
    v_skipped,
    count(*)::integer
  FROM
    app_private.cpns_legacy_import_ready r
  WHERE
    NOT EXISTS (
      SELECT
        1
      FROM
        public.questions q
      WHERE
        q.question_code = r.source_question_code);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_cpns_legacy_import_summary ()
  RETURNS TABLE (
    registry_total bigint,
    reviewed bigint,
    needs_revision bigint,
    raw_staged bigint,
    import_ready bigint,
    canonical_imported bigint)
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path = pg_catalog,
  public,
  app_private
  AS $$
  SELECT
    (
      SELECT
        count(*)
      FROM
        app_private.cpns_legacy_mapping_reviews),
    (
      SELECT
        count(*)
      FROM
        app_private.cpns_legacy_mapping_reviews
      WHERE
        review_status = 'reviewed'),
    (
      SELECT
        count(*)
      FROM
        app_private.cpns_legacy_mapping_reviews
      WHERE
        review_status = 'needs_revision'),
    (
      SELECT
        count(*)
      FROM
        app_private.cpns_legacy_import_stage),
    (
      SELECT
        count(*)
      FROM
        app_private.cpns_legacy_import_ready),
    (
      SELECT
        count(*)
      FROM
        public.questions
      WHERE (source_type = 'legacy_migration'
        AND source_reference LIKE 'TWK-%')
      OR (source_type = 'legacy_migration'
        AND source_reference LIKE 'TIU-%')
      OR (source_type = 'legacy_migration'
        AND source_reference LIKE 'TKP-%'));
$$;

REVOKE ALL ON FUNCTION public.stage_cpns_legacy_question (uuid, text, jsonb) FROM public, anon, authenticated;

REVOKE ALL ON FUNCTION public.import_reviewed_cpns_legacy_question (uuid, boolean) FROM public, anon, authenticated;

REVOKE ALL ON FUNCTION public.import_reviewed_cpns_legacy_batch (boolean, integer) FROM public, anon, authenticated;

REVOKE ALL ON FUNCTION public.get_cpns_legacy_import_summary () FROM public, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.stage_cpns_legacy_question (uuid, text, jsonb) TO service_role;

GRANT EXECUTE ON FUNCTION public.import_reviewed_cpns_legacy_question (uuid, boolean) TO service_role;

GRANT EXECUTE ON FUNCTION public.import_reviewed_cpns_legacy_batch (boolean, integer) TO service_role;

GRANT EXECUTE ON FUNCTION public.get_cpns_legacy_import_summary () TO service_role;
