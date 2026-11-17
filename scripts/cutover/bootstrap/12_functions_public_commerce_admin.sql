-- Generated from canonical staging lpgrivowdcepcxradavu via pg_get_functiondef().
-- Large public runtime functions: drill admin, exam token debit, paid-order fulfillment.
-- DO NOT apply to production before explicit final GO.
CREATE OR REPLACE FUNCTION public.admin_upsert_drill_exam_v1 (p_exam_id uuid, p_program_code text, p_track_code text, p_subject_code text, p_knowledge_node_id uuid, p_title text, p_slug text, p_duration_seconds integer, p_attempt_limit integer, p_question_count integer, p_question_order text, p_result_visibility text, p_access_type text, p_status text, p_token_cost integer, p_actor_id uuid)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_program_id uuid;
  v_track_id uuid;
  v_subject_id uuid;
  v_subject_name text;
  v_node_name text;
  v_node_status text;
  v_drill_type_id uuid;
  v_exam_id uuid := p_exam_id;
  v_blueprint_id uuid;
  v_section_id uuid;
  v_current_type_id uuid;
  v_section_count integer;
  v_available_count integer;
  v_materialized_count integer;
BEGIN
  IF p_actor_id IS NULL OR NOT EXISTS (
    SELECT
      1
    FROM
      public.profiles p
    WHERE
      p.id = p_actor_id AND p.status = 'active') THEN
    RAISE EXCEPTION 'DRILL_ACTOR_INVALID';
  END IF;
  IF p_title IS NULL OR btrim(p_title) = '' or p_slug is null or btrim(p_slug)='' THEN
    RAISE EXCEPTION 'EXAM_TITLE_REQUIRED';
  END IF;
  IF p_duration_seconds IS NULL OR p_duration_seconds <= 0 THEN
    RAISE EXCEPTION 'EXAM_DURATION_INVALID';
  END IF;
  IF p_attempt_limit IS NULL OR p_attempt_limit <= 0 THEN
    RAISE EXCEPTION 'EXAM_ATTEMPT_LIMIT_INVALID';
  END IF;
  IF p_question_count IS NULL OR p_question_count <= 0 THEN
    RAISE EXCEPTION 'DRILL_QUESTION_COUNT_INVALID';
  END IF;
  IF p_token_cost IS NULL OR p_token_cost < 0 THEN
    RAISE EXCEPTION 'EXAM_TOKEN_COST_INVALID';
  END IF;

  SELECT
    id
  INTO
    v_program_id
  FROM
    public.programs
  WHERE
    upper(code) = upper(btrim(p_program_code))
  LIMIT 1;
  IF v_program_id IS NULL THEN
    RAISE EXCEPTION 'PROGRAM_NOT_FOUND';
  END IF;
  SELECT
    id
  INTO
    v_track_id
  FROM
    public.tracks
  WHERE
    program_id = v_program_id
    AND upper(code) = upper(btrim(p_track_code))
  LIMIT 1;
  IF v_track_id IS NULL THEN
    RAISE EXCEPTION 'TRACK_NOT_FOUND';
  END IF;
  SELECT
    id,
    name
  INTO
    v_subject_id,
    v_subject_name
  FROM
    public.subjects
  WHERE
    track_id = v_track_id
    AND upper(code) = upper(btrim(p_subject_code))
  LIMIT 1;
  IF v_subject_id IS NULL THEN
    RAISE EXCEPTION 'SUBJECT_INVALID';
  END IF;
  SELECT
    name,
    status
  INTO
    v_node_name,
    v_node_status
  FROM
    public.knowledge_nodes
  WHERE
    id = p_knowledge_node_id
    AND subject_id = v_subject_id;
  IF v_node_name IS NULL THEN
    RAISE EXCEPTION 'DRILL_KNOWLEDGE_NODE_INVALID';
  END IF;
  IF lower(coalesce(v_node_status, '')) <> 'active' THEN
    RAISE EXCEPTION 'DRILL_KNOWLEDGE_NODE_INACTIVE';
  END IF;
  SELECT
    id
  INTO
    v_drill_type_id
  FROM
    public.exam_types
  WHERE
    upper(code) = 'DRILL'
  LIMIT 1;
  IF v_drill_type_id IS NULL THEN
    RAISE EXCEPTION 'EXAM_TYPE_INVALID';
  END IF;

  PERFORM
    pg_advisory_xact_lock(hashtextextended(coalesce(v_exam_id::text, btrim(p_slug)), 0));

  IF v_exam_id IS NOT NULL THEN
    SELECT
      e.exam_type_id,
      e.blueprint_id
    INTO
      v_current_type_id,
      v_blueprint_id
    FROM
      public.exams e
    WHERE
      e.id = v_exam_id
      AND e.program_id = v_program_id
      AND e.track_id = v_track_id
    FOR UPDATE;
    IF NOT found THEN
      RAISE EXCEPTION 'EXAM_NOT_FOUND';
    END IF;
    IF v_current_type_id <> v_drill_type_id THEN
      RAISE EXCEPTION 'DRILL_TYPE_IMMUTABLE';
    END IF;
    IF EXISTS (
      SELECT
        1
      FROM
        public.exam_attempts ea
      WHERE
        ea.exam_id = v_exam_id
        AND ea.status = 'in_progress') THEN
    RAISE EXCEPTION 'DRILL_ACTIVE_ATTEMPT_LOCKED';
  END IF;
END IF;

  SELECT
    count(DISTINCT q.id)::integer
  INTO
    v_available_count
  FROM
    public.questions q
    JOIN public.question_knowledge_nodes qkn ON qkn.question_id = q.id
      AND qkn.relation_type = 'primary'
    JOIN public.knowledge_node_paths knp ON knp.descendant_id = qkn.knowledge_node_id
    JOIN public.question_versions qv ON qv.question_id = q.id
      AND qv.version = q.version
  WHERE
    q.program_id = v_program_id
    AND q.track_id = v_track_id
    AND q.subject_id = v_subject_id
    AND q.status IN ('approved', 'published')
    AND knp.ancestor_id = p_knowledge_node_id;

  IF v_available_count < p_question_count THEN
    RAISE EXCEPTION 'DRILL_QUESTION_POOL_INSUFFICIENT:%/%', v_available_count, p_question_count;
  END IF;

  IF v_blueprint_id IS NULL THEN
    INSERT INTO public.exam_blueprints (name, program_id, track_id, period_id, description, status, created_at, updated_at)
      VALUES ('Drill · ' || v_subject_name || ' · ' || v_node_name, v_program_id, v_track_id, NULL, 'Auto-managed blueprint untuk Drill submateri.', 'active', now(), now())
    RETURNING
      id
    INTO
      v_blueprint_id;
  ELSE
    UPDATE
      public.exam_blueprints
    SET
      name = 'Drill · ' || v_subject_name || ' · ' || v_node_name,
      description = 'Auto-managed blueprint untuk Drill submateri.',
      status = 'active',
      updated_at = now()
    WHERE
      id = v_blueprint_id;
  END IF;

  IF v_exam_id IS NULL THEN
    INSERT INTO public.exams (program_id, track_id, exam_type_id, blueprint_id, title, slug, duration_seconds, attempt_limit, question_order, result_visibility, access_type, status, created_by, token_cost, created_at, updated_at)
      VALUES (v_program_id, v_track_id, v_drill_type_id, v_blueprint_id, btrim(p_title), btrim(p_slug), p_duration_seconds, p_attempt_limit, coalesce(nullif (btrim(p_question_order), ''),'random'),coalesce(nullif(btrim(p_result_visibility),''), 'instant'), coalesce(nullif (btrim(p_access_type), ''),'FREE'),coalesce(nullif(btrim(p_status),''), 'draft'), p_actor_id, p_token_cost, now(), now())
    RETURNING
      id
    INTO
      v_exam_id;
  ELSE
    UPDATE
      public.exams
    SET
      blueprint_id = v_blueprint_id,
      title = btrim(p_title),
      slug = btrim(p_slug),
      duration_seconds = p_duration_seconds,
      attempt_limit = p_attempt_limit,
      question_order = coalesce(nullif (btrim(p_question_order), ''), 'random'),
      result_visibility = coalesce(nullif (btrim(p_result_visibility), ''), 'instant'),
      access_type = coalesce(nullif (btrim(p_access_type), ''), 'FREE'),
      status = coalesce(nullif (btrim(p_status), ''), 'draft'),
      token_cost = p_token_cost,
      updated_at = now()
    WHERE
      id = v_exam_id;
  END IF;

  DELETE FROM public.exam_blueprint_rules
  WHERE blueprint_id = v_blueprint_id;
  INSERT INTO public.exam_blueprint_rules (blueprint_id, subject_id, knowledge_node_id, difficulty, question_count, weight, sort_order)
    VALUES (v_blueprint_id, v_subject_id, p_knowledge_node_id, NULL, p_question_count, 1, 1);

  SELECT
    count(*)::integer
  INTO
    v_section_count
  FROM
    public.exam_sections
  WHERE
    exam_id = v_exam_id;
  SELECT
    id
  INTO
    v_section_id
  FROM
    public.exam_sections
  WHERE
    exam_id = v_exam_id
  ORDER BY
    sort_order,
    id
  LIMIT 1;
  IF v_section_count > 1 THEN
    RAISE EXCEPTION 'DRILL_SECTION_CONFLICT';
  END IF;
  IF v_section_id IS NULL THEN
    INSERT INTO public.exam_sections (exam_id, subject_id, title, sort_order, question_count, duration_seconds, config)
      VALUES (v_exam_id, v_subject_id, v_node_name, 1, p_question_count, p_duration_seconds, jsonb_build_object('mode', 'drill', 'knowledge_node_id', p_knowledge_node_id))
    RETURNING
      id
    INTO
      v_section_id;
  ELSE
    UPDATE
      public.exam_sections
    SET
      subject_id = v_subject_id,
      title = v_node_name,
      sort_order = 1,
      question_count = p_question_count,
      duration_seconds = p_duration_seconds,
      config = jsonb_build_object('mode', 'drill', 'knowledge_node_id', p_knowledge_node_id)
    WHERE
      id = v_section_id;
  END IF;

  DELETE FROM public.exam_question_items
  WHERE exam_id = v_exam_id;
  WITH eligible AS (
    SELECT DISTINCT
      q.id,
      q.version,
      q.question_code
    FROM
      public.questions q
      JOIN public.question_knowledge_nodes qkn ON qkn.question_id = q.id
        AND qkn.relation_type = 'primary'
      JOIN public.knowledge_node_paths knp ON knp.descendant_id = qkn.knowledge_node_id
      JOIN public.question_versions qv ON qv.question_id = q.id
        AND qv.version = q.version
    WHERE
      q.program_id = v_program_id
      AND q.track_id = v_track_id
      AND q.subject_id = v_subject_id
      AND q.status IN ('approved', 'published')
      AND knp.ancestor_id = p_knowledge_node_id
),
chosen AS (
  SELECT
    *,
    row_number() OVER (ORDER BY md5(v_exam_id::text || ':' || id::text)) AS pos
FROM
  eligible
ORDER BY
  md5(v_exam_id::text || ':' || id::text)
LIMIT p_question_count)
INSERT INTO public.exam_question_items (exam_id, section_id, question_id, question_version, position, score_weight)
SELECT
  v_exam_id,
  v_section_id,
  id,
  version,
  pos,
  1
FROM
  chosen;
  get diagnostics v_materialized_count = row_count;

  IF v_materialized_count <> p_question_count THEN
    RAISE EXCEPTION 'DRILL_MATERIALIZATION_MISMATCH:%/%', v_materialized_count, p_question_count;
  END IF;

  RETURN jsonb_build_object('exam_id', v_exam_id, 'blueprint_id', v_blueprint_id, 'section_id', v_section_id, 'subject_id', v_subject_id, 'knowledge_node_id', p_knowledge_node_id, 'available_question_count', v_available_count, 'question_count', v_materialized_count);
END;
$function$ CREATE OR REPLACE FUNCTION public.debit_exam_token_once (p_user_id uuid, p_attempt_id uuid)
  RETURNS TABLE (
    debited boolean,
    balance_after integer,
    amount integer)
  LANGUAGE plpgsql
  SET search_path TO 'public'
  AS $function$
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
$function$ CREATE OR REPLACE FUNCTION public.fulfill_paid_order (p_order_id uuid, p_provider text, p_status text, p_provider_transaction_id text, p_payment_method text, p_amount numeric, p_raw_response jsonb)
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
$function$
