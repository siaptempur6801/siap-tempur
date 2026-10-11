-- Read-only admin projections. Permission/context checks remain in server services.
-- Invoker rights never elevate table access. Sensitive projections are service-role only.
CREATE FUNCTION public.admin_assessment_supply (p_exam_ids uuid[])
  RETURNS TABLE (
    exam_id uuid,
    bound_count bigint,
    approved_bound_count bigint,
    reviewed_bound_count bigint,
    sections jsonb)
  LANGUAGE sql
  STABLE
  SECURITY INVOKER
  SET search_path = ''
  AS $$
  SELECT
    e.id,
    b.total,
    b.approved,
    b.reviewed,
    coalesce((
      SELECT
        jsonb_agg(jsonb_build_object('subject_id', s.subject_id, 'question_count', s.question_count, 'published_count', (
              SELECT
                count(*)
            FROM public.questions q
            WHERE
              q.subject_id = s.subject_id
              AND q.status IN ('published', 'PUBLISHED', 'active', 'ACTIVE'))))
      FROM public.exam_sections s
      WHERE
        s.exam_id = e.id), '[]'::jsonb)
  FROM
    public.exams e
  CROSS JOIN LATERAL (
    SELECT
      count(*) AS total,
      count(*) FILTER (WHERE lower(q.status) IN ('approved', 'published', 'active')
          AND q.version = i.question_version) AS approved,
        count(*) FILTER (WHERE (
          SELECT
            count(*)
            FROM ( SELECT DISTINCT ON (r.review_stage)
              r.review_stage,
              r.status,
              r.completed_at FROM public.content_reviews r WHERE r.entity_type = 'question'
              AND r.entity_id = i.question_id
              AND r.question_version = i.question_version
              AND r.review_stage IN ('academic', 'editorial', 'technical_qa')
            ORDER BY
              r.review_stage,
              r.created_at DESC,
              r.id DESC) latest WHERE latest.status = 'approved'
            AND latest.completed_at IS NOT NULL) = 3) AS reviewed
      FROM
        public.exam_question_items i
    LEFT JOIN public.questions q ON q.id = i.question_id
  WHERE
    i.exam_id = e.id) b
WHERE
  e.id = ANY (p_exam_ids);
$$;

CREATE FUNCTION public.admin_drill_supply (p_program_id uuid, p_track_id uuid, p_node_ids uuid[])
  RETURNS TABLE (
    node_id uuid,
    available_count bigint)
  LANGUAGE sql
  STABLE
  SECURITY INVOKER
  SET search_path = ''
  AS $$
  SELECT
    n.id,
    count(DISTINCT q.id)
  FROM
    public.knowledge_nodes n
  LEFT JOIN public.knowledge_node_paths p ON p.ancestor_id = n.id
  LEFT JOIN public.question_knowledge_nodes m ON m.knowledge_node_id = p.descendant_id
    AND m.relation_type = 'primary'
  LEFT JOIN public.questions q ON q.id = m.question_id
    AND q.subject_id = n.subject_id
    AND q.program_id = p_program_id
    AND q.track_id = p_track_id
    AND q.status IN ('approved', 'published')
    AND EXISTS (
      SELECT
        1
      FROM
        public.question_versions v
    WHERE
      v.question_id = q.id
      AND v.version = q.version)
WHERE
  n.id = ANY (p_node_ids)
GROUP BY
  n.id;
$$;

CREATE FUNCTION public.admin_resource_counts (p_kind text, p_ids uuid[])
  RETURNS TABLE (
    resource_id uuid,
    total bigint)
  LANGUAGE plpgsql
  STABLE
  SECURITY INVOKER
  SET search_path = ''
  AS $$
BEGIN
  CASE p_kind
  WHEN 'event_participants' THEN
    RETURN QUERY
    SELECT
      r.event_id,
      count(*)
    FROM
      public.event_registrations r
    WHERE
      r.event_id = ANY (p_ids)
    GROUP BY
      r.event_id;
    WHEN 'organization_assignments' THEN
      RETURN QUERY
      SELECT
        a.organization_id,
        count(*)
      FROM
        public.organization_exam_assignments a
      WHERE
        a.organization_id = ANY (p_ids)
      GROUP BY
        a.organization_id;
      WHEN 'user_entitlements' THEN
        RETURN QUERY
        SELECT
          e.user_id,
          count(*)
        FROM
          public.entitlements e
        WHERE
          e.user_id = ANY (p_ids)
          AND e.status = 'active'
        GROUP BY
          e.user_id;
  ELSE
    RAISE EXCEPTION 'Unsupported admin count resource';
        END CASE;
END;
$$;

-- Authenticated invoker uses the caller's existing questions RLS, including author/reviewer boundaries.
CREATE FUNCTION public.admin_question_status_counts (p_program_id uuid, p_track_id uuid)
  RETURNS jsonb
  LANGUAGE sql
  STABLE
  SECURITY INVOKER
  SET search_path = ''
  AS $$
  SELECT
    jsonb_build_object('total', count(*), 'draft', count(*) FILTER (WHERE status = 'draft'), 'assignedToMe', 0, 'unassigned', count(*) FILTER (WHERE status IN ('submitted', 'editorial_review', 'academic_review', 'technical_qa')
      AND reviewer_id IS NULL), 'published', count(*) FILTER (WHERE status = 'published'), 'approved', count(*) FILTER (WHERE status = 'approved'), 'revisionRequired', count(*) FILTER (WHERE status = 'revision_required'), 'editorial', count(*) FILTER (WHERE status IN ('submitted', 'editorial_review')), 'academic', count(*) FILTER (WHERE status = 'academic_review'), 'technical', count(*) FILTER (WHERE status = 'technical_qa'))
  FROM
    public.questions
  WHERE
    program_id = p_program_id
    AND track_id = p_track_id;
$$;

CREATE FUNCTION public.admin_monitoring_page (p_event_id uuid DEFAULT NULL, p_organization_id uuid DEFAULT NULL, p_batch_id uuid DEFAULT NULL, p_assignment_id uuid DEFAULT NULL, p_exam_id uuid DEFAULT NULL, p_search text DEFAULT '',p_status text default '', p_page integer DEFAULT 1)
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
      r.user_id,
      coalesce(
        nullif (
          p.full_name, ''),nullif(p.display_name,''
), 'Peserta'
) AS name,
      NULL::text AS email,
      p.full_name AS search_name
    FROM
      public.event_registrations r
    LEFT JOIN public.profiles p ON p.id = r.user_id
  WHERE
    p_event_id IS NOT NULL
    AND r.event_id = p_event_id
  UNION ALL
  SELECT
    r.id,
    r.user_id,
    r.full_name_snapshot,
    r.email_snapshot,
    r.full_name_snapshot
  FROM
    public.organization_participants r
  WHERE
    p_event_id IS NULL
    AND r.organization_id = p_organization_id
    AND r.batch_id = p_batch_id
),
current_roster AS MATERIALIZED (
  SELECT
    r.*,
    a.id AS attempt_id,
    a.status AS attempt_status,
    a.percentage,
    a.total_score,
    CASE WHEN a.id IS NULL THEN
      NULL
    ELSE
      jsonb_build_object(
        'id', a.id, 'user_id', a.user_id, 'participant_id', a.participant_id, 'exam_id', a.exam_id, 'status', a.status, 'started_at', a.started_at, 'submitted_at', a.submitted_at, 'duration_used_seconds', a.duration_used_seconds, 'total_score', a.total_score, 'percentage', a.percentage, 'last_question_position', a.last_question_position, 'assignment_id', a.assignment_id, 'organization_id', a.organization_id, 'batch_id', a.batch_id, 'source', a.source
)
    END AS attempt
  FROM
    roster r
  LEFT JOIN LATERAL (
    SELECT
      a.id,
      a.user_id,
      a.participant_id,
      a.exam_id,
      a.status,
      a.started_at,
      a.submitted_at,
      a.duration_used_seconds,
      a.total_score,
      a.percentage,
      a.last_question_position,
      a.assignment_id,
      a.organization_id,
      a.batch_id,
      a.source
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
matched AS MATERIALIZED (
  SELECT
    c.id,
    c.user_id,
    c.name,
    c.email,
    c.attempt_id,
    c.attempt
  FROM
    current_roster c
  WHERE (
    coalesce(
      p_search, '')=''
      OR c.search_name ILIKE '%' || p_search || '%' escape '\'
      or (p_event_id is null and c.email ilike '%'||p_search||'%' escape ' \'
)
)
  AND (
    coalesce(
      p_status, '')=''
      OR (
        p_status = 'not_started'
        AND c.attempt_id IS NULL
)
      OR c.attempt_status = p_status
)
),
  totals AS (
    SELECT
      count(*) AS total,
      greatest (1, ceil(count(*) / 25.0)::integer) AS last_page
    FROM
      matched),
    selected_page AS (
      SELECT
        m.id,
        m.user_id,
        m.name,
        m.email,
        m.attempt_id,
        m.attempt
      FROM
        matched m
      ORDER BY
        m.id
      LIMIT 25 OFFSET (
        SELECT
          (least (greatest (1, coalesce(p_page, 1)), last_page) - 1) * 25
        FROM
          totals)),
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
    jsonb_build_object('total', t.total, 'page', least (greatest (1, coalesce(p_page, 1)), t.last_page), 'summary', jsonb_build_object('total', s.total, 'notStarted', s.not_started, 'inProgress', s.in_progress, 'completed', s.completed), 'report', jsonb_build_object('scored', s.scored, 'completionRate', CASE WHEN s.total = 0 THEN
          NULL
        ELSE
          round(s.completed * 100.0 / s.total)::integer
        END, 'bands', jsonb_build_array(jsonb_build_object('label', '0–24%', 'count', s.band0), jsonb_build_object('label', '25–49%', 'count', s.band1), jsonb_build_object('label', '50–74%', 'count', s.band2), jsonb_build_object('label', '75–100%', 'count', s.band3), jsonb_build_object('label', 'Persentase belum tersedia', 'count', s.unknown))), 'rows', coalesce((
        SELECT
          jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'email', p.email, 'attempt', p.attempt, 'progress', CASE WHEN p.attempt_id IS NULL THEN
                NULL
              ELSE
                jsonb_build_object('total', progress.total, 'answered', progress.answered)
              END)
          ORDER BY p.id)
        FROM selected_page p
      CROSS JOIN LATERAL (
        SELECT
          count(*) AS total, count(*) FILTER (WHERE EXISTS (
            SELECT
              1
            FROM public.attempt_answers a WHERE a.attempt_question_id = q.id
              AND a.answered_at IS NOT NULL)) AS answered
        FROM public.attempt_questions q
      WHERE
        q.attempt_id = p.attempt_id) progress), '[]'::jsonb))
  INTO
    result
  FROM
    totals t
    CROSS JOIN summary s;
  RETURN result;
END;
$$;

CREATE FUNCTION public.admin_question_page (p_program_id uuid, p_track_id uuid, p_search text DEFAULT '',p_status text default '', p_subject_id uuid DEFAULT NULL, p_node_id uuid DEFAULT NULL, p_review text DEFAULT '',p_stage text default '', p_reviewer text DEFAULT '', p_page integer DEFAULT 1, p_id uuid DEFAULT NULL)
  RETURNS jsonb
  LANGUAGE sql
  STABLE
  SECURITY INVOKER
  SET search_path = ''
  AS $$
  WITH candidates AS MATERIALIZED (
    SELECT
      q.id,
      q.question_code,
      q.subject_id,
      q.question_type,
      q.stem,
      q.difficulty,
      q.source_type,
      q.source_reference,
      q.status,
      q.version,
      q.author_id,
      q.reviewer_id,
      q.published_at,
      q.updated_at
    FROM
      public.questions q
    WHERE
      q.program_id = p_program_id
      AND q.track_id = p_track_id
      AND (
        p_id IS NULL
        OR q.id = p_id
)
      AND (
        coalesce(
          p_status, '')=''
          OR q.status = p_status
)
        AND (
          p_subject_id IS NULL
          OR q.subject_id = p_subject_id
)
        AND (
          coalesce(
            p_stage, '')=''
            OR (
              p_stage = 'editorial'
              AND q.status IN (
                'submitted', 'editorial_review'
)
)
            OR (
              p_stage = 'academic'
              AND q.status = 'academic_review'
)
            OR (
              p_stage = 'technical_qa'
              AND q.status = 'technical_qa'
)
)
          AND (
            coalesce(
              p_reviewer, '')=''
              OR (
                p_reviewer = 'unassigned'
                AND q.reviewer_id IS NULL
)
              OR q.reviewer_id::text = p_reviewer
)
            AND (
              coalesce(
                p_search, '')=''
                OR q.question_code ILIKE '%' || p_search || '%' escape '\' or q.stem ilike ' % '||p_search||' % ' escape ' \'
)
              AND (
                p_node_id IS NULL
                OR EXISTS (
                  SELECT
                    1
                  FROM
                    public.question_knowledge_nodes m
                  WHERE
                    m.question_id = q.id
                    AND m.relation_type = 'primary'
                    AND (
                      m.knowledge_node_id = p_node_id
                      OR EXISTS (
                        SELECT
                          1
                        FROM
                          public.knowledge_node_paths p
                        WHERE
                          p.ancestor_id = p_node_id
                          AND p.descendant_id = m.knowledge_node_id
)
)
)
)
),
                matched AS MATERIALIZED (
                  SELECT
                    q.id,
                    q.question_code,
                    q.subject_id,
                    q.question_type,
                    q.stem,
                    q.difficulty,
                    q.source_type,
                    q.source_reference,
                    q.status,
                    q.version,
                    q.author_id,
                    q.reviewer_id,
                    q.published_at,
                    q.updated_at
                  FROM
                    candidates q
                  WHERE
                    coalesce(
                      p_review, '')=''
                      OR EXISTS (
                        SELECT
                          1
                        FROM (
                          SELECT
                            CASE WHEN bool_or(
                              coalesce(
                                r.notes, ''
) ~* 'blocked[_ ]asset|aset.*belum|asset.*missing'
                              AND r.status <> 'approved'
) THEN
                              'blocked_asset'
                            WHEN bool_or(
                              coalesce(
                                r.notes, ''
) ~* 'blocked[_ ]content'
                              AND r.status <> 'approved'
) THEN
                              'blocked_content'
                            WHEN bool_or(
                              r.status = 'rejected'
) THEN
                              'rejected'
                            WHEN count(
                              *
) FILTER ( WHERE r.review_stage IN ( 'academic', 'editorial', 'technical_qa'
)
                          AND r.status = 'approved'
                          AND r.completed_at IS NOT NULL) = 3 THEN
                              'approved'
                            ELSE
                              'needs_review'
                            END AS state
                          FROM ( SELECT DISTINCT ON (r.review_stage)
                              r.review_stage, r.status, r.notes, r.completed_at
                            FROM public.content_reviews r
                          WHERE
                            r.entity_type = 'question'
                            AND r.entity_id = q.id
                            AND r.question_version = q.version ORDER BY r.review_stage, r.created_at DESC, r.id DESC) r) state
                      WHERE
                        state.state = p_review
                        OR (p_review = 'blocked'
                          AND state.state IN ('blocked_asset', 'blocked_content')))),
                    totals AS (
                      SELECT
                        count(*) AS total,
                        greatest (1, ceil(count(*) / 25.0)::integer) AS last_page
                      FROM
                        matched),
                      page AS (
                        SELECT
                          m.id,
                          m.question_code,
                          m.subject_id,
                          m.question_type,
                          m.stem,
                          m.difficulty,
                          m.source_type,
                          m.source_reference,
                          m.status,
                          m.version,
                          m.author_id,
                          m.reviewer_id,
                          m.published_at,
                          m.updated_at
                        FROM
                          matched m
                        ORDER BY
                          m.updated_at DESC,
                          m.id
                        LIMIT 25 OFFSET (greatest (1, coalesce(p_page, 1)) - 1) * 25
)
                      SELECT
                        jsonb_build_object('rows', coalesce((
                            SELECT
                              jsonb_agg(to_jsonb (p)
                              ORDER BY p.updated_at DESC, p.id)
                            FROM page p), '[]'::jsonb), 'total', t.total, 'lastPage', t.last_page, 'clampTo', CASE WHEN greatest (1, coalesce(p_page, 1)) > t.last_page THEN
                          t.last_page
                        ELSE
                          NULL
                        END)
                      FROM
                        totals t;
$$;

REVOKE ALL ON FUNCTION public.admin_assessment_supply (uuid[]), public.admin_drill_supply (uuid, uuid, uuid[]), public.admin_resource_counts (text, uuid[]), public.admin_monitoring_page (uuid, uuid, uuid, uuid, uuid, text, text, integer), public.admin_question_page (uuid, uuid, text, text, uuid, uuid, text, text, text, integer, uuid) FROM public, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.admin_assessment_supply (uuid[]), public.admin_drill_supply (uuid, uuid, uuid[]), public.admin_resource_counts (text, uuid[]), public.admin_monitoring_page (uuid, uuid, uuid, uuid, uuid, text, text, integer), public.admin_question_page (uuid, uuid, text, text, uuid, uuid, text, text, text, integer, uuid) TO service_role;

REVOKE ALL ON FUNCTION public.admin_question_status_counts (uuid, uuid) FROM public, anon;

GRANT EXECUTE ON FUNCTION public.admin_question_status_counts (uuid, uuid) TO authenticated, service_role;
