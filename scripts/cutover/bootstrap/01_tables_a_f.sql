-- Generated from canonical staging lpgrivowdcepcxradavu.
-- Runtime public tables A-F only. Constraints/indexes/RLS/functions/grants are separate fragments.
-- DO NOT apply to production before explicit final GO.

CREATE TABLE public.articles (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  title text NOT NULL,
  slug text NOT NULL,
  excerpt text,
  content text NOT NULL,
  category text,
  cover_image_url text,
  status text DEFAULT 'draft'::text NOT NULL,
  author_id uuid,
  published_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.attempt_answer_options (
  attempt_answer_id uuid NOT NULL,
  option_id uuid NOT NULL
);

CREATE TABLE public.attempt_answers (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  attempt_question_id uuid NOT NULL,
  selected_option_id uuid,
  answer_value text,
  is_correct boolean,
  score_awarded numeric(10,2) DEFAULT 0 NOT NULL,
  answered_at timestamp with time zone,
  time_spent_seconds integer DEFAULT 0 NOT NULL,
  is_flagged boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.attempt_events (
  id bigint DEFAULT nextval('attempt_events_id_seq'::regclass) NOT NULL,
  attempt_id uuid NOT NULL,
  event_type text NOT NULL,
  question_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.attempt_questions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  attempt_id uuid NOT NULL,
  question_id uuid NOT NULL,
  question_version integer NOT NULL,
  "position" integer NOT NULL,
  section_id uuid,
  question_snapshot jsonb NOT NULL,
  max_score numeric(10,2) DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.attempt_scores (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  attempt_id uuid NOT NULL,
  subject_id uuid,
  raw_score numeric(12,2) NOT NULL,
  normalized_score numeric(12,2),
  percentage numeric(7,4),
  passing_score numeric(12,2),
  passed boolean,
  correct_count integer DEFAULT 0 NOT NULL,
  wrong_count integer DEFAULT 0 NOT NULL,
  unanswered_count integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.attempt_section_states (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  attempt_id uuid NOT NULL,
  section_id uuid NOT NULL,
  status text DEFAULT 'locked'::text NOT NULL,
  started_at timestamp with time zone,
  deadline_at timestamp with time zone,
  completed_at timestamp with time zone,
  duration_used_seconds integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.audit_logs (
  id bigint DEFAULT nextval('audit_logs_id_seq'::regclass) NOT NULL,
  actor_user_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.certificate_templates (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  template_url text NOT NULL,
  config jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.certificates (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  event_id uuid NOT NULL,
  certificate_number text NOT NULL,
  template_id uuid NOT NULL,
  storage_path text NOT NULL,
  verification_code text NOT NULL,
  issued_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.class_members (
  class_id uuid NOT NULL,
  user_id uuid NOT NULL,
  joined_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.classes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL,
  name text NOT NULL,
  grade_level text,
  academic_year text,
  teacher_id uuid,
  status text DEFAULT 'active'::text NOT NULL
);

CREATE TABLE public.content_reviews (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  reviewer_id uuid,
  status text DEFAULT 'pending'::text NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  completed_at timestamp with time zone,
  review_stage text,
  question_version integer,
  review_round integer DEFAULT 1 NOT NULL,
  assigned_at timestamp with time zone,
  started_at timestamp with time zone,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.entitlements (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  feature_id uuid NOT NULL,
  source_type text NOT NULL,
  source_id uuid,
  starts_at timestamp with time zone DEFAULT now() NOT NULL,
  expires_at timestamp with time zone,
  usage_limit integer,
  usage_count integer DEFAULT 0 NOT NULL,
  status text DEFAULT 'active'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.event_products (
  product_id uuid NOT NULL,
  event_id uuid NOT NULL,
  session_id uuid,
  status text DEFAULT 'active'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.event_rankings (
  event_id uuid NOT NULL,
  user_id uuid NOT NULL,
  attempt_id uuid NOT NULL,
  score numeric(12,2) NOT NULL,
  duration_seconds integer NOT NULL,
  rank integer NOT NULL,
  rank_group text,
  calculated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.event_registrations (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  event_id uuid NOT NULL,
  session_id uuid,
  user_id uuid NOT NULL,
  order_id uuid,
  registration_number text NOT NULL,
  status text DEFAULT 'registered'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.event_sessions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  event_id uuid NOT NULL,
  exam_id uuid NOT NULL,
  name text NOT NULL,
  starts_at timestamp with time zone NOT NULL,
  ends_at timestamp with time zone NOT NULL,
  capacity integer,
  status text DEFAULT 'scheduled'::text NOT NULL
);

CREATE TABLE public.events (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  code text NOT NULL,
  title text NOT NULL,
  slug text NOT NULL,
  event_type text DEFAULT 'tryout_akbar'::text NOT NULL,
  program_id uuid NOT NULL,
  track_id uuid NOT NULL,
  description text,
  registration_start timestamp with time zone,
  registration_end timestamp with time zone,
  starts_at timestamp with time zone NOT NULL,
  ends_at timestamp with time zone NOT NULL,
  status text DEFAULT 'draft'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.exam_attempts (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  exam_id uuid NOT NULL,
  user_id uuid NOT NULL,
  attempt_number integer DEFAULT 1 NOT NULL,
  status text DEFAULT 'created'::text NOT NULL,
  started_at timestamp with time zone,
  submitted_at timestamp with time zone,
  duration_used_seconds integer,
  total_score numeric(12,2),
  percentage numeric(7,4),
  rank integer,
  passed boolean,
  last_question_position integer,
  last_saved_at timestamp with time zone,
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.exam_blueprint_rules (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  blueprint_id uuid NOT NULL,
  subject_id uuid NOT NULL,
  knowledge_node_id uuid,
  difficulty text,
  question_count integer NOT NULL,
  weight numeric(8,4),
  sort_order integer DEFAULT 0 NOT NULL
);

CREATE TABLE public.exam_blueprints (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  program_id uuid NOT NULL,
  track_id uuid NOT NULL,
  period_id uuid,
  description text,
  status text DEFAULT 'draft'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.exam_question_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  exam_id uuid NOT NULL,
  section_id uuid,
  question_id uuid NOT NULL,
  question_version integer NOT NULL,
  "position" integer NOT NULL,
  score_weight numeric(10,2),
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.exam_rules (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  program_id uuid NOT NULL,
  track_id uuid NOT NULL,
  period_id uuid,
  name text NOT NULL,
  duration_seconds integer,
  total_questions integer,
  scoring_method text NOT NULL,
  config jsonb DEFAULT '{}'::jsonb NOT NULL,
  effective_from date,
  effective_until date,
  status text DEFAULT 'draft'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.exam_sections (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  exam_id uuid NOT NULL,
  subject_id uuid,
  title text NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  question_count integer,
  duration_seconds integer,
  config jsonb DEFAULT '{}'::jsonb NOT NULL
);

CREATE TABLE public.exam_statistics (
  exam_id uuid NOT NULL,
  total_attempts bigint DEFAULT 0 NOT NULL,
  completed_attempts bigint DEFAULT 0 NOT NULL,
  average_score numeric(12,2) DEFAULT 0 NOT NULL,
  median_score numeric(12,2) DEFAULT 0 NOT NULL,
  average_duration numeric(12,2) DEFAULT 0 NOT NULL,
  pass_rate numeric(7,4) DEFAULT 0 NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.exam_types (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  description text
);

CREATE TABLE public.exams (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  program_id uuid NOT NULL,
  track_id uuid NOT NULL,
  period_id uuid,
  exam_type_id uuid NOT NULL,
  exam_rule_id uuid,
  blueprint_id uuid,
  title text NOT NULL,
  slug text NOT NULL,
  description text,
  duration_seconds integer,
  attempt_limit integer,
  question_order text DEFAULT 'fixed'::text NOT NULL,
  result_visibility text DEFAULT 'instant'::text NOT NULL,
  access_type text DEFAULT 'free'::text NOT NULL,
  status text DEFAULT 'draft'::text NOT NULL,
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  required_feature_id uuid,
  token_cost integer DEFAULT 0 NOT NULL
);

CREATE TABLE public.feature_flag_overrides (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  flag_id uuid NOT NULL,
  subject_type text NOT NULL,
  subject_id uuid NOT NULL,
  enabled boolean NOT NULL
);

CREATE TABLE public.feature_flags (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  key text NOT NULL,
  name text NOT NULL,
  enabled boolean DEFAULT false NOT NULL,
  rollout_percentage integer DEFAULT 0 NOT NULL,
  config jsonb DEFAULT '{}'::jsonb NOT NULL
);

CREATE TABLE public.features (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  description text
);
