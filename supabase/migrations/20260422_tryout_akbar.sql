-- Tryout Akbar event layer.
-- Keeps event operations separate from regular B2C tryout sessions.
CREATE TABLE IF NOT EXISTS public.tryout_events (
  id uuid DEFAULT uuid_generate_v4 () PRIMARY KEY,
  title text NOT NULL,
  description text,
  starts_at timestamp with time zone NOT NULL,
  ends_at timestamp with time zone NOT NULL,
  start_grace_minutes int NOT NULL DEFAULT 15 CHECK (start_grace_minutes >= 0),
  duration_minutes int NOT NULL DEFAULT 100 CHECK (duration_minutes > 0),
  max_participants int CHECK (max_participants IS NULL OR max_participants > 0),
  requires_code boolean NOT NULL DEFAULT FALSE,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'live', 'closed', 'cancelled')),
  result_visible_at timestamp with time zone,
  explanation_visible_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.tryout_events
  ADD COLUMN IF NOT EXISTS requires_code boolean NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS public.tryout_event_participants (
  id uuid DEFAULT uuid_generate_v4 () PRIMARY KEY,
  event_id uuid REFERENCES public.tryout_events (id) ON DELETE CASCADE NOT NULL,
  event_code_id uuid,
  user_id uuid REFERENCES public.profiles (id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'started', 'completed', 'timeout', 'cancelled')),
  registered_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (event_id, user_id)
);

ALTER TABLE public.tryout_event_participants
  ADD COLUMN IF NOT EXISTS event_code_id uuid;

CREATE TABLE IF NOT EXISTS public.tryout_event_codes (
  id uuid DEFAULT uuid_generate_v4 () PRIMARY KEY,
  event_id uuid REFERENCES public.tryout_events (id) ON DELETE CASCADE NOT NULL,
  code text NOT NULL,
  max_uses int NOT NULL DEFAULT 1 CHECK (max_uses > 0),
  used_count int NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  is_active boolean NOT NULL DEFAULT TRUE,
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (event_id, code)
);

ALTER TABLE public.tryout_event_participants
  DROP CONSTRAINT IF EXISTS tryout_event_participants_event_code_id_fkey;

ALTER TABLE public.tryout_event_participants
  ADD CONSTRAINT tryout_event_participants_event_code_id_fkey FOREIGN KEY (event_code_id) REFERENCES public.tryout_event_codes (id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.tryout_event_questions (
  id uuid DEFAULT uuid_generate_v4 () PRIMARY KEY,
  event_id uuid REFERENCES public.tryout_events (id) ON DELETE CASCADE NOT NULL,
  question_id uuid REFERENCES public.questions (id) ON DELETE CASCADE NOT NULL,
  sort_order int NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (event_id, question_id)
);

CREATE TABLE IF NOT EXISTS public.tryout_event_sessions (
  id uuid DEFAULT uuid_generate_v4 () PRIMARY KEY,
  event_id uuid REFERENCES public.tryout_events (id) ON DELETE CASCADE NOT NULL,
  session_id uuid REFERENCES public.test_sessions (id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles (id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL DEFAULT 'started' CHECK (status IN ('started', 'completed', 'timeout', 'cancelled')),
  started_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  finished_at timestamp with time zone,
  UNIQUE (event_id, user_id),
  UNIQUE (session_id)
);

CREATE INDEX IF NOT EXISTS tryout_events_status_starts_idx ON public.tryout_events (status, starts_at DESC);

CREATE INDEX IF NOT EXISTS tryout_event_participants_event_idx ON public.tryout_event_participants (event_id, status);

CREATE INDEX IF NOT EXISTS tryout_event_questions_event_idx ON public.tryout_event_questions (event_id, sort_order);

CREATE INDEX IF NOT EXISTS tryout_event_sessions_event_idx ON public.tryout_event_sessions (event_id, status);

CREATE INDEX IF NOT EXISTS tryout_event_codes_event_idx ON public.tryout_event_codes (event_id, is_active);

CREATE INDEX IF NOT EXISTS tryout_event_codes_lookup_idx ON public.tryout_event_codes (event_id, code);

CREATE INDEX IF NOT EXISTS tryout_event_participants_code_idx ON public.tryout_event_participants (event_code_id);

ALTER TABLE public.tryout_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tryout_event_participants ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tryout_event_questions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tryout_event_sessions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tryout_event_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read scheduled tryout events" ON public.tryout_events;

CREATE POLICY "Authenticated read scheduled tryout events" ON public.tryout_events
  FOR SELECT TO authenticated
  USING (status IN ('scheduled', 'live', 'closed'));

DROP POLICY IF EXISTS "Users read own tryout event participants" ON public.tryout_event_participants;

CREATE POLICY "Users read own tryout event participants" ON public.tryout_event_participants
  FOR SELECT TO authenticated
  USING (user_id = (
    SELECT
      auth.uid ()));

DROP POLICY IF EXISTS "Authenticated read tryout event questions" ON public.tryout_event_questions;

CREATE POLICY "Authenticated read tryout event questions" ON public.tryout_event_questions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT
      1
    FROM
      public.tryout_events te
    WHERE
      te.id = tryout_event_questions.event_id
      AND te.status IN ('scheduled', 'live', 'closed')));

DROP POLICY IF EXISTS "Users read own tryout event sessions" ON public.tryout_event_sessions;

CREATE POLICY "Users read own tryout event sessions" ON public.tryout_event_sessions
  FOR SELECT TO authenticated
  USING (user_id = (
    SELECT
      auth.uid ()));

CREATE OR REPLACE FUNCTION public.generate_tryout_event_questions (p_event_id uuid)
  RETURNS int
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  inserted_count int;
BEGIN
  IF p_event_id IS NULL THEN
    RAISE EXCEPTION 'Event ID wajib diisi';
  END IF;

  IF NOT EXISTS (
    SELECT
      1
    FROM
      public.tryout_events
    WHERE
      id = p_event_id) THEN
  RAISE EXCEPTION 'Event tidak ditemukan';
END IF;

  DELETE FROM public.tryout_event_questions
  WHERE event_id = p_event_id;

  CREATE temp TABLE IF NOT EXISTS temp_event_questions (
    question_id uuid,
    sort_order int
  ) ON COMMIT DROP;

  TRUNCATE temp_event_questions;

INSERT INTO temp_event_questions (question_id, sort_order)
SELECT
  q.id,
  tc.sort_order
FROM
  public.tryout_configurations tc
  CROSS JOIN LATERAL (
    SELECT
      id
    FROM
      public.questions q_inner
    WHERE
      q_inner.type = tc.type::question_type
      AND q_inner.sub_category = tc.sub_category
    ORDER BY
      random()
    LIMIT tc.question_count) q
WHERE
  tc.is_active = TRUE;

INSERT INTO public.tryout_event_questions (event_id, question_id, sort_order)
SELECT
  p_event_id,
  question_id,
  sort_order
FROM
  temp_event_questions;

  get diagnostics inserted_count = row_count;
  RETURN inserted_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_tryout_event_code_usage (p_code_id uuid)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
BEGIN
  UPDATE
    public.tryout_event_codes
  SET
    used_count = greatest (used_count - 1, 0),
    updated_at = timezone('utc'::text, now())
  WHERE
    id = p_code_id;
END;
$$;
