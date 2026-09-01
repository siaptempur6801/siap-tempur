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
