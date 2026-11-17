CREATE OR REPLACE FUNCTION public.admin_upsert_drill_exam_v1 (p_exam_id uuid, p_program_code text, p_track_code text, p_subject_code text, p_knowledge_node_id uuid, p_title text, p_slug text, p_duration_seconds integer, p_attempt_limit integer, p_question_count integer, p_question_order text, p_result_visibility text, p_access_type text, p_status text, p_token_cost integer, p_actor_id uuid)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_program_id uuid;
  v_track_id uuid;
  v_subject_id uuid;
  v_subject_name text;
  v_node_name text;
  v_node_status text;
  v_drill_type_id uuid;
  v_exam_id uuid := p_exam_id;
  v_blueprint_id uuid;
  v_section_id uuid;
  v_current_type_id uuid;
  v_section_count integer;
  v_available_count integer;
  v_materialized_count integer;
BEGIN
  IF p_actor_id IS NULL OR NOT EXISTS (
    SELECT
      1
    FROM
      public.profiles p
    WHERE
      p.id = p_actor_id AND p.status = 'active') THEN
    RAISE EXCEPTION 'DRILL_ACTOR_INVALID';
  END IF;
  IF p_title IS NULL OR btrim(p_title) = '' or p_slug is null or btrim(p_slug)='' THEN
    RAISE EXCEPTION 'EXAM_TITLE_REQUIRED';
  END IF;
  IF p_duration_seconds IS NULL OR p_duration_seconds <= 0 THEN
    RAISE EXCEPTION 'EXAM_DURATION_INVALID';
  END IF;
  IF p_attempt_limit IS NULL OR p_attempt_limit <= 0 THEN
    RAISE EXCEPTION 'EXAM_ATTEMPT_LIMIT_INVALID';
  END IF;
  IF p_question_count IS NULL OR p_question_count <= 0 THEN
    RAISE EXCEPTION 'DRILL_QUESTION_COUNT_INVALID';
  END IF;
  IF p_token_cost IS NULL OR p_token_cost < 0 THEN
    RAISE EXCEPTION 'EXAM_TOKEN_COST_INVALID';
  END IF;

  SELECT
    id
  INTO
    v_program_id
  FROM
    public.programs
  WHERE
    upper(code) = upper(btrim(p_program_code))
  LIMIT 1;
  IF v_program_id IS NULL THEN
    RAISE EXCEPTION 'PROGRAM_NOT_FOUND';
  END IF;
  SELECT
    id
  INTO
    v_track_id
  FROM
    public.tracks
  WHERE
    program_id = v_program_id
    AND upper(code) = upper(btrim(p_track_code))
  LIMIT 1;
  IF v_track_id IS NULL THEN
    RAISE EXCEPTION 'TRACK_NOT_FOUND';
  END IF;
  SELECT
    id,
    name
  INTO
    v_subject_id,
    v_subject_name
  FROM
    public.subjects
  WHERE
    track_id = v_track_id
    AND upper(code) = upper(btrim(p_subject_code))
  LIMIT 1;
  IF v_subject_id IS NULL THEN
    RAISE EXCEPTION 'SUBJECT_INVALID';
  END IF;
  SELECT
    name,
    status
  INTO
    v_node_name,
    v_node_status
  FROM
    public.knowledge_nodes
  WHERE
    id = p_knowledge_node_id
    AND subject_id = v_subject_id;
  IF v_node_name IS NULL THEN
    RAISE EXCEPTION 'DRILL_KNOWLEDGE_NODE_INVALID';
  END IF;
  IF lower(coalesce(v_node_status, '')) <> 'active' THEN
    RAISE EXCEPTION 'DRILL_KNOWLEDGE_NODE_INACTIVE';
  END IF;
  SELECT
    id
  INTO
    v_drill_type_id
  FROM
    public.exam_types
  WHERE
    upper(code) = 'DRILL'
  LIMIT 1;
  IF v_drill_type_id IS NULL THEN
    RAISE EXCEPTION 'EXAM_TYPE_INVALID';
  END IF;

  PERFORM
    pg_advisory_xact_lock(hashtextextended(coalesce(v_exam_id::text, btrim(p_slug)), 0));

  IF v_exam_id IS NOT NULL THEN
    SELECT
      e.exam_type_id,
      e.blueprint_id
    INTO
      v_current_type_id,
      v_blueprint_id
    FROM
      public.exams e
    WHERE
      e.id = v_exam_id
      AND e.program_id = v_program_id
      AND e.track_id = v_track_id
    FOR UPDATE;
    IF NOT found THEN
      RAISE EXCEPTION 'EXAM_NOT_FOUND';
    END IF;
    IF v_current_type_id <> v_drill_type_id THEN
      RAISE EXCEPTION 'DRILL_TYPE_IMMUTABLE';
    END IF;
    IF EXISTS (
      SELECT
        1
      FROM
        public.exam_attempts ea
      WHERE
        ea.exam_id = v_exam_id
        AND ea.status = 'in_progress') THEN
    RAISE EXCEPTION 'DRILL_ACTIVE_ATTEMPT_LOCKED';
  END IF;
END IF;

  SELECT
    count(DISTINCT q.id)::integer
  INTO
    v_available_count
  FROM
    public.questions q
    JOIN public.question_knowledge_nodes qkn ON qkn.question_id = q.id
      AND qkn.relation_type = 'primary'
    JOIN public.knowledge_node_paths knp ON knp.descendant_id = qkn.knowledge_node_id
    JOIN public.question_versions qv ON qv.question_id = q.id
      AND qv.version = q.version
  WHERE
    q.program_id = v_program_id
    AND q.track_id = v_track_id
    AND q.subject_id = v_subject_id
    AND q.status IN ('approved', 'published')
    AND knp.ancestor_id = p_knowledge_node_id;

  IF v_available_count < p_question_count THEN
    RAISE EXCEPTION 'DRILL_QUESTION_POOL_INSUFFICIENT:%/%', v_available_count, p_question_count;
  END IF;

  IF v_blueprint_id IS NULL THEN
    INSERT INTO public.exam_blueprints (name, program_id, track_id, period_id, description, status, created_at, updated_at)
      VALUES ('Drill · ' || v_subject_name || ' · ' || v_node_name, v_program_id, v_track_id, NULL, 'Auto-managed blueprint untuk Drill submateri.', 'active', now(), now())
    RETURNING
      id
    INTO
      v_blueprint_id;
  ELSE
    UPDATE
      public.exam_blueprints
    SET
      name = 'Drill · ' || v_subject_name || ' · ' || v_node_name,
      description = 'Auto-managed blueprint untuk Drill submateri.',
      status = 'active',
      updated_at = now()
    WHERE
      id = v_blueprint_id;
  END IF;

  IF v_exam_id IS NULL THEN
    INSERT INTO public.exams (program_id, track_id, exam_type_id, blueprint_id, title, slug, duration_seconds, attempt_limit, question_order, result_visibility, access_type, status, created_by, token_cost, created_at, updated_at)
      VALUES (v_program_id, v_track_id, v_drill_type_id, v_blueprint_id, btrim(p_title), btrim(p_slug), p_duration_seconds, p_attempt_limit, coalesce(nullif (btrim(p_question_order), ''),'random'),coalesce(nullif(btrim(p_result_visibility),''), 'instant'), coalesce(nullif (btrim(p_access_type), ''),'FREE'),coalesce(nullif(btrim(p_status),''), 'draft'), p_actor_id, p_token_cost, now(), now())
    RETURNING
      id
    INTO
      v_exam_id;
  ELSE
    UPDATE
      public.exams
    SET
      blueprint_id = v_blueprint_id,
      title = btrim(p_title),
      slug = btrim(p_slug),
      duration_seconds = p_duration_seconds,
      attempt_limit = p_attempt_limit,
      question_order = coalesce(nullif (btrim(p_question_order), ''), 'random'),
      result_visibility = coalesce(nullif (btrim(p_result_visibility), ''), 'instant'),
      access_type = coalesce(nullif (btrim(p_access_type), ''), 'FREE'),
      status = coalesce(nullif (btrim(p_status), ''), 'draft'),
      token_cost = p_token_cost,
      updated_at = now()
    WHERE
      id = v_exam_id;
  END IF;

  DELETE FROM public.exam_blueprint_rules
  WHERE blueprint_id = v_blueprint_id;
  INSERT INTO public.exam_blueprint_rules (blueprint_id, subject_id, knowledge_node_id, difficulty, question_count, weight, sort_order)
    VALUES (v_blueprint_id, v_subject_id, p_knowledge_node_id, NULL, p_question_count, 1, 1);

  SELECT
    count(*)::integer,
    min(id)
  INTO
    v_section_count,
    v_section_id
  FROM
    public.exam_sections
  WHERE
    exam_id = v_exam_id;
  IF v_section_count > 1 THEN
    RAISE EXCEPTION 'DRILL_SECTION_CONFLICT';
  END IF;
  IF v_section_id IS NULL THEN
    INSERT INTO public.exam_sections (exam_id, subject_id, title, sort_order, question_count, duration_seconds, config)
      VALUES (v_exam_id, v_subject_id, v_node_name, 1, p_question_count, p_duration_seconds, jsonb_build_object('mode', 'drill', 'knowledge_node_id', p_knowledge_node_id))
    RETURNING
      id
    INTO
      v_section_id;
  ELSE
    UPDATE
      public.exam_sections
    SET
      subject_id = v_subject_id,
      title = v_node_name,
      sort_order = 1,
      question_count = p_question_count,
      duration_seconds = p_duration_seconds,
      config = jsonb_build_object('mode', 'drill', 'knowledge_node_id', p_knowledge_node_id)
    WHERE
      id = v_section_id;
  END IF;

  DELETE FROM public.exam_question_items
  WHERE exam_id = v_exam_id;
  WITH eligible AS (
    SELECT DISTINCT
      q.id,
      q.version,
      q.question_code
    FROM
      public.questions q
      JOIN public.question_knowledge_nodes qkn ON qkn.question_id = q.id
        AND qkn.relation_type = 'primary'
      JOIN public.knowledge_node_paths knp ON knp.descendant_id = qkn.knowledge_node_id
      JOIN public.question_versions qv ON qv.question_id = q.id
        AND qv.version = q.version
    WHERE
      q.program_id = v_program_id
      AND q.track_id = v_track_id
      AND q.subject_id = v_subject_id
      AND q.status IN ('approved', 'published')
      AND knp.ancestor_id = p_knowledge_node_id
),
chosen AS (
  SELECT
    *,
    row_number() OVER (ORDER BY md5(v_exam_id::text || ':' || id::text)) AS pos
FROM
  eligible
ORDER BY
  md5(v_exam_id::text || ':' || id::text)
LIMIT p_question_count)
INSERT INTO public.exam_question_items (exam_id, section_id, question_id, question_version, position, score_weight)
SELECT
  v_exam_id,
  v_section_id,
  id,
  version,
  pos,
  1
FROM
  chosen;
  get diagnostics v_materialized_count = row_count;

  IF v_materialized_count <> p_question_count THEN
    RAISE EXCEPTION 'DRILL_MATERIALIZATION_MISMATCH:%/%', v_materialized_count, p_question_count;
  END IF;

  RETURN jsonb_build_object('exam_id', v_exam_id, 'blueprint_id', v_blueprint_id, 'section_id', v_section_id, 'subject_id', v_subject_id, 'knowledge_node_id', p_knowledge_node_id, 'available_question_count', v_available_count, 'question_count', v_materialized_count);
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_upsert_drill_exam_v1 (uuid, text, text, text, uuid, text, text, integer, integer, integer, text, text, text, text, integer, uuid) FROM public, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.admin_upsert_drill_exam_v1 (uuid, text, text, text, uuid, text, text, integer, integer, integer, text, text, text, text, integer, uuid) TO service_role;
