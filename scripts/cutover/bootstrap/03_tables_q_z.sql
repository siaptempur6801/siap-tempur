-- Generated from canonical staging lpgrivowdcepcxradavu.
-- Runtime public tables Q-Z only. Constraints/indexes/RLS/functions/grants are separate fragments.
-- DO NOT apply to production before explicit final GO.
CREATE TABLE public.question_assets (
  id uuid DEFAULT gen_random_uuid () NOT NULL,
  question_id uuid NOT NULL,
  asset_type text NOT NULL,
  storage_path text NOT NULL,
  alt_text text,
  sort_order integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.question_explanations (
  id uuid DEFAULT gen_random_uuid () NOT NULL,
  question_id uuid NOT NULL,
  content text NOT NULL,
  format text DEFAULT 'markdown'::text NOT NULL,
  video_url text,
  version integer DEFAULT 1 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.question_knowledge_nodes (
  question_id uuid NOT NULL,
  knowledge_node_id uuid NOT NULL,
  relation_type text DEFAULT 'primary'::text NOT NULL
);

CREATE TABLE public.question_options (
  id uuid DEFAULT gen_random_uuid () NOT NULL,
  question_id uuid NOT NULL,
  option_key text NOT NULL,
  content text NOT NULL,
  is_correct boolean,
  score numeric(10, 2),
  sort_order integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  image_url text,
  response_group text,
  response_group_order integer,
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);

CREATE TABLE public.question_reports (
  id uuid DEFAULT gen_random_uuid () NOT NULL,
  question_id uuid NOT NULL,
  user_id uuid NOT NULL,
  attempt_id uuid,
  reason text NOT NULL,
  message text,
  status text DEFAULT 'open'::text NOT NULL,
  assigned_to uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  resolved_at timestamp with time zone
);

CREATE TABLE public.question_statistics (
  question_id uuid NOT NULL,
  attempt_count bigint DEFAULT 0 NOT NULL,
  correct_count bigint DEFAULT 0 NOT NULL,
  wrong_count bigint DEFAULT 0 NOT NULL,
  accuracy numeric(7, 4) DEFAULT 0 NOT NULL,
  average_time numeric(10, 2) DEFAULT 0 NOT NULL,
  report_count integer DEFAULT 0 NOT NULL,
  difficulty_index numeric(7, 4),
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.question_stimuli (
  id uuid DEFAULT gen_random_uuid () NOT NULL,
  stimulus_code text NOT NULL,
  program_id uuid NOT NULL,
  track_id uuid NOT NULL,
  subject_id uuid NOT NULL,
  title text,
  content text NOT NULL,
  image_url text,
  source_reference text,
  status text DEFAULT 'draft'::text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.question_tags (
  question_id uuid NOT NULL,
  tag_id uuid NOT NULL
);

CREATE TABLE public.question_versions (
  id uuid DEFAULT gen_random_uuid () NOT NULL,
  question_id uuid NOT NULL,
  version integer NOT NULL,
  snapshot jsonb NOT NULL,
  changed_by uuid NOT NULL,
  change_reason text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.questions (
  id uuid DEFAULT gen_random_uuid () NOT NULL,
  question_code text NOT NULL,
  program_id uuid NOT NULL,
  track_id uuid NOT NULL,
  subject_id uuid NOT NULL,
  question_type text DEFAULT 'single_choice'::text NOT NULL,
  stem text NOT NULL,
  difficulty text DEFAULT 'medium'::text NOT NULL,
  cognitive_level text,
  source_type text DEFAULT 'internal'::text NOT NULL,
  source_reference text,
  estimated_seconds integer,
  status text DEFAULT 'draft'::text NOT NULL,
  version integer DEFAULT 1 NOT NULL,
  author_id uuid NOT NULL,
  reviewer_id uuid,
  published_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  stimulus_id uuid,
  stimulus_order integer DEFAULT 1 NOT NULL,
  response_config jsonb DEFAULT '{}'::jsonb NOT NULL
);

CREATE TABLE public.refunds (
  id uuid DEFAULT gen_random_uuid () NOT NULL,
  payment_id uuid NOT NULL,
  amount numeric(14, 2) NOT NULL,
  reason text NOT NULL,
  status text DEFAULT 'pending'::text NOT NULL,
  requested_by uuid NOT NULL,
  processed_by uuid,
  provider_refund_id text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  completed_at timestamp with time zone
);

CREATE TABLE public.remedial_session_items (
  id uuid DEFAULT gen_random_uuid () NOT NULL,
  session_id uuid NOT NULL,
  question_id uuid NOT NULL,
  knowledge_node_id uuid,
  reason text NOT NULL,
  user_wrong_question_id uuid,
  "position" integer,
  status text DEFAULT 'pending'::text NOT NULL,
  review_count integer DEFAULT 0 NOT NULL,
  best_score numeric DEFAULT 0 NOT NULL,
  completed_at timestamp with time zone,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.remedial_sessions (
  id uuid DEFAULT gen_random_uuid () NOT NULL,
  user_id uuid NOT NULL,
  track_id uuid NOT NULL,
  source_attempt_id uuid,
  status text DEFAULT 'active'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  completed_at timestamp with time zone,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.role_permissions (
  role_id uuid NOT NULL,
  permission_id uuid NOT NULL
);

CREATE TABLE public.roles (
  id uuid DEFAULT gen_random_uuid () NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  description text
);

CREATE TABLE public.session_activity (
  id uuid DEFAULT gen_random_uuid () NOT NULL,
  user_id uuid NOT NULL,
  device_id uuid,
  session_id_hash text NOT NULL,
  ip inet,
  user_agent text,
  started_at timestamp with time zone DEFAULT now() NOT NULL,
  last_seen_at timestamp with time zone DEFAULT now() NOT NULL,
  ended_at timestamp with time zone
);

CREATE TABLE public.subjects (
  id uuid DEFAULT gen_random_uuid () NOT NULL,
  track_id uuid NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  slug text NOT NULL,
  subject_type text DEFAULT 'mandatory'::text NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  status text DEFAULT 'active'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.system_settings (
  key text NOT NULL,
  value jsonb NOT NULL,
  updated_by uuid NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.tags (
  id uuid DEFAULT gen_random_uuid () NOT NULL,
  name text NOT NULL,
  slug text NOT NULL
);

CREATE TABLE public.track_periods (
  id uuid DEFAULT gen_random_uuid () NOT NULL,
  track_id uuid NOT NULL,
  period_id uuid NOT NULL,
  is_active boolean DEFAULT TRUE NOT NULL,
  config jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.tracks (
  id uuid DEFAULT gen_random_uuid () NOT NULL,
  program_id uuid NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  level_order integer DEFAULT 0 NOT NULL,
  status text DEFAULT 'active'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.user_activity_daily (
  user_id uuid NOT NULL,
  activity_date date NOT NULL,
  questions_answered integer DEFAULT 0 NOT NULL,
  practice_seconds integer DEFAULT 0 NOT NULL,
  drill_attempts integer DEFAULT 0 NOT NULL,
  exam_attempts integer DEFAULT 0 NOT NULL,
  correct_answers integer DEFAULT 0 NOT NULL
);

CREATE TABLE public.user_devices (
  id uuid DEFAULT gen_random_uuid () NOT NULL,
  user_id uuid NOT NULL,
  device_fingerprint text NOT NULL,
  device_name text,
  last_ip inet,
  first_seen_at timestamp with time zone DEFAULT now() NOT NULL,
  last_seen_at timestamp with time zone DEFAULT now() NOT NULL,
  trusted boolean DEFAULT FALSE NOT NULL,
  revoked_at timestamp with time zone
);

CREATE TABLE public.user_knowledge_progress (
  id uuid DEFAULT gen_random_uuid () NOT NULL,
  user_id uuid NOT NULL,
  user_track_id uuid NOT NULL,
  knowledge_node_id uuid NOT NULL,
  attempted_questions integer DEFAULT 0 NOT NULL,
  correct_questions integer DEFAULT 0 NOT NULL,
  accuracy numeric(7, 4) DEFAULT 0 NOT NULL,
  average_score numeric(10, 4) DEFAULT 0 NOT NULL,
  average_time_seconds numeric(10, 2) DEFAULT 0 NOT NULL,
  mastery_score numeric(7, 4) DEFAULT 0 NOT NULL,
  mastery_level text DEFAULT 'unknown'::text NOT NULL,
  last_practiced_at timestamp with time zone,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.user_question_bookmarks (
  user_id uuid NOT NULL,
  question_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.user_question_notes (
  id uuid DEFAULT gen_random_uuid () NOT NULL,
  user_id uuid NOT NULL,
  question_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.user_question_state (
  user_id uuid NOT NULL,
  question_id uuid NOT NULL,
  times_seen integer DEFAULT 0 NOT NULL,
  times_correct integer DEFAULT 0 NOT NULL,
  times_wrong integer DEFAULT 0 NOT NULL,
  last_result text,
  needs_review boolean DEFAULT FALSE NOT NULL,
  next_review_at timestamp with time zone,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.user_readiness (
  id uuid DEFAULT gen_random_uuid () NOT NULL,
  user_id uuid NOT NULL,
  track_id uuid NOT NULL,
  readiness_score numeric(7, 4) NOT NULL,
  confidence_score numeric(7, 4),
  calculation_version text NOT NULL,
  calculated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.user_roles (
  id uuid DEFAULT gen_random_uuid () NOT NULL,
  user_id uuid NOT NULL,
  role_id uuid NOT NULL,
  scope_type text,
  scope_id uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.user_streaks (
  user_id uuid NOT NULL,
  current_streak integer DEFAULT 0 NOT NULL,
  longest_streak integer DEFAULT 0 NOT NULL,
  last_active_date date,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.user_subject_progress (
  id uuid DEFAULT gen_random_uuid () NOT NULL,
  user_id uuid NOT NULL,
  subject_id uuid NOT NULL,
  attempts integer DEFAULT 0 NOT NULL,
  questions_answered integer DEFAULT 0 NOT NULL,
  accuracy numeric(7, 4) DEFAULT 0 NOT NULL,
  mastery_score numeric(7, 4) DEFAULT 0 NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.user_track_preferences (
  id uuid DEFAULT gen_random_uuid () NOT NULL,
  user_track_id uuid NOT NULL,
  target_institution text,
  target_position text,
  school_name text,
  school_grade text,
  target_university text,
  target_major text,
  preferences jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.user_tracks (
  id uuid DEFAULT gen_random_uuid () NOT NULL,
  user_id uuid NOT NULL,
  track_id uuid NOT NULL,
  status text DEFAULT 'active'::text NOT NULL,
  target_year integer,
  started_at timestamp with time zone DEFAULT now() NOT NULL,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.user_wrong_questions (
  id uuid DEFAULT gen_random_uuid () NOT NULL,
  user_id uuid NOT NULL,
  user_track_id uuid NOT NULL,
  track_id uuid NOT NULL,
  subject_id uuid NOT NULL,
  question_id uuid NOT NULL,
  knowledge_node_id uuid,
  source_attempt_question_id uuid,
  last_source_attempt_id uuid,
  question_snapshot jsonb NOT NULL,
  first_failed_at timestamp with time zone NOT NULL,
  last_failed_at timestamp with time zone NOT NULL,
  failure_count integer DEFAULT 1 NOT NULL,
  wrong_count integer DEFAULT 0 NOT NULL,
  unanswered_count integer DEFAULT 0 NOT NULL,
  latest_outcome text NOT NULL,
  status text DEFAULT 'open'::text NOT NULL,
  resolved_at timestamp with time zone,
  last_reviewed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.wallet_transactions (
  id uuid DEFAULT gen_random_uuid () NOT NULL,
  wallet_id uuid NOT NULL,
  type text NOT NULL,
  amount integer NOT NULL,
  source_type text NOT NULL,
  source_id uuid,
  balance_after integer NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.wallets (
  id uuid DEFAULT gen_random_uuid () NOT NULL,
  user_id uuid NOT NULL,
  wallet_type text DEFAULT 'exam_token'::text NOT NULL,
  balance integer DEFAULT 0 NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.wrong_question_reviews (
  id uuid DEFAULT gen_random_uuid () NOT NULL,
  user_id uuid NOT NULL,
  user_wrong_question_id uuid NOT NULL,
  question_id uuid NOT NULL,
  selected_option_ids uuid[] DEFAULT ARRAY[]::uuid[] NOT NULL,
  is_correct boolean NOT NULL,
  score_awarded numeric DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  review_source text DEFAULT 'repeat_wrong'::text NOT NULL,
  remedial_session_item_id uuid
);
