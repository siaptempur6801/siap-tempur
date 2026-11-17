-- Make start-session RPCs idempotent under rapid duplicate requests.
-- UI loading states reduce duplicate clicks, but token/session integrity must be enforced in DB.
CREATE OR REPLACE FUNCTION public.start_tryout_session (p_user_id uuid)
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
  v_expected_questions int;
  v_selected_questions int;
BEGIN
  IF coalesce(auth.role (), '') <> 'service_role' AND p_user_id <> (
    SELECT
      auth.uid ()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Invalid tryout request';
  END IF;

  PERFORM
    pg_advisory_xact_lock(hashtextextended('start_tryout_session:' || p_user_id::text, 0));

  SELECT
    id
  INTO
    v_existing_session_id
  FROM
    public.test_sessions
  WHERE
    user_id = p_user_id
    AND mode = 'tryout'
    AND status = 'in_progress'
  ORDER BY
    last_activity_at DESC nulls LAST,
    start_time DESC
  LIMIT 1;

  IF v_existing_session_id IS NOT NULL THEN
    RETURN QUERY
    SELECT
      v_existing_session_id,
      NULL::json;
    RETURN;
  END IF;

  SELECT
    coalesce(sum(question_count), 0)
  INTO
    v_expected_questions
  FROM
    public.tryout_configurations
  WHERE
    is_active = TRUE;

  IF v_expected_questions <> 110 THEN
    RAISE EXCEPTION 'Konfigurasi tryout tidak valid: expected 110 questions, got %', v_expected_questions;
  END IF;

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

  SELECT
    count(*)
  INTO
    v_selected_questions
  FROM
    temp_selected_questions;

  IF v_selected_questions <> v_expected_questions THEN
    RAISE EXCEPTION 'Bank soal belum lengkap: expected % questions, selected %', v_expected_questions, v_selected_questions;
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

INSERT INTO public.test_sessions (user_id, mode, status, start_time, last_activity_at)
  VALUES (p_user_id, 'tryout', 'in_progress', now(), now())
RETURNING
  id
INTO
  v_session_id;

INSERT INTO public.test_answers (session_id, question_id)
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
        FROM public.options o
        WHERE
          o.question_id = q.id))
    ORDER BY tsq.sort_order, random())
  INTO
    v_questions
  FROM
    temp_selected_questions tsq
    JOIN public.questions q ON q.id = tsq.question_id;

  RETURN QUERY
  SELECT
    v_session_id,
    v_questions;
END;
$$;

CREATE OR REPLACE FUNCTION public.start_mini_tryout_session (p_user_id uuid, p_type public.question_type, p_limit int)
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
  v_expected_limit int;
  v_selected_questions int;
BEGIN
  IF coalesce(auth.role (), '') <> 'service_role' AND p_user_id <> (
    SELECT
      auth.uid ()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_user_id IS NULL OR p_type IS NULL OR p_limit IS NULL THEN
    RAISE EXCEPTION 'Invalid mini tryout request';
  END IF;

  v_expected_limit := CASE p_type
  WHEN 'TWK'::public.question_type THEN
    30
  WHEN 'TIU'::public.question_type THEN
    35
  WHEN 'TKP'::public.question_type THEN
    45
  END;

  IF v_expected_limit IS NULL OR p_limit <> v_expected_limit THEN
    RAISE EXCEPTION 'Invalid mini tryout request';
  END IF;

  PERFORM
    pg_advisory_xact_lock(hashtextextended('start_mini_tryout_session:' || p_user_id::text || ':' || p_type::text, 0));

  SELECT
    ts.id
  INTO
    v_existing_session_id
  FROM
    public.test_sessions ts
  WHERE
    ts.user_id = p_user_id
    AND ts.mode = 'practice'
    AND ts.status = 'in_progress'
    AND EXISTS (
      SELECT
        1
      FROM
        public.test_answers ta
        JOIN public.questions q ON q.id = ta.question_id
      WHERE
        ta.session_id = ts.id
        AND q.type = p_type)
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

  CREATE temp TABLE IF NOT EXISTS temp_mini_tryout_questions (
    question_id uuid,
    sort_order int
  ) ON COMMIT DROP;

  TRUNCATE temp_mini_tryout_questions;

INSERT INTO temp_mini_tryout_questions (question_id, sort_order)
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
  ORDER BY
    random()
  LIMIT v_expected_limit) selected;

  SELECT
    count(*)
  INTO
    v_selected_questions
  FROM
    temp_mini_tryout_questions;

  IF v_selected_questions <> v_expected_limit THEN
    RAISE EXCEPTION 'Bank soal mini tryout belum lengkap: expected % questions, selected %', v_expected_limit, v_selected_questions;
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

INSERT INTO public.test_sessions (user_id, mode, status, start_time, last_activity_at)
  VALUES (p_user_id, 'practice', 'in_progress', now(), now())
RETURNING
  id
INTO
  v_session_id;

INSERT INTO public.test_answers (session_id, question_id)
SELECT
  v_session_id,
  question_id
FROM
  temp_mini_tryout_questions;

  SELECT
    json_agg(json_build_object('id', q.id, 'content', q.content, 'type', q.type, 'category', q.category, 'sub_category', q.sub_category, 'image_url', q.image_url, 'options', (
          SELECT
            json_agg(json_build_object('id', o.id, 'content', o.content, 'image_url', o.image_url)
          ORDER BY random())
        FROM public.options o
        WHERE
          o.question_id = q.id))
    ORDER BY tmq.sort_order)
  INTO
    v_questions
  FROM
    temp_mini_tryout_questions tmq
    JOIN public.questions q ON q.id = tmq.question_id;

  RETURN QUERY
  SELECT
    v_session_id,
    v_questions;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.start_practice_session (uuid, public.question_type, int) FROM public, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.start_practice_session (uuid, public.question_type, int) TO service_role;

REVOKE EXECUTE ON FUNCTION public.start_mini_tryout_session (uuid, public.question_type, int) FROM public, anon;

GRANT EXECUTE ON FUNCTION public.start_mini_tryout_session (uuid, public.question_type, int) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.start_tryout_session (uuid) FROM public, anon;

GRANT EXECUTE ON FUNCTION public.start_tryout_session (uuid) TO authenticated, service_role;
