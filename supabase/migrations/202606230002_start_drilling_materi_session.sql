ALTER TABLE public.test_sessions
  ADD COLUMN IF NOT EXISTS session_kind text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT
      1
    FROM
      pg_constraint
    WHERE
      conname = 'test_sessions_session_kind_check'
      AND conrelid = 'public.test_sessions'::regclass) THEN
  ALTER TABLE public.test_sessions
    ADD CONSTRAINT test_sessions_session_kind_check CHECK (session_kind IS NULL OR session_kind IN ('full_tryout', 'mini_tryout', 'drilling_materi', 'event'));
END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_default_test_session_kind ()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path = public
  AS $$
BEGIN
  IF NEW.session_kind IS NULL THEN
    NEW.session_kind := CASE WHEN NEW.mode = 'tryout' THEN
      'full_tryout'
    WHEN NEW.mode = 'practice' THEN
      'mini_tryout'
    ELSE
      NULL
    END;
  END IF;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS set_default_test_session_kind ON public.test_sessions;

CREATE TRIGGER set_default_test_session_kind
  BEFORE INSERT ON public.test_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_default_test_session_kind ();

CREATE OR REPLACE FUNCTION public.start_drilling_materi_session (p_user_id uuid, p_type public.question_type, p_sub_category text)
  RETURNS TABLE (
    session_id uuid,
    questions json)
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  v_session_id uuid;
  v_existing_session_id uuid;
  v_questions json;
  v_remaining_quota int;
  v_selected_questions int;
  v_sub_category text;
BEGIN
  IF coalesce(auth.role (), '') <> 'service_role' AND p_user_id <> (
    SELECT
      auth.uid ()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  v_sub_category := nullif (btrim(p_sub_category), '');

  IF p_user_id IS NULL OR p_type IS NULL OR v_sub_category IS NULL THEN
    RAISE EXCEPTION 'Invalid drilling materi request';
  END IF;

  PERFORM
    pg_advisory_xact_lock(hashtextextended('start_drilling_materi_session:' || p_user_id::text || ':' || p_type::text || ':' || v_sub_category, 0));

  SELECT
    ts.id
  INTO
    v_existing_session_id
  FROM
    public.test_sessions ts
  WHERE
    ts.user_id = p_user_id
    AND ts.mode = 'practice'
    AND (ts.session_kind = 'drilling_materi'
      OR ts.session_kind IS NULL)
    AND ts.status = 'in_progress'
    AND (
      SELECT
        count(*)
      FROM
        public.test_answers ta
        JOIN public.questions q ON q.id = ta.question_id
      WHERE
        ta.session_id = ts.id
        AND q.type = p_type
        AND btrim(q.sub_category) = v_sub_category) = 30
    AND NOT EXISTS (
      SELECT
        1
      FROM
        public.test_answers ta
        JOIN public.questions q ON q.id = ta.question_id
      WHERE
        ta.session_id = ts.id
        AND (q.type <> p_type
          OR btrim(q.sub_category) IS DISTINCT FROM v_sub_category))
  ORDER BY
    ts.last_activity_at DESC nulls LAST,
    ts.start_time DESC
  LIMIT 1;

  IF v_existing_session_id IS NOT NULL THEN
    RETURN QUERY
    SELECT
      v_existing_session_id,
      NULL::json;
    RETURN;
  END IF;

  CREATE temp TABLE IF NOT EXISTS temp_drilling_materi_questions (
    question_id uuid,
    sort_order int
  ) ON COMMIT DROP;

  TRUNCATE temp_drilling_materi_questions;

  INSERT INTO temp_drilling_materi_questions (question_id, sort_order)
  SELECT
    selected.id,
    (row_number() OVER ())::int
  FROM (
    SELECT
      q.id
    FROM
      public.questions q
    WHERE
      q.type = p_type
      AND btrim(q.sub_category) = v_sub_category
    ORDER BY
      random()
    LIMIT 30) selected;

  SELECT
    count(*)
  INTO
    v_selected_questions
  FROM
    temp_drilling_materi_questions;

  IF v_selected_questions <> 30 THEN
    RAISE EXCEPTION 'Bank soal drilling materi belum lengkap: expected 30 questions, selected %', v_selected_questions;
  END IF;

  UPDATE
    public.profiles
  SET
    tryout_quota = tryout_quota - 1
  WHERE
    id = p_user_id
    AND coalesce(tryout_quota, 0) > 0
  RETURNING
    tryout_quota
  INTO
    v_remaining_quota;

  IF NOT found THEN
    RAISE EXCEPTION 'Not enough SKD tickets';
  END IF;

  INSERT INTO public.test_sessions (user_id, mode, status, session_kind, start_time, last_activity_at)
    VALUES (p_user_id, 'practice', 'in_progress', 'drilling_materi', now(), now())
  RETURNING
    id
  INTO
    v_session_id;

  INSERT INTO public.test_answers (session_id, question_id)
  SELECT
    v_session_id,
    question_id
  FROM
    temp_drilling_materi_questions;

  SELECT
    json_agg(json_build_object('id', q.id, 'content', q.content, 'type', q.type, 'category', q.category, 'sub_category', q.sub_category, 'image_url', q.image_url, 'options', (
          SELECT
            json_agg(json_build_object('id', o.id, 'content', o.content, 'image_url', o.image_url)
          ORDER BY random())
        FROM public.options o
        WHERE
          o.question_id = q.id))
    ORDER BY tdmq.sort_order)
  INTO
    v_questions
  FROM
    temp_drilling_materi_questions tdmq
    JOIN public.questions q ON q.id = tdmq.question_id;

  RETURN QUERY
  SELECT
    v_session_id,
    v_questions;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.start_drilling_materi_session (uuid, public.question_type, text) FROM public, anon;

GRANT EXECUTE ON FUNCTION public.start_drilling_materi_session (uuid, public.question_type, text) TO authenticated, service_role;
