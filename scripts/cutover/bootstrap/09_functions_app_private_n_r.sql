-- Generated from canonical staging lpgrivowdcepcxradavu via pg_get_functiondef().
-- Runtime app_private functions N-R. CPNS migration-only helpers are excluded.
-- DO NOT apply to production before explicit final GO.
CREATE OR REPLACE FUNCTION app_private.publish_question (p_question_id uuid)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_actor uuid := auth.uid ();
  v_q public.questions%rowtype;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF NOT app_private.current_user_has_permission ('content.publish') THEN
    RAISE EXCEPTION 'Content publish permission required';
  END IF;

  SELECT
    *
  INTO
    v_q
  FROM
    public.questions
  WHERE
    id = p_question_id
  FOR UPDATE;
  IF NOT found THEN
    RAISE EXCEPTION 'Question not found';
  END IF;
  IF v_q.status <> 'approved' THEN
    RAISE EXCEPTION 'Only approved questions can be published';
  END IF;
  IF EXISTS (
    SELECT
      1
    FROM
      public.content_reviews
    WHERE
      entity_type = 'question'
      AND entity_id = p_question_id
      AND status = 'pending') THEN
  RAISE EXCEPTION 'Pending review still exists';
END IF;

  PERFORM
    set_config('app.workflow_action', 'publish', TRUE);
  UPDATE
    public.questions
  SET
    status = 'published',
    reviewer_id = NULL,
    published_at = now(),
    updated_at = now()
  WHERE
    id = p_question_id;

  RETURN jsonb_build_object('question_id', p_question_id, 'status', 'published', 'question_version', v_q.version);
END;
$function$ CREATE OR REPLACE FUNCTION app_private.question_snapshot_json (p_question_id uuid)
  RETURNS jsonb
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  SELECT
    jsonb_build_object('question', jsonb_build_object('question_code', q.question_code, 'program_id', q.program_id, 'track_id', q.track_id, 'subject_id', q.subject_id, 'question_type', q.question_type, 'stem', q.stem, 'difficulty', q.difficulty, 'cognitive_level', q.cognitive_level, 'source_type', q.source_type, 'source_reference', q.source_reference, 'estimated_seconds', q.estimated_seconds, 'stimulus_id', q.stimulus_id, 'stimulus_order', q.stimulus_order, 'response_config', q.response_config), 'options', coalesce((
        SELECT
          jsonb_agg(jsonb_build_object('option_key', o.option_key, 'content', o.content, 'is_correct', o.is_correct, 'score', o.score, 'sort_order', o.sort_order, 'image_url', o.image_url, 'response_group', o.response_group, 'response_group_order', o.response_group_order, 'metadata', o.metadata)
        ORDER BY o.sort_order, o.option_key)
        FROM public.question_options o
        WHERE
          o.question_id = q.id), '[]'::jsonb), 'explanations', coalesce((
        SELECT
          jsonb_agg(jsonb_build_object('content', e.content, 'format', e.format, 'video_url', e.video_url, 'version', e.version)
          ORDER BY e.version, e.created_at)
        FROM public.question_explanations e
        WHERE
          e.question_id = q.id), '[]'::jsonb), 'knowledge_nodes', coalesce((
        SELECT
          jsonb_agg(jsonb_build_object('knowledge_node_id', qkn.knowledge_node_id, 'relation_type', qkn.relation_type)
          ORDER BY qkn.relation_type, qkn.knowledge_node_id)
        FROM public.question_knowledge_nodes qkn
      WHERE
        qkn.question_id = q.id), '[]'::jsonb), 'stimulus', CASE WHEN q.stimulus_id IS NULL THEN
      NULL
    ELSE
      (
        SELECT
          jsonb_build_object('stimulus_code', s.stimulus_code, 'title', s.title, 'content', s.content, 'image_url', s.image_url, 'source_reference', s.source_reference, 'metadata', s.metadata)
        FROM public.question_stimuli s
      WHERE
        s.id = q.stimulus_id)
    END)
  FROM
    public.questions q
  WHERE
    q.id = p_question_id;
$function$ CREATE OR REPLACE FUNCTION app_private.refresh_tka_smp_learning_projection_for_user (p_user_id uuid, p_source_attempt_id uuid DEFAULT NULL::uuid)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
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
$function$ CREATE OR REPLACE FUNCTION app_private.refresh_tka_smp_learning_recommendations_for_user (p_user_id uuid)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_track_id uuid;
  v_user_track_id uuid;
  v_active_count integer := 0;
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
    UPDATE
      public.learning_recommendations lr
    SET
      status = 'inactive',
      expires_at = coalesce(lr.expires_at, now())
    WHERE
      lr.user_id = p_user_id
      AND lr.track_id = v_track_id
      AND lr.recommendation_type = 'weakest_topic_v1'
      AND lr.status = 'active';
    RETURN jsonb_build_object('applied', FALSE, 'reason', 'ACTIVE_USER_TRACK_NOT_FOUND');
  END IF;
  UPDATE
    public.learning_recommendations lr
  SET
    status = 'inactive',
    expires_at = coalesce(lr.expires_at, now())
  WHERE
    lr.user_id = p_user_id
    AND lr.track_id = v_track_id
    AND lr.recommendation_type = 'weakest_topic_v1'
    AND lr.status = 'active';
  WITH ranked AS (
    SELECT
      ukp.knowledge_node_id,
      row_number() OVER (ORDER BY ukp.mastery_score ASC,
        ukp.attempted_questions DESC,
        ukp.accuracy ASC,
        ukp.knowledge_node_id)::integer priority,
      round(greatest (0::numeric, 1::numeric - ukp.mastery_score), 6) weakness_score
    FROM public.user_knowledge_progress ukp
    JOIN public.knowledge_nodes kn ON kn.id = ukp.knowledge_node_id
    JOIN public.subjects s ON s.id = kn.subject_id
  WHERE ukp.user_id = p_user_id
    AND ukp.user_track_id = v_user_track_id
    AND s.track_id = v_track_id
    AND ukp.attempted_questions > 0
    AND ukp.mastery_score < 0.85
    AND lower(kn.status) = 'active'
    AND lower(s.status) = 'active' ORDER BY ukp.mastery_score ASC,
    ukp.attempted_questions DESC,
    ukp.accuracy ASC,
    ukp.knowledge_node_id
  LIMIT 3)
INSERT INTO public.learning_recommendations (user_id, track_id, recommendation_type, knowledge_node_id, resource_id, reason_code, priority, score, status, expires_at)
SELECT
  p_user_id,
  v_track_id,
  'weakest_topic_v1',
  r.knowledge_node_id,
  NULL,
  'weakest_mastery_v1',
  r.priority,
  r.weakness_score,
  'active',
  NULL
FROM
  ranked r
ON CONFLICT (user_id,
  track_id,
  recommendation_type,
  knowledge_node_id)
  DO UPDATE SET
    reason_code = excluded.reason_code,
    priority = excluded.priority,
    score = excluded.score,
    status = 'active',
    expires_at = NULL;
  SELECT
    count(*)::integer
  INTO
    v_active_count
  FROM
    public.learning_recommendations lr
  WHERE
    lr.user_id = p_user_id
    AND lr.track_id = v_track_id
    AND lr.recommendation_type = 'weakest_topic_v1'
    AND lr.status = 'active';
  RETURN jsonb_build_object('applied', TRUE, 'track', 'TKA/SMP', 'active_recommendations', v_active_count, 'max_recommendations', 3, 'rule', 'mastery_asc_evidence_desc_accuracy_asc_v1');
END;
$function$ CREATE OR REPLACE FUNCTION app_private.refresh_tka_smp_readiness_for_user (p_user_id uuid)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_track_id uuid;
  v_user_track_id uuid;
  v_readiness numeric := 0;
  v_confidence numeric := 0;
  v_subject_count integer := 0;
  v_row public.user_readiness%rowtype;
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
    DELETE FROM public.user_readiness ur
    WHERE ur.user_id = p_user_id
      AND ur.track_id = v_track_id
      AND ur.calculation_version = 'tka_smp_readiness_v1';
    RETURN jsonb_build_object('applied', FALSE, 'reason', 'ACTIVE_USER_TRACK_NOT_FOUND');
  END IF;
  WITH assessable AS (
    SELECT DISTINCT
      kn.id knowledge_node_id,
      s.id subject_id
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
    avg(coalesce(ukp.mastery_score, 0::numeric)) subject_readiness,
    avg(least (1::numeric, coalesce(ukp.attempted_questions, 0)::numeric / 5::numeric)) subject_confidence
  FROM
    assessable a
    LEFT JOIN public.user_knowledge_progress ukp ON ukp.user_id = p_user_id
      AND ukp.user_track_id = v_user_track_id
      AND ukp.knowledge_node_id = a.knowledge_node_id
  GROUP BY
    a.subject_id
)
SELECT
  count(*)::integer,
  coalesce(round(0.75::numeric * avg(sm.subject_readiness) + 0.25::numeric * min(sm.subject_readiness), 6), 0::numeric),
  coalesce(round(avg(sm.subject_confidence), 6), 0::numeric)
INTO
  v_subject_count,
  v_readiness,
  v_confidence
FROM
  subject_metrics sm;
  IF v_subject_count = 0 THEN
    DELETE FROM public.user_readiness ur
    WHERE ur.user_id = p_user_id
      AND ur.track_id = v_track_id
      AND ur.calculation_version = 'tka_smp_readiness_v1';
    RETURN jsonb_build_object('applied', FALSE, 'reason', 'NO_ASSESSABLE_SUBJECTS');
  END IF;
INSERT INTO public.user_readiness (user_id, track_id, readiness_score, confidence_score, calculation_version, calculated_at)
  VALUES (p_user_id, v_track_id, greatest (0::numeric, least (1::numeric, v_readiness)), greatest (0::numeric, least (1::numeric, v_confidence)), 'tka_smp_readiness_v1', now())
ON CONFLICT (user_id, track_id, calculation_version)
  DO UPDATE SET
    readiness_score = excluded.readiness_score,
    confidence_score = excluded.confidence_score,
    calculated_at = excluded.calculated_at
  WHERE
    public.user_readiness.readiness_score IS DISTINCT FROM excluded.readiness_score
    OR public.user_readiness.confidence_score IS DISTINCT FROM excluded.confidence_score;
  SELECT
    ur.*
  INTO
    v_row
  FROM
    public.user_readiness ur
  WHERE
    ur.user_id = p_user_id
    AND ur.track_id = v_track_id
    AND ur.calculation_version = 'tka_smp_readiness_v1'
  LIMIT 1;
  RETURN jsonb_build_object('applied', TRUE, 'track', 'TKA/SMP', 'readiness_score', v_row.readiness_score, 'confidence_score', v_row.confidence_score, 'calculation_version', v_row.calculation_version, 'calculated_at', v_row.calculated_at, 'formula', '0.75_mean_subject_readiness_plus_0.25_weakest_subject_v1');
END;
$function$ CREATE OR REPLACE FUNCTION app_private.refresh_tka_smp_readiness_from_new_progress ()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_user_id uuid;
BEGIN
  FOR v_user_id IN SELECT DISTINCT
    nr.user_id
  FROM
    new_rows nr
  WHERE
    nr.user_id IS NOT NULL LOOP
      PERFORM
        app_private.refresh_tka_smp_readiness_for_user (v_user_id);
    END LOOP;
  RETURN NULL;
END;
$function$ CREATE OR REPLACE FUNCTION app_private.refresh_tka_smp_readiness_from_old_progress ()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_user_id uuid;
BEGIN
  FOR v_user_id IN SELECT DISTINCT
    orow.user_id
  FROM
    old_rows orow
  WHERE
    orow.user_id IS NOT NULL LOOP
      PERFORM
        app_private.refresh_tka_smp_readiness_for_user (v_user_id);
    END LOOP;
  RETURN NULL;
END;
$function$ CREATE OR REPLACE FUNCTION app_private.refresh_tka_smp_recommendations_from_new_progress ()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_user_id uuid;
BEGIN
  FOR v_user_id IN SELECT DISTINCT
    nr.user_id
  FROM
    new_rows nr
  WHERE
    nr.user_id IS NOT NULL LOOP
      PERFORM
        app_private.refresh_tka_smp_learning_recommendations_for_user (v_user_id);
    END LOOP;
  RETURN NULL;
END;
$function$ CREATE OR REPLACE FUNCTION app_private.refresh_tka_smp_recommendations_from_old_progress ()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_user_id uuid;
BEGIN
  FOR v_user_id IN SELECT DISTINCT
    orow.user_id
  FROM
    old_rows orow
  WHERE
    orow.user_id IS NOT NULL LOOP
      PERFORM
        app_private.refresh_tka_smp_learning_recommendations_for_user (v_user_id);
    END LOOP;
  RETURN NULL;
END;
$function$ CREATE OR REPLACE FUNCTION app_private.refresh_tka_smp_remedial_session_for_attempt (p_user_id uuid, p_source_attempt_id uuid, p_limit integer DEFAULT 10)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
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
      uwq.id user_wrong_question_id,
      uwq.knowledge_node_id,
      q.subject_id,
      coalesce(s.code, s.id::text) subject_order,
      aq.position attempt_position,
      CASE WHEN aa.id IS NULL THEN
        'source_attempt_unanswered'
      ELSE
        'source_attempt_wrong'
      END reason
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
      sg.question_id) subject_rank
  FROM source_gaps sg
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
      c.question_id)::integer remedial_position
  FROM chosen c)
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
$function$ CREATE OR REPLACE FUNCTION app_private.refresh_tka_smp_wrong_question_state_for_user (p_user_id uuid, p_source_attempt_id uuid DEFAULT NULL::uuid)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
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
      aq.id source_attempt_question_id,
      ea.id source_attempt_id,
      aq.question_snapshot,
      coalesce(ea.submitted_at, ea.updated_at, ea.created_at) occurred_at,
      CASE WHEN aa.id IS NULL THEN
        'unanswered'
      WHEN aa.is_correct IS TRUE THEN
        'correct'
      ELSE
        'wrong'
      END outcome,
      coalesce(aa.score_awarded, 0)::numeric score_awarded,
      1 evidence_priority
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
    uwq.last_source_attempt_id source_attempt_id,
    uwq.question_snapshot,
    wqr.created_at occurred_at,
    CASE WHEN wqr.is_correct THEN
      'correct'
    ELSE
      'wrong'
    END outcome,
    wqr.score_awarded,
    2 evidence_priority
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
    min(occurred_at) FILTER (WHERE outcome IN ('wrong', 'unanswered')) first_failed_at,
  max(occurred_at) FILTER (WHERE outcome IN ('wrong', 'unanswered')) last_failed_at,
  count(*) FILTER (WHERE outcome IN ('wrong', 'unanswered'))::integer failure_count,
  count(*) FILTER (WHERE outcome = 'wrong')::integer wrong_count,
  count(*) FILTER (WHERE outcome = 'unanswered')::integer unanswered_count
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
    max(wqr.created_at) last_reviewed_at
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
$function$ CREATE OR REPLACE FUNCTION app_private.review_question_stage (p_question_id uuid, p_decision text, p_notes text DEFAULT NULL::text)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_actor uuid := auth.uid ();
  v_q public.questions%rowtype;
  v_stage text;
  v_next_stage text;
  v_next_status text;
  v_review public.content_reviews%rowtype;
  v_review_status text;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF p_decision NOT IN ('approve', 'revision_required', 'reject') THEN
    RAISE EXCEPTION 'Invalid review decision';
  END IF;
  IF NOT app_private.current_user_has_permission ('content.review') THEN
    RAISE EXCEPTION 'Content review permission required';
  END IF;
  SELECT
    *
  INTO
    v_q
  FROM
    public.questions
  WHERE
    id = p_question_id
  FOR UPDATE;
  IF NOT found THEN
    RAISE EXCEPTION 'Question not found';
  END IF;
  IF v_actor = v_q.author_id THEN
    RAISE EXCEPTION 'Author cannot review their own question';
  END IF;
  IF v_q.reviewer_id IS DISTINCT FROM v_actor THEN
    RAISE EXCEPTION 'Question is not assigned to current reviewer';
  END IF;
  v_stage := CASE v_q.status
  WHEN 'editorial_review' THEN
    'editorial'
  WHEN 'academic_review' THEN
    'academic'
  WHEN 'technical_qa' THEN
    'technical_qa'
  ELSE
    NULL
  END;
  IF v_stage IS NULL THEN
    RAISE EXCEPTION 'Question is not in an active review stage';
  END IF;
  SELECT
    *
  INTO
    v_review
  FROM
    public.content_reviews
  WHERE
    entity_type = 'question'
    AND entity_id = p_question_id
    AND review_stage = v_stage
    AND status = 'pending'
    AND reviewer_id = v_actor
  ORDER BY
    review_round DESC,
    created_at DESC
  LIMIT 1
  FOR UPDATE;
  IF NOT found THEN
    RAISE EXCEPTION 'No pending assigned review found';
  END IF;
  v_review_status := CASE p_decision
  WHEN 'approve' THEN
    'approved'
  WHEN 'revision_required' THEN
    'revision_required'
  ELSE
    'rejected'
  END;
  UPDATE
    public.content_reviews
  SET
    status = v_review_status,
    notes = p_notes,
    started_at = coalesce(started_at, now()),
    completed_at = now(),
    updated_at = now()
  WHERE
    id = v_review.id;
  IF p_decision = 'approve' THEN
    IF v_stage = 'editorial' THEN
      v_next_stage := 'academic';
      v_next_status := 'academic_review';
    ELSIF v_stage = 'academic' THEN
      v_next_stage := 'technical_qa';
      v_next_status := 'technical_qa';
    ELSE
      v_next_stage := NULL;
      v_next_status := 'approved';
    END IF;
  ELSIF p_decision = 'revision_required' THEN
    v_next_stage := NULL;
    v_next_status := 'revision_required';
  ELSE
    v_next_stage := NULL;
    v_next_status := 'rejected';
  END IF;
  PERFORM
    set_config('app.workflow_action', 'review_decision', TRUE);
  UPDATE
    public.questions
  SET
    status = v_next_status,
    reviewer_id = NULL,
    updated_at = now()
  WHERE
    id = p_question_id;
  IF v_next_stage IS NOT NULL THEN
    INSERT INTO public.content_reviews (entity_type, entity_id, reviewer_id, status, review_stage, question_version, review_round, created_at, updated_at)
      VALUES ('question', p_question_id, NULL, 'pending', v_next_stage, v_q.version, v_review.review_round, now(), now());
  END IF;
  RETURN jsonb_build_object('question_id', p_question_id, 'decision', p_decision, 'completed_stage', v_stage, 'next_stage', v_next_stage, 'status', v_next_status, 'question_version', v_q.version, 'review_round', v_review.review_round);
END;
$function$ CREATE OR REPLACE FUNCTION app_private.review_tka_smp_remedial_item_for_user (p_user_id uuid, p_session_id uuid, p_item_id uuid, p_option_ids uuid[])
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
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
    coalesce(explanation_row ->> 'content', '') into v_explanation from jsonb_array_elements(coalesce(v_wrong.question_snapshot->'explanations','[]'::jsonb)) explanation_row where coalesce(explanation_row->>'content','') <> ''
  LIMIT 1;
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
$function$ CREATE OR REPLACE FUNCTION app_private.review_wrong_question_for_user (p_user_id uuid, p_wrong_question_id uuid, p_option_ids uuid[])
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
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
    coalesce(explanation_row ->> 'content', '') into v_explanation from jsonb_array_elements(coalesce(v_row.question_snapshot->'explanations','[]'::jsonb)) explanation_row where coalesce(explanation_row->>'content','') <> ''
  LIMIT 1;
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
$function$
