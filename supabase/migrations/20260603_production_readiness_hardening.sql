-- Production readiness hardening for token/session integrity and event concurrency.
-- Forward-only migration. Do not apply without a tested deployment plan.
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

CREATE OR REPLACE FUNCTION public.register_tryout_event_participant (p_user_id uuid, p_event_id uuid, p_event_code text DEFAULT NULL)
  RETURNS TABLE (
    success boolean,
    message text)
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  v_event record;
  v_code record;
  v_participant_count int;
  v_normalized_code text := upper(trim(coalesce(p_event_code, '')));
BEGIN
  IF coalesce(auth.role (), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_user_id IS NULL OR p_event_id IS NULL THEN
    RAISE EXCEPTION 'Invalid event registration request';
  END IF;

  SELECT
    id,
    status,
    max_participants,
    requires_code
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
      FALSE,
      'Event tidak ditemukan';
    RETURN;
  END IF;

  IF v_event.status NOT IN ('scheduled', 'live') THEN
    RETURN QUERY
    SELECT
      FALSE,
      'Event belum dibuka untuk pendaftaran';
    RETURN;
  END IF;

  IF EXISTS (
    SELECT
      1
    FROM
      public.tryout_event_participants
    WHERE
      event_id = p_event_id
      AND user_id = p_user_id) THEN
  RETURN QUERY
  SELECT
    TRUE,
    'Kamu sudah terdaftar di event ini';
  RETURN;
END IF;

  IF v_event.max_participants IS NOT NULL THEN
    SELECT
      count(*)
    INTO
      v_participant_count
    FROM
      public.tryout_event_participants
    WHERE
      event_id = p_event_id;

    IF v_participant_count >= v_event.max_participants THEN
      RETURN QUERY
      SELECT
        FALSE,
        'Kuota peserta event sudah penuh';
      RETURN;
    END IF;
  END IF;

  IF v_event.requires_code THEN
    IF v_normalized_code = '' THEN
      RETURN QUERY
      SELECT
        FALSE,
        'Kode masuk wajib diisi untuk event ini';
      RETURN;
    END IF;

    SELECT
      id,
      max_uses,
      used_count,
      is_active,
      expires_at
    INTO
      v_code
    FROM
      public.tryout_event_codes
    WHERE
      event_id = p_event_id
      AND code = v_normalized_code
    FOR UPDATE;

    IF NOT found THEN
      RETURN QUERY
      SELECT
        FALSE,
        'Kode masuk tidak ditemukan';
      RETURN;
    END IF;

    IF NOT v_code.is_active THEN
      RETURN QUERY
      SELECT
        FALSE,
        'Kode masuk sudah tidak aktif';
      RETURN;
    END IF;

    IF v_code.expires_at IS NOT NULL AND v_code.expires_at <= now() THEN
      RETURN QUERY
      SELECT
        FALSE,
        'Kode masuk sudah kadaluarsa';
      RETURN;
    END IF;

    IF v_code.used_count >= v_code.max_uses THEN
      RETURN QUERY
      SELECT
        FALSE,
        'Limit penggunaan kode masuk sudah penuh';
      RETURN;
    END IF;

    UPDATE
      public.tryout_event_codes
    SET
      used_count = used_count + 1,
      updated_at = now()
    WHERE
      id = v_code.id;
  END IF;

INSERT INTO public.tryout_event_participants (event_id, event_code_id, user_id, status)
  VALUES (p_event_id, CASE WHEN v_event.requires_code THEN
      v_code.id
    ELSE
      NULL
    END, p_user_id, 'registered');

  RETURN QUERY
  SELECT
    TRUE,
    'Berhasil daftar Tryout Akbar';
END;
$$;

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

  IF v_question_count <> 110 THEN
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

REVOKE EXECUTE ON FUNCTION public.register_tryout_event_participant (uuid, uuid, text) FROM public, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.start_tryout_event_session (uuid, uuid) FROM public, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.register_tryout_event_participant (uuid, uuid, text) TO service_role;

GRANT EXECUTE ON FUNCTION public.start_tryout_event_session (uuid, uuid) TO service_role;
