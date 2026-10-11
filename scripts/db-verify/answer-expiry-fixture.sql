-- Staging-only functional test: one owned disposable CI user, one question.
-- Requires psql -v fixture_user_id=<fresh ci-cpns-expiry-* user UUID>.
-- The caller must confirm project lpgrivowdcepcxradavu; never run on production.
-- No scoring/submission function is called. Every synthetic row rolls back.
BEGIN;
SELECT
  set_config('optimization.expiry_fixture_user', :'fixture_user_id', TRUE);
DO $fixture$
DECLARE
  learner uuid := current_setting('optimization.expiry_fixture_user')::uuid;
  exam uuid;
  question uuid;
  options uuid[];
  attempt uuid;
  allocated uuid;
BEGIN
  IF NOT EXISTS (
    SELECT
      1
    FROM
      auth.users
    WHERE
      id = learner
      AND email LIKE 'ci-cpns-expiry-%@example.invalid'
      AND raw_user_meta_data -> 'ci_e2e' = 'true'::jsonb)
    OR EXISTS (
      SELECT
        1
      FROM
        public.exam_attempts
      WHERE
        user_id = learner) THEN
    RAISE EXCEPTION 'Requires a fresh owned disposable ci-cpns-expiry user';
END IF;
  SELECT
    e.id
  INTO
    exam
  FROM
    public.exams e
    JOIN public.programs p ON p.id = e.program_id
  WHERE
    upper(p.code) = 'CPNS'
    AND lower(e.status) = 'active'
  ORDER BY
    e.id
  LIMIT 1;
  SELECT
    qo.question_id,
    array_agg(qo.id ORDER BY qo.id)
  INTO
    question,
    options
  FROM
    public.question_options qo
    JOIN public.questions q ON q.id = qo.question_id
    JOIN public.programs p ON p.id = q.program_id
  WHERE
    upper(p.code) = 'CPNS'
    AND lower(q.status) = 'published'
  GROUP BY
    qo.question_id
  HAVING
    count(*) >= 2
  ORDER BY
    qo.question_id
  LIMIT 1;
  IF exam IS NULL OR question IS NULL THEN
    RAISE EXCEPTION 'Missing CPNS fixture catalog';
  END IF;
  INSERT INTO public.exam_attempts (exam_id, user_id, attempt_number, status, started_at, metadata)
    VALUES (exam, learner, 1, 'in_progress', now(), ' {"durationSeconds":60}'::jsonb)
  RETURNING
    id
  INTO
    attempt;
  INSERT INTO public.attempt_questions (attempt_id, question_id, question_version, position, question_snapshot)
    VALUES (attempt, question, 1, 1, '{}'::jsonb)
  RETURNING
    id
  INTO
    allocated;
  PERFORM
    set_config('optimization.expiry_attempt', attempt::text, TRUE);
  PERFORM
    set_config('optimization.expiry_question', question::text, TRUE);
  PERFORM
    set_config('optimization.expiry_allocated', allocated::text, TRUE);
  PERFORM
    set_config('optimization.expiry_options', options::text, TRUE);
END;
$fixture$;
SET LOCAL ROLE service_role;
DO $verify$
DECLARE
  learner uuid := current_setting('optimization.expiry_fixture_user')::uuid;
  attempt uuid := current_setting('optimization.expiry_attempt')::uuid;
  question uuid := current_setting('optimization.expiry_question')::uuid;
  allocated uuid := current_setting('optimization.expiry_allocated')::uuid;
  options uuid[] := current_setting('optimization.expiry_options')::uuid[];
  accepted jsonb;
  rejected boolean := FALSE;
  result jsonb;
  wallet_before numeric;
BEGIN
  SELECT
    balance
  INTO
    wallet_before
  FROM
    public.wallets
  WHERE
    user_id = learner
    AND wallet_type = 'exam_token_cpns';
  IF wallet_before IS NULL THEN
    RAISE EXCEPTION 'Missing disposable CPNS wallet';
  END IF;
  result := public.save_attempt_answer_for_user (learner, attempt, question, ARRAY[options[1]]);
  IF result -> 'saved' IS DISTINCT FROM 'true'::jsonb THEN
    RAISE EXCEPTION 'Initial acknowledgement failed';
  END IF;
  SELECT
    to_jsonb (aa)
  INTO
    accepted
  FROM
    public.attempt_answers aa
  WHERE
    attempt_question_id = allocated;
  -- A lost HTTP response can retry an accepted answer: no duplicate rows/debit.
  PERFORM
    public.save_attempt_answer_for_user (learner, attempt, question, ARRAY[options[1]]);
  IF (
    SELECT
      count(*)
    FROM
      public.attempt_answers
    WHERE
      attempt_question_id = allocated) <> 1 OR (
  SELECT
    to_jsonb (aa)
  FROM
    public.attempt_answers aa
  WHERE
    attempt_question_id = allocated) IS DISTINCT FROM accepted THEN
    RAISE EXCEPTION 'Acknowledged retry changed answer or created duplicate';
  END IF;
  -- Expire ONLY this transaction's synthetic attempt, after acknowledgement.
  UPDATE
    public.exam_attempts
  SET
    started_at = now() - interval '1 day'
  WHERE
    id = attempt;
  BEGIN
    PERFORM
      public.save_attempt_answer_for_user (learner, attempt, question, ARRAY[options[2]]);
  EXCEPTION
    WHEN raise_exception THEN
      IF position('[ATTEMPT_TIME_EXPIRED]' IN SQLERRM) = 0 THEN
        RAISE;
        END IF;
        rejected := TRUE;
  END;
  IF NOT rejected THEN
    RAISE EXCEPTION 'Expired edit was accepted';
    END IF;
    IF (
      SELECT
        to_jsonb (aa)
      FROM
        public.attempt_answers aa
      WHERE
        attempt_question_id = allocated) IS DISTINCT FROM accepted THEN
      RAISE EXCEPTION 'Expired edit modified acknowledged answer/scoring columns';
      END IF;
      UPDATE
        public.exam_attempts
      SET
        status = 'completed'
      WHERE
        id = attempt;
        rejected := FALSE;
        BEGIN
          PERFORM
            public.save_attempt_answer_for_user (learner, attempt, question, ARRAY[options[2]]);
        EXCEPTION
          WHEN raise_exception THEN
            IF position('[EXAM_CONFIGURATION_ERROR]' IN SQLERRM) = 0 THEN
              RAISE;
              END IF;
              rejected := TRUE;
        END;
        IF NOT rejected THEN
          RAISE EXCEPTION 'Completed attempt accepted an edit';
          END IF;
          IF (
            SELECT
              to_jsonb (aa)
            FROM
              public.attempt_answers aa
            WHERE
              attempt_question_id = allocated) IS DISTINCT FROM accepted OR (
          SELECT
            balance
          FROM
            public.wallets
          WHERE
            user_id = learner AND wallet_type = 'exam_token_cpns') IS DISTINCT FROM wallet_before THEN
            RAISE EXCEPTION 'Acknowledged state or wallet changed';
            END IF;
            PERFORM
              set_config('optimization.expiry_result', 'PASS: acknowledgement, duplicate retry, expired edit rejection, completed edit rejection, answer/scoring columns and wallet preserved', TRUE);
END;
$verify$;
SELECT
  current_setting('optimization.expiry_result') AS result;
ROLLBACK;
