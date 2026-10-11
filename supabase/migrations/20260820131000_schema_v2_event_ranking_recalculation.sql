CREATE OR REPLACE FUNCTION public.recalculate_event_rankings (p_event_id uuid)
  RETURNS integer
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path = public
  AS $$
DECLARE
  v_count integer;
BEGIN
  DELETE FROM public.event_rankings
  WHERE event_id = p_event_id;

  WITH best_attempts AS (
    SELECT DISTINCT ON (a.user_id)
      a.user_id,
      a.id AS attempt_id,
      coalesce(a.total_score, 0)::numeric AS score,
      coalesce(a.duration_used_seconds, 2147483647) AS duration_seconds,
      a.submitted_at,
      a.passed
    FROM
      public.exam_attempts a
    WHERE
      lower(a.status) = 'completed'
      AND a.metadata ->> 'eventId' = p_event_id::text
    ORDER BY
      a.user_id,
      coalesce(a.total_score, 0) DESC,
      coalesce(a.duration_used_seconds, 2147483647) ASC,
      a.submitted_at ASC nulls LAST,
      a.id ASC
),
ranked AS (
  SELECT
    p_event_id AS event_id,
    b.user_id,
    b.attempt_id,
    b.score,
    b.duration_seconds,
    row_number() OVER (ORDER BY b.score DESC,
      b.duration_seconds ASC,
      b.submitted_at ASC nulls LAST,
      b.attempt_id ASC)::integer AS rank,
    CASE WHEN b.passed IS TRUE THEN
      'passed'
    ELSE
      'not_passed'
    END AS rank_group
  FROM
    best_attempts b)
INSERT INTO public.event_rankings (event_id, user_id, attempt_id, score, duration_seconds, rank, rank_group, calculated_at)
SELECT
  r.event_id,
  r.user_id,
  r.attempt_id,
  r.score,
  r.duration_seconds,
  r.rank,
  r.rank_group,
  now()
FROM
  ranked r;

  UPDATE
    public.exam_attempts a
  SET
    rank = er.rank,
    updated_at = now()
  FROM
    public.event_rankings er
  WHERE
    er.event_id = p_event_id
    AND er.attempt_id = a.id;

  SELECT
    count(*)::integer
  INTO
    v_count
  FROM
    public.event_rankings
  WHERE
    event_id = p_event_id;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.recalculate_event_rankings (uuid) FROM public;

REVOKE ALL ON FUNCTION public.recalculate_event_rankings (uuid) FROM anon;

REVOKE ALL ON FUNCTION public.recalculate_event_rankings (uuid) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.recalculate_event_rankings (uuid) TO service_role;
