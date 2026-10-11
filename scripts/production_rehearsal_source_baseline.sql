-- Siap Tempur Production-Clone Rehearsal
-- SOURCE ONLY / READ-ONLY queries.
-- Target source project: llnttutwhtvxtdktiizo
-- Never add INSERT/UPDATE/DELETE/DDL to this file.
-- 1) Identity + quota invariants
WITH a AS (
  SELECT
    id
  FROM
    auth.users
),
p AS (
  SELECT
    id
  FROM
    public.profiles
)
SELECT
  (
    SELECT
      count(*)
    FROM
      a) AS auth_users,
  (
    SELECT
      count(*)
    FROM
      p) AS profiles,
  (
    SELECT
      count(*)
    FROM
      a
      JOIN p USING (id)) AS matching_uuid,
  (
    SELECT
      count(*)
    FROM
      a
      LEFT JOIN p USING (id)
    WHERE
      p.id IS NULL) AS auth_without_profile,
  (
    SELECT
      count(*)
    FROM
      p
    LEFT JOIN a USING (id)
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
      public.profiles) AS profile_quota_sum,
  (
    SELECT
      coalesce(sum(tryout_quota), 0)
    FROM
      public.user_programs) AS program_quota_sum;

-- 2) Enrollment snapshot
SELECT
  p.slug,
  p.name,
  p.id,
  count(up.*) AS user_program_rows,
  count(DISTINCT up.user_id) AS users,
  coalesce(sum(up.tryout_quota), 0) AS quota_sum
FROM
  public.programs p
  LEFT JOIN public.user_programs up ON up.program_id = p.id
GROUP BY
  p.slug,
  p.name,
  p.id
ORDER BY
  p.slug;

-- 3) Exam/history integrity + score aggregates
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
      status::text = 'completed') AS tkp_score_sum;

-- 4) Session-state distribution
SELECT
  coalesce(session_kind, '<null>') AS session_kind,
  mode::text AS mode,
  status::text AS status,
  count(*) AS rows
FROM
  public.test_sessions
GROUP BY
  coalesce(session_kind, '<null>'),
  mode::text,
  status::text
ORDER BY
  session_kind,
  mode,
  status;

-- 5) Commerce/event invariants
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
      jsonb_object_agg(status::text, cnt)
    FROM (
      SELECT
        status,
        count(*) cnt
      FROM
        public.transactions
      GROUP BY
        status) s) AS transaction_status_counts,
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
      jsonb_object_agg(status, cnt)
    FROM (
      SELECT
        status,
        count(*) cnt
      FROM
        public.event_payments
      GROUP BY
        status) s) AS event_payment_status_counts,
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
      coalesce(sum(delta), 0)
    FROM
      public.user_program_token_ledger) AS token_ledger_delta_sum,
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
      public.voucher_claims) AS voucher_claims;

-- 6) Deterministic non-PII fingerprints
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
      FROM public.event_payments), '')) AS event_payment_hash;
