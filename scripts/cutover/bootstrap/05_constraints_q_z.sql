-- Generated from canonical staging lpgrivowdcepcxradavu.
-- Runtime constraints Q-Z. Apply only after all runtime tables exist.
-- DO NOT apply to production before explicit final GO.
ALTER TABLE ONLY public.question_assets
  ADD CONSTRAINT fk_question_assets_question_id_questions FOREIGN KEY (question_id) REFERENCES questions (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.question_assets
  ADD CONSTRAINT question_assets_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.question_explanations
  ADD CONSTRAINT fk_question_explanations_question_id_questions FOREIGN KEY (question_id) REFERENCES questions (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.question_explanations
  ADD CONSTRAINT question_explanations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.question_knowledge_nodes
  ADD CONSTRAINT fk_question_knowledge_nodes_knowledge_node_id_knowledge_nodes FOREIGN KEY (knowledge_node_id) REFERENCES knowledge_nodes (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.question_knowledge_nodes
  ADD CONSTRAINT fk_question_knowledge_nodes_question_id_questions FOREIGN KEY (question_id) REFERENCES questions (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.question_knowledge_nodes
  ADD CONSTRAINT question_knowledge_nodes_pkey PRIMARY KEY (question_id, knowledge_node_id);

ALTER TABLE ONLY public.question_options
  ADD CONSTRAINT fk_question_options_question_id_questions FOREIGN KEY (question_id) REFERENCES questions (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.question_options
  ADD CONSTRAINT question_options_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.question_options
  ADD CONSTRAINT question_options_question_id_option_key_key UNIQUE (question_id, option_key);

ALTER TABLE ONLY public.question_reports
  ADD CONSTRAINT fk_question_reports_assigned_to_profiles FOREIGN KEY (assigned_to) REFERENCES profiles (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.question_reports
  ADD CONSTRAINT fk_question_reports_attempt_id_exam_attempts FOREIGN KEY (attempt_id) REFERENCES exam_attempts (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.question_reports
  ADD CONSTRAINT fk_question_reports_question_id_questions FOREIGN KEY (question_id) REFERENCES questions (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.question_reports
  ADD CONSTRAINT fk_question_reports_user_id_profiles FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.question_reports
  ADD CONSTRAINT question_reports_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.question_statistics
  ADD CONSTRAINT question_statistics_accuracy_ck CHECK (accuracy >= 0::numeric AND accuracy <= 1::numeric);

ALTER TABLE ONLY public.question_statistics
  ADD CONSTRAINT question_statistics_pkey PRIMARY KEY (question_id);

ALTER TABLE ONLY public.question_statistics
  ADD CONSTRAINT question_statistics_question_id_fkey FOREIGN KEY (question_id) REFERENCES questions (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.question_stimuli
  ADD CONSTRAINT question_stimuli_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.question_stimuli
  ADD CONSTRAINT question_stimuli_program_id_fkey FOREIGN KEY (program_id) REFERENCES programs (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.question_stimuli
  ADD CONSTRAINT question_stimuli_program_id_track_id_subject_id_stimulus_co_key UNIQUE (program_id, track_id, subject_id, stimulus_code);

ALTER TABLE ONLY public.question_stimuli
  ADD CONSTRAINT question_stimuli_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.question_stimuli
  ADD CONSTRAINT question_stimuli_track_id_fkey FOREIGN KEY (track_id) REFERENCES tracks (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.question_tags
  ADD CONSTRAINT fk_question_tags_question_id_questions FOREIGN KEY (question_id) REFERENCES questions (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.question_tags
  ADD CONSTRAINT fk_question_tags_tag_id_tags FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.question_tags
  ADD CONSTRAINT question_tags_pkey PRIMARY KEY (question_id, tag_id);

ALTER TABLE ONLY public.question_versions
  ADD CONSTRAINT fk_question_versions_changed_by_profiles FOREIGN KEY (changed_by) REFERENCES profiles (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.question_versions
  ADD CONSTRAINT fk_question_versions_question_id_questions FOREIGN KEY (question_id) REFERENCES questions (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.question_versions
  ADD CONSTRAINT question_versions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.question_versions
  ADD CONSTRAINT question_versions_question_id_version_key UNIQUE (question_id, version);

ALTER TABLE ONLY public.questions
  ADD CONSTRAINT fk_questions_author_id_profiles FOREIGN KEY (author_id) REFERENCES profiles (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.questions
  ADD CONSTRAINT fk_questions_program_id_programs FOREIGN KEY (program_id) REFERENCES programs (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.questions
  ADD CONSTRAINT fk_questions_reviewer_id_profiles FOREIGN KEY (reviewer_id) REFERENCES profiles (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.questions
  ADD CONSTRAINT fk_questions_subject_id_subjects FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.questions
  ADD CONSTRAINT fk_questions_track_id_tracks FOREIGN KEY (track_id) REFERENCES tracks (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.questions
  ADD CONSTRAINT questions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.questions
  ADD CONSTRAINT questions_question_code_key UNIQUE (question_code);

ALTER TABLE ONLY public.questions
  ADD CONSTRAINT questions_status_workflow_check CHECK (status = ANY (ARRAY['draft'::text, 'submitted'::text, 'editorial_review'::text, 'academic_review'::text, 'technical_qa'::text, 'revision_required'::text, 'approved'::text, 'published'::text, 'rejected'::text, 'archived'::text]));

ALTER TABLE ONLY public.questions
  ADD CONSTRAINT questions_stimulus_id_fkey FOREIGN KEY (stimulus_id) REFERENCES question_stimuli (id) ON DELETE SET NULL;

ALTER TABLE ONLY public.refunds
  ADD CONSTRAINT fk_refunds_payment_id_payments FOREIGN KEY (payment_id) REFERENCES payments (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.refunds
  ADD CONSTRAINT fk_refunds_processed_by_profiles FOREIGN KEY (processed_by) REFERENCES profiles (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.refunds
  ADD CONSTRAINT fk_refunds_requested_by_profiles FOREIGN KEY (requested_by) REFERENCES profiles (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.refunds
  ADD CONSTRAINT refunds_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.remedial_session_items
  ADD CONSTRAINT fk_remedial_session_items_knowledge_node_id_knowledge_nodes FOREIGN KEY (knowledge_node_id) REFERENCES knowledge_nodes (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.remedial_session_items
  ADD CONSTRAINT fk_remedial_session_items_question_id_questions FOREIGN KEY (question_id) REFERENCES questions (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.remedial_session_items
  ADD CONSTRAINT fk_remedial_session_items_session_id_remedial_sessions FOREIGN KEY (session_id) REFERENCES remedial_sessions (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.remedial_session_items
  ADD CONSTRAINT remedial_session_items_best_score_check CHECK (best_score >= 0::numeric AND best_score <= 1::numeric);

ALTER TABLE ONLY public.remedial_session_items
  ADD CONSTRAINT remedial_session_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.remedial_session_items
  ADD CONSTRAINT remedial_session_items_position_check CHECK ("position" IS NULL OR "position" >= 1);

ALTER TABLE ONLY public.remedial_session_items
  ADD CONSTRAINT remedial_session_items_review_count_check CHECK (review_count >= 0);

ALTER TABLE ONLY public.remedial_session_items
  ADD CONSTRAINT remedial_session_items_status_check CHECK (status = ANY (ARRAY['pending'::text, 'completed'::text]));

ALTER TABLE ONLY public.remedial_session_items
  ADD CONSTRAINT remedial_session_items_user_wrong_question_id_fkey FOREIGN KEY (user_wrong_question_id) REFERENCES user_wrong_questions (id) ON DELETE SET NULL;

ALTER TABLE ONLY public.remedial_sessions
  ADD CONSTRAINT fk_remedial_sessions_source_attempt_id_exam_attempts FOREIGN KEY (source_attempt_id) REFERENCES exam_attempts (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.remedial_sessions
  ADD CONSTRAINT fk_remedial_sessions_track_id_tracks FOREIGN KEY (track_id) REFERENCES tracks (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.remedial_sessions
  ADD CONSTRAINT fk_remedial_sessions_user_id_profiles FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.remedial_sessions
  ADD CONSTRAINT remedial_sessions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.remedial_sessions
  ADD CONSTRAINT remedial_sessions_status_check CHECK (status = ANY (ARRAY['active'::text, 'completed'::text]));

ALTER TABLE ONLY public.role_permissions
  ADD CONSTRAINT fk_role_permissions_permission_id_permissions FOREIGN KEY (permission_id) REFERENCES permissions (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.role_permissions
  ADD CONSTRAINT fk_role_permissions_role_id_roles FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.role_permissions
  ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_id);

ALTER TABLE ONLY public.roles
  ADD CONSTRAINT roles_code_key UNIQUE (code);

ALTER TABLE ONLY public.roles
  ADD CONSTRAINT roles_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.session_activity
  ADD CONSTRAINT fk_session_activity_device_id_user_devices FOREIGN KEY (device_id) REFERENCES user_devices (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.session_activity
  ADD CONSTRAINT fk_session_activity_user_id_profiles FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.session_activity
  ADD CONSTRAINT session_activity_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.subjects
  ADD CONSTRAINT fk_subjects_track_id_tracks FOREIGN KEY (track_id) REFERENCES tracks (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.subjects
  ADD CONSTRAINT subjects_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.subjects
  ADD CONSTRAINT subjects_track_id_code_key UNIQUE (track_id, code);

ALTER TABLE ONLY public.subjects
  ADD CONSTRAINT subjects_track_id_slug_key UNIQUE (track_id, slug);

ALTER TABLE ONLY public.system_settings
  ADD CONSTRAINT fk_system_settings_updated_by_profiles FOREIGN KEY (updated_by) REFERENCES profiles (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.system_settings
  ADD CONSTRAINT system_settings_pkey PRIMARY KEY (key);

ALTER TABLE ONLY public.tags
  ADD CONSTRAINT tags_name_key UNIQUE (name);

ALTER TABLE ONLY public.tags
  ADD CONSTRAINT tags_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.tags
  ADD CONSTRAINT tags_slug_key UNIQUE (slug);

ALTER TABLE ONLY public.track_periods
  ADD CONSTRAINT fk_track_periods_period_id_periods FOREIGN KEY (period_id) REFERENCES periods (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.track_periods
  ADD CONSTRAINT fk_track_periods_track_id_tracks FOREIGN KEY (track_id) REFERENCES tracks (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.track_periods
  ADD CONSTRAINT track_periods_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.track_periods
  ADD CONSTRAINT track_periods_track_id_period_id_key UNIQUE (track_id, period_id);

ALTER TABLE ONLY public.tracks
  ADD CONSTRAINT fk_tracks_program_id_programs FOREIGN KEY (program_id) REFERENCES programs (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.tracks
  ADD CONSTRAINT tracks_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.tracks
  ADD CONSTRAINT tracks_program_id_code_key UNIQUE (program_id, code);

ALTER TABLE ONLY public.tracks
  ADD CONSTRAINT tracks_program_id_slug_key UNIQUE (program_id, slug);

ALTER TABLE ONLY public.user_activity_daily
  ADD CONSTRAINT fk_user_activity_daily_user_id_profiles FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_activity_daily
  ADD CONSTRAINT user_activity_daily_pkey PRIMARY KEY (user_id, activity_date);

ALTER TABLE ONLY public.user_devices
  ADD CONSTRAINT fk_user_devices_user_id_profiles FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_devices
  ADD CONSTRAINT user_devices_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.user_devices
  ADD CONSTRAINT user_devices_user_id_device_fingerprint_key UNIQUE (user_id, device_fingerprint);

ALTER TABLE ONLY public.user_knowledge_progress
  ADD CONSTRAINT fk_user_knowledge_progress_knowledge_node_id_knowledge_nodes FOREIGN KEY (knowledge_node_id) REFERENCES knowledge_nodes (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_knowledge_progress
  ADD CONSTRAINT fk_user_knowledge_progress_user_id_profiles FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_knowledge_progress
  ADD CONSTRAINT fk_user_knowledge_progress_user_track_id_user_tracks FOREIGN KEY (user_track_id) REFERENCES user_tracks (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_knowledge_progress
  ADD CONSTRAINT user_knowledge_progress_accuracy_ck CHECK (accuracy >= 0::numeric AND accuracy <= 1::numeric);

ALTER TABLE ONLY public.user_knowledge_progress
  ADD CONSTRAINT user_knowledge_progress_mastery_ck CHECK (mastery_score >= 0::numeric AND mastery_score <= 1::numeric);

ALTER TABLE ONLY public.user_knowledge_progress
  ADD CONSTRAINT user_knowledge_progress_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.user_knowledge_progress
  ADD CONSTRAINT user_knowledge_progress_user_id_knowledge_node_id_key UNIQUE (user_id, knowledge_node_id);

ALTER TABLE ONLY public.user_question_bookmarks
  ADD CONSTRAINT fk_user_question_bookmarks_question_id_questions FOREIGN KEY (question_id) REFERENCES questions (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_question_bookmarks
  ADD CONSTRAINT fk_user_question_bookmarks_user_id_profiles FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_question_bookmarks
  ADD CONSTRAINT user_question_bookmarks_pkey PRIMARY KEY (user_id, question_id);

ALTER TABLE ONLY public.user_question_notes
  ADD CONSTRAINT fk_user_question_notes_question_id_questions FOREIGN KEY (question_id) REFERENCES questions (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_question_notes
  ADD CONSTRAINT fk_user_question_notes_user_id_profiles FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_question_notes
  ADD CONSTRAINT user_question_notes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.user_question_notes
  ADD CONSTRAINT user_question_notes_user_id_question_id_key UNIQUE (user_id, question_id);

ALTER TABLE ONLY public.user_question_state
  ADD CONSTRAINT fk_user_question_state_question_id_questions FOREIGN KEY (question_id) REFERENCES questions (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_question_state
  ADD CONSTRAINT fk_user_question_state_user_id_profiles FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_question_state
  ADD CONSTRAINT user_question_state_pkey PRIMARY KEY (user_id, question_id);

ALTER TABLE ONLY public.user_readiness
  ADD CONSTRAINT fk_user_readiness_track_id_tracks FOREIGN KEY (track_id) REFERENCES tracks (id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.user_readiness
  ADD CONSTRAINT fk_user_readiness_user_id_profiles FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_readiness
  ADD CONSTRAINT user_readiness_confidence_ck CHECK (confidence_score IS NULL OR confidence_score >= 0::numeric AND confidence_score <= 1::numeric);

ALTER TABLE ONLY public.user_readiness
  ADD CONSTRAINT user_readiness_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.user_readiness
  ADD CONSTRAINT user_readiness_score_ck CHECK (readiness_score >= 0::numeric AND readiness_score <= 1::numeric);

ALTER TABLE ONLY public.user_roles
  ADD CONSTRAINT fk_user_roles_role_id_roles FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_roles
  ADD CONSTRAINT fk_user_roles_user_id_profiles FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_roles
  ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.user_streaks
  ADD CONSTRAINT fk_user_streaks_user_id_profiles FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_streaks
  ADD CONSTRAINT user_streaks_pkey PRIMARY KEY (user_id);

ALTER TABLE ONLY public.user_subject_progress
  ADD CONSTRAINT fk_user_subject_progress_subject_id_subjects FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_subject_progress
  ADD CONSTRAINT fk_user_subject_progress_user_id_profiles FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_subject_progress
  ADD CONSTRAINT user_subject_progress_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.user_subject_progress
  ADD CONSTRAINT user_subject_progress_user_id_subject_id_key UNIQUE (user_id, subject_id);

ALTER TABLE ONLY public.user_track_preferences
  ADD CONSTRAINT fk_user_track_preferences_user_track_id_user_tracks FOREIGN KEY (user_track_id) REFERENCES user_tracks (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_track_preferences
  ADD CONSTRAINT user_track_preferences_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.user_track_preferences
  ADD CONSTRAINT user_track_preferences_user_track_id_key UNIQUE (user_track_id);

ALTER TABLE ONLY public.user_tracks
  ADD CONSTRAINT fk_user_tracks_track_id_tracks FOREIGN KEY (track_id) REFERENCES tracks (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_tracks
  ADD CONSTRAINT fk_user_tracks_user_id_profiles FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_tracks
  ADD CONSTRAINT user_tracks_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.user_tracks
  ADD CONSTRAINT user_tracks_user_id_track_id_key UNIQUE (user_id, track_id);

ALTER TABLE ONLY public.user_wrong_questions
  ADD CONSTRAINT user_wrong_questions_failure_count_check CHECK (failure_count >= 1);

ALTER TABLE ONLY public.user_wrong_questions
  ADD CONSTRAINT user_wrong_questions_knowledge_node_id_fkey FOREIGN KEY (knowledge_node_id) REFERENCES knowledge_nodes (id) ON DELETE SET NULL;

ALTER TABLE ONLY public.user_wrong_questions
  ADD CONSTRAINT user_wrong_questions_last_source_attempt_id_fkey FOREIGN KEY (last_source_attempt_id) REFERENCES exam_attempts (id) ON DELETE SET NULL;

ALTER TABLE ONLY public.user_wrong_questions
  ADD CONSTRAINT user_wrong_questions_latest_outcome_check CHECK (latest_outcome = ANY (ARRAY['wrong'::text, 'unanswered'::text, 'correct'::text]));

ALTER TABLE ONLY public.user_wrong_questions
  ADD CONSTRAINT user_wrong_questions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.user_wrong_questions
  ADD CONSTRAINT user_wrong_questions_question_id_fkey FOREIGN KEY (question_id) REFERENCES questions (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_wrong_questions
  ADD CONSTRAINT user_wrong_questions_source_attempt_question_id_fkey FOREIGN KEY (source_attempt_question_id) REFERENCES attempt_questions (id) ON DELETE SET NULL;

ALTER TABLE ONLY public.user_wrong_questions
  ADD CONSTRAINT user_wrong_questions_status_check CHECK (status = ANY (ARRAY['open'::text, 'resolved'::text]));

ALTER TABLE ONLY public.user_wrong_questions
  ADD CONSTRAINT user_wrong_questions_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_wrong_questions
  ADD CONSTRAINT user_wrong_questions_track_id_fkey FOREIGN KEY (track_id) REFERENCES tracks (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_wrong_questions
  ADD CONSTRAINT user_wrong_questions_unanswered_count_check CHECK (unanswered_count >= 0);

ALTER TABLE ONLY public.user_wrong_questions
  ADD CONSTRAINT user_wrong_questions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_wrong_questions
  ADD CONSTRAINT user_wrong_questions_user_id_track_id_question_id_key UNIQUE (user_id, track_id, question_id);

ALTER TABLE ONLY public.user_wrong_questions
  ADD CONSTRAINT user_wrong_questions_user_track_id_fkey FOREIGN KEY (user_track_id) REFERENCES user_tracks (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_wrong_questions
  ADD CONSTRAINT user_wrong_questions_wrong_count_check CHECK (wrong_count >= 0);

ALTER TABLE ONLY public.wallet_transactions
  ADD CONSTRAINT fk_wallet_transactions_wallet_id_wallets FOREIGN KEY (wallet_id) REFERENCES wallets (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.wallet_transactions
  ADD CONSTRAINT wallet_transactions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.wallets
  ADD CONSTRAINT fk_wallets_user_id_profiles FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.wallets
  ADD CONSTRAINT wallets_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.wallets
  ADD CONSTRAINT wallets_user_id_wallet_type_key UNIQUE (user_id, wallet_type);

ALTER TABLE ONLY public.wrong_question_reviews
  ADD CONSTRAINT wrong_question_reviews_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.wrong_question_reviews
  ADD CONSTRAINT wrong_question_reviews_question_id_fkey FOREIGN KEY (question_id) REFERENCES questions (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.wrong_question_reviews
  ADD CONSTRAINT wrong_question_reviews_remedial_session_item_id_fkey FOREIGN KEY (remedial_session_item_id) REFERENCES remedial_session_items (id) ON DELETE SET NULL;

ALTER TABLE ONLY public.wrong_question_reviews
  ADD CONSTRAINT wrong_question_reviews_source_check CHECK (review_source = ANY (ARRAY['repeat_wrong'::text, 'remedial'::text]));

ALTER TABLE ONLY public.wrong_question_reviews
  ADD CONSTRAINT wrong_question_reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;

ALTER TABLE ONLY public.wrong_question_reviews
  ADD CONSTRAINT wrong_question_reviews_user_wrong_question_id_fkey FOREIGN KEY (user_wrong_question_id) REFERENCES user_wrong_questions (id) ON DELETE CASCADE;
