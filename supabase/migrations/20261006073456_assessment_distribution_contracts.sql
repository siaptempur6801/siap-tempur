-- Distribution channels select an existing ready CPNS/TKA assessment.
-- Keep legacy organization templates and composed exams readable for history;
-- stop exposing template composition as a supported authenticated workflow.
CREATE OR REPLACE FUNCTION public.admin_upsert_assignment (p_id uuid, p_batch_id uuid, p_exam_id uuid, p_template_id uuid, p_starts_at timestamptz, p_due_at timestamptz, p_is_active boolean, p_notes text)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_actor uuid := auth.uid ();
  v_org uuid;
  v_exam_status text;
  v_program_code text;
  v_exam_type_code text;
  v_items integer;
  v_section_questions integer;
  v_id uuid := p_id;
  v_existing_batch uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF NOT app_private.current_user_has_permission ('organization.manage') THEN
    RAISE EXCEPTION 'Organization manage permission required';
  END IF;

  SELECT
    b.organization_id
  INTO
    v_org
  FROM
    public.organization_batches b
  WHERE
    b.id = p_batch_id;
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Batch not found';
  END IF;

  SELECT
    e.status,
    upper(coalesce(p.code, '')), upper(coalesce(et.code, ''))
  INTO
    v_exam_status,
    v_program_code,
    v_exam_type_code
  FROM
    public.exams e
    JOIN public.programs p ON p.id = e.program_id
    JOIN public.exam_types et ON et.id = e.exam_type_id
  WHERE
    e.id = p_exam_id;
  IF NOT found THEN
    RAISE EXCEPTION 'Exam not found';
  END IF;
  IF v_program_code NOT IN ('CPNS', 'TKA') THEN
    RAISE EXCEPTION 'Assignment requires a CPNS or TKA assessment';
  END IF;
  IF v_exam_type_code NOT IN ('FULL_TRYOUT', 'MINI_TRYOUT', 'DRILL') THEN
    RAISE EXCEPTION 'Assignment requires a tryout, mini tryout, or drill';
  END IF;
  IF upper(v_exam_status)
    NOT IN ('ACTIVE', 'SCHEDULED', 'PUBLISHED', 'READY') THEN
    RAISE EXCEPTION 'Assessment is not available';
  END IF;
  IF p_starts_at IS NOT NULL AND p_due_at IS NOT NULL AND p_due_at < p_starts_at THEN
    RAISE EXCEPTION 'Assignment due must not be before its start';
  END IF;

  SELECT
    count(*)
  INTO
    v_items
  FROM
    public.exam_question_items i
  WHERE
    i.exam_id = p_exam_id;
  SELECT
    coalesce(sum(greatest (coalesce(s.question_count, 0), 0)), 0)
  INTO
    v_section_questions
  FROM
    public.exam_sections s
  WHERE
    s.exam_id = p_exam_id;
  IF v_items = 0 AND v_section_questions = 0 THEN
    RAISE EXCEPTION 'Cannot assign an assessment that has no questions';
  END IF;

  IF v_id IS NULL THEN
    INSERT INTO public.organization_exam_assignments (organization_id, batch_id, exam_id, template_id, assigned_by, starts_at, due_at, is_active, notes)
      VALUES (v_org, p_batch_id, p_exam_id, p_template_id, v_actor, p_starts_at, p_due_at, coalesce(p_is_active, TRUE), nullif (btrim(coalesce(p_notes, '')), ''))
        RETURNING
          id
        INTO
          v_id;
  ELSE
    SELECT
      a.batch_id
    INTO
      v_existing_batch
    FROM
      public.organization_exam_assignments a
    WHERE
      a.id = v_id;
    IF NOT found THEN
      RAISE EXCEPTION 'Assignment not found';
    END IF;
    IF v_existing_batch <> p_batch_id THEN
      RAISE EXCEPTION 'Assignment batch mismatch';
    END IF;

    UPDATE
      public.organization_exam_assignments a
    SET
      organization_id = v_org,
      exam_id = p_exam_id,
      template_id = coalesce(p_template_id, a.template_id),
      starts_at = p_starts_at,
      due_at = p_due_at,
      is_active = coalesce(p_is_active, TRUE),
      notes = nullif (btrim(coalesce(p_notes, '')), '')
          WHERE
            a.id = v_id;
  END IF;

  RETURN jsonb_build_object('id', v_id, 'batch_id', p_batch_id, 'exam_id', p_exam_id);
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_upsert_assignment (uuid, uuid, uuid, uuid, timestamptz, timestamptz, boolean, text) FROM public, anon;

GRANT EXECUTE ON FUNCTION public.admin_upsert_assignment (uuid, uuid, uuid, uuid, timestamptz, timestamptz, boolean, text) TO authenticated;

-- The old RPCs created private copies of questions/exams or could delete an
-- exam that might now be shared by other channels. Preserve the routines/data,
-- but remove the authenticated client entry points.
REVOKE ALL ON FUNCTION public.admin_upsert_org_template (uuid, uuid, text, integer, integer, integer, integer, integer, boolean, boolean, text, text, text) FROM public, anon, authenticated;

REVOKE ALL ON FUNCTION public.admin_list_org_templates (uuid) FROM public, anon, authenticated;

REVOKE ALL ON FUNCTION public.admin_template_shortages (uuid) FROM public, anon, authenticated;

REVOKE ALL ON FUNCTION public.admin_compose_exam_from_template (uuid, text, text) FROM public, anon, authenticated;

REVOKE ALL ON FUNCTION public.admin_delete_composed_exam (uuid) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION app_private.validate_event_session_assessment ()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_event_program uuid;
  v_event_track uuid;
  v_exam_program uuid;
  v_exam_track uuid;
  v_program_code text;
  v_exam_type_code text;
  v_exam_status text;
  v_items integer;
  v_section_questions integer;
BEGIN
  SELECT
    e.program_id,
    e.track_id
  INTO
    v_event_program,
    v_event_track
  FROM
    public.events e
  WHERE
    e.id = NEW.event_id;
  IF NOT found THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  SELECT
    e.program_id,
    e.track_id,
    upper(coalesce(p.code, '')), upper(coalesce(et.code, '')),
    e.status
  INTO
    v_exam_program,
    v_exam_track,
    v_program_code,
    v_exam_type_code,
    v_exam_status
  FROM
    public.exams e
    JOIN public.programs p ON p.id = e.program_id
    JOIN public.exam_types et ON et.id = e.exam_type_id
  WHERE
    e.id = NEW.exam_id;
  IF NOT found THEN
    RAISE EXCEPTION 'Assessment not found';
  END IF;
  -- Existing EVENT exams are grandfathered for edits to their schedule only.
  IF v_exam_type_code = 'EVENT' AND tg_op = 'UPDATE' AND OLD.event_id = NEW.event_id AND OLD.exam_id = NEW.exam_id THEN
    RETURN new;
  END IF;
  IF v_program_code NOT IN ('CPNS', 'TKA') OR v_exam_type_code NOT IN ('FULL_TRYOUT', 'MINI_TRYOUT', 'DRILL') OR upper(v_exam_status)
    NOT IN ('ACTIVE', 'SCHEDULED', 'PUBLISHED', 'READY') THEN
    RAISE EXCEPTION 'Event requires an available CPNS/TKA tryout, mini tryout, or drill';
  END IF;
  IF v_event_program <> v_exam_program OR v_event_track <> v_exam_track THEN
    RAISE EXCEPTION 'Event assessment domain/level mismatch';
  END IF;

  SELECT
    count(*)
  INTO
    v_items
  FROM
    public.exam_question_items i
  WHERE
    i.exam_id = NEW.exam_id;
  SELECT
    coalesce(sum(greatest (coalesce(s.question_count, 0), 0)), 0)
  INTO
    v_section_questions
  FROM
    public.exam_sections s
  WHERE
    s.exam_id = NEW.exam_id;
  IF v_items = 0 AND v_section_questions = 0 THEN
    RAISE EXCEPTION 'Event assessment has no questions';
  END IF;
  RETURN new;
END;
$function$;

REVOKE ALL ON FUNCTION app_private.validate_event_session_assessment () FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS event_sessions_validate_assessment ON public.event_sessions;

CREATE TRIGGER event_sessions_validate_assessment
  BEFORE INSERT OR UPDATE OF event_id,
  exam_id ON public.event_sessions
  FOR EACH ROW
  EXECUTE FUNCTION app_private.validate_event_session_assessment ();
