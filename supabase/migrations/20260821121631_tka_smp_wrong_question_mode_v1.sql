-- Milestone 3 / Slice 3.2: persistent wrong/unanswered question state + repeat-wrong mode.
CREATE TABLE IF NOT EXISTS public.user_wrong_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  user_track_id uuid NOT NULL REFERENCES public.user_tracks (id) ON DELETE CASCADE,
  track_id uuid NOT NULL REFERENCES public.tracks (id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects (id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions (id) ON DELETE CASCADE,
  knowledge_node_id uuid REFERENCES public.knowledge_nodes (id) ON DELETE SET NULL,
  source_attempt_question_id uuid REFERENCES public.attempt_questions (id) ON DELETE SET NULL,
  last_source_attempt_id uuid REFERENCES public.exam_attempts (id) ON DELETE SET NULL,
  question_snapshot jsonb NOT NULL,
  first_failed_at timestamptz NOT NULL,
  last_failed_at timestamptz NOT NULL,
  failure_count integer NOT NULL DEFAULT 1 CHECK (failure_count >= 1),
  wrong_count integer NOT NULL DEFAULT 0 CHECK (wrong_count >= 0),
  unanswered_count integer NOT NULL DEFAULT 0 CHECK (unanswered_count >= 0),
  latest_outcome text NOT NULL CHECK (latest_outcome IN ('wrong', 'unanswered', 'correct')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  resolved_at timestamptz,
  last_reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, track_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_user_wrong_questions_user_status_updated ON public.user_wrong_questions (user_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_wrong_questions_track_status ON public.user_wrong_questions (track_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_wrong_questions_question ON public.user_wrong_questions (question_id);

CREATE TABLE IF NOT EXISTS public.wrong_question_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  user_wrong_question_id uuid NOT NULL REFERENCES public.user_wrong_questions (id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions (id) ON DELETE CASCADE,
  selected_option_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  is_correct boolean NOT NULL,
  score_awarded numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wrong_question_reviews_user_created ON public.wrong_question_reviews (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wrong_question_reviews_wrong_question_created ON public.wrong_question_reviews (user_wrong_question_id, created_at DESC);

ALTER TABLE public.user_wrong_questions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.wrong_question_reviews ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.user_wrong_questions FROM public, anon;

REVOKE ALL ON TABLE public.wrong_question_reviews FROM public, anon;

REVOKE ALL ON TABLE public.user_wrong_questions FROM authenticated;

REVOKE ALL ON TABLE public.wrong_question_reviews FROM authenticated;

GRANT SELECT ON TABLE public.user_wrong_questions TO authenticated;

GRANT SELECT ON TABLE public.wrong_question_reviews TO authenticated;

DROP POLICY IF EXISTS user_wrong_questions_select_own ON public.user_wrong_questions;

CREATE POLICY user_wrong_questions_select_own ON public.user_wrong_questions
  FOR SELECT TO authenticated
  USING (user_id = (
    SELECT
      auth.uid ())
      OR (
        SELECT
          app_private.has_permission ('admin.access'::text)));

DROP POLICY IF EXISTS wrong_question_reviews_select_own ON public.wrong_question_reviews;

CREATE POLICY wrong_question_reviews_select_own ON public.wrong_question_reviews
  FOR SELECT TO authenticated
  USING (user_id = (
    SELECT
      auth.uid ())
      OR (
        SELECT
          app_private.has_permission ('admin.access'::text)));

CREATE OR REPLACE FUNCTION app_private.evaluate_wrong_question_selection (p_snapshot jsonb, p_option_ids uuid[])
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $function$
DECLARE
  v_type text;
  v_selected uuid[] := coalesce(p_option_ids, ARRAY[]::uuid[]);
  v_total_correct integer := 0;
  v_selected_correct integer := 0;
  v_total_groups integer := 0;
  v_correct_groups integer := 0;
  v_correct boolean := FALSE;
  v_score numeric := 0;
BEGIN
  IF p_snapshot IS NULL THEN
    RAISE EXCEPTION 'WRONG_QUESTION_SNAPSHOT_NOT_FOUND';
  END IF;

  v_type := coalesce(p_snapshot -> 'question' ->> 'question_type', 'single_choice');

  IF cardinality(v_selected) = 0 THEN
    RAISE EXCEPTION 'ANSWER_REQUIRED';
  END IF;

  IF EXISTS (
    SELECT
      1
    FROM
      unnest(v_selected) selected_id
    WHERE
      NOT EXISTS (
        SELECT
          1
        FROM
          jsonb_array_elements(coalesce(p_snapshot -> 'options', '[]'::jsonb)) option_row
        WHERE (option_row ->> 'id')::uuid = selected_id)) THEN
  RAISE EXCEPTION 'INVALID_OPTION_SELECTION';
END IF;

  IF v_type = 'single_choice' THEN
    IF cardinality(v_selected) <> 1 THEN
      RAISE EXCEPTION 'SINGLE_CHOICE_REQUIRES_ONE_OPTION';
    END IF;

    SELECT
      coalesce(bool_or((o ->> 'is_correct')::boolean) FILTER (WHERE (o ->> 'id')::uuid = ANY (v_selected)), FALSE)
    INTO
      v_correct
    FROM
      jsonb_array_elements(coalesce(p_snapshot -> 'options', '[]'::jsonb)) o;
    v_score := CASE WHEN v_correct THEN
      1
    ELSE
      0
    END;

  ELSIF v_type = 'multiple_choice' THEN
    SELECT
      count(*) FILTER (WHERE (o ->> 'is_correct')::boolean),
    count(*) FILTER (WHERE (o ->> 'is_correct')::boolean
      AND (o ->> 'id')::uuid = ANY (v_selected))
INTO
  v_total_correct,
  v_selected_correct
FROM
  jsonb_array_elements(coalesce(p_snapshot -> 'options', '[]'::jsonb)) o;

    v_correct := cardinality(v_selected) = v_total_correct
      AND v_selected_correct = v_total_correct;
    v_score := CASE WHEN v_correct THEN
      1
    ELSE
      0
    END;

  ELSIF v_type = 'category' THEN
    SELECT
      count(DISTINCT o ->> 'response_group'),
      count(DISTINCT o ->> 'response_group') FILTER (WHERE (o ->> 'is_correct')::boolean
      AND (o ->> 'id')::uuid = ANY (v_selected))
INTO
  v_total_groups,
  v_correct_groups
FROM
  jsonb_array_elements(coalesce(p_snapshot -> 'options', '[]'::jsonb)) o;

    v_score := CASE WHEN v_total_groups > 0 THEN
      v_correct_groups::numeric / v_total_groups::numeric
    ELSE
      0
    END;
    v_correct := v_total_groups > 0
      AND v_correct_groups = v_total_groups
      AND cardinality(v_selected) = v_total_groups;
  ELSE
    RAISE EXCEPTION 'UNSUPPORTED_QUESTION_TYPE';
  END IF;

  RETURN jsonb_build_object('is_correct', v_correct, 'score_awarded', round(v_score, 6), 'question_type', v_type);
END;
$function$;

REVOKE ALL ON FUNCTION app_private.evaluate_wrong_question_selection (jsonb, uuid[]) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION app_private.refresh_tka_smp_wrong_question_state_for_user (p_user_id uuid, p_source_attempt_id uuid DEFAULT NULL)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $function$
DECLARE
  v_track_id uuid;
  v_source_track_id uuid;
  v_user_track_id uuid;
  v_total integer := 0;
  v_open integer := 0;
  v_resolved integer := 0;
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

  WITH exam_evidence AS (
    SELECT
      aq.question_id,
      q.subject_id,
      primary_node.knowledge_node_id,
      aq.id AS source_attempt_question_id,
      ea.id AS source_attempt_id,
      aq.question_snapshot,
      coalesce(ea.submitted_at, ea.updated_at, ea.created_at) AS occurred_at,
      CASE WHEN aa.id IS NULL THEN
        'unanswered'
      WHEN aa.is_correct IS TRUE THEN
        'correct'
      ELSE
        'wrong'
      END AS outcome,
      coalesce(aa.score_awarded, 0)::numeric AS score_awarded,
      1 AS evidence_priority
    FROM
      public.exam_attempts ea
      JOIN public.exams e ON e.id = ea.exam_id
      JOIN public.attempt_questions aq ON aq.attempt_id = ea.id
      JOIN public.questions q ON q.id = aq.question_id
      LEFT JOIN public.attempt_answers aa ON aa.attempt_question_id = aq.id
      LEFT JOIN LATERAL (
        SELECT
          qkn.knowledge_node_id
        FROM
          public.question_knowledge_nodes qkn
        WHERE
          qkn.question_id = aq.question_id
          AND qkn.relation_type = 'primary'
        ORDER BY
          qkn.knowledge_node_id
        LIMIT 1) primary_node ON TRUE
    WHERE
      ea.user_id = p_user_id
      AND e.track_id = v_track_id
      AND lower(ea.status) = 'completed'
),
review_evidence AS (
  SELECT
    uwq.question_id,
    uwq.subject_id,
    uwq.knowledge_node_id,
    uwq.source_attempt_question_id,
    uwq.last_source_attempt_id AS source_attempt_id,
    uwq.question_snapshot,
    wqr.created_at AS occurred_at,
    CASE WHEN wqr.is_correct THEN
      'correct'
    ELSE
      'wrong'
    END AS outcome,
    wqr.score_awarded,
    2 AS evidence_priority
  FROM
    public.wrong_question_reviews wqr
    JOIN public.user_wrong_questions uwq ON uwq.id = wqr.user_wrong_question_id
  WHERE
    wqr.user_id = p_user_id
    AND uwq.track_id = v_track_id
),
all_evidence AS (
  SELECT
    *
  FROM
    exam_evidence
  UNION ALL
  SELECT
    *
  FROM
    review_evidence
),
failure_stats AS (
  SELECT
    question_id,
    min(occurred_at) FILTER (WHERE outcome IN ('wrong', 'unanswered')) AS first_failed_at,
  max(occurred_at) FILTER (WHERE outcome IN ('wrong', 'unanswered')) AS last_failed_at,
  count(*) FILTER (WHERE outcome IN ('wrong', 'unanswered'))::integer AS failure_count,
  count(*) FILTER (WHERE outcome = 'wrong')::integer AS wrong_count,
  count(*) FILTER (WHERE outcome = 'unanswered')::integer AS unanswered_count
FROM
  all_evidence
GROUP BY
  question_id
HAVING
  count(*) FILTER (WHERE outcome IN ('wrong', 'unanswered')) > 0
),
latest_evidence AS (
  SELECT DISTINCT ON (question_id)
    question_id,
    outcome,
    occurred_at
  FROM
    all_evidence
  ORDER BY
    question_id,
    occurred_at DESC,
    evidence_priority DESC
),
latest_exam_failure AS (
  SELECT DISTINCT ON (question_id)
    question_id,
    subject_id,
    knowledge_node_id,
    source_attempt_question_id,
    source_attempt_id,
    question_snapshot
  FROM
    exam_evidence
  WHERE
    outcome IN ('wrong', 'unanswered')
  ORDER BY
    question_id,
    occurred_at DESC
),
last_review AS (
  SELECT
    uwq.question_id,
    max(wqr.created_at) AS last_reviewed_at
  FROM
    public.wrong_question_reviews wqr
    JOIN public.user_wrong_questions uwq ON uwq.id = wqr.user_wrong_question_id
  WHERE
    wqr.user_id = p_user_id
    AND uwq.track_id = v_track_id
  GROUP BY
    uwq.question_id)
INSERT INTO public.user_wrong_questions (user_id, user_track_id, track_id, subject_id, question_id, knowledge_node_id, source_attempt_question_id, last_source_attempt_id, question_snapshot, first_failed_at, last_failed_at, failure_count, wrong_count, unanswered_count, latest_outcome, status, resolved_at, last_reviewed_at, updated_at)
SELECT
  p_user_id,
  v_user_track_id,
  v_track_id,
  lef.subject_id,
  fs.question_id,
  lef.knowledge_node_id,
  lef.source_attempt_question_id,
  lef.source_attempt_id,
  lef.question_snapshot,
  fs.first_failed_at,
  fs.last_failed_at,
  fs.failure_count,
  fs.wrong_count,
  fs.unanswered_count,
  le.outcome,
  CASE WHEN le.outcome = 'correct' THEN
    'resolved'
  ELSE
    'open'
  END,
  CASE WHEN le.outcome = 'correct' THEN
    le.occurred_at
  ELSE
    NULL
  END,
  lr.last_reviewed_at,
  now()
FROM
  failure_stats fs
  JOIN latest_evidence le ON le.question_id = fs.question_id
  JOIN latest_exam_failure lef ON lef.question_id = fs.question_id
  LEFT JOIN last_review lr ON lr.question_id = fs.question_id
ON CONFLICT (user_id,
  track_id,
  question_id)
  DO UPDATE SET
    user_track_id = excluded.user_track_id,
    subject_id = excluded.subject_id,
    knowledge_node_id = excluded.knowledge_node_id,
    source_attempt_question_id = excluded.source_attempt_question_id,
    last_source_attempt_id = excluded.last_source_attempt_id,
    question_snapshot = excluded.question_snapshot,
    first_failed_at = excluded.first_failed_at,
    last_failed_at = excluded.last_failed_at,
    failure_count = excluded.failure_count,
    wrong_count = excluded.wrong_count,
    unanswered_count = excluded.unanswered_count,
    latest_outcome = excluded.latest_outcome,
    status = excluded.status,
    resolved_at = excluded.resolved_at,
    last_reviewed_at = excluded.last_reviewed_at,
    updated_at = now();

  SELECT
    count(*)::integer,
    count(*) FILTER (WHERE status = 'open')::integer,
    count(*) FILTER (WHERE status = 'resolved')::integer
  INTO
    v_total,
    v_open,
    v_resolved
  FROM
    public.user_wrong_questions
  WHERE
    user_id = p_user_id
    AND track_id = v_track_id;

  RETURN jsonb_build_object('applied', TRUE, 'track', 'TKA/SMP', 'total', v_total, 'open', v_open, 'resolved', v_resolved, 'source_attempt_id', p_source_attempt_id);
END;
$function$;

REVOKE ALL ON FUNCTION app_private.refresh_tka_smp_wrong_question_state_for_user (uuid, uuid) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION app_private.review_wrong_question_for_user (p_user_id uuid, p_wrong_question_id uuid, p_option_ids uuid[])
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $function$
DECLARE
  v_row public.user_wrong_questions%rowtype;
  v_evaluation jsonb;
  v_state jsonb;
  v_remaining integer;
BEGIN
  SELECT
    *
  INTO
    v_row
  FROM
    public.user_wrong_questions
  WHERE
    id = p_wrong_question_id
    AND user_id = p_user_id
    AND status = 'open'
  FOR UPDATE;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'OPEN_WRONG_QUESTION_NOT_FOUND';
  END IF;

  v_evaluation := app_private.evaluate_wrong_question_selection (v_row.question_snapshot, p_option_ids);

  INSERT INTO public.wrong_question_reviews (user_id, user_wrong_question_id, question_id, selected_option_ids, is_correct, score_awarded)
  VALUES
    (p_user_id, v_row.id, v_row.question_id, coalesce(p_option_ids, ARRAY[]::uuid[]),
      (v_evaluation ->> 'is_correct')::boolean, (v_evaluation ->> 'score_awarded')::numeric);

  v_state := app_private.refresh_tka_smp_wrong_question_state_for_user (p_user_id, NULL);

  SELECT
    count(*)::integer
  INTO
    v_remaining
  FROM
    public.user_wrong_questions
  WHERE
    user_id = p_user_id
    AND track_id = v_row.track_id
    AND status = 'open';

  RETURN jsonb_build_object('wrong_question_id', v_row.id, 'is_correct', (v_evaluation ->> 'is_correct')::boolean, 'score_awarded', (v_evaluation ->> 'score_awarded')::numeric, 'remaining_open', v_remaining, 'state', v_state);
END;
$function$;

REVOKE ALL ON FUNCTION app_private.review_wrong_question_for_user (uuid, uuid, uuid[]) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.review_wrong_question (p_wrong_question_id uuid, p_option_ids uuid[])
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $function$
DECLARE
  v_user uuid := auth.uid ();
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  RETURN app_private.review_wrong_question_for_user (v_user, p_wrong_question_id, p_option_ids);
END;
$function$;

REVOKE ALL ON FUNCTION public.review_wrong_question (uuid, uuid[]) FROM public, anon;

GRANT EXECUTE ON FUNCTION public.review_wrong_question (uuid, uuid[]) TO authenticated;

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
  v_wrong_state jsonb;
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

  v_wrong_state := app_private.refresh_tka_smp_wrong_question_state_for_user (p_user_id, p_attempt_id);
INSERT INTO public.attempt_events (attempt_id, event_type, metadata)
  VALUES (p_attempt_id, 'wrong_question_state_refreshed', v_wrong_state);

  RETURN jsonb_build_object('attempt_id', p_attempt_id, 'status', 'completed', 'raw_score', (v_score ->> 'raw_score')::numeric, 'percentage', (v_score ->> 'percentage')::numeric, 'duration_used_seconds', v_duration, 'learning_projection', v_projection, 'wrong_question_state', v_wrong_state);
END;
$function$;

-- Backfill existing completed TKA SMP attempts into persistent wrong/unanswered state.
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
        app_private.refresh_tka_smp_wrong_question_state_for_user (r.user_id, NULL);
    END LOOP;
END;
$backfill$;
