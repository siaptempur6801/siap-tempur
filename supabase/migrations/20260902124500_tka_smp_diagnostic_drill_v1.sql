-- TKA SMP Diagnostic -> Drill V1
-- Publishes the reviewed TKA SMP question bank through the existing workflow guard,
-- configures one freemium DRILL exam per subject, and refreshes mastery after a
-- generic drill attempt is completed.
DO $migration$
DECLARE
  v_program_id uuid;
  v_track_id uuid;
  v_drill_type_id uuid;
  v_drill_feature_id uuid;
  v_created_by uuid;
  v_subject_id uuid;
  v_exam_id uuid;
  v_total_questions integer;
  v_pending_reviews integer;
  v_target_nodes integer;
  v_underfilled_nodes integer;
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

  IF v_program_id IS NULL OR v_track_id IS NULL THEN
    RAISE EXCEPTION 'TKA SMP track not found';
  END IF;

  SELECT
    et.id
  INTO
    v_drill_type_id
  FROM
    public.exam_types et
  WHERE
    upper(et.code) = 'DRILL'
  LIMIT 1;

  IF v_drill_type_id IS NULL THEN
    RAISE EXCEPTION 'DRILL exam type not found';
  END IF;

  SELECT
    f.id
  INTO
    v_drill_feature_id
  FROM
    public.features f
  WHERE
    f.code = 'tka.smp.drill.unlimited'
  LIMIT 1;

  IF v_drill_feature_id IS NULL THEN
    RAISE EXCEPTION 'TKA SMP drill entitlement feature not found';
  END IF;

  SELECT
    e.created_by
  INTO
    v_created_by
  FROM
    public.exams e
  WHERE
    e.slug = 'tka-smp-diagnostic-awal'
    AND e.program_id = v_program_id
    AND e.track_id = v_track_id
  LIMIT 1;

  IF v_created_by IS NULL THEN
    RAISE EXCEPTION 'TKA SMP diagnostic creator not found';
  END IF;

  SELECT
    count(*)::integer
  INTO
    v_total_questions
  FROM
    public.questions q
  WHERE
    q.program_id = v_program_id
    AND q.track_id = v_track_id
    AND lower(q.status) IN ('approved', 'published');

  IF v_total_questions <> 300 THEN
    RAISE EXCEPTION 'TKA SMP publish gate blocked: expected 300 reviewed questions, got %', v_total_questions;
  END IF;

  SELECT
    count(*)::integer
  INTO
    v_pending_reviews
  FROM
    public.content_reviews cr
    JOIN public.questions q ON cr.entity_type = 'question'
      AND cr.entity_id = q.id
  WHERE
    q.program_id = v_program_id
    AND q.track_id = v_track_id
    AND lower(q.status) = 'approved'
    AND lower(cr.status) = 'pending';

  IF v_pending_reviews <> 0 THEN
    RAISE EXCEPTION 'TKA SMP publish gate blocked: % pending content reviews remain', v_pending_reviews;
  END IF;
  -- approved -> published is the canonical reviewed-content transition. The
  -- workflow action flag keeps the existing guard active and audit trigger runs.
  PERFORM
    set_config('app.workflow_action', 'publish', TRUE);
  UPDATE
    public.questions q
  SET
    status = 'published',
    reviewer_id = NULL,
    published_at = coalesce(q.published_at, now()),
    updated_at = now()
  WHERE
    q.program_id = v_program_id
    AND q.track_id = v_track_id
    AND lower(q.status) = 'approved';
  -- The seven diagnostic competency/element nodes must each have at least ten
  -- published questions before focused drill can be enabled.
  WITH target_nodes AS (
    SELECT
      kn.id
    FROM
      public.knowledge_nodes kn
      JOIN public.subjects s ON s.id = kn.subject_id
    WHERE
      s.track_id = v_track_id
      AND lower(kn.status) = 'active'
      AND ((upper(s.code) = 'BIN'
          AND lower(kn.node_type) = 'competency')
        OR (upper(s.code) = 'MAT'
          AND lower(kn.node_type) = 'element'))
      AND kn.name IN ('Pemahaman Tekstual', 'Pemahaman Inferensial', 'Evaluasi dan Apresiasi', 'Bilangan', 'Aljabar', 'Geometri dan Pengukuran', 'Data dan Peluang')
),
counts AS (
  SELECT
    tn.id,
    count(DISTINCT q.id)::integer AS question_count
  FROM
    target_nodes tn
    LEFT JOIN public.knowledge_node_paths knp ON knp.ancestor_id = tn.id
    LEFT JOIN public.question_knowledge_nodes qkn ON qkn.knowledge_node_id = knp.descendant_id
      AND lower(qkn.relation_type) = 'primary'
    LEFT JOIN public.questions q ON q.id = qkn.question_id
      AND q.track_id = v_track_id
      AND lower(q.status) = 'published'
  GROUP BY
    tn.id
)
SELECT
  count(*)::integer,
  count(*) FILTER (WHERE question_count < 10)::integer
INTO
  v_target_nodes,
  v_underfilled_nodes
FROM
  counts;

    IF v_target_nodes <> 7 THEN
      RAISE EXCEPTION 'TKA SMP drill gate blocked: expected 7 target nodes, got %', v_target_nodes;
    END IF;

    IF v_underfilled_nodes <> 0 THEN
      RAISE EXCEPTION 'TKA SMP drill gate blocked: % target nodes have fewer than 10 published questions', v_underfilled_nodes;
    END IF;
    -- Bahasa Indonesia: one free focused-drill attempt, then Tempur Pass unlocks
    -- unlimited attempts through tka.smp.drill.unlimited.
    SELECT
      s.id
    INTO
      v_subject_id
    FROM
      public.subjects s
    WHERE
      s.track_id = v_track_id
      AND upper(s.code) = 'BIN'
    LIMIT 1;

    IF v_subject_id IS NULL THEN
      RAISE EXCEPTION 'TKA SMP BIN subject not found';
    END IF;

  INSERT INTO public.exams (program_id, track_id, exam_type_id, title, slug, description, duration_seconds, attempt_limit, question_order, result_visibility, access_type, status, created_by, required_feature_id, token_cost)
    VALUES (v_program_id, v_track_id, v_drill_type_id, 'Latihan Fokus Bahasa Indonesia TKA SMP', 'tka-smp-drill-bahasa-indonesia', 'Latihan 10 soal yang dipilih dinamis dari kompetensi Bahasa Indonesia prioritas.', 900, 1, 'random', 'instant', 'FREEMIUM', 'active', v_created_by, v_drill_feature_id, 0)
  ON CONFLICT (slug)
    DO UPDATE SET
      exam_type_id = excluded.exam_type_id,
      duration_seconds = excluded.duration_seconds,
      attempt_limit = excluded.attempt_limit,
      question_order = excluded.question_order,
      result_visibility = excluded.result_visibility,
      access_type = excluded.access_type,
      status = excluded.status,
      required_feature_id = excluded.required_feature_id,
      token_cost = excluded.token_cost,
      updated_at = now()
    RETURNING
      id
    INTO
      v_exam_id;

    IF NOT EXISTS (
      SELECT
        1
      FROM
        public.exam_sections es
      WHERE
        es.exam_id = v_exam_id
        AND es.subject_id = v_subject_id) THEN
    INSERT INTO public.exam_sections (exam_id, subject_id, title, sort_order, question_count, duration_seconds, config)
      VALUES (v_exam_id, v_subject_id, 'Bahasa Indonesia', 1, 10, 900, '{}'::jsonb);
END IF;
    -- Matematika.
    SELECT
      s.id
    INTO
      v_subject_id
    FROM
      public.subjects s
    WHERE
      s.track_id = v_track_id
      AND upper(s.code) = 'MAT'
    LIMIT 1;

    IF v_subject_id IS NULL THEN
      RAISE EXCEPTION 'TKA SMP MAT subject not found';
    END IF;

  INSERT INTO public.exams (program_id, track_id, exam_type_id, title, slug, description, duration_seconds, attempt_limit, question_order, result_visibility, access_type, status, created_by, required_feature_id, token_cost)
    VALUES (v_program_id, v_track_id, v_drill_type_id, 'Latihan Fokus Matematika TKA SMP', 'tka-smp-drill-matematika', 'Latihan 10 soal yang dipilih dinamis dari elemen Matematika prioritas.', 900, 1, 'random', 'instant', 'FREEMIUM', 'active', v_created_by, v_drill_feature_id, 0)
  ON CONFLICT (slug)
    DO UPDATE SET
      exam_type_id = excluded.exam_type_id,
      duration_seconds = excluded.duration_seconds,
      attempt_limit = excluded.attempt_limit,
      question_order = excluded.question_order,
      result_visibility = excluded.result_visibility,
      access_type = excluded.access_type,
      status = excluded.status,
      required_feature_id = excluded.required_feature_id,
      token_cost = excluded.token_cost,
      updated_at = now()
    RETURNING
      id
    INTO
      v_exam_id;

    IF NOT EXISTS (
      SELECT
        1
      FROM
        public.exam_sections es
      WHERE
        es.exam_id = v_exam_id
        AND es.subject_id = v_subject_id) THEN
    INSERT INTO public.exam_sections (exam_id, subject_id, title, sort_order, question_count, duration_seconds, config)
      VALUES (v_exam_id, v_subject_id, 'Matematika', 1, 10, 900, '{}'::jsonb);
END IF;
END;
$migration$;

-- Generic Schema V2 practice completion updates exam_attempts directly. Keep the
-- TKA projection refresh in the database so every completed focused drill gets
-- the same deterministic mastery/recommendation update regardless of UI caller.
CREATE OR REPLACE FUNCTION app_private.refresh_tka_smp_drill_projection_after_attempt ()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $function$
DECLARE
  v_program_code text;
  v_track_code text;
  v_exam_type_code text;
BEGIN
  IF lower(coalesce(NEW.status, '')) <> 'completed' OR lower(coalesce(OLD.status, '')) = 'completed' OR lower(coalesce(NEW.metadata ->> 'practiceKind', '')) <> 'drill' THEN
    RETURN new;
  END IF;

  SELECT
    p.code,
    t.code,
    et.code
  INTO
    v_program_code,
    v_track_code,
    v_exam_type_code
  FROM
    public.exams e
    JOIN public.programs p ON p.id = e.program_id
    JOIN public.tracks t ON t.id = e.track_id
    JOIN public.exam_types et ON et.id = e.exam_type_id
  WHERE
    e.id = NEW.exam_id;

  IF upper(coalesce(v_program_code, '')) = 'TKA' AND upper(coalesce(v_track_code, '')) = 'SMP' AND upper(coalesce(v_exam_type_code, '')) = 'DRILL' THEN
    PERFORM
      app_private.refresh_tka_smp_learning_projection_for_user (NEW.user_id, NEW.id);
  END IF;

  RETURN new;
END;
$function$;

DROP TRIGGER IF EXISTS trg_tka_smp_drill_projection_after_attempt ON public.exam_attempts;

CREATE TRIGGER trg_tka_smp_drill_projection_after_attempt
  AFTER UPDATE OF status ON public.exam_attempts
  FOR EACH ROW
  EXECUTE FUNCTION app_private.refresh_tka_smp_drill_projection_after_attempt ();
