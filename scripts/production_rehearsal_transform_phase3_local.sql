\set ON_ERROR_STOP on

-- Production-clone rehearsal Phase 3 (LOCAL ONLY via guarded runner):
-- legacy transactions/event payments -> canonical historical orders/payments/items
-- legacy tryout events/participants -> canonical events/sessions/registrations
-- IMPORTANT: historical settlements are NOT replayed into wallet/entitlements. Current token
-- state was reconciled in Phase 1; replaying settlements would double-grant access.

BEGIN;

DO $$
DECLARE
  v_tx bigint;
  v_event_pay bigint;
  v_participants bigint;
  v_events bigint;
  v_phase1_wallet numeric;
  v_phase2_attempts bigint;
  v_phase2_answers bigint;
  v_overlapping_order_ids bigint;
  v_dup_tx_orders bigint;
  v_dup_event_orders bigint;
  v_settled_event_without_participant bigint;
BEGIN
  IF to_regclass('legacy_prod.transactions') IS NULL
     OR to_regclass('legacy_prod.event_payments') IS NULL
     OR to_regclass('legacy_prod.tryout_events') IS NULL
     OR to_regclass('legacy_prod.tryout_event_participants') IS NULL
     OR to_regclass('legacy_prod.program_track_map') IS NULL
     OR to_regclass('legacy_prod.archive_exam_map') IS NULL THEN
    RAISE EXCEPTION 'Phase 3 prerequisites are incomplete';
  END IF;

  SELECT count(*) INTO v_tx FROM legacy_prod.transactions;
  SELECT count(*) INTO v_event_pay FROM legacy_prod.event_payments;
  SELECT count(*) INTO v_participants FROM legacy_prod.tryout_event_participants;
  SELECT count(*) INTO v_events FROM legacy_prod.tryout_events;
  SELECT coalesce(sum(w.balance),0) INTO v_phase1_wallet
  FROM public.wallets w
  JOIN legacy_prod.auth_users_identity a ON a.id::uuid=w.user_id
  WHERE w.wallet_type='exam_token';
  SELECT count(*) INTO v_phase2_attempts
  FROM public.exam_attempts WHERE metadata->>'migration_source'='production_legacy_rehearsal';
  SELECT count(*) INTO v_phase2_answers
  FROM public.attempt_answers aa
  JOIN public.attempt_questions aq ON aq.id=aa.attempt_question_id
  JOIN public.exam_attempts ea ON ea.id=aq.attempt_id
  WHERE ea.metadata->>'migration_source'='production_legacy_rehearsal';

  SELECT count(*) INTO v_overlapping_order_ids
  FROM legacy_prod.transactions t JOIN legacy_prod.event_payments ep ON ep.order_id=t.order_id;
  SELECT count(*) INTO v_dup_tx_orders
  FROM (SELECT order_id FROM legacy_prod.transactions GROUP BY order_id HAVING count(*)>1) x;
  SELECT count(*) INTO v_dup_event_orders
  FROM (SELECT order_id FROM legacy_prod.event_payments GROUP BY order_id HAVING count(*)>1) x;
  SELECT count(*) INTO v_settled_event_without_participant
  FROM legacy_prod.event_payments ep
  WHERE ep.status='settlement'
    AND NOT EXISTS (
      SELECT 1 FROM legacy_prod.tryout_event_participants p
      WHERE p.event_id=ep.event_id AND p.user_id=ep.user_id
    );

  IF v_tx<>258 OR v_event_pay<>64 OR v_participants<>104 OR v_events<>4 THEN
    RAISE EXCEPTION 'unexpected commerce/event baseline: tx=%, event_payments=%, participants=%, events=%',
      v_tx,v_event_pay,v_participants,v_events;
  END IF;
  IF v_phase1_wallet<>5090 OR v_phase2_attempts<>476 OR v_phase2_answers<>16889 THEN
    RAISE EXCEPTION 'Phase 1/2 gates are not green: wallet=%, attempts=%, answers=%',
      v_phase1_wallet,v_phase2_attempts,v_phase2_answers;
  END IF;
  IF v_overlapping_order_ids<>0 OR v_dup_tx_orders<>0 OR v_dup_event_orders<>0 THEN
    RAISE EXCEPTION 'legacy order ids are not unique enough for canonical preservation: overlap=%, tx_dupes=%, event_dupes=%',
      v_overlapping_order_ids,v_dup_tx_orders,v_dup_event_orders;
  END IF;
  IF v_settled_event_without_participant<>0 THEN
    RAISE EXCEPTION 'settled event payment without participant: %', v_settled_event_without_participant;
  END IF;
END
$$;

-- Repeatable cleanup of Phase 3 artifacts only.
DELETE FROM public.event_registrations
WHERE registration_number LIKE 'LEGACY-%';
DELETE FROM public.event_sessions es
USING public.events e
WHERE es.event_id=e.id AND e.code LIKE 'LEGACY-EVENT-%';
DELETE FROM public.events WHERE code LIKE 'LEGACY-EVENT-%';

DELETE FROM public.payments
WHERE raw_response->>'migration_source'='production_legacy_rehearsal'
  AND raw_response->>'phase'='3';

DELETE FROM public.order_items oi
USING public.orders o
WHERE oi.order_id=o.id
  AND o.order_number IN (
    SELECT order_id FROM legacy_prod.transactions
    UNION ALL
    SELECT order_id FROM legacy_prod.event_payments
  );

DELETE FROM public.orders
WHERE order_number IN (
  SELECT order_id FROM legacy_prod.transactions
  UNION ALL
  SELECT order_id FROM legacy_prod.event_payments
);

DELETE FROM public.products
WHERE code LIKE 'LEGACY_PKG_%' OR code LIKE 'LEGACY_EVENT_TICKET_%';

DROP TABLE IF EXISTS legacy_prod.legacy_product_map;
DROP TABLE IF EXISTS legacy_prod.legacy_event_product_map;
DROP TABLE IF EXISTS legacy_prod.legacy_transaction_order_map;
DROP TABLE IF EXISTS legacy_prod.legacy_event_order_map;

-- Every distinct legacy package becomes a hidden DRAFT historical product. This avoids guessing
-- modern product semantics or token quantities from old marketing package names.
CREATE TABLE legacy_prod.legacy_product_map (
  legacy_program_id uuid NOT NULL,
  package_name text NOT NULL,
  canonical_product_id uuid NOT NULL,
  PRIMARY KEY (legacy_program_id, package_name)
);

WITH packages AS (
  SELECT DISTINCT t.program_id::uuid AS legacy_program_id, t.package_name
  FROM legacy_prod.transactions t
), mapped AS (
  SELECT p.*, pm.canonical_program_id, pm.canonical_track_id
  FROM packages p
  JOIN legacy_prod.program_track_map pm ON pm.legacy_program_id=p.legacy_program_id
)
INSERT INTO public.products (
  id, code, name, description, product_type, program_id, track_id,
  duration_days, status, created_at, updated_at
)
SELECT
  md5('legacy-package-product:' || m.legacy_program_id::text || ':' || m.package_name)::uuid,
  'LEGACY_PKG_' || upper(substr(md5(m.legacy_program_id::text || ':' || m.package_name),1,16)),
  '[Legacy] ' || m.package_name,
  'Historical product created only to preserve legacy order items during Schema V2 migration.',
  'LEGACY_HISTORY',
  m.canonical_program_id,
  m.canonical_track_id,
  NULL::integer,
  'DRAFT',
  now(),
  now()
FROM mapped m;

INSERT INTO legacy_prod.legacy_product_map (legacy_program_id,package_name,canonical_product_id)
SELECT DISTINCT
  t.program_id::uuid,
  t.package_name,
  md5('legacy-package-product:' || t.program_id::uuid::text || ':' || t.package_name)::uuid
FROM legacy_prod.transactions t;

-- One hidden historical ticket product per event.
CREATE TABLE legacy_prod.legacy_event_product_map (
  legacy_event_id uuid PRIMARY KEY,
  canonical_product_id uuid NOT NULL
);

INSERT INTO public.products (
  id, code, name, description, product_type, program_id, track_id,
  duration_days, status, created_at, updated_at
)
SELECT
  md5('legacy-event-ticket-product:' || e.id)::uuid,
  'LEGACY_EVENT_TICKET_' || upper(substr(replace(e.id,'-',''),1,16)),
  '[Legacy Event Ticket] ' || e.title,
  'Historical event-ticket product created only to preserve legacy event payment order items.',
  'LEGACY_EVENT_TICKET',
  pm.canonical_program_id,
  pm.canonical_track_id,
  NULL::integer,
  'DRAFT',
  coalesce(nullif(e.created_at,'')::timestamptz,now()),
  coalesce(nullif(e.updated_at,'')::timestamptz,nullif(e.created_at,'')::timestamptz,now())
FROM legacy_prod.tryout_events e
JOIN legacy_prod.program_track_map pm ON pm.legacy_program_id=e.program_id::uuid;

INSERT INTO legacy_prod.legacy_event_product_map (legacy_event_id,canonical_product_id)
SELECT e.id::uuid, md5('legacy-event-ticket-product:' || e.id)::uuid
FROM legacy_prod.tryout_events e;

-- Legacy regular transactions -> canonical immutable historical orders/payments/items.
CREATE TABLE legacy_prod.legacy_transaction_order_map (
  legacy_transaction_id uuid PRIMARY KEY,
  canonical_order_id uuid NOT NULL
);

INSERT INTO public.orders (
  id, order_number, user_id, status, subtotal, discount_amount, total_amount,
  currency, created_at, paid_at
)
SELECT
  md5('legacy-transaction-order:' || t.id)::uuid,
  t.order_id,
  t.user_id::uuid,
  CASE WHEN t.status='settlement' THEN 'paid' ELSE 'failed' END,
  t.amount::numeric,
  0,
  t.amount::numeric,
  'IDR',
  coalesce(nullif(t.created_at,'')::timestamptz,now()),
  CASE WHEN t.status='settlement'
    THEN coalesce(nullif(t.updated_at,'')::timestamptz,nullif(t.created_at,'')::timestamptz)
    ELSE NULL::timestamptz
  END
FROM legacy_prod.transactions t;

INSERT INTO legacy_prod.legacy_transaction_order_map (legacy_transaction_id,canonical_order_id)
SELECT t.id::uuid,md5('legacy-transaction-order:' || t.id)::uuid
FROM legacy_prod.transactions t;

INSERT INTO public.order_items (
  id, order_id, product_id, quantity, unit_price, discount, total
)
SELECT
  md5('legacy-transaction-item:' || t.id)::uuid,
  om.canonical_order_id,
  pm.canonical_product_id,
  1,
  t.amount::numeric,
  0,
  t.amount::numeric
FROM legacy_prod.transactions t
JOIN legacy_prod.legacy_transaction_order_map om ON om.legacy_transaction_id=t.id::uuid
JOIN legacy_prod.legacy_product_map pm
  ON pm.legacy_program_id=t.program_id::uuid AND pm.package_name=t.package_name;

INSERT INTO public.payments (
  id, order_id, provider, provider_transaction_id, payment_method, amount,
  status, paid_at, raw_response, created_at, updated_at
)
SELECT
  t.id::uuid,
  om.canonical_order_id,
  'midtrans',
  t.order_id,
  NULL::text,
  t.amount::numeric,
  t.status,
  CASE WHEN t.status='settlement'
    THEN coalesce(nullif(t.updated_at,'')::timestamptz,nullif(t.created_at,'')::timestamptz)
    ELSE NULL::timestamptz
  END,
  jsonb_build_object(
    'migration_source','production_legacy_rehearsal',
    'phase','3',
    'source_table','transactions',
    'legacy_transaction_id',t.id,
    'legacy_status',t.status,
    'legacy_package_name',t.package_name,
    'legacy_program_id',t.program_id,
    'legacy_program_package_id',nullif(t.program_package_id,''),
    'legacy_product_id',nullif(t.product_id,''),
    'legacy_snap_token_present',(nullif(t.snap_token,'') IS NOT NULL),
    'grant_replay','suppressed_current_wallet_preserved'
  ),
  coalesce(nullif(t.created_at,'')::timestamptz,now()),
  coalesce(nullif(t.updated_at,'')::timestamptz,nullif(t.created_at,'')::timestamptz,now())
FROM legacy_prod.transactions t
JOIN legacy_prod.legacy_transaction_order_map om ON om.legacy_transaction_id=t.id::uuid;

-- Event payments -> canonical historical orders/payments/items.
CREATE TABLE legacy_prod.legacy_event_order_map (
  legacy_event_payment_id uuid PRIMARY KEY,
  canonical_order_id uuid NOT NULL
);

INSERT INTO public.orders (
  id, order_number, user_id, status, subtotal, discount_amount, total_amount,
  currency, created_at, paid_at
)
SELECT
  md5('legacy-event-payment-order:' || ep.id)::uuid,
  ep.order_id,
  ep.user_id::uuid,
  CASE WHEN ep.status='settlement' THEN 'paid' ELSE 'failed' END,
  ep.amount::numeric,
  0,
  ep.amount::numeric,
  'IDR',
  coalesce(nullif(ep.created_at,'')::timestamptz,now()),
  CASE WHEN ep.status='settlement'
    THEN coalesce(nullif(ep.updated_at,'')::timestamptz,nullif(ep.created_at,'')::timestamptz)
    ELSE NULL::timestamptz
  END
FROM legacy_prod.event_payments ep;

INSERT INTO legacy_prod.legacy_event_order_map (legacy_event_payment_id,canonical_order_id)
SELECT ep.id::uuid,md5('legacy-event-payment-order:' || ep.id)::uuid
FROM legacy_prod.event_payments ep;

INSERT INTO public.order_items (
  id, order_id, product_id, quantity, unit_price, discount, total
)
SELECT
  md5('legacy-event-payment-item:' || ep.id)::uuid,
  om.canonical_order_id,
  pm.canonical_product_id,
  1,
  ep.amount::numeric,
  0,
  ep.amount::numeric
FROM legacy_prod.event_payments ep
JOIN legacy_prod.legacy_event_order_map om ON om.legacy_event_payment_id=ep.id::uuid
JOIN legacy_prod.legacy_event_product_map pm ON pm.legacy_event_id=ep.event_id::uuid;

INSERT INTO public.payments (
  id, order_id, provider, provider_transaction_id, payment_method, amount,
  status, paid_at, raw_response, created_at, updated_at
)
SELECT
  ep.id::uuid,
  om.canonical_order_id,
  'midtrans',
  ep.order_id,
  NULL::text,
  ep.amount::numeric,
  ep.status,
  CASE WHEN ep.status='settlement'
    THEN coalesce(nullif(ep.updated_at,'')::timestamptz,nullif(ep.created_at,'')::timestamptz)
    ELSE NULL::timestamptz
  END,
  jsonb_build_object(
    'migration_source','production_legacy_rehearsal',
    'phase','3',
    'source_table','event_payments',
    'legacy_event_payment_id',ep.id,
    'legacy_event_id',ep.event_id,
    'legacy_status',ep.status,
    'legacy_snap_token_present',(nullif(ep.snap_token,'') IS NOT NULL),
    'grant_replay','suppressed_registration_state_preserved'
  ),
  coalesce(nullif(ep.created_at,'')::timestamptz,now()),
  coalesce(nullif(ep.updated_at,'')::timestamptz,nullif(ep.created_at,'')::timestamptz,now())
FROM legacy_prod.event_payments ep
JOIN legacy_prod.legacy_event_order_map om ON om.legacy_event_payment_id=ep.id::uuid;

-- Preserve legacy events directly by UUID. These are historical/closed event records.
INSERT INTO public.events (
  id, code, title, slug, event_type, program_id, track_id, description,
  registration_start, registration_end, starts_at, ends_at, status, created_at
)
SELECT
  e.id::uuid,
  'LEGACY-EVENT-' || upper(substr(replace(e.id,'-',''),1,12)),
  e.title,
  'legacy-event-' || replace(e.id,'-',''),
  'tryout_akbar',
  pm.canonical_program_id,
  pm.canonical_track_id,
  nullif(e.description,''),
  NULL::timestamptz,
  NULL::timestamptz,
  e.starts_at::timestamptz,
  e.ends_at::timestamptz,
  e.status,
  coalesce(nullif(e.created_at,'')::timestamptz,now())
FROM legacy_prod.tryout_events e
JOIN legacy_prod.program_track_map pm ON pm.legacy_program_id=e.program_id::uuid;

-- One canonical event session per legacy event. Event history uses the hidden full archive exam
-- created in Phase 2 so no active catalog exam is repurposed.
INSERT INTO public.event_sessions (
  id, event_id, exam_id, name, starts_at, ends_at, capacity, status
)
SELECT
  md5('legacy-event-session:' || e.id)::uuid,
  e.id::uuid,
  aem.canonical_exam_id,
  e.title,
  e.starts_at::timestamptz,
  e.ends_at::timestamptz,
  nullif(e.max_participants,'')::integer,
  'closed'
FROM legacy_prod.tryout_events e
JOIN legacy_prod.archive_exam_map aem
  ON aem.legacy_program_id=e.program_id::uuid AND aem.history_class='full';

-- Preserve every legacy participant. Link order_id only for a matching SETTLED event payment.
-- Expired payment attempts never become the source of a registration grant.
INSERT INTO public.event_registrations (
  id, event_id, session_id, user_id, order_id, registration_number, status, created_at
)
SELECT
  p.id::uuid,
  p.event_id::uuid,
  md5('legacy-event-session:' || p.event_id)::uuid,
  p.user_id::uuid,
  CASE WHEN ep.id IS NOT NULL THEN eom.canonical_order_id ELSE NULL::uuid END,
  'LEGACY-' || replace(p.id,'-',''),
  p.status,
  coalesce(nullif(p.registered_at,'')::timestamptz,now())
FROM legacy_prod.tryout_event_participants p
LEFT JOIN legacy_prod.event_payments ep
  ON ep.event_id=p.event_id AND ep.user_id=p.user_id AND ep.status='settlement'
LEFT JOIN legacy_prod.legacy_event_order_map eom ON eom.legacy_event_payment_id=ep.id::uuid;

-- Phase 3 hard reconciliation + regression gates for Phases 1 and 2.
DO $$
DECLARE
  v_orders bigint;
  v_payments bigint;
  v_items bigint;
  v_paid_orders bigint;
  v_failed_orders bigint;
  v_settlement_payments bigint;
  v_expire_payments bigint;
  v_tx_amount numeric;
  v_event_amount numeric;
  v_total_amount numeric;
  v_events bigint;
  v_event_sessions bigint;
  v_regs bigint;
  v_linked_regs bigint;
  v_expired_linked bigint;
  v_settled_linked bigint;
  v_wallet_sum numeric;
  v_phase3_wallet_tx bigint;
  v_phase3_entitlements bigint;
  v_attempts bigint;
  v_answers bigint;
  v_scores bigint;
  v_drafts bigint;
  v_versions bigint;
  v_withheld bigint;
BEGIN
  SELECT count(*) INTO v_orders
  FROM public.orders o
  WHERE o.order_number IN (
    SELECT order_id FROM legacy_prod.transactions
    UNION ALL SELECT order_id FROM legacy_prod.event_payments
  );
  SELECT count(*) INTO v_payments
  FROM public.payments p
  WHERE p.raw_response->>'migration_source'='production_legacy_rehearsal'
    AND p.raw_response->>'phase'='3';
  SELECT count(*) INTO v_items
  FROM public.order_items oi
  JOIN public.orders o ON o.id=oi.order_id
  WHERE o.order_number IN (
    SELECT order_id FROM legacy_prod.transactions
    UNION ALL SELECT order_id FROM legacy_prod.event_payments
  );
  SELECT count(*) FILTER (WHERE status='paid'), count(*) FILTER (WHERE status='failed')
    INTO v_paid_orders,v_failed_orders
  FROM public.orders o
  WHERE o.order_number IN (
    SELECT order_id FROM legacy_prod.transactions
    UNION ALL SELECT order_id FROM legacy_prod.event_payments
  );
  SELECT count(*) FILTER (WHERE status='settlement'), count(*) FILTER (WHERE status='expire')
    INTO v_settlement_payments,v_expire_payments
  FROM public.payments p
  WHERE p.raw_response->>'migration_source'='production_legacy_rehearsal'
    AND p.raw_response->>'phase'='3';

  SELECT coalesce(sum(amount),0) INTO v_tx_amount
  FROM public.payments
  WHERE raw_response->>'migration_source'='production_legacy_rehearsal'
    AND raw_response->>'phase'='3'
    AND raw_response->>'source_table'='transactions';
  SELECT coalesce(sum(amount),0) INTO v_event_amount
  FROM public.payments
  WHERE raw_response->>'migration_source'='production_legacy_rehearsal'
    AND raw_response->>'phase'='3'
    AND raw_response->>'source_table'='event_payments';
  v_total_amount := v_tx_amount + v_event_amount;

  SELECT count(*) INTO v_events FROM public.events WHERE code LIKE 'LEGACY-EVENT-%';
  SELECT count(*) INTO v_event_sessions
  FROM public.event_sessions es JOIN public.events e ON e.id=es.event_id
  WHERE e.code LIKE 'LEGACY-EVENT-%';
  SELECT count(*) INTO v_regs FROM public.event_registrations WHERE registration_number LIKE 'LEGACY-%';
  SELECT count(*) INTO v_linked_regs
  FROM public.event_registrations WHERE registration_number LIKE 'LEGACY-%' AND order_id IS NOT NULL;

  SELECT count(*) INTO v_expired_linked
  FROM public.event_registrations er
  JOIN public.orders o ON o.id=er.order_id
  JOIN public.payments pay ON pay.order_id=o.id
  WHERE er.registration_number LIKE 'LEGACY-%'
    AND pay.raw_response->>'source_table'='event_payments'
    AND pay.status='expire';

  SELECT count(*) INTO v_settled_linked
  FROM public.event_registrations er
  JOIN public.orders o ON o.id=er.order_id
  JOIN public.payments pay ON pay.order_id=o.id
  WHERE er.registration_number LIKE 'LEGACY-%'
    AND pay.raw_response->>'source_table'='event_payments'
    AND pay.status='settlement';

  SELECT coalesce(sum(w.balance),0) INTO v_wallet_sum
  FROM public.wallets w JOIN legacy_prod.auth_users_identity a ON a.id::uuid=w.user_id
  WHERE w.wallet_type='exam_token';
  SELECT count(*) INTO v_phase3_wallet_tx
  FROM public.wallet_transactions wt
  WHERE wt.source_type LIKE 'legacy_phase3%';
  SELECT count(*) INTO v_phase3_entitlements
  FROM public.entitlements e
  WHERE e.source_type LIKE 'legacy_phase3%';

  SELECT count(*) INTO v_attempts
  FROM public.exam_attempts WHERE metadata->>'migration_source'='production_legacy_rehearsal';
  SELECT count(*) INTO v_answers
  FROM public.attempt_answers aa
  JOIN public.attempt_questions aq ON aq.id=aa.attempt_question_id
  JOIN public.exam_attempts ea ON ea.id=aq.attempt_id
  WHERE ea.metadata->>'migration_source'='production_legacy_rehearsal';
  SELECT count(*) INTO v_scores
  FROM public.attempt_scores s
  JOIN public.exam_attempts ea ON ea.id=s.attempt_id
  WHERE ea.metadata->>'migration_source'='production_legacy_rehearsal';

  SELECT count(*) INTO v_drafts FROM public.questions WHERE source_type='legacy_migration' AND status='draft';
  SELECT count(*) INTO v_versions
  FROM public.question_versions qv JOIN public.questions q ON q.id=qv.question_id
  WHERE q.source_type='legacy_migration' AND q.status='draft';
  SELECT count(*) INTO v_withheld
  FROM public.questions WHERE question_code IN (
    'TIU-000033','TIU-000064','TIU-000065','TWK-000385','TWK-000448','TWK-000461'
  );

  IF v_orders<>322 OR v_payments<>322 OR v_items<>322 THEN
    RAISE EXCEPTION 'commerce row reconciliation failed: orders=%, payments=%, items=%',v_orders,v_payments,v_items;
  END IF;
  IF v_paid_orders<>50 OR v_failed_orders<>272 OR v_settlement_payments<>50 OR v_expire_payments<>272 THEN
    RAISE EXCEPTION 'commerce status reconciliation failed: paid=%, failed=%, settlement=%, expire=%',
      v_paid_orders,v_failed_orders,v_settlement_payments,v_expire_payments;
  END IF;
  IF v_tx_amount<>6295630 OR v_event_amount<>2240000 OR v_total_amount<>8535630 THEN
    RAISE EXCEPTION 'commerce amount reconciliation failed: tx=%, event=%, total=%',v_tx_amount,v_event_amount,v_total_amount;
  END IF;
  IF v_events<>4 OR v_event_sessions<>4 OR v_regs<>104 THEN
    RAISE EXCEPTION 'event reconciliation failed: events=%, sessions=%, registrations=%',v_events,v_event_sessions,v_regs;
  END IF;
  IF v_linked_regs<>31 OR v_settled_linked<>31 OR v_expired_linked<>0 THEN
    RAISE EXCEPTION 'event grant linkage failed: linked=%, settled_linked=%, expired_linked=%',
      v_linked_regs,v_settled_linked,v_expired_linked;
  END IF;
  IF v_wallet_sum<>5090 OR v_phase3_wallet_tx<>0 OR v_phase3_entitlements<>0 THEN
    RAISE EXCEPTION 'double-grant guard failed: wallet_sum=%, phase3_wallet_tx=%, phase3_entitlements=%',
      v_wallet_sum,v_phase3_wallet_tx,v_phase3_entitlements;
  END IF;
  IF v_attempts<>476 OR v_answers<>16889 OR v_scores<>1273 THEN
    RAISE EXCEPTION 'Phase 2 regression: attempts=%, answers=%, scores=%',v_attempts,v_answers,v_scores;
  END IF;
  IF v_drafts<>433 OR v_versions<>0 OR v_withheld<>0 THEN
    RAISE EXCEPTION 'CPNS content invariant changed: drafts=%, versions=%, withheld_in_bank=%',v_drafts,v_versions,v_withheld;
  END IF;
END
$$;

COMMIT;

SELECT
  (SELECT count(*) FROM public.orders o WHERE o.order_number IN (SELECT order_id FROM legacy_prod.transactions UNION ALL SELECT order_id FROM legacy_prod.event_payments)) AS historical_orders,
  (SELECT count(*) FROM public.payments p WHERE p.raw_response->>'migration_source'='production_legacy_rehearsal' AND p.raw_response->>'phase'='3') AS historical_payments,
  (SELECT count(*) FROM public.order_items oi JOIN public.orders o ON o.id=oi.order_id WHERE o.order_number IN (SELECT order_id FROM legacy_prod.transactions UNION ALL SELECT order_id FROM legacy_prod.event_payments)) AS historical_order_items,
  (SELECT count(*) FROM public.events WHERE code LIKE 'LEGACY-EVENT-%') AS events,
  (SELECT count(*) FROM public.event_registrations WHERE registration_number LIKE 'LEGACY-%') AS registrations,
  (SELECT count(*) FROM public.event_registrations WHERE registration_number LIKE 'LEGACY-%' AND order_id IS NOT NULL) AS paid_registration_links,
  (SELECT coalesce(sum(w.balance),0) FROM public.wallets w JOIN legacy_prod.auth_users_identity a ON a.id::uuid=w.user_id WHERE w.wallet_type='exam_token') AS wallet_balance_sum;

SELECT status,count(*) AS payments,coalesce(sum(amount),0) AS amount_sum
FROM public.payments
WHERE raw_response->>'migration_source'='production_legacy_rehearsal' AND raw_response->>'phase'='3'
GROUP BY status
ORDER BY status;
