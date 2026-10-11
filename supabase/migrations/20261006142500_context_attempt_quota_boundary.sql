-- Keep distribution-context attempt limits aligned with the contextual start contract.
-- Non-direct access is granted by its distribution and must not consume personal pass quotas.
CREATE OR REPLACE FUNCTION app_private.start_exam_attempt_for_context (p_exam_id uuid, p_user_id uuid, p_context jsonb)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_attempt_id uuid := gen_random_uuid ();
  v_attempt_number integer;
  v_attempt_limit integer;
  v_exam_status text;
  v_track_id uuid;
  v_access_type text;
  v_required_feature_id uuid;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_token_cost integer;
  v_program_code text;
  v_track_code text;
  v_exam_type_code text;
  v_monetization_enforced boolean := FALSE;
  v_has_entitlement boolean := FALSE;
  v_bypass_attempt_limit boolean := FALSE;
  v_used_attempts integer := 0;
  v_item_count integer;
  v_expected_count integer;
  v_section_count integer;
  v_first_section uuid;
  v_seed text;
  v_existing_attempt_id uuid;
  v_existing_attempt_number integer;
  v_context_type text := upper(coalesce(p_context ->> 'type', 'DIRECT'));
  v_event_id uuid := nullif (p_context ->> 'event_id', '')::uuid;
  v_assignment_id uuid := nullif (p_context ->> 'assignment_id', '')::uuid;
  v_event_registration_id uuid;
  v_event_session_id uuid;
  v_context_starts_at timestamptz;
  v_context_ends_at timestamptz;
  v_organization_id uuid;
  v_batch_id uuid;
  v_participant_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT
      1
    FROM
      public.profiles
    WHERE
      id = p_user_id
      AND lower(coalesce(status, '')) = 'active') THEN
  RAISE EXCEPTION 'Active user profile not found';
END IF;

  PERFORM
    pg_advisory_xact_lock(hashtextextended(p_exam_id::text || ':' || p_user_id::text || ':' || v_context_type || ':' || coalesce(v_event_id::text, v_assignment_id::text, ''), 0));

  SELECT
    e.status,
    e.attempt_limit,
    e.track_id,
    e.access_type,
    e.required_feature_id,
    e.starts_at,
    e.ends_at,
    e.token_cost,
    pr.code,
    tr.code,
    et.code
  INTO
    v_exam_status,
    v_attempt_limit,
    v_track_id,
    v_access_type,
    v_required_feature_id,
    v_starts_at,
    v_ends_at,
    v_token_cost,
    v_program_code,
    v_track_code,
    v_exam_type_code
  FROM
    public.exams e
    JOIN public.tracks tr ON tr.id = e.track_id
    JOIN public.programs pr ON pr.id = tr.program_id
    JOIN public.exam_types et ON et.id = e.exam_type_id
  WHERE
    e.id = p_exam_id;
  IF NOT found THEN
    RAISE EXCEPTION 'Exam not found';
  END IF;

  IF upper(coalesce(v_program_code, '')) <> 'TKA' OR upper(coalesce(v_track_code, '')) <> 'SMP' THEN
    RAISE EXCEPTION 'TKA SMP exam required';
  END IF;

  IF lower(coalesce(v_exam_status, ''))
    NOT IN ('active', 'scheduled') THEN
    RAISE EXCEPTION 'Exam is not active';
  END IF;
  IF v_starts_at IS NOT NULL AND v_starts_at > now() THEN
    RAISE EXCEPTION 'Exam has not started';
  END IF;
  IF v_ends_at IS NOT NULL AND v_ends_at < now() THEN
    RAISE EXCEPTION 'Exam has ended';
  END IF;

  IF coalesce(v_token_cost, 0) <> 0 THEN
    RAISE EXCEPTION 'TKA SMP exams must use Tempur Pass access';
  END IF;

  IF v_context_type NOT IN ('DIRECT', 'EVENT', 'ORGANIZATION') THEN
    RAISE EXCEPTION 'Invalid access context';
  END IF;

  IF v_context_type = 'EVENT' THEN
    IF v_event_id IS NULL THEN
      RAISE EXCEPTION 'Event context requires event_id';
    END IF;
    SELECT
      er.id,
      er.session_id,
      es.starts_at,
      es.ends_at
    INTO
      v_event_registration_id,
      v_event_session_id,
      v_context_starts_at,
      v_context_ends_at
    FROM
      public.event_registrations er
      JOIN public.event_sessions es ON es.id = er.session_id
      JOIN public.events ev ON ev.id = er.event_id
    WHERE
      er.user_id = p_user_id
      AND er.event_id = v_event_id
      AND lower(er.status) IN ('registered', 'started', 'completed', 'paid')
      AND lower(ev.status) IN ('scheduled', 'live', 'active')
      AND ev.ends_at > now()
      AND es.exam_id = p_exam_id
    ORDER BY
      er.created_at DESC
    LIMIT 1;
    IF v_event_registration_id IS NULL THEN
      RAISE EXCEPTION 'Event registration required';
    END IF;
    IF v_context_starts_at > now() OR v_context_ends_at <= now() THEN
      RAISE EXCEPTION 'Event session is outside its access window';
    END IF;
  ELSIF v_context_type = 'ORGANIZATION' THEN
    IF v_assignment_id IS NULL THEN
      RAISE EXCEPTION 'Organization context requires assignment_id';
    END IF;
    SELECT
      a.organization_id,
      a.batch_id,
      p.id
    INTO
      v_organization_id,
      v_batch_id,
      v_participant_id
    FROM
      public.organization_exam_assignments a
      JOIN public.organization_batches b ON b.id = a.batch_id
        AND b.organization_id = a.organization_id
      JOIN public.organizations o ON o.id = a.organization_id
      JOIN public.organization_participants p ON p.batch_id = b.id
        AND p.organization_id = o.id
    WHERE
      a.id = v_assignment_id
      AND a.exam_id = p_exam_id
      AND a.is_active
      AND lower(b.status) = 'active'
      AND lower(o.status) = 'active'
      AND ((b.starts_at IS NULL
          OR b.starts_at <= now())
        OR EXISTS (
          SELECT
            1
          FROM
            public.exam_attempts ea
          WHERE
            ea.user_id = p_user_id
            AND ea.assignment_id = a.id
            AND ea.source = 'organization'
            AND lower(ea.status) IN ('created', 'in_progress')))
      AND ((b.ends_at IS NULL
          OR b.ends_at >= now())
        OR EXISTS (
          SELECT
            1
          FROM
            public.exam_attempts ea
          WHERE
            ea.user_id = p_user_id
            AND ea.assignment_id = a.id
            AND ea.source = 'organization'
            AND lower(ea.status) IN ('created', 'in_progress')))
      AND ((a.starts_at IS NULL
          OR a.starts_at <= now())
        OR EXISTS (
          SELECT
            1
          FROM
            public.exam_attempts ea
          WHERE
            ea.user_id = p_user_id
            AND ea.assignment_id = a.id
            AND ea.source = 'organization'
            AND lower(ea.status) IN ('created', 'in_progress')))
      AND ((a.due_at IS NULL
          OR a.due_at >= now())
        OR EXISTS (
          SELECT
            1
          FROM
            public.exam_attempts ea
          WHERE
            ea.user_id = p_user_id
            AND ea.assignment_id = a.id
            AND ea.source = 'organization'
            AND lower(ea.status) IN ('created', 'in_progress')))
      AND p.user_id = p_user_id
      AND lower(p.status) IN ('active', 'registered')
    LIMIT 1;
    IF v_participant_id IS NULL THEN
      RAISE EXCEPTION 'Active organization assignment required';
    END IF;
  ELSIF NOT EXISTS (
      SELECT
        1
      FROM
        public.user_tracks
      WHERE
        user_id = p_user_id
        AND track_id = v_track_id
        AND lower(status) = 'active') THEN
    RAISE EXCEPTION 'Active user track required';
  END IF;
  -- Distribution contexts grant access themselves; pass/attempt limits belong to Direct.
  IF v_context_type = 'DIRECT' THEN
    NULL;
  ELSE
    v_monetization_enforced := FALSE;
    v_bypass_attempt_limit := TRUE;
  END IF;
  -- Idempotency is scoped to the exact distribution context.
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
    AND lower(ea.status) = 'in_progress'
    AND CASE v_context_type
    WHEN 'DIRECT' THEN
      ea.source = 'b2c'
      AND ea.assignment_id IS NULL
      AND coalesce(ea.metadata ->> 'eventId', '')=''
        AND upper(coalesce(ea.metadata ->> 'accessContext', 'DIRECT')) = 'DIRECT'
    WHEN 'EVENT' THEN
      ea.source = 'b2c'
      AND ea.assignment_id IS NULL
      AND ea.metadata ->> 'eventId' = v_event_id::text
    WHEN 'ORGANIZATION' THEN
      ea.source = 'organization'
      AND ea.assignment_id = v_assignment_id
      AND ea.participant_id = v_participant_id
    ELSE
      FALSE
    END ORDER BY ea.attempt_number DESC LIMIT 1;

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
      AND lower(ass.status) = 'active'
    ORDER BY
      es.sort_order
    LIMIT 1;

    RETURN jsonb_build_object('attempt_id', v_existing_attempt_id, 'attempt_number', v_existing_attempt_number, 'status', 'in_progress', 'active_section_id', v_first_section, 'resumed', TRUE);
  END IF;

  IF v_context_type = 'DIRECT' THEN
    SELECT
      coalesce(ff.enabled, FALSE)
    INTO
      v_monetization_enforced
    FROM
      public.feature_flags ff
    WHERE
      ff.key = 'tka.smp.monetization_enforcement';
    v_monetization_enforced := coalesce(v_monetization_enforced, FALSE);
  END IF;

  IF v_monetization_enforced AND v_context_type = 'DIRECT' THEN
    v_access_type := upper(coalesce(v_access_type, 'FREE'));

    IF v_access_type IN ('PREMIUM', 'FREEMIUM') THEN
      IF v_required_feature_id IS NULL THEN
        RAISE EXCEPTION 'Exam monetization configuration requires required_feature_id';
      END IF;

      SELECT
        EXISTS (
          SELECT
            1
          FROM
            public.entitlements en
          WHERE
            en.user_id = p_user_id
            AND en.feature_id = v_required_feature_id
            AND lower(en.status) = 'active'
            AND en.starts_at <= now()
            AND (en.expires_at IS NULL
              OR en.expires_at > now())
            AND (en.usage_limit IS NULL
              OR en.usage_count < en.usage_limit))
      INTO
        v_has_entitlement;
    END IF;

    IF v_access_type = 'PREMIUM' THEN
      IF NOT v_has_entitlement THEN
        RAISE EXCEPTION 'ENTITLEMENT_REQUIRED';
      END IF;
      v_bypass_attempt_limit := TRUE;
    ELSIF v_access_type = 'FREEMIUM' THEN
      IF v_has_entitlement THEN
        v_bypass_attempt_limit := TRUE;
      ELSE
        SELECT
          count(*)::integer
        INTO
          v_used_attempts
        FROM
          public.exam_attempts ea
        WHERE
          ea.exam_id = p_exam_id
          AND ea.user_id = p_user_id;

        IF v_used_attempts >= coalesce(v_attempt_limit, 1) THEN
          RAISE EXCEPTION 'ENTITLEMENT_REQUIRED';
        END IF;
      END IF;
    END IF;
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

  IF v_context_type = 'DIRECT' AND v_attempt_limit IS NOT NULL AND v_attempt_number > v_attempt_limit AND NOT v_bypass_attempt_limit THEN
    RAISE EXCEPTION 'Attempt limit reached';
  END IF;

  v_seed := v_attempt_id::text;

INSERT INTO public.exam_attempts (id, exam_id, user_id, attempt_number, status, started_at, source, organization_id, batch_id, assignment_id, participant_id, metadata, created_at, updated_at)
  VALUES (v_attempt_id, p_exam_id, p_user_id, v_attempt_number, 'in_progress', now(), CASE WHEN v_context_type = 'ORGANIZATION' THEN
      'organization'
    ELSE
      'b2c'
    END, v_organization_id, v_batch_id, v_assignment_id, v_participant_id, jsonb_build_object('orderSeed', v_seed, 'engineVersion', 'tka-section-rpc-v2', 'questionCount', v_expected_count, 'programCode', v_program_code, 'trackCode', v_track_code, 'examTypeCode', v_exam_type_code, 'practiceKind', CASE WHEN v_context_type = 'EVENT' THEN
        'event'
      WHEN upper(v_exam_type_code) = 'MINI_TRYOUT' THEN
        'mini_tryout'
      WHEN upper(v_exam_type_code) = 'DRILL' THEN
        'drill'
      ELSE
        'full_tryout'
      END, 'monetizationEnforced', v_monetization_enforced, 'entitlementBypass', v_bypass_attempt_limit, 'tokenCost', 0) || jsonb_strip_nulls (jsonb_build_object('accessContext', lower(v_context_type), 'eventId', v_event_id, 'eventSessionId', v_event_session_id, 'eventRegistrationId', v_event_registration_id, 'assignmentId', v_assignment_id, 'organizationId', v_organization_id, 'batchId', v_batch_id, 'participantId', v_participant_id)), now(), now());

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
    AND lower(ass.status) = 'active'
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
  VALUES (v_attempt_id, 'attempt_started', jsonb_build_object('attemptNumber', v_attempt_number, 'activeSectionId', v_first_section, 'questionCount', v_expected_count, 'monetizationEnforced', v_monetization_enforced, 'entitlementBypass', v_bypass_attempt_limit, 'tokenCost', 0));

  RETURN jsonb_build_object('attempt_id', v_attempt_id, 'attempt_number', v_attempt_number, 'status', 'in_progress', 'active_section_id', v_first_section, 'resumed', FALSE);
END;
$function$;
