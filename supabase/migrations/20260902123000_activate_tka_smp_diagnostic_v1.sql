-- Activate TKA SMP Diagnostic V1 only when the frozen exam contract is complete.
-- Expected contract: 28 items mapped to 7 diagnostic competencies (4 items each).
DO $migration$
DECLARE
  v_exam_id uuid;
  v_item_count integer;
  v_competency_count integer;
  v_invalid_competency_count integer;
BEGIN
  SELECT
    e.id
  INTO
    v_exam_id
  FROM
    public.exams e
    JOIN public.tracks t ON t.id = e.track_id
    JOIN public.programs p ON p.id = t.program_id
    JOIN public.exam_types et ON et.id = e.exam_type_id
  WHERE
    e.slug = 'tka-smp-diagnostic-awal'
    AND upper(p.code) = 'TKA'
    AND upper(t.code) = 'SMP'
    AND upper(et.code) = 'DIAGNOSTIC'
  LIMIT 1;

  IF v_exam_id IS NULL THEN
    RAISE EXCEPTION 'TKA SMP diagnostic exam not found';
  END IF;

  SELECT
    count(*)::integer
  INTO
    v_item_count
  FROM
    public.exam_question_items eqi
  WHERE
    eqi.exam_id = v_exam_id;

  IF v_item_count <> 28 THEN
    RAISE EXCEPTION 'TKA SMP diagnostic activation blocked: expected 28 items, got %', v_item_count;
  END IF;

  WITH evidence AS (
    SELECT
      q.id AS question_id,
      s.code AS subject_code,
      qkn.knowledge_node_id AS primary_node_id
    FROM
      public.exam_question_items eqi
      JOIN public.questions q ON q.id = eqi.question_id
      JOIN public.subjects s ON s.id = q.subject_id
      JOIN public.question_knowledge_nodes qkn ON qkn.question_id = q.id
        AND lower(qkn.relation_type) = 'primary'
    WHERE
      eqi.exam_id = v_exam_id
),
mapped AS (
  SELECT
    e.question_id,
    competency.id AS competency_id
  FROM
    evidence e
    JOIN LATERAL (
      SELECT
        anc.id
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
counts AS (
  SELECT
    competency_id,
    count(*)::integer AS question_count
  FROM
    mapped
  GROUP BY
    competency_id
)
SELECT
  count(*)::integer,
  count(*) FILTER (WHERE question_count <> 4)::integer
INTO
  v_competency_count,
  v_invalid_competency_count
FROM
  counts;

    IF v_competency_count <> 7 THEN
      RAISE EXCEPTION 'TKA SMP diagnostic activation blocked: expected 7 competencies, got %', v_competency_count;
    END IF;

    IF v_invalid_competency_count <> 0 THEN
      RAISE EXCEPTION 'TKA SMP diagnostic activation blocked: every competency must contain exactly 4 items';
    END IF;

    IF EXISTS (
      SELECT
        1
      FROM
        public.exam_question_items eqi
        JOIN public.questions q ON q.id = eqi.question_id
      WHERE
        eqi.exam_id = v_exam_id
        AND lower(q.status) <> 'approved') THEN
    RAISE EXCEPTION 'TKA SMP diagnostic activation blocked: all questions must be approved';
END IF;

    UPDATE
      public.exams
    SET
      status = 'active',
      updated_at = now()
    WHERE
      id = v_exam_id;
END;
$migration$;
