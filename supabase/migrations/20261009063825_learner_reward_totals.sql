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
