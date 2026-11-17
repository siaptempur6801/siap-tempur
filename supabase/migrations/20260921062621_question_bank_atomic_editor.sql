-- Question Bank: authenticated, transactional writes with optimistic concurrency.
-- Apply to staging first. Production requires explicit GO.
BEGIN;
CREATE OR REPLACE FUNCTION app_private.assert_question_bank_permission (p_permission text)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $$
BEGIN
  IF auth.uid () IS NULL OR NOT EXISTS (
    SELECT
      1
    FROM
      public.profiles
    WHERE
      id = auth.uid () AND lower(status) = 'active') THEN
    RAISE EXCEPTION 'QUESTION_ACCESS_DENIED';
  END IF;
  IF NOT EXISTS (
    SELECT
      1
    FROM
      public.user_roles ur
      JOIN public.role_permissions rp ON rp.role_id = ur.role_id
      JOIN public.permissions p ON p.id = rp.permission_id
    WHERE
      ur.user_id = auth.uid ()
      AND ur.scope_type IS NULL
      AND p.code = p_permission) THEN
  RAISE EXCEPTION 'QUESTION_ACCESS_DENIED';
END IF;
END
$$;
REVOKE ALL ON FUNCTION app_private.assert_question_bank_permission (text) FROM public, anon, authenticated;
CREATE OR REPLACE FUNCTION app_private.question_bank_editor (p_program text, p_track text, p_id uuid)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $$
DECLARE
  v_program uuid;
  v_track uuid;
  v_q public.questions%rowtype;
BEGIN
  PERFORM
    app_private.assert_question_bank_permission ('question.manage');
  SELECT
    p.id,
    t.id
  INTO
    v_program,
    v_track
  FROM
    public.programs p
    JOIN public.tracks t ON t.program_id = p.id
  WHERE
    p.code = p_program
    AND t.code = p_track
    AND upper(p.status) = 'ACTIVE'
    AND upper(t.status) = 'ACTIVE';
  IF v_track IS NULL THEN
    RAISE EXCEPTION 'QUESTION_CATALOG_MISMATCH';
  END IF;
  -- A single SQL statement below reads question, options and version from one MVCC snapshot.
  IF p_id IS NOT NULL AND NOT EXISTS (
    SELECT
      1
    FROM
      public.questions
    WHERE
      id = p_id AND program_id = v_program AND track_id = v_track) THEN
    RAISE EXCEPTION 'QUESTION_NOT_FOUND';
  END IF;
  RETURN jsonb_build_object('question', (
      SELECT
        to_jsonb (q)
      FROM public.questions q
      WHERE
        q.id = p_id
        AND q.track_id = v_track), 'options', coalesce((
        SELECT
          jsonb_agg(to_jsonb (o)
        ORDER BY o.sort_order, o.id)
        FROM public.question_options o
        WHERE
          question_id = p_id), '[]'), 'explanation', coalesce((
        SELECT
          content
        FROM public.question_explanations
      WHERE
        question_id = p_id ORDER BY version DESC, created_at DESC LIMIT 1), ''), 'knowledgeNodeId', coalesce((
  SELECT
    knowledge_node_id::text
  FROM public.question_knowledge_nodes
WHERE
  question_id = p_id
    AND relation_type = 'primary' LIMIT 1), ''), 'stimuli', coalesce((
  SELECT
    jsonb_agg(jsonb_build_object('id', s.id, 'subject_id', s.subject_id, 'title', s.title, 'content', s.content, 'image_url', s.image_url)
  ORDER BY s.stimulus_code)
  FROM public.question_stimuli s
WHERE
  s.track_id = v_track), '[]'), 'knowledgeNodes', coalesce((
  SELECT
    jsonb_agg(jsonb_build_object('id', k.id, 'subject_id', k.subject_id, 'name', k.name)
    ORDER BY k.name)
  FROM public.knowledge_nodes k
  JOIN public.subjects s ON s.id = k.subject_id
WHERE
  s.track_id = v_track
    AND upper(k.status) = 'ACTIVE'), '[]'), 'versions', coalesce((
  SELECT
    jsonb_agg(to_jsonb (v)
    ORDER BY v.version DESC)
  FROM (
    SELECT
      version, change_reason, created_at
    FROM public.question_versions
  WHERE
    question_id = p_id ORDER BY version DESC LIMIT 20) v), '[]'));
END
$$;
CREATE OR REPLACE FUNCTION app_private.mutate_question_bank (p_payload jsonb)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $$
DECLARE
  v_actor uuid := auth.uid ();
  v_q public.questions%rowtype;
  v_id uuid := nullif (p_payload ->> 'id', '')::uuid;
  v_program uuid;
  v_track uuid;
  v_subject uuid;
  v_version integer;
  v_snapshot jsonb;
  v_old_action text;
  v_op text := p_payload ->> 'operation';
  v_options jsonb := p_payload -> 'options';
  v_type text := p_payload ->> 'questionType';
  v_count integer;
  v_correct integer;
  v_stimulus uuid := nullif (p_payload ->> 'stimulusId', '')::uuid;
  v_node uuid := nullif (p_payload ->> 'knowledgeNodeId', '')::uuid;
  v_reason text := btrim(p_payload ->> 'changeReason');
  v_explanation public.question_explanations%rowtype;
BEGIN
  PERFORM
    app_private.assert_question_bank_permission ('question.manage');
  IF v_op IS NULL OR v_op NOT IN ('save', 'publish', 'archive', 'revise') THEN
    RAISE EXCEPTION 'QUESTION_OPERATION_INVALID';
  END IF;
  IF v_reason IS NULL OR length(v_reason) = 0 OR length(v_reason) > 2000 THEN
    RAISE EXCEPTION 'QUESTION_REASON_REQUIRED';
  END IF;
  SELECT
    p.id,
    t.id
  INTO
    v_program,
    v_track
  FROM
    public.programs p
    JOIN public.tracks t ON t.program_id = p.id
  WHERE
    p.code = p_payload ->> 'program'
    AND t.code = p_payload ->> 'track'
    AND upper(p.status) = 'ACTIVE'
    AND upper(t.status) = 'ACTIVE';
  IF v_track IS NULL THEN
    RAISE EXCEPTION 'QUESTION_CATALOG_MISMATCH';
  END IF;
  IF v_id IS NOT NULL THEN
    SELECT
      *
    INTO
      v_q
    FROM
      public.questions
    WHERE
      id = v_id
    FOR UPDATE;
    IF NOT found OR v_q.program_id <> v_program OR v_q.track_id <> v_track THEN
      RAISE EXCEPTION 'QUESTION_NOT_FOUND';
    END IF;
    IF (p_payload ->> 'expectedVersion')::integer IS DISTINCT FROM v_q.version OR (p_payload ->> 'expectedUpdatedAt')::timestamptz IS DISTINCT FROM v_q.updated_at THEN
      RAISE EXCEPTION 'QUESTION_VERSION_CONFLICT';
    END IF;
    v_snapshot := app_private.question_snapshot_json (v_id);
  ELSIF v_op <> 'save' THEN
    RAISE EXCEPTION 'QUESTION_NOT_FOUND';
  END IF;
  v_old_action := current_setting('app.workflow_action', TRUE);
  PERFORM
    set_config('app.workflow_action', 'question_bank', TRUE);

  IF v_op = 'publish' THEN
    PERFORM
      app_private.assert_question_bank_permission ('content.publish');
    PERFORM
      app_private.publish_question (v_id);
  ELSIF v_op IN ('archive', 'revise') THEN
    IF v_q.status = 'published' THEN
      PERFORM
        app_private.assert_question_bank_permission ('content.publish');
    END IF;
    IF v_op = 'revise' AND v_q.status NOT IN ('approved', 'published', 'archived', 'rejected') THEN
      RAISE EXCEPTION 'QUESTION_WORKFLOW_LOCKED';
    END IF;
    -- Returning to draft invalidates old review approvals; subsequent submission creates a fresh round.
    UPDATE
      public.content_reviews
    SET
      status = 'cancelled'
    WHERE
      entity_type = 'question'
      AND entity_id = v_id
      AND status = 'pending';
    UPDATE
      public.questions
    SET
      status = CASE WHEN v_op = 'archive' THEN
        'archived'
      ELSE
        'draft'
      END,
      reviewer_id = NULL,
      updated_at = clock_timestamp()
    WHERE
      id = v_id;
  ELSE
    IF v_id IS NOT NULL AND v_q.status NOT IN ('draft', 'revision_required', 'rejected') THEN
      RAISE EXCEPTION 'QUESTION_WORKFLOW_LOCKED';
    END IF;
    SELECT
      id
    INTO
      v_subject
    FROM
      public.subjects
    WHERE
      track_id = v_track
      AND code = p_payload ->> 'subject'
      AND upper(status) = 'ACTIVE';
    IF v_subject IS NULL THEN
      RAISE EXCEPTION 'SUBJECT_INVALID';
    END IF;
    IF v_type IS NULL OR v_type NOT IN ('single_choice', 'multiple_choice', 'category') THEN
      RAISE EXCEPTION 'QUESTION_TYPE_INVALID';
    END IF;
    IF coalesce(length(btrim(p_payload ->> 'stem')), 0) = 0 OR length(p_payload ->> 'stem') > 50000 THEN
      RAISE EXCEPTION 'QUESTION_STEM_REQUIRED';
    END IF;
    IF coalesce(p_payload ->> 'difficulty', '')
      NOT IN ('easy', 'medium', 'hard') THEN
      RAISE EXCEPTION 'QUESTION_DIFFICULTY_INVALID';
    END IF;
    IF length(coalesce(p_payload ->> 'explanation', ''))>50000 or length(coalesce(p_payload->>'sourceReference','')) > 2000 OR length(coalesce(p_payload ->> 'cognitiveLevel', '')) > 100 THEN
      RAISE EXCEPTION 'QUESTION_FIELDS_TOO_LONG';
    END IF;
    IF nullif (p_payload ->> 'estimatedSeconds', '') IS NOT NULL AND (p_payload ->> 'estimatedSeconds')::integer NOT BETWEEN 1 AND 86400 THEN
      RAISE EXCEPTION 'QUESTION_ESTIMATED_SECONDS_INVALID';
    END IF;
    IF v_stimulus IS NOT NULL AND NOT EXISTS (
      SELECT
        1
      FROM
        public.question_stimuli
      WHERE
        id = v_stimulus AND program_id = v_program AND track_id = v_track AND subject_id = v_subject) THEN
      RAISE EXCEPTION 'QUESTION_STIMULUS_MISMATCH';
    END IF;
    IF v_node IS NOT NULL AND NOT EXISTS (
      SELECT
        1
      FROM
        public.knowledge_nodes
      WHERE
        id = v_node AND subject_id = v_subject AND upper(status) = 'ACTIVE') THEN
      RAISE EXCEPTION 'QUESTION_NODE_MISMATCH';
    END IF;
    IF v_options IS NULL OR jsonb_typeof(v_options) <> 'array' THEN
      RAISE EXCEPTION 'QUESTION_OPTIONS_REQUIRED';
    END IF;
    v_count := jsonb_array_length(v_options);
    IF v_count < 2 OR v_count > 100 THEN
      RAISE EXCEPTION 'QUESTION_OPTIONS_REQUIRED';
    END IF;
    IF EXISTS (
      SELECT
        1
      FROM
        jsonb_array_elements(v_options) o
      WHERE
        jsonb_typeof(o) <> 'object'
        OR coalesce(o ->> 'key', '') !~ '^[A-Z0-9_-]{1,16}$'
        OR coalesce(length(btrim(o ->> 'content')), 0) = 0
        OR length(o ->> 'content') > 20000
        OR length(coalesce(o ->> 'responseGroup', '')) > 200
        OR (o -> 'isCorrect' IS NOT NULL
          AND jsonb_typeof(o -> 'isCorrect')
          NOT IN ('boolean', 'null'))
        OR (nullif (o ->> 'score', '') IS NOT NULL
          AND ((o ->> 'score')::numeric NOT BETWEEN 0 AND 99999999.99
            OR (o ->> 'score')::numeric <> round((o ->> 'score')::numeric, 2)))
        OR (nullif (o ->> 'responseGroupOrder', '') IS NOT NULL
          AND (o ->> 'responseGroupOrder')::integer < 1)
        OR (nullif (o ->> 'imageUrl', '') IS NOT NULL
          AND (length(o ->> 'imageUrl') > 2000
            OR o ->> 'imageUrl' !~ '^https://[^/@[:space:]]+([/:?#][^[:space:]]*)?$'))) THEN
    RAISE EXCEPTION 'QUESTION_OPTIONS_INVALID';
  END IF;
  IF (
    SELECT
      count(DISTINCT o ->> 'key')
    FROM
      jsonb_array_elements(v_options) o) <> v_count THEN
    RAISE EXCEPTION 'QUESTION_OPTION_KEYS_DUPLICATE';
  END IF;
  SELECT
    count(*)
  INTO
    v_correct
  FROM
    jsonb_array_elements(v_options) o
WHERE (o ->> 'isCorrect')::boolean IS TRUE;
  IF v_type = 'single_choice' AND v_correct <> 1 THEN
    RAISE EXCEPTION 'QUESTION_CORRECT_OPTION_REQUIRED';
  END IF;
  IF v_type = 'multiple_choice' AND (v_count < 3 OR v_correct < 2 OR v_correct >= v_count) THEN
    RAISE EXCEPTION 'QUESTION_MULTIPLE_CHOICE_INVALID';
  END IF;
  IF v_type = 'category' THEN
    IF (
      SELECT
        count(DISTINCT nullif (btrim(o ->> 'responseGroup'), ''))
      FROM
        jsonb_array_elements(v_options) o) < 2 THEN
      RAISE EXCEPTION 'QUESTION_CATEGORY_INVALID';
    END IF;
    IF EXISTS (
      SELECT
        1
      FROM
        jsonb_array_elements(v_options) o
      GROUP BY
        nullif (btrim(o ->> 'responseGroup'), '')
      HAVING
        nullif (btrim(o ->> 'responseGroup'), '') IS NULL
        OR count(*) < 2
        OR count(*) FILTER (WHERE (o ->> 'isCorrect')::boolean IS TRUE) <> 1) THEN
  RAISE EXCEPTION 'QUESTION_CATEGORY_INVALID';
  END IF;
END IF;
  IF v_id IS NOT NULL AND EXISTS (
    SELECT
      1
    FROM
      public.attempt_questions aq
      JOIN public.exam_attempts ea ON ea.id = aq.attempt_id
    WHERE
      aq.question_id = v_id AND lower(ea.status) IN ('created', 'in_progress')) THEN
    RAISE EXCEPTION 'QUESTION_LOCKED_BY_ACTIVE_ATTEMPT';
  END IF;
  IF v_id IS NULL THEN
    INSERT INTO public.questions (question_code, program_id, track_id, subject_id, question_type, stem, difficulty, author_id, status, version)
      VALUES ('QB-' || upper(substr(replace(gen_random_uuid ()::text, '-', ''), 1, 16)), v_program, v_track, v_subject, v_type, p_payload ->> 'stem', p_payload ->> 'difficulty', v_actor, 'draft', 1)
    RETURNING
      id
    INTO
      v_id;
    v_version := 1;
  ELSE
    -- Preserve canonical snapshots without overwriting a historical version.
    PERFORM
      app_private.ensure_question_snapshot (v_id, v_actor, v_reason);
    SELECT
      greatest (q.version, coalesce((
          SELECT
            max(version)
          FROM public.question_versions
          WHERE
            question_id = v_id), 0)) + 1
    INTO
      v_version
    FROM
      public.questions q
    WHERE
      q.id = v_id;
  END IF;
  UPDATE
    public.questions
  SET
    subject_id = v_subject,
    question_type = v_type,
    stem = p_payload ->> 'stem',
    difficulty = p_payload ->> 'difficulty',
    cognitive_level = nullif (p_payload ->> 'cognitiveLevel', ''),source_reference=nullif(p_payload->>'sourceReference',''),
    estimated_seconds = nullif (p_payload ->> 'estimatedSeconds', '')::integer,
    stimulus_id = v_stimulus,
    status = CASE WHEN v_q.status = 'revision_required' THEN
      'revision_required'
    ELSE
      'draft'
    END,
    version = v_version,
    reviewer_id = NULL,
    updated_at = clock_timestamp()
  WHERE
    id = v_id;
  DELETE FROM public.question_options
  WHERE question_id = v_id
    AND option_key NOT IN (
      SELECT
        o ->> 'key'
      FROM
        jsonb_array_elements(v_options) o);
  INSERT INTO public.question_options (question_id, option_key, content, is_correct, score, sort_order, response_group, response_group_order, image_url)
  SELECT
    v_id,
    o ->> 'key',
    o ->> 'content',
    (o ->> 'isCorrect')::boolean,
    nullif (o ->> 'score', '')::numeric,
    ord::integer,
    nullif (btrim(o ->> 'responseGroup'), ''),nullif(o->>'responseGroupOrder','')::integer,
    nullif (o ->> 'imageUrl', '')
  FROM
    jsonb_array_elements(v_options)
  WITH ORDINALITY AS opts (o, ord)
ON CONFLICT (question_id, option_key)
  DO UPDATE SET
    content = excluded.content,
    is_correct = excluded.is_correct,
    score = excluded.score,
    sort_order = excluded.sort_order,
    response_group = excluded.response_group,
    response_group_order = excluded.response_group_order,
    image_url = excluded.image_url;
  SELECT
    *
  INTO
    v_explanation
  FROM
    public.question_explanations
  WHERE
    question_id = v_id
  ORDER BY
    version DESC,
    created_at DESC
  LIMIT 1;
  IF found THEN
    UPDATE
      public.question_explanations
    SET
      content = coalesce(p_payload ->> 'explanation', ''),
      version = v_version,
      updated_at = clock_timestamp()
    WHERE
      id = v_explanation.id;
  ELSIF coalesce(p_payload ->> 'explanation', '')<>'' THEN
      INSERT INTO public.question_explanations (question_id, content, version)
        VALUES (v_id, p_payload ->> 'explanation', v_version);
  END IF;
  -- A subject move must not leave secondary mappings pointing into the old subject.
  -- The pre-edit snapshot retains all previous mappings for history.
  DELETE FROM public.question_knowledge_nodes qk USING public.knowledge_nodes k
WHERE qk.question_id = v_id
  AND qk.knowledge_node_id = k.id
  AND k.subject_id <> v_subject;
  DELETE FROM public.question_knowledge_nodes
  WHERE question_id = v_id
    AND relation_type = 'primary'
    AND knowledge_node_id IS DISTINCT FROM v_node;
  IF v_node IS NOT NULL THEN
    INSERT INTO public.question_knowledge_nodes (question_id, knowledge_node_id, relation_type)
      VALUES (v_id, v_node, 'primary')
    ON CONFLICT (question_id, knowledge_node_id)
      DO UPDATE SET
        relation_type = 'primary';
  END IF;
END IF;
INSERT INTO public.audit_logs (actor_user_id, action, entity_type, entity_id, old_data, new_data)
  VALUES (v_actor, CASE v_op
    WHEN 'publish' THEN
      'PUBLISH_QUESTION'
    WHEN 'archive' THEN
      'ARCHIVE_QUESTION'
    WHEN 'revise' THEN
      'REVISE_QUESTION'
    ELSE
      CASE WHEN v_q.id IS NULL THEN
        'CREATE_QUESTION'
      ELSE
        'UPDATE_QUESTION'
      END
    END, 'question', v_id, CASE WHEN v_q.id IS NULL THEN
      NULL
    ELSE
      jsonb_build_object('version', v_q.version, 'status', v_q.status)
    END, jsonb_build_object('reason', v_reason, 'label', (
        SELECT
          question_code
        FROM public.questions
        WHERE
          id = v_id), 'version', (
          SELECT
            version
          FROM public.questions
          WHERE
            id = v_id)));
  PERFORM
    set_config('app.workflow_action', coalesce(v_old_action, ''), TRUE);
  RETURN (
    SELECT
      jsonb_build_object('id', id, 'version', version, 'status', status, 'updated_at', updated_at)
    FROM
      public.questions
    WHERE
      id = v_id);
END
$$;
CREATE OR REPLACE FUNCTION public.get_question_bank_editor (p_program text, p_track text, p_id uuid DEFAULT NULL)
  RETURNS jsonb
  LANGUAGE sql
  SECURITY INVOKER
  SET search_path = ''
  AS $$
  SELECT
    app_private.question_bank_editor (p_program, p_track, p_id);
$$;
CREATE OR REPLACE FUNCTION public.mutate_question_bank (p_payload jsonb)
  RETURNS jsonb
  LANGUAGE sql
  SECURITY INVOKER
  SET search_path = ''
  AS $$
  SELECT
    app_private.mutate_question_bank (p_payload);
$$;
REVOKE ALL ON FUNCTION app_private.question_bank_editor (text, text, uuid), app_private.mutate_question_bank (jsonb), public.get_question_bank_editor (text, text, uuid), public.mutate_question_bank (jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION app_private.question_bank_editor (text, text, uuid), app_private.mutate_question_bank (jsonb), public.get_question_bank_editor (text, text, uuid), public.mutate_question_bank (jsonb) TO authenticated;
NOTIFY pgrst,
'reload schema';
COMMIT;
