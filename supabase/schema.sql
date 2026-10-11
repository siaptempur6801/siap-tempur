-- Bootstrap schema for a fresh database.
-- For an existing database, apply files in supabase/migrations instead of rerunning this file end-to-end.
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Enums
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT
      1
    FROM
      pg_type
    WHERE
      typname = 'question_type') THEN
  CREATE TYPE question_type AS enum (
    'TWK',
    'TIU',
    'TKP'
);
END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT
      1
    FROM
      pg_type
    WHERE
      typname = 'session_mode') THEN
  CREATE TYPE session_mode AS enum (
    'practice',
    'tryout'
);
END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT
      1
    FROM
      pg_type
    WHERE
      typname = 'session_status') THEN
  CREATE TYPE session_status AS enum (
    'in_progress',
    'completed'
);
END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT
      1
    FROM
      pg_type
    WHERE
      typname = 'transaction_status') THEN
  CREATE TYPE transaction_status AS enum (
    'pending',
    'capture',
    'settlement',
    'expire',
    'cancel',
    'deny'
);
END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT
      1
    FROM
      pg_type t
      JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE
      t.typname = 'transaction_status'
      AND e.enumlabel = 'capture') THEN
  ALTER TYPE transaction_status
    ADD value 'capture';
END IF;
END
$$;

-- 2. Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid REFERENCES auth.users (id) ON DELETE CASCADE NOT NULL PRIMARY KEY,
  full_name text,
  avatar_url text,
  bio text,
  role text NOT NULL DEFAULT 'user',
  tryout_quota int NOT NULL DEFAULT 0,
  streak_count int NOT NULL DEFAULT 0,
  last_activity_date date,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS avatar_url text;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS bio text;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS ROLE text NOT NULL DEFAULT 'user';

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS tryout_quota int NOT NULL DEFAULT 0;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS streak_count int NOT NULL DEFAULT 0;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_activity_date date;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL;

-- 3. Questions & Options
CREATE SEQUENCE IF NOT EXISTS question_code_seq START 1;

CREATE SEQUENCE IF NOT EXISTS questions_twk_code_seq START 1;

CREATE SEQUENCE IF NOT EXISTS questions_tiu_code_seq START 1;

CREATE SEQUENCE IF NOT EXISTS questions_tkp_code_seq START 1;

CREATE OR REPLACE FUNCTION generate_question_code ()
  RETURNS text
  LANGUAGE plpgsql
  SET search_path = public
  AS $$
BEGIN
  RETURN 'Q-' || lpad(nextval('question_code_seq')::text, 6, '0');
END;
$$;

CREATE OR REPLACE FUNCTION next_question_code_by_type (question_type_input question_type)
  RETURNS text
  LANGUAGE plpgsql
  SET search_path = public
  AS $$
DECLARE
  code_prefix text;
  next_number bigint;
BEGIN
  CASE question_type_input
  WHEN 'TWK' THEN
    code_prefix := 'TWK';
    next_number := nextval('questions_twk_code_seq');
  WHEN 'TIU' THEN
    code_prefix := 'TIU';
    next_number := nextval('questions_tiu_code_seq');
  WHEN 'TKP' THEN
    code_prefix := 'TKP';
    next_number := nextval('questions_tkp_code_seq');
  ELSE
    RAISE EXCEPTION 'Unsupported question type: %', question_type_input;
  END CASE;

  RETURN code_prefix || '-' || lpad(next_number::text, 6, '0');
END;
$$;

CREATE OR REPLACE FUNCTION assign_question_code_by_type ()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path = public
  AS $$
BEGIN
  IF NEW.question_code IS NULL OR btrim(NEW.question_code) = '' THEN
    NEW.question_code := next_question_code_by_type (NEW.type);
  END IF;

  RETURN new;
END;
$$;

CREATE TABLE IF NOT EXISTS questions (
  id uuid DEFAULT uuid_generate_v4 () PRIMARY KEY,
  question_code text NOT NULL,
  content text NOT NULL,
  type question_type NOT NULL,
  category text,
  sub_category text,
  explanation text,
  image_url text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS question_code text;

ALTER TABLE questions
  ALTER COLUMN question_code DROP DEFAULT;

ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS category text;

ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS sub_category text;

ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS explanation text;

ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS image_url text;

ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL;

DROP TRIGGER IF EXISTS questions_assign_question_code ON questions;

CREATE TRIGGER questions_assign_question_code
  BEFORE INSERT ON questions
  FOR EACH ROW
  EXECUTE FUNCTION assign_question_code_by_type ();

WITH ranked_questions AS (
  SELECT
    id,
    type,
    row_number() OVER (PARTITION BY type ORDER BY created_at,
      id) AS sequence_number
  FROM
    questions)
UPDATE
  questions
SET
  question_code = CASE ranked_questions.type
  WHEN 'TWK' THEN
    'TWK-' || lpad(ranked_questions.sequence_number::text, 6, '0')
  WHEN 'TIU' THEN
    'TIU-' || lpad(ranked_questions.sequence_number::text, 6, '0')
  WHEN 'TKP' THEN
    'TKP-' || lpad(ranked_questions.sequence_number::text, 6, '0')
  END
FROM
  ranked_questions
WHERE
  questions.id = ranked_questions.id
  AND (questions.question_code IS NULL
    OR questions.question_code !~ '^(TWK|TIU|TKP)-[0-9]{6}$');

SELECT
  setval('questions_twk_code_seq', greatest ((
      SELECT
        count(*)
      FROM questions
      WHERE
        type = 'TWK') + 1, 1), FALSE);

SELECT
  setval('questions_tiu_code_seq', greatest ((
      SELECT
        count(*)
      FROM questions
      WHERE
        type = 'TIU') + 1, 1), FALSE);

SELECT
  setval('questions_tkp_code_seq', greatest ((
      SELECT
        count(*)
      FROM questions
      WHERE
        type = 'TKP') + 1, 1), FALSE);

ALTER TABLE questions
  ALTER COLUMN question_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS questions_question_code_key ON questions (question_code);

CREATE TABLE IF NOT EXISTS options (
  id uuid DEFAULT uuid_generate_v4 () PRIMARY KEY,
  question_id uuid REFERENCES questions (id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  image_url text,
  is_correct boolean NOT NULL DEFAULT FALSE,
  score_value int NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE options
  ADD COLUMN IF NOT EXISTS image_url text;

ALTER TABLE options
  ADD COLUMN IF NOT EXISTS is_correct boolean NOT NULL DEFAULT FALSE;

ALTER TABLE options
  ADD COLUMN IF NOT EXISTS score_value int NOT NULL DEFAULT 0;

ALTER TABLE options
  ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL;

-- 5. Test Sessions & Answers
CREATE TABLE IF NOT EXISTS test_sessions (
  id uuid DEFAULT uuid_generate_v4 () PRIMARY KEY,
  user_id uuid REFERENCES profiles (id) ON DELETE CASCADE NOT NULL,
  mode session_mode NOT NULL DEFAULT 'practice',
  status session_status NOT NULL DEFAULT 'in_progress',
  start_time timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  end_time timestamp with time zone,
  -- Scores
  score_twk int NOT NULL DEFAULT 0,
  score_tiu int NOT NULL DEFAULT 0,
  score_tkp int NOT NULL DEFAULT 0,
  total_score int NOT NULL DEFAULT 0,
  is_passed boolean NOT NULL DEFAULT FALSE,
  current_question_index integer NOT NULL DEFAULT 0,
  marked_questions jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_activity_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE test_sessions
  ADD COLUMN IF NOT EXISTS current_question_index integer NOT NULL DEFAULT 0;

ALTER TABLE test_sessions
  ADD COLUMN IF NOT EXISTS marked_questions jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE test_sessions
  ADD COLUMN IF NOT EXISTS last_activity_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now());

ALTER TABLE test_sessions
  ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL;

CREATE TABLE IF NOT EXISTS test_answers (
  id uuid DEFAULT uuid_generate_v4 () PRIMARY KEY,
  session_id uuid REFERENCES test_sessions (id) ON DELETE CASCADE NOT NULL,
  question_id uuid REFERENCES questions (id) NOT NULL,
  option_id uuid REFERENCES options (id),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (session_id, question_id)
);

-- 7. Transactions (Midtrans)
CREATE TABLE IF NOT EXISTS transactions (
  id uuid DEFAULT uuid_generate_v4 () PRIMARY KEY,
  user_id uuid REFERENCES profiles (id) ON DELETE CASCADE NOT NULL,
  order_id text UNIQUE NOT NULL,
  amount int NOT NULL,
  status transaction_status DEFAULT 'pending',
  package_name text NOT NULL,
  snap_token text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS tryout_configurations (
  id uuid DEFAULT uuid_generate_v4 () PRIMARY KEY,
  type varchar NOT NULL,
  sub_category varchar NOT NULL,
  question_count int NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT TRUE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT
      1
    FROM
      pg_constraint
    WHERE
      conname = 'tryout_configurations_type_sub_category_key') THEN
  ALTER TABLE tryout_configurations
    ADD CONSTRAINT tryout_configurations_type_sub_category_key UNIQUE (type, sub_category);
END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.leaderboard_snapshot') IS NULL THEN
    CREATE TABLE leaderboard_snapshot (
      rank_pos int,
      user_id uuid PRIMARY KEY REFERENCES profiles (id ) ON DELETE CASCADE,
      full_name text,
      avatar_url text,
      top_score int,
      score_twk int,
      score_tiu int,
      score_tkp int,
      updated_at timestamp with time zone DEFAULT now( )
    );
END IF;
END
$$;

INSERT INTO tryout_configurations (type, sub_category, question_count, sort_order)
VALUES
  ('TWK', 'Nasionalisme', 6, 1),
  ('TWK', 'Integritas', 6, 2),
  ('TWK', 'Bela Negara', 6, 3),
  ('TWK', 'Pilar Negara', 6, 4),
  ('TWK', 'Bahasa Negara', 6, 5),
  ('TIU', 'Analogi', 3, 6),
  ('TIU', 'Silogisme', 3, 7),
  ('TIU', 'Analitis', 4, 8),
  ('TIU', 'Berhitung', 5, 9),
  ('TIU', 'Deret Angka', 5, 10),
  ('TIU', 'Perbandingan Kuantitatif', 5, 11),
  ('TIU', 'Soal Cerita', 5, 12),
  ('TIU', 'Analogi Figural', 2, 13),
  ('TIU', 'Ketidaksamaan', 1, 14),
  ('TIU', 'Serial', 2, 15),
  ('TKP', 'Pelayanan Publik', 8, 16),
  ('TKP', 'Jejaring Kerja', 8, 17),
  ('TKP', 'Sosial Budaya', 7, 18),
  ('TKP', 'Teknologi Informasi dan Komunikasi', 7, 19),
  ('TKP', 'Profesionalisme', 7, 20),
  ('TKP', 'Anti-Radikalisme', 8, 21)
ON CONFLICT (type, sub_category)
  DO UPDATE SET
    question_count = excluded.question_count,
    sort_order = excluded.sort_order;

CREATE INDEX IF NOT EXISTS idx_questions_type_subcategory ON questions (type, sub_category);

CREATE INDEX IF NOT EXISTS test_sessions_active_lookup_idx ON test_sessions (user_id, mode, status, last_activity_at DESC);

DO $$
BEGIN
  IF EXISTS (
    SELECT
      1
    FROM
      pg_class
    WHERE
      oid = to_regclass('public.leaderboard_snapshot')
      AND relkind IN ('r', 'm')) THEN
  CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON leaderboard_snapshot (top_score DESC);
END IF;
END
$$;

-- 8. Policies (RLS)
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS questions ENABLE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS options ENABLE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS test_sessions ENABLE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS test_answers ENABLE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS transactions ENABLE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS tryout_configurations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (
    SELECT
      1
    FROM
      pg_class
    WHERE
      oid = to_regclass('public.leaderboard_snapshot')
      AND relkind = 'r') THEN
  ALTER TABLE leaderboard_snapshot ENABLE ROW LEVEL SECURITY;
END IF;
END
$$;

-- (Basic Policies - Extend as needed)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT
  USING ((
    SELECT
      auth.uid ()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE
  USING ((
    SELECT
      auth.uid ()) = id);

DROP POLICY IF EXISTS "Public read questions" ON questions;

CREATE POLICY "Public read questions" ON questions
  FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Public read options" ON options;

CREATE POLICY "Public read options" ON options
  FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Users can view own sessions" ON test_sessions;

CREATE POLICY "Users can view own sessions" ON test_sessions
  FOR SELECT
  USING ((
    SELECT
      auth.uid ()) = user_id);

DROP POLICY IF EXISTS "Users can create own sessions" ON test_sessions;

DROP POLICY IF EXISTS "Users can insert own sessions" ON test_sessions;

CREATE POLICY "Users can create own sessions" ON test_sessions
  FOR INSERT
  WITH CHECK ((
    SELECT
      auth.uid ()) = user_id);

DROP POLICY IF EXISTS "Users can update own sessions" ON test_sessions;

CREATE POLICY "Users can update own sessions" ON test_sessions
  FOR UPDATE
  USING ((
    SELECT
      auth.uid ()) = user_id);

DROP POLICY IF EXISTS "Users can view own answers" ON test_answers;

CREATE POLICY "Users can view own answers" ON test_answers
  FOR SELECT
  USING (EXISTS (
    SELECT
      1
    FROM
      test_sessions ts
    WHERE
      ts.id = test_answers.session_id
      AND ts.user_id = (
        SELECT
          auth.uid ())));

DROP POLICY IF EXISTS "Users can update own answers" ON test_answers;

CREATE POLICY "Users can update own answers" ON test_answers
  FOR UPDATE
  USING (EXISTS (
    SELECT
      1
    FROM
      test_sessions ts
    WHERE
      ts.id = test_answers.session_id
      AND ts.user_id = (
        SELECT
          auth.uid ())))
  WITH CHECK (EXISTS (
    SELECT
      1
    FROM
      test_sessions ts
    WHERE
      ts.id = test_answers.session_id
      AND ts.user_id = (
        SELECT
          auth.uid ())));

DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;

CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT
  USING ((
    SELECT
      auth.uid ()) = user_id);

DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;

CREATE POLICY "Users can insert own transactions" ON transactions
  FOR INSERT
  WITH CHECK ((
    SELECT
      auth.uid ()) = user_id);

DROP POLICY IF EXISTS "Anyone can read tryout configurations" ON tryout_configurations;

CREATE POLICY "Anyone can read tryout configurations" ON tryout_configurations
  FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Admins can insert tryout configurations" ON tryout_configurations;

CREATE POLICY "Admins can insert tryout configurations" ON tryout_configurations
  FOR INSERT
  WITH CHECK ((
    SELECT
      ROLE
    FROM
      profiles
    WHERE
      id = (
        SELECT
          auth.uid ())) = 'admin');

DROP POLICY IF EXISTS "Admins can update tryout configurations" ON tryout_configurations;

CREATE POLICY "Admins can update tryout configurations" ON tryout_configurations
  FOR UPDATE
  USING ((
    SELECT
      ROLE
    FROM
      profiles
    WHERE
      id = (
        SELECT
          auth.uid ())) = 'admin');

DROP POLICY IF EXISTS "Admins can delete tryout configurations" ON tryout_configurations;

CREATE POLICY "Admins can delete tryout configurations" ON tryout_configurations
  FOR DELETE
  USING ((
    SELECT
      ROLE
    FROM
      profiles
    WHERE
      id = (
        SELECT
          auth.uid ())) = 'admin');

DO $$
BEGIN
  IF EXISTS (
    SELECT
      1
    FROM
      pg_class
    WHERE
      oid = to_regclass('public.leaderboard_snapshot')
      AND relkind = 'r') THEN
  DROP POLICY IF EXISTS "Anyone can view leaderboard" ON leaderboard_snapshot;
  CREATE POLICY "Anyone can view leaderboard" ON leaderboard_snapshot
    FOR SELECT TO authenticated
    USING (TRUE );
END IF;
END
$$;

-- 9. Functions
CREATE OR REPLACE FUNCTION handle_new_user ()
  RETURNS TRIGGER
  AS $$
BEGIN
  INSERT INTO profiles (id, full_name, streak_count)
    VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name', 0)
  ON CONFLICT (id)
    DO UPDATE SET
      full_name = coalesce(excluded.full_name, profiles.full_name);

  RETURN new;
END;
$$
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION update_user_streak ()
  RETURNS TRIGGER
  AS $$
DECLARE
  current_streak int;
  last_date date;
  today date := CURRENT_DATE;
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    SELECT
      streak_count,
      last_activity_date
    INTO
      current_streak,
      last_date
    FROM
      profiles
    WHERE
      id = NEW.user_id;

    IF last_date IS NULL THEN
      UPDATE
        profiles
      SET
        streak_count = 1,
        last_activity_date = today
      WHERE
        id = NEW.user_id;
    ELSIF last_date = today - 1 THEN
      UPDATE
        profiles
      SET
        streak_count = current_streak + 1,
        last_activity_date = today
      WHERE
        id = NEW.user_id;
    ELSIF last_date < today - 1 THEN
      UPDATE
        profiles
      SET
        streak_count = 1,
        last_activity_date = today
      WHERE
        id = NEW.user_id;
    END IF;
  END IF;

  RETURN new;
END;
$$
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION update_tryout_configurations_updated_at ()
  RETURNS TRIGGER
  AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN new;
END;
$$
LANGUAGE plpgsql
SET search_path = public;

CREATE OR REPLACE FUNCTION increment_tryout_quota (user_id_param uuid, increment_by int)
  RETURNS void
  AS $$
BEGIN
  UPDATE
    profiles
  SET
    tryout_quota = coalesce(tryout_quota, 0) + increment_by
  WHERE
    id = user_id_param;
END;
$$
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION calculate_session_score (session_uuid uuid)
  RETURNS void
  AS $$
DECLARE
  v_twk int;
  v_tiu int;
  v_tkp int;
  v_total int;
  v_passed boolean;
  pass_twk int := 65;
  pass_tiu int := 80;
  pass_tkp int := 166;
BEGIN
  SELECT
    coalesce(sum(
        CASE WHEN q.type = 'TWK'
          AND o.is_correct THEN
          5
        ELSE
          0
        END), 0)
  INTO
    v_twk
  FROM
    test_answers a
    JOIN questions q ON a.question_id = q.id
    LEFT JOIN options o ON a.option_id = o.id
  WHERE
    a.session_id = session_uuid;

  SELECT
    coalesce(sum(
        CASE WHEN q.type = 'TIU'
          AND o.is_correct THEN
          5
        ELSE
          0
        END), 0)
  INTO
    v_tiu
  FROM
    test_answers a
    JOIN questions q ON a.question_id = q.id
    LEFT JOIN options o ON a.option_id = o.id
  WHERE
    a.session_id = session_uuid;

  SELECT
    coalesce(sum(
        CASE WHEN q.type = 'TKP' THEN
          coalesce(o.score_value, 0)
        ELSE
          0
        END), 0)
  INTO
    v_tkp
  FROM
    test_answers a
    JOIN questions q ON a.question_id = q.id
    LEFT JOIN options o ON a.option_id = o.id
  WHERE
    a.session_id = session_uuid;

  v_total := v_twk + v_tiu + v_tkp;
  v_passed := (v_twk >= pass_twk
    AND v_tiu >= pass_tiu
    AND v_tkp >= pass_tkp);

  UPDATE
    test_sessions
  SET
    score_twk = v_twk,
    score_tiu = v_tiu,
    score_tkp = v_tkp,
    total_score = v_total,
    is_passed = v_passed,
    status = 'completed',
    end_time = now(),
    last_activity_at = now()
  WHERE
    id = session_uuid;
END;
$$
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION start_practice_session (p_user_id uuid, p_type question_type, p_limit int DEFAULT 10)
  RETURNS TABLE (
    session_id uuid,
    questions json
  )
  AS $$
DECLARE
  v_session_id uuid;
  v_questions json;
BEGIN
  INSERT INTO test_sessions (user_id, mode, status, start_time, last_activity_at)
    VALUES (p_user_id, 'practice', 'in_progress', now(), now())
  RETURNING
    id
  INTO
    v_session_id;

  WITH selected_questions AS (
    SELECT
      id,
      content,
      type,
      category,
      sub_category,
      image_url
    FROM
      questions
    WHERE
      type = p_type
    ORDER BY
      random()
    LIMIT p_limit
),
inserted_answers AS (
INSERT INTO test_answers (session_id, question_id)
  SELECT
    v_session_id,
    id
  FROM
    selected_questions
  RETURNING
    question_id
)
SELECT
  json_agg(json_build_object('id', q.id, 'content', q.content, 'type', q.type, 'category', q.category, 'sub_category', q.sub_category, 'image_url', q.image_url, 'options', (
        SELECT
          json_agg(json_build_object('id', o.id, 'content', o.content, 'image_url', o.image_url)
        ORDER BY random())
      FROM options o
      WHERE
        o.question_id = q.id)))
INTO
  v_questions
FROM
  selected_questions q
  JOIN inserted_answers ia ON ia.question_id = q.id;

    RETURN QUERY
    SELECT
      v_session_id,
      v_questions;
END;
$$
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION start_tryout_session (p_user_id uuid)
  RETURNS TABLE (
    session_id uuid,
    questions json
  )
  AS $$
DECLARE
  v_session_id uuid;
  v_questions json;
  v_quota int;
BEGIN
  SELECT
    tryout_quota
  INTO
    v_quota
  FROM
    profiles
  WHERE
    id = p_user_id;

  IF v_quota IS NULL OR v_quota < 1 THEN
    RAISE EXCEPTION 'Not enough SKD tickets';
  END IF;

  UPDATE
    profiles
  SET
    tryout_quota = tryout_quota - 1
  WHERE
    id = p_user_id;

  INSERT INTO test_sessions (user_id, mode, status, start_time, last_activity_at)
    VALUES (p_user_id, 'tryout', 'in_progress', now(), now())
  RETURNING
    id
  INTO
    v_session_id;

  CREATE temp TABLE IF NOT EXISTS temp_selected_questions (
    question_id uuid,
    sort_order int
  ) ON COMMIT DROP;

  TRUNCATE temp_selected_questions;

  INSERT INTO temp_selected_questions (question_id, sort_order)
  SELECT
    q.id,
    tc.sort_order
  FROM
    tryout_configurations tc
  CROSS JOIN LATERAL (
    SELECT
      id
    FROM
      questions q_inner
    WHERE
      q_inner.type = tc.type::question_type
      AND q_inner.sub_category = tc.sub_category
    ORDER BY
      random()
    LIMIT tc.question_count) q
WHERE
  tc.is_active = TRUE;

  INSERT INTO test_answers (session_id, question_id)
  SELECT
    v_session_id,
    question_id
  FROM
    temp_selected_questions;

  SELECT
    json_agg(json_build_object('id', q.id, 'content', q.content, 'type', q.type, 'category', q.category, 'sub_category', q.sub_category, 'image_url', q.image_url, 'options', (
          SELECT
            json_agg(json_build_object('id', o.id, 'content', o.content, 'image_url', o.image_url)
          ORDER BY random())
        FROM options o
        WHERE
          o.question_id = q.id))
    ORDER BY tsq.sort_order, random())
  INTO
    v_questions
  FROM
    temp_selected_questions tsq
    JOIN questions q ON q.id = tsq.question_id;

  RETURN QUERY
  SELECT
    v_session_id,
    v_questions;
END;
$$
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION refresh_leaderboard_snapshot ()
  RETURNS void
  AS $$
BEGIN
  IF EXISTS (
    SELECT
      1
    FROM
      pg_class
    WHERE
      oid = to_regclass('public.leaderboard_snapshot')
      AND relkind = 'm') THEN
  REFRESH MATERIALIZED VIEW leaderboard_snapshot;
  RETURN;
END IF;

      IF EXISTS (
        SELECT
          1
        FROM
          pg_class
        WHERE
          oid = to_regclass('public.leaderboard_snapshot')
          AND relkind = 'r') THEN
      TRUNCATE leaderboard_snapshot;

    INSERT INTO leaderboard_snapshot (rank_pos, user_id, full_name, avatar_url, top_score, score_twk, score_tiu, score_tkp, updated_at)
    WITH user_best_scores AS (
      SELECT DISTINCT ON (user_id)
        user_id,
        total_score,
        score_twk,
        score_tiu,
        score_tkp,
        end_time
      FROM
        test_sessions
      WHERE
        status = 'completed'
      ORDER BY
        user_id,
        total_score DESC,
        end_time ASC nulls LAST
)
    SELECT
      row_number() OVER (ORDER BY total_score DESC, end_time ASC nulls LAST) AS rank_pos,
      ubs.user_id,
      coalesce(p.full_name, 'Pejuang SKD'),
      p.avatar_url,
      ubs.total_score,
      ubs.score_twk,
      ubs.score_tiu,
      ubs.score_tkp,
      now()
    FROM
      user_best_scores ubs
    LEFT JOIN profiles p ON p.id = ubs.user_id
  ORDER BY
    ubs.total_score DESC,
    ubs.end_time ASC nulls LAST;
END IF;
END;
$$
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_leaderboard_snapshot ()
  RETURNS TABLE (
    rank_pos int,
    user_id uuid,
    full_name text,
    avatar_url text,
    top_score int,
    score_twk int,
    score_tiu int,
    score_tkp int,
    updated_at timestamp with time zone
  )
  AS $$
BEGIN
  IF EXISTS (
    SELECT
      1
    FROM
      information_schema.columns
    WHERE
      table_schema = 'public'
      AND table_name = 'leaderboard_snapshot'
      AND column_name = 'updated_at') THEN
  RETURN QUERY EXECUTE '
      select
        ls.rank_pos::int,
        ls.user_id,
        ls.full_name,
        ls.avatar_url,
        ls.top_score,
        ls.score_twk,
        ls.score_tiu,
        ls.score_tkp,
        ls.updated_at
      from public.leaderboard_snapshot ls
      order by ls.rank_pos asc
      limit 100
    ';
  RETURN;
END IF;

      RETURN QUERY EXECUTE '
    select
      ls.rank_pos::int,
      ls.user_id,
      ls.full_name,
      ls.avatar_url,
      ls.top_score,
      ls.score_twk,
      ls.score_tiu,
      ls.score_tkp,
      ls.achieved_at as updated_at
    from public.leaderboard_snapshot ls
    order by ls.rank_pos asc
    limit 100
  ';
END;
$$
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user ();

DROP TRIGGER IF EXISTS on_session_complete ON test_sessions;

CREATE TRIGGER on_session_complete
  AFTER UPDATE ON test_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_streak ();

DROP TRIGGER IF EXISTS trg_update_tryout_configurations ON tryout_configurations;

CREATE TRIGGER trg_update_tryout_configurations
  BEFORE UPDATE ON tryout_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_tryout_configurations_updated_at ();

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('avatars', 'avatars', TRUE),
  ('question-images', 'question-images', TRUE)
ON CONFLICT (id)
  DO UPDATE SET
    public = excluded.public;

DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;

CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Anyone can upload an avatar" ON storage.objects;

CREATE POLICY "Anyone can upload an avatar" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Anyone can update their own avatar" ON storage.objects;

CREATE POLICY "Anyone can update their own avatar" ON storage.objects
  FOR UPDATE
  USING (auth.uid () = OWNER)
  WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Public read open to all" ON storage.objects;

CREATE POLICY "Public read open to all" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'question-images');

DROP POLICY IF EXISTS "Admin upload access" ON storage.objects;

CREATE POLICY "Admin upload access" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'question-images'
  AND (
    SELECT
      ROLE
    FROM
      profiles
    WHERE
      id = auth.uid ()) = 'admin');

DROP POLICY IF EXISTS "Admin update access" ON storage.objects;

CREATE POLICY "Admin update access" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'question-images'
    AND (
      SELECT
        ROLE
      FROM
        profiles
      WHERE
        id = auth.uid ()) = 'admin');

DROP POLICY IF EXISTS "Admin delete access" ON storage.objects;

CREATE POLICY "Admin delete access" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'question-images'
    AND (
      SELECT
        ROLE
      FROM
        profiles
      WHERE
        id = auth.uid ()) = 'admin');

GRANT EXECUTE ON FUNCTION get_leaderboard_snapshot () TO anon, authenticated;

SELECT
  refresh_leaderboard_snapshot ();
