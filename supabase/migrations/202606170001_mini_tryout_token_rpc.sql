-- Charge one SKD token when a user starts a new mini tryout session.
-- Existing in-progress mini sessions are resumed from the app action and do not call this RPC.
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
