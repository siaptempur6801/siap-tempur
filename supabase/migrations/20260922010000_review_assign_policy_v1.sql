-- Review Queue — kebijakan penugasan reviewer (aturan C).
--
-- MASALAH
--   `assign_question_reviewer` hanya memeriksa `content.review` ATAU
--   `question.manage`, sehingga seorang CONTENT_REVIEWER dapat menugaskan soal
--   ke reviewer lain dan merebut review yang sudah dipegang orang lain.
--
-- ATURAN BARU
--   1. Klaim untuk diri sendiri: cukup `content.review`.
--   2. Menugaskan / memindahkan ke orang lain: wajib `content.assign` atau
--      `question.manage` (ADMIN/SUPER_ADMIN).
--   3. Review yang sudah dipegang reviewer lain tidak dapat direbut lewat klaim
--      diri; manager/assigner tetap boleh memindahkannya.
--
-- `claim_pilot_review_stage` (klaim massal) sudah self-only dan tidak berubah.
BEGIN;
INSERT INTO public.permissions (code, name, description)
SELECT
  'content.assign',
  'Assign Reviewer',
  'Menugaskan atau memindahkan reviewer konten'
WHERE
  NOT EXISTS (
    SELECT
      1
    FROM
      public.permissions
    WHERE
      code = 'content.assign');
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT
  r.id,
  p.id
FROM
  public.roles r
  JOIN public.permissions p ON p.code = 'content.assign'
WHERE
  r.code IN ('ADMIN', 'SUPER_ADMIN')
  AND NOT EXISTS (
    SELECT
      1
    FROM
      public.role_permissions rp
    WHERE
      rp.role_id = r.id
      AND rp.permission_id = p.id);
CREATE OR REPLACE FUNCTION app_private.assign_question_reviewer (p_question_id uuid, p_reviewer_id uuid)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_actor uuid := auth.uid ();
  v_q public.questions%rowtype;
  v_stage text;
  v_review public.content_reviews%rowtype;
  v_reviewer_ok boolean;
  v_can_assign_others boolean;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF NOT app_private.current_user_has_permission ('content.review') AND NOT app_private.current_user_has_permission ('question.manage') AND NOT app_private.current_user_has_permission ('content.assign') THEN
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

  v_can_assign_others := app_private.current_user_has_permission ('content.assign')
    OR app_private.current_user_has_permission ('question.manage');
  -- Menugaskan ke ORANG LAIN adalah aksi manajerial.
  IF p_reviewer_id IS DISTINCT FROM v_actor AND NOT v_can_assign_others THEN
    RAISE EXCEPTION 'Reviewer assignment permission required';
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
    *
  INTO
    v_review
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

  IF v_review.id IS NULL THEN
    RAISE EXCEPTION 'No pending % review found', v_stage;
  END IF;
  -- Klaim diri tidak boleh merebut review yang sudah dipegang reviewer lain.
  IF p_reviewer_id = v_actor AND v_review.reviewer_id IS NOT NULL AND v_review.reviewer_id IS DISTINCT FROM v_actor AND NOT v_can_assign_others THEN
    RAISE EXCEPTION 'Review is already assigned to another reviewer';
  END IF;

  UPDATE
    public.content_reviews
  SET
    reviewer_id = p_reviewer_id,
    assigned_at = now(),
    updated_at = now()
  WHERE
    id = v_review.id;

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

  RETURN jsonb_build_object('question_id', p_question_id, 'review_stage', v_stage, 'review_round', v_review.review_round, 'reviewer_id', p_reviewer_id);
END;
$function$;
NOTIFY pgrst,
'reload schema';
COMMIT;
