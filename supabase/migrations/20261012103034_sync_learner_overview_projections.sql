-- Reconcile read-only learner projections across staging and production.
-- Replays the canonical read models and the reviewed staging compatibility names.
-- No attempts, scores, entitlements, wallets, or user rows are written.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
-- Read projections only. Apply and verify on staging before deploying callers.
-- Privileged CPNS projections retain server-side authorization at their callers;
-- TKA quota summaries always use auth.uid() and the caller's existing RLS.
CREATE OR REPLACE FUNCTION public.practice_completed_attempt_totals (p_user_id uuid)
  RETURNS TABLE (
    total_sessions bigint,
    total_xp bigint)
  LANGUAGE sql
  STABLE
  SECURITY INVOKER
  SET search_path = ''
  AS $$
  SELECT
    count(*),
    coalesce(sum(greatest (
          CASE WHEN ea.total_score IS NULL
            OR ea.total_score::text IN ('NaN', 'Infinity', '-Infinity') THEN
            0
          ELSE
            greatest (0, floor(ea.total_score))
          END, CASE WHEN jsonb_typeof(ea.metadata -> 'practiceKind') = 'string' THEN
            CASE ea.metadata ->> 'practiceKind'
            WHEN 'mini_tryout' THEN
              20
            WHEN 'full_tryout' THEN
              30
            WHEN 'event' THEN
              30
            ELSE
              10
          END
          ELSE
            10
          END)), 0)::bigint
  FROM
    public.exam_attempts ea
  WHERE
    ea.user_id = p_user_id
    AND ea.status IN ('completed', 'COMPLETED');
$$;
CREATE OR REPLACE FUNCTION public.practice_active_attempt_overviews (p_user_id uuid)
  RETURNS TABLE (
    id uuid,
    exam_id uuid,
    started_at timestamptz,
    last_saved_at timestamptz,
    last_question_position integer,
    metadata jsonb,
    question_count bigint,
    answered_questions bigint)
  LANGUAGE sql
  STABLE
  SECURITY INVOKER
  SET search_path = ''
  AS $$
  WITH active AS MATERIALIZED (
    SELECT
      ea.id,
      ea.exam_id,
      ea.started_at,
      ea.last_saved_at,
      ea.last_question_position,
      ea.metadata
    FROM
      public.exam_attempts ea
    WHERE
      ea.user_id = p_user_id
      AND ea.status IN (
        'in_progress', 'IN_PROGRESS', 'created', 'CREATED'
)
    ORDER BY
      ea.last_saved_at DESC nulls LAST
    LIMIT 30
)
SELECT
  a.*,
  progress.question_count,
  progress.answered_questions
FROM
  active a
  CROSS JOIN LATERAL (
    SELECT
      count(*) AS question_count,
      count(aa.selected_option_id) AS answered_questions
    FROM
      public.attempt_questions aq
      LEFT JOIN public.attempt_answers aa ON aa.attempt_question_id = aq.id
    WHERE
      aq.attempt_id = a.id) progress
ORDER BY
  a.last_saved_at DESC nulls LAST;
$$;
CREATE OR REPLACE FUNCTION public.learner_exam_attempt_summaries (p_exam_ids uuid[], p_direct_only boolean DEFAULT FALSE)
  RETURNS TABLE (
    exam_id uuid,
    attempt_count bigint,
    active_attempt_id uuid)
  LANGUAGE sql
  STABLE
  SECURITY INVOKER
  SET search_path = ''
  AS $$
  WITH scoped AS MATERIALIZED (
    SELECT
      ea.exam_id,
      ea.id,
      ea.status,
      ea.updated_at
    FROM
      public.exam_attempts ea
    WHERE
      ea.user_id = (
        SELECT
          auth.uid (
)
)
        AND ea.exam_id = ANY (
          p_exam_ids
)
        AND (
          NOT p_direct_only
          OR ea.metadata ->> 'accessContext' IS NULL
          OR ea.metadata ->> 'accessContext' = 'direct'
)
),
    totals AS (
      SELECT
        s.exam_id,
        count(*) AS attempt_count
      FROM
        scoped s
      GROUP BY
        s.exam_id
),
active AS (
  SELECT DISTINCT ON (s.exam_id)
    s.exam_id,
    s.id
  FROM
    scoped s
  WHERE
    lower(s.status) = 'in_progress'
  ORDER BY
    s.exam_id,
    s.updated_at DESC
)
SELECT
  t.exam_id,
  t.attempt_count,
  a.id
FROM
  totals t
  LEFT JOIN active a ON a.exam_id = t.exam_id;
$$;
REVOKE ALL ON FUNCTION public.practice_completed_attempt_totals (uuid), public.practice_active_attempt_overviews (uuid), public.learner_exam_attempt_summaries (uuid[], boolean) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.practice_completed_attempt_totals (uuid), public.practice_active_attempt_overviews (uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.learner_exam_attempt_summaries (uuid[], boolean) TO authenticated, service_role;
-- Read projections only. Apply and verify on staging before deploying callers.
-- Privileged CPNS projections retain server-side authorization at their callers;
-- TKA quota summaries always use auth.uid() and the caller's existing RLS.
CREATE OR REPLACE FUNCTION public.learner_completed_attempt_totals ()
  RETURNS TABLE (
    total_sessions bigint,
    total_xp bigint)
  LANGUAGE sql
  STABLE
  SECURITY INVOKER
  SET search_path = ''
  AS $$
  SELECT
    count(*),
    coalesce(sum(greatest (
          CASE WHEN ea.total_score IS NULL
            OR ea.total_score::text IN ('NaN', 'Infinity', '-Infinity') THEN
            0
          ELSE
            greatest (0, floor(ea.total_score))
          END, CASE WHEN jsonb_typeof(ea.metadata -> 'practiceKind') = 'string' THEN
            CASE ea.metadata ->> 'practiceKind'
            WHEN 'mini_tryout' THEN
              20
            WHEN 'full_tryout' THEN
              30
            WHEN 'event' THEN
              30
            ELSE
              10
          END
          ELSE
            10
          END)), 0)::bigint
  FROM
    public.exam_attempts ea
  WHERE
    ea.user_id = (
      SELECT
        auth.uid ())
    AND ea.status IN ('completed', 'COMPLETED');
$$;
REVOKE ALL ON FUNCTION public.learner_completed_attempt_totals () FROM public, anon;
GRANT EXECUTE ON FUNCTION public.learner_completed_attempt_totals () TO authenticated, service_role;
-- Read-only learner projections. No score, quota, entitlement or completion writes.
-- Privileged CPNS loaders already authorize the user before calling the repository.
CREATE OR REPLACE FUNCTION public.completed_attempt_totals (p_user_id uuid)
  RETURNS TABLE (
    total_sessions bigint,
    total_xp numeric)
  LANGUAGE sql
  STABLE
  SECURITY INVOKER
  SET search_path = ''
  AS $$
  SELECT
    count(*),
    coalesce(sum(greatest (
          CASE WHEN a.total_score IS NULL
            OR a.total_score::text IN ('NaN', 'Infinity', '-Infinity') THEN
            0
          ELSE
            greatest (0, floor(a.total_score))
          END, CASE WHEN jsonb_typeof(a.metadata -> 'practiceKind') = 'string' THEN
            CASE a.metadata ->> 'practiceKind'
            WHEN 'mini_tryout' THEN
              20
            WHEN 'full_tryout' THEN
              30
            WHEN 'event' THEN
              30
            ELSE
              10
          END
          ELSE
            10
          END)), 0)
  FROM
    public.exam_attempts a
  WHERE
    a.user_id = p_user_id
    AND a.status IN ('completed', 'COMPLETED');
$$;
CREATE OR REPLACE FUNCTION public.active_attempt_overview (p_user_id uuid)
  RETURNS TABLE (
    id uuid,
    exam_id uuid,
    started_at timestamptz,
    last_saved_at timestamptz,
    last_question_position integer,
    metadata jsonb,
    question_count bigint,
    answered_questions bigint)
  LANGUAGE sql
  STABLE
  SECURITY INVOKER
  SET search_path = ''
  AS $$
  SELECT
    a.id,
    a.exam_id,
    a.started_at,
    a.last_saved_at,
    a.last_question_position,
    a.metadata,
    counts.question_count,
    counts.answered_questions
  FROM (
    SELECT
      ea.*
    FROM
      public.exam_attempts ea
    WHERE
      ea.user_id = p_user_id
      AND ea.status IN ('in_progress', 'IN_PROGRESS', 'created', 'CREATED')
    ORDER BY
      ea.last_saved_at DESC nulls LAST
    LIMIT 30) a
  CROSS JOIN LATERAL (
    SELECT
      count(*) AS question_count,
      count(aa.selected_option_id) AS answered_questions
    FROM
      public.attempt_questions aq
      LEFT JOIN public.attempt_answers aa ON aa.attempt_question_id = aq.id
    WHERE
      aq.attempt_id = a.id) counts
ORDER BY
  a.last_saved_at DESC nulls LAST;
$$;
-- The current authenticated user only; RLS stays in effect. Mini tryout previously
-- counted all contexts, while the full catalog explicitly counted direct contexts.
CREATE OR REPLACE FUNCTION public.learner_exam_attempt_summary (p_exam_ids uuid[], p_direct_only boolean DEFAULT FALSE)
  RETURNS TABLE (
    exam_id uuid,
    attempt_count bigint,
    active_attempt_id uuid)
  LANGUAGE sql
  STABLE
  SECURITY INVOKER
  SET search_path = ''
  AS $$
  SELECT
    a.exam_id,
    count(*),
    (array_agg(a.id ORDER BY a.updated_at DESC) FILTER (WHERE lower(a.status) = 'in_progress'))[1]
  FROM
    public.exam_attempts a
  WHERE
    a.user_id = (
      SELECT
        auth.uid ())
    AND a.exam_id = ANY (p_exam_ids)
    AND (NOT p_direct_only
      OR a.metadata ->> 'accessContext' IS NULL
      OR a.metadata ->> 'accessContext' = 'direct')
  GROUP BY
    a.exam_id;
$$;
REVOKE ALL ON FUNCTION public.completed_attempt_totals (uuid) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.active_attempt_overview (uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.completed_attempt_totals (uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.active_attempt_overview (uuid) TO service_role;
REVOKE ALL ON FUNCTION public.learner_exam_attempt_summary (uuid[], boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.learner_exam_attempt_summary (uuid[], boolean) TO authenticated, service_role;
NOTIFY pgrst,
'reload schema';
COMMIT;
