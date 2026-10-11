CREATE TABLE IF NOT EXISTS app_private.cpns_legacy_import_stage (
  source_question_id uuid PRIMARY KEY,
  source_question_code text NOT NULL UNIQUE,
  payload jsonb NOT NULL,
  staged_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cpns_legacy_import_stage_code ON app_private.cpns_legacy_import_stage (source_question_code);

COMMENT ON TABLE app_private.cpns_legacy_import_stage IS TEXTVALUE0E;
