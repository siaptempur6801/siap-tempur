-- Siap Tempur Schema V2 production cutover preflight
-- PRODUCTION SOURCE / READ ONLY.
-- Intended source project: llnttutwhtvxtdktiizo
-- Never add INSERT/UPDATE/DELETE/DDL to this file.
--
-- Every gate below must be TRUE immediately before taking the final cutover snapshot.
-- Any unexpected drift is a STOP condition and requires reconciliation + rehearsal.
-- 1) Confirm this still looks like the legacy source shape, not a partially cut-over database.
SELECT
  to_regclass('public.test_sessions') IS NOT NULL AS legacy_test_sessions_present,
  to_regclass('public.test_answers') IS NOT NULL AS legacy_test_answers_present,
  to_regclass('public.user_programs') IS NOT NULL AS legacy_user_programs_present,
  to_regclass('public.transactions') IS NOT NULL AS legacy_transactions_present,
  to_regclass('public.tryout_events') IS NOT NULL AS legacy_tryout_events_present,
  to_regclass('public.exam_attempts') IS NULL AS canonical_exam_attempts_absent,
  to_regclass('public.user_tracks') IS NULL AS canonical_user_tracks_absent,
  to_regclass('public.wallets') IS NULL AS canonical_wallets_absent,
  to_regclass('public.attempt_answers') IS NULL AS canonical_attempt_answers_absent;

-- 2) Identity + enrollment/quota invariants.
WITH actual AS (
  SELECT
    (
      SELECT
        count(*)
      FROM
        auth.users) AS auth_users,
    (
      SELECT
        count(*)
      FROM
        public.profiles) AS profiles,
    (
      SELECT
        count(*)
      FROM
        auth.users a
        JOIN public.profiles p USING (id)) AS matching_uuid,
    (
      SELECT
        count(*)
      FROM
        auth.users a
        LEFT JOIN public.profiles p USING (id)
      WHERE
        p.id IS NULL) AS auth_without_profile,
    (
      SELECT
        count(*)
      FROM
        public.profiles p
      LEFT JOIN auth.users a USING (id)
    WHERE
      a.id IS NULL) AS profile_without_auth,
  (
    SELECT
      count(*)
    FROM
      public.user_programs) AS user_programs,
  (
    SELECT
      count(DISTINCT user_id)
    FROM
      public.user_programs) AS users_with_program,
  (
    SELECT
      coalesce(sum(tryout_quota), 0)
    FROM
      public.user_programs) AS program_quota_sum
)
SELECT
  auth_users = 426 AS auth_users_ok,
  profiles = 426 AS profiles_ok,
  matching_uuid = 426 AS matching_uuid_ok,
  auth_without_profile = 0 AS auth_without_profile_ok,
  profile_without_auth = 0 AS profile_without_auth_ok,
  user_programs = 430 AS user_programs_ok,
  users_with_program = 426 AS users_with_program_ok,
  program_quota_sum = 5090 AS program_quota_sum_ok,
  *
FROM
  actual;

-- 3) Exam/history invariants.
WITH actual AS (
  SELECT
    (
      SELECT
        count(*)
      FROM
        public.test_sessions) AS sessions,
    (
      SELECT
        count(*)
      FROM
        public.test_sessions
      WHERE
        status::text = 'completed') AS completed_sessions,
    (
      SELECT
        count(*)
      FROM
        public.test_sessions
      WHERE
        status::text <> 'completed') AS noncompleted_sessions,
    (
      SELECT
        count(*)
      FROM
        public.test_answers) AS answers,
    (
      SELECT
        count(*)
      FROM
        public.session_subject_scores) AS subject_scores,
    (
      SELECT
        count(*)
      FROM
        public.test_sessions s
      LEFT JOIN auth.users u ON u.id = s.user_id
    WHERE
      u.id IS NULL) AS orphan_session_users,
  (
    SELECT
      count(*)
    FROM
      public.test_answers a
    LEFT JOIN public.test_sessions s ON s.id = a.session_id
  WHERE
    s.id IS NULL) AS orphan_answers_sessions,
(
  SELECT
    count(*)
  FROM
    public.test_answers a
    LEFT JOIN public.questions q ON q.id = a.question_id
  WHERE
    q.id IS NULL) AS orphan_answers_questions,
(
  SELECT
    count(*)
  FROM
    public.session_subject_scores x
    LEFT JOIN public.test_sessions s ON s.id = x.session_id
  WHERE
    s.id IS NULL) AS orphan_subject_scores,
(
  SELECT
    coalesce(sum(total_score), 0)
  FROM
    public.test_sessions
  WHERE
    status::text = 'completed') AS completed_total_score_sum,
(
  SELECT
    coalesce(sum(score_twk), 0)
  FROM
    public.test_sessions
  WHERE
    status::text = 'completed') AS twk_score_sum,
(
  SELECT
    coalesce(sum(score_tiu), 0)
  FROM
    public.test_sessions
  WHERE
    status::text = 'completed') AS tiu_score_sum,
(
  SELECT
    coalesce(sum(score_tkp), 0)
  FROM
    public.test_sessions
  WHERE
    status::text = 'completed') AS tkp_score_sum
)
SELECT
  sessions = 476 AS sessions_ok,
  completed_sessions = 426 AS completed_sessions_ok,
  noncompleted_sessions = 50 AS noncompleted_sessions_ok,
  answers = 16889 AS answers_ok,
  subject_scores = 1273 AS subject_scores_ok,
  orphan_session_users = 0 AS orphan_session_users_ok,
  orphan_answers_sessions = 0 AS orphan_answers_sessions_ok,
  orphan_answers_questions = 0 AS orphan_answers_questions_ok,
  orphan_subject_scores = 0 AS orphan_subject_scores_ok,
  completed_total_score_sum = 88239 AS completed_score_ok,
  twk_score_sum = 21365 AS twk_score_ok,
  tiu_score_sum = 22255 AS tiu_score_ok,
  tkp_score_sum = 44603 AS tkp_score_ok,
  *
FROM
  actual;

-- 4) Commerce/event invariants.
WITH actual AS (
  SELECT
    (
      SELECT
        count(*)
      FROM
        public.transactions) AS transactions,
    (
      SELECT
        coalesce(sum(amount), 0)
      FROM
        public.transactions) AS transaction_amount_sum,
    (
      SELECT
        count(*)
      FROM
        public.transactions
      WHERE
        status::text = 'settlement') AS settled_transactions,
    (
      SELECT
        count(*)
      FROM
        public.transactions
      WHERE
        status::text = 'expire') AS expired_transactions,
    (
      SELECT
        count(*)
      FROM
        public.transactions t
      LEFT JOIN auth.users u ON u.id = t.user_id
    WHERE
      u.id IS NULL) AS orphan_transaction_users,
  (
    SELECT
      count(*)
    FROM
      public.event_payments) AS event_payments,
  (
    SELECT
      coalesce(sum(amount), 0)
    FROM
      public.event_payments) AS event_payment_amount_sum,
  (
    SELECT
      count(*)
    FROM
      public.event_payments
    WHERE
      status = 'settlement') AS settled_event_payments,
  (
    SELECT
      count(*)
    FROM
      public.event_payments
    WHERE
      status = 'expire') AS expired_event_payments,
  (
    SELECT
      count(*)
    FROM
      public.event_payments p
    LEFT JOIN auth.users u ON u.id = p.user_id
  WHERE
    u.id IS NULL) AS orphan_event_payment_users,
(
  SELECT
    count(*)
  FROM
    public.user_program_token_ledger) AS token_ledger_rows,
(
  SELECT
    count(*)
  FROM
    public.tryout_event_participants) AS event_participants,
(
  SELECT
    count(*)
  FROM
    public.tryout_event_participants p
    LEFT JOIN auth.users u ON u.id = p.user_id
  WHERE
    u.id IS NULL) AS orphan_event_participant_users,
(
  SELECT
    count(*)
  FROM
    public.voucher_claims) AS voucher_claims
)
SELECT
  transactions = 258 AS transactions_ok,
  transaction_amount_sum = 6295630 AS transaction_amount_ok,
  settled_transactions = 19 AS settled_transactions_ok,
  expired_transactions = 239 AS expired_transactions_ok,
  orphan_transaction_users = 0 AS orphan_transaction_users_ok,
  event_payments = 64 AS event_payments_ok,
  event_payment_amount_sum = 2240000 AS event_payment_amount_ok,
  settled_event_payments = 31 AS settled_event_payments_ok,
  expired_event_payments = 33 AS expired_event_payments_ok,
  orphan_event_payment_users = 0 AS orphan_event_payment_users_ok,
  token_ledger_rows = 0 AS token_ledger_rows_ok,
  event_participants = 104 AS event_participants_ok,
  orphan_event_participant_users = 0 AS orphan_event_participant_users_ok,
  voucher_claims = 310 AS voucher_claims_ok,
  *
FROM
  actual;

-- 5) Non-PII fingerprints. All six comparisons must be TRUE.
WITH actual AS (
  SELECT
    md5(coalesce((
        SELECT
          string_agg(id::text, ',' ORDER BY id)
        FROM auth.users), '')) AS auth_user_id_hash,
    md5(coalesce((
        SELECT
          string_agg(id::text || ':' || coalesce(tryout_quota, 0)::text, ',' ORDER BY id)
        FROM public.profiles), '')) AS profile_quota_hash,
    md5(coalesce((
        SELECT
          string_agg(id::text || ':' || user_id::text || ':' || status::text || ':' || coalesce(total_score, 0)::text, ',' ORDER BY id)
        FROM public.test_sessions), '')) AS session_score_hash,
    md5(coalesce((
        SELECT
          string_agg(id::text || ':' || session_id::text || ':' || question_id::text || ':' || coalesce(option_id::text, ''), ',' order by id) from public.test_answers),'')) AS answer_hash, md5(coalesce((
              SELECT
                string_agg(id::text || ':' || user_id::text || ':' || order_id || ':' || amount::text || ':' || status::text, ',' ORDER BY id)
              FROM public.transactions), '')) AS transaction_hash, md5(coalesce((
            SELECT
              string_agg(id::text || ':' || user_id::text || ':' || order_id || ':' || amount::text || ':' || status, ',' ORDER BY id)
            FROM public.event_payments), '')) AS event_payment_hash)
    SELECT
      auth_user_id_hash = 'aba71998de87af045ca2fbc65c9b82eb' AS auth_hash_ok, profile_quota_hash = 'b02379b4056903c5ad5a09971df5a2b9' AS profile_quota_hash_ok, session_score_hash = 'b94db0fdf0fa3aadf8df9331114dd8bd' AS session_score_hash_ok, answer_hash = 'ff5048c26f8af5f112d2e45faf37679a' AS answer_hash_ok, transaction_hash = '5d21ca2bd700a8515df48edabc7c909c' AS transaction_hash_ok, event_payment_hash = '433b67a09f9f3673bfa6703813e7cedf' AS event_payment_hash_ok, *
    FROM actual;

-- 6) Conflict-set visibility. Expected count is exactly 19 before cutover.
WITH conflict_names (
  name
) AS (
  VALUES ('articles'),
    ('audit_logs'),
    ('exam_blueprint_rules'),
    ('exam_sections'),
    ('exams'),
    ('leaderboard_entries'),
    ('learning_recommendations'),
    ('materials'),
    ('notification_campaigns'),
    ('notification_deliveries'),
    ('organizations'),
    ('products'),
    ('profiles'),
    ('programs'),
    ('question_stimuli'),
    ('question_tags'),
    ('question_versions'),
    ('questions'),
    ('subjects'))
SELECT
  count(*) = 19 AS all_conflict_tables_present,
  count(*) AS conflict_tables_present
FROM
  conflict_names
WHERE
  to_regclass('public.' || name) IS NOT NULL;
