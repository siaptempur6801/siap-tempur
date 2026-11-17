-- Siap Tempur Schema V2 production cutover preflight
-- PRODUCTION SOURCE / READ ONLY.
-- Intended source project: llnttutwhtvxtdktiizo
-- Never add INSERT/UPDATE/DELETE/DDL to this file.
--
-- Every gate below must be TRUE immediately before taking the final cutover snapshot.
-- Any unexpected drift is a STOP condition and requires reconciliation + rehearsal.

-- 1) Confirm this still looks like the legacy source shape, not a partially cut-over database.
select
  to_regclass('public.test_sessions') is not null as legacy_test_sessions_present,
  to_regclass('public.test_answers') is not null as legacy_test_answers_present,
  to_regclass('public.user_programs') is not null as legacy_user_programs_present,
  to_regclass('public.transactions') is not null as legacy_transactions_present,
  to_regclass('public.tryout_events') is not null as legacy_tryout_events_present,
  to_regclass('public.exam_attempts') is null as canonical_exam_attempts_absent,
  to_regclass('public.user_tracks') is null as canonical_user_tracks_absent,
  to_regclass('public.wallets') is null as canonical_wallets_absent,
  to_regclass('public.attempt_answers') is null as canonical_attempt_answers_absent;

-- 2) Identity + enrollment/quota invariants.
with actual as (
  select
    (select count(*) from auth.users) as auth_users,
    (select count(*) from public.profiles) as profiles,
    (select count(*) from auth.users a join public.profiles p using(id)) as matching_uuid,
    (select count(*) from auth.users a left join public.profiles p using(id) where p.id is null) as auth_without_profile,
    (select count(*) from public.profiles p left join auth.users a using(id) where a.id is null) as profile_without_auth,
    (select count(*) from public.user_programs) as user_programs,
    (select count(distinct user_id) from public.user_programs) as users_with_program,
    (select coalesce(sum(tryout_quota),0) from public.user_programs) as program_quota_sum
)
select
  auth_users = 426 as auth_users_ok,
  profiles = 426 as profiles_ok,
  matching_uuid = 426 as matching_uuid_ok,
  auth_without_profile = 0 as auth_without_profile_ok,
  profile_without_auth = 0 as profile_without_auth_ok,
  user_programs = 430 as user_programs_ok,
  users_with_program = 426 as users_with_program_ok,
  program_quota_sum = 5090 as program_quota_sum_ok,
  *
from actual;

-- 3) Exam/history invariants.
with actual as (
  select
    (select count(*) from public.test_sessions) as sessions,
    (select count(*) from public.test_sessions where status::text='completed') as completed_sessions,
    (select count(*) from public.test_sessions where status::text<>'completed') as noncompleted_sessions,
    (select count(*) from public.test_answers) as answers,
    (select count(*) from public.session_subject_scores) as subject_scores,
    (select count(*) from public.test_sessions s left join auth.users u on u.id=s.user_id where u.id is null) as orphan_session_users,
    (select count(*) from public.test_answers a left join public.test_sessions s on s.id=a.session_id where s.id is null) as orphan_answers_sessions,
    (select count(*) from public.test_answers a left join public.questions q on q.id=a.question_id where q.id is null) as orphan_answers_questions,
    (select count(*) from public.session_subject_scores x left join public.test_sessions s on s.id=x.session_id where s.id is null) as orphan_subject_scores,
    (select coalesce(sum(total_score),0) from public.test_sessions where status::text='completed') as completed_total_score_sum,
    (select coalesce(sum(score_twk),0) from public.test_sessions where status::text='completed') as twk_score_sum,
    (select coalesce(sum(score_tiu),0) from public.test_sessions where status::text='completed') as tiu_score_sum,
    (select coalesce(sum(score_tkp),0) from public.test_sessions where status::text='completed') as tkp_score_sum
)
select
  sessions = 476 as sessions_ok,
  completed_sessions = 426 as completed_sessions_ok,
  noncompleted_sessions = 50 as noncompleted_sessions_ok,
  answers = 16889 as answers_ok,
  subject_scores = 1273 as subject_scores_ok,
  orphan_session_users = 0 as orphan_session_users_ok,
  orphan_answers_sessions = 0 as orphan_answers_sessions_ok,
  orphan_answers_questions = 0 as orphan_answers_questions_ok,
  orphan_subject_scores = 0 as orphan_subject_scores_ok,
  completed_total_score_sum = 88239 as completed_score_ok,
  twk_score_sum = 21365 as twk_score_ok,
  tiu_score_sum = 22255 as tiu_score_ok,
  tkp_score_sum = 44603 as tkp_score_ok,
  *
from actual;

-- 4) Commerce/event invariants.
with actual as (
  select
    (select count(*) from public.transactions) as transactions,
    (select coalesce(sum(amount),0) from public.transactions) as transaction_amount_sum,
    (select count(*) from public.transactions where status::text='settlement') as settled_transactions,
    (select count(*) from public.transactions where status::text='expire') as expired_transactions,
    (select count(*) from public.transactions t left join auth.users u on u.id=t.user_id where u.id is null) as orphan_transaction_users,
    (select count(*) from public.event_payments) as event_payments,
    (select coalesce(sum(amount),0) from public.event_payments) as event_payment_amount_sum,
    (select count(*) from public.event_payments where status='settlement') as settled_event_payments,
    (select count(*) from public.event_payments where status='expire') as expired_event_payments,
    (select count(*) from public.event_payments p left join auth.users u on u.id=p.user_id where u.id is null) as orphan_event_payment_users,
    (select count(*) from public.user_program_token_ledger) as token_ledger_rows,
    (select count(*) from public.tryout_event_participants) as event_participants,
    (select count(*) from public.tryout_event_participants p left join auth.users u on u.id=p.user_id where u.id is null) as orphan_event_participant_users,
    (select count(*) from public.voucher_claims) as voucher_claims
)
select
  transactions = 258 as transactions_ok,
  transaction_amount_sum = 6295630 as transaction_amount_ok,
  settled_transactions = 19 as settled_transactions_ok,
  expired_transactions = 239 as expired_transactions_ok,
  orphan_transaction_users = 0 as orphan_transaction_users_ok,
  event_payments = 64 as event_payments_ok,
  event_payment_amount_sum = 2240000 as event_payment_amount_ok,
  settled_event_payments = 31 as settled_event_payments_ok,
  expired_event_payments = 33 as expired_event_payments_ok,
  orphan_event_payment_users = 0 as orphan_event_payment_users_ok,
  token_ledger_rows = 0 as token_ledger_rows_ok,
  event_participants = 104 as event_participants_ok,
  orphan_event_participant_users = 0 as orphan_event_participant_users_ok,
  voucher_claims = 310 as voucher_claims_ok,
  *
from actual;

-- 5) Non-PII fingerprints. All six comparisons must be TRUE.
with actual as (
select
  md5(coalesce((select string_agg(id::text, ',' order by id) from auth.users),'')) as auth_user_id_hash,
  md5(coalesce((select string_agg(id::text || ':' || coalesce(tryout_quota,0)::text, ',' order by id) from public.profiles),'')) as profile_quota_hash,
  md5(coalesce((select string_agg(id::text || ':' || user_id::text || ':' || status::text || ':' || coalesce(total_score,0)::text, ',' order by id) from public.test_sessions),'')) as session_score_hash,
  md5(coalesce((select string_agg(id::text || ':' || session_id::text || ':' || question_id::text || ':' || coalesce(option_id::text,''), ',' order by id) from public.test_answers),'')) as answer_hash,
  md5(coalesce((select string_agg(id::text || ':' || user_id::text || ':' || order_id || ':' || amount::text || ':' || status::text, ',' order by id) from public.transactions),'')) as transaction_hash,
  md5(coalesce((select string_agg(id::text || ':' || user_id::text || ':' || order_id || ':' || amount::text || ':' || status, ',' order by id) from public.event_payments),'')) as event_payment_hash
)
select
  auth_user_id_hash = 'aba71998de87af045ca2fbc65c9b82eb' as auth_hash_ok,
  profile_quota_hash = 'b02379b4056903c5ad5a09971df5a2b9' as profile_quota_hash_ok,
  session_score_hash = 'b94db0fdf0fa3aadf8df9331114dd8bd' as session_score_hash_ok,
  answer_hash = 'ff5048c26f8af5f112d2e45faf37679a' as answer_hash_ok,
  transaction_hash = '5d21ca2bd700a8515df48edabc7c909c' as transaction_hash_ok,
  event_payment_hash = '433b67a09f9f3673bfa6703813e7cedf' as event_payment_hash_ok,
  *
from actual;

-- 6) Conflict-set visibility. Expected count is exactly 19 before cutover.
with conflict_names(name) as (values
 ('articles'),('audit_logs'),('exam_blueprint_rules'),('exam_sections'),('exams'),
 ('leaderboard_entries'),('learning_recommendations'),('materials'),
 ('notification_campaigns'),('notification_deliveries'),('organizations'),('products'),
 ('profiles'),('programs'),('question_stimuli'),('question_tags'),('question_versions'),
 ('questions'),('subjects')
)
select count(*) = 19 as all_conflict_tables_present,
       count(*) as conflict_tables_present
from conflict_names
where to_regclass('public.' || name) is not null;
