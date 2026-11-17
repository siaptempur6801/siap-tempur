-- Staging-only canonical Event / Tryout Akbar QA seed.
-- Requires the existing Schema V2 CPNS QA bank and dirga@siaptempur.id staging account.
DO $$
DECLARE
  v_program uuid;
  v_track uuid;
  v_event_type uuid;
  v_user uuid;
  v_exam uuid;
  v_source_exam uuid;
  v_event uuid;
  v_start timestamptz := now() - interval '10 minutes';
  v_end timestamptz := now() + interval '6 hours';
BEGIN
  IF to_regclass('public.test_sessions') IS NOT NULL THEN
    RAISE EXCEPTION 'Refusing Schema V2 Event QA seed: legacy test_sessions exists';
  END IF;

  SELECT
    id
  INTO
    v_program
  FROM
    public.programs
  WHERE
    code = 'CPNS';
  SELECT
    id
  INTO
    v_track
  FROM
    public.tracks
  WHERE
    program_id = v_program
    AND code = 'SKD';
  SELECT
    id
  INTO
    v_event_type
  FROM
    public.exam_types
  WHERE
    code = 'EVENT';
  SELECT
    id
  INTO
    v_user
  FROM
    auth.users
  WHERE
    email = 'dirga@siaptempur.id'
  LIMIT 1;
  SELECT
    id
  INTO
    v_source_exam
  FROM
    public.exams
  WHERE
    slug = 'qa-cpns-full-skd'
  LIMIT 1;

  IF v_program IS NULL OR v_track IS NULL OR v_event_type IS NULL OR v_user IS NULL OR v_source_exam IS NULL THEN
    RAISE EXCEPTION 'QA_EVENT_SEED_DEPENDENCY_MISSING';
  END IF;

  INSERT INTO public.exams (program_id, track_id, exam_type_id, title, slug, description, duration_seconds, attempt_limit, question_order, result_visibility, access_type, status, starts_at, ends_at, created_by, required_feature_id, token_cost)
    VALUES (v_program, v_track, v_event_type, '[QA] Tryout Akbar Schema V2', 'qa-event-tryout-akbar-schema-v2', 'QA event canonical Schema V2 - staging only', 6000, 1, 'random', 'instant', 'FREE', 'active', v_start, v_end, v_user, NULL, 0)
  ON CONFLICT (slug)
    DO UPDATE SET
      title = excluded.title,
      description = excluded.description,
      duration_seconds = excluded.duration_seconds,
      attempt_limit = excluded.attempt_limit,
      question_order = excluded.question_order,
      result_visibility = excluded.result_visibility,
      access_type = excluded.access_type,
      status = excluded.status,
      starts_at = excluded.starts_at,
      ends_at = excluded.ends_at,
      required_feature_id = NULL,
      token_cost = 0,
      updated_at = now()
    RETURNING
      id
    INTO
      v_exam;

  IF NOT EXISTS (
    SELECT
      1
    FROM
      public.exam_sections
    WHERE
      exam_id = v_exam) THEN
  INSERT INTO public.exam_sections (exam_id, subject_id, title, question_count, sort_order, config)
  SELECT
    v_exam,
    subject_id,
    title,
    question_count,
    sort_order,
    config
  FROM
    public.exam_sections
  WHERE
    exam_id = v_source_exam
  ORDER BY
    sort_order;
END IF;

  INSERT INTO public.events (code, title, slug, event_type, program_id, track_id, description, registration_start, registration_end, starts_at, ends_at, status)
    VALUES ('QA-AKBAR-V2', '[QA] Tryout Akbar Schema V2', 'qa-tryout-akbar-schema-v2', 'tryout_akbar', v_program, v_track, 'Event QA gratis untuk validasi lifecycle Schema V2.', now() - interval '1 hour', now() + interval '4 hours', v_start, v_end, 'live')
  ON CONFLICT (code)
    DO UPDATE SET
      title = excluded.title,
      description = excluded.description,
      registration_start = excluded.registration_start,
      registration_end = excluded.registration_end,
      starts_at = excluded.starts_at,
      ends_at = excluded.ends_at,
      status = 'live'
    RETURNING
      id
    INTO
      v_event;

  IF EXISTS (
    SELECT
      1
    FROM
      public.event_sessions
    WHERE
      event_id = v_event) THEN
  UPDATE
    public.event_sessions
  SET
    exam_id = v_exam,
    name = 'Sesi QA Utama',
    starts_at = v_start,
    ends_at = v_end,
    capacity = 500,
    status = 'live'
  WHERE
    event_id = v_event;
ELSE
  INSERT INTO public.event_sessions (event_id, exam_id, name, starts_at, ends_at, capacity, status)
    VALUES (v_event, v_exam, 'Sesi QA Utama', v_start, v_end, 500, 'live');
END IF;
END
$$;
