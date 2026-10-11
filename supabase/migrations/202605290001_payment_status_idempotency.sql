-- Process Midtrans status updates atomically so quota is granted at most once.
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
    id,
    user_id,
    status
  INTO
    v_transaction
  FROM
    public.transactions
  WHERE
    order_id = p_order_id
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

REVOKE EXECUTE ON FUNCTION public.process_paid_transaction (text, transaction_status, int) FROM public, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.process_paid_transaction (text, transaction_status, int) TO service_role;
