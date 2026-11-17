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
CREATE TABLE IF NOT EXISTS app_private.cpns_legacy_mapping_reviews (
  source_question_id uuid PRIMARY KEY,
  source_question_code text NOT NULL UNIQUE,
  subject_code text NOT NULL,
  legacy_category text,
  legacy_sub_category text,
  primary_node_code text,
  secondary_node_code text,
  review_status text NOT NULL DEFAULT 'pending',
  review_method text,
  review_notes text,
  reviewed_by uuid REFERENCES public.profiles (id) ON DELETE RESTRICT,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cpns_legacy_mapping_reviews_subject_check CHECK (subject_code IN ('TWK', 'TIU', 'TKP')),
  CONSTRAINT cpns_legacy_mapping_reviews_status_check CHECK (review_status IN ('pending', 'reviewed', 'needs_revision', 'blocked')),
  CONSTRAINT cpns_legacy_mapping_reviews_reviewed_check CHECK (review_status <> 'reviewed' OR (primary_node_code IS NOT NULL AND reviewed_at IS NOT NULL AND review_method IS NOT NULL)),
  CONSTRAINT cpns_legacy_mapping_reviews_secondary_distinct_check CHECK (secondary_node_code IS NULL OR secondary_node_code IS DISTINCT FROM primary_node_code)
);

CREATE INDEX IF NOT EXISTS idx_cpns_legacy_mapping_reviews_queue ON app_private.cpns_legacy_mapping_reviews (review_status, subject_code, source_question_code);

COMMENT ON TABLE app_private.cpns_legacy_mapping_reviews IS 'Manual mapping review registry for legacy CPNS questions. Migration must never derive target knowledge nodes from legacy categories automatically.';

COMMENT ON COLUMN app_private.cpns_legacy_mapping_reviews.primary_node_code IS 'Explicit reviewer decision. NULL while pending. Never auto-filled from legacy_category by migration.';

COMMENT ON COLUMN app_private.cpns_legacy_mapping_reviews.secondary_node_code IS 'Optional explicit reviewer decision for cross-topic questions.';

CREATE TABLE IF NOT EXISTS app_private.cpns_legacy_import_stage (
  source_question_id uuid PRIMARY KEY,
  source_question_code text NOT NULL UNIQUE,
  payload jsonb NOT NULL,
  staged_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cpns_legacy_import_stage_code ON app_private.cpns_legacy_import_stage (source_question_code);

COMMENT ON TABLE app_private.cpns_legacy_import_stage IS 'Raw legacy CPNS question payload staged before canonical Schema V2 import. Knowledge mapping is intentionally absent here and must come only from cpns_legacy_mapping_reviews.';

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

    IF NEW.review_method IS NULL OR NEW.reviewed_at IS NULL THEN
      RAISE EXCEPTION 'Reviewed mapping requires review_method and reviewed_at for %', NEW.source_question_code;
    END IF;
  ELSE
    IF NEW.primary_node_code IS NOT NULL OR NEW.secondary_node_code IS NOT NULL THEN
      RAISE EXCEPTION 'Unresolved mapping must not contain knowledge-node decisions for %', NEW.source_question_code;
    END IF;

    IF NEW.review_status IN ('needs_revision', 'blocked') AND (NEW.review_method IS NULL OR NEW.reviewed_at IS NULL) THEN
      RAISE EXCEPTION '% mapping requires review_method and reviewed_at for %', NEW.review_status, NEW.source_question_code;
    END IF;
  END IF;

  IF NEW.secondary_node_code IS NOT NULL AND NEW.secondary_node_code = NEW.primary_node_code THEN
    RAISE EXCEPTION 'Primary and secondary nodes must differ for %', NEW.source_question_code;
  END IF;

  NEW.updated_at := now();
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_cpns_legacy_mapping_review ON app_private.cpns_legacy_mapping_reviews;

CREATE TRIGGER trg_validate_cpns_legacy_mapping_review
  BEFORE INSERT OR UPDATE ON app_private.cpns_legacy_mapping_reviews
  FOR EACH ROW
  EXECUTE FUNCTION app_private.validate_cpns_legacy_mapping_review ();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT
      1
    FROM
      pg_constraint
    WHERE
      conrelid = 'app_private.cpns_legacy_mapping_reviews'::regclass
      AND conname = 'cpns_legacy_mapping_reviews_unresolved_has_no_nodes_check') THEN
  ALTER TABLE app_private.cpns_legacy_mapping_reviews
    ADD CONSTRAINT cpns_legacy_mapping_reviews_unresolved_has_no_nodes_check CHECK (review_status = 'reviewed' OR (primary_node_code IS NULL AND secondary_node_code IS NULL)) NOT valid;
END IF;
END
$$;

ALTER TABLE app_private.cpns_legacy_mapping_reviews validate CONSTRAINT cpns_legacy_mapping_reviews_unresolved_has_no_nodes_check;

CREATE INDEX IF NOT EXISTS idx_cpns_legacy_mapping_reviews_primary_node ON app_private.cpns_legacy_mapping_reviews (primary_node_code)
WHERE
  review_status = 'reviewed';

CREATE OR REPLACE VIEW app_private.cpns_legacy_import_ready AS
SELECT
  st.source_question_id,
  st.source_question_code,
  st.payload,
  r.subject_code,
  r.legacy_category,
  r.legacy_sub_category,
  r.primary_node_code,
  pkn.id AS primary_node_id,
  r.secondary_node_code,
  skn.id AS secondary_node_id,
  r.review_method,
  r.review_notes,
  r.reviewed_by,
  r.reviewed_at
FROM
  app_private.cpns_legacy_import_stage st
  JOIN app_private.cpns_legacy_mapping_reviews r ON r.source_question_id = st.source_question_id
    AND r.source_question_code = st.source_question_code
  JOIN public.subjects s ON s.code = r.subject_code
  JOIN public.tracks t ON t.id = s.track_id
    AND t.code = 'SKD'
  JOIN public.programs p ON p.id = t.program_id
    AND p.code = 'CPNS'
  JOIN public.knowledge_nodes pkn ON pkn.code = r.primary_node_code
    AND pkn.subject_id = s.id
  LEFT JOIN public.knowledge_nodes skn ON skn.code = r.secondary_node_code
    AND skn.subject_id = s.id
WHERE
  r.review_status = 'reviewed'
  AND (r.secondary_node_code IS NULL
    OR skn.id IS NOT NULL);

COMMENT ON VIEW app_private.cpns_legacy_import_ready IS 'Only raw-staged CPNS legacy questions with an explicit reviewed mapping and valid same-subject knowledge nodes. Importers must consume this view rather than infer mappings from legacy categories.';

CREATE OR REPLACE VIEW app_private.cpns_legacy_mapping_review_summary AS
SELECT
  subject_code,
  review_status,
  count(*)::bigint AS question_count
FROM
  app_private.cpns_legacy_mapping_reviews
GROUP BY
  subject_code,
  review_status;

COMMENT ON VIEW app_private.cpns_legacy_mapping_review_summary IS 'Operational summary of the manual CPNS legacy mapping review registry.';

REVOKE ALL ON FUNCTION app_private.validate_cpns_legacy_mapping_review () FROM public;

REVOKE ALL ON app_private.cpns_legacy_import_ready FROM public;

REVOKE ALL ON app_private.cpns_legacy_mapping_review_summary FROM public;

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

CREATE OR REPLACE FUNCTION public.stage_cpns_legacy_question (p_source_question_id uuid, p_source_question_code text, p_payload jsonb)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = pg_catalog, public, app_private
  AS $$
DECLARE
  v_payload_subject text;
  v_review_subject text;
  v_review_code text;
BEGIN
  IF p_source_question_id IS NULL OR nullif (btrim(p_source_question_code), '') IS NULL THEN
    RAISE EXCEPTION 'source_question_id and source_question_code are required';
  END IF;

  SELECT
    r.subject_code,
    r.source_question_code
  INTO
    v_review_subject,
    v_review_code
  FROM
    app_private.cpns_legacy_mapping_reviews r
  WHERE
    r.source_question_id = p_source_question_id;

  IF v_review_subject IS NULL THEN
    RAISE EXCEPTION 'No mapping-review registry row exists for source question %', p_source_question_id;
  END IF;
  IF v_review_code IS DISTINCT FROM p_source_question_code THEN
    RAISE EXCEPTION 'Registry question code mismatch: expected %, got %', v_review_code, p_source_question_code;
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
  IF v_payload_subject IS DISTINCT FROM v_review_subject THEN
    RAISE EXCEPTION 'Payload subject % does not match reviewed subject % for %', v_payload_subject, v_review_subject, p_source_question_code;
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

CREATE OR REPLACE VIEW app_private.cpns_legacy_import_ready AS
SELECT
  st.source_question_id,
  st.source_question_code,
  st.payload,
  r.subject_code,
  r.legacy_category,
  r.legacy_sub_category,
  r.primary_node_code,
  pkn.id AS primary_node_id,
  r.secondary_node_code,
  skn.id AS secondary_node_id,
  r.review_method,
  r.review_notes,
  r.reviewed_by,
  r.reviewed_at
FROM
  app_private.cpns_legacy_import_stage st
  JOIN app_private.cpns_legacy_mapping_reviews r ON r.source_question_id = st.source_question_id
    AND r.source_question_code = st.source_question_code
  JOIN public.subjects s ON s.code = r.subject_code
  JOIN public.tracks t ON t.id = s.track_id
    AND t.code = 'SKD'
  JOIN public.programs p ON p.id = t.program_id
    AND p.code = 'CPNS'
  JOIN public.knowledge_nodes pkn ON pkn.code = r.primary_node_code
    AND pkn.subject_id = s.id
  LEFT JOIN public.knowledge_nodes skn ON skn.code = r.secondary_node_code
    AND skn.subject_id = s.id
WHERE
  r.review_status = 'reviewed'
  AND (r.secondary_node_code IS NULL
    OR skn.id IS NOT NULL)
  AND (nullif (btrim(st.payload ->> 'imageUrl'), '') IS NULL
    OR nullif (btrim(st.payload ->> 'canonicalAssetStoragePath'), '') IS NOT NULL);

COMMENT ON VIEW app_private.cpns_legacy_import_ready IS 'Only raw-staged CPNS legacy questions with explicit reviewed mappings, valid same-subject nodes, and any required legacy question image already copied to canonical storage.';

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
  v_asset_path text;
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
    RAISE EXCEPTION 'Legacy question % is not import-ready: raw payload missing, mapping unresolved, node invalid, or required asset not migrated', p_source_question_id;
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
      END, NULL, 1, jsonb_build_object('scoringMode', 'single_option', 'legacySourceQuestionId', v_ready.source_question_id, 'legacyCategory', v_ready.legacy_category, 'legacySubCategory', v_ready.legacy_sub_category, 'legacyImageUrl', nullif (v_ready.payload ->> 'imageUrl', ''), 'mappingReview', jsonb_build_object('method', v_ready.review_method, 'notes', v_ready.review_notes, 'reviewedAt', v_ready.reviewed_at, 'primaryNodeCode', v_ready.primary_node_code, 'secondaryNodeCode', v_ready.secondary_node_code), 'migrationBatch', 'CPNS-LEGACY-MANUAL-MAPPING'), now(), now())
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

  v_asset_path := nullif (btrim(v_ready.payload ->> 'canonicalAssetStoragePath'), '');
  IF v_asset_path IS NOT NULL THEN
    INSERT INTO public.question_assets (question_id, asset_type, storage_path, alt_text, sort_order)
      VALUES (v_question_id, 'image', v_asset_path, 'Legacy CPNS question image for ' || v_ready.source_question_code, 0);
  END IF;

  INSERT INTO public.audit_logs (actor_user_id, action, entity_type, entity_id, old_data, new_data)
    VALUES (v_ready.reviewed_by, 'question.legacy_import.mapping_reviewed', 'question', v_question_id, NULL, jsonb_build_object('sourceQuestionId', v_ready.source_question_id, 'sourceQuestionCode', v_ready.source_question_code, 'primaryNodeCode', v_ready.primary_node_code, 'secondaryNodeCode', v_ready.secondary_node_code, 'canonicalAssetStoragePath', v_asset_path, 'published', p_publish, 'reviewMethod', v_ready.review_method));

  RETURN v_question_id;
END;
$$;

REVOKE ALL ON FUNCTION public.stage_cpns_legacy_question (uuid, text, jsonb) FROM public, anon, authenticated;

REVOKE ALL ON FUNCTION public.import_reviewed_cpns_legacy_question (uuid, boolean) FROM public, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.stage_cpns_legacy_question (uuid, text, jsonb) TO service_role;

GRANT EXECUTE ON FUNCTION public.import_reviewed_cpns_legacy_question (uuid, boolean) TO service_role;

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

-- TKA SMP Learning Hierarchy V1
-- Materialize safe 10-question drills for sufficiently populated lower-level
-- knowledge nodes and expose one authenticated, read-only hierarchy projection.
DO $migration$
DECLARE
  v_created_by uuid;
  v_feature_id uuid;
  v_exam_id uuid;
  v_exam_slug text;
  v_payload jsonb;
  r record;
BEGIN
  SELECT
    e.created_by
  INTO
    v_created_by
  FROM
    public.exams e
  WHERE
    e.slug = 'tka-smp-diagnostic-awal'
  LIMIT 1;

  IF v_created_by IS NULL THEN
    RAISE EXCEPTION 'TKA SMP diagnostic creator not found';
  END IF;

  SELECT
    f.id
  INTO
    v_feature_id
  FROM
    public.features f
  WHERE
    f.code = 'tka.smp.drill.unlimited'
  LIMIT 1;

  IF v_feature_id IS NULL THEN
    RAISE EXCEPTION 'TKA SMP drill feature not found';
  END IF;

  FOR r IN WITH candidates AS (
    SELECT
      kn.id AS knowledge_node_id,
      kn.name AS knowledge_node_name,
      kn.slug AS knowledge_node_slug,
      kn.depth,
      kn.sort_order,
      s.code AS subject_code,
      count(DISTINCT q.id)::integer AS published_question_count
    FROM
      public.knowledge_nodes kn
      JOIN public.subjects s ON s.id = kn.subject_id
      JOIN public.tracks t ON t.id = s.track_id
      JOIN public.programs p ON p.id = t.program_id
      LEFT JOIN public.knowledge_node_paths knp ON knp.ancestor_id = kn.id
      LEFT JOIN public.question_knowledge_nodes qkn ON qkn.knowledge_node_id = knp.descendant_id
        AND lower(qkn.relation_type) = 'primary'
    LEFT JOIN public.questions q ON q.id = qkn.question_id
      AND q.track_id = t.id
      AND lower(q.status) = 'published'
  WHERE
    upper(p.code) = 'TKA'
    AND upper(t.code) = 'SMP'
    AND lower(kn.status) = 'active'
    AND ((upper(s.code) = 'BIN'
        AND lower(kn.node_type) = 'subcompetency')
      OR (upper(s.code) = 'MAT'
        AND lower(kn.node_type) IN ('subelement', 'topic')))
  GROUP BY
    kn.id,
    kn.name,
    kn.slug,
    kn.depth,
    kn.sort_order,
    s.code
)
SELECT
  *
FROM
  candidates
WHERE
  published_question_count >= 10
ORDER BY
  subject_code,
  depth,
  sort_order,
  knowledge_node_name LOOP
    v_exam_slug := 'tka-smp-drill-' || lower(r.subject_code) || '-' || r.knowledge_node_slug;

    SELECT
      e.id
    INTO
      v_exam_id
    FROM
      public.exams e
    WHERE
      e.slug = v_exam_slug
    LIMIT 1;

    v_payload := public.admin_upsert_drill_exam_v1 (v_exam_id, 'TKA', 'SMP', r.subject_code, r.knowledge_node_id, 'Latihan Fokus ' || r.knowledge_node_name || ' TKA SMP', v_exam_slug, 900, 1, 10, 'random', 'instant', 'FREEMIUM', 'active', 0, v_created_by);

    v_exam_id := nullif (v_payload ->> 'exam_id', '')::uuid;
    IF v_exam_id IS NULL THEN
      RAISE EXCEPTION 'TKA SMP hierarchy drill materialization failed for %', r.knowledge_node_name;
    END IF;

    UPDATE
      public.exams
    SET
      required_feature_id = v_feature_id,
      attempt_limit = NULL,
      description = 'Drill 10 soal untuk ' || r.knowledge_node_name || '. Satu percobaan awal gratis; Tempur Pass membuka latihan lanjutan.',
      updated_at = now()
    WHERE
      id = v_exam_id;
  END LOOP;

  IF EXISTS ( WITH candidates AS (
      SELECT
        kn.id,
        kn.slug,
        s.code AS subject_code
      FROM
        public.knowledge_nodes kn
        JOIN public.subjects s ON s.id = kn.subject_id
        JOIN public.tracks t ON t.id = s.track_id
        JOIN public.programs p ON p.id = t.program_id
        JOIN public.knowledge_node_paths knp ON knp.ancestor_id = kn.id
        JOIN public.question_knowledge_nodes qkn ON qkn.knowledge_node_id = knp.descendant_id
          AND lower(qkn.relation_type) = 'primary'
        JOIN public.questions q ON q.id = qkn.question_id
          AND q.track_id = t.id
          AND lower(q.status) = 'published'
      WHERE
        upper(p.code) = 'TKA'
        AND upper(t.code) = 'SMP'
        AND lower(kn.status) = 'active'
        AND ((upper(s.code) = 'BIN'
            AND lower(kn.node_type) = 'subcompetency')
          OR (upper(s.code) = 'MAT'
            AND lower(kn.node_type) IN ('subelement', 'topic')))
      GROUP BY
        kn.id,
        kn.slug,
        s.code
      HAVING
        count(DISTINCT q.id) >= 10
)
      SELECT
        1
      FROM
        candidates c
      LEFT JOIN public.exams e ON e.slug = 'tka-smp-drill-' || lower(c.subject_code) || '-' || c.slug
        AND lower(e.status) = 'active'
    LEFT JOIN public.exam_sections es ON es.exam_id = e.id
    LEFT JOIN public.exam_question_items eqi ON eqi.exam_id = e.id
      AND eqi.section_id = es.id
  GROUP BY
    c.id,
    e.id,
    es.id,
    es.question_count
  HAVING
    e.id IS NULL
    OR es.question_count <> 10
    OR count(eqi.id) <> 10) THEN
RAISE EXCEPTION 'TKA SMP learning hierarchy frozen Drill gate failed';
END IF;
END;
$migration$;

CREATE OR REPLACE FUNCTION public.get_tka_smp_learning_hierarchy ()
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $function$
DECLARE
  v_user uuid := auth.uid ();
  v_track_id uuid;
  v_user_track_id uuid;
  v_items jsonb := '[]'::jsonb;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED';
  END IF;

  SELECT
    t.id
  INTO
    v_track_id
  FROM
    public.programs p
    JOIN public.tracks t ON t.program_id = p.id
  WHERE
    upper(p.code) = 'TKA'
    AND upper(t.code) = 'SMP'
  LIMIT 1;

  IF v_track_id IS NULL THEN
    RAISE EXCEPTION 'TKA_SMP_TRACK_NOT_FOUND';
  END IF;

  SELECT
    ut.id
  INTO
    v_user_track_id
  FROM
    public.user_tracks ut
  WHERE
    ut.user_id = v_user
    AND ut.track_id = v_track_id
    AND lower(ut.status) = 'active'
  LIMIT 1;

  IF v_user_track_id IS NULL THEN
    RAISE EXCEPTION 'ACTIVE_USER_TRACK_REQUIRED';
  END IF;

  WITH nodes AS (
    SELECT
      kn.id,
      kn.subject_id,
      kn.parent_id,
      kn.code,
      kn.name,
      kn.slug,
      kn.node_type,
      kn.depth,
      kn.sort_order,
      s.code AS subject_code,
      s.name AS subject_name,
      s.sort_order AS subject_sort_order
    FROM
      public.knowledge_nodes kn
      JOIN public.subjects s ON s.id = kn.subject_id
    WHERE
      s.track_id = v_track_id
      AND lower(kn.status) = 'active'
),
question_counts AS (
  SELECT
    n.id,
    count(DISTINCT q.id)::integer AS question_count
  FROM
    nodes n
    LEFT JOIN public.knowledge_node_paths knp ON knp.ancestor_id = n.id
    LEFT JOIN public.question_knowledge_nodes qkn ON qkn.knowledge_node_id = knp.descendant_id
      AND lower(qkn.relation_type) = 'primary'
    LEFT JOIN public.questions q ON q.id = qkn.question_id
      AND q.track_id = v_track_id
      AND lower(q.status) = 'published'
  GROUP BY
    n.id
),
hierarchy_rows AS (
  SELECT
    n.*,
    qc.question_count,
    coalesce(ukp.attempted_questions, 0)::integer AS attempted_questions,
    coalesce(ukp.correct_questions, 0)::integer AS correct_questions,
    coalesce(ukp.accuracy, 0)::numeric AS accuracy,
    coalesce(ukp.mastery_score, 0)::numeric AS mastery_score,
    coalesce(ukp.mastery_level, 'not_started') AS mastery_level,
    exact_drill.exam_slug AS exact_drill_slug,
    nearest_drill.knowledge_node_id AS drill_knowledge_node_id,
    nearest_drill.knowledge_node_code AS drill_knowledge_node_code,
    nearest_drill.knowledge_node_name AS drill_knowledge_node_name,
    nearest_drill.exam_slug AS drill_exam_slug,
    nearest_drill.distance AS drill_distance,
    path_nodes.path AS path
  FROM
    nodes n
    JOIN question_counts qc ON qc.id = n.id
    LEFT JOIN public.user_knowledge_progress ukp ON ukp.user_id = v_user
      AND ukp.user_track_id = v_user_track_id
      AND ukp.knowledge_node_id = n.id
    LEFT JOIN LATERAL (
      SELECT
        e.slug AS exam_slug
      FROM
        public.exams e
        JOIN public.exam_types et ON et.id = e.exam_type_id
      WHERE
        upper(et.code) = 'DRILL'
        AND lower(e.status) = 'active'
        AND e.slug = 'tka-smp-drill-' || lower(n.subject_code) || '-' || n.slug
      LIMIT 1) exact_drill ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        anc.id AS knowledge_node_id,
        anc.code AS knowledge_node_code,
        anc.name AS knowledge_node_name,
        e.slug AS exam_slug,
        knp.depth::integer AS distance
      FROM
        public.knowledge_node_paths knp
        JOIN public.knowledge_nodes anc ON anc.id = knp.ancestor_id
        JOIN public.exams e ON e.slug = 'tka-smp-drill-' || lower(n.subject_code) || '-' || anc.slug
          AND lower(e.status) = 'active'
        JOIN public.exam_types et ON et.id = e.exam_type_id
          AND upper(et.code) = 'DRILL'
      WHERE
        knp.descendant_id = n.id
        AND anc.subject_id = n.subject_id
        AND lower(anc.status) = 'active'
      ORDER BY
        knp.depth ASC,
        anc.depth DESC,
        anc.sort_order,
        anc.id
      LIMIT 1) nearest_drill ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        coalesce(jsonb_agg(jsonb_build_object('id', anc.id, 'code', anc.code, 'name', anc.name, 'node_type', anc.node_type, 'depth', anc.depth)
          ORDER BY knp.depth DESC), '[]'::jsonb) AS path
      FROM
        public.knowledge_node_paths knp
        JOIN public.knowledge_nodes anc ON anc.id = knp.ancestor_id
      WHERE
        knp.descendant_id = n.id
        AND anc.subject_id = n.subject_id
        AND lower(anc.status) = 'active') path_nodes ON TRUE
)
  SELECT
    coalesce(jsonb_agg(jsonb_build_object('knowledge_node_id', hr.id, 'knowledge_node_code', hr.code, 'name', hr.name, 'node_type', hr.node_type, 'depth', hr.depth, 'parent_id', hr.parent_id, 'sort_order', hr.sort_order, 'subject_id', hr.subject_id, 'subject_code', hr.subject_code, 'subject_name', hr.subject_name, 'subject_sort_order', hr.subject_sort_order, 'published_question_count', hr.question_count, 'attempted_questions', hr.attempted_questions, 'correct_questions', hr.correct_questions, 'accuracy', hr.accuracy, 'mastery_score', hr.mastery_score, 'mastery_level', hr.mastery_level, 'path', hr.path, 'drill', CASE WHEN hr.drill_exam_slug IS NULL THEN
            NULL
          ELSE
            jsonb_build_object('available', TRUE, 'exact', hr.drill_distance = 0, 'distance', hr.drill_distance, 'knowledge_node_id', hr.drill_knowledge_node_id, 'knowledge_node_code', hr.drill_knowledge_node_code, 'knowledge_node_name', hr.drill_knowledge_node_name, 'exam_slug', hr.drill_exam_slug, 'question_count', 10, 'duration_seconds', 900)
          END)
      ORDER BY hr.subject_sort_order, hr.subject_code, hr.depth, hr.sort_order, hr.code), '[]'::jsonb)
  INTO
    v_items
  FROM
    hierarchy_rows hr;

    RETURN jsonb_build_object('version', 'tka_smp_learning_hierarchy_v1', 'items', v_items, 'count', jsonb_array_length(v_items));
END;
$function$;

REVOKE ALL ON FUNCTION public.get_tka_smp_learning_hierarchy () FROM public;

REVOKE ALL ON FUNCTION public.get_tka_smp_learning_hierarchy () FROM anon;

GRANT EXECUTE ON FUNCTION public.get_tka_smp_learning_hierarchy () TO authenticated;
