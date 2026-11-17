-- Harden security-definer RPCs and hide answer keys from direct client reads.
-- Authenticated users may read questions/options for active sessions, but they
-- must not be able to read answer keys or explanations directly from PostgREST.
REVOKE SELECT ON public.questions FROM anon, authenticated;

GRANT SELECT (id, question_code, content, type, category, sub_category, image_url, created_at) ON public.questions TO anon, authenticated;

REVOKE SELECT ON public.options FROM anon, authenticated;

GRANT SELECT (id, question_id, content, image_url, created_at) ON public.options TO anon, authenticated;

-- Keep direct writes blocked for normal clients. Admin/server code should use
-- the service role client or explicit admin-only RPCs.
REVOKE INSERT, UPDATE, DELETE ON public.questions FROM anon, authenticated;

REVOKE INSERT, UPDATE, DELETE ON public.options FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.increment_tryout_quota (user_id_param uuid, increment_by int)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
BEGIN
  IF coalesce(auth.role (), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF user_id_param IS NULL OR increment_by IS NULL OR increment_by <= 0 THEN
    RAISE EXCEPTION 'Invalid quota increment';
  END IF;

  UPDATE
    public.profiles
  SET
    tryout_quota = coalesce(tryout_quota, 0) + increment_by
  WHERE
    id = user_id_param;

  IF NOT found THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_session_score (session_uuid uuid)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  v_session_user_id uuid;
  v_twk int;
  v_tiu int;
  v_tkp int;
  v_total int;
  v_passed boolean;
  pass_twk int := 65;
  pass_tiu int := 80;
  pass_tkp int := 166;
BEGIN
  SELECT
    user_id
  INTO
    v_session_user_id
  FROM
    public.test_sessions
  WHERE
    id = session_uuid;

  IF v_session_user_id IS NULL THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  IF coalesce(auth.role (), '') <> 'service_role' AND v_session_user_id <> (
    SELECT
      auth.uid ()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT
    coalesce(sum(
        CASE WHEN q.type = 'TWK'
          AND o.is_correct THEN
          5
        ELSE
          0
        END), 0)
  INTO
    v_twk
  FROM
    public.test_answers a
    JOIN public.questions q ON a.question_id = q.id
    LEFT JOIN public.options o ON a.option_id = o.id
      AND o.question_id = a.question_id
  WHERE
    a.session_id = session_uuid;

  SELECT
    coalesce(sum(
        CASE WHEN q.type = 'TIU'
          AND o.is_correct THEN
          5
        ELSE
          0
        END), 0)
  INTO
    v_tiu
  FROM
    public.test_answers a
    JOIN public.questions q ON a.question_id = q.id
    LEFT JOIN public.options o ON a.option_id = o.id
      AND o.question_id = a.question_id
  WHERE
    a.session_id = session_uuid;

  SELECT
    coalesce(sum(
        CASE WHEN q.type = 'TKP' THEN
          coalesce(o.score_value, 0)
        ELSE
          0
        END), 0)
  INTO
    v_tkp
  FROM
    public.test_answers a
    JOIN public.questions q ON a.question_id = q.id
    LEFT JOIN public.options o ON a.option_id = o.id
      AND o.question_id = a.question_id
  WHERE
    a.session_id = session_uuid;

  v_total := v_twk + v_tiu + v_tkp;
  v_passed := (v_twk >= pass_twk
    AND v_tiu >= pass_tiu
    AND v_tkp >= pass_tkp);

  UPDATE
    public.test_sessions
  SET
    score_twk = v_twk,
    score_tiu = v_tiu,
    score_tkp = v_tkp,
    total_score = v_total,
    is_passed = v_passed,
    status = 'completed',
    end_time = now(),
    last_activity_at = now()
  WHERE
    id = session_uuid;
END;
$$;

CREATE OR REPLACE FUNCTION public.start_practice_session (p_user_id uuid, p_type question_type, p_limit int DEFAULT 10)
  RETURNS TABLE (
    session_id uuid,
    questions json)
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  v_session_id uuid;
  v_questions json;
BEGIN
  IF coalesce(auth.role (), '') <> 'service_role' AND p_user_id <> (
    SELECT
      auth.uid ()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_user_id IS NULL OR p_type IS NULL OR p_limit IS NULL OR p_limit < 1 OR p_limit > 110 THEN
    RAISE EXCEPTION 'Invalid practice request';
  END IF;

  INSERT INTO public.test_sessions (user_id, mode, status, start_time, last_activity_at)
    VALUES (p_user_id, 'practice', 'in_progress', now(), now())
  RETURNING
    id
  INTO
    v_session_id;

  WITH selected_questions AS (
    SELECT
      id,
      content,
      type,
      category,
      sub_category,
      image_url
    FROM
      public.questions
    WHERE
      type = p_type
    ORDER BY
      random()
    LIMIT p_limit
),
inserted_answers AS (
INSERT INTO public.test_answers (session_id, question_id)
  SELECT
    v_session_id,
    id
  FROM
    selected_questions
  RETURNING
    question_id
)
SELECT
  json_agg(json_build_object('id', q.id, 'content', q.content, 'type', q.type, 'category', q.category, 'sub_category', q.sub_category, 'image_url', q.image_url, 'options', (
        SELECT
          json_agg(json_build_object('id', o.id, 'content', o.content, 'image_url', o.image_url)
        ORDER BY random())
      FROM public.options o
      WHERE
        o.question_id = q.id)))
INTO
  v_questions
FROM
  selected_questions q
  JOIN inserted_answers ia ON ia.question_id = q.id;

  RETURN QUERY
  SELECT
    v_session_id,
    v_questions;
END;
$$;

CREATE OR REPLACE FUNCTION public.start_tryout_session (p_user_id uuid)
  RETURNS TABLE (
    session_id uuid,
    questions json)
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  v_session_id uuid;
  v_questions json;
  v_remaining_quota int;
BEGIN
  IF coalesce(auth.role (), '') <> 'service_role' AND p_user_id <> (
    SELECT
      auth.uid ()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE
    public.profiles
  SET
    tryout_quota = tryout_quota - 1
  WHERE
    id = p_user_id
    AND coalesce(tryout_quota, 0) > 0
  RETURNING
    tryout_quota
  INTO
    v_remaining_quota;

  IF NOT found THEN
    RAISE EXCEPTION 'Not enough SKD tickets';
  END IF;

  INSERT INTO public.test_sessions (user_id, mode, status, start_time, last_activity_at)
    VALUES (p_user_id, 'tryout', 'in_progress', now(), now())
  RETURNING
    id
  INTO
    v_session_id;

  CREATE temp TABLE IF NOT EXISTS temp_selected_questions (
    question_id uuid,
    sort_order int
  ) ON COMMIT DROP;

  TRUNCATE temp_selected_questions;

INSERT INTO temp_selected_questions (question_id, sort_order)
SELECT
  q.id,
  tc.sort_order
FROM
  public.tryout_configurations tc
  CROSS JOIN LATERAL (
    SELECT
      id
    FROM
      public.questions q_inner
    WHERE
      q_inner.type = tc.type::question_type
      AND q_inner.sub_category = tc.sub_category
    ORDER BY
      random()
    LIMIT tc.question_count) q
WHERE
  tc.is_active = TRUE;

INSERT INTO public.test_answers (session_id, question_id)
SELECT
  v_session_id,
  question_id
FROM
  temp_selected_questions;

  SELECT
    json_agg(json_build_object('id', q.id, 'content', q.content, 'type', q.type, 'category', q.category, 'sub_category', q.sub_category, 'image_url', q.image_url, 'options', (
          SELECT
            json_agg(json_build_object('id', o.id, 'content', o.content, 'image_url', o.image_url)
          ORDER BY random())
        FROM public.options o
        WHERE
          o.question_id = q.id))
    ORDER BY tsq.sort_order, random())
  INTO
    v_questions
  FROM
    temp_selected_questions tsq
    JOIN public.questions q ON q.id = tsq.question_id;

  RETURN QUERY
  SELECT
    v_session_id,
    v_questions;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_voucher (p_user_id uuid, p_voucher_code text, p_user_email text DEFAULT NULL)
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  v_voucher_id uuid;
  v_quota_amount int;
  v_max_uses int;
  v_used_count int;
  v_expires_at timestamp with time zone;
  v_is_active boolean;
  v_has_claimed boolean;
  v_resolved_email text;
BEGIN
  IF coalesce(auth.role (), '') <> 'service_role' AND p_user_id <> (
    SELECT
      auth.uid ()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_user_id IS NULL OR p_voucher_code IS NULL OR btrim(p_voucher_code) = '' THEN
    RAISE EXCEPTION 'User ID dan Kode Voucher tidak boleh kosong';
  END IF;

  SELECT
    lower(trim(email))
  INTO
    v_resolved_email
  FROM
    auth.users
  WHERE
    id = p_user_id;

  IF v_resolved_email IS NULL AND coalesce(auth.role (), '') = 'service_role' THEN
    v_resolved_email := nullif (lower(trim(p_user_email)), '');
  END IF;

  SELECT
    id,
    quota_amount,
    max_uses,
    used_count,
    expires_at,
    is_active
  INTO
    v_voucher_id,
    v_quota_amount,
    v_max_uses,
    v_used_count,
    v_expires_at,
    v_is_active
  FROM
    public.vouchers
  WHERE
    code = upper(trim(p_voucher_code))
  FOR UPDATE;

  IF NOT found THEN
    RAISE EXCEPTION 'Kode voucher tidak valid atau tidak ditemukan';
  END IF;

  IF NOT v_is_active THEN
    RAISE EXCEPTION 'Kode voucher ini sudah tidak aktif';
  END IF;

  IF v_expires_at IS NOT NULL AND v_expires_at < now() THEN
    RAISE EXCEPTION 'Kode voucher ini sudah kadaluarsa';
  END IF;

  IF v_used_count >= v_max_uses THEN
    RAISE EXCEPTION 'Kuota untuk kode voucher ini sudah habis digunakan';
  END IF;

  SELECT
    EXISTS (
      SELECT
        1
      FROM
        public.voucher_claims
      WHERE
        voucher_id = v_voucher_id
        AND user_id = p_user_id)
  INTO
    v_has_claimed;

  IF v_has_claimed THEN
    RAISE EXCEPTION 'Anda sudah pernah mengklaim kode voucher ini sebelumnya';
  END IF;

  IF v_resolved_email IS NOT NULL THEN
    SELECT
      EXISTS (
        SELECT
          1
        FROM
          public.voucher_claims
        WHERE
          voucher_id = v_voucher_id
          AND lower(trim(user_email)) = v_resolved_email)
    INTO
      v_has_claimed;

    IF v_has_claimed THEN
      RAISE EXCEPTION 'Email ini sudah pernah mengklaim kode voucher ini. Voucher hanya dapat diklaim satu kali per pengguna';
    END IF;
  END IF;

  INSERT INTO public.voucher_claims (voucher_id, user_id, user_email)
    VALUES (v_voucher_id, p_user_id, v_resolved_email);

  UPDATE
    public.vouchers
  SET
    used_count = used_count + 1,
    updated_at = now()
  WHERE
    id = v_voucher_id;

  UPDATE
    public.profiles
  SET
    tryout_quota = coalesce(tryout_quota, 0) + v_quota_amount
  WHERE
    id = p_user_id;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_voucher (p_user_id uuid, p_voucher_code text)
  RETURNS boolean
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path = public
  AS $$
  SELECT
    public.claim_voucher (p_user_id, p_voucher_code, NULL);
$$;

REVOKE EXECUTE ON FUNCTION public.increment_tryout_quota (uuid, int) FROM public, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.increment_tryout_quota (uuid, int) TO service_role;

REVOKE EXECUTE ON FUNCTION public.calculate_session_score (uuid) FROM public;

REVOKE EXECUTE ON FUNCTION public.start_practice_session (uuid, question_type, int) FROM public;

REVOKE EXECUTE ON FUNCTION public.start_tryout_session (uuid) FROM public;

REVOKE EXECUTE ON FUNCTION public.claim_voucher (uuid, text) FROM public;

REVOKE EXECUTE ON FUNCTION public.claim_voucher (uuid, text, text) FROM public;

GRANT EXECUTE ON FUNCTION public.calculate_session_score (uuid) TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.start_practice_session (uuid, question_type, int) TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.start_tryout_session (uuid) TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.claim_voucher (uuid, text) TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.claim_voucher (uuid, text, text) TO authenticated, service_role;
