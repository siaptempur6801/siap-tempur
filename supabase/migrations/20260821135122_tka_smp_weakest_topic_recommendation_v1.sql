CREATE UNIQUE INDEX IF NOT EXISTS learning_recommendations_user_track_type_node_uq ON public.learning_recommendations (user_id, track_id, recommendation_type, knowledge_node_id);

CREATE OR REPLACE FUNCTION app_private.refresh_tka_smp_learning_recommendations_for_user (p_user_id uuid)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $$
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

  RETURN jsonb_build_object('applied', TRUE, 'track', 'TKA/SMP', 'active_recommendations', v_active_count, 'max_recommendations', 3, 'rule', 'mastery_asc_evidence_desc_accuracy_asc_v1');
END;
$$;

REVOKE ALL ON FUNCTION app_private.refresh_tka_smp_learning_recommendations_for_user (uuid) FROM public;

REVOKE ALL ON FUNCTION app_private.refresh_tka_smp_learning_recommendations_for_user (uuid) FROM anon;

REVOKE ALL ON FUNCTION app_private.refresh_tka_smp_learning_recommendations_for_user (uuid) FROM authenticated;

CREATE OR REPLACE FUNCTION app_private.refresh_tka_smp_recommendations_from_new_progress ()
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
        app_private.refresh_tka_smp_learning_recommendations_for_user (v_user_id);
    END LOOP;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION app_private.refresh_tka_smp_recommendations_from_old_progress ()
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
        app_private.refresh_tka_smp_learning_recommendations_for_user (v_user_id);
    END LOOP;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION app_private.refresh_tka_smp_recommendations_from_new_progress () FROM public, anon, authenticated;

REVOKE ALL ON FUNCTION app_private.refresh_tka_smp_recommendations_from_old_progress () FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS trg_tka_smp_recommendations_after_progress_insert ON public.user_knowledge_progress;

CREATE TRIGGER trg_tka_smp_recommendations_after_progress_insert
  AFTER INSERT ON public.user_knowledge_progress referencing new TABLE AS new_rows
  FOR EACH statement
  EXECUTE FUNCTION app_private.refresh_tka_smp_recommendations_from_new_progress ();

DROP TRIGGER IF EXISTS trg_tka_smp_recommendations_after_progress_update ON public.user_knowledge_progress;

CREATE TRIGGER trg_tka_smp_recommendations_after_progress_update
  AFTER UPDATE ON public.user_knowledge_progress referencing new TABLE AS new_rows
  FOR EACH statement
  EXECUTE FUNCTION app_private.refresh_tka_smp_recommendations_from_new_progress ();

DROP TRIGGER IF EXISTS trg_tka_smp_recommendations_after_progress_delete ON public.user_knowledge_progress;

CREATE TRIGGER trg_tka_smp_recommendations_after_progress_delete
  AFTER DELETE ON public.user_knowledge_progress referencing old TABLE AS old_rows
  FOR EACH statement
  EXECUTE FUNCTION app_private.refresh_tka_smp_recommendations_from_old_progress ();

CREATE OR REPLACE FUNCTION public.get_tka_smp_learning_focus ()
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $$
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
$$;

REVOKE ALL ON FUNCTION public.get_tka_smp_learning_focus () FROM public;

REVOKE ALL ON FUNCTION public.get_tka_smp_learning_focus () FROM anon;

GRANT EXECUTE ON FUNCTION public.get_tka_smp_learning_focus () TO authenticated;

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
        app_private.refresh_tka_smp_learning_recommendations_for_user (r.user_id);
    END LOOP;
END;
$$;
