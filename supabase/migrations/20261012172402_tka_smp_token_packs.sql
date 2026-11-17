-- TKA SMP token packs, using the CPNS token ladder approved by the product owner.
-- Keep products, active prices, and wallet grants aligned across environments.
DO $$
DECLARE
  v_program_id uuid;
  v_track_id uuid;
  v_wallet_type text;
  v_product_id uuid;
  v_pack record;
BEGIN
  SELECT
    p.id,
    t.id,
    coalesce(nullif (p.token_wallet_type, ''), 'exam_token_tka')
  INTO
    v_program_id,
    v_track_id,
    v_wallet_type
  FROM
    public.programs p
    JOIN public.tracks t ON t.program_id = p.id
  WHERE
    upper(p.code) = 'TKA'
    AND upper(t.code) = 'SMP'
  LIMIT 1;

  IF v_program_id IS NULL OR v_track_id IS NULL THEN
    RAISE EXCEPTION 'TKA_SMP_CATALOG_NOT_FOUND';
  END IF;

  FOR v_pack IN
  SELECT
    *
  FROM (
    VALUES ('TKA_SMP_TOKEN_1', '1 Token TKA SMP', 1, 10000::numeric),
      ('TKA_SMP_TOKEN_5', '5 Token TKA SMP', 5, 40000::numeric),
      ('TKA_SMP_TOKEN_10', '10 Token TKA SMP', 10, 75000::numeric)) AS packs (code, name, token_count, price)
    LOOP
      INSERT INTO public.products (code, name, description, product_type, program_id, track_id, duration_days, status)
        VALUES (v_pack.code, v_pack.name, 'Token TKA SMP untuk memulai Tryout, Mini Tryout, dan Latihan Fokus.', 'TOKEN_PACK', v_program_id, v_track_id, NULL, 'ACTIVE')
      ON CONFLICT (code)
        DO UPDATE SET
          name = excluded.name,
          description = excluded.description,
          product_type = excluded.product_type,
          program_id = excluded.program_id,
          track_id = excluded.track_id,
          duration_days = excluded.duration_days,
          status = excluded.status,
          updated_at = now()
        RETURNING
          id
        INTO
          v_product_id;

      UPDATE
        public.product_prices
      SET
        status = 'INACTIVE',
        ends_at = coalesce(ends_at, now())
      WHERE
        product_id = v_product_id
        AND upper(status) = 'ACTIVE'
        AND (currency IS DISTINCT FROM 'IDR'
          OR amount IS DISTINCT FROM v_pack.price);

      INSERT INTO public.product_prices (product_id, currency, amount, starts_at, ends_at, status)
      SELECT
        v_product_id,
        'IDR',
        v_pack.price,
        now(),
        NULL,
        'ACTIVE'
      WHERE
        NOT EXISTS (
          SELECT
            1
          FROM
            public.product_prices pp
          WHERE
            pp.product_id = v_product_id
            AND upper(pp.status) = 'ACTIVE'
            AND pp.currency = 'IDR'
            AND pp.amount = v_pack.price
            AND (pp.starts_at IS NULL
              OR pp.starts_at <= now())
            AND (pp.ends_at IS NULL
              OR pp.ends_at > now()));

      INSERT INTO public.product_wallet_grants (product_id, wallet_type, amount, config)
        VALUES (v_product_id, v_wallet_type, v_pack.token_count, '{}'::jsonb)
      ON CONFLICT (product_id, wallet_type)
        DO UPDATE SET
          amount = excluded.amount,
          config = excluded.config;
    END LOOP;
  END
$$;
