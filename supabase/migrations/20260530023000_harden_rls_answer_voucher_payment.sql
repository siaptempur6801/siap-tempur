-- Harden direct client access to answer keys, vouchers, and payment writes.
ALTER TYPE public.user_role
  ADD value IF NOT EXISTS 'superadmin';

CREATE OR REPLACE FUNCTION public.is_admin ()
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
BEGIN
  RETURN EXISTS (
    SELECT
      1
    FROM
      public.profiles
    WHERE
      id = auth.uid ()
      AND ROLE::text IN ('admin', 'superadmin'));
END;
$$;

-- Keep sensitive answer columns unavailable through PostgREST.
REVOKE ALL privileges ON public.questions FROM anon, authenticated;

REVOKE SELECT ON public.questions FROM anon, authenticated;

GRANT SELECT (id, question_code, content, type, category, sub_category, image_url, created_at) ON public.questions TO authenticated;

REVOKE ALL privileges ON public.options FROM anon, authenticated;

REVOKE SELECT ON public.options FROM anon, authenticated;

GRANT SELECT (id, question_id, content, image_url, created_at) ON public.options TO authenticated;

DROP POLICY IF EXISTS "Everyone can view questions" ON public.questions;

DROP POLICY IF EXISTS "Users can view session questions" ON public.questions;

CREATE POLICY "Users can view session questions" ON public.questions
  FOR SELECT TO authenticated
  USING (public.is_admin ()
    OR EXISTS (
      SELECT
        1
      FROM
        public.test_answers ta
        JOIN public.test_sessions ts ON ts.id = ta.session_id
      WHERE
        ta.question_id = questions.id
        AND ts.user_id = auth.uid ()));

DROP POLICY IF EXISTS "Everyone can view options" ON public.options;

DROP POLICY IF EXISTS "Users can view session options" ON public.options;

CREATE POLICY "Users can view session options" ON public.options
  FOR SELECT TO authenticated
  USING (public.is_admin ()
    OR EXISTS (
      SELECT
        1
      FROM
        public.test_answers ta
        JOIN public.test_sessions ts ON ts.id = ta.session_id
      WHERE
        ta.question_id = options.question_id
        AND ts.user_id = auth.uid ()));

-- Voucher codes are validated via claim_voucher(); users should not list all active codes.
DROP POLICY IF EXISTS "Authenticated users can read vouchers" ON public.vouchers;

DROP POLICY IF EXISTS "Admins can read vouchers" ON public.vouchers;

REVOKE ALL privileges ON public.vouchers FROM anon, authenticated;

REVOKE SELECT ON public.vouchers FROM anon, authenticated;

CREATE POLICY "Admins can read vouchers" ON public.vouchers
  FOR SELECT TO authenticated
  USING (public.is_admin ());

-- Client-created payment rows are no longer needed. Server actions use service role.
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;

REVOKE ALL privileges ON public.transactions FROM anon, authenticated;

GRANT SELECT ON public.transactions TO authenticated;

REVOKE INSERT ON public.transactions FROM anon, authenticated;

-- Align tryout configuration write policies with the shared admin helper.
DROP POLICY IF EXISTS "Admins can delete tryout configurations" ON public.tryout_configurations;

DROP POLICY IF EXISTS "Admins can insert tryout configurations" ON public.tryout_configurations;

DROP POLICY IF EXISTS "Admins can update tryout configurations" ON public.tryout_configurations;

CREATE POLICY "Admins can delete tryout configurations" ON public.tryout_configurations
  FOR DELETE TO authenticated
  USING (public.is_admin ());

CREATE POLICY "Admins can insert tryout configurations" ON public.tryout_configurations
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin ());

CREATE POLICY "Admins can update tryout configurations" ON public.tryout_configurations
  FOR UPDATE TO authenticated
  USING (public.is_admin ())
  WITH CHECK (public.is_admin ());

CREATE OR REPLACE FUNCTION public.process_paid_transaction (p_order_id text, p_transaction_status transaction_status, p_increment_by int DEFAULT 0)
  RETURNS TABLE (
    status transaction_status,
    quota_granted boolean)
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  v_transaction record;
  v_success_statuses transaction_status[] := ARRAY['capture'::transaction_status, 'settlement'::transaction_status];
  v_is_success boolean;
  v_already_success boolean;
  v_next_status transaction_status;
BEGIN
  IF coalesce(auth.role (), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_order_id IS NULL OR btrim(p_order_id) = '' OR p_transaction_status IS NULL THEN
    RAISE EXCEPTION 'Invalid transaction status update';
  END IF;

  SELECT
    t.id,
    t.user_id,
    t.status
  INTO
    v_transaction
  FROM
    public.transactions t
  WHERE
    t.order_id = p_order_id
  FOR UPDATE;

  IF NOT found THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;

  v_is_success := p_transaction_status = ANY (v_success_statuses);
  v_already_success := v_transaction.status = ANY (v_success_statuses);
  v_next_status := p_transaction_status;
  quota_granted := FALSE;

  IF v_is_success THEN
    IF v_already_success THEN
      IF v_transaction.status = 'settlement'::transaction_status THEN
        v_next_status := v_transaction.status;
      ELSIF p_transaction_status = 'settlement'::transaction_status THEN
        v_next_status := 'settlement'::transaction_status;
      ELSE
        v_next_status := v_transaction.status;
      END IF;
    ELSIF coalesce(p_increment_by, 0) > 0 THEN
      UPDATE
        public.profiles
      SET
        tryout_quota = coalesce(tryout_quota, 0) + p_increment_by
      WHERE
        id = v_transaction.user_id;

      IF NOT found THEN
        RAISE EXCEPTION 'Profile not found';
      END IF;

      quota_granted := TRUE;
    END IF;
  ELSIF v_already_success THEN
    v_next_status := v_transaction.status;
  END IF;

  UPDATE
    public.transactions
  SET
    status = v_next_status,
    updated_at = now()
  WHERE
    id = v_transaction.id;

  status := v_next_status;
  RETURN NEXT;
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
    AND coalesce(tryout_quota, 0) > 0;

  IF NOT found THEN
    RAISE EXCEPTION 'Not enough SKD tickets';
  END IF;

  INSERT INTO public.test_sessions (user_id, mode, status, start_time, last_activity_at)
    VALUES (p_user_id, 'tryout', 'in_progress', now(), now())
  RETURNING
    id
  INTO
    v_session_id;

  WITH selected_questions AS (
    SELECT
      q.id,
      tc.sort_order
    FROM
      public.tryout_configurations tc
    CROSS JOIN LATERAL (
      SELECT
        q_inner.id
      FROM
        public.questions q_inner
      WHERE
        q_inner.type = tc.type::question_type
        AND q_inner.sub_category = tc.sub_category
      ORDER BY
        random()
      LIMIT tc.question_count) q
  WHERE
    tc.is_active = TRUE
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
      o.question_id = q.id))
ORDER BY sq.sort_order, random())
INTO
  v_questions
FROM
  selected_questions sq
  JOIN inserted_answers ia ON ia.question_id = sq.id
  JOIN public.questions q ON q.id = sq.id;

  RETURN QUERY
  SELECT
    v_session_id,
    v_questions;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_live_event_leaderboard (p_event_id uuid)
  RETURNS TABLE (
    user_id uuid,
    full_name text,
    avatar_url text,
    progress_count bigint,
    live_rank bigint)
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
BEGIN
  IF NOT public.is_admin () THEN
    RAISE EXCEPTION 'Access denied. Only admins can view the live leaderboard.';
  END IF;

  RETURN QUERY WITH session_scores AS (
    SELECT
      tes.user_id,
      tes.started_at,
      count(a.option_id) AS answered_count,
      coalesce(sum(
          CASE WHEN q.type IN ('TWK', 'TIU')
            AND o.is_correct THEN
            5
          WHEN q.type = 'TKP' THEN
            coalesce(o.score_value, 0)
          ELSE
            0
          END), 0) AS total_score
    FROM
      public.tryout_event_sessions tes
    LEFT JOIN public.test_answers a ON a.session_id = tes.session_id
    LEFT JOIN public.questions q ON q.id = a.question_id
    LEFT JOIN public.options o ON o.id = a.option_id
  WHERE
    tes.event_id = p_event_id
  GROUP BY
    tes.user_id,
    tes.started_at
)
SELECT
  ss.user_id,
  p.full_name,
  p.avatar_url,
  ss.answered_count,
  rank() OVER (ORDER BY ss.total_score DESC, ss.started_at ASC) AS live_rank
FROM
  session_scores ss
  JOIN public.profiles p ON p.id = ss.user_id
ORDER BY
  live_rank ASC
LIMIT 50;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.process_paid_transaction (text, transaction_status, int) FROM public, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.process_paid_transaction (text, transaction_status, int) TO service_role;
