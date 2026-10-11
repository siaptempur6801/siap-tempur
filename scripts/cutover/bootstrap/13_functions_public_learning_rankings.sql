-- Generated from canonical staging lpgrivowdcepcxradavu via pg_get_functiondef().
-- Public runtime learning/readiness/wrong-question/ranking functions.
-- DO NOT apply to production before explicit final GO.
CREATE OR REPLACE FUNCTION public.get_tka_smp_learning_focus ()
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_user uuid := auth.uid ();
  v_track_id uuid;
  v_refresh jsonb;
  v_items jsonb := '[]'::jsonb;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

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
    RETURN jsonb_build_object('items', '[]'::jsonb, 'count', 0, 'refresh', jsonb_build_object('applied', FALSE, 'reason', 'TKA_SMP_TRACK_NOT_FOUND'));
  END IF;

  v_refresh := app_private.refresh_tka_smp_learning_recommendations_for_user (v_user);

  SELECT
    coalesce(jsonb_agg(item ORDER BY priority), '[]'::jsonb)
  INTO
    v_items
  FROM (
    SELECT
      lr.priority,
      jsonb_build_object('id', lr.id, 'priority', lr.priority, 'score', lr.score, 'reason_code', lr.reason_code, 'knowledge_node_id', lr.knowledge_node_id, 'topic_code', kn.code, 'topic_name', kn.name, 'parent_topic_name', parent_kn.name, 'subject_code', s.code, 'subject_name', s.name, 'mastery_score', ukp.mastery_score, 'mastery_level', ukp.mastery_level, 'attempted_questions', ukp.attempted_questions, 'correct_questions', ukp.correct_questions, 'accuracy', ukp.accuracy, 'open_gap_count', coalesce(gaps.open_gap_count, 0), 'next_action', CASE WHEN remedial.session_id IS NOT NULL THEN
          jsonb_build_object('type', 'continue_remedial', 'label', 'Lanjutkan remedial', 'href', '/tka/smp/remedial/' || remedial.session_id::text)
        WHEN coalesce(gaps.open_gap_count, 0) > 0 THEN
          jsonb_build_object('type', 'repeat_wrong', 'label', 'Ulang soal salah', 'href', '/tka/smp/wrong-questions')
        ELSE
          jsonb_build_object('type', 'practice_tka', 'label', 'Latihan TKA SMP', 'href', '/tka/smp')
        END) AS item
    FROM
      public.learning_recommendations lr
      JOIN public.knowledge_nodes kn ON kn.id = lr.knowledge_node_id
      LEFT JOIN public.knowledge_nodes parent_kn ON parent_kn.id = kn.parent_id
      JOIN public.subjects s ON s.id = kn.subject_id
      JOIN public.user_tracks ut ON ut.user_id = lr.user_id
        AND ut.track_id = lr.track_id
        AND lower(ut.status) = 'active'
      JOIN public.user_knowledge_progress ukp ON ukp.user_id = lr.user_id
        AND ukp.user_track_id = ut.id
        AND ukp.knowledge_node_id = lr.knowledge_node_id
    LEFT JOIN LATERAL (
      SELECT
        count(*)::integer AS open_gap_count
      FROM
        public.user_wrong_questions uwq
      WHERE
        uwq.user_id = lr.user_id
        AND uwq.track_id = lr.track_id
        AND uwq.knowledge_node_id = lr.knowledge_node_id
        AND uwq.status = 'open') gaps ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        rs.id AS session_id
      FROM
        public.remedial_session_items rsi
        JOIN public.remedial_sessions rs ON rs.id = rsi.session_id
      WHERE
        rs.user_id = lr.user_id
        AND rs.track_id = lr.track_id
        AND rs.status = 'active'
        AND rsi.status = 'pending'
        AND rsi.knowledge_node_id = lr.knowledge_node_id
      ORDER BY
        rs.created_at DESC,
        rsi.position,
        rsi.id
      LIMIT 1) remedial ON TRUE
  WHERE
    lr.user_id = v_user
    AND lr.track_id = v_track_id
    AND lr.recommendation_type = 'weakest_topic_v1'
    AND lr.status = 'active'
  ORDER BY
    lr.priority,
    lr.knowledge_node_id
  LIMIT 3) focus_rows;

  RETURN jsonb_build_object('items', v_items, 'count', jsonb_array_length(v_items), 'rule', 'mastery_asc_evidence_desc_accuracy_asc_v1', 'refresh', v_refresh);
END;
$function$ CREATE OR REPLACE FUNCTION public.get_tka_smp_readiness ()
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_user uuid := auth.uid ();
  v_track_id uuid;
  v_user_track_id uuid;
  v_refresh jsonb;
  v_readiness public.user_readiness%rowtype;
  v_subjects jsonb := '[]'::jsonb;
  v_level text;
  v_confidence_level text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

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
    RETURN jsonb_build_object('available', FALSE, 'reason', 'TKA_SMP_TRACK_NOT_FOUND');
  END IF;

  SELECT
    ut.id
  INTO
    v_user_track_id
  FROM
    public.user_tracks ut
  WHERE
    ut.user_id = v_user
    AND ut.track_id = v_track_id
    AND lower(ut.status) = 'active'
  ORDER BY
    ut.updated_at DESC nulls LAST,
    ut.started_at DESC nulls LAST
  LIMIT 1;

  IF v_user_track_id IS NULL THEN
    RETURN jsonb_build_object('available', FALSE, 'reason', 'ACTIVE_USER_TRACK_NOT_FOUND');
  END IF;

  v_refresh := app_private.refresh_tka_smp_readiness_for_user (v_user);

  SELECT
    ur.*
  INTO
    v_readiness
  FROM
    public.user_readiness ur
  WHERE
    ur.user_id = v_user
    AND ur.track_id = v_track_id
    AND ur.calculation_version = 'tka_smp_readiness_v1'
  LIMIT 1;

  IF v_readiness.id IS NULL THEN
    RETURN jsonb_build_object('available', FALSE, 'reason', 'READINESS_NOT_AVAILABLE', 'refresh', v_refresh);
  END IF;

  WITH assessable AS (
    SELECT DISTINCT
      kn.id AS knowledge_node_id,
      s.id AS subject_id,
      s.code AS subject_code,
      s.name AS subject_name
    FROM
      public.knowledge_nodes kn
      JOIN public.subjects s ON s.id = kn.subject_id
      JOIN public.question_knowledge_nodes qkn ON qkn.knowledge_node_id = kn.id
        AND lower(qkn.relation_type) = 'primary'
      JOIN public.questions q ON q.id = qkn.question_id
    WHERE
      s.track_id = v_track_id
      AND lower(s.status) = 'active'
      AND lower(kn.status) = 'active'
      AND lower(q.status) IN ('approved', 'published')
),
subject_metrics AS (
  SELECT
    a.subject_id,
    a.subject_code,
    a.subject_name,
    count(*)::integer AS assessable_nodes,
    count(*) FILTER (WHERE coalesce(ukp.attempted_questions, 0) > 0)::integer AS evidenced_nodes,
    round(avg(coalesce(ukp.mastery_score, 0::numeric)), 6) AS readiness_score,
    round(avg(least (1::numeric, coalesce(ukp.attempted_questions, 0)::numeric / 5::numeric)), 6) AS confidence_score
  FROM
    assessable a
    LEFT JOIN public.user_knowledge_progress ukp ON ukp.user_id = v_user
      AND ukp.user_track_id = v_user_track_id
      AND ukp.knowledge_node_id = a.knowledge_node_id
  GROUP BY
    a.subject_id,
    a.subject_code,
    a.subject_name
)
SELECT
  coalesce(jsonb_agg(jsonb_build_object('subject_id', sm.subject_id, 'subject_code', sm.subject_code, 'subject_name', sm.subject_name, 'readiness_score', sm.readiness_score, 'confidence_score', sm.confidence_score, 'assessable_nodes', sm.assessable_nodes, 'evidenced_nodes', sm.evidenced_nodes)
    ORDER BY sm.subject_code), '[]'::jsonb)
INTO
  v_subjects
FROM
  subject_metrics sm;

  v_level := CASE WHEN v_readiness.readiness_score >= 0.80 THEN
    'ready'
  WHEN v_readiness.readiness_score >= 0.65 THEN
    'almost_ready'
  WHEN v_readiness.readiness_score >= 0.40 THEN
    'developing'
  ELSE
    'building_foundation'
  END;

  v_confidence_level := CASE WHEN coalesce(v_readiness.confidence_score, 0) >= 0.70 THEN
    'high'
  WHEN coalesce(v_readiness.confidence_score, 0) >= 0.35 THEN
    'moderate'
  ELSE
    'low'
  END;

  RETURN jsonb_build_object('available', TRUE, 'readiness_score', v_readiness.readiness_score, 'readiness_percent', round(v_readiness.readiness_score * 100, 1), 'readiness_level', v_level, 'confidence_score', v_readiness.confidence_score, 'confidence_percent', round(coalesce(v_readiness.confidence_score, 0) * 100, 1), 'confidence_level', v_confidence_level, 'calculation_version', v_readiness.calculation_version, 'calculated_at', v_readiness.calculated_at, 'formula', '0.75_mean_subject_readiness_plus_0.25_weakest_subject_v1', 'subjects', v_subjects);
END;
$function$ CREATE OR REPLACE FUNCTION public.get_tka_smp_wrong_questions (p_limit integer DEFAULT 100)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_user uuid := auth.uid ();
  v_limit integer := greatest (1, least (coalesce(p_limit, 100), 200));
  v_items jsonb;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT
    coalesce(jsonb_agg(item ORDER BY last_failed_at DESC), '[]'::jsonb)
  INTO
    v_items
  FROM (
    SELECT
      uwq.last_failed_at,
      jsonb_build_object('id', uwq.id, 'question_id', uwq.question_id, 'subject_id', uwq.subject_id, 'failure_count', uwq.failure_count, 'wrong_count', uwq.wrong_count, 'unanswered_count', uwq.unanswered_count, 'latest_outcome', uwq.latest_outcome, 'status', uwq.status, 'last_failed_at', uwq.last_failed_at, 'question_snapshot', jsonb_build_object('question', uwq.question_snapshot -> 'question', 'stimulus', uwq.question_snapshot -> 'stimulus', 'options', coalesce((
            SELECT
              jsonb_agg((option_row - 'is_correct' - 'score')
            ORDER BY coalesce((option_row ->> 'sort_order')::integer, 0), option_row ->> 'id')
        FROM jsonb_array_elements(coalesce(uwq.question_snapshot -> 'options', '[]'::jsonb)) option_row), '[]'::jsonb), 'explanations', '[]'::jsonb)) AS item
    FROM
      public.user_wrong_questions uwq
      JOIN public.tracks t ON t.id = uwq.track_id
      JOIN public.programs p ON p.id = t.program_id
    WHERE
      uwq.user_id = v_user
      AND uwq.status = 'open'
      AND upper(p.code) = 'TKA'
      AND upper(t.code) = 'SMP'
    ORDER BY
      uwq.last_failed_at DESC
    LIMIT v_limit) rows_to_return;

  RETURN jsonb_build_object('items', v_items, 'count', jsonb_array_length(v_items));
END;
$function$ CREATE OR REPLACE FUNCTION public.recalculate_event_rankings (p_event_id uuid)
  RETURNS integer
  LANGUAGE plpgsql
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_count integer;
BEGIN
  DELETE FROM public.event_rankings
  WHERE event_id = p_event_id;

  WITH best_attempts AS (
    SELECT DISTINCT ON (a.user_id)
      a.user_id,
      a.id AS attempt_id,
      coalesce(a.total_score, 0)::numeric AS score,
      coalesce(a.duration_used_seconds, 2147483647) AS duration_seconds,
      a.submitted_at,
      a.passed
    FROM
      public.exam_attempts a
    WHERE
      lower(a.status) = 'completed'
      AND a.metadata ->> 'eventId' = p_event_id::text
    ORDER BY
      a.user_id,
      coalesce(a.total_score, 0) DESC,
      coalesce(a.duration_used_seconds, 2147483647) ASC,
      a.submitted_at ASC nulls LAST,
      a.id ASC
),
ranked AS (
  SELECT
    p_event_id AS event_id,
    b.user_id,
    b.attempt_id,
    b.score,
    b.duration_seconds,
    row_number() OVER (ORDER BY b.score DESC,
      b.duration_seconds ASC,
      b.submitted_at ASC nulls LAST,
      b.attempt_id ASC)::integer AS rank,
    CASE WHEN b.passed IS TRUE THEN
      'passed'
    ELSE
      'not_passed'
    END AS rank_group
  FROM
    best_attempts b)
INSERT INTO public.event_rankings (event_id, user_id, attempt_id, score, duration_seconds, rank, rank_group, calculated_at)
SELECT
  r.event_id,
  r.user_id,
  r.attempt_id,
  r.score,
  r.duration_seconds,
  r.rank,
  r.rank_group,
  now()
FROM
  ranked r;

  UPDATE
    public.exam_attempts a
  SET
    rank = er.rank,
    updated_at = now()
  FROM
    public.event_rankings er
  WHERE
    er.event_id = p_event_id
    AND er.attempt_id = a.id;

  SELECT
    count(*)::integer
  INTO
    v_count
  FROM
    public.event_rankings
  WHERE
    event_id = p_event_id;

  RETURN v_count;
END;
$function$ CREATE OR REPLACE FUNCTION public.recalculate_leaderboard (p_leaderboard_id uuid)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public', 'pg_temp'
  AS $function$
DECLARE
  v_board public.leaderboards%rowtype;
BEGIN
  SELECT
    *
  INTO
    v_board
  FROM
    public.leaderboards
  WHERE
    id = p_leaderboard_id;

  IF NOT found THEN
    RAISE EXCEPTION 'LEADERBOARD_NOT_FOUND';
  END IF;

  DELETE FROM public.leaderboard_entries
  WHERE leaderboard_id = p_leaderboard_id;

  WITH candidate_attempts AS (
    SELECT
      ea.id AS attempt_id,
      ea.user_id,
      coalesce(ea.total_score, 0)::numeric AS total_score,
      coalesce(ea.duration_used_seconds, 2147483647) AS duration_seconds,
      ea.submitted_at,
      row_number() OVER (PARTITION BY ea.user_id ORDER BY coalesce(ea.total_score, 0) DESC,
        coalesce(ea.duration_used_seconds, 2147483647) ASC,
        ea.submitted_at ASC nulls LAST,
        ea.id ASC) AS user_best_rank
    FROM
      public.exam_attempts ea
      JOIN public.exams e ON e.id = ea.exam_id
      JOIN public.exam_types et ON et.id = e.exam_type_id
    WHERE
      lower(ea.status) = 'completed'
      AND et.code = 'FULL_TRYOUT'
      AND (v_board.program_id IS NULL
        OR e.program_id = v_board.program_id)
      AND (v_board.track_id IS NULL
        OR e.track_id = v_board.track_id)
      AND ea.submitted_at IS NOT NULL
      AND ea.submitted_at >= v_board.starts_at
      AND ea.submitted_at <= v_board.ends_at
),
best_attempts AS (
  SELECT
    *
  FROM
    candidate_attempts
  WHERE
    user_best_rank = 1
),
subject_scores AS (
  SELECT
    ats.attempt_id,
    max(ats.raw_score) FILTER (WHERE s.code = 'TWK') AS score_twk,
  max(ats.raw_score) FILTER (WHERE s.code = 'TIU') AS score_tiu,
  max(ats.raw_score) FILTER (WHERE s.code = 'TKP') AS score_tkp
FROM
  public.attempt_scores ats
  LEFT JOIN public.subjects s ON s.id = ats.subject_id
  JOIN best_attempts ba ON ba.attempt_id = ats.attempt_id
GROUP BY
  ats.attempt_id
),
ranked AS (
  SELECT
    ba.*,
    coalesce(ss.score_twk, 0)::numeric AS score_twk,
    coalesce(ss.score_tiu, 0)::numeric AS score_tiu,
    coalesce(ss.score_tkp, 0)::numeric AS score_tkp,
    row_number() OVER (ORDER BY ba.total_score DESC,
      ba.duration_seconds ASC,
      ba.submitted_at ASC nulls LAST,
      ba.user_id ASC)::integer AS rank_pos
  FROM
    best_attempts ba
    LEFT JOIN subject_scores ss ON ss.attempt_id = ba.attempt_id)
INSERT INTO public.leaderboard_entries (leaderboard_id, user_id, score, rank, metadata, updated_at)
SELECT
  p_leaderboard_id,
  ranked.user_id,
  ranked.total_score,
  ranked.rank_pos,
  jsonb_build_object('attemptId', ranked.attempt_id, 'durationSeconds', ranked.duration_seconds, 'submittedAt', ranked.submitted_at, 'scoreTWK', ranked.score_twk, 'scoreTIU', ranked.score_tiu, 'scoreTKP', ranked.score_tkp),
  now()
FROM
  ranked;
END;
$function$
