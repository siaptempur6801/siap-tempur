-- TKA Diagnostic Baseline V1
-- Uses the existing exam engine while keeping diagnostic evidence separate
-- from long-term mastery, wrong-question, and remedial projections.
CREATE TABLE IF NOT EXISTS public.diagnostic_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  user_track_id uuid NOT NULL REFERENCES public.user_tracks (id) ON DELETE CASCADE,
  track_id uuid NOT NULL REFERENCES public.tracks (id) ON DELETE CASCADE,
  exam_id uuid NOT NULL REFERENCES public.exams (id) ON DELETE CASCADE,
  exam_attempt_id uuid NOT NULL UNIQUE REFERENCES public.exam_attempts (id) ON DELETE CASCADE,
  version text NOT NULL DEFAULT 'tka-smp-diagnostic-v1',
  overall_score numeric(6, 2) NOT NULL DEFAULT 0 CHECK (overall_score BETWEEN 0 AND 100),
  evidence_count integer NOT NULL DEFAULT 0 CHECK (evidence_count >= 0),
  recommended_subject_id uuid REFERENCES public.subjects (id) ON DELETE SET NULL,
  recommended_knowledge_node_id uuid REFERENCES public.knowledge_nodes (id) ON DELETE SET NULL,
  recommendation_reason text,
  completed_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_diagnostic_profiles_user_track_completed ON public.diagnostic_profiles (user_id, track_id, completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_diagnostic_profiles_recommendation ON public.diagnostic_profiles (user_id, recommended_knowledge_node_id)
WHERE
  recommended_knowledge_node_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.diagnostic_competency_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  diagnostic_profile_id uuid NOT NULL REFERENCES public.diagnostic_profiles (id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects (id) ON DELETE CASCADE,
  knowledge_node_id uuid NOT NULL REFERENCES public.knowledge_nodes (id) ON DELETE CASCADE,
  attempted_questions integer NOT NULL DEFAULT 0 CHECK (attempted_questions >= 0),
  correct_questions integer NOT NULL DEFAULT 0 CHECK (correct_questions >= 0 AND correct_questions <= attempted_questions),
  accuracy numeric(7, 6) NOT NULL DEFAULT 0 CHECK (accuracy BETWEEN 0 AND 1),
  baseline_score numeric(6, 2) NOT NULL DEFAULT 0 CHECK (baseline_score BETWEEN 0 AND 100),
  confidence numeric(7, 6) NOT NULL DEFAULT 0 CHECK (confidence BETWEEN 0 AND 1),
  strength_label text NOT NULL CHECK (strength_label IN ('KUAT', 'CUKUP', 'PERLU_DIKUATKAN')),
  priority_rank integer NOT NULL CHECK (priority_rank > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (diagnostic_profile_id, knowledge_node_id)
);

CREATE INDEX IF NOT EXISTS idx_diagnostic_competency_profile_priority ON public.diagnostic_competency_results (diagnostic_profile_id, priority_rank);

ALTER TABLE public.diagnostic_profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.diagnostic_competency_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS diagnostic_profiles_select_own ON public.diagnostic_profiles;

CREATE POLICY diagnostic_profiles_select_own ON public.diagnostic_profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid ());

DROP POLICY IF EXISTS diagnostic_competency_results_select_own ON public.diagnostic_competency_results;

CREATE POLICY diagnostic_competency_results_select_own ON public.diagnostic_competency_results
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT
      1
    FROM
      public.diagnostic_profiles dp
    WHERE
      dp.id = diagnostic_profile_id
      AND dp.user_id = auth.uid ()));

GRANT SELECT ON public.diagnostic_profiles TO authenticated;

GRANT SELECT ON public.diagnostic_competency_results TO authenticated;

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

  RETURN jsonb_build_object('applied', TRUE, 'profile_id', v_profile_id, 'attempt_id', p_attempt_id, 'track', 'TKA/SMP', 'version', 'tka-smp-diagnostic-v1', 'overall_score', greatest (0, least (100, coalesce(v_percentage, 0))), 'evidence_count', v_evidence_count, 'competency_count', v_competency_count, 'recommended_knowledge_node_id', v_recommended_node_id);
END;
$function$;

REVOKE ALL ON FUNCTION app_private.refresh_tka_smp_diagnostic_profile_for_user (uuid, uuid) FROM public, anon, authenticated;

-- Keep DIAGNOSTIC evidence separate from long-term mastery.
CREATE OR REPLACE FUNCTION app_private.refresh_tka_smp_learning_projection_for_user (p_user_id uuid, p_source_attempt_id uuid DEFAULT NULL)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $function$
DECLARE
  v_track_id uuid;
  v_source_track_id uuid;
  v_source_exam_type text;
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
      e.track_id,
      upper(et.code)
    INTO
      v_source_track_id,
      v_source_exam_type
    FROM
      public.exam_attempts ea
      JOIN public.exams e ON e.id = ea.exam_id
      JOIN public.exam_types et ON et.id = e.exam_type_id
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

    IF v_source_exam_type = 'DIAGNOSTIC' THEN
      RETURN jsonb_build_object('applied', FALSE, 'reason', 'DIAGNOSTIC_BASELINE_SEPARATE');
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
      JOIN public.exam_types et ON et.id = e.exam_type_id
      JOIN public.attempt_questions aq ON aq.attempt_id = ea.id
      JOIN public.question_knowledge_nodes qkn ON qkn.question_id = aq.question_id
        AND qkn.relation_type = 'primary'
    LEFT JOIN public.attempt_answers aa ON aa.attempt_question_id = aq.id
  WHERE
    ea.user_id = p_user_id
    AND e.track_id = v_track_id
    AND lower(ea.status) = 'completed'
    AND upper(et.code) <> 'DIAGNOSTIC'
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
      JOIN public.exam_types et ON et.id = e.exam_type_id
    WHERE
      ea.user_id = p_user_id
      AND e.track_id = v_track_id
      AND lower(ea.status) = 'completed'
      AND ats.subject_id IS NOT NULL
      AND upper(et.code) <> 'DIAGNOSTIC'
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

-- Branch submit behavior by exam type. Diagnostic submissions materialize
-- a baseline only and deliberately skip normal learning/wrong/remedial projections.
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
  v_exam_type_code text;
  v_projection jsonb;
  v_wrong_state jsonb;
  v_remedial jsonb;
  v_diagnostic jsonb;
BEGIN
  SELECT
    ea.started_at,
    upper(et.code)
  INTO
    v_started,
    v_exam_type_code
  FROM
    public.exam_attempts ea
    JOIN public.exams e ON e.id = ea.exam_id
    JOIN public.exam_types et ON et.id = e.exam_type_id
  WHERE
    ea.id = p_attempt_id
    AND ea.user_id = p_user_id
    AND ea.status = 'in_progress'
  FOR UPDATE
    OF ea;

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

  IF v_exam_type_code = 'DIAGNOSTIC' THEN
    v_diagnostic := app_private.refresh_tka_smp_diagnostic_profile_for_user (p_user_id, p_attempt_id);
    v_projection := jsonb_build_object('applied', FALSE, 'reason', 'DIAGNOSTIC_BASELINE_SEPARATE');
    v_wrong_state := jsonb_build_object('applied', FALSE, 'reason', 'DIAGNOSTIC_BASELINE_SEPARATE');
    v_remedial := jsonb_build_object('applied', FALSE, 'reason', 'DIAGNOSTIC_BASELINE_SEPARATE');

    INSERT INTO public.attempt_events (attempt_id, event_type, metadata)
      VALUES (p_attempt_id, 'diagnostic_profile_refreshed', v_diagnostic);
  ELSE
    v_projection := app_private.refresh_tka_smp_learning_projection_for_user (p_user_id, p_attempt_id);
    v_wrong_state := app_private.refresh_tka_smp_wrong_question_state_for_user (p_user_id, p_attempt_id);
    v_remedial := app_private.refresh_tka_smp_remedial_session_for_attempt (p_user_id, p_attempt_id, 10);
  END IF;

INSERT INTO public.attempt_events (attempt_id, event_type, metadata)
  VALUES (p_attempt_id, 'learning_projection_refreshed', v_projection);

INSERT INTO public.attempt_events (attempt_id, event_type, metadata)
  VALUES (p_attempt_id, 'wrong_question_state_refreshed', v_wrong_state);

INSERT INTO public.attempt_events (attempt_id, event_type, metadata)
  VALUES (p_attempt_id, 'automatic_remedial_refreshed', v_remedial);

  RETURN jsonb_build_object('attempt_id', p_attempt_id, 'status', 'completed', 'raw_score', (v_score ->> 'raw_score')::numeric, 'percentage', (v_score ->> 'percentage')::numeric, 'duration_used_seconds', v_duration, 'exam_type', v_exam_type_code, 'learning_projection', v_projection, 'wrong_question_state', v_wrong_state, 'automatic_remedial', v_remedial, 'diagnostic_profile', v_diagnostic);
END;
$function$;

REVOKE ALL ON FUNCTION app_private.submit_exam_attempt_for_user (uuid, uuid) FROM public, anon, authenticated;

-- Seed the frozen TKA SMP diagnostic package as DRAFT.
-- Production activation is intentionally a separate release step after the
-- selected question versions are published.
DO $seed$
DECLARE
  v_program_id uuid;
  v_track_id uuid;
  v_exam_type_id uuid;
  v_blueprint_id uuid;
  v_exam_id uuid;
  v_bin_subject_id uuid;
  v_mat_subject_id uuid;
  v_bin_section_id uuid;
  v_mat_section_id uuid;
  v_created_by uuid;
  v_item_count integer;
BEGIN
  SELECT
    p.id,
    t.id
  INTO
    v_program_id,
    v_track_id
  FROM
    public.programs p
    JOIN public.tracks t ON t.program_id = p.id
  WHERE
    upper(p.code) = 'TKA'
    AND upper(t.code) = 'SMP'
  LIMIT 1;

  SELECT
    id
  INTO
    v_exam_type_id
  FROM
    public.exam_types
  WHERE
    upper(code) = 'DIAGNOSTIC'
  LIMIT 1;

  SELECT
    eb.id
  INTO
    v_blueprint_id
  FROM
    public.exam_blueprints eb
  WHERE
    eb.track_id = v_track_id
    AND lower(eb.status) = 'active'
  ORDER BY
    eb.updated_at DESC nulls LAST,
    eb.created_at DESC
  LIMIT 1;

  SELECT
    id
  INTO
    v_bin_subject_id
  FROM
    public.subjects
  WHERE
    track_id = v_track_id
    AND upper(code) = 'BIN'
  LIMIT 1;

  SELECT
    id
  INTO
    v_mat_subject_id
  FROM
    public.subjects
  WHERE
    track_id = v_track_id
    AND upper(code) = 'MAT'
  LIMIT 1;

  SELECT
    created_by
  INTO
    v_created_by
  FROM
    public.exams
  WHERE
    track_id = v_track_id
    AND created_by IS NOT NULL
  ORDER BY
    (slug = 'tka-smp-full') DESC,
    created_at ASC
  LIMIT 1;

  IF v_program_id IS NULL OR v_track_id IS NULL OR v_exam_type_id IS NULL OR v_bin_subject_id IS NULL OR v_mat_subject_id IS NULL OR v_created_by IS NULL THEN
    RAISE EXCEPTION 'TKA SMP diagnostic prerequisites are incomplete';
  END IF;

  INSERT INTO public.exams (program_id, track_id, exam_type_id, blueprint_id, title, slug, description, duration_seconds, attempt_limit, question_order, result_visibility, access_type, status, required_feature_id, token_cost, created_by, created_at, updated_at)
    VALUES (v_program_id, v_track_id, v_exam_type_id, v_blueprint_id, 'Tes Diagnostik Awal TKA SMP', 'tka-smp-diagnostic-awal', 'Pemetaan awal 7 kompetensi utama TKA SMP untuk menentukan fokus belajar personal.', 2100, 1, 'randomized', 'instant', 'FREE', 'draft', NULL, 0, v_created_by, now(), now())
  ON CONFLICT (slug)
    DO UPDATE SET
      program_id = excluded.program_id,
      track_id = excluded.track_id,
      exam_type_id = excluded.exam_type_id,
      blueprint_id = excluded.blueprint_id,
      title = excluded.title,
      description = excluded.description,
      duration_seconds = excluded.duration_seconds,
      attempt_limit = excluded.attempt_limit,
      question_order = excluded.question_order,
      result_visibility = excluded.result_visibility,
      access_type = excluded.access_type,
      status = CASE WHEN lower(public.exams.status) = 'active' THEN
        public.exams.status
      ELSE
        excluded.status
      END,
      required_feature_id = NULL,
      token_cost = 0,
      updated_at = now()
    RETURNING
      id
    INTO
      v_exam_id;

  DELETE FROM public.exam_question_items
  WHERE exam_id = v_exam_id;
  DELETE FROM public.exam_sections
  WHERE exam_id = v_exam_id;

  INSERT INTO public.exam_sections (exam_id, subject_id, title, sort_order, question_count, duration_seconds, config)
    VALUES (v_exam_id, v_bin_subject_id, 'Bahasa Indonesia', 1, 12, 900, jsonb_build_object('mode', 'diagnostic', 'version', 'v1', 'competencies', 3))
  RETURNING
    id
  INTO
    v_bin_section_id;

  INSERT INTO public.exam_sections (exam_id, subject_id, title, sort_order, question_count, duration_seconds, config)
    VALUES (v_exam_id, v_mat_subject_id, 'Matematika', 2, 16, 1200, jsonb_build_object('mode', 'diagnostic', 'version', 'v1', 'competencies', 4))
  RETURNING
    id
  INTO
    v_mat_section_id;

  WITH question_primary AS (
    SELECT
      q.id AS question_id,
      q.question_code,
      q.version AS question_version,
      lower(q.difficulty) AS difficulty,
      s.code AS subject_code,
      qkn.knowledge_node_id AS primary_node_id
    FROM
      public.questions q
      JOIN public.subjects s ON s.id = q.subject_id
      JOIN public.question_knowledge_nodes qkn ON qkn.question_id = q.id
        AND lower(qkn.relation_type) = 'primary'
      JOIN public.question_versions qv ON qv.question_id = q.id
        AND qv.version = q.version
    WHERE
      q.program_id = v_program_id
      AND q.track_id = v_track_id
      AND lower(q.status) IN ('approved', 'published')
      AND lower(q.difficulty) IN ('easy', 'medium', 'hard')
),
mapped AS (
  SELECT
    qp.*,
    competency.code AS competency_code
  FROM
    question_primary qp
    JOIN LATERAL (
      SELECT
        anc.code
      FROM
        public.knowledge_node_paths knp
        JOIN public.knowledge_nodes anc ON anc.id = knp.ancestor_id
      WHERE
        knp.descendant_id = qp.primary_node_id
        AND ((upper(qp.subject_code) = 'BIN'
            AND lower(anc.node_type) = 'competency')
          OR (upper(qp.subject_code) = 'MAT'
            AND lower(anc.node_type) = 'element'))
      ORDER BY
        knp.depth ASC,
        anc.sort_order ASC,
        anc.id
      LIMIT 1) competency ON TRUE
),
difficulty_ranked AS (
  SELECT
    m.*,
    row_number() OVER (PARTITION BY m.competency_code,
      m.difficulty ORDER BY md5('tka-smp-diagnostic-v1:' || m.question_code),
      m.question_code) AS difficulty_rank
  FROM
    mapped m
),
chosen AS (
  SELECT
    *
  FROM
    difficulty_ranked
  WHERE (difficulty = 'easy'
    AND difficulty_rank <= 1)
  OR (difficulty = 'medium'
    AND difficulty_rank <= 1)
  OR (difficulty = 'hard'
    AND difficulty_rank <= 2)
),
positioned AS (
  SELECT
    c.*,
    row_number() OVER (ORDER BY CASE WHEN upper(c.subject_code) = 'BIN' THEN
        1
      ELSE
        2
      END,
      c.competency_code,
      CASE c.difficulty
      WHEN 'easy' THEN
        1
      WHEN 'medium' THEN
        2
      ELSE
        3
      END,
      c.question_code)::integer AS position
  FROM
    chosen c)
INSERT INTO public.exam_question_items (exam_id, section_id, question_id, question_version, position, score_weight)
SELECT
  v_exam_id,
  CASE WHEN upper(p.subject_code) = 'BIN' THEN
    v_bin_section_id
  ELSE
    v_mat_section_id
  END,
  p.question_id,
  p.question_version,
  p.position,
  1
FROM
  positioned p;

    SELECT
      count(*)::integer
    INTO
      v_item_count
    FROM
      public.exam_question_items
    WHERE
      exam_id = v_exam_id;

    IF v_item_count <> 28 THEN
      RAISE EXCEPTION 'TKA SMP diagnostic requires exactly 28 frozen items, got %', v_item_count;
    END IF;

    IF (
      SELECT
        count(*)
      FROM
        public.exam_question_items
      WHERE
        exam_id = v_exam_id AND section_id = v_bin_section_id) <> 12 THEN
      RAISE EXCEPTION 'TKA SMP diagnostic Bahasa Indonesia section must contain 12 items';
    END IF;

    IF (
      SELECT
        count(*)
      FROM
        public.exam_question_items
      WHERE
        exam_id = v_exam_id AND section_id = v_mat_section_id) <> 16 THEN
      RAISE EXCEPTION 'TKA SMP diagnostic Matematika section must contain 16 items';
    END IF;
END;
$seed$;
