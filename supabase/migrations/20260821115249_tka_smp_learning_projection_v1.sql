-- Milestone 3 / Slice 3.1: deterministic TKA SMP learning projection.
-- Rebuilds user knowledge + subject progress from canonical completed attempts.
-- Primary knowledge mappings only; secondary mappings remain analytics-only.
CREATE OR REPLACE FUNCTION app_private.refresh_tka_smp_learning_projection_for_user (p_user_id uuid, p_source_attempt_id uuid DEFAULT NULL)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $function$
DECLARE
  v_track_id uuid;
  v_source_track_id uuid;
  v_user_track_id uuid;
  v_knowledge_rows integer := 0;
  v_subject_rows integer := 0;
BEGIN
  SELECT
    t.id
  INTO
    v_track_id
  FROM
    public.programs p
    JOIN public.tracks t ON t.program_id = p.id
  WHERE
    upper(p.code) = 'TKA'
    AND upper(t.code) = 'SMP'
  LIMIT 1;

  IF v_track_id IS NULL THEN
    RETURN jsonb_build_object('applied', FALSE, 'reason', 'TKA_SMP_TRACK_NOT_FOUND');
  END IF;

  IF p_source_attempt_id IS NOT NULL THEN
    SELECT
      e.track_id
    INTO
      v_source_track_id
    FROM
      public.exam_attempts ea
      JOIN public.exams e ON e.id = ea.exam_id
    WHERE
      ea.id = p_source_attempt_id
      AND ea.user_id = p_user_id
      AND lower(ea.status) = 'completed';

    IF v_source_track_id IS NULL THEN
      RETURN jsonb_build_object('applied', FALSE, 'reason', 'COMPLETED_SOURCE_ATTEMPT_NOT_FOUND');
    END IF;

    IF v_source_track_id <> v_track_id THEN
      RETURN jsonb_build_object('applied', FALSE, 'reason', 'TRACK_NOT_SUPPORTED');
    END IF;
  END IF;

  SELECT
    ut.id
  INTO
    v_user_track_id
  FROM
    public.user_tracks ut
  WHERE
    ut.user_id = p_user_id
    AND ut.track_id = v_track_id
    AND lower(ut.status) = 'active'
  ORDER BY
    ut.updated_at DESC nulls LAST,
    ut.started_at DESC nulls LAST
  LIMIT 1;

  IF v_user_track_id IS NULL THEN
    RETURN jsonb_build_object('applied', FALSE, 'reason', 'ACTIVE_USER_TRACK_NOT_FOUND');
  END IF;
  -- Full rebuild makes retries/backfills idempotent and removes stale projections.
  DELETE FROM public.user_knowledge_progress ukp
  WHERE ukp.user_id = p_user_id
    AND ukp.user_track_id = v_user_track_id;

  WITH knowledge_agg AS (
    SELECT
      qkn.knowledge_node_id,
      count(*)::integer AS attempted_questions,
      count(*) FILTER (WHERE aa.is_correct IS TRUE)::integer AS correct_questions,
      count(*) FILTER (WHERE aa.is_correct IS TRUE)::numeric / nullif (count(*), 0) AS accuracy,
      avg(coalesce(aa.score_awarded, 0))::numeric AS average_score,
      avg(coalesce(aa.time_spent_seconds, 0))::numeric AS average_time_seconds,
      max(ea.submitted_at) AS last_practiced_at
    FROM
      public.exam_attempts ea
      JOIN public.exams e ON e.id = ea.exam_id
      JOIN public.attempt_questions aq ON aq.attempt_id = ea.id
      JOIN public.question_knowledge_nodes qkn ON qkn.question_id = aq.question_id
        AND qkn.relation_type = 'primary'
    LEFT JOIN public.attempt_answers aa ON aa.attempt_question_id = aq.id
  WHERE
    ea.user_id = p_user_id
    AND e.track_id = v_track_id
    AND lower(ea.status) = 'completed'
  GROUP BY
    qkn.knowledge_node_id
),
scored AS (
  SELECT
    knowledge_node_id,
    attempted_questions,
    correct_questions,
    round(coalesce(accuracy, 0), 6) AS accuracy,
    round(coalesce(average_score, 0), 6) AS average_score,
    round(coalesce(average_time_seconds, 0), 2) AS average_time_seconds,
    round(((0.70 * coalesce(average_score, 0)) + (0.30 * coalesce(accuracy, 0))) * least (1::numeric, attempted_questions::numeric / 5::numeric), 6) AS mastery_score,
    last_practiced_at
  FROM
    knowledge_agg)
INSERT INTO public.user_knowledge_progress (user_id, user_track_id, knowledge_node_id, attempted_questions, correct_questions, accuracy, average_score, average_time_seconds, mastery_score, mastery_level, last_practiced_at, updated_at)
SELECT
  p_user_id,
  v_user_track_id,
  s.knowledge_node_id,
  s.attempted_questions,
  s.correct_questions,
  s.accuracy,
  s.average_score,
  s.average_time_seconds,
  s.mastery_score,
  CASE WHEN s.mastery_score >= 0.85 THEN
    'mastered'
  WHEN s.mastery_score >= 0.70 THEN
    'proficient'
  WHEN s.mastery_score >= 0.40 THEN
    'developing'
  ELSE
    'needs_work'
  END,
  s.last_practiced_at,
  now()
FROM
  scored s;

  get diagnostics v_knowledge_rows = row_count;

  DELETE FROM public.user_subject_progress usp
  WHERE usp.user_id = p_user_id
    AND usp.subject_id IN (
      SELECT
        s.id
      FROM
        public.subjects s
      WHERE
        s.track_id = v_track_id);

  WITH subject_agg AS (
    SELECT
      ats.subject_id,
      count(DISTINCT ats.attempt_id)::integer AS attempts,
      sum(ats.correct_count + ats.wrong_count)::integer AS questions_answered,
      sum(ats.correct_count)::numeric AS correct_answers,
      sum(ats.correct_count + ats.wrong_count + ats.unanswered_count)::numeric AS total_questions,
      sum(coalesce(ats.raw_score, 0))::numeric AS raw_score
    FROM
      public.attempt_scores ats
      JOIN public.exam_attempts ea ON ea.id = ats.attempt_id
      JOIN public.exams e ON e.id = ea.exam_id
    WHERE
      ea.user_id = p_user_id
      AND e.track_id = v_track_id
      AND lower(ea.status) = 'completed'
      AND ats.subject_id IS NOT NULL
    GROUP BY
      ats.subject_id)
  INSERT INTO public.user_subject_progress (user_id, subject_id, attempts, questions_answered, accuracy, mastery_score, updated_at)
  SELECT
    p_user_id,
    sa.subject_id,
    sa.attempts,
    sa.questions_answered,
    CASE WHEN sa.questions_answered > 0 THEN
      round(sa.correct_answers / sa.questions_answered * 100, 2)
    ELSE
      0
    END,
    CASE WHEN sa.total_questions > 0 THEN
      round(sa.raw_score / sa.total_questions * 100, 2)
    ELSE
      0
    END,
    now()
  FROM
    subject_agg sa;

  get diagnostics v_subject_rows = row_count;

  RETURN jsonb_build_object('applied', TRUE, 'track', 'TKA/SMP', 'knowledge_rows', v_knowledge_rows, 'subject_rows', v_subject_rows, 'source_attempt_id', p_source_attempt_id);
END;
$function$;

REVOKE ALL ON FUNCTION app_private.refresh_tka_smp_learning_projection_for_user (uuid, uuid) FROM public;

REVOKE ALL ON FUNCTION app_private.refresh_tka_smp_learning_projection_for_user (uuid, uuid) FROM anon;

REVOKE ALL ON FUNCTION app_private.refresh_tka_smp_learning_projection_for_user (uuid, uuid) FROM authenticated;

CREATE OR REPLACE FUNCTION app_private.submit_exam_attempt_for_user (p_user_id uuid, p_attempt_id uuid)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $function$
DECLARE
  v_started timestamptz;
  v_score jsonb;
  v_duration integer;
  v_projection jsonb;
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

  v_projection := app_private.refresh_tka_smp_learning_projection_for_user (p_user_id, p_attempt_id);

INSERT INTO public.attempt_events (attempt_id, event_type, metadata)
  VALUES (p_attempt_id, 'learning_projection_refreshed', v_projection);

  RETURN jsonb_build_object('attempt_id', p_attempt_id, 'status', 'completed', 'raw_score', (v_score ->> 'raw_score')::numeric, 'percentage', (v_score ->> 'percentage')::numeric, 'duration_used_seconds', v_duration, 'learning_projection', v_projection);
END;
$function$;

-- Backfill existing TKA SMP learners deterministically from completed attempts.
DO $backfill$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT DISTINCT
    ea.user_id
  FROM
    public.exam_attempts ea
    JOIN public.exams e ON e.id = ea.exam_id
    JOIN public.tracks t ON t.id = e.track_id
    JOIN public.programs p ON p.id = t.program_id
  WHERE
    upper(p.code) = 'TKA'
    AND upper(t.code) = 'SMP'
    AND lower(ea.status) = 'completed' LOOP
      PERFORM
        app_private.refresh_tka_smp_learning_projection_for_user (r.user_id, NULL);
    END LOOP;
END;
$backfill$;
