-- TKA SMP access hardening.
-- TKA SMP is pass-based: active Mini attempts use the free quota and active
-- Tempur Pass entitlements unlock the paid path. It must not silently fall
-- through to the shared CPNS token wallet.
CREATE OR REPLACE FUNCTION app_private.start_exam_attempt_for_user (p_exam_id uuid, p_user_id uuid)
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
    pg_advisory_xact_lock(hashtextextended(p_exam_id::text || ':' || p_user_id::text, 0));

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
    tr.code
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
    v_track_code
  FROM
    public.exams e
    JOIN public.tracks tr ON tr.id = e.track_id
    JOIN public.programs pr ON pr.id = tr.program_id
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

  IF NOT EXISTS (
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
  -- Idempotency guard: concurrent/double-click starts return the same active attempt.
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
  ORDER BY
    ea.attempt_number DESC
  LIMIT 1;

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

  SELECT
    coalesce(ff.enabled, FALSE)
  INTO
    v_monetization_enforced
  FROM
    public.feature_flags ff
  WHERE
    ff.key = 'tka.smp.monetization_enforcement';
  v_monetization_enforced := coalesce(v_monetization_enforced, FALSE);

  IF v_monetization_enforced THEN
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

  IF v_attempt_limit IS NOT NULL AND v_attempt_number > v_attempt_limit AND NOT v_bypass_attempt_limit THEN
    RAISE EXCEPTION 'Attempt limit reached';
  END IF;

  v_seed := v_attempt_id::text;

INSERT INTO public.exam_attempts (id, exam_id, user_id, attempt_number, status, started_at, metadata, created_at, updated_at)
  VALUES (v_attempt_id, p_exam_id, p_user_id, v_attempt_number, 'in_progress', now(), jsonb_build_object('orderSeed', v_seed, 'engineVersion', 'tka-section-rpc-v2', 'questionCount', v_expected_count, 'monetizationEnforced', v_monetization_enforced, 'entitlementBypass', v_bypass_attempt_limit, 'tokenCost', 0), now(), now());

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

REVOKE ALL ON FUNCTION app_private.start_exam_attempt_for_user (uuid, uuid) FROM public, anon, authenticated;
