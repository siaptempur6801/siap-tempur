-- Harden the user-facing TKA SMP full-exam RPC workers.
-- 1) An authenticated profile must have an active user_track for the exam track.
-- 2) Submission is allowed only after every section has been completed through
--    complete_exam_section, so a direct RPC call cannot skip a locked section.
CREATE OR REPLACE FUNCTION app_private.start_exam_attempt_for_user (p_exam_id uuid, p_user_id uuid)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $$
DECLARE
  v_attempt_id uuid := gen_random_uuid ();
  v_attempt_number integer;
  v_attempt_limit integer;
  v_exam_status text;
  v_track_id uuid;
  v_item_count integer;
  v_first_section uuid;
  v_seed text;
BEGIN
  IF NOT EXISTS (
    SELECT
      1
    FROM
      public.profiles
    WHERE
      id = p_user_id
      AND status = 'active') THEN
  RAISE EXCEPTION 'Active user profile not found';
END IF;

  PERFORM
    pg_advisory_xact_lock(hashtextextended(p_exam_id::text || ':' || p_user_id::text, 0));

  SELECT
    status,
    attempt_limit,
    track_id
  INTO
    v_exam_status,
    v_attempt_limit,
    v_track_id
  FROM
    public.exams
  WHERE
    id = p_exam_id;
  IF NOT found THEN
    RAISE EXCEPTION 'Exam not found';
  END IF;
  IF v_exam_status <> 'active' THEN
    RAISE EXCEPTION 'Exam is not active';
  END IF;

  IF NOT EXISTS (
    SELECT
      1
    FROM
      public.user_tracks
    WHERE
      user_id = p_user_id
      AND track_id = v_track_id
      AND status = 'active') THEN
  RAISE EXCEPTION 'Active user track required';
END IF;

  SELECT
    count(*)
  INTO
    v_item_count
  FROM
    public.exam_question_items
  WHERE
    exam_id = p_exam_id;
  IF v_item_count <> 60 THEN
    RAISE EXCEPTION 'Exam must contain exactly 60 generated questions';
  END IF;

  SELECT
    coalesce(max(attempt_number), 0) + 1
  INTO
    v_attempt_number
  FROM
    public.exam_attempts
  WHERE
    exam_id = p_exam_id
    AND user_id = p_user_id;

  IF v_attempt_limit IS NOT NULL AND v_attempt_number > v_attempt_limit THEN
    RAISE EXCEPTION 'Attempt limit reached';
  END IF;

  v_seed := v_attempt_id::text;

INSERT INTO public.exam_attempts (id, exam_id, user_id, attempt_number, status, started_at, metadata, created_at, updated_at)
  VALUES (v_attempt_id, p_exam_id, p_user_id, v_attempt_number, 'in_progress', now(), jsonb_build_object('orderSeed', v_seed, 'engineVersion', 'tka-smp-e2e-v1'), now(), now());

  WITH s AS (
    SELECT
      es.*,
      row_number() OVER (ORDER BY es.sort_order,
        es.id) rn
    FROM public.exam_sections es
  WHERE es.exam_id = p_exam_id)
INSERT INTO public.attempt_section_states (attempt_id, section_id, status, started_at, deadline_at, created_at, updated_at)
SELECT
  v_attempt_id,
  id,
  CASE WHEN rn = 1 THEN
    'active'
  ELSE
    'locked'
  END,
  CASE WHEN rn = 1 THEN
    now()
  ELSE
    NULL
  END,
  CASE WHEN rn = 1 THEN
    now() + make_interval(secs => coalesce(duration_seconds, 0))
  ELSE
    NULL
  END,
  now(),
  now()
FROM
  s;

  SELECT
    ass.section_id
  INTO
    v_first_section
  FROM
    public.attempt_section_states ass
    JOIN public.exam_sections es ON es.id = ass.section_id
  WHERE
    ass.attempt_id = v_attempt_id
    AND ass.status = 'active'
  ORDER BY
    es.sort_order
  LIMIT 1;

  WITH base AS (
    SELECT
      eqi.question_id,
      eqi.question_version,
      eqi.section_id,
      es.sort_order,
      qv.snapshot,
      row_number() OVER (ORDER BY es.sort_order,
        md5(v_seed || ':' || eqi.question_id::text)) AS pos
    FROM
      public.exam_question_items eqi
      JOIN public.exam_sections es ON es.id = eqi.section_id
      JOIN public.question_versions qv ON qv.question_id = eqi.question_id
        AND qv.version = eqi.question_version
    WHERE
      eqi.exam_id = p_exam_id
),
enhanced AS (
  SELECT
    b.*,
    jsonb_set(b.snapshot, '{options}', coalesce((
        SELECT
          jsonb_agg(jsonb_build_object('id', qo.id, 'option_key', qo.option_key, 'content', qo.content, 'is_correct', qo.is_correct, 'score', qo.score, 'sort_order', qo.sort_order, 'image_url', qo.image_url, 'response_group', qo.response_group, 'response_group_order', qo.response_group_order, 'metadata', qo.metadata)
          ORDER BY qo.sort_order)
        FROM public.question_options qo
        WHERE
          qo.question_id = b.question_id), '[]'::jsonb), TRUE) AS frozen_snapshot
  FROM
    base b)
INSERT INTO public.attempt_questions (attempt_id, question_id, question_version, position, section_id, question_snapshot, max_score)
SELECT
  v_attempt_id,
  question_id,
  question_version,
  pos,
  section_id,
  frozen_snapshot,
  1
FROM
  enhanced;

INSERT INTO public.attempt_events (attempt_id, event_type, metadata)
  VALUES (v_attempt_id, 'attempt_started', jsonb_build_object('attemptNumber', v_attempt_number, 'activeSectionId', v_first_section));

  RETURN jsonb_build_object('attempt_id', v_attempt_id, 'attempt_number', v_attempt_number, 'status', 'in_progress', 'active_section_id', v_first_section);
END;
$$;

CREATE OR REPLACE FUNCTION app_private.submit_exam_attempt_for_user (p_user_id uuid, p_attempt_id uuid)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $$
DECLARE
  v_started timestamptz;
  v_score jsonb;
  v_duration integer;
BEGIN
  SELECT
    started_at
  INTO
    v_started
  FROM
    public.exam_attempts
  WHERE
    id = p_attempt_id
    AND user_id = p_user_id
    AND status = 'in_progress'
  FOR UPDATE;
  IF v_started IS NULL THEN
    RAISE EXCEPTION 'In-progress attempt not found';
  END IF;

  IF EXISTS (
    SELECT
      1
    FROM
      public.attempt_section_states
    WHERE
      attempt_id = p_attempt_id
      AND status <> 'completed') THEN
  RAISE EXCEPTION 'ALL_SECTIONS_MUST_BE_COMPLETED';
END IF;

  v_score := app_private.score_exam_attempt (p_attempt_id);
  SELECT
    coalesce(sum(duration_used_seconds), 0)
  INTO
    v_duration
  FROM
    public.attempt_section_states
  WHERE
    attempt_id = p_attempt_id
    AND status = 'completed';

  UPDATE
    public.exam_attempts
  SET
    status = 'completed',
    submitted_at = now(),
    duration_used_seconds = v_duration,
    total_score = (v_score ->> 'raw_score')::numeric,
    percentage = (v_score ->> 'percentage')::numeric,
    passed = NULL,
    last_saved_at = now(),
    updated_at = now()
  WHERE
    id = p_attempt_id;

INSERT INTO public.attempt_events (attempt_id, event_type, metadata)
  VALUES (p_attempt_id, 'attempt_submitted', v_score);

  RETURN jsonb_build_object('attempt_id', p_attempt_id, 'status', 'completed', 'raw_score', (v_score ->> 'raw_score')::numeric, 'percentage', (v_score ->> 'percentage')::numeric, 'duration_used_seconds', v_duration);
END;
$$;
