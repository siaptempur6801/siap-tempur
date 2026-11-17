-- Schema V2 Admin CRUD QA harness
-- STAGING ONLY. Runs all writes inside a transaction and rolls them back.
-- Expected final result: admin_crud_database_qa = PASS.
BEGIN;
DO $$
DECLARE
  v_program uuid;
  v_track uuid;
  v_event_type uuid;
  v_twk uuid;
  v_actor uuid;
  v_product uuid;
  v_exam uuid;
  v_section uuid;
  v_event uuid;
  v_session uuid;
  v_question uuid;
  v_count int;
  v_paid_order uuid;
  v_payment uuid;
BEGIN
  IF to_regclass('public.test_sessions') IS NOT NULL THEN
    RAISE EXCEPTION 'QA_ADMIN_V2_REFUSES_LEGACY_DATABASE';
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
    v_twk
  FROM
    public.subjects
  WHERE
    track_id = v_track
    AND code = 'TWK';
  SELECT
    p.id
  INTO
    v_actor
  FROM
    public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id
    JOIN public.roles r ON r.id = ur.role_id
  WHERE
    r.code IN ('ADMIN', 'SUPER_ADMIN')
  ORDER BY
    CASE WHEN r.code = 'ADMIN' THEN
      0
    ELSE
      1
    END
  LIMIT 1;

  IF v_program IS NULL OR v_track IS NULL OR v_event_type IS NULL OR v_twk IS NULL OR v_actor IS NULL THEN
    RAISE EXCEPTION 'QA_ADMIN_V2_CATALOG_OR_ACTOR_MISSING';
  END IF;
  -- PRODUCT
  INSERT INTO public.products (code, name, description, product_type, program_id, track_id, status)
    VALUES ('QA_ADMIN_CRUD_PRODUCT', '[QA] Admin CRUD Product', 'create', 'EVENT_TICKET', v_program, v_track, 'active')
  RETURNING
    id
  INTO
    v_product;
  INSERT INTO public.product_prices (product_id, currency, amount, starts_at, status)
    VALUES (v_product, 'IDR', 12345, now(), 'active');
  UPDATE
    public.products
  SET
    name = '[QA] Admin CRUD Product Updated',
    description = 'updated',
    updated_at = now()
  WHERE
    id = v_product;
  SELECT
    count(*)
  INTO
    v_count
  FROM
    public.products p
    JOIN public.product_prices pp ON pp.product_id = p.id
  WHERE
    p.id = v_product
    AND p.name LIKE '%Updated'
    AND pp.amount = 12345;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'QA_PRODUCT_CRUD_FAILED';
  END IF;
  -- EXAM
  INSERT INTO public.exams (program_id, track_id, exam_type_id, title, slug, duration_seconds, attempt_limit, question_order, result_visibility, access_type, status, created_by, token_cost)
    VALUES (v_program, v_track, v_event_type, '[QA] Admin CRUD Exam', 'qa-admin-crud-exam', 3600, 1, 'random', 'instant', 'FREE', 'draft', v_actor, 0)
  RETURNING
    id
  INTO
    v_exam;
  INSERT INTO public.exam_sections (exam_id, subject_id, title, sort_order, question_count, duration_seconds, config)
    VALUES (v_exam, v_twk, 'TWK QA', 1, 5, 600, '{"passing_score":65}')
  RETURNING
    id
  INTO
    v_section;
  UPDATE
    public.exams
  SET
    title = '[QA] Admin CRUD Exam Updated',
    status = 'active',
    updated_at = now()
  WHERE
    id = v_exam;
  UPDATE
    public.exam_sections
  SET
    question_count = 6
  WHERE
    id = v_section;
  SELECT
    count(*)
  INTO
    v_count
  FROM
    public.exams e
    JOIN public.exam_sections es ON es.exam_id = e.id
  WHERE
    e.id = v_exam
    AND e.title LIKE '%Updated'
    AND e.status = 'active'
    AND es.question_count = 6;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'QA_EXAM_CRUD_FAILED';
  END IF;
  -- EVENT
  INSERT INTO public.events (code, title, slug, event_type, program_id, track_id, registration_start, registration_end, starts_at, ends_at, status)
    VALUES ('QA-ADMIN-CRUD-EVENT', '[QA] Admin CRUD Event', 'qa-admin-crud-event', 'tryout_akbar', v_program, v_track, now() - interval '1 hour', now() + interval '1 hour', now(), now() + interval '3 hours', 'draft')
  RETURNING
    id
  INTO
    v_event;
  INSERT INTO public.event_sessions (event_id, exam_id, name, starts_at, ends_at, capacity, status)
    VALUES (v_event, v_exam, 'QA Session', now(), now() + interval '2 hours', 50, 'scheduled')
  RETURNING
    id
  INTO
    v_session;
  INSERT INTO public.event_products (product_id, event_id, session_id, status)
    VALUES (v_product, v_event, v_session, 'active');
  UPDATE
    public.events
  SET
    title = '[QA] Admin CRUD Event Updated',
    status = 'live'
  WHERE
    id = v_event;
  UPDATE
    public.event_sessions
  SET
    capacity = 75,
    status = 'live'
  WHERE
    id = v_session;
  SELECT
    count(*)
  INTO
    v_count
  FROM
    public.events ev
    JOIN public.event_sessions es ON es.event_id = ev.id
    JOIN public.event_products ep ON ep.event_id = ev.id
  WHERE
    ev.id = v_event
    AND ev.title LIKE '%Updated'
    AND es.capacity = 75
    AND ep.product_id = v_product;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'QA_EVENT_CRUD_FAILED';
  END IF;
  -- QUESTION + VERSION + OPTION REPLACEMENT
  INSERT INTO public.questions (question_code, program_id, track_id, subject_id, question_type, stem, difficulty, source_type, source_reference, status, version, author_id)
    VALUES ('QA-ADMIN-CRUD-Q', v_program, v_track, v_twk, 'single_choice', 'QA question original?', 'medium', 'internal', 'qa-admin-crud', 'draft', 1, v_actor)
  RETURNING
    id
  INTO
    v_question;
  INSERT INTO public.question_options (question_id, option_key, content, is_correct, score, sort_order)
  VALUES
    (v_question, 'A', 'Jawaban benar', TRUE, 5, 1),
    (v_question, 'B', 'Jawaban salah', FALSE, 0, 2),
    (v_question, 'C', 'Opsi akan dihapus', FALSE, 0, 3);
  INSERT INTO public.question_versions (question_id, version, snapshot, changed_by, change_reason)
  SELECT
    v_question,
    1,
    jsonb_build_object('question', to_jsonb (q), 'options', (
        SELECT
          jsonb_agg(to_jsonb (o)
        ORDER BY o.sort_order)
        FROM public.question_options o
        WHERE
          o.question_id = v_question)),
    v_actor,
    'QA edit'
  FROM
    public.questions q
  WHERE
    q.id = v_question;
  UPDATE
    public.questions
  SET
    stem = 'QA question updated?',
    version = 2,
    updated_at = now()
  WHERE
    id = v_question;
  UPDATE
    public.question_options
  SET
    content = 'Jawaban benar updated'
  WHERE
    question_id = v_question
    AND option_key = 'A';
  DELETE FROM public.question_options
  WHERE question_id = v_question
    AND option_key = 'C';
  SELECT
    count(*)
  INTO
    v_count
  FROM
    public.question_options
  WHERE
    question_id = v_question;
  IF v_count <> 2 THEN
    RAISE EXCEPTION 'QA_QUESTION_OPTION_REPLACEMENT_FAILED';
  END IF;
  SELECT
    count(*)
  INTO
    v_count
  FROM
    public.question_versions
  WHERE
    question_id = v_question
    AND version = 1;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'QA_QUESTION_VERSION_FAILED';
  END IF;
  -- COMMERCE READ MODEL
  SELECT
    o.id,
    p.id
  INTO
    v_paid_order,
    v_payment
  FROM
    public.orders o
    JOIN public.payments p ON p.order_id = o.id
  WHERE
    lower(o.status) = 'paid'
    AND lower(p.status) IN ('settlement', 'capture')
  ORDER BY
    o.paid_at DESC nulls LAST
  LIMIT 1;
  IF v_paid_order IS NULL OR v_payment IS NULL THEN
    RAISE EXCEPTION 'QA_COMMERCE_MONITOR_FAILED';
  END IF;
  -- ARCHIVE
  UPDATE
    public.products
  SET
    status = 'archived',
    updated_at = now()
  WHERE
    id = v_product;
  UPDATE
    public.events
  SET
    status = 'archived'
  WHERE
    id = v_event;
  UPDATE
    public.exams
  SET
    status = 'archived',
    updated_at = now()
  WHERE
    id = v_exam;
  UPDATE
    public.questions
  SET
    status = 'archived',
    updated_at = now()
  WHERE
    id = v_question;

  SELECT
    count(*)
  INTO
    v_count
  FROM
    public.products
  WHERE
    id = v_product
    AND status = 'archived';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'QA_PRODUCT_ARCHIVE_FAILED';
  END IF;
  SELECT
    count(*)
  INTO
    v_count
  FROM
    public.events
  WHERE
    id = v_event
    AND status = 'archived';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'QA_EVENT_ARCHIVE_FAILED';
  END IF;
  SELECT
    count(*)
  INTO
    v_count
  FROM
    public.exams
  WHERE
    id = v_exam
    AND status = 'archived';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'QA_EXAM_ARCHIVE_FAILED';
  END IF;
  SELECT
    count(*)
  INTO
    v_count
  FROM
    public.questions
  WHERE
    id = v_question
    AND status = 'archived';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'QA_QUESTION_ARCHIVE_FAILED';
  END IF;
END
$$;
ROLLBACK;
SELECT
  'PASS' AS admin_crud_database_qa,
  now() AS checked_at;
