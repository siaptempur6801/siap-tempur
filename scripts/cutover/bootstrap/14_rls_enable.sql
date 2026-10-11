-- Generated from canonical staging lpgrivowdcepcxradavu.
-- Enable RLS on all 98 runtime public tables. 0 tables use FORCE RLS.
-- DO NOT apply to production before explicit final GO.
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.attempt_answer_options ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.attempt_answers ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.attempt_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.attempt_questions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.attempt_scores ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.attempt_section_states ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.certificate_templates ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.class_members ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.content_reviews ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.event_products ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.event_rankings ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.event_sessions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.exam_blueprint_rules ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.exam_blueprints ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.exam_question_items ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.exam_rules ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.exam_sections ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.exam_statistics ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.exam_types ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.feature_flag_overrides ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.features ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.generated_reports ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.knowledge_node_paths ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.knowledge_nodes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.leaderboard_entries ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.leaderboards ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.learning_recommendations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.material_knowledge_nodes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.notification_campaigns ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.organization_exam_assignments ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.organization_licenses ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.periods ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.product_features ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.product_prices ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.product_wallet_grants ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.promotion_products ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.promotion_redemptions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.question_assets ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.question_explanations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.question_knowledge_nodes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.question_options ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.question_reports ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.question_statistics ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.question_stimuli ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.question_tags ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.question_versions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.remedial_session_items ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.remedial_sessions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.session_activity ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.track_periods ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_activity_daily ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_knowledge_progress ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_question_bookmarks ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_question_notes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_question_state ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_readiness ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_subject_progress ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_track_preferences ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_tracks ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_wrong_questions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.wrong_question_reviews ENABLE ROW LEVEL SECURITY;
