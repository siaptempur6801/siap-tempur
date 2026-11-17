-- Generated from canonical staging lpgrivowdcepcxradavu.
-- Runtime constraints A-P. Apply only after all runtime tables exist.
-- DO NOT apply to production before explicit final GO.
ALTER TABLE ONLY public.articles
  ADD CONSTRAINT articles_author_id_fkey FOREIGN KEY (author_id) REFERENCES profiles (id) ON DELETE SET NULL;

ALTER TABLE ONLY public.articles
  ADD CONSTRAINT articles_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.articles
  ADD CONSTRAINT articles_published_at_check CHECK (status = 'published'::text AND published_at IS NOT NULL OR status <> 'published'::text);

ALTER TABLE ONLY public.articles
  ADD CONSTRAINT articles_slug_key UNIQUE (slug);

ALTER TABLE ONLY public.articles
  ADD CONSTRAINT articles_status_check CHECK (status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text]));

ALTER TABLE ONLY public.attempt_answer_options
  ADD CONSTRAINT attempt_answer_options_pkey PRIMARY KEY (attempt_answer_id, option_id);

ALTER TABLE ONLY public.attempt_answer_options
  ADD CONSTRAINT fk_attempt_answer_options_attempt_answer_id_attempt_answers FOREIGN KEY (attempt_answer_id) REFERENCES attempt_answers (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.attempt_answer_options
  ADD CONSTRAINT fk_attempt_answer_options_option_id_question_options FOREIGN KEY (option_id) REFERENCES question_options (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.attempt_answers
  ADD CONSTRAINT attempt_answers_attempt_question_id_key UNIQUE (attempt_question_id);

ALTER TABLE ONLY public.attempt_answers
  ADD CONSTRAINT attempt_answers_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.attempt_answers
  ADD CONSTRAINT fk_attempt_answers_attempt_question_id_attempt_questions FOREIGN KEY (attempt_question_id) REFERENCES attempt_questions (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.attempt_answers
  ADD CONSTRAINT fk_attempt_answers_selected_option_id_question_options FOREIGN KEY (selected_option_id) REFERENCES question_options (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.attempt_events
  ADD CONSTRAINT attempt_events_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES exam_attempts (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.attempt_events
  ADD CONSTRAINT attempt_events_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.attempt_events
  ADD CONSTRAINT attempt_events_question_id_fkey FOREIGN KEY (question_id) REFERENCES questions (id) ON DELETE SET NULL;

ALTER TABLE ONLY public.attempt_questions
  ADD CONSTRAINT attempt_questions_attempt_id_position_key UNIQUE (attempt_id, "position");

ALTER TABLE ONLY public.attempt_questions
  ADD CONSTRAINT attempt_questions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.attempt_questions
  ADD CONSTRAINT fk_attempt_questions_attempt_id_exam_attempts FOREIGN KEY (attempt_id) REFERENCES exam_attempts (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.attempt_questions
  ADD CONSTRAINT fk_attempt_questions_question_id_questions FOREIGN KEY (question_id) REFERENCES questions (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.attempt_questions
  ADD CONSTRAINT fk_attempt_questions_section_id_exam_sections FOREIGN KEY (section_id) REFERENCES exam_sections (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.attempt_scores
  ADD CONSTRAINT attempt_scores_attempt_id_subject_id_key UNIQUE (attempt_id, subject_id);

ALTER TABLE ONLY public.attempt_scores
  ADD CONSTRAINT attempt_scores_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.attempt_scores
  ADD CONSTRAINT fk_attempt_scores_attempt_id_exam_attempts FOREIGN KEY (attempt_id) REFERENCES exam_attempts (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.attempt_scores
  ADD CONSTRAINT fk_attempt_scores_subject_id_subjects FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.attempt_section_states
  ADD CONSTRAINT attempt_section_states_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES exam_attempts (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.attempt_section_states
  ADD CONSTRAINT attempt_section_states_attempt_id_section_id_key UNIQUE (attempt_id, section_id);

ALTER TABLE ONLY public.attempt_section_states
  ADD CONSTRAINT attempt_section_states_duration_used_seconds_check CHECK (duration_used_seconds >= 0);

ALTER TABLE ONLY public.attempt_section_states
  ADD CONSTRAINT attempt_section_states_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.attempt_section_states
  ADD CONSTRAINT attempt_section_states_section_id_fkey FOREIGN KEY (section_id) REFERENCES exam_sections (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.attempt_section_states
  ADD CONSTRAINT attempt_section_states_status_check CHECK (status = ANY (ARRAY['locked'::text, 'active'::text, 'completed'::text]));

ALTER TABLE ONLY public.audit_logs
  ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.audit_logs
  ADD CONSTRAINT fk_audit_logs_actor_user_id_profiles FOREIGN KEY (actor_user_id) REFERENCES profiles (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.certificate_templates
  ADD CONSTRAINT certificate_templates_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.certificates
  ADD CONSTRAINT certificates_certificate_number_key UNIQUE (certificate_number);

ALTER TABLE ONLY public.certificates
  ADD CONSTRAINT certificates_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.certificates
  ADD CONSTRAINT certificates_verification_code_key UNIQUE (verification_code);

ALTER TABLE ONLY public.certificates
  ADD CONSTRAINT fk_certificates_event_id_events FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.certificates
  ADD CONSTRAINT fk_certificates_template_id_certificate_templates FOREIGN KEY (template_id) REFERENCES certificate_templates (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.certificates
  ADD CONSTRAINT fk_certificates_user_id_profiles FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.class_members
  ADD CONSTRAINT class_members_pkey PRIMARY KEY (class_id, user_id);

ALTER TABLE ONLY public.class_members
  ADD CONSTRAINT fk_class_members_class_id_classes FOREIGN KEY (class_id) REFERENCES classes (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.class_members
  ADD CONSTRAINT fk_class_members_user_id_profiles FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.classes
  ADD CONSTRAINT classes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.classes
  ADD CONSTRAINT fk_classes_organization_id_organizations FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.classes
  ADD CONSTRAINT fk_classes_teacher_id_profiles FOREIGN KEY (teacher_id) REFERENCES profiles (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.content_reviews
  ADD CONSTRAINT content_reviews_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.content_reviews
  ADD CONSTRAINT content_reviews_stage_workflow_check CHECK (review_stage IS NULL OR (review_stage = ANY (ARRAY['editorial'::text, 'academic'::text, 'technical_qa'::text])));

ALTER TABLE ONLY public.content_reviews
  ADD CONSTRAINT content_reviews_status_workflow_check CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'revision_required'::text, 'rejected'::text, 'cancelled'::text]));

ALTER TABLE ONLY public.content_reviews
  ADD CONSTRAINT fk_content_reviews_reviewer_id_profiles FOREIGN KEY (reviewer_id) REFERENCES profiles (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.entitlements
  ADD CONSTRAINT entitlements_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.entitlements
  ADD CONSTRAINT fk_entitlements_feature_id_features FOREIGN KEY (feature_id) REFERENCES features (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.entitlements
  ADD CONSTRAINT fk_entitlements_user_id_profiles FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.event_products
  ADD CONSTRAINT event_products_event_id_fkey FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.event_products
  ADD CONSTRAINT event_products_pkey PRIMARY KEY (product_id);

ALTER TABLE ONLY public.event_products
  ADD CONSTRAINT event_products_product_id_fkey FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.event_products
  ADD CONSTRAINT event_products_session_id_fkey FOREIGN KEY (session_id) REFERENCES event_sessions (id) ON DELETE SET NULL;

ALTER TABLE ONLY public.event_rankings
  ADD CONSTRAINT event_rankings_pkey PRIMARY KEY (event_id, user_id);

ALTER TABLE ONLY public.event_rankings
  ADD CONSTRAINT fk_event_rankings_attempt_id_exam_attempts FOREIGN KEY (attempt_id) REFERENCES exam_attempts (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.event_rankings
  ADD CONSTRAINT fk_event_rankings_event_id_events FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.event_rankings
  ADD CONSTRAINT fk_event_rankings_user_id_profiles FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.event_registrations
  ADD CONSTRAINT event_registrations_event_id_user_id_key UNIQUE (event_id, user_id);

ALTER TABLE ONLY public.event_registrations
  ADD CONSTRAINT event_registrations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.event_registrations
  ADD CONSTRAINT event_registrations_registration_number_key UNIQUE (registration_number);

ALTER TABLE ONLY public.event_registrations
  ADD CONSTRAINT fk_event_registrations_event_id_events FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.event_registrations
  ADD CONSTRAINT fk_event_registrations_order_id_orders FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.event_registrations
  ADD CONSTRAINT fk_event_registrations_session_id_event_sessions FOREIGN KEY (session_id) REFERENCES event_sessions (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.event_registrations
  ADD CONSTRAINT fk_event_registrations_user_id_profiles FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.event_sessions
  ADD CONSTRAINT event_sessions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.event_sessions
  ADD CONSTRAINT fk_event_sessions_event_id_events FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.event_sessions
  ADD CONSTRAINT fk_event_sessions_exam_id_exams FOREIGN KEY (exam_id) REFERENCES exams (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.events
  ADD CONSTRAINT events_code_key UNIQUE (code);

ALTER TABLE ONLY public.events
  ADD CONSTRAINT events_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.events
  ADD CONSTRAINT events_slug_key UNIQUE (slug);

ALTER TABLE ONLY public.events
  ADD CONSTRAINT fk_events_program_id_programs FOREIGN KEY (program_id) REFERENCES programs (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.events
  ADD CONSTRAINT fk_events_track_id_tracks FOREIGN KEY (track_id) REFERENCES tracks (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.exam_attempts
  ADD CONSTRAINT exam_attempts_exam_id_user_id_attempt_number_key UNIQUE (exam_id, user_id, attempt_number);

ALTER TABLE ONLY public.exam_attempts
  ADD CONSTRAINT exam_attempts_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.exam_attempts
  ADD CONSTRAINT fk_exam_attempts_exam_id_exams FOREIGN KEY (exam_id) REFERENCES exams (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.exam_attempts
  ADD CONSTRAINT fk_exam_attempts_user_id_profiles FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.exam_blueprint_rules
  ADD CONSTRAINT exam_blueprint_rules_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.exam_blueprint_rules
  ADD CONSTRAINT fk_exam_blueprint_rules_blueprint_id_exam_blueprints FOREIGN KEY (blueprint_id) REFERENCES exam_blueprints (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.exam_blueprint_rules
  ADD CONSTRAINT fk_exam_blueprint_rules_knowledge_node_id_knowledge_nodes FOREIGN KEY (knowledge_node_id) REFERENCES knowledge_nodes (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.exam_blueprint_rules
  ADD CONSTRAINT fk_exam_blueprint_rules_subject_id_subjects FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.exam_blueprints
  ADD CONSTRAINT exam_blueprints_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.exam_blueprints
  ADD CONSTRAINT fk_exam_blueprints_period_id_periods FOREIGN KEY (period_id) REFERENCES periods (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.exam_blueprints
  ADD CONSTRAINT fk_exam_blueprints_program_id_programs FOREIGN KEY (program_id) REFERENCES programs (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.exam_blueprints
  ADD CONSTRAINT fk_exam_blueprints_track_id_tracks FOREIGN KEY (track_id) REFERENCES tracks (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.exam_question_items
  ADD CONSTRAINT exam_question_items_exam_id_position_key UNIQUE (exam_id, "position");

ALTER TABLE ONLY public.exam_question_items
  ADD CONSTRAINT exam_question_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.exam_question_items
  ADD CONSTRAINT fk_exam_question_items_exam_id_exams FOREIGN KEY (exam_id) REFERENCES exams (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.exam_question_items
  ADD CONSTRAINT fk_exam_question_items_question_id_questions FOREIGN KEY (question_id) REFERENCES questions (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.exam_question_items
  ADD CONSTRAINT fk_exam_question_items_section_id_exam_sections FOREIGN KEY (section_id) REFERENCES exam_sections (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.exam_rules
  ADD CONSTRAINT exam_rules_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.exam_rules
  ADD CONSTRAINT fk_exam_rules_period_id_periods FOREIGN KEY (period_id) REFERENCES periods (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.exam_rules
  ADD CONSTRAINT fk_exam_rules_program_id_programs FOREIGN KEY (program_id) REFERENCES programs (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.exam_rules
  ADD CONSTRAINT fk_exam_rules_track_id_tracks FOREIGN KEY (track_id) REFERENCES tracks (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.exam_sections
  ADD CONSTRAINT exam_sections_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.exam_sections
  ADD CONSTRAINT fk_exam_sections_exam_id_exams FOREIGN KEY (exam_id) REFERENCES exams (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.exam_sections
  ADD CONSTRAINT fk_exam_sections_subject_id_subjects FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.exam_statistics
  ADD CONSTRAINT exam_statistics_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES exams (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.exam_statistics
  ADD CONSTRAINT exam_statistics_pass_rate_ck CHECK (pass_rate >= 0::numeric AND pass_rate <= 1::numeric);

ALTER TABLE ONLY public.exam_statistics
  ADD CONSTRAINT exam_statistics_pkey PRIMARY KEY (exam_id);

ALTER TABLE ONLY public.exam_types
  ADD CONSTRAINT exam_types_code_key UNIQUE (code);

ALTER TABLE ONLY public.exam_types
  ADD CONSTRAINT exam_types_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.exams
  ADD CONSTRAINT exams_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.exams
  ADD CONSTRAINT exams_required_feature_id_fkey FOREIGN KEY (required_feature_id) REFERENCES features (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.exams
  ADD CONSTRAINT exams_slug_key UNIQUE (slug);

ALTER TABLE ONLY public.exams
  ADD CONSTRAINT exams_token_cost_ck CHECK (token_cost >= 0);

ALTER TABLE ONLY public.exams
  ADD CONSTRAINT fk_exams_blueprint_id_exam_blueprints FOREIGN KEY (blueprint_id) REFERENCES exam_blueprints (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.exams
  ADD CONSTRAINT fk_exams_created_by_profiles FOREIGN KEY (created_by) REFERENCES profiles (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.exams
  ADD CONSTRAINT fk_exams_exam_rule_id_exam_rules FOREIGN KEY (exam_rule_id) REFERENCES exam_rules (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.exams
  ADD CONSTRAINT fk_exams_exam_type_id_exam_types FOREIGN KEY (exam_type_id) REFERENCES exam_types (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.exams
  ADD CONSTRAINT fk_exams_period_id_periods FOREIGN KEY (period_id) REFERENCES periods (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.exams
  ADD CONSTRAINT fk_exams_program_id_programs FOREIGN KEY (program_id) REFERENCES programs (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.exams
  ADD CONSTRAINT fk_exams_track_id_tracks FOREIGN KEY (track_id) REFERENCES tracks (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.feature_flag_overrides
  ADD CONSTRAINT feature_flag_overrides_flag_id_subject_type_subject_id_key UNIQUE (flag_id, subject_type, subject_id);

ALTER TABLE ONLY public.feature_flag_overrides
  ADD CONSTRAINT feature_flag_overrides_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.feature_flag_overrides
  ADD CONSTRAINT fk_feature_flag_overrides_flag_id_feature_flags FOREIGN KEY (flag_id) REFERENCES feature_flags (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.feature_flags
  ADD CONSTRAINT feature_flags_key_key UNIQUE (key);

ALTER TABLE ONLY public.feature_flags
  ADD CONSTRAINT feature_flags_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.features
  ADD CONSTRAINT features_code_key UNIQUE (code);

ALTER TABLE ONLY public.features
  ADD CONSTRAINT features_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.generated_reports
  ADD CONSTRAINT generated_reports_generated_by_fkey FOREIGN KEY (generated_by) REFERENCES profiles (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.generated_reports
  ADD CONSTRAINT generated_reports_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.generated_reports
  ADD CONSTRAINT generated_reports_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.knowledge_node_paths
  ADD CONSTRAINT fk_knowledge_node_paths_ancestor_id_knowledge_nodes FOREIGN KEY (ancestor_id) REFERENCES knowledge_nodes (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.knowledge_node_paths
  ADD CONSTRAINT fk_knowledge_node_paths_descendant_id_knowledge_nodes FOREIGN KEY (descendant_id) REFERENCES knowledge_nodes (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.knowledge_node_paths
  ADD CONSTRAINT knowledge_node_paths_pkey PRIMARY KEY (ancestor_id, descendant_id);

ALTER TABLE ONLY public.knowledge_nodes
  ADD CONSTRAINT fk_knowledge_nodes_parent_id_knowledge_nodes FOREIGN KEY (parent_id) REFERENCES knowledge_nodes (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.knowledge_nodes
  ADD CONSTRAINT fk_knowledge_nodes_subject_id_subjects FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.knowledge_nodes
  ADD CONSTRAINT knowledge_nodes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.knowledge_nodes
  ADD CONSTRAINT knowledge_nodes_subject_id_slug_key UNIQUE (subject_id, slug);

ALTER TABLE ONLY public.leaderboard_entries
  ADD CONSTRAINT fk_leaderboard_entries_leaderboard_id_leaderboards FOREIGN KEY (leaderboard_id) REFERENCES leaderboards (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.leaderboard_entries
  ADD CONSTRAINT fk_leaderboard_entries_user_id_profiles FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.leaderboard_entries
  ADD CONSTRAINT leaderboard_entries_pkey PRIMARY KEY (leaderboard_id, user_id);

ALTER TABLE ONLY public.leaderboards
  ADD CONSTRAINT fk_leaderboards_program_id_programs FOREIGN KEY (program_id) REFERENCES programs (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.leaderboards
  ADD CONSTRAINT fk_leaderboards_track_id_tracks FOREIGN KEY (track_id) REFERENCES tracks (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.leaderboards
  ADD CONSTRAINT leaderboards_code_key UNIQUE (code);

ALTER TABLE ONLY public.leaderboards
  ADD CONSTRAINT leaderboards_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.learning_recommendations
  ADD CONSTRAINT fk_learning_recommendations_knowledge_node_id_knowledge_nodes FOREIGN KEY (knowledge_node_id) REFERENCES knowledge_nodes (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.learning_recommendations
  ADD CONSTRAINT fk_learning_recommendations_track_id_tracks FOREIGN KEY (track_id) REFERENCES tracks (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.learning_recommendations
  ADD CONSTRAINT fk_learning_recommendations_user_id_profiles FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.learning_recommendations
  ADD CONSTRAINT learning_recommendations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.material_knowledge_nodes
  ADD CONSTRAINT fk_material_knowledge_nodes_knowledge_node_id_knowledge_nodes FOREIGN KEY (knowledge_node_id) REFERENCES knowledge_nodes (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.material_knowledge_nodes
  ADD CONSTRAINT fk_material_knowledge_nodes_material_id_materials FOREIGN KEY (material_id) REFERENCES materials (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.material_knowledge_nodes
  ADD CONSTRAINT material_knowledge_nodes_pkey PRIMARY KEY (material_id, knowledge_node_id);

ALTER TABLE ONLY public.materials
  ADD CONSTRAINT fk_materials_author_id_profiles FOREIGN KEY (author_id) REFERENCES profiles (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.materials
  ADD CONSTRAINT fk_materials_reviewer_id_profiles FOREIGN KEY (reviewer_id) REFERENCES profiles (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.materials
  ADD CONSTRAINT materials_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.materials
  ADD CONSTRAINT materials_required_feature_id_fkey FOREIGN KEY (required_feature_id) REFERENCES features (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.materials
  ADD CONSTRAINT materials_slug_key UNIQUE (slug);

ALTER TABLE ONLY public.notification_campaigns
  ADD CONSTRAINT fk_notification_campaigns_created_by_profiles FOREIGN KEY (created_by) REFERENCES profiles (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.notification_campaigns
  ADD CONSTRAINT notification_campaigns_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.notification_deliveries
  ADD CONSTRAINT fk_notification_deliveries_campaign_id_notification_campaigns FOREIGN KEY (campaign_id) REFERENCES notification_campaigns (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.notification_deliveries
  ADD CONSTRAINT fk_notification_deliveries_user_id_profiles FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.notification_deliveries
  ADD CONSTRAINT notification_deliveries_campaign_id_user_id_key UNIQUE (campaign_id, user_id);

ALTER TABLE ONLY public.notification_deliveries
  ADD CONSTRAINT notification_deliveries_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.notifications
  ADD CONSTRAINT fk_notifications_user_id_profiles FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.notifications
  ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.order_items
  ADD CONSTRAINT fk_order_items_order_id_orders FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.order_items
  ADD CONSTRAINT fk_order_items_product_id_products FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.order_items
  ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.orders
  ADD CONSTRAINT fk_orders_user_id_profiles FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.orders
  ADD CONSTRAINT orders_amount_ck CHECK (subtotal >= 0::numeric AND discount_amount >= 0::numeric AND total_amount >= 0::numeric);

ALTER TABLE ONLY public.orders
  ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);

ALTER TABLE ONLY public.orders
  ADD CONSTRAINT orders_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.organization_exam_assignments
  ADD CONSTRAINT fk_organization_exam_assignments_assigned_by_profiles FOREIGN KEY (assigned_by) REFERENCES profiles (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.organization_exam_assignments
  ADD CONSTRAINT fk_organization_exam_assignments_class_id_classes FOREIGN KEY (class_id) REFERENCES classes (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.organization_exam_assignments
  ADD CONSTRAINT fk_organization_exam_assignments_exam_id_exams FOREIGN KEY (exam_id) REFERENCES exams (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.organization_exam_assignments
  ADD CONSTRAINT fk_organization_exam_assignments_organization_id_organizations FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.organization_exam_assignments
  ADD CONSTRAINT organization_exam_assignments_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.organization_licenses
  ADD CONSTRAINT fk_organization_licenses_organization_id_organizations FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.organization_licenses
  ADD CONSTRAINT fk_organization_licenses_product_id_products FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.organization_licenses
  ADD CONSTRAINT organization_licenses_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.organization_members
  ADD CONSTRAINT fk_organization_members_organization_id_organizations FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.organization_members
  ADD CONSTRAINT fk_organization_members_user_id_profiles FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.organization_members
  ADD CONSTRAINT organization_members_organization_id_user_id_key UNIQUE (organization_id, user_id);

ALTER TABLE ONLY public.organization_members
  ADD CONSTRAINT organization_members_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.organizations
  ADD CONSTRAINT organizations_code_key UNIQUE (code);

ALTER TABLE ONLY public.organizations
  ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.payment_webhook_events
  ADD CONSTRAINT payment_webhook_events_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.payment_webhook_events
  ADD CONSTRAINT payment_webhook_events_provider_event_id_key UNIQUE (provider, event_id);

ALTER TABLE ONLY public.payments
  ADD CONSTRAINT fk_payments_order_id_orders FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.payments
  ADD CONSTRAINT payments_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.periods
  ADD CONSTRAINT periods_code_key UNIQUE (code);

ALTER TABLE ONLY public.periods
  ADD CONSTRAINT periods_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.permissions
  ADD CONSTRAINT permissions_code_key UNIQUE (code);

ALTER TABLE ONLY public.permissions
  ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.product_features
  ADD CONSTRAINT fk_product_features_feature_id_features FOREIGN KEY (feature_id) REFERENCES features (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.product_features
  ADD CONSTRAINT fk_product_features_product_id_products FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.product_features
  ADD CONSTRAINT product_features_pkey PRIMARY KEY (product_id, feature_id);

ALTER TABLE ONLY public.product_prices
  ADD CONSTRAINT fk_product_prices_product_id_products FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.product_prices
  ADD CONSTRAINT product_prices_amount_ck CHECK (amount >= 0::numeric);

ALTER TABLE ONLY public.product_prices
  ADD CONSTRAINT product_prices_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.product_wallet_grants
  ADD CONSTRAINT product_wallet_grants_amount_check CHECK (amount > 0);

ALTER TABLE ONLY public.product_wallet_grants
  ADD CONSTRAINT product_wallet_grants_pkey PRIMARY KEY (product_id, wallet_type);

ALTER TABLE ONLY public.product_wallet_grants
  ADD CONSTRAINT product_wallet_grants_product_id_fkey FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.products
  ADD CONSTRAINT fk_products_program_id_programs FOREIGN KEY (program_id) REFERENCES programs (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.products
  ADD CONSTRAINT fk_products_track_id_tracks FOREIGN KEY (track_id) REFERENCES tracks (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.products
  ADD CONSTRAINT products_code_key UNIQUE (code);

ALTER TABLE ONLY public.products
  ADD CONSTRAINT products_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.profiles
  ADD CONSTRAINT profiles_auth_user_fk FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.profiles
  ADD CONSTRAINT profiles_bio_length_check CHECK (bio IS NULL OR char_length(bio) <= 500);

ALTER TABLE ONLY public.profiles
  ADD CONSTRAINT profiles_education_level_length_check CHECK (education_level IS NULL OR char_length(education_level) <= 80);

ALTER TABLE ONLY public.profiles
  ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.profiles
  ADD CONSTRAINT profiles_target_instance_length_check CHECK (target_instance IS NULL OR char_length(target_instance) <= 120);

ALTER TABLE ONLY public.programs
  ADD CONSTRAINT programs_code_key UNIQUE (code);

ALTER TABLE ONLY public.programs
  ADD CONSTRAINT programs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.programs
  ADD CONSTRAINT programs_slug_key UNIQUE (slug);

ALTER TABLE ONLY public.promotion_products
  ADD CONSTRAINT fk_promotion_products_product_id_products FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.promotion_products
  ADD CONSTRAINT fk_promotion_products_promotion_id_promotions FOREIGN KEY (promotion_id) REFERENCES promotions (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.promotion_products
  ADD CONSTRAINT promotion_products_pkey PRIMARY KEY (promotion_id, product_id);

ALTER TABLE ONLY public.promotion_redemptions
  ADD CONSTRAINT fk_promotion_redemptions_order_id_orders FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.promotion_redemptions
  ADD CONSTRAINT fk_promotion_redemptions_promotion_id_promotions FOREIGN KEY (promotion_id) REFERENCES promotions (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.promotion_redemptions
  ADD CONSTRAINT fk_promotion_redemptions_user_id_profiles FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.promotion_redemptions
  ADD CONSTRAINT promotion_redemptions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.promotions
  ADD CONSTRAINT promotions_code_key UNIQUE (code);

ALTER TABLE ONLY public.promotions
  ADD CONSTRAINT promotions_pkey PRIMARY KEY (id);
