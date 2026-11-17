-- Generated from canonical staging lpgrivowdcepcxradavu via pg_get_functiondef().
-- Runtime app_private functions S-Z. CPNS migration-only helpers are excluded.
-- DO NOT apply to production before explicit final GO.
CREATE OR REPLACE FUNCTION app_private.save_exam_answer_for_user (p_user_id uuid, p_attempt_question_id uuid, p_option_ids uuid[] DEFAULT NULL::uuid[], p_answer_value text DEFAULT NULL::text, p_time_spent_seconds integer DEFAULT 0, p_is_flagged boolean DEFAULT FALSE)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_attempt_id uuid;
  v_question_id uuid;
  v_section_id uuid;
  v_question_type text;
  v_snapshot jsonb;
  v_deadline timestamptz;
  v_answer_id uuid;
  v_selected uuid[] := coalesce(p_option_ids, ARRAY[]::uuid[]);
  v_selected_option uuid;
  v_position integer;
  v_valid_count integer;
  v_distinct_count integer;
  v_group_count integer;
BEGIN
  SELECT
    aq.attempt_id,
    aq.question_id,
    aq.section_id,
    aq.question_snapshot -> 'question' ->> 'question_type',
    aq.question_snapshot,
    aq.position,
    ass.deadline_at
  INTO
    v_attempt_id,
    v_question_id,
    v_section_id,
    v_question_type,
    v_snapshot,
    v_position,
    v_deadline
  FROM
    public.attempt_questions aq
    JOIN public.exam_attempts ea ON ea.id = aq.attempt_id
    JOIN public.attempt_section_states ass ON ass.attempt_id = aq.attempt_id
      AND ass.section_id = aq.section_id
  WHERE
    aq.id = p_attempt_question_id
    AND ea.user_id = p_user_id
    AND ea.status = 'in_progress'
    AND ass.status = 'active'
  FOR UPDATE
    OF ea,
    ass;

  IF v_attempt_id IS NULL THEN
    RAISE EXCEPTION 'Question is not in the active section of an in-progress attempt';
  END IF;
  IF v_deadline IS NOT NULL AND now() > v_deadline THEN
    RAISE EXCEPTION 'SECTION_TIME_EXPIRED';
  END IF;
  IF coalesce(p_time_spent_seconds, 0) < 0 THEN
    RAISE EXCEPTION 'Invalid time spent';
  END IF;

  IF cardinality(v_selected) = 0 AND nullif (btrim(coalesce(p_answer_value, '')),'') IS NULL THEN
    DELETE FROM public.attempt_answers
    WHERE attempt_question_id = p_attempt_question_id;
    UPDATE
      public.exam_attempts
    SET
      last_question_position = v_position,
      last_saved_at = now(),
      updated_at = now()
    WHERE
      id = v_attempt_id;
    INSERT INTO public.attempt_events (attempt_id, event_type, question_id, metadata)
      VALUES (v_attempt_id, 'answer_cleared', v_question_id, '{}'::jsonb);
    RETURN jsonb_build_object('attempt_question_id', p_attempt_question_id, 'cleared', TRUE);
  END IF;

  SELECT
    count(*),
    count(DISTINCT x)
  INTO
    v_valid_count,
    v_distinct_count
  FROM
    unnest(v_selected) x;
  IF v_valid_count <> v_distinct_count THEN
    RAISE EXCEPTION 'Duplicate option IDs are not allowed';
  END IF;

  SELECT
    count(*)
  INTO
    v_valid_count
  FROM
    jsonb_array_elements(v_snapshot -> 'options') o
WHERE (o ->> 'id')::uuid = ANY (v_selected);
  IF v_valid_count <> cardinality(v_selected) THEN
    RAISE EXCEPTION 'One or more options do not belong to the frozen question';
  END IF;

  IF v_question_type = 'single_choice' THEN
    IF cardinality(v_selected) <> 1 THEN
      RAISE EXCEPTION 'single_choice requires exactly one option';
    END IF;
    v_selected_option := v_selected[1];
  ELSIF v_question_type = 'multiple_choice' THEN
    IF cardinality(v_selected) < 1 THEN
      RAISE EXCEPTION 'multiple_choice requires at least one option';
    END IF;
    v_selected_option := NULL;
  ELSIF v_question_type = 'category' THEN
    SELECT
      count(*),
      count(DISTINCT o ->> 'response_group')
    INTO
      v_valid_count,
      v_group_count
    FROM
      jsonb_array_elements(v_snapshot -> 'options') o
WHERE (o ->> 'id')::uuid = ANY (v_selected);
    IF v_valid_count <> v_group_count THEN
      RAISE EXCEPTION 'category allows at most one selected option per response group';
    END IF;
    v_selected_option := NULL;
  ELSE
    RAISE EXCEPTION 'Unsupported question type %', v_question_type;
  END IF;

  INSERT INTO public.attempt_answers (attempt_question_id, selected_option_id, answer_value, is_correct, score_awarded, answered_at, time_spent_seconds, is_flagged, created_at, updated_at)
    VALUES (p_attempt_question_id, v_selected_option, p_answer_value, NULL, 0, now(), coalesce(p_time_spent_seconds, 0), coalesce(p_is_flagged, FALSE), now(), now())
  ON CONFLICT (attempt_question_id)
    DO UPDATE SET
      selected_option_id = excluded.selected_option_id,
      answer_value = excluded.answer_value,
      is_correct = NULL,
      score_awarded = 0,
      answered_at = now(),
      time_spent_seconds = excluded.time_spent_seconds,
      is_flagged = excluded.is_flagged,
      updated_at = now()
    RETURNING
      id
    INTO
      v_answer_id;

  DELETE FROM public.attempt_answer_options
  WHERE attempt_answer_id = v_answer_id;
  IF v_question_type IN ('multiple_choice', 'category') THEN
    INSERT INTO public.attempt_answer_options (attempt_answer_id, option_id)
    SELECT
      v_answer_id,
      x
    FROM
      unnest(v_selected) x;
  END IF;

  UPDATE
    public.exam_attempts
  SET
    last_question_position = v_position,
    last_saved_at = now(),
    updated_at = now()
  WHERE
    id = v_attempt_id;

  INSERT INTO public.attempt_events (attempt_id, event_type, question_id, metadata)
    VALUES (v_attempt_id, 'answer_saved', v_question_id, jsonb_build_object('questionType', v_question_type, 'selectedCount', cardinality(v_selected)));

  RETURN jsonb_build_object('attempt_question_id', p_attempt_question_id, 'saved', TRUE, 'selected_count', cardinality(v_selected));
END;
$function$ CREATE OR REPLACE FUNCTION app_private.save_question_draft (p_question_id uuid, p_program_code text, p_track_code text, p_subject_code text, p_question_type text, p_stem text, p_difficulty text, p_cognitive_level text, p_estimated_seconds integer, p_source_reference text, p_stimulus_id uuid, p_explanation text, p_knowledge_node_id uuid, p_options jsonb, p_change_reason text)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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

  IF lower(trim(p_question_type)) = 'multiple_choice' THEN
    IF v_option_count < 3 OR v_correct_count < 2 OR v_correct_count >= v_option_count THEN
      RAISE EXCEPTION 'Multiple choice requires at least three options and at least two, but not all, correct options';
    END IF;
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
$function$ CREATE OR REPLACE FUNCTION app_private.score_exam_attempt (p_attempt_id uuid)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  r record;
  v_selected uuid[];
  v_total_correct integer;
  v_selected_correct integer;
  v_total_groups integer;
  v_correct_groups integer;
  v_score numeric;
  v_correct boolean;
  v_total numeric;
  v_percentage numeric;
BEGIN
  FOR r IN
  SELECT
    aq.id,
    aq.question_snapshot,
    aq.question_snapshot -> 'question' ->> 'question_type' question_type,
    aa.id answer_id,
    aa.selected_option_id
  FROM
    public.attempt_questions aq
    LEFT JOIN public.attempt_answers aa ON aa.attempt_question_id = aq.id
  WHERE
    aq.attempt_id = p_attempt_id LOOP
      IF r.answer_id IS NULL THEN
        CONTINUE;
      END IF;

      IF r.question_type = 'single_choice' THEN
        v_selected := ARRAY[r.selected_option_id];
      ELSE
        SELECT
          coalesce(array_agg(aao.option_id), ARRAY[]::uuid[])
        INTO
          v_selected
        FROM
          public.attempt_answer_options aao
        WHERE
          aao.attempt_answer_id = r.answer_id;
      END IF;

      IF r.question_type = 'single_choice' THEN
        SELECT
          coalesce(bool_or((o ->> 'is_correct')::boolean) FILTER (WHERE (o ->> 'id')::uuid = ANY (v_selected)), FALSE)
        INTO
          v_correct
        FROM
          jsonb_array_elements(r.question_snapshot -> 'options') o;
        v_score := CASE WHEN v_correct THEN
          1
        ELSE
          0
        END;
      ELSIF r.question_type = 'multiple_choice' THEN
        SELECT
          count(*) FILTER (WHERE (o ->> 'is_correct')::boolean),
        count(*) FILTER (WHERE (o ->> 'is_correct')::boolean
          AND (o ->> 'id')::uuid = ANY (v_selected))
  INTO
    v_total_correct,
    v_selected_correct
  FROM
    jsonb_array_elements(r.question_snapshot -> 'options') o;
        v_correct := cardinality(v_selected) = v_total_correct
          AND v_selected_correct = v_total_correct;
        v_score := CASE WHEN v_correct THEN
          1
        ELSE
          0
        END;
      ELSIF r.question_type = 'category' THEN
        SELECT
          count(DISTINCT o ->> 'response_group'),
          count(DISTINCT o ->> 'response_group') FILTER (WHERE (o ->> 'is_correct')::boolean
          AND (o ->> 'id')::uuid = ANY (v_selected))
  INTO
    v_total_groups,
    v_correct_groups
  FROM
    jsonb_array_elements(r.question_snapshot -> 'options') o;
        v_score := CASE WHEN v_total_groups > 0 THEN
          v_correct_groups::numeric / v_total_groups::numeric
        ELSE
          0
        END;
        v_correct := v_total_groups > 0
          AND v_correct_groups = v_total_groups
          AND cardinality(v_selected) = v_total_groups;
      ELSE
        v_score := 0;
        v_correct := FALSE;
      END IF;

      UPDATE
        public.attempt_answers
      SET
        is_correct = v_correct,
        score_awarded = round(v_score, 6),
        updated_at = now()
      WHERE
        id = r.answer_id;
    END LOOP;

  DELETE FROM public.attempt_scores
  WHERE attempt_id = p_attempt_id;

  INSERT INTO public.attempt_scores (attempt_id, subject_id, raw_score, normalized_score, percentage, passing_score, passed, correct_count, wrong_count, unanswered_count, created_at)
  SELECT
    aq.attempt_id,
    q.subject_id,
    coalesce(sum(aa.score_awarded), 0),
    round(coalesce(sum(aa.score_awarded), 0) / nullif (count(*), 0) * 100, 4),
    round(coalesce(sum(aa.score_awarded), 0) / nullif (count(*), 0) * 100, 4),
    NULL,
    NULL,
    count(*) FILTER (WHERE aa.is_correct IS TRUE),
    count(*) FILTER (WHERE aa.id IS NOT NULL
      AND coalesce(aa.is_correct, FALSE) = FALSE),
    count(*) FILTER (WHERE aa.id IS NULL),
    now()
  FROM
    public.attempt_questions aq
    JOIN public.questions q ON q.id = aq.question_id
    LEFT JOIN public.attempt_answers aa ON aa.attempt_question_id = aq.id
  WHERE
    aq.attempt_id = p_attempt_id
  GROUP BY
    aq.attempt_id,
    q.subject_id;

  SELECT
    coalesce(sum(aa.score_awarded), 0),
    round(coalesce(sum(aa.score_awarded), 0) / nullif (count(aq.id), 0) * 100, 4)
  INTO
    v_total,
    v_percentage
  FROM
    public.attempt_questions aq
    LEFT JOIN public.attempt_answers aa ON aa.attempt_question_id = aq.id
  WHERE
    aq.attempt_id = p_attempt_id;

  RETURN jsonb_build_object('raw_score', v_total, 'percentage', v_percentage);
END;
$function$ CREATE OR REPLACE FUNCTION app_private.start_exam_attempt_for_user (p_exam_id uuid, p_user_id uuid)
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
      AND status = 'active') THEN
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
    pr.code,
    tr.code
  INTO
    v_exam_status,
    v_attempt_limit,
    v_track_id,
    v_access_type,
    v_required_feature_id,
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
  IF v_exam_status <> 'active' THEN
    RAISE EXCEPTION 'Exam is not active';
  END IF;

  IF NOT EXISTS (
    SELECT
      1
    FROM
      public.user_tracks
    WHERE
      user_id = p_user_id
      AND track_id = v_track_id
      AND status = 'active') THEN
  RAISE EXCEPTION 'Active user track required';
END IF;

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
    AND ea.status = 'in_progress'
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
      AND ass.status = 'active'
    ORDER BY
      es.sort_order
    LIMIT 1;

    RETURN jsonb_build_object('attempt_id', v_existing_attempt_id, 'attempt_number', v_existing_attempt_number, 'status', 'in_progress', 'active_section_id', v_first_section, 'resumed', TRUE);
  END IF;

  IF v_program_code = 'TKA' AND v_track_code = 'SMP' THEN
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
  VALUES (v_attempt_id, p_exam_id, p_user_id, v_attempt_number, 'in_progress', now(), jsonb_build_object('orderSeed', v_seed, 'engineVersion', 'tka-section-rpc-v2', 'questionCount', v_expected_count, 'monetizationEnforced', v_monetization_enforced, 'entitlementBypass', v_bypass_attempt_limit), now(), now());

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
    AND ass.status = 'active'
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
  VALUES (v_attempt_id, 'attempt_started', jsonb_build_object('attemptNumber', v_attempt_number, 'activeSectionId', v_first_section, 'questionCount', v_expected_count, 'monetizationEnforced', v_monetization_enforced, 'entitlementBypass', v_bypass_attempt_limit));

  RETURN jsonb_build_object('attempt_id', v_attempt_id, 'attempt_number', v_attempt_number, 'status', 'in_progress', 'active_section_id', v_first_section, 'resumed', FALSE);
END;
$function$ CREATE OR REPLACE FUNCTION app_private.submit_exam_attempt_for_user (p_user_id uuid, p_attempt_id uuid)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_started timestamptz;
  v_score jsonb;
  v_duration integer;
  v_projection jsonb;
  v_wrong_state jsonb;
  v_remedial jsonb;
BEGIN
  SELECT
    started_at
  INTO
    v_started
  FROM
    public.exam_attempts
  WHERE
    id = p_attempt_id
    AND user_id = p_user_id
    AND status = 'in_progress'
  FOR UPDATE;

  IF v_started IS NULL THEN
    RAISE EXCEPTION 'In-progress attempt not found';
  END IF;

  IF EXISTS (
    SELECT
      1
    FROM
      public.attempt_section_states
    WHERE
      attempt_id = p_attempt_id
      AND status <> 'completed') THEN
  RAISE EXCEPTION 'ALL_SECTIONS_MUST_BE_COMPLETED';
END IF;

  v_score := app_private.score_exam_attempt (p_attempt_id);

  SELECT
    coalesce(sum(duration_used_seconds), 0)
  INTO
    v_duration
  FROM
    public.attempt_section_states
  WHERE
    attempt_id = p_attempt_id
    AND status = 'completed';

  UPDATE
    public.exam_attempts
  SET
    status = 'completed',
    submitted_at = now(),
    duration_used_seconds = v_duration,
    total_score = (v_score ->> 'raw_score')::numeric,
    percentage = (v_score ->> 'percentage')::numeric,
    passed = NULL,
    last_saved_at = now(),
    updated_at = now()
  WHERE
    id = p_attempt_id;

INSERT INTO public.attempt_events (attempt_id, event_type, metadata)
  VALUES (p_attempt_id, 'attempt_submitted', v_score);

  v_projection := app_private.refresh_tka_smp_learning_projection_for_user (p_user_id, p_attempt_id);
INSERT INTO public.attempt_events (attempt_id, event_type, metadata)
  VALUES (p_attempt_id, 'learning_projection_refreshed', v_projection);

  v_wrong_state := app_private.refresh_tka_smp_wrong_question_state_for_user (p_user_id, p_attempt_id);
INSERT INTO public.attempt_events (attempt_id, event_type, metadata)
  VALUES (p_attempt_id, 'wrong_question_state_refreshed', v_wrong_state);

  v_remedial := app_private.refresh_tka_smp_remedial_session_for_attempt (p_user_id, p_attempt_id, 10);
INSERT INTO public.attempt_events (attempt_id, event_type, metadata)
  VALUES (p_attempt_id, 'automatic_remedial_refreshed', v_remedial);

  RETURN jsonb_build_object('attempt_id', p_attempt_id, 'status', 'completed', 'raw_score', (v_score ->> 'raw_score')::numeric, 'percentage', (v_score ->> 'percentage')::numeric, 'duration_used_seconds', v_duration, 'learning_projection', v_projection, 'wrong_question_state', v_wrong_state, 'automatic_remedial', v_remedial);
END;
$function$ CREATE OR REPLACE FUNCTION app_private.submit_question_for_review (p_question_id uuid)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_actor uuid := auth.uid ();
  v_q public.questions%rowtype;
  v_version integer;
  v_round integer;
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
    id = p_question_id
  FOR UPDATE;
  IF NOT found THEN
    RAISE EXCEPTION 'Question not found';
  END IF;

  IF v_q.status NOT IN ('draft', 'revision_required') THEN
    RAISE EXCEPTION 'Question % cannot be submitted from status %', v_q.question_code, v_q.status;
  END IF;

  IF v_actor <> v_q.author_id AND NOT app_private.current_user_has_permission ('question.manage') AND NOT app_private.current_user_has_permission ('content.update') THEN
    RAISE EXCEPTION 'Not allowed to submit this question';
  END IF;

  v_version := app_private.ensure_question_snapshot (p_question_id, v_actor, 'submitted_for_review');

  SELECT
    coalesce(max(review_round), 0) + 1
  INTO
    v_round
  FROM
    public.content_reviews
  WHERE
    entity_type = 'question'
    AND entity_id = p_question_id;

  UPDATE
    public.content_reviews
  SET
    status = 'cancelled',
    completed_at = now(),
    updated_at = now()
  WHERE
    entity_type = 'question'
    AND entity_id = p_question_id
    AND status = 'pending';

  PERFORM
    set_config('app.workflow_action', 'submit', TRUE);
  UPDATE
    public.questions
  SET
    status = 'submitted',
    reviewer_id = NULL,
    updated_at = now()
  WHERE
    id = p_question_id;

  INSERT INTO public.content_reviews (entity_type, entity_id, reviewer_id, status, notes, review_stage, question_version, review_round, created_at, updated_at)
    VALUES ('question', p_question_id, NULL, 'pending', NULL, 'editorial', v_version, v_round, now(), now());

  RETURN jsonb_build_object('question_id', p_question_id, 'status', 'submitted', 'question_version', v_version, 'review_stage', 'editorial', 'review_round', v_round);
END;
$function$ CREATE OR REPLACE FUNCTION app_private.sync_tka_smp_remedial_sessions_for_user (p_user_id uuid)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_items_synced integer := 0;
  v_sessions_completed integer := 0;
BEGIN
  UPDATE
    public.remedial_session_items rsi
  SET
    status = 'completed',
    best_score = greatest (rsi.best_score, 1),
    completed_at = coalesce(rsi.completed_at, uwq.resolved_at, now()),
    updated_at = now()
  FROM
    public.remedial_sessions rs,
    public.user_wrong_questions uwq
  WHERE
    rsi.session_id = rs.id
    AND rsi.user_wrong_question_id = uwq.id
    AND rs.user_id = p_user_id
    AND rsi.status = 'pending'
    AND uwq.status = 'resolved';

  get diagnostics v_items_synced = row_count;

  UPDATE
    public.remedial_sessions rs
  SET
    status = 'completed',
    completed_at = coalesce(rs.completed_at, now()),
    updated_at = now()
  WHERE
    rs.user_id = p_user_id
    AND rs.status = 'active'
    AND EXISTS (
      SELECT
        1
      FROM
        public.remedial_session_items rsi
      WHERE
        rsi.session_id = rs.id)
    AND NOT EXISTS (
      SELECT
        1
      FROM
        public.remedial_session_items rsi
      WHERE
        rsi.session_id = rs.id
        AND rsi.status = 'pending');

  get diagnostics v_sessions_completed = row_count;

  RETURN jsonb_build_object('items_synced', v_items_synced, 'sessions_completed', v_sessions_completed);
END;
$function$
