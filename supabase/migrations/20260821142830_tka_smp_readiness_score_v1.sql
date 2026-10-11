CREATE UNIQUE INDEX IF NOT EXISTS user_readiness_user_track_version_uq ON public.user_readiness (user_id, track_id, calculation_version);

CREATE OR REPLACE FUNCTION app_private.refresh_tka_smp_readiness_for_user (p_user_id uuid)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $$
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
      kn.id AS knowledge_node_id,
      s.id AS subject_id
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
    avg(coalesce(ukp.mastery_score, 0::numeric)) AS subject_readiness,
    avg(least (1::numeric, coalesce(ukp.attempted_questions, 0)::numeric / 5::numeric)) AS subject_confidence
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
$$;

REVOKE ALL ON FUNCTION app_private.refresh_tka_smp_readiness_for_user (uuid) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION app_private.refresh_tka_smp_readiness_from_new_progress ()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $$
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
$$;

CREATE OR REPLACE FUNCTION app_private.refresh_tka_smp_readiness_from_old_progress ()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $$
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
$$;

REVOKE ALL ON FUNCTION app_private.refresh_tka_smp_readiness_from_new_progress () FROM public, anon, authenticated;

REVOKE ALL ON FUNCTION app_private.refresh_tka_smp_readiness_from_old_progress () FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS trg_tka_smp_readiness_after_progress_insert ON public.user_knowledge_progress;

CREATE TRIGGER trg_tka_smp_readiness_after_progress_insert
  AFTER INSERT ON public.user_knowledge_progress referencing new TABLE AS new_rows
  FOR EACH statement
  EXECUTE FUNCTION app_private.refresh_tka_smp_readiness_from_new_progress ();

DROP TRIGGER IF EXISTS trg_tka_smp_readiness_after_progress_update ON public.user_knowledge_progress;

CREATE TRIGGER trg_tka_smp_readiness_after_progress_update
  AFTER UPDATE ON public.user_knowledge_progress referencing new TABLE AS new_rows
  FOR EACH statement
  EXECUTE FUNCTION app_private.refresh_tka_smp_readiness_from_new_progress ();

DROP TRIGGER IF EXISTS trg_tka_smp_readiness_after_progress_delete ON public.user_knowledge_progress;

CREATE TRIGGER trg_tka_smp_readiness_after_progress_delete
  AFTER DELETE ON public.user_knowledge_progress referencing old TABLE AS old_rows
  FOR EACH statement
  EXECUTE FUNCTION app_private.refresh_tka_smp_readiness_from_old_progress ();

CREATE OR REPLACE FUNCTION public.get_tka_smp_readiness ()
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $$
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
$$;

REVOKE ALL ON FUNCTION public.get_tka_smp_readiness () FROM public;

REVOKE ALL ON FUNCTION public.get_tka_smp_readiness () FROM anon;

GRANT EXECUTE ON FUNCTION public.get_tka_smp_readiness () TO authenticated;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT DISTINCT
    ukp.user_id
  FROM
    public.user_knowledge_progress ukp
    JOIN public.user_tracks ut ON ut.id = ukp.user_track_id
    JOIN public.tracks t ON t.id = ut.track_id
    JOIN public.programs p ON p.id = t.program_id
  WHERE
    upper(p.code) = 'TKA'
    AND upper(t.code) = 'SMP' LOOP
      PERFORM
        app_private.refresh_tka_smp_readiness_for_user (r.user_id);
    END LOOP;
END;
$$;
