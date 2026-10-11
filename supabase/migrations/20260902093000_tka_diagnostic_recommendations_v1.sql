-- TKA Diagnostic Recommendations V1
-- Materialize the first personalized actions into the existing generic
-- learning_recommendations table, then retire them once real mastery evidence exists.
CREATE OR REPLACE FUNCTION app_private.refresh_tka_smp_diagnostic_recommendations_for_user (p_user_id uuid, p_diagnostic_profile_id uuid)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $function$
DECLARE
  v_track_id uuid;
  v_inserted integer := 0;
BEGIN
  SELECT
    dp.track_id
  INTO
    v_track_id
  FROM
    public.diagnostic_profiles dp
  WHERE
    dp.id = p_diagnostic_profile_id
    AND dp.user_id = p_user_id;

  IF v_track_id IS NULL THEN
    RETURN jsonb_build_object('applied', FALSE, 'reason', 'DIAGNOSTIC_PROFILE_NOT_FOUND');
  END IF;

  UPDATE
    public.learning_recommendations lr
  SET
    status = 'inactive',
    expires_at = coalesce(lr.expires_at, now())
  WHERE
    lr.user_id = p_user_id
    AND lr.track_id = v_track_id
    AND lr.recommendation_type = 'diagnostic_baseline_v1'
    AND lr.status = 'active';

  WITH ranked AS (
    SELECT
      dcr.knowledge_node_id,
      dcr.subject_id,
      dcr.priority_rank,
      dcr.baseline_score,
      CASE WHEN upper(s.code) = 'BIN' THEN
        'tka-smp-mini-bahasa-indonesia'
      WHEN upper(s.code) = 'MAT' THEN
        'tka-smp-mini-matematika'
      ELSE
        NULL
      END AS resource_slug
    FROM
      public.diagnostic_competency_results dcr
      JOIN public.subjects s ON s.id = dcr.subject_id
    WHERE
      dcr.diagnostic_profile_id = p_diagnostic_profile_id
    ORDER BY
      dcr.priority_rank
    LIMIT 3
),
resources AS (
  SELECT
    r.*,
    e.id AS resource_id
  FROM
    ranked r
    LEFT JOIN public.exams e ON e.slug = r.resource_slug)
INSERT INTO public.learning_recommendations (user_id, track_id, recommendation_type, knowledge_node_id, resource_id, reason_code, priority, score, status, expires_at)
SELECT
  p_user_id,
  v_track_id,
  'diagnostic_baseline_v1',
  r.knowledge_node_id,
  r.resource_id,
  'diagnostic_weakness_v1',
  r.priority_rank,
  round(greatest (0::numeric, 1::numeric - (r.baseline_score / 100::numeric)), 6),
  'active',
  NULL
FROM
  resources r
ON CONFLICT (user_id,
  track_id,
  recommendation_type,
  knowledge_node_id)
  DO UPDATE SET
    resource_id = excluded.resource_id,
    reason_code = excluded.reason_code,
    priority = excluded.priority,
    score = excluded.score,
    status = 'active',
    expires_at = NULL;

  get diagnostics v_inserted = row_count;

  RETURN jsonb_build_object('applied', TRUE, 'track', 'TKA/SMP', 'profile_id', p_diagnostic_profile_id, 'active_recommendations', v_inserted, 'max_recommendations', 3, 'rule', 'diagnostic_baseline_asc_v1');
END;
$function$;

REVOKE ALL ON FUNCTION app_private.refresh_tka_smp_diagnostic_recommendations_for_user (uuid, uuid) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION app_private.refresh_tka_smp_learning_recommendations_for_user (p_user_id uuid)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
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
      AND lr.recommendation_type IN ('weakest_topic_v1', 'diagnostic_baseline_v1')
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
        ukp.knowledge_node_id)::integer AS priority,
      round(greatest (0::numeric, 1::numeric - ukp.mastery_score), 6) AS weakness_score
    FROM
      public.user_knowledge_progress ukp
      JOIN public.knowledge_nodes kn ON kn.id = ukp.knowledge_node_id
      JOIN public.subjects s ON s.id = kn.subject_id
    WHERE
      ukp.user_id = p_user_id
      AND ukp.user_track_id = v_user_track_id
      AND s.track_id = v_track_id
      AND ukp.attempted_questions > 0
      AND ukp.mastery_score < 0.85
      AND lower(kn.status) = 'active'
      AND lower(s.status) = 'active'
    ORDER BY
      ukp.mastery_score ASC,
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

  IF v_active_count > 0 THEN
    UPDATE
      public.learning_recommendations lr
    SET
      status = 'inactive',
      expires_at = coalesce(lr.expires_at, now())
    WHERE
      lr.user_id = p_user_id
      AND lr.track_id = v_track_id
      AND lr.recommendation_type = 'diagnostic_baseline_v1'
      AND lr.status = 'active';
  END IF;

  RETURN jsonb_build_object('applied', TRUE, 'track', 'TKA/SMP', 'active_recommendations', v_active_count, 'max_recommendations', 3, 'rule', 'mastery_asc_evidence_desc_accuracy_asc_v1', 'diagnostic_recommendations_retired', v_active_count > 0);
END;
$function$;

REVOKE ALL ON FUNCTION app_private.refresh_tka_smp_learning_recommendations_for_user (uuid) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION app_private.refresh_tka_smp_diagnostic_profile_for_user (p_user_id uuid, p_attempt_id uuid)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $function$
DECLARE
  v_exam_id uuid;
  v_track_id uuid;
  v_user_track_id uuid;
  v_percentage numeric;
  v_submitted_at timestamptz;
  v_profile_id uuid;
  v_evidence_count integer := 0;
  v_competency_count integer := 0;
  v_recommended_subject_id uuid;
  v_recommended_node_id uuid;
  v_recommended_name text;
  v_recommendations jsonb;
BEGIN
  SELECT
    ea.exam_id,
    e.track_id,
    coalesce(ea.percentage, 0),
    coalesce(ea.submitted_at, ea.updated_at, ea.created_at)
  INTO
    v_exam_id,
    v_track_id,
    v_percentage,
    v_submitted_at
  FROM
    public.exam_attempts ea
    JOIN public.exams e ON e.id = ea.exam_id
    JOIN public.exam_types et ON et.id = e.exam_type_id
    JOIN public.tracks t ON t.id = e.track_id
    JOIN public.programs p ON p.id = t.program_id
  WHERE
    ea.id = p_attempt_id
    AND ea.user_id = p_user_id
    AND lower(ea.status) = 'completed'
    AND upper(et.code) = 'DIAGNOSTIC'
    AND upper(p.code) = 'TKA'
    AND upper(t.code) = 'SMP';

  IF v_exam_id IS NULL THEN
    RETURN jsonb_build_object('applied', FALSE, 'reason', 'COMPLETED_TKA_SMP_DIAGNOSTIC_ATTEMPT_NOT_FOUND');
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

  SELECT
    count(*)::integer
  INTO
    v_evidence_count
  FROM
    public.attempt_questions aq
  WHERE
    aq.attempt_id = p_attempt_id;

  INSERT INTO public.diagnostic_profiles (user_id, user_track_id, track_id, exam_id, exam_attempt_id, version, overall_score, evidence_count, completed_at, updated_at)
    VALUES (p_user_id, v_user_track_id, v_track_id, v_exam_id, p_attempt_id, 'tka-smp-diagnostic-v1', greatest (0, least (100, coalesce(v_percentage, 0))), v_evidence_count, v_submitted_at, now())
  ON CONFLICT (exam_attempt_id)
    DO UPDATE SET
      user_track_id = excluded.user_track_id,
      track_id = excluded.track_id,
      exam_id = excluded.exam_id,
      version = excluded.version,
      overall_score = excluded.overall_score,
      evidence_count = excluded.evidence_count,
      completed_at = excluded.completed_at,
      updated_at = now()
    RETURNING
      id
    INTO
      v_profile_id;

  DELETE FROM public.diagnostic_competency_results
  WHERE diagnostic_profile_id = v_profile_id;

  WITH evidence AS (
    SELECT
      aq.question_id,
      q.subject_id,
      s.code AS subject_code,
      qkn.knowledge_node_id AS primary_node_id,
      coalesce(aa.is_correct, FALSE) AS is_correct
    FROM
      public.attempt_questions aq
      JOIN public.questions q ON q.id = aq.question_id
      JOIN public.subjects s ON s.id = q.subject_id
      JOIN public.question_knowledge_nodes qkn ON qkn.question_id = q.id
        AND lower(qkn.relation_type) = 'primary'
    LEFT JOIN public.attempt_answers aa ON aa.attempt_question_id = aq.id
  WHERE
    aq.attempt_id = p_attempt_id
),
mapped AS (
  SELECT
    e.question_id,
    e.subject_id,
    e.subject_code,
    e.is_correct,
    competency.id AS knowledge_node_id,
    competency.name AS knowledge_name,
    competency.sort_order
  FROM
    evidence e
    JOIN LATERAL (
      SELECT
        anc.id,
        anc.name,
        anc.sort_order
      FROM
        public.knowledge_node_paths knp
        JOIN public.knowledge_nodes anc ON anc.id = knp.ancestor_id
      WHERE
        knp.descendant_id = e.primary_node_id
        AND ((upper(e.subject_code) = 'BIN'
            AND lower(anc.node_type) = 'competency')
          OR (upper(e.subject_code) = 'MAT'
            AND lower(anc.node_type) = 'element'))
      ORDER BY
        knp.depth ASC,
        anc.sort_order ASC,
        anc.id
      LIMIT 1) competency ON TRUE
),
aggregated AS (
  SELECT
    subject_id,
    subject_code,
    knowledge_node_id,
    max(knowledge_name) AS knowledge_name,
    max(sort_order) AS sort_order,
    count(*)::integer AS attempted_questions,
    count(*) FILTER (WHERE is_correct IS TRUE)::integer AS correct_questions
  FROM
    mapped
  GROUP BY
    subject_id,
    subject_code,
    knowledge_node_id
),
scored AS (
  SELECT
    a.*,
    round(a.correct_questions::numeric / nullif (a.attempted_questions, 0), 6) AS accuracy,
    round(a.correct_questions::numeric / nullif (a.attempted_questions, 0) * 100, 2) AS baseline_score,
    round(least (1::numeric, a.attempted_questions::numeric / 4::numeric), 6) AS confidence
  FROM
    aggregated a
),
ranked AS (
  SELECT
    s.*,
    row_number() OVER (ORDER BY s.baseline_score ASC,
      s.confidence DESC,
      s.subject_code,
      s.sort_order,
      s.knowledge_node_id)::integer AS priority_rank
  FROM
    scored s)
INSERT INTO public.diagnostic_competency_results (diagnostic_profile_id, subject_id, knowledge_node_id, attempted_questions, correct_questions, accuracy, baseline_score, confidence, strength_label, priority_rank)
SELECT
  v_profile_id,
  r.subject_id,
  r.knowledge_node_id,
  r.attempted_questions,
  r.correct_questions,
  coalesce(r.accuracy, 0),
  coalesce(r.baseline_score, 0),
  coalesce(r.confidence, 0),
  CASE WHEN coalesce(r.baseline_score, 0) >= 75 THEN
    'KUAT'
  WHEN coalesce(r.baseline_score, 0) >= 50 THEN
    'CUKUP'
  ELSE
    'PERLU_DIKUATKAN'
  END,
  r.priority_rank
FROM
  ranked r;

  get diagnostics v_competency_count = row_count;

  SELECT
    dcr.subject_id,
    dcr.knowledge_node_id,
    kn.name
  INTO
    v_recommended_subject_id,
    v_recommended_node_id,
    v_recommended_name
  FROM
    public.diagnostic_competency_results dcr
    JOIN public.knowledge_nodes kn ON kn.id = dcr.knowledge_node_id
  WHERE
    dcr.diagnostic_profile_id = v_profile_id
  ORDER BY
    dcr.priority_rank
  LIMIT 1;

  UPDATE
    public.diagnostic_profiles
  SET
    recommended_subject_id = v_recommended_subject_id,
    recommended_knowledge_node_id = v_recommended_node_id,
    recommendation_reason = CASE WHEN v_recommended_node_id IS NULL THEN
      'Belum ada kompetensi yang dapat dipetakan.'
    ELSE
      'Mulai dari kompetensi dengan baseline diagnostik terendah: ' || v_recommended_name || '.'
    END,
    updated_at = now()
  WHERE
    id = v_profile_id;

  v_recommendations := app_private.refresh_tka_smp_diagnostic_recommendations_for_user (p_user_id, v_profile_id);

  RETURN jsonb_build_object('applied', TRUE, 'profile_id', v_profile_id, 'attempt_id', p_attempt_id, 'track', 'TKA/SMP', 'version', 'tka-smp-diagnostic-v1', 'overall_score', greatest (0, least (100, coalesce(v_percentage, 0))), 'evidence_count', v_evidence_count, 'competency_count', v_competency_count, 'recommended_knowledge_node_id', v_recommended_node_id, 'learning_recommendations', v_recommendations);
END;
$function$;

REVOKE ALL ON FUNCTION app_private.refresh_tka_smp_diagnostic_profile_for_user (uuid, uuid) FROM public, anon, authenticated;
