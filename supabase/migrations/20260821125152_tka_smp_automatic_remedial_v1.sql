-- Milestone 3 / Slice 3.3: automatic remedial sessions + mastery updates from successful correction practice.
ALTER TABLE public.remedial_sessions
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.remedial_session_items
  ADD COLUMN IF NOT EXISTS user_wrong_question_id uuid REFERENCES public.user_wrong_questions (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS position integer,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS review_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS best_score numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.wrong_question_reviews
  ADD COLUMN IF NOT EXISTS review_source text NOT NULL DEFAULT 'repeat_wrong',
  ADD COLUMN IF NOT EXISTS remedial_session_item_id uuid REFERENCES public.remedial_session_items (id) ON DELETE SET NULL;

DO $constraints$
BEGIN
  IF NOT EXISTS (
    SELECT
      1
    FROM
      pg_constraint
    WHERE
      conrelid = 'public.remedial_sessions'::regclass
      AND conname = 'remedial_sessions_status_check') THEN
  ALTER TABLE public.remedial_sessions
    ADD CONSTRAINT remedial_sessions_status_check CHECK (status IN ('active', 'completed'));
END IF;

  IF NOT EXISTS (
    SELECT
      1
    FROM
      pg_constraint
    WHERE
      conrelid = 'public.remedial_session_items'::regclass
      AND conname = 'remedial_session_items_position_check') THEN
  ALTER TABLE public.remedial_session_items
    ADD CONSTRAINT remedial_session_items_position_check CHECK (position IS NULL OR position >= 1);
END IF;

  IF NOT EXISTS (
    SELECT
      1
    FROM
      pg_constraint
    WHERE
      conrelid = 'public.remedial_session_items'::regclass
      AND conname = 'remedial_session_items_status_check') THEN
  ALTER TABLE public.remedial_session_items
    ADD CONSTRAINT remedial_session_items_status_check CHECK (status IN ('pending', 'completed'));
END IF;

  IF NOT EXISTS (
    SELECT
      1
    FROM
      pg_constraint
    WHERE
      conrelid = 'public.remedial_session_items'::regclass
      AND conname = 'remedial_session_items_review_count_check') THEN
  ALTER TABLE public.remedial_session_items
    ADD CONSTRAINT remedial_session_items_review_count_check CHECK (review_count >= 0);
END IF;

  IF NOT EXISTS (
    SELECT
      1
    FROM
      pg_constraint
    WHERE
      conrelid = 'public.remedial_session_items'::regclass
      AND conname = 'remedial_session_items_best_score_check') THEN
  ALTER TABLE public.remedial_session_items
    ADD CONSTRAINT remedial_session_items_best_score_check CHECK (best_score >= 0 AND best_score <= 1);
END IF;

  IF NOT EXISTS (
    SELECT
      1
    FROM
      pg_constraint
    WHERE
      conrelid = 'public.wrong_question_reviews'::regclass
      AND conname = 'wrong_question_reviews_source_check') THEN
  ALTER TABLE public.wrong_question_reviews
    ADD CONSTRAINT wrong_question_reviews_source_check CHECK (review_source IN ('repeat_wrong', 'remedial'));
END IF;
END
$constraints$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_remedial_sessions_source_attempt ON public.remedial_sessions (source_attempt_id)
WHERE
  source_attempt_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_remedial_session_items_session_question ON public.remedial_session_items (session_id, question_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_remedial_session_items_session_position ON public.remedial_session_items (session_id, position)
WHERE
  position IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_remedial_sessions_user_status_created ON public.remedial_sessions (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_remedial_sessions_track_id ON public.remedial_sessions (track_id);

CREATE INDEX IF NOT EXISTS idx_remedial_session_items_wrong_question ON public.remedial_session_items (user_wrong_question_id)
WHERE
  user_wrong_question_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wrong_question_reviews_remedial_item ON public.wrong_question_reviews (remedial_session_item_id)
WHERE
  remedial_session_item_id IS NOT NULL;

CREATE OR REPLACE FUNCTION app_private.sync_tka_smp_remedial_sessions_for_user (p_user_id uuid)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $function$
DECLARE
  v_items_synced integer := 0;
  v_sessions_completed integer := 0;
BEGIN
  UPDATE
    public.remedial_session_items rsi
  SET
    status = 'completed',
    best_score = greatest (rsi.best_score, 1),
    completed_at = coalesce(rsi.completed_at, uwq.resolved_at, now()),
    updated_at = now()
  FROM
    public.remedial_sessions rs,
    public.user_wrong_questions uwq
  WHERE
    rsi.session_id = rs.id
    AND rsi.user_wrong_question_id = uwq.id
    AND rs.user_id = p_user_id
    AND rsi.status = 'pending'
    AND uwq.status = 'resolved';

  get diagnostics v_items_synced = row_count;

  UPDATE
    public.remedial_sessions rs
  SET
    status = 'completed',
    completed_at = coalesce(rs.completed_at, now()),
    updated_at = now()
  WHERE
    rs.user_id = p_user_id
    AND rs.status = 'active'
    AND EXISTS (
      SELECT
        1
      FROM
        public.remedial_session_items rsi
      WHERE
        rsi.session_id = rs.id)
    AND NOT EXISTS (
      SELECT
        1
      FROM
        public.remedial_session_items rsi
      WHERE
        rsi.session_id = rs.id
        AND rsi.status = 'pending');

  get diagnostics v_sessions_completed = row_count;

  RETURN jsonb_build_object('items_synced', v_items_synced, 'sessions_completed', v_sessions_completed);
END;
$function$;

REVOKE ALL ON FUNCTION app_private.sync_tka_smp_remedial_sessions_for_user (uuid) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION app_private.refresh_tka_smp_remedial_session_for_attempt (p_user_id uuid, p_source_attempt_id uuid, p_limit integer DEFAULT 10)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $function$
DECLARE
  v_track_id uuid;
  v_session_id uuid;
  v_existing_status text;
  v_limit integer := greatest (1, least (coalesce(p_limit, 10), 20));
  v_total integer := 0;
  v_completed integer := 0;
  v_pending integer := 0;
BEGIN
  SELECT
    e.track_id
  INTO
    v_track_id
  FROM
    public.exam_attempts ea
    JOIN public.exams e ON e.id = ea.exam_id
    JOIN public.tracks t ON t.id = e.track_id
    JOIN public.programs p ON p.id = t.program_id
  WHERE
    ea.id = p_source_attempt_id
    AND ea.user_id = p_user_id
    AND lower(ea.status) = 'completed'
    AND upper(p.code) = 'TKA'
    AND upper(t.code) = 'SMP'
  LIMIT 1;

  IF v_track_id IS NULL THEN
    RETURN jsonb_build_object('applied', FALSE, 'reason', 'COMPLETED_TKA_SMP_SOURCE_ATTEMPT_NOT_FOUND', 'source_attempt_id', p_source_attempt_id);
  END IF;

  PERFORM
    app_private.refresh_tka_smp_wrong_question_state_for_user (p_user_id, p_source_attempt_id);
  PERFORM
    app_private.sync_tka_smp_remedial_sessions_for_user (p_user_id);

  SELECT
    rs.id,
    rs.status
  INTO
    v_session_id,
    v_existing_status
  FROM
    public.remedial_sessions rs
  WHERE
    rs.source_attempt_id = p_source_attempt_id
    AND rs.user_id = p_user_id
  LIMIT 1;

  IF v_session_id IS NOT NULL THEN
    SELECT
      count(*)::integer,
      count(*) FILTER (WHERE rsi.status = 'completed')::integer,
      count(*) FILTER (WHERE rsi.status = 'pending')::integer
    INTO
      v_total,
      v_completed,
      v_pending
    FROM
      public.remedial_session_items rsi
    WHERE
      rsi.session_id = v_session_id;

    RETURN jsonb_build_object('applied', TRUE, 'created', FALSE, 'session_id', v_session_id, 'status', v_existing_status, 'total_items', v_total, 'completed_items', v_completed, 'pending_items', v_pending, 'source_attempt_id', p_source_attempt_id);
  END IF;

  IF NOT EXISTS (
    SELECT
      1
    FROM
      public.attempt_questions aq
    LEFT JOIN public.attempt_answers aa ON aa.attempt_question_id = aq.id
    JOIN public.user_wrong_questions uwq ON uwq.user_id = p_user_id
      AND uwq.track_id = v_track_id
      AND uwq.question_id = aq.question_id
      AND uwq.status = 'open'
  WHERE
    aq.attempt_id = p_source_attempt_id
    AND (aa.id IS NULL
      OR aa.is_correct IS NOT TRUE)) THEN
RETURN jsonb_build_object('applied', FALSE, 'reason', 'NO_OPEN_GAPS', 'source_attempt_id', p_source_attempt_id);
END IF;

  INSERT INTO public.remedial_sessions (user_id, track_id, source_attempt_id, status, created_at, updated_at)
    VALUES (p_user_id, v_track_id, p_source_attempt_id, 'active', now(), now())
  ON CONFLICT (source_attempt_id)
WHERE
  source_attempt_id IS NOT NULL
    DO NOTHING
  RETURNING
    id
  INTO
    v_session_id;

  IF v_session_id IS NULL THEN
    SELECT
      rs.id
    INTO
      v_session_id
    FROM
      public.remedial_sessions rs
    WHERE
      rs.source_attempt_id = p_source_attempt_id
      AND rs.user_id = p_user_id
    LIMIT 1;
  END IF;

  IF v_session_id IS NULL THEN
    RAISE EXCEPTION 'REMEDIAL_SESSION_CREATE_FAILED';
  END IF;

  IF NOT EXISTS (
    SELECT
      1
    FROM
      public.remedial_session_items rsi
    WHERE
      rsi.session_id = v_session_id) THEN
  WITH source_gaps AS (
    SELECT
      aq.question_id,
      uwq.id AS user_wrong_question_id,
      uwq.knowledge_node_id,
      q.subject_id,
      coalesce(s.code, s.id::text) AS subject_order,
      aq.position AS attempt_position,
      CASE WHEN aa.id IS NULL THEN
        'source_attempt_unanswered'
      ELSE
        'source_attempt_wrong'
      END AS reason
    FROM
      public.attempt_questions aq
      JOIN public.questions q ON q.id = aq.question_id
      LEFT JOIN public.subjects s ON s.id = q.subject_id
      LEFT JOIN public.attempt_answers aa ON aa.attempt_question_id = aq.id
      JOIN public.user_wrong_questions uwq ON uwq.user_id = p_user_id
        AND uwq.track_id = v_track_id
        AND uwq.question_id = aq.question_id
        AND uwq.status = 'open'
    WHERE
      aq.attempt_id = p_source_attempt_id
      AND (aa.id IS NULL
        OR aa.is_correct IS NOT TRUE)
),
ranked AS (
  SELECT
    sg.*,
    row_number() OVER (PARTITION BY sg.subject_id ORDER BY sg.attempt_position,
      sg.question_id) AS subject_rank
  FROM
    source_gaps sg
),
chosen AS (
  SELECT
    *
  FROM
    ranked
  ORDER BY
    subject_rank,
    subject_order,
    attempt_position,
    question_id
  LIMIT v_limit
),
positioned AS (
  SELECT
    c.*,
    row_number() OVER (ORDER BY c.subject_rank,
      c.subject_order,
      c.attempt_position,
      c.question_id)::integer AS remedial_position
  FROM
    chosen c)
INSERT INTO public.remedial_session_items (session_id, question_id, knowledge_node_id, reason, user_wrong_question_id, position, status, review_count, best_score, updated_at)
SELECT
  v_session_id,
  p.question_id,
  p.knowledge_node_id,
  p.reason,
  p.user_wrong_question_id,
  p.remedial_position,
  'pending',
  0,
  0,
  now()
FROM
  positioned p
ORDER BY
  p.remedial_position
ON CONFLICT (session_id,
  question_id)
  DO NOTHING;
END IF;

    SELECT
      count(*)::integer,
      count(*) FILTER (WHERE rsi.status = 'completed')::integer,
      count(*) FILTER (WHERE rsi.status = 'pending')::integer
    INTO
      v_total,
      v_completed,
      v_pending
    FROM
      public.remedial_session_items rsi
    WHERE
      rsi.session_id = v_session_id;

    RETURN jsonb_build_object('applied', TRUE, 'created', TRUE, 'session_id', v_session_id, 'status', CASE WHEN v_pending = 0 THEN
        'completed'
      ELSE
        'active'
      END, 'total_items', v_total, 'completed_items', v_completed, 'pending_items', v_pending, 'source_attempt_id', p_source_attempt_id);
END;
$function$;

REVOKE ALL ON FUNCTION app_private.refresh_tka_smp_remedial_session_for_attempt (uuid, uuid, integer) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION app_private.get_tka_smp_remedial_payload_for_user (p_user_id uuid, p_session_id uuid)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $function$
DECLARE
  v_session public.remedial_sessions%rowtype;
  v_items jsonb := '[]'::jsonb;
  v_total integer := 0;
  v_completed integer := 0;
  v_pending integer := 0;
BEGIN
  PERFORM
    app_private.sync_tka_smp_remedial_sessions_for_user (p_user_id);

  SELECT
    rs.*
  INTO
    v_session
  FROM
    public.remedial_sessions rs
    JOIN public.tracks t ON t.id = rs.track_id
    JOIN public.programs p ON p.id = t.program_id
  WHERE
    rs.id = p_session_id
    AND rs.user_id = p_user_id
    AND upper(p.code) = 'TKA'
    AND upper(t.code) = 'SMP';

  IF v_session.id IS NULL THEN
    RETURN jsonb_build_object('session', NULL, 'items', '[]'::jsonb);
  END IF;

  SELECT
    count(*)::integer,
    count(*) FILTER (WHERE rsi.status = 'completed')::integer,
    count(*) FILTER (WHERE rsi.status = 'pending')::integer
  INTO
    v_total,
    v_completed,
    v_pending
  FROM
    public.remedial_session_items rsi
  WHERE
    rsi.session_id = v_session.id;

  SELECT
    coalesce(jsonb_agg(item ORDER BY position), '[]'::jsonb)
  INTO
    v_items
  FROM (
    SELECT
      rsi.position,
      jsonb_build_object('id', rsi.id, 'position', rsi.position, 'status', rsi.status, 'review_count', rsi.review_count, 'best_score', rsi.best_score, 'reason', rsi.reason, 'wrong_question_id', uwq.id, 'question_id', rsi.question_id, 'subject_id', uwq.subject_id, 'failure_count', uwq.failure_count, 'wrong_count', uwq.wrong_count, 'unanswered_count', uwq.unanswered_count, 'latest_outcome', uwq.latest_outcome, 'question_snapshot', jsonb_build_object('question', uwq.question_snapshot -> 'question', 'stimulus', uwq.question_snapshot -> 'stimulus', 'options', coalesce((
            SELECT
              jsonb_agg((option_row - 'is_correct' - 'score')
            ORDER BY coalesce((option_row ->> 'sort_order')::integer, 0), option_row ->> 'id')
        FROM jsonb_array_elements(coalesce(uwq.question_snapshot -> 'options', '[]'::jsonb)) option_row), '[]'::jsonb), 'explanations', '[]'::jsonb)) AS item
    FROM
      public.remedial_session_items rsi
      JOIN public.user_wrong_questions uwq ON uwq.id = rsi.user_wrong_question_id
    WHERE
      rsi.session_id = v_session.id
    ORDER BY
      rsi.position) payload_rows;

  RETURN jsonb_build_object('session', jsonb_build_object('id', v_session.id, 'source_attempt_id', v_session.source_attempt_id, 'status', v_session.status, 'total_items', v_total, 'completed_items', v_completed, 'pending_items', v_pending, 'created_at', v_session.created_at, 'completed_at', v_session.completed_at), 'items', v_items);
END;
$function$;

REVOKE ALL ON FUNCTION app_private.get_tka_smp_remedial_payload_for_user (uuid, uuid) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_tka_smp_remedial_for_attempt (p_source_attempt_id uuid)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $function$
DECLARE
  v_user uuid := auth.uid ();
  v_session_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT
    rs.id
  INTO
    v_session_id
  FROM
    public.remedial_sessions rs
  WHERE
    rs.user_id = v_user
    AND rs.source_attempt_id = p_source_attempt_id
  LIMIT 1;

  IF v_session_id IS NULL THEN
    RETURN jsonb_build_object('session', NULL, 'items', '[]'::jsonb);
  END IF;

  RETURN app_private.get_tka_smp_remedial_payload_for_user (v_user, v_session_id);
END;
$function$;

REVOKE ALL ON FUNCTION public.get_tka_smp_remedial_for_attempt (uuid) FROM public, anon;

GRANT EXECUTE ON FUNCTION public.get_tka_smp_remedial_for_attempt (uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_tka_smp_remedial_session (p_session_id uuid)
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

  RETURN app_private.get_tka_smp_remedial_payload_for_user (v_user, p_session_id);
END;
$function$;

REVOKE ALL ON FUNCTION public.get_tka_smp_remedial_session (uuid) FROM public, anon;

GRANT EXECUTE ON FUNCTION public.get_tka_smp_remedial_session (uuid) TO authenticated;

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

  DELETE FROM public.user_knowledge_progress ukp
  WHERE ukp.user_id = p_user_id
    AND ukp.user_track_id = v_user_track_id;

  WITH exam_evidence AS (
    SELECT
      qkn.knowledge_node_id,
      aa.is_correct,
      coalesce(aa.score_awarded, 0)::numeric AS score_awarded,
      coalesce(aa.time_spent_seconds, 0)::numeric AS time_spent_seconds,
      coalesce(ea.submitted_at, ea.updated_at, ea.created_at) AS occurred_at
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
),
correction_evidence AS (
  SELECT
    uwq.knowledge_node_id,
    TRUE AS is_correct,
    wqr.score_awarded::numeric AS score_awarded,
    NULL::numeric AS time_spent_seconds,
    wqr.created_at AS occurred_at
  FROM
    public.wrong_question_reviews wqr
    JOIN public.user_wrong_questions uwq ON uwq.id = wqr.user_wrong_question_id
  WHERE
    wqr.user_id = p_user_id
    AND uwq.track_id = v_track_id
    AND uwq.knowledge_node_id IS NOT NULL
    AND wqr.is_correct IS TRUE
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
    correction_evidence
),
knowledge_agg AS (
  SELECT
    knowledge_node_id,
    count(*)::integer AS attempted_questions,
    count(*) FILTER (WHERE is_correct IS TRUE)::integer AS correct_questions,
    count(*) FILTER (WHERE is_correct IS TRUE)::numeric / nullif (count(*), 0) AS accuracy,
    avg(score_awarded)::numeric AS average_score,
    (avg(time_spent_seconds) FILTER (WHERE time_spent_seconds IS NOT NULL))::numeric AS average_time_seconds,
    max(occurred_at) AS last_practiced_at
  FROM
    all_evidence
  GROUP BY
    knowledge_node_id
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

REVOKE ALL ON FUNCTION app_private.refresh_tka_smp_learning_projection_for_user (uuid, uuid) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION app_private.review_tka_smp_remedial_item_for_user (p_user_id uuid, p_session_id uuid, p_item_id uuid, p_option_ids uuid[])
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $function$
DECLARE
  v_session public.remedial_sessions%rowtype;
  v_item public.remedial_session_items%rowtype;
  v_wrong public.user_wrong_questions%rowtype;
  v_evaluation jsonb;
  v_state jsonb;
  v_projection jsonb := NULL;
  v_sync jsonb;
  v_explanation text := '';
  v_total integer := 0;
  v_completed integer := 0;
  v_pending integer := 0;
BEGIN
  SELECT
    *
  INTO
    v_session
  FROM
    public.remedial_sessions
  WHERE
    id = p_session_id
    AND user_id = p_user_id
  FOR UPDATE;

  IF v_session.id IS NULL THEN
    RAISE EXCEPTION 'REMEDIAL_SESSION_NOT_FOUND';
  END IF;

  SELECT
    *
  INTO
    v_item
  FROM
    public.remedial_session_items
  WHERE
    id = p_item_id
    AND session_id = p_session_id
  FOR UPDATE;

  IF v_item.id IS NULL THEN
    RAISE EXCEPTION 'REMEDIAL_ITEM_NOT_FOUND';
  END IF;

  IF v_item.status = 'completed' THEN
    RAISE EXCEPTION 'REMEDIAL_ITEM_ALREADY_COMPLETED';
  END IF;

  SELECT
    *
  INTO
    v_wrong
  FROM
    public.user_wrong_questions
  WHERE
    id = v_item.user_wrong_question_id
    AND user_id = p_user_id
  FOR UPDATE;

  IF v_wrong.id IS NULL THEN
    RAISE EXCEPTION 'REMEDIAL_WRONG_QUESTION_STATE_NOT_FOUND';
  END IF;

  IF v_wrong.status <> 'open' THEN
    PERFORM
      app_private.sync_tka_smp_remedial_sessions_for_user (p_user_id);
    RAISE EXCEPTION 'REMEDIAL_ITEM_ALREADY_RESOLVED';
  END IF;

  v_evaluation := app_private.evaluate_wrong_question_selection (v_wrong.question_snapshot, p_option_ids);

  SELECT
    coalesce(explanation_row ->> 'content', '')
  INTO
    v_explanation
  FROM
    jsonb_array_elements(coalesce(v_wrong.question_snapshot -> 'explanations', '[]'::jsonb)) explanation_row
WHERE
  coalesce(explanation_row ->> 'content', '') <> '' LIMIT 1;

  INSERT INTO public.wrong_question_reviews (user_id, user_wrong_question_id, question_id, selected_option_ids, is_correct, score_awarded, review_source, remedial_session_item_id)
  VALUES
    (p_user_id, v_wrong.id, v_wrong.question_id, coalesce(p_option_ids, ARRAY[]::uuid[]),
      (v_evaluation ->> 'is_correct')::boolean, (v_evaluation ->> 'score_awarded')::numeric, 'remedial', v_item.id);

  UPDATE
    public.remedial_session_items
  SET
    review_count = review_count + 1,
    best_score = greatest (best_score, (v_evaluation ->> 'score_awarded')::numeric),
    status = CASE WHEN (v_evaluation ->> 'is_correct')::boolean THEN
      'completed'
    ELSE
      status
    END,
    completed_at = CASE WHEN (v_evaluation ->> 'is_correct')::boolean THEN
      coalesce(completed_at, now())
    ELSE
      completed_at
    END,
    updated_at = now()
  WHERE
    id = v_item.id;

  v_state := app_private.refresh_tka_smp_wrong_question_state_for_user (p_user_id, NULL);

  IF (v_evaluation ->> 'is_correct')::boolean THEN
    v_projection := app_private.refresh_tka_smp_learning_projection_for_user (p_user_id, NULL);
  END IF;

  v_sync := app_private.sync_tka_smp_remedial_sessions_for_user (p_user_id);

  SELECT
    count(*)::integer,
    count(*) FILTER (WHERE status = 'completed')::integer,
    count(*) FILTER (WHERE status = 'pending')::integer
  INTO
    v_total,
    v_completed,
    v_pending
  FROM
    public.remedial_session_items
  WHERE
    session_id = p_session_id;

  RETURN jsonb_build_object('session_id', p_session_id, 'item_id', p_item_id, 'is_correct', (v_evaluation ->> 'is_correct')::boolean, 'score_awarded', (v_evaluation ->> 'score_awarded')::numeric, 'explanation', v_explanation, 'total_items', v_total, 'completed_items', v_completed, 'pending_items', v_pending, 'session_status', CASE WHEN v_pending = 0 THEN
      'completed'
    ELSE
      'active'
    END, 'wrong_question_state', v_state, 'learning_projection', v_projection, 'remedial_sync', v_sync);
END;
$function$;

REVOKE ALL ON FUNCTION app_private.review_tka_smp_remedial_item_for_user (uuid, uuid, uuid, uuid[]) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.review_tka_smp_remedial_item (p_session_id uuid, p_item_id uuid, p_option_ids uuid[])
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

  RETURN app_private.review_tka_smp_remedial_item_for_user (v_user, p_session_id, p_item_id, p_option_ids);
END;
$function$;

REVOKE ALL ON FUNCTION public.review_tka_smp_remedial_item (uuid, uuid, uuid[]) FROM public, anon;

GRANT EXECUTE ON FUNCTION public.review_tka_smp_remedial_item (uuid, uuid, uuid[]) TO authenticated;

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
  v_projection jsonb := NULL;
  v_sync jsonb;
  v_remaining integer;
  v_explanation text := '';
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

  SELECT
    coalesce(explanation_row ->> 'content', '')
  INTO
    v_explanation
  FROM
    jsonb_array_elements(coalesce(v_row.question_snapshot -> 'explanations', '[]'::jsonb)) explanation_row
WHERE
  coalesce(explanation_row ->> 'content', '') <> '' LIMIT 1;

  INSERT INTO public.wrong_question_reviews (user_id, user_wrong_question_id, question_id, selected_option_ids, is_correct, score_awarded, review_source)
  VALUES
    (p_user_id, v_row.id, v_row.question_id, coalesce(p_option_ids, ARRAY[]::uuid[]),
      (v_evaluation ->> 'is_correct')::boolean, (v_evaluation ->> 'score_awarded')::numeric, 'repeat_wrong');

  v_state := app_private.refresh_tka_smp_wrong_question_state_for_user (p_user_id, NULL);

  IF (v_evaluation ->> 'is_correct')::boolean THEN
    v_projection := app_private.refresh_tka_smp_learning_projection_for_user (p_user_id, NULL);
  END IF;

  v_sync := app_private.sync_tka_smp_remedial_sessions_for_user (p_user_id);

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

  RETURN jsonb_build_object('wrong_question_id', v_row.id, 'is_correct', (v_evaluation ->> 'is_correct')::boolean, 'score_awarded', (v_evaluation ->> 'score_awarded')::numeric, 'remaining_open', v_remaining, 'explanation', v_explanation, 'state', v_state, 'learning_projection', v_projection, 'remedial_sync', v_sync);
END;
$function$;

REVOKE ALL ON FUNCTION app_private.review_wrong_question_for_user (uuid, uuid, uuid[]) FROM public, anon, authenticated;

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
  v_remedial jsonb;
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

  v_remedial := app_private.refresh_tka_smp_remedial_session_for_attempt (p_user_id, p_attempt_id, 10);
  INSERT INTO public.attempt_events (attempt_id, event_type, metadata)
    VALUES (p_attempt_id, 'automatic_remedial_refreshed', v_remedial);

  RETURN jsonb_build_object('attempt_id', p_attempt_id, 'status', 'completed', 'raw_score', (v_score ->> 'raw_score')::numeric, 'percentage', (v_score ->> 'percentage')::numeric, 'duration_used_seconds', v_duration, 'learning_projection', v_projection, 'wrong_question_state', v_wrong_state, 'automatic_remedial', v_remedial);
END;
$function$;

REVOKE ALL ON FUNCTION app_private.submit_exam_attempt_for_user (uuid, uuid) FROM public, anon, authenticated;

-- Refresh mastery to include prior successful correction practice.
DO $refresh_mastery$
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
    lower(ea.status) = 'completed'
    AND upper(p.code) = 'TKA'
    AND upper(t.code) = 'SMP' LOOP
      PERFORM
        app_private.refresh_tka_smp_learning_projection_for_user (r.user_id, NULL);
    END LOOP;
END
$refresh_mastery$;

-- Backfill one useful automatic remedial: the latest completed TKA SMP attempt per learner.
DO $backfill_remedial$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT DISTINCT ON (ea.user_id)
    ea.user_id,
    ea.id AS attempt_id
  FROM
    public.exam_attempts ea
    JOIN public.exams e ON e.id = ea.exam_id
    JOIN public.tracks t ON t.id = e.track_id
    JOIN public.programs p ON p.id = t.program_id
  WHERE
    lower(ea.status) = 'completed'
    AND upper(p.code) = 'TKA'
    AND upper(t.code) = 'SMP'
  ORDER BY
    ea.user_id,
    coalesce(ea.submitted_at, ea.updated_at, ea.created_at) DESC,
    ea.id DESC LOOP
      PERFORM
        app_private.refresh_tka_smp_remedial_session_for_attempt (r.user_id, r.attempt_id, 10);
    END LOOP;
END
$backfill_remedial$;
