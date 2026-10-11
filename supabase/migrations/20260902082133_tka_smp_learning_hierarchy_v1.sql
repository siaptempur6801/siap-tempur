-- TKA SMP Learning Hierarchy V1
-- Materialize safe 10-question drills for sufficiently populated lower-level
-- knowledge nodes and expose one authenticated, read-only hierarchy projection.
DO $migration$
DECLARE
  v_created_by uuid;
  v_feature_id uuid;
  v_exam_id uuid;
  v_exam_slug text;
  v_payload jsonb;
  r record;
BEGIN
  SELECT
    e.created_by
  INTO
    v_created_by
  FROM
    public.exams e
  WHERE
    e.slug = 'tka-smp-diagnostic-awal'
  LIMIT 1;

  IF v_created_by IS NULL THEN
    RAISE EXCEPTION 'TKA SMP diagnostic creator not found';
  END IF;

  SELECT
    f.id
  INTO
    v_feature_id
  FROM
    public.features f
  WHERE
    f.code = 'tka.smp.drill.unlimited'
  LIMIT 1;

  IF v_feature_id IS NULL THEN
    RAISE EXCEPTION 'TKA SMP drill feature not found';
  END IF;

  FOR r IN WITH candidates AS (
    SELECT
      kn.id AS knowledge_node_id,
      kn.name AS knowledge_node_name,
      kn.slug AS knowledge_node_slug,
      kn.depth,
      kn.sort_order,
      s.code AS subject_code,
      count(DISTINCT q.id)::integer AS published_question_count
    FROM
      public.knowledge_nodes kn
      JOIN public.subjects s ON s.id = kn.subject_id
      JOIN public.tracks t ON t.id = s.track_id
      JOIN public.programs p ON p.id = t.program_id
      LEFT JOIN public.knowledge_node_paths knp ON knp.ancestor_id = kn.id
      LEFT JOIN public.question_knowledge_nodes qkn ON qkn.knowledge_node_id = knp.descendant_id
        AND lower(qkn.relation_type) = 'primary'
    LEFT JOIN public.questions q ON q.id = qkn.question_id
      AND q.track_id = t.id
      AND lower(q.status) = 'published'
  WHERE
    upper(p.code) = 'TKA'
    AND upper(t.code) = 'SMP'
    AND lower(kn.status) = 'active'
    AND ((upper(s.code) = 'BIN'
        AND lower(kn.node_type) = 'subcompetency')
      OR (upper(s.code) = 'MAT'
        AND lower(kn.node_type) IN ('subelement', 'topic')))
  GROUP BY
    kn.id,
    kn.name,
    kn.slug,
    kn.depth,
    kn.sort_order,
    s.code
)
SELECT
  *
FROM
  candidates
WHERE
  published_question_count >= 10
ORDER BY
  subject_code,
  depth,
  sort_order,
  knowledge_node_name LOOP
    v_exam_slug := 'tka-smp-drill-' || lower(r.subject_code) || '-' || r.knowledge_node_slug;

    SELECT
      e.id
    INTO
      v_exam_id
    FROM
      public.exams e
    WHERE
      e.slug = v_exam_slug
    LIMIT 1;

    v_payload := public.admin_upsert_drill_exam_v1 (v_exam_id, 'TKA', 'SMP', r.subject_code, r.knowledge_node_id, 'Latihan Fokus ' || r.knowledge_node_name || ' TKA SMP', v_exam_slug, 900, 1, 10, 'random', 'instant', 'FREEMIUM', 'active', 0, v_created_by);

    v_exam_id := nullif (v_payload ->> 'exam_id', '')::uuid;
    IF v_exam_id IS NULL THEN
      RAISE EXCEPTION 'TKA SMP hierarchy drill materialization failed for %', r.knowledge_node_name;
    END IF;

    UPDATE
      public.exams
    SET
      required_feature_id = v_feature_id,
      attempt_limit = NULL,
      description = 'Drill 10 soal untuk ' || r.knowledge_node_name || '. Satu percobaan awal gratis; Tempur Pass membuka latihan lanjutan.',
      updated_at = now()
    WHERE
      id = v_exam_id;
  END LOOP;

  IF EXISTS ( WITH candidates AS (
      SELECT
        kn.id,
        kn.slug,
        s.code AS subject_code
      FROM
        public.knowledge_nodes kn
        JOIN public.subjects s ON s.id = kn.subject_id
        JOIN public.tracks t ON t.id = s.track_id
        JOIN public.programs p ON p.id = t.program_id
        JOIN public.knowledge_node_paths knp ON knp.ancestor_id = kn.id
        JOIN public.question_knowledge_nodes qkn ON qkn.knowledge_node_id = knp.descendant_id
          AND lower(qkn.relation_type) = 'primary'
        JOIN public.questions q ON q.id = qkn.question_id
          AND q.track_id = t.id
          AND lower(q.status) = 'published'
      WHERE
        upper(p.code) = 'TKA'
        AND upper(t.code) = 'SMP'
        AND lower(kn.status) = 'active'
        AND ((upper(s.code) = 'BIN'
            AND lower(kn.node_type) = 'subcompetency')
          OR (upper(s.code) = 'MAT'
            AND lower(kn.node_type) IN ('subelement', 'topic')))
      GROUP BY
        kn.id,
        kn.slug,
        s.code
      HAVING
        count(DISTINCT q.id) >= 10
)
      SELECT
        1
      FROM
        candidates c
      LEFT JOIN public.exams e ON e.slug = 'tka-smp-drill-' || lower(c.subject_code) || '-' || c.slug
        AND lower(e.status) = 'active'
    LEFT JOIN public.exam_sections es ON es.exam_id = e.id
    LEFT JOIN public.exam_question_items eqi ON eqi.exam_id = e.id
      AND eqi.section_id = es.id
  GROUP BY
    c.id,
    e.id,
    es.id,
    es.question_count
  HAVING
    e.id IS NULL
    OR es.question_count <> 10
    OR count(eqi.id) <> 10) THEN
RAISE EXCEPTION 'TKA SMP learning hierarchy frozen Drill gate failed';
END IF;
END;
$migration$;

CREATE OR REPLACE FUNCTION public.get_tka_smp_learning_hierarchy ()
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $function$
DECLARE
  v_user uuid := auth.uid ();
  v_track_id uuid;
  v_user_track_id uuid;
  v_items jsonb := '[]'::jsonb;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED';
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
    RAISE EXCEPTION 'TKA_SMP_TRACK_NOT_FOUND';
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
  LIMIT 1;

  IF v_user_track_id IS NULL THEN
    RAISE EXCEPTION 'ACTIVE_USER_TRACK_REQUIRED';
  END IF;

  WITH nodes AS (
    SELECT
      kn.id,
      kn.subject_id,
      kn.parent_id,
      kn.code,
      kn.name,
      kn.slug,
      kn.node_type,
      kn.depth,
      kn.sort_order,
      s.code AS subject_code,
      s.name AS subject_name,
      s.sort_order AS subject_sort_order
    FROM
      public.knowledge_nodes kn
      JOIN public.subjects s ON s.id = kn.subject_id
    WHERE
      s.track_id = v_track_id
      AND lower(kn.status) = 'active'
),
question_counts AS (
  SELECT
    n.id,
    count(DISTINCT q.id)::integer AS question_count
  FROM
    nodes n
    LEFT JOIN public.knowledge_node_paths knp ON knp.ancestor_id = n.id
    LEFT JOIN public.question_knowledge_nodes qkn ON qkn.knowledge_node_id = knp.descendant_id
      AND lower(qkn.relation_type) = 'primary'
    LEFT JOIN public.questions q ON q.id = qkn.question_id
      AND q.track_id = v_track_id
      AND lower(q.status) = 'published'
  GROUP BY
    n.id
),
hierarchy_rows AS (
  SELECT
    n.*,
    qc.question_count,
    coalesce(ukp.attempted_questions, 0)::integer AS attempted_questions,
    coalesce(ukp.correct_questions, 0)::integer AS correct_questions,
    coalesce(ukp.accuracy, 0)::numeric AS accuracy,
    coalesce(ukp.mastery_score, 0)::numeric AS mastery_score,
    coalesce(ukp.mastery_level, 'not_started') AS mastery_level,
    exact_drill.exam_slug AS exact_drill_slug,
    nearest_drill.knowledge_node_id AS drill_knowledge_node_id,
    nearest_drill.knowledge_node_code AS drill_knowledge_node_code,
    nearest_drill.knowledge_node_name AS drill_knowledge_node_name,
    nearest_drill.exam_slug AS drill_exam_slug,
    nearest_drill.distance AS drill_distance,
    path_nodes.path AS path
  FROM
    nodes n
    JOIN question_counts qc ON qc.id = n.id
    LEFT JOIN public.user_knowledge_progress ukp ON ukp.user_id = v_user
      AND ukp.user_track_id = v_user_track_id
      AND ukp.knowledge_node_id = n.id
    LEFT JOIN LATERAL (
      SELECT
        e.slug AS exam_slug
      FROM
        public.exams e
        JOIN public.exam_types et ON et.id = e.exam_type_id
      WHERE
        upper(et.code) = 'DRILL'
        AND lower(e.status) = 'active'
        AND e.slug = 'tka-smp-drill-' || lower(n.subject_code) || '-' || n.slug
      LIMIT 1) exact_drill ON TRUE
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
        JOIN public.exams e ON e.slug = 'tka-smp-drill-' || lower(n.subject_code) || '-' || anc.slug
          AND lower(e.status) = 'active'
        JOIN public.exam_types et ON et.id = e.exam_type_id
          AND upper(et.code) = 'DRILL'
      WHERE
        knp.descendant_id = n.id
        AND anc.subject_id = n.subject_id
        AND lower(anc.status) = 'active'
      ORDER BY
        knp.depth ASC,
        anc.depth DESC,
        anc.sort_order,
        anc.id
      LIMIT 1) nearest_drill ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        coalesce(jsonb_agg(jsonb_build_object('id', anc.id, 'code', anc.code, 'name', anc.name, 'node_type', anc.node_type, 'depth', anc.depth)
          ORDER BY knp.depth DESC), '[]'::jsonb) AS path
      FROM
        public.knowledge_node_paths knp
        JOIN public.knowledge_nodes anc ON anc.id = knp.ancestor_id
      WHERE
        knp.descendant_id = n.id
        AND anc.subject_id = n.subject_id
        AND lower(anc.status) = 'active') path_nodes ON TRUE
)
  SELECT
    coalesce(jsonb_agg(jsonb_build_object('knowledge_node_id', hr.id, 'knowledge_node_code', hr.code, 'name', hr.name, 'node_type', hr.node_type, 'depth', hr.depth, 'parent_id', hr.parent_id, 'sort_order', hr.sort_order, 'subject_id', hr.subject_id, 'subject_code', hr.subject_code, 'subject_name', hr.subject_name, 'subject_sort_order', hr.subject_sort_order, 'published_question_count', hr.question_count, 'attempted_questions', hr.attempted_questions, 'correct_questions', hr.correct_questions, 'accuracy', hr.accuracy, 'mastery_score', hr.mastery_score, 'mastery_level', hr.mastery_level, 'path', hr.path, 'drill', CASE WHEN hr.drill_exam_slug IS NULL THEN
            NULL
          ELSE
            jsonb_build_object('available', TRUE, 'exact', hr.drill_distance = 0, 'distance', hr.drill_distance, 'knowledge_node_id', hr.drill_knowledge_node_id, 'knowledge_node_code', hr.drill_knowledge_node_code, 'knowledge_node_name', hr.drill_knowledge_node_name, 'exam_slug', hr.drill_exam_slug, 'question_count', 10, 'duration_seconds', 900)
          END)
      ORDER BY hr.subject_sort_order, hr.subject_code, hr.depth, hr.sort_order, hr.code), '[]'::jsonb)
  INTO
    v_items
  FROM
    hierarchy_rows hr;

    RETURN jsonb_build_object('version', 'tka_smp_learning_hierarchy_v1', 'items', v_items, 'count', jsonb_array_length(v_items));
END;
$function$;

REVOKE ALL ON FUNCTION public.get_tka_smp_learning_hierarchy () FROM public;

REVOKE ALL ON FUNCTION public.get_tka_smp_learning_hierarchy () FROM anon;

GRANT EXECUTE ON FUNCTION public.get_tka_smp_learning_hierarchy () TO authenticated;
