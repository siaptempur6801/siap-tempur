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
