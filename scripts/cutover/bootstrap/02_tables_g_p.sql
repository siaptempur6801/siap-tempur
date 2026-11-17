-- Generated from canonical staging lpgrivowdcepcxradavu.
-- Runtime public tables G-P only. Constraints/indexes/RLS/functions/grants are separate fragments.
-- DO NOT apply to production before explicit final GO.
CREATE TABLE public.generated_reports (
  id uuid DEFAULT gen_random_uuid () NOT NULL,
  organization_id uuid NOT NULL,
  report_type text NOT NULL,
  period text,
  storage_path text NOT NULL,
  generated_by uuid NOT NULL,
  generated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.knowledge_node_paths (
  ancestor_id uuid NOT NULL,
  descendant_id uuid NOT NULL,
  depth integer NOT NULL
);

CREATE TABLE public.knowledge_nodes (
  id uuid DEFAULT gen_random_uuid () NOT NULL,
  subject_id uuid NOT NULL,
  parent_id uuid,
  code text,
  name text NOT NULL,
  slug text NOT NULL,
  node_type text DEFAULT 'topic'::text NOT NULL,
  description text,
  depth integer DEFAULT 0 NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  status text DEFAULT 'active'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.leaderboard_entries (
  leaderboard_id uuid NOT NULL,
  user_id uuid NOT NULL,
  score numeric(12, 2) NOT NULL,
  rank integer NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.leaderboards (
  id uuid DEFAULT gen_random_uuid () NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  leaderboard_type text NOT NULL,
  program_id uuid,
  track_id uuid,
  starts_at timestamp with time zone NOT NULL,
  ends_at timestamp with time zone NOT NULL,
  status text DEFAULT 'active'::text NOT NULL
);

CREATE TABLE public.learning_recommendations (
  id uuid DEFAULT gen_random_uuid () NOT NULL,
  user_id uuid NOT NULL,
  track_id uuid NOT NULL,
  recommendation_type text NOT NULL,
  knowledge_node_id uuid,
  resource_id uuid,
  reason_code text NOT NULL,
  priority integer DEFAULT 0 NOT NULL,
  score numeric(7, 4) DEFAULT 0 NOT NULL,
  status text DEFAULT 'active'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  expires_at timestamp with time zone
);

CREATE TABLE public.material_knowledge_nodes (
  material_id uuid NOT NULL,
  knowledge_node_id uuid NOT NULL
);

CREATE TABLE public.materials (
  id uuid DEFAULT gen_random_uuid () NOT NULL,
  title text NOT NULL,
  slug text NOT NULL,
  material_type text NOT NULL,
  content text,
  content_format text DEFAULT 'markdown'::text NOT NULL,
  video_url text,
  thumbnail_url text,
  estimated_minutes integer,
  status text DEFAULT 'draft'::text NOT NULL,
  author_id uuid NOT NULL,
  reviewer_id uuid,
  published_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  access_type text DEFAULT 'FREE'::text NOT NULL,
  required_feature_id uuid
);

CREATE TABLE public.notification_campaigns (
  id uuid DEFAULT gen_random_uuid () NOT NULL,
  name text NOT NULL,
  channel text NOT NULL,
  audience_filter jsonb DEFAULT '{}'::jsonb NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  status text DEFAULT 'draft'::text NOT NULL,
  scheduled_at timestamp with time zone,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.notification_deliveries (
  id uuid DEFAULT gen_random_uuid () NOT NULL,
  campaign_id uuid NOT NULL,
  user_id uuid NOT NULL,
  status text DEFAULT 'pending'::text NOT NULL,
  provider_message_id text,
  sent_at timestamp with time zone,
  delivered_at timestamp with time zone,
  failed_at timestamp with time zone
);

CREATE TABLE public.notifications (
  id uuid DEFAULT gen_random_uuid () NOT NULL,
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb NOT NULL,
  read_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.order_items (
  id uuid DEFAULT gen_random_uuid () NOT NULL,
  order_id uuid NOT NULL,
  product_id uuid NOT NULL,
  quantity integer DEFAULT 1 NOT NULL,
  unit_price numeric(14, 2) NOT NULL,
  discount numeric(14, 2) DEFAULT 0 NOT NULL,
  total numeric(14, 2) NOT NULL
);

CREATE TABLE public.orders (
  id uuid DEFAULT gen_random_uuid () NOT NULL,
  order_number text NOT NULL,
  user_id uuid NOT NULL,
  status text DEFAULT 'pending'::text NOT NULL,
  subtotal numeric(14, 2) NOT NULL,
  discount_amount numeric(14, 2) DEFAULT 0 NOT NULL,
  total_amount numeric(14, 2) NOT NULL,
  currency text DEFAULT 'IDR'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  paid_at timestamp with time zone
);

CREATE TABLE public.organization_exam_assignments (
  id uuid DEFAULT gen_random_uuid () NOT NULL,
  organization_id uuid NOT NULL,
  exam_id uuid NOT NULL,
  class_id uuid,
  assigned_by uuid NOT NULL,
  starts_at timestamp with time zone,
  due_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.organization_licenses (
  id uuid DEFAULT gen_random_uuid () NOT NULL,
  organization_id uuid NOT NULL,
  product_id uuid NOT NULL,
  seat_limit integer NOT NULL,
  starts_at timestamp with time zone NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  status text DEFAULT 'active'::text NOT NULL
);

CREATE TABLE public.organization_members (
  id uuid DEFAULT gen_random_uuid () NOT NULL,
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL,
  status text DEFAULT 'active'::text NOT NULL,
  joined_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.organizations (
  id uuid DEFAULT gen_random_uuid () NOT NULL,
  type text DEFAULT 'school'::text NOT NULL,
  name text NOT NULL,
  code text NOT NULL,
  address text,
  city text,
  province text,
  status text DEFAULT 'active'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.payment_webhook_events (
  id uuid DEFAULT gen_random_uuid () NOT NULL,
  provider text NOT NULL,
  event_id text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  processed boolean DEFAULT FALSE NOT NULL,
  processed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.payments (
  id uuid DEFAULT gen_random_uuid () NOT NULL,
  order_id uuid NOT NULL,
  provider text NOT NULL,
  provider_transaction_id text,
  payment_method text,
  amount numeric(14, 2) NOT NULL,
  status text DEFAULT 'pending'::text NOT NULL,
  paid_at timestamp with time zone,
  raw_response jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.periods (
  id uuid DEFAULT gen_random_uuid () NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  start_date date,
  end_date date,
  status text DEFAULT 'upcoming'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.permissions (
  id uuid DEFAULT gen_random_uuid () NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  description text
);

CREATE TABLE public.product_features (
  product_id uuid NOT NULL,
  feature_id uuid NOT NULL,
  limit_value integer,
  config jsonb DEFAULT '{}'::jsonb NOT NULL
);

CREATE TABLE public.product_prices (
  id uuid DEFAULT gen_random_uuid () NOT NULL,
  product_id uuid NOT NULL,
  currency text DEFAULT 'IDR'::text NOT NULL,
  amount numeric(14, 2) NOT NULL,
  starts_at timestamp with time zone DEFAULT now() NOT NULL,
  ends_at timestamp with time zone,
  status text DEFAULT 'active'::text NOT NULL
);

CREATE TABLE public.product_wallet_grants (
  product_id uuid NOT NULL,
  wallet_type text DEFAULT 'exam_token'::text NOT NULL,
  amount integer NOT NULL,
  config jsonb DEFAULT '{}'::jsonb NOT NULL
);

CREATE TABLE public.products (
  id uuid DEFAULT gen_random_uuid () NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  description text,
  product_type text NOT NULL,
  program_id uuid,
  track_id uuid,
  duration_days integer,
  status text DEFAULT 'draft'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  full_name text NOT NULL,
  display_name text,
  avatar_url text,
  phone text,
  status text DEFAULT 'active'::text NOT NULL,
  onboarding_completed boolean DEFAULT FALSE NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  birth_date date,
  gender text,
  bio text,
  education_level text,
  target_instance text
);

CREATE TABLE public.programs (
  id uuid DEFAULT gen_random_uuid () NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  status text DEFAULT 'draft'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.promotion_products (
  promotion_id uuid NOT NULL,
  product_id uuid NOT NULL
);

CREATE TABLE public.promotion_redemptions (
  id uuid DEFAULT gen_random_uuid () NOT NULL,
  promotion_id uuid NOT NULL,
  user_id uuid NOT NULL,
  order_id uuid NOT NULL,
  redeemed_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.promotions (
  id uuid DEFAULT gen_random_uuid () NOT NULL,
  code text NOT NULL,
  discount_type text NOT NULL,
  discount_value numeric(14, 2) NOT NULL,
  max_redemptions integer,
  per_user_limit integer DEFAULT 1 NOT NULL,
  starts_at timestamp with time zone DEFAULT now() NOT NULL,
  ends_at timestamp with time zone,
  status text DEFAULT 'active'::text NOT NULL
);
