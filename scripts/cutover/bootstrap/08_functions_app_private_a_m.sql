-- Generated from canonical staging lpgrivowdcepcxradavu via pg_get_functiondef().
-- Runtime app_private functions A-M. CPNS migration-only helpers are excluded.
-- DO NOT apply to production before explicit final GO.
CREATE OR REPLACE FUNCTION app_private.activate_user_track_for_user (p_user_id uuid, p_program_code text, p_track_code text, p_target_year integer DEFAULT NULL::integer, p_school_name text DEFAULT NULL::text, p_school_grade text DEFAULT NULL::text)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_program_id uuid;
  v_program_code text;
  v_track_id uuid;
  v_track_code text;
  v_user_track_id uuid;
  v_school_name text := nullif (btrim(coalesce(p_school_name, '')),'');
  v_school_grade text := nullif (btrim(coalesce(p_school_grade, '')),'');
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
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

  v_program_code := upper(btrim(coalesce(p_program_code, '')));
  v_track_code := upper(btrim(coalesce(p_track_code, '')));
  IF v_program_code = '' OR length(v_program_code) > 32 THEN
    RAISE EXCEPTION 'Invalid program code';
  END IF;
  IF v_track_code = '' OR length(v_track_code) > 32 THEN
    RAISE EXCEPTION 'Invalid track code';
  END IF;
  IF p_target_year IS NOT NULL AND (p_target_year < 2025 OR p_target_year > 2100) THEN
    RAISE EXCEPTION 'Invalid target year';
  END IF;
  IF v_school_name IS NOT NULL AND length(v_school_name) > 160 THEN
    RAISE EXCEPTION 'School name too long';
  END IF;
  IF v_school_grade IS NOT NULL AND length(v_school_grade) > 32 THEN
    RAISE EXCEPTION 'School grade too long';
  END IF;

  SELECT
    p.id,
    p.code
  INTO
    v_program_id,
    v_program_code
  FROM
    public.programs p
  WHERE
    upper(p.code) = v_program_code
    AND lower(p.status) = 'active'
  LIMIT 1;
  IF v_program_id IS NULL THEN
    RAISE EXCEPTION 'Active program not found';
  END IF;

  SELECT
    t.id,
    t.code
  INTO
    v_track_id,
    v_track_code
  FROM
    public.tracks t
  WHERE
    t.program_id = v_program_id
    AND upper(t.code) = v_track_code
    AND lower(t.status) = 'active'
  LIMIT 1;
  IF v_track_id IS NULL THEN
    RAISE EXCEPTION 'Active track not found';
  END IF;

  PERFORM
    pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || v_track_id::text, 0));

INSERT INTO public.user_tracks (user_id, track_id, status, target_year, started_at, completed_at, created_at, updated_at)
  VALUES (p_user_id, v_track_id, 'active', p_target_year, now(), NULL, now(), now())
ON CONFLICT (user_id, track_id)
  DO UPDATE SET
    status = 'active',
    target_year = excluded.target_year,
    completed_at = NULL,
    updated_at = now()
  RETURNING
    id
  INTO
    v_user_track_id;

  IF v_school_name IS NOT NULL OR v_school_grade IS NOT NULL THEN
    INSERT INTO public.user_track_preferences (user_track_id, school_name, school_grade, preferences, created_at, updated_at)
      VALUES (v_user_track_id, v_school_name, v_school_grade, jsonb_build_object('source', 'tka_entry'), now(), now())
    ON CONFLICT (user_track_id)
      DO UPDATE SET
        school_name = excluded.school_name,
        school_grade = excluded.school_grade,
        preferences = coalesce(public.user_track_preferences.preferences, '{}'::jsonb) || jsonb_build_object('source', 'tka_entry'),
        updated_at = now();
  END IF;

  RETURN jsonb_build_object('userTrackId', v_user_track_id, 'programCode', v_program_code, 'trackCode', v_track_code, 'status', 'active', 'targetYear', p_target_year);
END;
$function$ CREATE OR REPLACE FUNCTION app_private.assign_question_reviewer (p_question_id uuid, p_reviewer_id uuid)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_actor uuid := auth.uid ();
  v_q public.questions%rowtype;
  v_stage text;
  v_review_id uuid;
  v_round integer;
  v_reviewer_ok boolean;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF NOT app_private.current_user_has_permission ('content.review') AND NOT app_private.current_user_has_permission ('question.manage') THEN
    RAISE EXCEPTION 'Reviewer assignment permission required';
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

  IF p_reviewer_id = v_q.author_id THEN
    RAISE EXCEPTION 'Author cannot review their own question';
  END IF;

  SELECT
    EXISTS (
      SELECT
        1
      FROM
        public.profiles pr
      WHERE
        pr.id = p_reviewer_id
        AND pr.status = 'active')
    AND EXISTS (
      SELECT
        1
      FROM
        public.user_roles ur
        JOIN public.role_permissions rp ON rp.role_id = ur.role_id
        JOIN public.permissions pe ON pe.id = rp.permission_id
      WHERE
        ur.user_id = p_reviewer_id
        AND pe.code = 'content.review')
  INTO
    v_reviewer_ok;

  IF NOT v_reviewer_ok THEN
    RAISE EXCEPTION 'Target user is not an active content reviewer';
  END IF;

  v_stage := CASE v_q.status
  WHEN 'submitted' THEN
    'editorial'
  WHEN 'editorial_review' THEN
    'editorial'
  WHEN 'academic_review' THEN
    'academic'
  WHEN 'technical_qa' THEN
    'technical_qa'
  ELSE
    NULL
  END;

  IF v_stage IS NULL THEN
    RAISE EXCEPTION 'Question cannot receive reviewer in status %', v_q.status;
  END IF;

  SELECT
    id,
    review_round
  INTO
    v_review_id,
    v_round
  FROM
    public.content_reviews
  WHERE
    entity_type = 'question'
    AND entity_id = p_question_id
    AND review_stage = v_stage
    AND status = 'pending'
  ORDER BY
    review_round DESC,
    created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_review_id IS NULL THEN
    RAISE EXCEPTION 'No pending % review found', v_stage;
  END IF;

  UPDATE
    public.content_reviews
  SET
    reviewer_id = p_reviewer_id,
    assigned_at = now(),
    updated_at = now()
  WHERE
    id = v_review_id;

  PERFORM
    set_config('app.workflow_action', 'assign_reviewer', TRUE);
  UPDATE
    public.questions
  SET
    reviewer_id = p_reviewer_id,
    status = CASE WHEN status = 'submitted' THEN
      'editorial_review'
    ELSE
      status
    END,
    updated_at = now()
  WHERE
    id = p_question_id;

  RETURN jsonb_build_object('question_id', p_question_id, 'review_stage', v_stage, 'review_round', v_round, 'reviewer_id', p_reviewer_id);
END;
$function$ CREATE OR REPLACE FUNCTION app_private.audit_content_review_change ()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_action text;
  v_entity_id uuid;
BEGIN
  v_entity_id := coalesce(NEW.entity_id, OLD.entity_id);

  IF tg_op = 'INSERT' THEN
    v_action := 'content.review.created';
  ELSIF OLD.reviewer_id IS DISTINCT FROM NEW.reviewer_id
      AND NEW.reviewer_id IS NOT NULL THEN
      v_action := 'content.review.assigned';
  ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
    v_action := 'content.review.' || lower(NEW.status);
  ELSE
    RETURN new;
  END IF;

  INSERT INTO public.audit_logs (actor_user_id, action, entity_type, entity_id, old_data, new_data)
    VALUES (auth.uid (), v_action, 'question', v_entity_id, CASE WHEN tg_op = 'INSERT' THEN
        NULL
      ELSE
        jsonb_build_object('review_id', OLD.id, 'review_stage', OLD.review_stage, 'review_round', OLD.review_round, 'reviewer_id', OLD.reviewer_id, 'status', OLD.status, 'notes', OLD.notes, 'question_version', OLD.question_version)
      END, jsonb_build_object('review_id', NEW.id, 'review_stage', NEW.review_stage, 'review_round', NEW.review_round, 'reviewer_id', NEW.reviewer_id, 'status', NEW.status, 'notes', NEW.notes, 'question_version', NEW.question_version));

  RETURN new;
END;
$function$ CREATE OR REPLACE FUNCTION app_private.audit_question_workflow_change ()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_action text;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    v_action := 'question.workflow.' || lower(NEW.status);
  ELSIF OLD.reviewer_id IS DISTINCT FROM NEW.reviewer_id THEN
    v_action := 'question.workflow.reviewer_changed';
  ELSE
    RETURN new;
  END IF;

  INSERT INTO public.audit_logs (actor_user_id, action, entity_type, entity_id, old_data, new_data)
    VALUES (auth.uid (), v_action, 'question', NEW.id, jsonb_build_object('status', OLD.status, 'reviewer_id', OLD.reviewer_id, 'version', OLD.version, 'published_at', OLD.published_at), jsonb_build_object('status', NEW.status, 'reviewer_id', NEW.reviewer_id, 'version', NEW.version, 'published_at', NEW.published_at));

  RETURN new;
END;
$function$ CREATE OR REPLACE FUNCTION app_private.bulk_review_pilot_stage (p_batch text, p_decision text, p_notes text DEFAULT NULL::text)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_actor uuid := auth.uid ();
  v_count integer := 0;
  v_q record;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_decision NOT IN ('approve', 'revision_required', 'reject') THEN
    RAISE EXCEPTION 'Invalid review decision';
  END IF;

  IF NOT app_private.current_user_has_permission ('content.review') THEN
    RAISE EXCEPTION 'Content review permission required';
  END IF;

  FOR v_q IN
  SELECT
    q.id
  FROM
    public.questions q
  WHERE
    q.response_config ->> 'pilotBatch' = p_batch
    AND q.reviewer_id = v_actor
    AND q.status IN ('editorial_review', 'academic_review', 'technical_qa')
  ORDER BY
    q.question_code LOOP
      PERFORM
        app_private.review_question_stage (v_q.id, p_decision, p_notes);
      v_count := v_count + 1;
    END LOOP;

  RETURN jsonb_build_object('pilot_batch', p_batch, 'reviewer_id', v_actor, 'decision', p_decision, 'reviewed_questions', v_count);
END;
$function$ CREATE OR REPLACE FUNCTION app_private.claim_pilot_review_stage (p_batch text)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_actor uuid := auth.uid ();
  v_count integer := 0;
  v_q record;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT app_private.current_user_has_permission ('content.review') THEN
    RAISE EXCEPTION 'Content review permission required';
  END IF;

  FOR v_q IN
  SELECT
    q.id
  FROM
    public.questions q
  WHERE
    q.response_config ->> 'pilotBatch' = p_batch
    AND q.status IN ('submitted', 'editorial_review', 'academic_review', 'technical_qa')
    AND q.author_id <> v_actor
    AND EXISTS (
      SELECT
        1
      FROM
        public.content_reviews cr
      WHERE
        cr.entity_type = 'question'
        AND cr.entity_id = q.id
        AND cr.status = 'pending'
        AND cr.reviewer_id IS NULL)
  ORDER BY
    q.question_code LOOP
      PERFORM
        app_private.assign_question_reviewer (v_q.id, v_actor);
      v_count := v_count + 1;
    END LOOP;

  RETURN jsonb_build_object('pilot_batch', p_batch, 'reviewer_id', v_actor, 'claimed_questions', v_count);
END;
$function$ CREATE OR REPLACE FUNCTION app_private.complete_exam_section_for_user (p_user_id uuid, p_attempt_id uuid)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_state_id uuid;
  v_section_id uuid;
  v_started timestamptz;
  v_duration integer;
  v_sort integer;
  v_next_id uuid;
  v_next_duration integer;
  v_used integer;
BEGIN
  IF NOT EXISTS (
    SELECT
      1
    FROM
      public.exam_attempts
    WHERE
      id = p_attempt_id
      AND user_id = p_user_id
      AND status = 'in_progress') THEN
  RAISE EXCEPTION 'In-progress attempt not found';
END IF;

  SELECT
    ass.id,
    ass.section_id,
    ass.started_at,
    es.duration_seconds,
    es.sort_order
  INTO
    v_state_id,
    v_section_id,
    v_started,
    v_duration,
    v_sort
  FROM
    public.attempt_section_states ass
    JOIN public.exam_sections es ON es.id = ass.section_id
  WHERE
    ass.attempt_id = p_attempt_id
    AND ass.status = 'active'
  ORDER BY
    es.sort_order
  LIMIT 1
  FOR UPDATE
    OF ass;

  IF v_state_id IS NULL THEN
    RETURN jsonb_build_object('attempt_id', p_attempt_id, 'ready_to_submit', TRUE, 'active_section_id', NULL);
  END IF;

  v_used := least (coalesce(v_duration, 2147483647), greatest (0, floor(extract(epoch FROM (now() - v_started)))::integer));
  UPDATE
    public.attempt_section_states
  SET
    status = 'completed',
    completed_at = now(),
    duration_used_seconds = v_used,
    updated_at = now()
  WHERE
    id = v_state_id;

  SELECT
    es.id,
    es.duration_seconds
  INTO
    v_next_id,
    v_next_duration
  FROM
    public.exam_sections es
    JOIN public.attempt_section_states ass ON ass.section_id = es.id
      AND ass.attempt_id = p_attempt_id
  WHERE
    es.exam_id = (
      SELECT
        exam_id
      FROM
        public.exam_attempts
      WHERE
        id = p_attempt_id)
    AND es.sort_order > v_sort
    AND ass.status = 'locked'
  ORDER BY
    es.sort_order
  LIMIT 1;

  IF v_next_id IS NOT NULL THEN
    UPDATE
      public.attempt_section_states
    SET
      status = 'active',
      started_at = now(),
      deadline_at = now() + make_interval(secs => coalesce(v_next_duration, 0)),
      updated_at = now()
    WHERE
      attempt_id = p_attempt_id
      AND section_id = v_next_id;
  END IF;

INSERT INTO public.attempt_events (attempt_id, event_type, metadata)
  VALUES (p_attempt_id, 'section_completed', jsonb_build_object('sectionId', v_section_id, 'durationUsedSeconds', v_used, 'nextSectionId', v_next_id));

  RETURN jsonb_build_object('attempt_id', p_attempt_id, 'completed_section_id', v_section_id, 'active_section_id', v_next_id, 'ready_to_submit', v_next_id IS NULL);
END;
$function$ CREATE OR REPLACE FUNCTION app_private.current_user_has_permission (p_permission text)
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_user uuid := auth.uid ();
BEGIN
  IF v_user IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT
      1
    FROM
      public.user_roles ur
      JOIN public.role_permissions rp ON rp.role_id = ur.role_id
      JOIN public.permissions p ON p.id = rp.permission_id
    WHERE
      ur.user_id = v_user
      AND p.code = p_permission);
END;
$function$ CREATE OR REPLACE FUNCTION app_private.enforce_question_workflow_guard ()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
DECLARE
  v_action text := current_setting('app.workflow_action', TRUE);
BEGIN
  IF (NEW.status IS DISTINCT FROM OLD.status OR NEW.reviewer_id IS DISTINCT FROM OLD.reviewer_id OR NEW.published_at IS DISTINCT FROM OLD.published_at) AND coalesce(v_action, '') = '' THEN
    RAISE EXCEPTION 'Workflow fields must be changed through review workflow functions';
  END IF;

  IF OLD.status NOT IN ('draft', 'revision_required') AND coalesce(v_action, '') = '' AND (NEW.question_type IS DISTINCT FROM OLD.question_type OR NEW.stem IS DISTINCT FROM OLD.stem OR NEW.difficulty IS DISTINCT FROM OLD.difficulty OR NEW.cognitive_level IS DISTINCT FROM OLD.cognitive_level OR NEW.source_type IS DISTINCT FROM OLD.source_type OR NEW.source_reference IS DISTINCT FROM OLD.source_reference OR NEW.estimated_seconds IS DISTINCT FROM OLD.estimated_seconds OR NEW.stimulus_id IS DISTINCT FROM OLD.stimulus_id OR NEW.stimulus_order IS DISTINCT FROM OLD.stimulus_order OR NEW.response_config IS DISTINCT FROM OLD.response_config) THEN
    RAISE EXCEPTION 'Question content is locked while status is %', OLD.status;
  END IF;

  RETURN new;
END;
$function$ CREATE OR REPLACE FUNCTION app_private.ensure_question_snapshot (p_question_id uuid, p_actor uuid, p_reason text)
  RETURNS integer
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_auth uuid := auth.uid ();
  v_snapshot jsonb;
  v_latest_snapshot jsonb;
  v_latest_version integer;
  v_current_version integer;
  v_target_version integer;
BEGIN
  IF v_auth IS NULL OR v_auth <> p_actor THEN
    RAISE EXCEPTION 'Authenticated actor is required for question snapshot';
  END IF;

  SELECT
    version
  INTO
    v_current_version
  FROM
    public.questions
  WHERE
    id = p_question_id
  FOR UPDATE;

  IF v_current_version IS NULL THEN
    RAISE EXCEPTION 'Question % not found', p_question_id;
  END IF;

  v_snapshot := app_private.question_snapshot_json (p_question_id);

  SELECT
    qv.version,
    qv.snapshot
  INTO
    v_latest_version,
    v_latest_snapshot
  FROM
    public.question_versions qv
  WHERE
    qv.question_id = p_question_id
  ORDER BY
    qv.version DESC
  LIMIT 1;

  IF v_latest_version IS NULL THEN
    v_target_version := greatest (v_current_version, 1);
    INSERT INTO public.question_versions (question_id, version, snapshot, changed_by, change_reason)
      VALUES (p_question_id, v_target_version, v_snapshot, p_actor, p_reason);
  ELSIF v_latest_snapshot IS DISTINCT FROM v_snapshot THEN
    v_target_version := v_latest_version + 1;
    PERFORM
      set_config('app.workflow_action', 'snapshot_version', TRUE);
    UPDATE
      public.questions
    SET
      version = v_target_version,
      updated_at = now()
    WHERE
      id = p_question_id;
    INSERT INTO public.question_versions (question_id, version, snapshot, changed_by, change_reason)
      VALUES (p_question_id, v_target_version, v_snapshot, p_actor, p_reason);
  ELSE
    v_target_version := v_latest_version;
  END IF;

  RETURN v_target_version;
END;
$function$ CREATE OR REPLACE FUNCTION app_private.evaluate_wrong_question_selection (p_snapshot jsonb, p_option_ids uuid[])
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_type text;
  v_selected uuid[] := coalesce(p_option_ids, ARRAY[]::uuid[]);
  v_total_correct integer := 0;
  v_selected_correct integer := 0;
  v_total_groups integer := 0;
  v_correct_groups integer := 0;
  v_correct boolean := FALSE;
  v_score numeric := 0;
BEGIN
  IF p_snapshot IS NULL THEN
    RAISE EXCEPTION 'WRONG_QUESTION_SNAPSHOT_NOT_FOUND';
  END IF;

  v_type := coalesce(p_snapshot -> 'question' ->> 'question_type', 'single_choice');

  IF cardinality(v_selected) = 0 THEN
    RAISE EXCEPTION 'ANSWER_REQUIRED';
  END IF;

  IF EXISTS (
    SELECT
      1
    FROM
      unnest(v_selected) selected_id
    WHERE
      NOT EXISTS (
        SELECT
          1
        FROM
          jsonb_array_elements(coalesce(p_snapshot -> 'options', '[]'::jsonb)) option_row
        WHERE (option_row ->> 'id')::uuid = selected_id)) THEN
  RAISE EXCEPTION 'INVALID_OPTION_SELECTION';
END IF;

  IF v_type = 'single_choice' THEN
    IF cardinality(v_selected) <> 1 THEN
      RAISE EXCEPTION 'SINGLE_CHOICE_REQUIRES_ONE_OPTION';
    END IF;

    SELECT
      coalesce(bool_or((o ->> 'is_correct')::boolean) FILTER (WHERE (o ->> 'id')::uuid = ANY (v_selected)), FALSE)
    INTO
      v_correct
    FROM
      jsonb_array_elements(coalesce(p_snapshot -> 'options', '[]'::jsonb)) o;
    v_score := CASE WHEN v_correct THEN
      1
    ELSE
      0
    END;

  ELSIF v_type = 'multiple_choice' THEN
    SELECT
      count(*) FILTER (WHERE (o ->> 'is_correct')::boolean),
    count(*) FILTER (WHERE (o ->> 'is_correct')::boolean
      AND (o ->> 'id')::uuid = ANY (v_selected))
INTO
  v_total_correct,
  v_selected_correct
FROM
  jsonb_array_elements(coalesce(p_snapshot -> 'options', '[]'::jsonb)) o;

    v_correct := cardinality(v_selected) = v_total_correct
      AND v_selected_correct = v_total_correct;
    v_score := CASE WHEN v_correct THEN
      1
    ELSE
      0
    END;

  ELSIF v_type = 'category' THEN
    SELECT
      count(DISTINCT o ->> 'response_group'),
      count(DISTINCT o ->> 'response_group') FILTER (WHERE (o ->> 'is_correct')::boolean
      AND (o ->> 'id')::uuid = ANY (v_selected))
INTO
  v_total_groups,
  v_correct_groups
FROM
  jsonb_array_elements(coalesce(p_snapshot -> 'options', '[]'::jsonb)) o;

    v_score := CASE WHEN v_total_groups > 0 THEN
      v_correct_groups::numeric / v_total_groups::numeric
    ELSE
      0
    END;
    v_correct := v_total_groups > 0
      AND v_correct_groups = v_total_groups
      AND cardinality(v_selected) = v_total_groups;
  ELSE
    RAISE EXCEPTION 'UNSUPPORTED_QUESTION_TYPE';
  END IF;

  RETURN jsonb_build_object('is_correct', v_correct, 'score_awarded', round(v_score, 6), 'question_type', v_type);
END;
$function$ CREATE OR REPLACE FUNCTION app_private.generate_tka_smp_exam (p_exam_id uuid, p_seed text)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_track_id uuid;
  v_program_code text;
  v_track_code text;
  v_rule_id uuid;
  v_bin_id uuid;
  v_mat_id uuid;
  v_bin_section uuid;
  v_mat_section uuid;
  v_bin_count integer;
  v_mat_count integer;
BEGIN
  IF p_seed IS NULL OR btrim(p_seed) = '' THEN
    RAISE EXCEPTION 'Generation seed is required';
  END IF;

  SELECT
    e.track_id,
    p.code,
    t.code,
    e.exam_rule_id
  INTO
    v_track_id,
    v_program_code,
    v_track_code,
    v_rule_id
  FROM
    public.exams e
    JOIN public.programs p ON p.id = e.program_id
    JOIN public.tracks t ON t.id = e.track_id
  WHERE
    e.id = p_exam_id
  FOR UPDATE;

  IF v_track_id IS NULL THEN
    RAISE EXCEPTION 'Exam not found';
  END IF;
  IF v_program_code <> 'TKA' OR v_track_code <> 'SMP' THEN
    RAISE EXCEPTION 'Generator only supports TKA SMP';
  END IF;

  SELECT
    id
  INTO
    v_bin_id
  FROM
    public.subjects
  WHERE
    track_id = v_track_id
    AND code = 'BIN'
  LIMIT 1;
  SELECT
    id
  INTO
    v_mat_id
  FROM
    public.subjects
  WHERE
    track_id = v_track_id
    AND code = 'MAT'
  LIMIT 1;
  SELECT
    id
  INTO
    v_bin_section
  FROM
    public.exam_sections
  WHERE
    exam_id = p_exam_id
    AND subject_id = v_bin_id
  LIMIT 1;
  SELECT
    id
  INTO
    v_mat_section
  FROM
    public.exam_sections
  WHERE
    exam_id = p_exam_id
    AND subject_id = v_mat_id
  LIMIT 1;

  IF v_bin_section IS NULL OR v_mat_section IS NULL THEN
    RAISE EXCEPTION 'BIN and MAT sections must exist before generation';
  END IF;

  DELETE FROM public.exam_question_items
  WHERE exam_id = p_exam_id;

  WITH ranked AS (
    SELECT
      q.id,
      q.version,
      q.cognitive_level,
      q.response_config ->> 'textType' AS text_type,
      row_number() OVER (PARTITION BY q.cognitive_level,
        q.response_config ->> 'textType' ORDER BY md5(p_seed || ':BIN:' || q.id::text)) AS rn
    FROM
      public.questions q
    WHERE
      q.track_id = v_track_id
      AND q.subject_id = v_bin_id
      AND q.status IN ('approved', 'published')
      AND q.response_config ->> 'blueprintVersion' = 'TKA-SMP-2026'
      AND q.cognitive_level IN ('Pemahaman Tekstual', 'Pemahaman Inferensial', 'Evaluasi dan Apresiasi')
      AND q.response_config ->> 'textType' IN ('teks-informasi', 'teks-fiksi')
),
selected AS (
  SELECT
    *
  FROM
    ranked
  WHERE
    rn <= 5
),
ordered AS (
  SELECT
    *,
    row_number() OVER (ORDER BY md5(p_seed || ':BINORDER:' || id::text)) AS pos
FROM
  selected)
INSERT INTO public.exam_question_items (exam_id, section_id, question_id, question_version, position, score_weight)
SELECT
  p_exam_id,
  v_bin_section,
  id,
  version,
  pos,
  1
FROM
  ordered;
  get diagnostics v_bin_count = row_count;

  WITH eligible AS (
    SELECT DISTINCT
      q.id,
      q.version,
      q.cognitive_level,
      elem.name AS element_name
    FROM
      public.questions q
      JOIN public.question_knowledge_nodes qkn ON qkn.question_id = q.id
        AND qkn.relation_type = 'primary'
      JOIN public.knowledge_node_paths kp ON kp.descendant_id = qkn.knowledge_node_id
      JOIN public.knowledge_nodes elem ON elem.id = kp.ancestor_id
        AND elem.node_type = 'element'
    WHERE
      q.track_id = v_track_id
      AND q.subject_id = v_mat_id
      AND q.status IN ('approved', 'published')
      AND q.response_config ->> 'blueprintVersion' = 'TKA-SMP-2026'
      AND q.cognitive_level IN ('Pengetahuan dan Pemahaman', 'Aplikasi', 'Penalaran')
      AND elem.name IN ('Bilangan', 'Aljabar', 'Geometri dan Pengukuran', 'Data dan Peluang')
),
quotas (
  element_name, cognitive_level, quota
) AS (
  VALUES ('Bilangan', 'Pengetahuan dan Pemahaman', 3),
    ('Bilangan', 'Aplikasi', 3),
    ('Bilangan', 'Penalaran', 2),
    ('Aljabar', 'Pengetahuan dan Pemahaman', 3),
    ('Aljabar', 'Aplikasi', 2),
    ('Aljabar', 'Penalaran', 3),
    ('Geometri dan Pengukuran', 'Pengetahuan dan Pemahaman', 2),
    ('Geometri dan Pengukuran', 'Aplikasi', 3),
    ('Geometri dan Pengukuran', 'Penalaran', 2),
    ('Data dan Peluang', 'Pengetahuan dan Pemahaman', 2),
    ('Data dan Peluang', 'Aplikasi', 2),
    ('Data dan Peluang', 'Penalaran', 3)
),
ranked AS (
  SELECT
    e.*, q.quota, row_number() OVER (PARTITION BY e.element_name, e.cognitive_level ORDER BY md5(p_seed || ':MAT:' || e.id::text)) rn
  FROM eligible e
  JOIN quotas q USING (element_name, cognitive_level)
),
selected AS (
  SELECT
    *
  FROM
    ranked
  WHERE
    rn <= quota
),
ordered AS (
  SELECT
    *,
    row_number() OVER (ORDER BY md5(p_seed || ':MATORDER:' || id::text)) AS local_pos
FROM
  selected)
INSERT INTO public.exam_question_items (exam_id, section_id, question_id, question_version, position, score_weight)
SELECT
  p_exam_id,
  v_mat_section,
  id,
  version,
  30 + local_pos,
  1
FROM
  ordered;
  get diagnostics v_mat_count = row_count;

  IF v_bin_count <> 30 OR v_mat_count <> 30 THEN
    RAISE EXCEPTION 'Insufficient blueprint coverage: BIN %, MAT %', v_bin_count, v_mat_count;
  END IF;

  IF v_rule_id IS NOT NULL THEN
    UPDATE
      public.exam_rules
    SET
      config = jsonb_set(jsonb_set(coalesce(config, '{}'::jsonb), '{generationSeed}', to_jsonb (p_seed), TRUE), '{generatedAt}', to_jsonb (now()::text), TRUE),
      updated_at = now()
    WHERE
      id = v_rule_id;
  END IF;

  RETURN jsonb_build_object('exam_id', p_exam_id, 'seed', p_seed, 'bin', v_bin_count, 'mat', v_mat_count, 'total', v_bin_count + v_mat_count);
END;
$function$ CREATE OR REPLACE FUNCTION app_private.get_content_question_detail (p_question_id uuid)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
  -- P0 fix (20260916213000): status approved/published TIDAK boleh menjadi syarat akses.
  -- Hanya author/reviewer atau pemegang permission workspace konten.
  v_allowed := v_q.author_id = v_actor
    OR v_q.reviewer_id = v_actor
    OR app_private.current_user_has_permission ('admin.access')
    OR app_private.current_user_has_permission ('question.manage')
    OR app_private.current_user_has_permission ('content.read')
    OR app_private.current_user_has_permission ('content.create')
    OR app_private.current_user_has_permission ('content.update')
    OR app_private.current_user_has_permission ('content.review')
    OR app_private.current_user_has_permission ('content.publish');
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
$function$ CREATE OR REPLACE FUNCTION app_private.get_exam_attempt_result_for_user (p_user_id uuid, p_attempt_id uuid)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_attempt public.exam_attempts%rowtype;
  v_subjects jsonb;
  v_cognitive jsonb;
  v_nodes jsonb;
  v_weak jsonb;
BEGIN
  SELECT
    *
  INTO
    v_attempt
  FROM
    public.exam_attempts
  WHERE
    id = p_attempt_id
    AND user_id = p_user_id;
  IF NOT found THEN
    RAISE EXCEPTION 'Attempt not found';
  END IF;
  IF v_attempt.status <> 'completed' THEN
    RAISE EXCEPTION 'Result is available only after submission';
  END IF;

  SELECT
    coalesce(jsonb_agg(jsonb_build_object('subjectCode', s.code, 'subjectName', s.name, 'rawScore', sc.raw_score, 'percentage', sc.percentage, 'correctCount', sc.correct_count, 'wrongCount', sc.wrong_count, 'unansweredCount', sc.unanswered_count)
      ORDER BY s.sort_order), '[]'::jsonb)
  INTO
    v_subjects
  FROM
    public.attempt_scores sc
    JOIN public.subjects s ON s.id = sc.subject_id
  WHERE
    sc.attempt_id = p_attempt_id;

  SELECT
    coalesce(jsonb_agg(to_jsonb (x)
      ORDER BY x.subject_code, x.cognitive_level), '[]'::jsonb)
  INTO
    v_cognitive
  FROM (
    SELECT
      s.code subject_code,
      aq.question_snapshot -> 'question' ->> 'cognitive_level' cognitive_level,
      count(*) question_count,
      round(coalesce(sum(aa.score_awarded), 0) / nullif (count(*), 0) * 100, 2) percentage
    FROM
      public.attempt_questions aq
      JOIN public.questions q ON q.id = aq.question_id
      JOIN public.subjects s ON s.id = q.subject_id
      LEFT JOIN public.attempt_answers aa ON aa.attempt_question_id = aq.id
    WHERE
      aq.attempt_id = p_attempt_id
    GROUP BY
      s.code,
      aq.question_snapshot -> 'question' ->> 'cognitive_level') x;

  WITH primary_nodes AS (
    SELECT
      aq.id aq_id,
      (n ->> 'knowledge_node_id')::uuid node_id
    FROM
      public.attempt_questions aq
    CROSS JOIN LATERAL jsonb_array_elements(aq.question_snapshot -> 'knowledge_nodes') n
  WHERE
    aq.attempt_id = p_attempt_id
    AND n ->> 'relation_type' = 'primary'
),
grouped AS (
  SELECT
    kn.id,
    kn.name,
    kn.node_type,
    s.code subject_code,
    count(*) question_count,
    round(coalesce(sum(aa.score_awarded), 0) / nullif (count(*), 0) * 100, 2) percentage
  FROM
    primary_nodes pn
    JOIN public.knowledge_nodes kn ON kn.id = pn.node_id
    JOIN public.attempt_questions aq ON aq.id = pn.aq_id
    JOIN public.questions q ON q.id = aq.question_id
    JOIN public.subjects s ON s.id = q.subject_id
    LEFT JOIN public.attempt_answers aa ON aa.attempt_question_id = aq.id
  GROUP BY
    kn.id,
    kn.name,
    kn.node_type,
    s.code
)
SELECT
  coalesce(jsonb_agg(to_jsonb (grouped)
    ORDER BY subject_code, percentage, name), '[]'::jsonb)
INTO
  v_nodes
FROM
  grouped;

  WITH primary_nodes AS (
    SELECT
      aq.id aq_id,
      (n ->> 'knowledge_node_id')::uuid node_id
    FROM
      public.attempt_questions aq
    CROSS JOIN LATERAL jsonb_array_elements(aq.question_snapshot -> 'knowledge_nodes') n
  WHERE
    aq.attempt_id = p_attempt_id
    AND n ->> 'relation_type' = 'primary'
),
grouped AS (
  SELECT
    kn.name,
    kn.node_type,
    s.code subject_code,
    count(*) question_count,
    round(coalesce(sum(aa.score_awarded), 0) / nullif (count(*), 0) * 100, 2) percentage
  FROM
    primary_nodes pn
    JOIN public.knowledge_nodes kn ON kn.id = pn.node_id
    JOIN public.attempt_questions aq ON aq.id = pn.aq_id
    JOIN public.questions q ON q.id = aq.question_id
    JOIN public.subjects s ON s.id = q.subject_id
    LEFT JOIN public.attempt_answers aa ON aa.attempt_question_id = aq.id
  GROUP BY
    kn.name,
    kn.node_type,
    s.code
)
SELECT
  coalesce(jsonb_agg(to_jsonb (w)
    ORDER BY w.percentage, w.subject_code, w.name), '[]'::jsonb)
INTO
  v_weak
FROM (
  SELECT
    *
  FROM
    grouped
  ORDER BY
    percentage,
    subject_code,
    name
  LIMIT 5) w;

  RETURN jsonb_build_object('attemptId', v_attempt.id, 'status', v_attempt.status, 'rawScore', v_attempt.total_score, 'percentage', v_attempt.percentage, 'durationUsedSeconds', v_attempt.duration_used_seconds, 'subjectScores', v_subjects, 'cognitiveBreakdown', v_cognitive, 'knowledgeBreakdown', v_nodes, 'weakestAreas', v_weak);
END;
$function$ CREATE OR REPLACE FUNCTION app_private.get_exam_attempt_review_for_user (p_user_id uuid, p_attempt_id uuid)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_items jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT
      1
    FROM
      public.exam_attempts
    WHERE
      id = p_attempt_id
      AND user_id = p_user_id
      AND status = 'completed') THEN
  RAISE EXCEPTION 'Completed attempt not found';
END IF;

  SELECT
    coalesce(jsonb_agg(jsonb_build_object('attemptQuestionId', aq.id, 'position', aq.position, 'sectionId', aq.section_id, 'snapshot', aq.question_snapshot, 'answer', jsonb_build_object('selectedOptionId', aa.selected_option_id, 'selectedOptionIds', coalesce((
              SELECT
                jsonb_agg(aao.option_id)
              FROM public.attempt_answer_options aao
              WHERE
                aao.attempt_answer_id = aa.id), '[]'::jsonb), 'answerValue', aa.answer_value, 'isCorrect', aa.is_correct, 'scoreAwarded', aa.score_awarded, 'timeSpentSeconds', coalesce(aa.time_spent_seconds, 0), 'isFlagged', coalesce(aa.is_flagged, FALSE)))
      ORDER BY aq.position), '[]'::jsonb)
  INTO
    v_items
  FROM
    public.attempt_questions aq
  LEFT JOIN public.attempt_answers aa ON aa.attempt_question_id = aq.id
WHERE
  aq.attempt_id = p_attempt_id;

  RETURN jsonb_build_object('attemptId', p_attempt_id, 'items', v_items);
END;
$function$ CREATE OR REPLACE FUNCTION app_private.get_exam_attempt_state_for_user (p_user_id uuid, p_attempt_id uuid)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_attempt public.exam_attempts%rowtype;
  v_active_section uuid;
  v_sections jsonb;
  v_questions jsonb;
  v_answered integer;
  v_total_questions integer;
BEGIN
  SELECT
    *
  INTO
    v_attempt
  FROM
    public.exam_attempts
  WHERE
    id = p_attempt_id
    AND user_id = p_user_id;
  IF NOT found THEN
    RAISE EXCEPTION 'Attempt not found';
  END IF;

  SELECT
    section_id
  INTO
    v_active_section
  FROM
    public.attempt_section_states
  WHERE
    attempt_id = p_attempt_id
    AND status = 'active'
  LIMIT 1;

  SELECT
    coalesce(jsonb_agg(jsonb_build_object('sectionId', ass.section_id, 'title', es.title, 'subjectCode', s.code, 'sortOrder', es.sort_order, 'status', ass.status, 'questionCount', es.question_count, 'durationSeconds', es.duration_seconds, 'startedAt', ass.started_at, 'deadlineAt', ass.deadline_at, 'remainingSeconds', CASE WHEN ass.status = 'active'
            AND ass.deadline_at IS NOT NULL THEN
            greatest (0, floor(extract(epoch FROM (ass.deadline_at - now())))::integer)
          WHEN ass.status = 'completed' THEN
            0
          ELSE
            NULL
          END, 'durationUsedSeconds', ass.duration_used_seconds)
      ORDER BY es.sort_order), '[]'::jsonb)
  INTO
    v_sections
  FROM
    public.attempt_section_states ass
    JOIN public.exam_sections es ON es.id = ass.section_id
    LEFT JOIN public.subjects s ON s.id = es.subject_id
  WHERE
    ass.attempt_id = p_attempt_id;

  IF v_active_section IS NOT NULL THEN
    SELECT
      coalesce(jsonb_agg(jsonb_build_object('attemptQuestionId', aq.id, 'position', aq.position, 'question', aq.question_snapshot -> 'question', 'stimulus', aq.question_snapshot -> 'stimulus', 'knowledgeNodes', aq.question_snapshot -> 'knowledge_nodes', 'options', coalesce((
              SELECT
                jsonb_agg(o - 'is_correct' - 'score' ORDER BY (o ->> 'sort_order')::integer)
              FROM jsonb_array_elements(aq.question_snapshot -> 'options') o), '[]'::jsonb), 'answer', jsonb_build_object('selectedOptionId', aa.selected_option_id, 'selectedOptionIds', coalesce((
              SELECT
                jsonb_agg(aao.option_id)
              FROM public.attempt_answer_options aao
              WHERE
                aao.attempt_answer_id = aa.id), '[]'::jsonb), 'answerValue', aa.answer_value, 'isFlagged', coalesce(aa.is_flagged, FALSE), 'timeSpentSeconds', coalesce(aa.time_spent_seconds, 0)))
      ORDER BY aq.position), '[]'::jsonb)
    INTO
      v_questions
    FROM
      public.attempt_questions aq
      LEFT JOIN public.attempt_answers aa ON aa.attempt_question_id = aq.id
    WHERE
      aq.attempt_id = p_attempt_id
      AND aq.section_id = v_active_section;
  ELSE
    v_questions := '[]'::jsonb;
  END IF;

  SELECT
    count(*)
  INTO
    v_answered
  FROM
    public.attempt_answers aa
    JOIN public.attempt_questions aq ON aq.id = aa.attempt_question_id
  WHERE
    aq.attempt_id = p_attempt_id;

  SELECT
    count(*)
  INTO
    v_total_questions
  FROM
    public.attempt_questions aq
  WHERE
    aq.attempt_id = p_attempt_id;

  RETURN jsonb_build_object('attemptId', v_attempt.id, 'examId', v_attempt.exam_id, 'status', v_attempt.status, 'attemptNumber', v_attempt.attempt_number, 'startedAt', v_attempt.started_at, 'activeSectionId', v_active_section, 'answeredCount', v_answered, 'totalQuestions', v_total_questions, 'sections', v_sections, 'questions', v_questions);
END;
$function$ CREATE OR REPLACE FUNCTION app_private.get_tka_smp_remedial_payload_for_user (p_user_id uuid, p_session_id uuid)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_session public.remedial_sessions%rowtype;
  v_items jsonb := '[]'::jsonb;
  v_total integer := 0;
  v_completed integer := 0;
  v_pending integer := 0;
BEGIN
  PERFORM
    app_private.sync_tka_smp_remedial_sessions_for_user (p_user_id);

  SELECT
    rs.*
  INTO
    v_session
  FROM
    public.remedial_sessions rs
    JOIN public.tracks t ON t.id = rs.track_id
    JOIN public.programs p ON p.id = t.program_id
  WHERE
    rs.id = p_session_id
    AND rs.user_id = p_user_id
    AND upper(p.code) = 'TKA'
    AND upper(t.code) = 'SMP';

  IF v_session.id IS NULL THEN
    RETURN jsonb_build_object('session', NULL, 'items', '[]'::jsonb);
  END IF;

  SELECT
    count(*)::integer,
    count(*) FILTER (WHERE rsi.status = 'completed')::integer,
    count(*) FILTER (WHERE rsi.status = 'pending')::integer
  INTO
    v_total,
    v_completed,
    v_pending
  FROM
    public.remedial_session_items rsi
  WHERE
    rsi.session_id = v_session.id;

  SELECT
    coalesce(jsonb_agg(item ORDER BY position), '[]'::jsonb)
  INTO
    v_items
  FROM (
    SELECT
      rsi.position,
      jsonb_build_object('id', rsi.id, 'position', rsi.position, 'status', rsi.status, 'review_count', rsi.review_count, 'best_score', rsi.best_score, 'reason', rsi.reason, 'wrong_question_id', uwq.id, 'question_id', rsi.question_id, 'subject_id', uwq.subject_id, 'failure_count', uwq.failure_count, 'wrong_count', uwq.wrong_count, 'unanswered_count', uwq.unanswered_count, 'latest_outcome', uwq.latest_outcome, 'question_snapshot', jsonb_build_object('question', uwq.question_snapshot -> 'question', 'stimulus', uwq.question_snapshot -> 'stimulus', 'options', coalesce((
            SELECT
              jsonb_agg((option_row - 'is_correct' - 'score')
            ORDER BY coalesce((option_row ->> 'sort_order')::integer, 0), option_row ->> 'id')
        FROM jsonb_array_elements(coalesce(uwq.question_snapshot -> 'options', '[]'::jsonb)) option_row), '[]'::jsonb), 'explanations', '[]'::jsonb)) AS item
    FROM
      public.remedial_session_items rsi
      JOIN public.user_wrong_questions uwq ON uwq.id = rsi.user_wrong_question_id
    WHERE
      rsi.session_id = v_session.id
    ORDER BY
      rsi.position) payload_rows;

  RETURN jsonb_build_object('session', jsonb_build_object('id', v_session.id, 'source_attempt_id', v_session.source_attempt_id, 'status', v_session.status, 'total_items', v_total, 'completed_items', v_completed, 'pending_items', v_pending, 'created_at', v_session.created_at, 'completed_at', v_session.completed_at), 'items', v_items);
END;
$function$ CREATE OR REPLACE FUNCTION app_private.get_user_authorization (p_user_id uuid, p_scope_type text DEFAULT NULL::text, p_scope_id uuid DEFAULT NULL::uuid)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_actor uuid := auth.uid ();
  v_roles jsonb;
  v_permissions jsonb;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User id required';
  END IF;
  IF p_user_id <> v_actor AND NOT app_private.current_user_has_permission ('admin.access') THEN
    RAISE EXCEPTION 'Authorization lookup denied';
  END IF;

  WITH assignments AS (
    SELECT
      ur.role_id
    FROM
      public.user_roles ur
    WHERE
      ur.user_id = p_user_id
      AND ((p_scope_type IS NULL
          AND ur.scope_type IS NULL)
        OR (p_scope_type IS NOT NULL
          AND (ur.scope_type IS NULL
            OR (ur.scope_type = p_scope_type
              AND ur.scope_id = p_scope_id))))
),
role_codes AS (
  SELECT DISTINCT
    r.code
  FROM
    assignments a
    JOIN public.roles r ON r.id = a.role_id
)
SELECT
  coalesce(jsonb_agg(code ORDER BY code), '[]'::jsonb)
INTO
  v_roles
FROM
  role_codes;

  WITH assignments AS (
    SELECT
      ur.role_id
    FROM
      public.user_roles ur
    WHERE
      ur.user_id = p_user_id
      AND ((p_scope_type IS NULL
          AND ur.scope_type IS NULL)
        OR (p_scope_type IS NOT NULL
          AND (ur.scope_type IS NULL
            OR (ur.scope_type = p_scope_type
              AND ur.scope_id = p_scope_id))))
),
permission_codes AS (
  SELECT DISTINCT
    p.code
  FROM
    assignments a
    JOIN public.role_permissions rp ON rp.role_id = a.role_id
    JOIN public.permissions p ON p.id = rp.permission_id
)
SELECT
  coalesce(jsonb_agg(code ORDER BY code), '[]'::jsonb)
INTO
  v_permissions
FROM
  permission_codes;

  RETURN jsonb_build_object('user_id', p_user_id, 'roles', v_roles, 'permissions', v_permissions);
END;
$function$ CREATE OR REPLACE FUNCTION app_private.grant_content_reviewer (p_user_id uuid)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_actor uuid := auth.uid ();
  v_role_id uuid;
  v_target public.profiles%rowtype;
  v_is_admin boolean;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT
    EXISTS (
      SELECT
        1
      FROM
        public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
      WHERE
        ur.user_id = v_actor
        AND r.code IN ('ADMIN', 'SUPER_ADMIN')
        AND ur.scope_type IS NULL
        AND ur.scope_id IS NULL)
  INTO
    v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Admin role required';
  END IF;

  SELECT
    *
  INTO
    v_target
  FROM
    public.profiles
  WHERE
    id = p_user_id
    AND status = 'active';

  IF NOT found THEN
    RAISE EXCEPTION 'Target profile not found or inactive';
  END IF;

  SELECT
    id
  INTO
    v_role_id
  FROM
    public.roles
  WHERE
    code = 'CONTENT_REVIEWER';

  IF v_role_id IS NULL THEN
    RAISE EXCEPTION 'CONTENT_REVIEWER role not found';
  END IF;

  IF NOT EXISTS (
    SELECT
      1
    FROM
      public.user_roles
    WHERE
      user_id = p_user_id
      AND role_id = v_role_id
      AND scope_type IS NULL
      AND scope_id IS NULL) THEN
  INSERT INTO public.user_roles (user_id, role_id, scope_type, scope_id)
    VALUES (p_user_id, v_role_id, NULL, NULL);
END IF;

  RETURN jsonb_build_object('user_id', p_user_id, 'role', 'CONTENT_REVIEWER', 'granted', TRUE);
END;
$function$ CREATE OR REPLACE FUNCTION app_private.guard_exam_question_item ()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
DECLARE
  v_q_status text;
  v_q_version integer;
  v_q_program uuid;
  v_q_track uuid;
  v_exam_program uuid;
  v_exam_track uuid;
BEGIN
  SELECT
    status,
    version,
    program_id,
    track_id
  INTO
    v_q_status,
    v_q_version,
    v_q_program,
    v_q_track
  FROM
    public.questions
  WHERE
    id = NEW.question_id;

  IF v_q_status IS NULL THEN
    RAISE EXCEPTION 'Question not found';
  END IF;
  IF v_q_status NOT IN ('approved', 'published') THEN
    RAISE EXCEPTION 'Only approved/published questions can be added to an exam; question status is %', v_q_status;
  END IF;
  IF NEW.question_version <> v_q_version THEN
    RAISE EXCEPTION 'Exam question version % does not match current question version %', NEW.question_version, v_q_version;
  END IF;

  SELECT
    program_id,
    track_id
  INTO
    v_exam_program,
    v_exam_track
  FROM
    public.exams
  WHERE
    id = NEW.exam_id;
  IF v_exam_program IS DISTINCT FROM v_q_program OR v_exam_track IS DISTINCT FROM v_q_track THEN
    RAISE EXCEPTION 'Question program/track does not match exam program/track';
  END IF;

  RETURN new;
END;
$function$ CREATE OR REPLACE FUNCTION app_private.has_active_feature (target_feature uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  SELECT
    EXISTS (
      SELECT
        1
      FROM
        public.entitlements e
      WHERE
        e.user_id = (
          SELECT
            auth.uid ())
          AND e.feature_id = target_feature
          AND upper(e.status) = 'ACTIVE'
          AND e.starts_at <= now()
          AND (e.expires_at IS NULL
            OR e.expires_at > now())
          AND (e.usage_limit IS NULL
            OR e.usage_count < e.usage_limit));
$function$ CREATE OR REPLACE FUNCTION app_private.has_permission (required_permission text)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  SELECT
    EXISTS (
      SELECT
        1
      FROM
        public.user_roles ur
        JOIN public.role_permissions rp ON rp.role_id = ur.role_id
        JOIN public.permissions p ON p.id = rp.permission_id
      WHERE
        ur.user_id = (
          SELECT
            auth.uid ())
          AND p.code = required_permission);
$function$ CREATE OR REPLACE FUNCTION app_private.is_org_member (org_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  SELECT
    EXISTS (
      SELECT
        1
      FROM
        public.organization_members om
      WHERE
        om.organization_id = org_id
        AND om.user_id = (
          SELECT
            auth.uid ())
          AND upper(om.status) = 'ACTIVE');
$function$ CREATE OR REPLACE FUNCTION app_private.list_content_people ()
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$
