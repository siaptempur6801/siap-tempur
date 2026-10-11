-- Milestone 2: TKA SMP Mini Tryout core.
--
-- This migration intentionally reuses the authenticated section/RPC engine that
-- already powers the TKA SMP Full Tryout. It removes the Full-only 60-question
-- assumption, makes state totals dynamic, freezes two 15-question Mini sets from
-- the already-reviewed Full Tryout pool, and activates the Mini exam records.
--
-- Safety:
-- - Abort if either Mini exam already has attempts. We do not silently replace a
--   frozen question set after learners have started using it.
-- - Every section must declare a positive question_count.
-- - Static item counts must match the declared section counts exactly.
-- - Every item must belong to a section of the same exam and have an exact
--   question_versions snapshot.
-- - The user-facing RPC remains authenticated, SECURITY DEFINER, and guarded by
--   active profile + active user_track + attempt limit checks.
CREATE OR REPLACE FUNCTION app_private.start_exam_attempt_for_user (p_exam_id uuid, p_user_id uuid)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $$
DECLARE
  v_attempt_id uuid := gen_random_uuid ();
  v_attempt_number integer;
  v_attempt_limit integer;
  v_exam_status text;
  v_track_id uuid;
  v_item_count integer;
  v_expected_count integer;
  v_section_count integer;
  v_first_section uuid;
  v_seed text;
  v_existing_attempt_id uuid;
  v_existing_attempt_number integer;
BEGIN
  IF NOT EXISTS (
    SELECT
      1
    FROM
      public.profiles
    WHERE
      id = p_user_id
      AND status = 'active') THEN
  RAISE EXCEPTION 'Active user profile not found';
END IF;

  PERFORM
    pg_advisory_xact_lock(hashtextextended(p_exam_id::text || ':' || p_user_id::text, 0));

  SELECT
    status,
    attempt_limit,
    track_id
  INTO
    v_exam_status,
    v_attempt_limit,
    v_track_id
  FROM
    public.exams
  WHERE
    id = p_exam_id;
  IF NOT found THEN
    RAISE EXCEPTION 'Exam not found';
  END IF;
  IF v_exam_status <> 'active' THEN
    RAISE EXCEPTION 'Exam is not active';
  END IF;

  IF NOT EXISTS (
    SELECT
      1
    FROM
      public.user_tracks
    WHERE
      user_id = p_user_id
      AND track_id = v_track_id
      AND status = 'active') THEN
  RAISE EXCEPTION 'Active user track required';
END IF;
  -- Idempotency guard: concurrent/double-click starts return the same active attempt.
  SELECT
    ea.id,
    ea.attempt_number
  INTO
    v_existing_attempt_id,
    v_existing_attempt_number
  FROM
    public.exam_attempts ea
  WHERE
    ea.exam_id = p_exam_id
    AND ea.user_id = p_user_id
    AND ea.status = 'in_progress'
  ORDER BY
    ea.attempt_number DESC
  LIMIT 1;

  IF v_existing_attempt_id IS NOT NULL THEN
    SELECT
      ass.section_id
    INTO
      v_first_section
    FROM
      public.attempt_section_states ass
      JOIN public.exam_sections es ON es.id = ass.section_id
    WHERE
      ass.attempt_id = v_existing_attempt_id
      AND ass.status = 'active'
    ORDER BY
      es.sort_order
    LIMIT 1;

    RETURN jsonb_build_object('attempt_id', v_existing_attempt_id, 'attempt_number', v_existing_attempt_number, 'status', 'in_progress', 'active_section_id', v_first_section, 'resumed', TRUE);
  END IF;

  SELECT
    count(*),
    coalesce(sum(es.question_count), 0)
  INTO
    v_section_count,
    v_expected_count
  FROM
    public.exam_sections es
  WHERE
    es.exam_id = p_exam_id;

  IF v_section_count = 0 OR v_expected_count <= 0 THEN
    RAISE EXCEPTION 'Exam must declare at least one section with a positive question count';
  END IF;

  IF EXISTS (
    SELECT
      1
    FROM
      public.exam_sections es
    WHERE
      es.exam_id = p_exam_id
      AND coalesce(es.question_count, 0) <= 0) THEN
  RAISE EXCEPTION 'Every exam section must declare a positive question count';
END IF;

  SELECT
    count(*)
  INTO
    v_item_count
  FROM
    public.exam_question_items
  WHERE
    exam_id = p_exam_id;

  IF v_item_count <> v_expected_count THEN
    RAISE EXCEPTION 'Exam item count mismatch: expected %, got %', v_expected_count, v_item_count;
  END IF;

  IF EXISTS (
    SELECT
      1
    FROM
      public.exam_sections es
    LEFT JOIN public.exam_question_items eqi ON eqi.section_id = es.id
      AND eqi.exam_id = p_exam_id
  WHERE
    es.exam_id = p_exam_id
  GROUP BY
    es.id,
    es.question_count
  HAVING
    count(eqi.id) <> es.question_count) THEN
RAISE EXCEPTION 'Exam section item count does not match section question_count';
END IF;

  IF EXISTS (
    SELECT
      1
    FROM
      public.exam_question_items eqi
    LEFT JOIN public.exam_sections es ON es.id = eqi.section_id
  WHERE
    eqi.exam_id = p_exam_id
    AND (eqi.section_id IS NULL
      OR es.exam_id IS DISTINCT FROM p_exam_id)) THEN
RAISE EXCEPTION 'Every exam item must belong to a section of the same exam';
END IF;

  IF EXISTS (
    SELECT
      1
    FROM
      public.exam_question_items eqi
    LEFT JOIN public.question_versions qv ON qv.question_id = eqi.question_id
      AND qv.version = eqi.question_version
  WHERE
    eqi.exam_id = p_exam_id
    AND qv.question_id IS NULL) THEN
RAISE EXCEPTION 'Every exam item must reference an existing frozen question version';
END IF;

  SELECT
    coalesce(max(attempt_number), 0) + 1
  INTO
    v_attempt_number
  FROM
    public.exam_attempts
  WHERE
    exam_id = p_exam_id
    AND user_id = p_user_id;

  IF v_attempt_limit IS NOT NULL AND v_attempt_number > v_attempt_limit THEN
    RAISE EXCEPTION 'Attempt limit reached';
  END IF;

  v_seed := v_attempt_id::text;

INSERT INTO public.exam_attempts (id, exam_id, user_id, attempt_number, status, started_at, metadata, created_at, updated_at)
  VALUES (v_attempt_id, p_exam_id, p_user_id, v_attempt_number, 'in_progress', now(), jsonb_build_object('orderSeed', v_seed, 'engineVersion', 'tka-section-rpc-v2', 'questionCount', v_expected_count), now(), now());

  WITH s AS (
    SELECT
      es.*,
      row_number() OVER (ORDER BY es.sort_order,
        es.id) rn
    FROM public.exam_sections es
  WHERE es.exam_id = p_exam_id)
INSERT INTO public.attempt_section_states (attempt_id, section_id, status, started_at, deadline_at, created_at, updated_at)
SELECT
  v_attempt_id,
  id,
  CASE WHEN rn = 1 THEN
    'active'
  ELSE
    'locked'
  END,
  CASE WHEN rn = 1 THEN
    now()
  ELSE
    NULL
  END,
  CASE WHEN rn = 1 THEN
    now() + make_interval(secs => coalesce(duration_seconds, 0))
  ELSE
    NULL
  END,
  now(),
  now()
FROM
  s;

  SELECT
    ass.section_id
  INTO
    v_first_section
  FROM
    public.attempt_section_states ass
    JOIN public.exam_sections es ON es.id = ass.section_id
  WHERE
    ass.attempt_id = v_attempt_id
    AND ass.status = 'active'
  ORDER BY
    es.sort_order
  LIMIT 1;

  WITH base AS (
    SELECT
      eqi.question_id,
      eqi.question_version,
      eqi.section_id,
      es.sort_order,
      qv.snapshot,
      row_number() OVER (ORDER BY es.sort_order,
        md5(v_seed || ':' || eqi.question_id::text)) AS pos
    FROM
      public.exam_question_items eqi
      JOIN public.exam_sections es ON es.id = eqi.section_id
        AND es.exam_id = eqi.exam_id
      JOIN public.question_versions qv ON qv.question_id = eqi.question_id
        AND qv.version = eqi.question_version
    WHERE
      eqi.exam_id = p_exam_id
),
enhanced AS (
  SELECT
    b.*,
    jsonb_set(b.snapshot, '{options}', coalesce((
        SELECT
          jsonb_agg(jsonb_build_object('id', qo.id, 'option_key', qo.option_key, 'content', qo.content, 'is_correct', qo.is_correct, 'score', qo.score, 'sort_order', qo.sort_order, 'image_url', qo.image_url, 'response_group', qo.response_group, 'response_group_order', qo.response_group_order, 'metadata', qo.metadata)
          ORDER BY qo.sort_order)
        FROM public.question_options qo
        WHERE
          qo.question_id = b.question_id), '[]'::jsonb), TRUE) AS frozen_snapshot
  FROM
    base b)
INSERT INTO public.attempt_questions (attempt_id, question_id, question_version, position, section_id, question_snapshot, max_score)
SELECT
  v_attempt_id,
  question_id,
  question_version,
  pos,
  section_id,
  frozen_snapshot,
  1
FROM
  enhanced;

INSERT INTO public.attempt_events (attempt_id, event_type, metadata)
  VALUES (v_attempt_id, 'attempt_started', jsonb_build_object('attemptNumber', v_attempt_number, 'activeSectionId', v_first_section, 'questionCount', v_expected_count));

  RETURN jsonb_build_object('attempt_id', v_attempt_id, 'attempt_number', v_attempt_number, 'status', 'in_progress', 'active_section_id', v_first_section, 'resumed', FALSE);
END;
$$;

CREATE OR REPLACE FUNCTION app_private.get_exam_attempt_state_for_user (p_user_id uuid, p_attempt_id uuid)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $$
DECLARE
  v_attempt public.exam_attempts%rowtype;
  v_active_section uuid;
  v_sections jsonb;
  v_questions jsonb;
  v_answered integer;
  v_total_questions integer;
BEGIN
  SELECT
    *
  INTO
    v_attempt
  FROM
    public.exam_attempts
  WHERE
    id = p_attempt_id
    AND user_id = p_user_id;
  IF NOT found THEN
    RAISE EXCEPTION 'Attempt not found';
  END IF;

  SELECT
    section_id
  INTO
    v_active_section
  FROM
    public.attempt_section_states
  WHERE
    attempt_id = p_attempt_id
    AND status = 'active'
  LIMIT 1;

  SELECT
    coalesce(jsonb_agg(jsonb_build_object('sectionId', ass.section_id, 'title', es.title, 'subjectCode', s.code, 'sortOrder', es.sort_order, 'status', ass.status, 'questionCount', es.question_count, 'durationSeconds', es.duration_seconds, 'startedAt', ass.started_at, 'deadlineAt', ass.deadline_at, 'remainingSeconds', CASE WHEN ass.status = 'active'
            AND ass.deadline_at IS NOT NULL THEN
            greatest (0, floor(extract(epoch FROM (ass.deadline_at - now())))::integer)
          WHEN ass.status = 'completed' THEN
            0
          ELSE
            NULL
          END, 'durationUsedSeconds', ass.duration_used_seconds)
      ORDER BY es.sort_order), '[]'::jsonb)
  INTO
    v_sections
  FROM
    public.attempt_section_states ass
    JOIN public.exam_sections es ON es.id = ass.section_id
    LEFT JOIN public.subjects s ON s.id = es.subject_id
  WHERE
    ass.attempt_id = p_attempt_id;

  IF v_active_section IS NOT NULL THEN
    SELECT
      coalesce(jsonb_agg(jsonb_build_object('attemptQuestionId', aq.id, 'position', aq.position, 'question', aq.question_snapshot -> 'question', 'stimulus', aq.question_snapshot -> 'stimulus', 'knowledgeNodes', aq.question_snapshot -> 'knowledge_nodes', 'options', coalesce((
              SELECT
                jsonb_agg(o - 'is_correct' - 'score' ORDER BY (o ->> 'sort_order')::integer)
              FROM jsonb_array_elements(aq.question_snapshot -> 'options') o), '[]'::jsonb), 'answer', jsonb_build_object('selectedOptionId', aa.selected_option_id, 'selectedOptionIds', coalesce((
              SELECT
                jsonb_agg(aao.option_id)
              FROM public.attempt_answer_options aao
              WHERE
                aao.attempt_answer_id = aa.id), '[]'::jsonb), 'answerValue', aa.answer_value, 'isFlagged', coalesce(aa.is_flagged, FALSE), 'timeSpentSeconds', coalesce(aa.time_spent_seconds, 0)))
      ORDER BY aq.position), '[]'::jsonb)
    INTO
      v_questions
    FROM
      public.attempt_questions aq
      LEFT JOIN public.attempt_answers aa ON aa.attempt_question_id = aq.id
    WHERE
      aq.attempt_id = p_attempt_id
      AND aq.section_id = v_active_section;
  ELSE
    v_questions := '[]'::jsonb;
  END IF;

  SELECT
    count(*)
  INTO
    v_answered
  FROM
    public.attempt_answers aa
    JOIN public.attempt_questions aq ON aq.id = aa.attempt_question_id
  WHERE
    aq.attempt_id = p_attempt_id;

  SELECT
    count(*)
  INTO
    v_total_questions
  FROM
    public.attempt_questions aq
  WHERE
    aq.attempt_id = p_attempt_id;

  RETURN jsonb_build_object('attemptId', v_attempt.id, 'examId', v_attempt.exam_id, 'status', v_attempt.status, 'attemptNumber', v_attempt.attempt_number, 'startedAt', v_attempt.started_at, 'activeSectionId', v_active_section, 'answeredCount', v_answered, 'totalQuestions', v_total_questions, 'sections', v_sections, 'questions', v_questions);
END;
$$;

-- Do not replace frozen Mini items after learners have started an attempt.
DO $$
BEGIN
  IF EXISTS (
    SELECT
      1
    FROM
      public.exam_attempts ea
      JOIN public.exams e ON e.id = ea.exam_id
    WHERE
      e.slug IN ('tka-smp-mini-bahasa-indonesia', 'tka-smp-mini-matematika')) THEN
  RAISE EXCEPTION 'TKA SMP Mini exams already have attempts; frozen item replacement is blocked';
END IF;
END;
$$;

-- Final Milestone 2 Mini product spec:
-- 15 questions / 35 minutes / one free attempt. Monetization remains Milestone 4.
UPDATE
  public.exams e
SET
  duration_seconds = 2100,
  attempt_limit = 1,
  question_order = 'randomized',
  result_visibility = 'instant',
  status = 'active',
  blueprint_id = (
    SELECT
      full_exam.blueprint_id
    FROM
      public.exams full_exam
    WHERE
      full_exam.slug = 'tka-smp-full'), description = CASE e.slug
  WHEN 'tka-smp-mini-bahasa-indonesia' THEN
    'Mini Tryout TKA SMP Bahasa Indonesia: 15 soal / 35 menit, blueprint internal 5 Tekstual + 5 Inferensial + 5 Evaluasi/Apresiasi. Satu percobaan gratis pada Core Product; Tempur Pass diaktifkan pada Milestone 4.'
  WHEN 'tka-smp-mini-matematika' THEN
    'Mini Tryout TKA SMP Matematika: 15 soal / 35 menit, blueprint internal 5 Pengetahuan/Pemahaman + 5 Aplikasi + 5 Penalaran. Satu percobaan gratis pada Core Product; Tempur Pass diaktifkan pada Milestone 4.'
  ELSE
    e.description
  END, updated_at = now()
WHERE
  e.slug IN ('tka-smp-mini-bahasa-indonesia', 'tka-smp-mini-matematika');

UPDATE
  public.exam_sections es
SET
  question_count = 15,
  duration_seconds = 2100,
  config = coalesce(es.config, '{}'::jsonb) || CASE s.code
  WHEN 'BIN' THEN
    jsonb_build_object('milestone2Spec', 'TKA-SMP-MINI-BIN-V1', 'questionCount', 15, 'durationSeconds', 2100, 'cognitiveQuota', jsonb_build_object('Pemahaman Tekstual', 5, 'Pemahaman Inferensial', 5, 'Evaluasi dan Apresiasi', 5), 'questionSource', 'frozen_full_tryout_reviewed_pool', 'commerceEnforced', FALSE)
  WHEN 'MAT' THEN
    jsonb_build_object('milestone2Spec', 'TKA-SMP-MINI-MAT-V1', 'questionCount', 15, 'durationSeconds', 2100, 'cognitiveQuota', jsonb_build_object('Pengetahuan dan Pemahaman', 5, 'Aplikasi', 5, 'Penalaran', 5), 'questionSource', 'frozen_full_tryout_reviewed_pool', 'commerceEnforced', FALSE)
  ELSE
    '{}'::jsonb
  END
FROM
  public.exams e,
  public.subjects s
WHERE
  es.exam_id = e.id
  AND s.id = es.subject_id
  AND e.slug IN ('tka-smp-mini-bahasa-indonesia', 'tka-smp-mini-matematika');

DELETE FROM public.exam_question_items eqi USING public.exams e
WHERE eqi.exam_id = e.id
  AND e.slug IN ('tka-smp-mini-bahasa-indonesia', 'tka-smp-mini-matematika');

WITH chosen (
  question_code,
  mini_slug,
  mini_position
) AS (
  VALUES ('SMP26-S300-BIN-076', 'tka-smp-mini-bahasa-indonesia', 1),
    ('SMP26-S300-BIN-052', 'tka-smp-mini-bahasa-indonesia', 2),
    ('SMP26-S300-BIN-073', 'tka-smp-mini-bahasa-indonesia', 3),
    ('SMP26-S300-BIN-011', 'tka-smp-mini-bahasa-indonesia', 4),
    ('SMP26-S300-BIN-013', 'tka-smp-mini-bahasa-indonesia', 5),
    ('SMP26-S120-BIN-011', 'tka-smp-mini-bahasa-indonesia', 6),
    ('SMP26-S300-BIN-023', 'tka-smp-mini-bahasa-indonesia', 7),
    ('SMP26-S300-BIN-027', 'tka-smp-mini-bahasa-indonesia', 8),
    ('SMP26-S300-BIN-072', 'tka-smp-mini-bahasa-indonesia', 9),
    ('SMP26-S300-BIN-083', 'tka-smp-mini-bahasa-indonesia', 10),
    ('SMP26-S120-BIN-035', 'tka-smp-mini-bahasa-indonesia', 11),
    ('SMP26-S120-BIN-034', 'tka-smp-mini-bahasa-indonesia', 12),
    ('SMP26-S300-BIN-024', 'tka-smp-mini-bahasa-indonesia', 13),
    ('SMP26-S300-BIN-075', 'tka-smp-mini-bahasa-indonesia', 14),
    ('SMP26-S120-BIN-033', 'tka-smp-mini-bahasa-indonesia', 15),
    ('SMP26-S300-MAT-049', 'tka-smp-mini-matematika', 1),
    ('SMP26-S300-MAT-010', 'tka-smp-mini-matematika', 2),
    ('SMP26-S120-MAT-020', 'tka-smp-mini-matematika', 3),
    ('SMP26-S120-MAT-038', 'tka-smp-mini-matematika', 4),
    ('SMP26-S300-MAT-013', 'tka-smp-mini-matematika', 5),
    ('SMP26-S300-MAT-047', 'tka-smp-mini-matematika', 6),
    ('SMP26-S120-MAT-032', 'tka-smp-mini-matematika', 7),
    ('SMP26-S300-MAT-023', 'tka-smp-mini-matematika', 8),
    ('SMP26-S300-MAT-083', 'tka-smp-mini-matematika', 9),
    ('SMP26-P01-MAT-012', 'tka-smp-mini-matematika', 10),
    ('SMP26-S300-MAT-033', 'tka-smp-mini-matematika', 11),
    ('SMP26-S120-MAT-018', 'tka-smp-mini-matematika', 12),
    ('SMP26-S120-MAT-042', 'tka-smp-mini-matematika', 13),
    ('SMP26-S300-MAT-057', 'tka-smp-mini-matematika', 14),
    ('SMP26-S120-MAT-023', 'tka-smp-mini-matematika', 15))
INSERT INTO public.exam_question_items (exam_id, section_id, question_id, question_version, position, score_weight)
SELECT
  e.id,
  es.id,
  q.id,
  q.version,
  c.mini_position,
  1
FROM
  chosen c
  JOIN public.exams e ON e.slug = c.mini_slug
  JOIN public.questions q ON q.question_code = c.question_code
    AND q.program_id = e.program_id
    AND q.track_id = e.track_id
  JOIN public.exam_sections es ON es.exam_id = e.id
    AND es.subject_id = q.subject_id
  JOIN public.question_versions qv ON qv.question_id = q.id
    AND qv.version = q.version;

-- Fail the migration if a selected code/version was missing or a section count drifted.
DO $$
DECLARE
  v_slug text;
  v_count integer;
  v_expected integer;
BEGIN
  foreach v_slug IN ARRAY ARRAY['tka-smp-mini-bahasa-indonesia', 'tka-smp-mini-matematika'] LOOP
    SELECT
      count(*)
    INTO
      v_count
    FROM
      public.exam_question_items eqi
      JOIN public.exams e ON e.id = eqi.exam_id
    WHERE
      e.slug = v_slug;

    SELECT
      coalesce(sum(es.question_count), 0)
    INTO
      v_expected
    FROM
      public.exam_sections es
      JOIN public.exams e ON e.id = es.exam_id
    WHERE
      e.slug = v_slug;

    IF v_count <> 15 OR v_expected <> 15 OR v_count <> v_expected THEN
      RAISE EXCEPTION 'Invalid frozen Mini set for %: items %, expected %', v_slug, v_count, v_expected;
    END IF;
  END LOOP;
END;
$$;
