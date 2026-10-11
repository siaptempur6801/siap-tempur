-- TKA SMP focused Drill V1.1
-- Materialize one immutable 10-question Drill exam per diagnostic competency and
-- expose an authenticated start RPC so learner flows never require service-role
-- credentials in the application runtime.
DO $migration$
DECLARE
  v_created_by uuid;
  v_feature_id uuid;
  v_payload jsonb;
  v_exam_id uuid;
  v_exam_slug text;
  r record;
BEGIN
  SELECT
    e.created_by
  INTO
    v_created_by
  FROM
    public.exams e
  WHERE
    e.slug = 'tka-smp-diagnostic-awal'
  LIMIT 1;

  IF v_created_by IS NULL THEN
    RAISE EXCEPTION 'TKA SMP diagnostic creator not found';
  END IF;

  SELECT
    f.id
  INTO
    v_feature_id
  FROM
    public.features f
  WHERE
    f.code = 'tka.smp.drill.unlimited'
  LIMIT 1;

  IF v_feature_id IS NULL THEN
    RAISE EXCEPTION 'TKA SMP drill feature not found';
  END IF;

  FOR r IN
  SELECT
    s.code AS subject_code,
    kn.id AS knowledge_node_id,
    kn.name,
    kn.slug
  FROM
    public.knowledge_nodes kn
    JOIN public.subjects s ON s.id = kn.subject_id
    JOIN public.tracks t ON t.id = s.track_id
    JOIN public.programs p ON p.id = t.program_id
  WHERE
    upper(p.code) = 'TKA'
    AND upper(t.code) = 'SMP'
    AND lower(kn.status) = 'active'
    AND kn.name IN ('Pemahaman Tekstual', 'Pemahaman Inferensial', 'Evaluasi dan Apresiasi', 'Bilangan', 'Aljabar', 'Geometri dan Pengukuran', 'Data dan Peluang')
  ORDER BY
    s.code,
    kn.sort_order,
    kn.name LOOP
      v_exam_slug := 'tka-smp-drill-' || lower(r.subject_code) || '-' || r.slug;

      SELECT
        e.id
      INTO
        v_exam_id
      FROM
        public.exams e
      WHERE
        e.slug = v_exam_slug
      LIMIT 1;

      v_payload := public.admin_upsert_drill_exam_v1 (v_exam_id, 'TKA', 'SMP', r.subject_code, r.knowledge_node_id, 'Latihan Fokus ' || r.name || ' TKA SMP', v_exam_slug, 900, 1, 10, 'random', 'instant', 'FREEMIUM', 'active', 0, v_created_by);

      v_exam_id := (v_payload ->> 'exam_id')::uuid;

      UPDATE
        public.exams
      SET
        required_feature_id = v_feature_id,
        attempt_limit = NULL,
        description = 'Latihan fokus 10 soal untuk kompetensi ' || r.name || '. Satu percobaan awal gratis; Tempur Pass membuka latihan lanjutan.',
        updated_at = now()
      WHERE
        id = v_exam_id;
    END LOOP;
  -- Retire the earlier subject-level dynamic Drill configuration before the
  -- canonical 7x10 frozen-item gate is evaluated.
  UPDATE
    public.exams
  SET
    status = 'draft',
    updated_at = now()
  WHERE
    slug IN ('tka-smp-drill-bahasa-indonesia', 'tka-smp-drill-matematika');

  IF (
    SELECT
      count(*)
    FROM
      public.exams e
      JOIN public.exam_types et ON et.id = e.exam_type_id
    WHERE
      upper(et.code) = 'DRILL' AND e.slug LIKE 'tka-smp-drill-bin-%' AND lower(e.status) = 'active') <> 3 THEN
    RAISE EXCEPTION 'TKA SMP BIN Drill materialization gate failed';
  END IF;

  IF (
    SELECT
      count(*)
    FROM
      public.exams e
      JOIN public.exam_types et ON et.id = e.exam_type_id
    WHERE
      upper(et.code) = 'DRILL' AND e.slug LIKE 'tka-smp-drill-mat-%' AND lower(e.status) = 'active') <> 4 THEN
    RAISE EXCEPTION 'TKA SMP MAT Drill materialization gate failed';
  END IF;

  IF EXISTS (
    SELECT
      1
    FROM
      public.exams e
      JOIN public.exam_types et ON et.id = e.exam_type_id
      JOIN public.exam_sections es ON es.exam_id = e.id
      LEFT JOIN public.exam_question_items eqi ON eqi.exam_id = e.id
        AND eqi.section_id = es.id
    WHERE
      upper(et.code) = 'DRILL'
      AND lower(e.status) = 'active'
      AND (e.slug LIKE 'tka-smp-drill-bin-%'
        OR e.slug LIKE 'tka-smp-drill-mat-%')
    GROUP BY
      e.id,
      es.id,
      es.question_count
    HAVING
      es.question_count <> 10
      OR count(eqi.id) <> 10) THEN
  RAISE EXCEPTION 'TKA SMP Drill frozen item gate failed';
END IF;
END;
$migration$;

CREATE OR REPLACE FUNCTION public.start_tka_smp_drill (p_subject_code text, p_knowledge_node_name text)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $function$
DECLARE
  v_user uuid := auth.uid ();
  v_program_id uuid;
  v_track_id uuid;
  v_subject_id uuid;
  v_subject_code text;
  v_node_id uuid;
  v_node_name text;
  v_node_slug text;
  v_exam_id uuid;
  v_exam_slug text;
  v_feature_id uuid;
  v_duration_seconds integer;
  v_existing_attempt_id uuid;
  v_used_attempts integer := 0;
  v_has_entitlement boolean := FALSE;
  v_payload jsonb;
  v_attempt_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED';
  END IF;

  SELECT
    p.id,
    t.id
  INTO
    v_program_id,
    v_track_id
  FROM
    public.programs p
    JOIN public.tracks t ON t.program_id = p.id
  WHERE
    upper(p.code) = 'TKA'
    AND upper(t.code) = 'SMP'
  LIMIT 1;

  IF v_track_id IS NULL THEN
    RAISE EXCEPTION 'TKA_SMP_TRACK_NOT_FOUND';
  END IF;

  IF NOT EXISTS (
    SELECT
      1
    FROM
      public.user_tracks ut
    WHERE
      ut.user_id = v_user
      AND ut.track_id = v_track_id
      AND lower(ut.status) = 'active') THEN
  RAISE EXCEPTION 'ACTIVE_USER_TRACK_REQUIRED';
END IF;

  SELECT
    s.id,
    s.code
  INTO
    v_subject_id,
    v_subject_code
  FROM
    public.subjects s
  WHERE
    s.track_id = v_track_id
    AND upper(s.code) = upper(btrim(p_subject_code))
  LIMIT 1;

  IF v_subject_id IS NULL THEN
    RAISE EXCEPTION 'DRILL_SUBJECT_INVALID';
  END IF;

  SELECT
    kn.id,
    kn.name,
    kn.slug
  INTO
    v_node_id,
    v_node_name,
    v_node_slug
  FROM
    public.knowledge_nodes kn
  WHERE
    kn.subject_id = v_subject_id
    AND lower(kn.status) = 'active'
    AND lower(btrim(kn.name)) = lower(btrim(p_knowledge_node_name))
  LIMIT 1;

  IF v_node_id IS NULL THEN
    RAISE EXCEPTION 'DRILL_KNOWLEDGE_NODE_INVALID';
  END IF;

  v_exam_slug := 'tka-smp-drill-' || lower(v_subject_code) || '-' || v_node_slug;

  SELECT
    e.id,
    e.required_feature_id,
    e.duration_seconds
  INTO
    v_exam_id,
    v_feature_id,
    v_duration_seconds
  FROM
    public.exams e
    JOIN public.exam_types et ON et.id = e.exam_type_id
  WHERE
    e.program_id = v_program_id
    AND e.track_id = v_track_id
    AND upper(et.code) = 'DRILL'
    AND e.slug = v_exam_slug
    AND lower(e.status) = 'active'
  LIMIT 1;

  IF v_exam_id IS NULL THEN
    RAISE EXCEPTION 'DRILL_EXAM_NOT_CONFIGURED';
  END IF;

  IF v_feature_id IS NULL THEN
    RAISE EXCEPTION 'DRILL_ENTITLEMENT_FEATURE_MISSING';
  END IF;

  SELECT
    ea.id
  INTO
    v_existing_attempt_id
  FROM
    public.exam_attempts ea
  WHERE
    ea.user_id = v_user
    AND ea.exam_id = v_exam_id
    AND lower(ea.status) = 'in_progress'
  ORDER BY
    ea.attempt_number DESC
  LIMIT 1;

  IF v_existing_attempt_id IS NULL THEN
    SELECT
      count(*)::integer
    INTO
      v_used_attempts
    FROM
      public.exam_attempts ea
    WHERE
      ea.user_id = v_user
      AND ea.exam_id = v_exam_id;

    IF v_used_attempts >= 1 THEN
      SELECT
        EXISTS (
          SELECT
            1
          FROM
            public.entitlements en
          WHERE
            en.user_id = v_user
            AND en.feature_id = v_feature_id
            AND lower(en.status) = 'active'
            AND en.starts_at <= now()
            AND (en.expires_at IS NULL
              OR en.expires_at > now())
            AND (en.usage_limit IS NULL
              OR en.usage_count < en.usage_limit))
      INTO
        v_has_entitlement;

      IF NOT v_has_entitlement THEN
        RAISE EXCEPTION 'ENTITLEMENT_REQUIRED';
      END IF;
    END IF;
  END IF;

  v_payload := app_private.start_exam_attempt_for_user (v_exam_id, v_user);
  v_attempt_id := nullif (v_payload ->> 'attempt_id', '')::uuid;

  IF v_attempt_id IS NULL THEN
    RAISE EXCEPTION 'DRILL_ATTEMPT_START_FAILED';
  END IF;

  UPDATE
    public.exam_attempts ea
  SET
    metadata = coalesce(ea.metadata, '{}'::jsonb) || jsonb_build_object('schemaVersion', 2, 'practiceKind', 'drill', 'programCode', 'TKA', 'trackCode', 'SMP', 'subjectCode', v_subject_code, 'knowledgeNode', v_node_name, 'durationSeconds', coalesce(v_duration_seconds, 900), 'examSlug', v_exam_slug),
    updated_at = now()
  WHERE
    ea.id = v_attempt_id
    AND ea.user_id = v_user;

  RETURN v_payload || jsonb_build_object('subject_code', v_subject_code, 'knowledge_node_id', v_node_id, 'knowledge_node_name', v_node_name, 'exam_slug', v_exam_slug);
END;
$function$;

REVOKE ALL ON FUNCTION public.start_tka_smp_drill (text, text) FROM public;

REVOKE ALL ON FUNCTION public.start_tka_smp_drill (text, text) FROM anon;

GRANT EXECUTE ON FUNCTION public.start_tka_smp_drill (text, text) TO authenticated;

-- The projection trigger is internal-only. Keep this explicit here as defense in
-- depth even when the preceding hardening migration has already run.
REVOKE ALL ON FUNCTION app_private.refresh_tka_smp_drill_projection_after_attempt () FROM public;

REVOKE ALL ON FUNCTION app_private.refresh_tka_smp_drill_projection_after_attempt () FROM anon;

REVOKE ALL ON FUNCTION app_private.refresh_tka_smp_drill_projection_after_attempt () FROM authenticated;
