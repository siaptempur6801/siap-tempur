-- Generated from canonical staging lpgrivowdcepcxradavu.
-- Explicit runtime indexes Q-Z only; PK/UNIQUE-backed indexes are excluded.
-- DO NOT apply to production before explicit final GO.
CREATE INDEX idx_question_assets_question_id_sort_order ON public.question_assets USING btree (question_id, sort_order);

CREATE INDEX idx_question_explanations_question_id_version ON public.question_explanations USING btree (question_id, version);

CREATE INDEX idx_question_knowledge_nodes_knowledge_node_id_relation_type ON public.question_knowledge_nodes USING btree (knowledge_node_id, relation_type);

CREATE INDEX idx_question_options_group ON public.question_options USING btree (question_id, response_group_order, sort_order);

CREATE INDEX idx_question_options_question_id_sort_order ON public.question_options USING btree (question_id, sort_order);

CREATE INDEX idx_fk_question_reports_fk_question_reports_attemp_4033d018 ON public.question_reports USING btree (attempt_id);

CREATE INDEX idx_fk_question_reports_fk_question_reports_user_i_fb62c3bf ON public.question_reports USING btree (user_id);

CREATE INDEX idx_question_reports_assigned_to_status ON public.question_reports USING btree (assigned_to, status);

CREATE INDEX idx_question_reports_open ON public.question_reports USING btree (question_id, created_at)
WHERE (status = ANY (ARRAY['open'::text, 'reviewing'::text]));

CREATE INDEX idx_question_reports_question_id_status ON public.question_reports USING btree (question_id, status);

CREATE INDEX idx_question_reports_status_created_at ON public.question_reports USING btree (status, created_at);

CREATE INDEX idx_question_statistics_accuracy ON public.question_statistics USING btree (accuracy);

CREATE INDEX idx_question_statistics_report_count ON public.question_statistics USING btree (report_count);

CREATE INDEX idx_question_stimuli_catalog ON public.question_stimuli USING btree (program_id, track_id, subject_id);

CREATE INDEX idx_question_stimuli_status ON public.question_stimuli USING btree (status);

CREATE INDEX idx_question_tags_tag_id ON public.question_tags USING btree (tag_id);

CREATE INDEX idx_fk_question_versions_fk_question_versions_chan_c9e5aa7a ON public.question_versions USING btree (changed_by);

CREATE INDEX idx_question_versions_question_id_created_at ON public.question_versions USING btree (question_id, created_at);

CREATE INDEX idx_fk_questions_fk_questions_reviewer_id_profiles_4f8b4a4e ON public.questions USING btree (reviewer_id);

CREATE INDEX idx_fk_questions_fk_questions_subject_id_subjects_489cafa2 ON public.questions USING btree (subject_id);

CREATE INDEX idx_fk_questions_fk_questions_track_id_tracks_1a583f2b ON public.questions USING btree (track_id);

CREATE INDEX idx_questions_author_id_status ON public.questions USING btree (author_id, status);

CREATE INDEX idx_questions_program_id_track_id_subject_id ON public.questions USING btree (program_id, track_id, subject_id);

CREATE INDEX idx_questions_status_difficulty ON public.questions USING btree (status, difficulty);

CREATE INDEX idx_questions_stimulus_id ON public.questions USING btree (stimulus_id);

CREATE INDEX idx_fk_refunds_fk_refunds_processed_by_profiles_e829d769 ON public.refunds USING btree (processed_by);

CREATE INDEX idx_fk_refunds_fk_refunds_requested_by_profiles_a39fa8fc ON public.refunds USING btree (requested_by);

CREATE INDEX idx_refunds_payment_id_status ON public.refunds USING btree (payment_id, status);

CREATE INDEX idx_fk_remedial_session_items_fk_remedial_session__36aaa1aa ON public.remedial_session_items USING btree (knowledge_node_id);

CREATE INDEX idx_fk_remedial_session_items_fk_remedial_session__d3bb0b18 ON public.remedial_session_items USING btree (question_id);

CREATE INDEX idx_remedial_session_items_session_id ON public.remedial_session_items USING btree (session_id);

CREATE INDEX idx_remedial_session_items_wrong_question ON public.remedial_session_items USING btree (user_wrong_question_id)
WHERE (user_wrong_question_id IS NOT NULL);

CREATE UNIQUE INDEX uq_remedial_session_items_session_position ON public.remedial_session_items USING btree (session_id, "position")
WHERE ("position" IS NOT NULL);

CREATE UNIQUE INDEX uq_remedial_session_items_session_question ON public.remedial_session_items USING btree (session_id, question_id);

CREATE INDEX idx_fk_remedial_sessions_fk_remedial_sessions_sour_cfabe7f2 ON public.remedial_sessions USING btree (source_attempt_id);

CREATE INDEX idx_fk_remedial_sessions_fk_remedial_sessions_trac_1629efc3 ON public.remedial_sessions USING btree (track_id);

CREATE INDEX idx_remedial_sessions_user_id_status ON public.remedial_sessions USING btree (user_id, status);

CREATE INDEX idx_remedial_sessions_user_status_created ON public.remedial_sessions USING btree (user_id, status, created_at DESC);

CREATE UNIQUE INDEX uq_remedial_sessions_source_attempt ON public.remedial_sessions USING btree (source_attempt_id)
WHERE (source_attempt_id IS NOT NULL);

CREATE INDEX idx_role_permissions_permission_id ON public.role_permissions USING btree (permission_id);

CREATE INDEX idx_fk_session_activity_fk_session_activity_device_bc50d1d5 ON public.session_activity USING btree (device_id);

CREATE INDEX idx_session_activity_session_id_hash ON public.session_activity USING btree (session_id_hash);

CREATE INDEX idx_session_activity_user_id_last_seen_at ON public.session_activity USING btree (user_id, last_seen_at);

CREATE INDEX idx_subjects_subject_type ON public.subjects USING btree (subject_type);

CREATE INDEX idx_subjects_track_id_status ON public.subjects USING btree (track_id, status);

CREATE INDEX idx_fk_system_settings_fk_system_settings_updated__c27bf1a0 ON public.system_settings USING btree (updated_by);

CREATE INDEX idx_track_periods_period_id_is_active ON public.track_periods USING btree (period_id, is_active);

CREATE INDEX idx_tracks_program_id_status ON public.tracks USING btree (program_id, status);

CREATE INDEX idx_user_activity_daily_activity_date ON public.user_activity_daily USING btree (activity_date);

CREATE INDEX idx_user_devices_user_id_last_seen_at ON public.user_devices USING btree (user_id, last_seen_at);

CREATE INDEX idx_fk_user_knowledge_progress_fk_user_knowledge_p_6972fc98 ON public.user_knowledge_progress USING btree (knowledge_node_id);

CREATE INDEX idx_user_knowledge_progress_user_id_mastery_score ON public.user_knowledge_progress USING btree (user_id, mastery_score);

CREATE INDEX idx_user_knowledge_progress_user_track_id_mastery_level ON public.user_knowledge_progress USING btree (user_track_id, mastery_level);

CREATE INDEX idx_fk_user_question_bookmarks_fk_user_question_bo_f2869370 ON public.user_question_bookmarks USING btree (question_id);

CREATE INDEX idx_user_question_bookmarks_user_id_created_at ON public.user_question_bookmarks USING btree (user_id, created_at);

CREATE INDEX idx_fk_user_question_notes_fk_user_question_notes__0caf183b ON public.user_question_notes USING btree (question_id);

CREATE INDEX idx_fk_user_question_state_fk_user_question_state__d703d3fc ON public.user_question_state USING btree (question_id);

CREATE INDEX idx_user_question_state_user_id_needs_review_next_review_at ON public.user_question_state USING btree (user_id, needs_review, next_review_at);

CREATE INDEX idx_fk_user_readiness_fk_user_readiness_track_id_t_e1971901 ON public.user_readiness USING btree (track_id);

CREATE INDEX idx_user_readiness_user_id_track_id_calculated_at ON public.user_readiness USING btree (user_id, track_id, calculated_at);

CREATE UNIQUE INDEX user_readiness_user_track_version_uq ON public.user_readiness USING btree (user_id, track_id, calculation_version);

CREATE INDEX idx_fk_user_roles_fk_user_roles_role_id_roles_f2c0ca68 ON public.user_roles USING btree (role_id);

CREATE INDEX idx_user_roles_scope_type_scope_id ON public.user_roles USING btree (scope_type, scope_id);

CREATE INDEX idx_user_roles_user_id_role_id ON public.user_roles USING btree (user_id, role_id);

CREATE INDEX idx_fk_user_subject_progress_fk_user_subject_progr_25ba44d8 ON public.user_subject_progress USING btree (subject_id);

CREATE INDEX idx_user_subject_progress_user_id_mastery_score ON public.user_subject_progress USING btree (user_id, mastery_score);

CREATE INDEX idx_user_tracks_track_id_status ON public.user_tracks USING btree (track_id, status);

CREATE INDEX idx_user_tracks_user_id_status ON public.user_tracks USING btree (user_id, status);

CREATE INDEX idx_user_wrong_questions_knowledge_node_id ON public.user_wrong_questions USING btree (knowledge_node_id);

CREATE INDEX idx_user_wrong_questions_last_source_attempt_id ON public.user_wrong_questions USING btree (last_source_attempt_id);

CREATE INDEX idx_user_wrong_questions_question ON public.user_wrong_questions USING btree (question_id);

CREATE INDEX idx_user_wrong_questions_source_attempt_question_id ON public.user_wrong_questions USING btree (source_attempt_question_id);

CREATE INDEX idx_user_wrong_questions_subject_id ON public.user_wrong_questions USING btree (subject_id);

CREATE INDEX idx_user_wrong_questions_track_status ON public.user_wrong_questions USING btree (track_id, status, updated_at DESC);

CREATE INDEX idx_user_wrong_questions_user_status_updated ON public.user_wrong_questions USING btree (user_id, status, updated_at DESC);

CREATE INDEX idx_user_wrong_questions_user_track_id ON public.user_wrong_questions USING btree (user_track_id);

CREATE INDEX idx_wallet_transactions_source_type_source_id ON public.wallet_transactions USING btree (source_type, source_id);

CREATE INDEX idx_wallet_transactions_wallet_id_created_at ON public.wallet_transactions USING btree (wallet_id, created_at);

CREATE UNIQUE INDEX wallet_transactions_exam_attempt_debit_uq ON public.wallet_transactions USING btree (wallet_id, source_type, source_id, type)
WHERE ((source_id IS NOT NULL) AND (source_type = 'exam_attempt'::text) AND (type = 'debit'::text));

CREATE UNIQUE INDEX wallet_transactions_order_item_credit_uq ON public.wallet_transactions USING btree (wallet_id, source_type, source_id, type)
WHERE ((source_id IS NOT NULL) AND (source_type = 'order_item'::text) AND (type = 'credit'::text));

CREATE INDEX idx_wrong_question_reviews_question_id ON public.wrong_question_reviews USING btree (question_id);

CREATE INDEX idx_wrong_question_reviews_remedial_item ON public.wrong_question_reviews USING btree (remedial_session_item_id)
WHERE (remedial_session_item_id IS NOT NULL);

CREATE INDEX idx_wrong_question_reviews_user_created ON public.wrong_question_reviews USING btree (user_id, created_at DESC);

CREATE INDEX idx_wrong_question_reviews_wrong_question_created ON public.wrong_question_reviews USING btree (user_wrong_question_id, created_at DESC);
