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
