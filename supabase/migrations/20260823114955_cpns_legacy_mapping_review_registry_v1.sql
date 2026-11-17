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
