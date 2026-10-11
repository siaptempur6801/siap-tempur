WITH target (
  code,
  amount
) AS (
  VALUES ('TKA_SMP_PASS_30'::text, 29000::numeric),
    ('TKA_SMP_PASS_90'::text, 69000::numeric)
),
scoped AS (
  SELECT
    p.id, p.code, t.amount
  FROM
    public.products p
    JOIN target t ON t.code = p.code
    JOIN public.programs pr ON pr.id = p.program_id
      AND pr.code = 'TKA'
    JOIN public.tracks tr ON tr.id = p.track_id
      AND tr.program_id = pr.id
      AND tr.code = 'SMP')
  UPDATE
    public.products p
  SET
    status = 'ACTIVE',
    updated_at = now()
  FROM
    scoped s
WHERE
  p.id = s.id;

WITH target (
  code,
  amount
) AS (
  VALUES ('TKA_SMP_PASS_30'::text, 29000::numeric),
    ('TKA_SMP_PASS_90'::text, 69000::numeric)
),
scoped AS (
  SELECT
    p.id, p.code, t.amount
  FROM
    public.products p
    JOIN target t ON t.code = p.code
    JOIN public.programs pr ON pr.id = p.program_id
      AND pr.code = 'TKA'
    JOIN public.tracks tr ON tr.id = p.track_id
      AND tr.program_id = pr.id
      AND tr.code = 'SMP')
  UPDATE
    public.product_prices pp
  SET
    amount = s.amount,
    currency = 'IDR',
    status = 'ACTIVE'
  FROM
    scoped s
WHERE
  pp.product_id = s.id
  AND lower(pp.status) = 'active'
  AND pp.ends_at IS NULL;

WITH target (
  code,
  amount
) AS (
  VALUES ('TKA_SMP_PASS_30'::text, 29000::numeric),
    ('TKA_SMP_PASS_90'::text, 69000::numeric)
),
scoped AS (
  SELECT
    p.id, p.code, t.amount
  FROM
    public.products p
    JOIN target t ON t.code = p.code
    JOIN public.programs pr ON pr.id = p.program_id
      AND pr.code = 'TKA'
    JOIN public.tracks tr ON tr.id = p.track_id
      AND tr.program_id = pr.id
      AND tr.code = 'SMP')
  INSERT INTO public.product_prices (product_id, currency, amount, starts_at, ends_at, status)
  SELECT
    s.id,
    'IDR',
    s.amount,
    now(),
    NULL,
    'ACTIVE'
  FROM
    scoped s
WHERE
  NOT EXISTS (
    SELECT
      1
    FROM
      public.product_prices pp
    WHERE
      pp.product_id = s.id
      AND lower(pp.status) = 'active'
      AND pp.ends_at IS NULL);
