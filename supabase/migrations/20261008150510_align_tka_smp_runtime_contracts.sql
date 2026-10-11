-- Align the already validated staging TKA SMP contract. Auth, entitlement, quota and scoring gates are preserved.
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
      jsonb_build_object('id', lr.id, 'priority', lr.priority, 'score', lr.score, 'reason_code', lr.reason_code, 'knowledge_node_id', lr.knowledge_node_id, 'topic_code', kn.code, 'topic_name', kn.name, 'parent_topic_name', parent_kn.name, 'subject_code', s.code, 'subject_name', s.name, 'mastery_score', ukp.mastery_score, 'mastery_level', ukp.mastery_level, 'attempted_questions', ukp.attempted_questions, 'correct_questions', ukp.correct_questions, 'accuracy', ukp.accuracy, 'open_gap_count', coalesce(gaps.open_gap_count, 0), 'path', path_nodes.path, 'drill_target', CASE WHEN drill_target.knowledge_node_id IS NULL THEN
          NULL
        ELSE
          jsonb_build_object('knowledge_node_id', drill_target.knowledge_node_id, 'knowledge_node_code', drill_target.knowledge_node_code, 'knowledge_node_name', drill_target.knowledge_node_name, 'exam_slug', drill_target.exam_slug, 'exact', drill_target.distance = 0, 'distance', drill_target.distance, 'question_count', 10, 'duration_seconds', 900)
        END, 'next_action', CASE WHEN remedial.session_id IS NOT NULL THEN
          jsonb_build_object('type', 'continue_remedial', 'label', 'Lanjutkan remedial', 'href', '/tka/smp/remedial/' || remedial.session_id::text)
        WHEN coalesce(gaps.open_gap_count, 0) > 0 THEN
          jsonb_build_object('type', 'repeat_wrong', 'label', 'Ulang soal salah', 'href', '/tka/smp/wrong-questions')
        WHEN drill_target.knowledge_node_id IS NOT NULL THEN
          jsonb_build_object('type', 'start_drill', 'label', 'Mulai Drill 10 soal', 'href', '/tka/smp/progress', 'subject_code', s.code, 'knowledge_node_name', drill_target.knowledge_node_name, 'knowledge_node_code', drill_target.knowledge_node_code, 'exact', drill_target.distance = 0)
        ELSE
          jsonb_build_object('type', 'practice_tka', 'label', 'Lihat peta belajar', 'href', '/tka/smp/progress')
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
    LEFT JOIN LATERAL (
      SELECT
        anc.id AS knowledge_node_id,
        anc.code AS knowledge_node_code,
        anc.name AS knowledge_node_name,
        e.slug AS exam_slug,
        knp.depth::integer AS distance
      FROM
        public.knowledge_node_paths knp
        JOIN public.knowledge_nodes anc ON anc.id = knp.ancestor_id
        JOIN public.exams e ON e.slug = 'tka-smp-drill-' || lower(s.code) || '-' || anc.slug
          AND lower(e.status) = 'active'
        JOIN public.exam_types et ON et.id = e.exam_type_id
          AND upper(et.code) = 'DRILL'
      WHERE
        knp.descendant_id = kn.id
        AND anc.subject_id = kn.subject_id
        AND lower(anc.status) = 'active'
      ORDER BY
        knp.depth ASC,
        anc.depth DESC,
        anc.sort_order,
        anc.id
      LIMIT 1) drill_target ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        coalesce(jsonb_agg(jsonb_build_object('id', anc.id, 'code', anc.code, 'name', anc.name, 'node_type', anc.node_type, 'depth', anc.depth)
          ORDER BY knp.depth DESC), '[]'::jsonb) AS path
      FROM
        public.knowledge_node_paths knp
        JOIN public.knowledge_nodes anc ON anc.id = knp.ancestor_id
      WHERE
        knp.descendant_id = kn.id
        AND anc.subject_id = kn.subject_id
        AND lower(anc.status) = 'active') path_nodes ON TRUE
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
$function$;

CREATE OR REPLACE FUNCTION public.start_tka_smp_drill (p_subject_code text, p_knowledge_node_name text)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_user uuid := auth.uid ();
  v_program_id uuid;
  v_track_id uuid;
  v_subject_id uuid;
  v_subject_code text;
  v_node_id uuid;
  v_node_name text;
  v_node_slug text;
  v_exam_id uuid;
  v_exam_slug text;
  v_feature_id uuid;
  v_duration_seconds integer;
  v_existing_attempt_id uuid;
  v_used_attempts integer := 0;
  v_has_entitlement boolean := FALSE;
  v_payload jsonb;
  v_attempt_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED';
  END IF;

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
  IF v_track_id IS NULL THEN
    RAISE EXCEPTION 'TKA_SMP_TRACK_NOT_FOUND';
  END IF;

  IF NOT EXISTS (
    SELECT
      1
    FROM
      public.user_tracks ut
    WHERE
      ut.user_id = v_user
      AND ut.track_id = v_track_id
      AND lower(ut.status) = 'active') THEN
  RAISE EXCEPTION 'ACTIVE_USER_TRACK_REQUIRED';
END IF;

  SELECT
    s.id,
    s.code
  INTO
    v_subject_id,
    v_subject_code
  FROM
    public.subjects s
  WHERE
    s.track_id = v_track_id
    AND upper(s.code) = upper(btrim(p_subject_code))
  LIMIT 1;
  IF v_subject_id IS NULL THEN
    RAISE EXCEPTION 'DRILL_SUBJECT_INVALID';
  END IF;

  SELECT
    kn.id,
    kn.name,
    kn.slug
  INTO
    v_node_id,
    v_node_name,
    v_node_slug
  FROM
    public.knowledge_nodes kn
  WHERE
    kn.subject_id = v_subject_id
    AND lower(kn.status) = 'active'
    AND lower(btrim(kn.name)) = lower(btrim(p_knowledge_node_name))
  LIMIT 1;
  IF v_node_id IS NULL THEN
    RAISE EXCEPTION 'DRILL_KNOWLEDGE_NODE_INVALID';
  END IF;

  v_exam_slug := 'tka-smp-drill-' || lower(v_subject_code) || '-' || v_node_slug;

  SELECT
    e.id,
    e.required_feature_id,
    e.duration_seconds
  INTO
    v_exam_id,
    v_feature_id,
    v_duration_seconds
  FROM
    public.exams e
    JOIN public.exam_types et ON et.id = e.exam_type_id
  WHERE
    e.program_id = v_program_id
    AND e.track_id = v_track_id
    AND upper(et.code) = 'DRILL'
    AND e.slug = v_exam_slug
    AND lower(e.status) = 'active'
  LIMIT 1;
  IF v_exam_id IS NULL THEN
    RAISE EXCEPTION 'DRILL_EXAM_NOT_CONFIGURED';
  END IF;
  IF v_feature_id IS NULL THEN
    RAISE EXCEPTION 'DRILL_ENTITLEMENT_FEATURE_MISSING';
  END IF;

  SELECT
    ea.id
  INTO
    v_existing_attempt_id
  FROM
    public.exam_attempts ea
  WHERE
    ea.user_id = v_user
    AND ea.exam_id = v_exam_id
    AND lower(ea.status) = 'in_progress'
  ORDER BY
    ea.attempt_number DESC
  LIMIT 1;

  IF v_existing_attempt_id IS NULL THEN
    SELECT
      count(*)::integer
    INTO
      v_used_attempts
    FROM
      public.exam_attempts ea
    WHERE
      ea.user_id = v_user
      AND ea.exam_id = v_exam_id;

    IF v_used_attempts >= 1 THEN
      SELECT
        EXISTS (
          SELECT
            1
          FROM
            public.entitlements en
          WHERE
            en.user_id = v_user
            AND en.feature_id = v_feature_id
            AND lower(en.status) = 'active'
            AND en.starts_at <= now()
            AND (en.expires_at IS NULL
              OR en.expires_at > now())
            AND (en.usage_limit IS NULL
              OR en.usage_count < en.usage_limit))
      INTO
        v_has_entitlement;
      IF NOT v_has_entitlement THEN
        RAISE EXCEPTION 'ENTITLEMENT_REQUIRED';
      END IF;
    END IF;
  END IF;

  v_payload := app_private.start_exam_attempt_for_user (v_exam_id, v_user);
  v_attempt_id := nullif (v_payload ->> 'attempt_id', '')::uuid;
  IF v_attempt_id IS NULL THEN
    RAISE EXCEPTION 'DRILL_ATTEMPT_START_FAILED';
  END IF;

  UPDATE
    public.exam_attempts ea
  SET
    metadata = coalesce(ea.metadata, '{}'::jsonb) || jsonb_build_object('schemaVersion', 2, 'practiceKind', 'drill', 'programCode', 'TKA', 'trackCode', 'SMP', 'subjectCode', v_subject_code, 'knowledgeNode', v_node_name, 'durationSeconds', coalesce(v_duration_seconds, 900), 'examSlug', v_exam_slug),
    updated_at = now()
  WHERE
    ea.id = v_attempt_id
    AND ea.user_id = v_user;

  RETURN v_payload || jsonb_build_object('subject_code', v_subject_code, 'knowledge_node_id', v_node_id, 'knowledge_node_name', v_node_name, 'exam_slug', v_exam_slug);
END;
$function$;
