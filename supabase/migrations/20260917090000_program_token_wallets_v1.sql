-- Program-scoped token wallets (CPNS vs TKA) pada satu akun.
--
-- Keputusan produk (2026-09-17): saldo token dipisah per program supaya pembukuan jelas dan
-- token CPNS tidak bisa dipakai untuk TKA. Satu akun tetap punya keduanya.
--
-- Yang dilakukan migrasi ini:
--   1. `programs.token_wallet_type` sebagai sumber pemetaan program → tipe wallet.
--   2. Pindahkan saldo lama bertipe 'exam_token' ke wallet program (CPNS, satu-satunya konsumen
--      token sebelum migrasi) — baris lama dipertahankan bernilai 0 agar riwayat transaksi utuh.
--   3. `debit_exam_token_once` menjadi program-aware (tipe wallet diturunkan dari program exam).
--      Signature & seluruh semantik lama dipertahankan: idempotensi per attempt, kuota 0 token,
--      dan pesan error WALLET_NOT_FOUND / INSUFFICIENT_TOKEN_BALANCE / ATTEMPT_NOT_CHARGEABLE.
-- 1. Pemetaan program → tipe wallet token
ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS token_wallet_type text;

UPDATE
  public.programs
SET
  token_wallet_type = 'exam_token_cpns'
WHERE
  code = 'CPNS'
  AND token_wallet_type IS DISTINCT FROM 'exam_token_cpns';

UPDATE
  public.programs
SET
  token_wallet_type = 'exam_token_tka'
WHERE
  code = 'TKA'
  AND token_wallet_type IS DISTINCT FROM 'exam_token_tka';

COMMENT ON COLUMN public.programs.token_wallet_type IS 'Tipe wallet token untuk program ini (mis. exam_token_cpns / exam_token_tka).';

-- 2. Migrasi saldo lama 'exam_token' → wallet program CPNS
INSERT INTO public.wallets (user_id, wallet_type, balance, updated_at)
SELECT
  w.user_id,
  'exam_token_cpns',
  w.balance,
  now()
FROM
  public.wallets w
WHERE
  w.wallet_type = 'exam_token'
ON CONFLICT (user_id,
  wallet_type)
  DO UPDATE SET
    balance = public.wallets.balance + excluded.balance,
    updated_at = now();

UPDATE
  public.wallets
SET
  balance = 0,
  updated_at = now()
WHERE
  wallet_type = 'exam_token';

-- Indeks untuk pemeriksaan idempotensi debit per attempt.
CREATE INDEX IF NOT EXISTS wallet_transactions_attempt_debit_idx ON public.wallet_transactions (wallet_id, source_id)
WHERE
  source_type = 'exam_attempt' AND type = 'debit';

-- 3. RPC debit program-aware
CREATE OR REPLACE FUNCTION public.debit_exam_token_once (p_user_id uuid, p_attempt_id uuid)
  RETURNS TABLE (
    debited boolean,
    balance_after integer,
    amount integer)
  LANGUAGE plpgsql
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_wallet_type text;
  v_wallet_id uuid;
  v_balance integer;
  v_token_cost integer;
  v_existing_balance integer;
BEGIN
  SELECT
    e.token_cost,
    coalesce(nullif (pr.token_wallet_type, ''), 'exam_token_cpns')
  INTO
    v_token_cost,
    v_wallet_type
  FROM
    public.exam_attempts a
    JOIN public.exams e ON e.id = a.exam_id
    LEFT JOIN public.programs pr ON pr.id = e.program_id
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
    AND w.wallet_type = v_wallet_type
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
$function$;
