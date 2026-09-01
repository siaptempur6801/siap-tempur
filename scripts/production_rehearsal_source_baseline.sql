-- Siap Tempur Production-Clone Rehearsal
-- SOURCE ONLY / READ-ONLY queries.
-- Target source project: llnttutwhtvxtdktiizo
-- Never add INSERT/UPDATE/DELETE/DDL to this file.

-- 1) Identity + quota invariants
with a as (select id from auth.users), p as (select id from public.profiles)
select
 (select count(*) from a) as auth_users,
 (select count(*) from p) as profiles,
 (select count(*) from a join p using(id)) as matching_uuid,
 (select count(*) from a left join p using(id) where p.id is null) as auth_without_profile,
 (select count(*) from p left join a using(id) where a.id is null) as profile_without_auth,
 (select count(*) from public.user_programs) as user_programs,
 (select count(distinct user_id) from public.user_programs) as users_with_program,
 (select coalesce(sum(tryout_quota),0) from public.profiles) as profile_quota_sum,
 (select coalesce(sum(tryout_quota),0) from public.user_programs) as program_quota_sum;

-- 2) Enrollment snapshot
select p.slug, p.name, p.id,
       count(up.*) as user_program_rows,
       count(distinct up.user_id) as users,
       coalesce(sum(up.tryout_quota),0) as quota_sum
from public.programs p
left join public.user_programs up on up.program_id=p.id
group by p.slug,p.name,p.id
order by p.slug;

-- 3) Exam/history integrity + score aggregates
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
 (select coalesce(sum(score_tkp),0) from public.test_sessions where status::text='completed') as tkp_score_sum;

-- 4) Session-state distribution
select coalesce(session_kind,'<null>') as session_kind,
       mode::text as mode,
       status::text as status,
       count(*) as rows
from public.test_sessions
group by coalesce(session_kind,'<null>'), mode::text, status::text
order by session_kind, mode, status;

-- 5) Commerce/event invariants
select
 (select count(*) from public.transactions) as transactions,
 (select coalesce(sum(amount),0) from public.transactions) as transaction_amount_sum,
 (select jsonb_object_agg(status::text,cnt) from (select status, count(*) cnt from public.transactions group by status) s) as transaction_status_counts,
 (select count(*) from public.transactions t left join auth.users u on u.id=t.user_id where u.id is null) as orphan_transaction_users,
 (select count(*) from public.event_payments) as event_payments,
 (select coalesce(sum(amount),0) from public.event_payments) as event_payment_amount_sum,
 (select jsonb_object_agg(status,cnt) from (select status, count(*) cnt from public.event_payments group by status) s) as event_payment_status_counts,
 (select count(*) from public.event_payments p left join auth.users u on u.id=p.user_id where u.id is null) as orphan_event_payment_users,
 (select count(*) from public.user_program_token_ledger) as token_ledger_rows,
 (select coalesce(sum(delta),0) from public.user_program_token_ledger) as token_ledger_delta_sum,
 (select count(*) from public.tryout_event_participants) as event_participants,
 (select count(*) from public.tryout_event_participants p left join auth.users u on u.id=p.user_id where u.id is null) as orphan_event_participant_users,
 (select count(*) from public.voucher_claims) as voucher_claims;

-- 6) Deterministic non-PII fingerprints
select
  md5(coalesce((select string_agg(id::text, ',' order by id) from auth.users),'')) as auth_user_id_hash,
  md5(coalesce((select string_agg(id::text || ':' || coalesce(tryout_quota,0)::text, ',' order by id) from public.profiles),'')) as profile_quota_hash,
  md5(coalesce((select string_agg(id::text || ':' || user_id::text || ':' || status::text || ':' || coalesce(total_score,0)::text, ',' order by id) from public.test_sessions),'')) as session_score_hash,
  md5(coalesce((select string_agg(id::text || ':' || session_id::text || ':' || question_id::text || ':' || coalesce(option_id::text,''), ',' order by id) from public.test_answers),'')) as answer_hash,
  md5(coalesce((select string_agg(id::text || ':' || user_id::text || ':' || order_id || ':' || amount::text || ':' || status::text, ',' order by id) from public.transactions),'')) as transaction_hash,
  md5(coalesce((select string_agg(id::text || ':' || user_id::text || ':' || order_id || ':' || amount::text || ':' || status, ',' order by id) from public.event_payments),'')) as event_payment_hash;
