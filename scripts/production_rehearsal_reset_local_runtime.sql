-- Siap Tempur Production-Clone Rehearsal
-- LOCAL ONLY. Run only against 127.0.0.1:54322.
-- Purpose: remove staging runtime/QA residue after restoring canonical staging data,
-- while preserving canonical master/content data required for production rehearsal.
BEGIN;
TRUNCATE TABLE
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
RESTART IDENTITY
CASCADE;
COMMIT;

-- Verification: runtime tables must be empty while canonical content remains.
SELECT
  (
    SELECT
      count(*)
    FROM
      public.profiles) AS technical_profiles,
  (
    SELECT
      count(*)
    FROM
      public.questions) AS questions,
  (
    SELECT
      count(*)
    FROM
      public.question_versions) AS question_versions,
  (
    SELECT
      count(*)
    FROM
      public.exams) AS exams,
  (
    SELECT
      count(*)
    FROM
      public.content_reviews) AS content_reviews,
  (
    SELECT
      count(*)
    FROM
      public.exam_attempts) AS exam_attempts,
  (
    SELECT
      count(*)
    FROM
      public.orders) AS orders,
  (
    SELECT
      count(*)
    FROM
      public.wallets) AS wallets,
  (
    SELECT
      count(*)
    FROM
      public.user_tracks) AS user_tracks,
  (
    SELECT
      count(*)
    FROM
      public.events) AS events,
  (
    SELECT
      count(*)
    FROM
      public.audit_logs) AS audit_logs;
