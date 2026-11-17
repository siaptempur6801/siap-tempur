CREATE FUNCTION public.admin_monitoring_summary (p_event_id uuid DEFAULT NULL, p_organization_id uuid DEFAULT NULL, p_batch_id uuid DEFAULT NULL, p_assignment_id uuid DEFAULT NULL, p_exam_id uuid DEFAULT NULL, p_include_report boolean DEFAULT TRUE)
  RETURNS jsonb
  LANGUAGE plpgsql
  STABLE
  SECURITY INVOKER
  SET search_path = ''
  AS $$
DECLARE
  result jsonb;
BEGIN
  IF (p_event_id IS NULL AND (p_organization_id IS NULL OR p_batch_id IS NULL)) OR (p_event_id IS NOT NULL AND (p_organization_id IS NOT NULL OR p_batch_id IS NOT NULL OR p_assignment_id IS NOT NULL)) THEN
    RAISE EXCEPTION 'One monitoring scope is required';
  END IF;

  WITH roster AS MATERIALIZED (
    SELECT
      r.id,
      r.user_id
    FROM
      public.event_registrations r
    WHERE
      p_event_id IS NOT NULL
      AND r.event_id = p_event_id
    UNION ALL
    SELECT
      r.id,
      r.user_id
    FROM
      public.organization_participants r
    WHERE
      p_event_id IS NULL
      AND r.organization_id = p_organization_id
      AND r.batch_id = p_batch_id
),
current_roster AS MATERIALIZED (
  SELECT
    r.id,
    a.id AS attempt_id,
    a.status AS attempt_status,
    a.total_score,
    a.percentage
  FROM
    roster r
  LEFT JOIN LATERAL (
    SELECT
      a.id,
      a.status,
      a.total_score,
      a.percentage
    FROM
      public.exam_attempts a
    WHERE ((
        p_event_id IS NOT NULL
        AND a.source = 'b2c'
        AND a.user_id = r.user_id
        AND a.metadata @> jsonb_build_object('eventId', p_event_id::text))
      OR (p_event_id IS NULL
        AND a.source = 'organization'
        AND a.participant_id = r.id
        AND a.organization_id = p_organization_id
        AND a.batch_id = p_batch_id))
    AND (p_assignment_id IS NULL
      OR a.assignment_id = p_assignment_id)
    AND (p_exam_id IS NULL
      OR a.exam_id = p_exam_id)
  ORDER BY
    a.started_at DESC,
    a.id DESC
  LIMIT 1) a ON TRUE
),
summary AS (
  SELECT
    count(*) AS total,
    count(*) FILTER (WHERE attempt_id IS NULL) AS not_started,
    count(*) FILTER (WHERE attempt_status = 'in_progress') AS in_progress,
  count(*) FILTER (WHERE attempt_status = 'completed') AS completed,
  count(*) FILTER (WHERE attempt_status = 'completed'
    AND total_score IS NOT NULL) AS scored,
  count(*) FILTER (WHERE attempt_status = 'completed'
    AND percentage < 25
    AND percentage <> '-Infinity'::numeric) AS band0,
  count(*) FILTER (WHERE attempt_status = 'completed'
    AND percentage >= 25
    AND percentage < 50) AS band1,
  count(*) FILTER (WHERE attempt_status = 'completed'
    AND percentage >= 50
    AND percentage < 75) AS band2,
  count(*) FILTER (WHERE attempt_status = 'completed'
    AND percentage >= 75
    AND percentage NOT IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)) AS band3,
  count(*) FILTER (WHERE attempt_status = 'completed'
    AND (percentage IS NULL
    OR percentage IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric))) AS unknown
FROM
  current_roster
)
SELECT
  jsonb_build_object('total', s.total, 'summary', jsonb_build_object('total', s.total, 'notStarted', s.not_started, 'inProgress', s.in_progress, 'completed', s.completed), 'report', CASE WHEN p_include_report THEN
      jsonb_build_object('scored', s.scored, 'completionRate', CASE WHEN s.total = 0 THEN
          NULL
        ELSE
          round(s.completed * 100.0 / s.total)::integer
        END, 'bands', jsonb_build_array(jsonb_build_object('label', '0–24%', 'count', s.band0), jsonb_build_object('label', '25–49%', 'count', s.band1), jsonb_build_object('label', '50–74%', 'count', s.band2), jsonb_build_object('label', '75–100%', 'count', s.band3), jsonb_build_object('label', 'Persentase belum tersedia', 'count', s.unknown)))
    ELSE
      NULL
    END)
INTO
  result
FROM
  summary s;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION public.admin_monitoring_summary (uuid, uuid, uuid, uuid, uuid, boolean) IS 'Returns aggregate monitoring metrics without participant rows or per-attempt progress payloads.';

REVOKE ALL ON FUNCTION public.admin_monitoring_summary (uuid, uuid, uuid, uuid, uuid, boolean) FROM public, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.admin_monitoring_summary (uuid, uuid, uuid, uuid, uuid, boolean) TO service_role;
