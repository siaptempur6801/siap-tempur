CREATE OR REPLACE FUNCTION public.fulfill_paid_order (p_order_id uuid, p_provider text, p_status text, p_provider_transaction_id text, p_payment_method text, p_amount numeric, p_raw_response jsonb)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_order public.orders%rowtype;
  v_item record;
  v_grant record;
  v_feature record;
  v_event_product record;
  v_wallet_id uuid;
  v_balance integer;
  v_credit integer;
  v_paid_at timestamptz;
  v_entitlement_starts_at timestamptz;
  v_latest_entitlement_expiry timestamptz;
  v_registration_number text;
  v_success boolean := lower(p_status) IN ('capture', 'settlement');
BEGIN
  SELECT
    *
  INTO
    v_order
  FROM
    public.orders
  WHERE
    id = p_order_id
  FOR UPDATE;

  IF NOT found THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND';
  END IF;

  IF p_amount IS NULL OR p_amount <> v_order.total_amount THEN
    RAISE EXCEPTION 'PAYMENT_AMOUNT_MISMATCH';
  END IF;

  INSERT INTO public.payments (order_id, provider, provider_transaction_id, payment_method, amount, status, paid_at, raw_response, created_at, updated_at)
    VALUES (v_order.id, lower(p_provider), nullif (p_provider_transaction_id, ''), nullif (p_payment_method, ''), p_amount, lower(p_status), CASE WHEN v_success THEN
        coalesce(v_order.paid_at, now())
      ELSE
        NULL
      END, coalesce(p_raw_response, '{}'::jsonb), now(), now())
  ON CONFLICT (order_id, provider)
    DO UPDATE SET
      provider_transaction_id = coalesce(excluded.provider_transaction_id, public.payments.provider_transaction_id),
      payment_method = coalesce(excluded.payment_method, public.payments.payment_method),
      amount = excluded.amount,
      status = CASE WHEN lower(public.payments.status) IN ('capture', 'settlement') THEN
        public.payments.status
      ELSE
        excluded.status
      END,
      paid_at = CASE WHEN lower(public.payments.status) IN ('capture', 'settlement') THEN
        public.payments.paid_at
      WHEN excluded.status IN ('capture', 'settlement') THEN
        coalesce(public.payments.paid_at, excluded.paid_at, now())
      ELSE
        public.payments.paid_at
      END,
      raw_response = coalesce(public.payments.raw_response, '{}'::jsonb) || coalesce(excluded.raw_response, '{}'::jsonb),
      updated_at = now();

  IF NOT v_success THEN
    IF lower(v_order.status) <> 'paid' THEN
      UPDATE
        public.orders
      SET
        status = CASE lower(p_status)
        WHEN 'pending' THEN
          'pending'
        WHEN 'expire' THEN
          'expired'
        WHEN 'cancel' THEN
          'cancelled'
        WHEN 'deny' THEN
          'failed'
        ELSE
          lower(p_status)
        END
      WHERE
        id = v_order.id;
    END IF;
    RETURN;
  END IF;

  v_paid_at := coalesce(v_order.paid_at, now());
  UPDATE
    public.orders
  SET
    status = 'paid',
    paid_at = v_paid_at
  WHERE
    id = v_order.id;
  -- Serialize successful fulfillment per learner so concurrent pass renewals
  -- cannot both extend from the same previous expiry.
  PERFORM
    pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('commerce-fulfillment-user:' || v_order.user_id::text, 0));

  FOR v_item IN
  SELECT
    oi.*,
    p.duration_days,
    p.product_type
  FROM
    public.order_items oi
    JOIN public.products p ON p.id = oi.product_id
  WHERE
    oi.order_id = v_order.id
  ORDER BY
    oi.id LOOP
      FOR v_grant IN
      SELECT
        wallet_type,
        amount
      FROM
        public.product_wallet_grants
      WHERE
        product_id = v_item.product_id LOOP
          INSERT INTO public.wallets (user_id, wallet_type, balance, updated_at)
            VALUES (v_order.user_id, v_grant.wallet_type, 0, now())
          ON CONFLICT (user_id, wallet_type)
            DO NOTHING;

          SELECT
            id,
            balance
          INTO
            v_wallet_id,
            v_balance
          FROM
            public.wallets
          WHERE
            user_id = v_order.user_id
            AND wallet_type = v_grant.wallet_type
          FOR UPDATE;

          IF NOT EXISTS (
            SELECT
              1
            FROM
              public.wallet_transactions wt
            WHERE
              wt.wallet_id = v_wallet_id
              AND wt.source_type = 'order_item'
              AND wt.source_id = v_item.id
              AND wt.type = 'credit') THEN
          v_credit := v_grant.amount * v_item.quantity;
          UPDATE
            public.wallets
          SET
            balance = balance + v_credit,
            updated_at = now()
          WHERE
            id = v_wallet_id
          RETURNING
            balance
          INTO
            v_balance;

          INSERT INTO public.wallet_transactions (wallet_id, type, amount, source_type, source_id, balance_after, created_at)
            VALUES (v_wallet_id, 'credit', v_credit, 'order_item', v_item.id, v_balance, now());
        END IF;
    END LOOP;

  FOR v_feature IN
  SELECT
    pf.feature_id,
    pf.limit_value
  FROM
    public.product_features pf
  WHERE
    pf.product_id = v_item.product_id LOOP
      v_entitlement_starts_at := v_paid_at;

      IF lower(coalesce(v_item.product_type, '')) = 'pass' AND v_item.duration_days IS NOT NULL THEN
        SELECT
          max(en.expires_at)
        INTO
          v_latest_entitlement_expiry
        FROM
          public.entitlements en
        WHERE
          en.user_id = v_order.user_id
          AND en.feature_id = v_feature.feature_id
          AND lower(en.status) = 'active'
          AND en.expires_at IS NOT NULL
          AND en.expires_at > v_paid_at
          AND NOT (en.source_type = 'order_item'
            AND en.source_id = v_item.id);

        v_entitlement_starts_at := greatest (v_paid_at, coalesce(v_latest_entitlement_expiry, v_paid_at));
      END IF;

      INSERT INTO public.entitlements (user_id, feature_id, source_type, source_id, starts_at, expires_at, usage_limit, usage_count, status, created_at)
        VALUES (v_order.user_id, v_feature.feature_id, 'order_item', v_item.id, v_entitlement_starts_at, CASE WHEN v_item.duration_days IS NULL THEN
            NULL
          ELSE
            v_entitlement_starts_at + make_interval(days => v_item.duration_days)
          END, v_feature.limit_value, 0, 'active', now())
      ON CONFLICT (user_id, feature_id, source_type, source_id)
    WHERE
      source_id IS NOT NULL
      AND source_type = 'order_item'
        DO NOTHING;
    END LOOP;

  SELECT
    ep.product_id,
    ep.event_id,
    ep.session_id,
    e.code
  INTO
    v_event_product
  FROM
    public.event_products ep
    JOIN public.events e ON e.id = ep.event_id
  WHERE
    ep.product_id = v_item.product_id
    AND lower(ep.status) = 'active'
  LIMIT 1;

  IF found THEN
    IF v_event_product.session_id IS NULL THEN
      RAISE EXCEPTION 'EVENT_PRODUCT_SESSION_REQUIRED';
    END IF;

    v_registration_number := 'EVT-' || v_event_product.code || '-' || upper(substr(md5(v_item.id::text), 1, 8));

    INSERT INTO public.event_registrations (event_id, session_id, user_id, order_id, registration_number, status, created_at)
      VALUES (v_event_product.event_id, v_event_product.session_id, v_order.user_id, v_order.id, v_registration_number, 'registered', now())
    ON CONFLICT (event_id, user_id)
      DO UPDATE SET
        session_id = coalesce(public.event_registrations.session_id, excluded.session_id),
        order_id = coalesce(public.event_registrations.order_id, excluded.order_id),
        status = CASE WHEN lower(public.event_registrations.status) IN ('started', 'completed') THEN
          public.event_registrations.status
        ELSE
          'registered'
        END;
  END IF;
END LOOP;
END;
$function$;

REVOKE ALL ON FUNCTION public.fulfill_paid_order (uuid, text, text, text, text, numeric, jsonb) FROM public, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.fulfill_paid_order (uuid, text, text, text, text, numeric, jsonb) TO service_role;
