-- Siap Tempur Production-Clone Rehearsal
-- LOCAL ONLY. Run only against 127.0.0.1:54322.
-- Purpose: remove staging runtime/QA residue after restoring canonical staging data,
-- while preserving canonical master/content data required for production rehearsal.

begin;

truncate table
  public.attempt_answer_options,
  public.attempt_answers,
  public.attempt_events,
  public.attempt_questions,
  public.attempt_scores,
  public.attempt_section_states,
  public.exam_attempts,
  public.remedial_session_items,
  public.remedial_sessions,
  public.user_wrong_questions,
  public.wrong_question_reviews,
  public.learning_recommendations,
  public.user_activity_daily,
  public.user_knowledge_progress,
  public.user_question_bookmarks,
  public.user_question_notes,
  public.user_question_state,
  public.user_readiness,
  public.user_streaks,
  public.user_subject_progress,
  public.user_track_preferences,
  public.user_tracks,
  public.user_devices,
  public.session_activity,
  public.wallet_transactions,
  public.wallets,
  public.product_wallet_grants,
  public.entitlements,
  public.payment_webhook_events,
  public.payments,
  public.order_items,
  public.orders,
  public.promotion_redemptions,
  public.event_rankings,
  public.event_registrations,
  public.event_sessions,
  public.event_products,
  public.events,
  public.leaderboard_entries,
  public.certificates,
  public.class_members,
  public.classes,
  public.organization_exam_assignments,
  public.organization_members,
  public.organization_licenses,
  public.generated_reports,
  public.notifications,
  public.notification_deliveries,
  public.audit_logs,
  public.user_roles
restart identity cascade;

commit;

-- Verification: runtime tables must be empty while canonical content remains.
select
  (select count(*) from public.profiles) as technical_profiles,
  (select count(*) from public.questions) as questions,
  (select count(*) from public.question_versions) as question_versions,
  (select count(*) from public.exams) as exams,
  (select count(*) from public.content_reviews) as content_reviews,
  (select count(*) from public.exam_attempts) as exam_attempts,
  (select count(*) from public.orders) as orders,
  (select count(*) from public.wallets) as wallets,
  (select count(*) from public.user_tracks) as user_tracks,
  (select count(*) from public.events) as events,
  (select count(*) from public.audit_logs) as audit_logs;
