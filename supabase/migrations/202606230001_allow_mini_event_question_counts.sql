-- Allow Tryout Akbar events to use either a full SKD package or a focused mini package.
-- Full TO stays 110 questions. Mini event packages use the standard TWK/TIU/TKP counts.
CREATE OR REPLACE FUNCTION public.start_tryout_event_session (p_user_id uuid, p_event_id uuid)
  RETURNS TABLE (
    session_id uuid,
    resumed boolean,
    message text)
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  v_event record;
  v_existing_session uuid;
  v_session_id uuid;
  v_question_count int;
BEGIN
  IF coalesce(auth.role (), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_user_id IS NULL OR p_event_id IS NULL THEN
    RAISE EXCEPTION 'Invalid event session request';
  END IF;

  SELECT
    tes.session_id
  INTO
    v_existing_session
  FROM
    public.tryout_event_sessions tes
  WHERE
    tes.event_id = p_event_id
    AND tes.user_id = p_user_id;

  IF v_existing_session IS NOT NULL THEN
    RETURN QUERY
    SELECT
      v_existing_session,
      TRUE,
      'Sesi event sudah ada';
    RETURN;
  END IF;

  SELECT
    id,
    status,
    starts_at,
    start_grace_minutes
  INTO
    v_event
  FROM
    public.tryout_events
  WHERE
    id = p_event_id
  FOR UPDATE;

  IF NOT found THEN
    RETURN QUERY
    SELECT
      NULL::uuid,
      FALSE,
      'Event tidak ditemukan';
    RETURN;
  END IF;

  IF v_event.status NOT IN ('scheduled', 'live') OR now() < v_event.starts_at OR now() > v_event.starts_at + (v_event.start_grace_minutes || ' minutes')::interval THEN
    RETURN QUERY
    SELECT
      NULL::uuid,
      FALSE,
      'Event belum live atau start window sudah ditutup';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT
      1
    FROM
      public.tryout_event_participants
    WHERE
      event_id = p_event_id
      AND user_id = p_user_id) THEN
  RETURN QUERY
  SELECT
    NULL::uuid,
    FALSE,
    'Daftar event terlebih dahulu sebelum mulai';
  RETURN;
END IF;

  SELECT
    count(*)
  INTO
    v_question_count
  FROM
    public.tryout_event_questions
  WHERE
    event_id = p_event_id;

  IF v_question_count NOT IN (30, 35, 45, 110) THEN
    RETURN QUERY
    SELECT
      NULL::uuid,
      FALSE,
      'Paket soal event belum lengkap';
    RETURN;
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
  public.tryout_event_questions
WHERE
  event_id = p_event_id
ORDER BY
  sort_order;

INSERT INTO public.tryout_event_sessions (event_id, user_id, session_id, status, started_at)
  VALUES (p_event_id, p_user_id, v_session_id, 'started', now());

  UPDATE
    public.tryout_event_participants
  SET
    status = 'started'
  WHERE
    event_id = p_event_id
    AND user_id = p_user_id;

  RETURN QUERY
  SELECT
    v_session_id,
    FALSE,
    'Sesi event berhasil dibuat';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.start_tryout_event_session (uuid, uuid) FROM public, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.start_tryout_event_session (uuid, uuid) TO service_role;
