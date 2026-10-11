-- Staging-only transaction. All synthetic attempts roll back, including triggers.
-- Run as a privileged SQL connection on verified staging. Uses a disposable CI
-- user, never a real learner; requires that the user has no existing attempts.
BEGIN;
DO $$
DECLARE
  u uuid;
  e uuid;
  other_user uuid;
  totals record;
  q uuid;
  a uuid;
  opt uuid;
  result record;
BEGIN
  SELECT
    id
  INTO
    u
  FROM
    auth.users
  WHERE
    email LIKE 'ci-tka-optimization-%@example.invalid'
  ORDER BY
    created_at DESC
  LIMIT 1;
  IF u IS NULL OR EXISTS (
    SELECT
      1
    FROM
      public.exam_attempts
    WHERE
      user_id = u) THEN
    RAISE EXCEPTION 'Requires fresh disposable optimization TKA user';
  END IF;
  PERFORM
    set_config('optimization.fixture_user', u::text, TRUE);
  SELECT
    id
  INTO
    e
  FROM
    public.exams
  ORDER BY
    id
  LIMIT 1;
  -- > PostgREST's default 1000-row cap; fractional/negative scores, every XP
  -- minimum, invalid metadata type, and both case variants of completion.
  INSERT INTO public.exam_attempts (exam_id, user_id, attempt_number, status, total_score, metadata)
  SELECT
    e,
    u,
    n,
    CASE WHEN n % 2 = 0 THEN
      'COMPLETED'
    ELSE
      'completed'
    END,
    CASE WHEN n % 5 = 0 THEN
      NULL
    WHEN n % 5 = 1 THEN
      -2
    WHEN n % 5 = 2 THEN
      12.99
    WHEN n % 5 = 3 THEN
      40.99
    ELSE
      0
    END,
    CASE n % 6
    WHEN 0 THEN
      '{"practiceKind":"drill"}'::jsonb
    WHEN 1 THEN
      '{"practiceKind":"mini_tryout"}'::jsonb
    WHEN 2 THEN
      '{"practiceKind":"full_tryout"}'::jsonb
    WHEN 3 THEN
      '{"practiceKind":"event"}'::jsonb
    WHEN 4 THEN
      '{"practiceKind":42}'::jsonb
    ELSE
      '{}'::jsonb
    END
  FROM
    generate_series(1, 1005) n;
  SELECT
    *
  INTO
    totals
  FROM
    public.practice_completed_attempt_totals (u);
  IF totals.total_sessions <> 1005 OR totals.total_xp <> (
    SELECT
      sum(greatest (greatest (0, floor(coalesce(total_score, 0))), CASE metadata ->> 'practiceKind'
WHEN 'mini_tryout' THEN
  20
WHEN 'full_tryout' THEN
  30
WHEN 'event' THEN
  30
ELSE
  10
END))
    FROM
      public.exam_attempts
    WHERE
      user_id = u) THEN
  RAISE EXCEPTION 'XP/count parity failed';
  END IF;
  PERFORM
    set_config('optimization.fixture_xp', totals.total_xp::text, TRUE);
  INSERT INTO public.exam_attempts (exam_id, user_id, attempt_number, status, metadata, updated_at)
  VALUES
    (e, u, 1006, 'in_progress', jsonb_build_object('accessContext', 'event', 'eventId', gen_random_uuid ()), now()),
    (e, u, 1007, 'in_progress', '{"accessContext":"direct"}', now() + interval '1 second'),
    (e, u, 1008, 'submitted', '{"accessContext":"organization"}', now() + interval '2 seconds');
  PERFORM
    set_config('request.jwt.claim.sub', u::text, TRUE);
  SELECT
    *
  INTO
    result
  FROM
    public.learner_exam_attempt_summaries (ARRAY[e], FALSE);
  IF result.attempt_count <> 1008 OR result.active_attempt_id IS DISTINCT FROM (
    SELECT
      id
    FROM
      public.exam_attempts
    WHERE
      user_id = u AND attempt_number = 1007) THEN
    RAISE EXCEPTION 'All-context count/active parity failed';
  END IF;
  SELECT
    *
  INTO
    result
  FROM
    public.learner_exam_attempt_summaries (ARRAY[e], TRUE);
  IF result.attempt_count <> 1006 THEN
    RAISE EXCEPTION 'Direct-only quota parity failed';
  END IF;
  SELECT
    id
  INTO
    a
  FROM
    public.exam_attempts
  WHERE
    user_id = u
    AND attempt_number = 1007;
  SELECT
    id
  INTO
    q
  FROM
    public.questions
  ORDER BY
    id
  LIMIT 1;
  INSERT INTO public.attempt_questions (attempt_id, question_id, question_version, position, question_snapshot, max_score)
  SELECT
    a,
    q,
    1,
    n,
    '{}',
    5
  FROM
    generate_series(1, 1005) n;
  SELECT
    id
  INTO
    opt
  FROM
    public.question_options
  WHERE
    question_id = q
  ORDER BY
    id
  LIMIT 1;
  INSERT INTO public.attempt_answers (attempt_question_id, selected_option_id, answered_at)
  SELECT
    id,
    CASE WHEN position = 1 THEN
      opt
    ELSE
      NULL
    END,
    now()
  FROM
    public.attempt_questions
  WHERE
    attempt_id = a
    AND position IN (1, 2);
  SELECT
    *
  INTO
    result
  FROM
    public.practice_active_attempt_overviews (u)
  WHERE
    id = a;
  IF result.question_count <> 1005 OR result.answered_questions <> 1 THEN
    RAISE EXCEPTION 'Active question count parity failed';
  END IF;
  SELECT
    id
  INTO
    other_user
  FROM
    auth.users
  WHERE
    id <> u
  ORDER BY
    id
  LIMIT 1;
  PERFORM
    set_config('request.jwt.claim.sub', other_user::text, TRUE);
  IF EXISTS (
    SELECT
      1
    FROM
      public.learner_exam_attempt_summaries (ARRAY[e], FALSE)
    WHERE
      active_attempt_id = a) THEN
  RAISE EXCEPTION 'Cross-user leak';
END IF;
END
$$;
-- The same call under the actual learner role enforces both RLS and auth.uid().
SELECT
  set_config('request.jwt.claim.sub', current_setting('optimization.fixture_user'), TRUE);
SET local ROLE authenticated;
DO $$
DECLARE
  totals record;
BEGIN
  SELECT
    *
  INTO
    totals
  FROM
    public.learner_completed_attempt_totals ();
  IF totals.total_sessions <> 1005 OR totals.total_xp <> current_setting('optimization.fixture_xp')::bigint THEN
    RAISE EXCEPTION 'Authenticated reward XP/count parity failed';
  END IF;
  PERFORM
    set_config('request.jwt.claim.sub', gen_random_uuid ()::text, TRUE);
  SELECT
    *
  INTO
    totals
  FROM
    public.learner_completed_attempt_totals ();
  IF totals.total_sessions <> 0 OR totals.total_xp <> 0 THEN
    RAISE EXCEPTION 'Cross-user reward leak';
  END IF;
END
$$;
SELECT
  *
FROM
  public.learner_exam_attempt_summaries ('{}'::uuid[], FALSE);
ROLLBACK;
