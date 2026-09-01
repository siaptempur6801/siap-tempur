-- Generated from canonical staging lpgrivowdcepcxradavu.
-- Runtime RLS policies for tables Q-Z.
-- DO NOT apply to production before explicit final GO.

CREATE POLICY question_reports_insert_own ON public.question_reports AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY question_reports_select_own ON public.question_reports AS PERMISSIVE FOR SELECT TO authenticated
  USING (((user_id = ( SELECT auth.uid() AS uid)) OR ( SELECT app_private.has_permission('admin.access'::text) AS has_permission)));

CREATE POLICY question_versions_authoring_select ON public.question_versions AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM questions q
  WHERE ((q.id = question_versions.question_id) AND ((q.author_id = ( SELECT auth.uid() AS uid)) OR (q.reviewer_id = ( SELECT auth.uid() AS uid)) OR (q.status = ANY (ARRAY['approved'::text, 'published'::text])) OR app_private.current_user_has_permission('content.review'::text) OR app_private.current_user_has_permission('question.manage'::text))))));

CREATE POLICY questions_authoring_insert ON public.questions AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((author_id = ( SELECT auth.uid() AS uid)) AND (app_private.current_user_has_permission('content.create'::text) OR app_private.current_user_has_permission('question.manage'::text)) AND (status = 'draft'::text)));

CREATE POLICY questions_authoring_select ON public.questions AS PERMISSIVE FOR SELECT TO authenticated
  USING (((status = ANY (ARRAY['approved'::text, 'published'::text])) OR (author_id = ( SELECT auth.uid() AS uid)) OR (reviewer_id = ( SELECT auth.uid() AS uid)) OR app_private.current_user_has_permission('question.manage'::text) OR app_private.current_user_has_permission('content.review'::text)));

CREATE POLICY questions_authoring_update ON public.questions AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((status = ANY (ARRAY['draft'::text, 'revision_required'::text])) AND (((author_id = ( SELECT auth.uid() AS uid)) AND app_private.current_user_has_permission('content.update'::text)) OR app_private.current_user_has_permission('question.manage'::text))))
  WITH CHECK (((status = ANY (ARRAY['draft'::text, 'revision_required'::text])) AND (((author_id = ( SELECT auth.uid() AS uid)) AND app_private.current_user_has_permission('content.update'::text)) OR app_private.current_user_has_permission('question.manage'::text))));

CREATE POLICY remedial_session_items_select_own ON public.remedial_session_items AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM remedial_sessions rs
  WHERE ((rs.id = remedial_session_items.session_id) AND ((rs.user_id = ( SELECT auth.uid() AS uid)) OR ( SELECT app_private.has_permission('admin.access'::text) AS has_permission))))));

CREATE POLICY remedial_sessions_select_own ON public.remedial_sessions AS PERMISSIVE FOR SELECT TO authenticated
  USING (((user_id = ( SELECT auth.uid() AS uid)) OR ( SELECT app_private.has_permission('admin.access'::text) AS has_permission)));

CREATE POLICY session_activity_select_own ON public.session_activity AS PERMISSIVE FOR SELECT TO authenticated
  USING (((user_id = ( SELECT auth.uid() AS uid)) OR ( SELECT app_private.has_permission('admin.access'::text) AS has_permission)));

CREATE POLICY subjects_read ON public.subjects AS PERMISSIVE FOR SELECT TO authenticated
  USING (((upper(status) = 'ACTIVE'::text) OR ( SELECT app_private.has_permission('admin.access'::text) AS has_permission)));

CREATE POLICY tags_read ON public.tags AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

CREATE POLICY track_periods_read ON public.track_periods AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

CREATE POLICY tracks_read ON public.tracks AS PERMISSIVE FOR SELECT TO authenticated
  USING (((upper(status) = 'ACTIVE'::text) OR ( SELECT app_private.has_permission('admin.access'::text) AS has_permission)));

CREATE POLICY user_activity_daily_select_own ON public.user_activity_daily AS PERMISSIVE FOR SELECT TO authenticated
  USING (((user_id = ( SELECT auth.uid() AS uid)) OR ( SELECT app_private.has_permission('admin.access'::text) AS has_permission)));

CREATE POLICY user_devices_select_own ON public.user_devices AS PERMISSIVE FOR SELECT TO authenticated
  USING (((user_id = ( SELECT auth.uid() AS uid)) OR ( SELECT app_private.has_permission('admin.access'::text) AS has_permission)));

CREATE POLICY user_knowledge_progress_own ON public.user_knowledge_progress AS PERMISSIVE FOR SELECT TO authenticated
  USING (((user_id = ( SELECT auth.uid() AS uid)) OR ( SELECT app_private.has_permission('admin.access'::text) AS has_permission)));

CREATE POLICY user_question_bookmarks_delete_own ON public.user_question_bookmarks AS PERMISSIVE FOR DELETE TO authenticated
  USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY user_question_bookmarks_insert_own ON public.user_question_bookmarks AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY user_question_bookmarks_select_own ON public.user_question_bookmarks AS PERMISSIVE FOR SELECT TO authenticated
  USING (((user_id = ( SELECT auth.uid() AS uid)) OR ( SELECT app_private.has_permission('admin.access'::text) AS has_permission)));

CREATE POLICY user_question_bookmarks_update_own ON public.user_question_bookmarks AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((user_id = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY user_question_notes_delete_own ON public.user_question_notes AS PERMISSIVE FOR DELETE TO authenticated
  USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY user_question_notes_insert_own ON public.user_question_notes AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY user_question_notes_select_own ON public.user_question_notes AS PERMISSIVE FOR SELECT TO authenticated
  USING (((user_id = ( SELECT auth.uid() AS uid)) OR ( SELECT app_private.has_permission('admin.access'::text) AS has_permission)));

CREATE POLICY user_question_notes_update_own ON public.user_question_notes AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((user_id = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY user_question_state_select_own ON public.user_question_state AS PERMISSIVE FOR SELECT TO authenticated
  USING (((user_id = ( SELECT auth.uid() AS uid)) OR ( SELECT app_private.has_permission('admin.access'::text) AS has_permission)));

CREATE POLICY user_readiness_select_own ON public.user_readiness AS PERMISSIVE FOR SELECT TO authenticated
  USING (((user_id = ( SELECT auth.uid() AS uid)) OR ( SELECT app_private.has_permission('admin.access'::text) AS has_permission)));

CREATE POLICY user_streaks_select_own ON public.user_streaks AS PERMISSIVE FOR SELECT TO authenticated
  USING (((user_id = ( SELECT auth.uid() AS uid)) OR ( SELECT app_private.has_permission('admin.access'::text) AS has_permission)));

CREATE POLICY user_subject_progress_select_own ON public.user_subject_progress AS PERMISSIVE FOR SELECT TO authenticated
  USING (((user_id = ( SELECT auth.uid() AS uid)) OR ( SELECT app_private.has_permission('admin.access'::text) AS has_permission)));

CREATE POLICY user_track_preferences_delete_own ON public.user_track_preferences AS PERMISSIVE FOR DELETE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM user_tracks ut
  WHERE ((ut.id = user_track_preferences.user_track_id) AND (ut.user_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY user_track_preferences_insert_own ON public.user_track_preferences AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM user_tracks ut
  WHERE ((ut.id = user_track_preferences.user_track_id) AND (ut.user_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY user_track_preferences_own ON public.user_track_preferences AS PERMISSIVE FOR SELECT TO authenticated
  USING (((EXISTS ( SELECT 1
   FROM user_tracks ut
  WHERE ((ut.id = user_track_preferences.user_track_id) AND (ut.user_id = ( SELECT auth.uid() AS uid))))) OR ( SELECT app_private.has_permission('admin.access'::text) AS has_permission)));

CREATE POLICY user_track_preferences_update_own ON public.user_track_preferences AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM user_tracks ut
  WHERE ((ut.id = user_track_preferences.user_track_id) AND (ut.user_id = ( SELECT auth.uid() AS uid))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM user_tracks ut
  WHERE ((ut.id = user_track_preferences.user_track_id) AND (ut.user_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY user_tracks_select_own ON public.user_tracks AS PERMISSIVE FOR SELECT TO authenticated
  USING (((user_id = ( SELECT auth.uid() AS uid)) OR ( SELECT app_private.has_permission('admin.access'::text) AS has_permission)));

CREATE POLICY user_wrong_questions_select_own ON public.user_wrong_questions AS PERMISSIVE FOR SELECT TO authenticated
  USING (((user_id = ( SELECT auth.uid() AS uid)) OR ( SELECT app_private.has_permission('admin.access'::text) AS has_permission)));

CREATE POLICY wallet_transactions_select_own ON public.wallet_transactions AS PERMISSIVE FOR SELECT TO authenticated
  USING (((EXISTS ( SELECT 1
   FROM wallets w
  WHERE ((w.id = wallet_transactions.wallet_id) AND (w.user_id = ( SELECT auth.uid() AS uid))))) OR ( SELECT app_private.has_permission('admin.access'::text) AS has_permission)));

CREATE POLICY wallets_select_own ON public.wallets AS PERMISSIVE FOR SELECT TO authenticated
  USING (((user_id = ( SELECT auth.uid() AS uid)) OR ( SELECT app_private.has_permission('admin.access'::text) AS has_permission)));

CREATE POLICY wrong_question_reviews_select_own ON public.wrong_question_reviews AS PERMISSIVE FOR SELECT TO authenticated
  USING (((user_id = ( SELECT auth.uid() AS uid)) OR ( SELECT app_private.has_permission('admin.access'::text) AS has_permission)));
