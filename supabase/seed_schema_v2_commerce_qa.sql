DO $$
DECLARE
  v_product_id uuid;
BEGIN
  IF EXISTS (
    SELECT
      1
    FROM
      information_schema.tables
    WHERE
      table_schema = 'public'
      AND table_name = 'transactions') THEN
  RAISE EXCEPTION 'Refusing Schema V2 commerce QA seed on legacy/production-shaped database';
END IF;

  UPDATE
    public.products
  SET
    status = 'active',
    updated_at = now()
  WHERE
    code IN ('CPNS_TOKEN_1', 'CPNS_TOKEN_5', 'CPNS_TOKEN_10');

  FOR v_product_id IN
  SELECT
    id
  FROM
    public.products
  WHERE
    code IN ('CPNS_TOKEN_1', 'CPNS_TOKEN_5', 'CPNS_TOKEN_10')
    LOOP
      DELETE FROM public.product_prices
      WHERE product_id = v_product_id
        AND lower(status) = 'active';
    END LOOP;

  INSERT INTO public.product_prices (product_id, currency, amount, starts_at, ends_at, status)
  SELECT
    id,
    'IDR',
    CASE code
    WHEN 'CPNS_TOKEN_1' THEN
      10000
    WHEN 'CPNS_TOKEN_5' THEN
      40000
    WHEN 'CPNS_TOKEN_10' THEN
      75000
    END,
    now() - interval '1 minute',
    NULL,
    'active'
  FROM
    public.products
  WHERE
    code IN ('CPNS_TOKEN_1', 'CPNS_TOKEN_5', 'CPNS_TOKEN_10');

  INSERT INTO public.product_wallet_grants (product_id, wallet_type, amount, config)
  SELECT
    id,
    'exam_token',
    CASE code
    WHEN 'CPNS_TOKEN_1' THEN
      1
    WHEN 'CPNS_TOKEN_5' THEN
      5
    WHEN 'CPNS_TOKEN_10' THEN
      10
    END,
    '{}'::jsonb
  FROM
    public.products
  WHERE
    code IN ('CPNS_TOKEN_1', 'CPNS_TOKEN_5', 'CPNS_TOKEN_10')
  ON CONFLICT (product_id,
    wallet_type)
    DO UPDATE SET
      amount = excluded.amount,
      config = excluded.config;
END
$$;
