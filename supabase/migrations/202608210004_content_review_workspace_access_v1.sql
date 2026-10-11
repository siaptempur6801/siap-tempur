CREATE OR REPLACE FUNCTION app_private.save_question_draft (p_question_id uuid, p_program_code text, p_track_code text, p_subject_code text, p_question_type text, p_stem text, p_difficulty text, p_cognitive_level text, p_estimated_seconds integer, p_source_reference text, p_stimulus_id uuid, p_explanation text, p_knowledge_node_id uuid, p_options jsonb, p_change_reason text)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $$
DECLARE
  v_actor uuid := auth.uid ();
  v_program_id uuid;
  v_track_id uuid;
  v_subject_id uuid;
  v_q public.questions%rowtype;
  v_question_id uuid;
  v_next_version integer;
  v_option_count integer;
  v_correct_count integer;
  v_distinct_keys integer;
  v_group_count integer;
  v_snapshot jsonb;
  v_can_manage boolean;
  v_is_new boolean := p_question_id IS NULL;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_can_manage := app_private.current_user_has_permission ('question.manage');
  IF v_is_new THEN
    IF NOT app_private.current_user_has_permission ('content.create') AND NOT v_can_manage THEN
      RAISE EXCEPTION 'Content create permission required';
    END IF;
  ELSE
    IF NOT app_private.current_user_has_permission ('content.update') AND NOT v_can_manage THEN
      RAISE EXCEPTION 'Content update permission required';
    END IF;
  END IF;

  SELECT
    id
  INTO
    v_program_id
  FROM
    public.programs
  WHERE
    upper(code) = upper(trim(p_program_code))
    AND upper(status) = 'ACTIVE'
  LIMIT 1;
  IF v_program_id IS NULL THEN
    RAISE EXCEPTION 'Program not found';
  END IF;

  SELECT
    id
  INTO
    v_track_id
  FROM
    public.tracks
  WHERE
    program_id = v_program_id
    AND upper(code) = upper(trim(p_track_code))
    AND upper(status) = 'ACTIVE'
  LIMIT 1;
  IF v_track_id IS NULL THEN
    RAISE EXCEPTION 'Track not found';
  END IF;

  SELECT
    id
  INTO
    v_subject_id
  FROM
    public.subjects
  WHERE
    track_id = v_track_id
    AND upper(code) = upper(trim(p_subject_code))
    AND upper(status) = 'ACTIVE'
  LIMIT 1;
  IF v_subject_id IS NULL THEN
    RAISE EXCEPTION 'Subject not found';
  END IF;

  IF lower(trim(p_question_type))
    NOT IN ('single_choice', 'multiple_choice', 'category') THEN
    RAISE EXCEPTION 'Invalid question type';
  END IF;
  IF nullif (trim(p_stem), '') IS NULL THEN
    RAISE EXCEPTION 'Question stem required';
  END IF;
  IF p_estimated_seconds IS NOT NULL AND p_estimated_seconds <= 0 THEN
    RAISE EXCEPTION 'Estimated seconds invalid';
  END IF;

  IF p_stimulus_id IS NOT NULL AND NOT EXISTS (
    SELECT
      1
    FROM
      public.question_stimuli s
    WHERE
      s.id = p_stimulus_id AND s.program_id = v_program_id AND s.track_id = v_track_id AND s.subject_id = v_subject_id) THEN
    RAISE EXCEPTION 'Stimulus does not match question context';
  END IF;

  IF p_knowledge_node_id IS NOT NULL AND NOT EXISTS (
    SELECT
      1
    FROM
      public.knowledge_nodes k
    WHERE
      k.id = p_knowledge_node_id AND k.subject_id = v_subject_id AND upper(k.status) = 'ACTIVE') THEN
    RAISE EXCEPTION 'Knowledge node does not match subject';
  END IF;

  IF p_options IS NULL OR jsonb_typeof(p_options) <> 'array' THEN
    RAISE EXCEPTION 'Options must be an array';
  END IF;
  v_option_count := jsonb_array_length(p_options);
  IF v_option_count < 2 THEN
    RAISE EXCEPTION 'At least two options required';
  END IF;
  IF EXISTS (
    SELECT
      1
    FROM
      jsonb_array_elements(p_options) o
    WHERE
      nullif (trim(o ->> 'key'), '') is null or nullif(trim(o->>'content'),'') IS NULL) THEN
  RAISE EXCEPTION 'Option key and content required';
END IF;
  SELECT
    count(DISTINCT upper(trim(o ->> 'key')))
  INTO
    v_distinct_keys
  FROM
    jsonb_array_elements(p_options) o;
  IF v_distinct_keys <> v_option_count THEN
    RAISE EXCEPTION 'Option keys must be unique';
  END IF;
  IF EXISTS (
    SELECT
      1
    FROM
      jsonb_array_elements(p_options) o
    WHERE
      nullif (o ->> 'score', '') IS NOT NULL
      AND (o ->> 'score')::numeric < 0) THEN
  RAISE EXCEPTION 'Option score cannot be negative';
END IF;
  SELECT
    count(*) FILTER (WHERE coalesce((o ->> 'is_correct')::boolean, FALSE))
  INTO
    v_correct_count
  FROM
    jsonb_array_elements(p_options) o;

  IF lower(trim(p_question_type)) = 'single_choice' AND v_correct_count <> 1 THEN
    RAISE EXCEPTION 'Single choice requires exactly one correct option';
  END IF;
  IF lower(trim(p_question_type)) = 'multiple_choice' AND (v_option_count < 3 OR v_correct_count < 2 OR v_correct_count >= v_option_count) THEN
    RAISE EXCEPTION 'Multiple choice requires at least three options and at least two, but not all, correct options';
  END IF;
  IF lower(trim(p_question_type)) = 'category' THEN
    SELECT
      count(DISTINCT nullif (trim(o ->> 'response_group'), ''))
    INTO
      v_group_count
    FROM
      jsonb_array_elements(p_options) o;
    IF v_group_count < 2 THEN
      RAISE EXCEPTION 'Category requires at least two response groups';
    END IF;
    IF EXISTS (
      SELECT
        1
      FROM (
        SELECT
          nullif (trim(o ->> 'response_group'), '') AS response_group,
          count(*) AS option_count,
          count(*) FILTER (WHERE coalesce((o ->> 'is_correct')::boolean, FALSE)) AS correct_count
        FROM
          jsonb_array_elements(p_options) o
        GROUP BY
          nullif (trim(o ->> 'response_group'), '')) g
      WHERE
        g.response_group IS NULL
        OR g.option_count < 2
        OR g.correct_count <> 1) THEN
    RAISE EXCEPTION 'Each category response group requires at least two options and exactly one correct option';
  END IF;
END IF;

  IF NOT v_is_new THEN
    SELECT
      *
    INTO
      v_q
    FROM
      public.questions
    WHERE
      id = p_question_id
    FOR UPDATE;
    IF NOT found THEN
      RAISE EXCEPTION 'Question not found';
    END IF;
    IF v_q.program_id <> v_program_id OR v_q.track_id <> v_track_id THEN
      RAISE EXCEPTION 'Question context mismatch';
    END IF;
    IF lower(v_q.status)
      NOT IN ('draft', 'revision_required', 'rejected') THEN
      RAISE EXCEPTION 'Question not editable in current status';
    END IF;
    IF v_q.author_id <> v_actor AND NOT v_can_manage THEN
      RAISE EXCEPTION 'Only author or question manager can edit this question';
    END IF;

    SELECT
      jsonb_build_object('question', to_jsonb (v_q), 'options', coalesce((
          SELECT
            jsonb_agg(to_jsonb (o)
          ORDER BY o.sort_order)
          FROM public.question_options o
          WHERE
            o.question_id = v_q.id), '[]'::jsonb), 'explanations', coalesce((
          SELECT
            jsonb_agg(to_jsonb (e)
            ORDER BY e.version DESC, e.created_at DESC)
          FROM public.question_explanations e
          WHERE
            e.question_id = v_q.id), '[]'::jsonb), 'knowledge_nodes', coalesce((
          SELECT
            jsonb_agg(to_jsonb (qk))
          FROM public.question_knowledge_nodes qk
        WHERE
          qk.question_id = v_q.id), '[]'::jsonb), 'stimulus', (
        SELECT
          to_jsonb (s)
        FROM public.question_stimuli s
      WHERE
        s.id = v_q.stimulus_id))
    INTO
      v_snapshot;

    INSERT INTO public.question_versions (question_id, version, snapshot, changed_by, change_reason)
      VALUES (v_q.id, v_q.version, v_snapshot, v_actor, coalesce(nullif (trim(p_change_reason), ''), 'Content workspace update'))
    ON CONFLICT (question_id, version)
      DO NOTHING;

    v_question_id := v_q.id;
    v_next_version := v_q.version + 1;
    UPDATE
      public.questions
    SET
      subject_id = v_subject_id,
      question_type = lower(trim(p_question_type)),
      stem = trim(p_stem),
      difficulty = lower(trim(p_difficulty)),
      cognitive_level = nullif (trim(p_cognitive_level), ''),
      source_reference = nullif (trim(p_source_reference), ''),
      estimated_seconds = p_estimated_seconds,
      stimulus_id = p_stimulus_id,
      status = CASE WHEN lower(v_q.status) = 'rejected' THEN
        'draft'
      ELSE
        v_q.status
      END,
      version = v_next_version,
      reviewer_id = NULL,
      updated_at = now()
    WHERE
      id = v_question_id;
  ELSE
    v_next_version := 1;
    INSERT INTO public.questions (question_code, program_id, track_id, subject_id, question_type, stem, difficulty, cognitive_level, source_type, source_reference, estimated_seconds, status, version, author_id, reviewer_id, published_at, stimulus_id, stimulus_order, response_config, created_at, updated_at)
      VALUES (format('CWS-%s-%s-%s-%s', upper(trim(p_track_code)), upper(trim(p_subject_code)), to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS'), upper(substr(replace(gen_random_uuid ()::text, '-', ''), 1, 6))), v_program_id, v_track_id, v_subject_id, lower(trim(p_question_type)), trim(p_stem), lower(trim(p_difficulty)), nullif (trim(p_cognitive_level), ''), 'internal', nullif (trim(p_source_reference), ''), p_estimated_seconds, 'draft', 1, v_actor, NULL, NULL, p_stimulus_id, 0, '{}'::jsonb, now(), now())
  RETURNING
    id
  INTO
    v_question_id;
  END IF;

  DELETE FROM public.question_options
  WHERE question_id = v_question_id;
  INSERT INTO public.question_options (question_id, option_key, content, is_correct, score, sort_order, image_url, response_group, response_group_order, metadata)
  SELECT
    v_question_id,
    upper(trim(o.value ->> 'key')),
    trim(o.value ->> 'content'),
    CASE WHEN o.value ? 'is_correct' THEN
      (o.value ->> 'is_correct')::boolean
    ELSE
      NULL
    END,
    CASE WHEN nullif (o.value ->> 'score', '') IS NULL THEN
      NULL
    ELSE
      (o.value ->> 'score')::numeric
    END,
    coalesce(nullif (o.value ->> 'sort_order', '')::integer, o.ordinality::integer),
    nullif (trim(o.value ->> 'image_url'), ''),
    nullif (trim(o.value ->> 'response_group'), ''),
    CASE WHEN nullif (o.value ->> 'response_group_order', '') IS NULL THEN
      NULL
    ELSE
      (o.value ->> 'response_group_order')::integer
    END,
    coalesce(o.value -> 'metadata', '{}'::jsonb)
  FROM
    jsonb_array_elements(p_options)
  WITH ORDINALITY AS o (value, ORDINALITY);

  DELETE FROM public.question_explanations
  WHERE question_id = v_question_id;
  IF nullif (trim(p_explanation), '') IS NOT NULL THEN
    INSERT INTO public.question_explanations (question_id, content, format, video_url, version, created_at, updated_at)
      VALUES (v_question_id, trim(p_explanation), 'markdown', NULL, v_next_version, now(), now());
  END IF;

  DELETE FROM public.question_knowledge_nodes
  WHERE question_id = v_question_id
    AND relation_type = 'primary';
  IF p_knowledge_node_id IS NOT NULL THEN
    INSERT INTO public.question_knowledge_nodes (question_id, knowledge_node_id, relation_type)
      VALUES (v_question_id, p_knowledge_node_id, 'primary')
    ON CONFLICT (question_id, knowledge_node_id)
      DO UPDATE SET
        relation_type = 'primary';
  END IF;

INSERT INTO public.audit_logs (actor_user_id, action, entity_type, entity_id, old_data, new_data)
  VALUES (v_actor, CASE WHEN v_is_new THEN
      'question.content.created'
    ELSE
      'question.content.updated'
    END, 'question', v_question_id, CASE WHEN v_is_new THEN
      NULL
    ELSE
      v_snapshot
    END, jsonb_build_object('version', v_next_version, 'status', CASE WHEN v_is_new THEN
        'draft'
      ELSE
        CASE WHEN lower(v_q.status) = 'rejected' THEN
          'draft'
        ELSE
          v_q.status
        END
      END, 'subject_id', v_subject_id));

  RETURN jsonb_build_object('question_id', v_question_id, 'version', v_next_version, 'status', CASE WHEN v_is_new THEN
      'draft'
    ELSE
      CASE WHEN lower(v_q.status) = 'rejected' THEN
        'draft'
      ELSE
        v_q.status
      END
    END);
END;
$$;

CREATE OR REPLACE FUNCTION public.save_question_draft (p_question_id uuid, p_program_code text, p_track_code text, p_subject_code text, p_question_type text, p_stem text, p_difficulty text, p_cognitive_level text, p_estimated_seconds integer, p_source_reference text, p_stimulus_id uuid, p_explanation text, p_knowledge_node_id uuid, p_options jsonb, p_change_reason text)
  RETURNS jsonb
  LANGUAGE sql
  SET search_path = ''
  AS $$
  SELECT
    app_private.save_question_draft (p_question_id, p_program_code, p_track_code, p_subject_code, p_question_type, p_stem, p_difficulty, p_cognitive_level, p_estimated_seconds, p_source_reference, p_stimulus_id, p_explanation, p_knowledge_node_id, p_options, p_change_reason);
$$;

CREATE OR REPLACE FUNCTION app_private.list_content_people ()
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $$
DECLARE
  v_actor uuid := auth.uid ();
  v_result jsonb;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF NOT (app_private.current_user_has_permission ('content.read') OR app_private.current_user_has_permission ('content.create') OR app_private.current_user_has_permission ('content.update') OR app_private.current_user_has_permission ('content.review') OR app_private.current_user_has_permission ('content.publish') OR app_private.current_user_has_permission ('question.manage')) THEN
    RAISE EXCEPTION 'Content workspace permission required';
  END IF;
  SELECT
    coalesce(jsonb_agg(person ORDER BY person ->> 'full_name'), '[]'::jsonb)
  INTO
    v_result
  FROM (
    SELECT
      jsonb_build_object('id', pr.id, 'full_name', pr.full_name, 'display_name', pr.display_name, 'avatar_url', pr.avatar_url, 'status', pr.status, 'can_review', EXISTS (
          SELECT
            1
          FROM public.user_roles ur
          JOIN public.role_permissions rp ON rp.role_id = ur.role_id
          JOIN public.permissions pe ON pe.id = rp.permission_id
          WHERE
            ur.user_id = pr.id
            AND pe.code = 'content.review'), 'roles', coalesce((
            SELECT
              jsonb_agg(DISTINCT r.code ORDER BY r.code)
            FROM public.user_roles ur
            JOIN public.roles r ON r.id = ur.role_id
          WHERE
            ur.user_id = pr.id), '[]'::jsonb)) AS person
    FROM
      public.profiles pr
    WHERE
      pr.status = 'active'
      AND EXISTS (
        SELECT
          1
        FROM
          public.user_roles ur
          JOIN public.role_permissions rp ON rp.role_id = ur.role_id
          JOIN public.permissions pe ON pe.id = rp.permission_id
        WHERE
          ur.user_id = pr.id
          AND pe.code IN ('content.read', 'content.create', 'content.update', 'content.review', 'content.publish', 'question.manage'))) x;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_content_people ()
  RETURNS jsonb
  LANGUAGE sql
  SET search_path = ''
  AS $$
  SELECT
    app_private.list_content_people ();
$$;

CREATE OR REPLACE FUNCTION app_private.get_content_question_detail (p_question_id uuid)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $$
DECLARE
  v_actor uuid := auth.uid ();
  v_q public.questions%rowtype;
  v_allowed boolean;
  v_result jsonb;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  SELECT
    *
  INTO
    v_q
  FROM
    public.questions
  WHERE
    id = p_question_id;
  IF NOT found THEN
    RAISE EXCEPTION 'Question not found';
  END IF;
  v_allowed := v_q.author_id = v_actor
    OR v_q.reviewer_id = v_actor
    OR v_q.status IN ('approved', 'published')
    OR app_private.current_user_has_permission ('content.review')
    OR app_private.current_user_has_permission ('question.manage');
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Question detail access denied';
  END IF;
  SELECT
    jsonb_build_object('question', to_jsonb (v_q), 'options', coalesce((
        SELECT
          jsonb_agg(to_jsonb (o)
        ORDER BY o.sort_order)
        FROM public.question_options o
        WHERE
          o.question_id = v_q.id), '[]'::jsonb), 'explanation', (
        SELECT
          to_jsonb (e)
        FROM public.question_explanations e
        WHERE
          e.question_id = v_q.id ORDER BY e.version DESC, e.created_at DESC LIMIT 1), 'stimulus', (
        SELECT
          to_jsonb (s)
        FROM public.question_stimuli s
      WHERE
        s.id = v_q.stimulus_id), 'knowledge_mappings', coalesce((
        SELECT
          jsonb_agg(to_jsonb (qk))
        FROM public.question_knowledge_nodes qk
      WHERE
        qk.question_id = v_q.id), '[]'::jsonb), 'knowledge_nodes', coalesce((
      SELECT
        jsonb_agg(to_jsonb (k)
      ORDER BY k.depth, k.sort_order, k.name)
      FROM public.knowledge_nodes k
    WHERE
      k.id IN (
        SELECT
          qk.knowledge_node_id
        FROM public.question_knowledge_nodes qk
      WHERE
        qk.question_id = v_q.id)), '[]'::jsonb), 'versions', coalesce((
    SELECT
      jsonb_agg(to_jsonb (v)
      ORDER BY v.version DESC)
  FROM public.question_versions v
WHERE
  v.question_id = v_q.id), '[]'::jsonb), 'reviews', coalesce((
  SELECT
    jsonb_agg(to_jsonb (r)
    ORDER BY r.review_round DESC, r.created_at DESC)
FROM public.content_reviews r
WHERE
  r.entity_type = 'question'
    AND r.entity_id = v_q.id), '[]'::jsonb), 'audit_logs', coalesce((
  SELECT
    jsonb_agg(to_jsonb (a)
    ORDER BY a.created_at DESC)
FROM (
  SELECT
    *
  FROM public.audit_logs a
WHERE
  a.entity_type = 'question'
    AND a.entity_id = v_q.id ORDER BY a.created_at DESC LIMIT 100) a), '[]'::jsonb), 'stimulus_candidates', coalesce((
  SELECT
    jsonb_agg(to_jsonb (s)
  ORDER BY s.updated_at DESC)
  FROM (
    SELECT
      *
    FROM public.question_stimuli s
  WHERE
    s.program_id = v_q.program_id
    AND s.track_id = v_q.track_id
    AND s.subject_id = v_q.subject_id ORDER BY s.updated_at DESC LIMIT 100) s), '[]'::jsonb), 'subject_knowledge_nodes', coalesce((
  SELECT
    jsonb_agg(to_jsonb (k)
  ORDER BY k.depth, k.sort_order, k.name)
  FROM public.knowledge_nodes k
WHERE
  k.subject_id = v_q.subject_id
    AND upper(k.status) = 'ACTIVE'), '[]'::jsonb))
  INTO
    v_result;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_content_question_detail (p_question_id uuid)
  RETURNS jsonb
  LANGUAGE sql
  SET search_path = ''
  AS $$
  SELECT
    app_private.get_content_question_detail (p_question_id);
$$;

REVOKE ALL ON FUNCTION public.save_question_draft (uuid, text, text, text, text, text, text, text, integer, text, uuid, text, uuid, jsonb, text) FROM public, anon;

GRANT EXECUTE ON FUNCTION public.save_question_draft (uuid, text, text, text, text, text, text, text, integer, text, uuid, text, uuid, jsonb, text) TO authenticated;

REVOKE ALL ON FUNCTION public.list_content_people () FROM public, anon;

GRANT EXECUTE ON FUNCTION public.list_content_people () TO authenticated;

REVOKE ALL ON FUNCTION public.get_content_question_detail (uuid) FROM public, anon;

GRANT EXECUTE ON FUNCTION public.get_content_question_detail (uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION app_private.save_question_draft (uuid, text, text, text, text, text, text, text, integer, text, uuid, text, uuid, jsonb, text) TO authenticated;

GRANT EXECUTE ON FUNCTION app_private.list_content_people () TO authenticated;

GRANT EXECUTE ON FUNCTION app_private.get_content_question_detail (uuid) TO authenticated;
