-- Schema V2 wallet support.
-- One debit ledger entry per exam attempt; charge is allowed once access has
-- been granted (created/in_progress) and remains safe to retry on completion.
CREATE UNIQUE INDEX IF NOT EXISTS wallet_transactions_exam_attempt_debit_uq ON public.wallet_transactions (wallet_id, source_type, source_id, type)
WHERE
  source_id IS NOT NULL AND source_type = 'exam_attempt' AND type = 'debit';

CREATE OR REPLACE FUNCTION public.debit_exam_token_once (p_user_id uuid, p_attempt_id uuid)
  RETURNS TABLE (
    debited boolean,
    balance_after integer,
    amount integer)
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path = public
  AS $$
DECLARE
  v_wallet_id uuid;
  v_balance integer;
  v_token_cost integer;
  v_existing_balance integer;
BEGIN
  SELECT
    e.token_cost
  INTO
    v_token_cost
  FROM
    public.exam_attempts a
    JOIN public.exams e ON e.id = a.exam_id
  WHERE
    a.id = p_attempt_id
    AND a.user_id = p_user_id
    AND lower(a.status) IN ('created', 'in_progress', 'completed');

  IF NOT found THEN
    RAISE EXCEPTION 'ATTEMPT_NOT_CHARGEABLE'
      USING errcode = 'P0001';
  END IF;

  v_token_cost := coalesce(v_token_cost, 0);

  SELECT
    w.id,
    w.balance
  INTO
    v_wallet_id,
    v_balance
  FROM
    public.wallets w
  WHERE
    w.user_id = p_user_id
    AND w.wallet_type = 'exam_token'
  FOR UPDATE;

  IF NOT found THEN
    IF v_token_cost = 0 THEN
      RETURN QUERY
      SELECT
        FALSE,
        0,
        0;
      RETURN;
    END IF;

    RAISE EXCEPTION 'WALLET_NOT_FOUND'
      USING errcode = 'P0001';
  END IF;

  SELECT
    wt.balance_after
  INTO
    v_existing_balance
  FROM
    public.wallet_transactions wt
  WHERE
    wt.wallet_id = v_wallet_id
    AND wt.source_type = 'exam_attempt'
    AND wt.source_id = p_attempt_id
    AND wt.type = 'debit'
  LIMIT 1;

  IF found THEN
    RETURN QUERY
    SELECT
      FALSE,
      v_existing_balance,
      v_token_cost;
    RETURN;
  END IF;

  IF v_token_cost = 0 THEN
    RETURN QUERY
    SELECT
      FALSE,
      v_balance,
      0;
    RETURN;
  END IF;

  IF v_balance < v_token_cost THEN
    RAISE EXCEPTION 'INSUFFICIENT_TOKEN_BALANCE'
      USING errcode = 'P0001';
  END IF;

  v_balance := v_balance - v_token_cost;

  UPDATE
    public.wallets
  SET
    balance = v_balance,
    updated_at = now()
  WHERE
    id = v_wallet_id;

  INSERT INTO public.wallet_transactions (wallet_id, type, amount, source_type, source_id, balance_after)
    VALUES (v_wallet_id, 'debit', - v_token_cost, 'exam_attempt', p_attempt_id, v_balance);

  RETURN QUERY
  SELECT
    TRUE,
    v_balance,
    v_token_cost;
END;
$$;

REVOKE ALL ON FUNCTION public.debit_exam_token_once (uuid, uuid) FROM public;

REVOKE ALL ON FUNCTION public.debit_exam_token_once (uuid, uuid) FROM anon;

REVOKE ALL ON FUNCTION public.debit_exam_token_once (uuid, uuid) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.debit_exam_token_once (uuid, uuid) TO service_role;
