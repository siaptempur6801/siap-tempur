-- Generated from canonical staging lpgrivowdcepcxradavu.
-- Runtime RLS policies for tables A-P.
-- DO NOT apply to production before explicit final GO.
CREATE POLICY articles_editor_create_own_draft ON public.articles AS PERMISSIVE
  FOR INSERT TO authenticated
  WITH CHECK (((author_id = (
    SELECT
      auth.uid () AS uid))
      AND (status = 'draft'::text)
      AND app_private.current_user_has_permission ('content.create'::text)));

CREATE POLICY articles_editor_read_own ON public.articles AS PERMISSIVE
  FOR SELECT TO authenticated
  USING (((author_id = (
    SELECT
      auth.uid () AS uid))
      AND app_private.current_user_has_permission ('content.read'::text)));

CREATE POLICY articles_editor_update_own_nonpublished ON public.articles AS PERMISSIVE
  FOR UPDATE TO authenticated
  USING (((author_id = (
    SELECT
      auth.uid () AS uid))
      AND (status <> 'published'::text)
      AND app_private.current_user_has_permission ('content.update'::text)))
  WITH CHECK (((author_id = (
    SELECT
      auth.uid () AS uid))
      AND (status <> 'published'::text)
      AND app_private.current_user_has_permission ('content.update'::text)));

CREATE POLICY articles_public_read_published ON public.articles AS PERMISSIVE
  FOR SELECT TO anon, authenticated
  USING ((status = 'published'::text));

CREATE POLICY articles_reviewer_read_all ON public.articles AS PERMISSIVE
  FOR SELECT TO authenticated
  USING ((app_private.current_user_has_permission ('content.review'::text)
    OR app_private.current_user_has_permission ('content.publish'::text)));

CREATE POLICY attempt_answer_options_own ON public.attempt_answer_options AS PERMISSIVE
  FOR SELECT TO authenticated
  USING (((EXISTS (
    SELECT
      1
    FROM ((attempt_answers aa
    JOIN attempt_questions aq ON ((aq.id = aa.attempt_question_id)))
    JOIN exam_attempts ea ON ((ea.id = aq.attempt_id)))
  WHERE ((aa.id = attempt_answer_options.attempt_answer_id)
    AND (ea.user_id = (
      SELECT
        auth.uid () AS uid)))))
        OR (
          SELECT
            app_private.has_permission ('admin.access'::text) AS has_permission)));

CREATE POLICY attempt_answers_insert_own ON public.attempt_answers AS PERMISSIVE
  FOR INSERT TO authenticated
  WITH CHECK ((EXISTS (
    SELECT
      1
    FROM (attempt_questions aq
    JOIN exam_attempts ea ON ((ea.id = aq.attempt_id)))
  WHERE ((aq.id = attempt_answers.attempt_question_id)
  AND (ea.user_id = (
    SELECT
      auth.uid () AS uid))))));

CREATE POLICY attempt_answers_select_own ON public.attempt_answers AS PERMISSIVE
  FOR SELECT TO authenticated
  USING (((EXISTS (
    SELECT
      1
    FROM (attempt_questions aq
    JOIN exam_attempts ea ON ((ea.id = aq.attempt_id)))
  WHERE ((aq.id = attempt_answers.attempt_question_id)
    AND (ea.user_id = (
      SELECT
        auth.uid () AS uid)))))
        OR (
          SELECT
            app_private.has_permission ('admin.access'::text) AS has_permission)));

CREATE POLICY attempt_answers_update_own ON public.attempt_answers AS PERMISSIVE
  FOR UPDATE TO authenticated
  USING ((EXISTS (
    SELECT
      1
    FROM (attempt_questions aq
    JOIN exam_attempts ea ON ((ea.id = aq.attempt_id)))
  WHERE ((aq.id = attempt_answers.attempt_question_id)
    AND (ea.user_id = (
      SELECT
        auth.uid () AS uid))))))
  WITH CHECK ((EXISTS (
    SELECT
      1
    FROM (attempt_questions aq
    JOIN exam_attempts ea ON ((ea.id = aq.attempt_id)))
  WHERE ((aq.id = attempt_answers.attempt_question_id)
  AND (ea.user_id = (
    SELECT
      auth.uid () AS uid))))));

CREATE POLICY attempt_questions_select_own ON public.attempt_questions AS PERMISSIVE
  FOR SELECT TO authenticated
  USING (((EXISTS (
    SELECT
      1
    FROM
      exam_attempts ea
    WHERE ((ea.id = attempt_questions.attempt_id)
    AND (ea.user_id = (
      SELECT
        auth.uid () AS uid)))))
        OR (
          SELECT
            app_private.has_permission ('admin.access'::text) AS has_permission)));

CREATE POLICY attempt_scores_select_own ON public.attempt_scores AS PERMISSIVE
  FOR SELECT TO authenticated
  USING (((EXISTS (
    SELECT
      1
    FROM
      exam_attempts ea
    WHERE ((ea.id = attempt_scores.attempt_id)
    AND (ea.user_id = (
      SELECT
        auth.uid () AS uid)))))
        OR (
          SELECT
            app_private.has_permission ('admin.access'::text) AS has_permission)));

CREATE POLICY attempt_section_states_select_own ON public.attempt_section_states AS PERMISSIVE
  FOR SELECT TO authenticated
  USING (((EXISTS (
    SELECT
      1
    FROM
      exam_attempts ea
    WHERE ((ea.id = attempt_section_states.attempt_id)
    AND (ea.user_id = (
      SELECT
        auth.uid () AS uid)))))
        OR (
          SELECT
            app_private.has_permission ('admin.access'::text) AS has_permission)));

CREATE POLICY certificate_templates_read ON public.certificate_templates AS PERMISSIVE
  FOR SELECT TO authenticated
  USING (TRUE);

CREATE POLICY certificates_select_own ON public.certificates AS PERMISSIVE
  FOR SELECT TO authenticated
  USING (((user_id = (
    SELECT
      auth.uid () AS uid))
      OR (
        SELECT
          app_private.has_permission ('admin.access'::text) AS has_permission)));

CREATE POLICY class_members_same_org ON public.class_members AS PERMISSIVE
  FOR SELECT TO authenticated
  USING (((EXISTS (
    SELECT
      1
    FROM
      classes c
    WHERE ((c.id = class_members.class_id)
    AND (
      SELECT
        app_private.is_org_member (c.organization_id) AS is_org_member))))
        OR (
          SELECT
            app_private.has_permission ('admin.access'::text) AS has_permission)));

CREATE POLICY classes_same_org ON public.classes AS PERMISSIVE
  FOR SELECT TO authenticated
  USING (((
    SELECT
      app_private.is_org_member (classes.organization_id) AS is_org_member)
      OR (
        SELECT
          app_private.has_permission ('admin.access'::text) AS has_permission)));

CREATE POLICY content_reviews_authoring_select ON public.content_reviews AS PERMISSIVE
  FOR SELECT TO authenticated
  USING (((reviewer_id = (
    SELECT
      auth.uid () AS uid))
      OR app_private.current_user_has_permission ('content.review'::text)
      OR app_private.current_user_has_permission ('question.manage'::text)
      OR ((entity_type = 'question'::text)
      AND (EXISTS (
        SELECT
          1
        FROM
          questions q
        WHERE ((q.id = content_reviews.entity_id)
        AND (q.author_id = (
          SELECT
            auth.uid () AS uid))))))));

CREATE POLICY entitlements_select_own ON public.entitlements AS PERMISSIVE
  FOR SELECT TO authenticated
  USING (((user_id = (
    SELECT
      auth.uid () AS uid))
      OR (
        SELECT
          app_private.has_permission ('admin.access'::text) AS has_permission)));

CREATE POLICY event_rankings_read ON public.event_rankings AS PERMISSIVE
  FOR SELECT TO authenticated
  USING (TRUE);

CREATE POLICY event_registrations_insert_own ON public.event_registrations AS PERMISSIVE
  FOR INSERT TO authenticated
  WITH CHECK ((user_id = (
    SELECT
      auth.uid () AS uid)));

CREATE POLICY event_registrations_select_own ON public.event_registrations AS PERMISSIVE
  FOR SELECT TO authenticated
  USING (((user_id = (
    SELECT
      auth.uid () AS uid))
      OR (
        SELECT
          app_private.has_permission ('admin.access'::text) AS has_permission)));

CREATE POLICY event_sessions_read ON public.event_sessions AS PERMISSIVE
  FOR SELECT TO authenticated
  USING (TRUE);

CREATE POLICY events_read ON public.events AS PERMISSIVE
  FOR SELECT TO authenticated
  USING (((upper(status) = ANY (ARRAY['REGISTRATION_OPEN'::text, 'LIVE'::text, 'COMPLETED'::text, 'ACTIVE'::text, 'CLOSED'::text, 'SCHEDULED'::text]))
    OR (
      SELECT
        app_private.has_permission ('admin.access'::text) AS has_permission)));

CREATE POLICY exam_attempts_insert_own ON public.exam_attempts AS PERMISSIVE
  FOR INSERT TO authenticated
  WITH CHECK ((user_id = (
    SELECT
      auth.uid () AS uid)));

CREATE POLICY exam_attempts_select_own ON public.exam_attempts AS PERMISSIVE
  FOR SELECT TO authenticated
  USING (((user_id = (
    SELECT
      auth.uid () AS uid))
      OR (
        SELECT
          app_private.has_permission ('admin.access'::text) AS has_permission)));

CREATE POLICY exam_attempts_update_own ON public.exam_attempts AS PERMISSIVE
  FOR UPDATE TO authenticated
  USING ((user_id = (
    SELECT
      auth.uid () AS uid)))
  WITH CHECK ((user_id = (
    SELECT
      auth.uid () AS uid)));

CREATE POLICY exam_blueprint_rules_read ON public.exam_blueprint_rules AS PERMISSIVE
  FOR SELECT TO authenticated
  USING (TRUE);

CREATE POLICY exam_blueprints_read ON public.exam_blueprints AS PERMISSIVE
  FOR SELECT TO authenticated
  USING (TRUE);

CREATE POLICY exam_rules_read ON public.exam_rules AS PERMISSIVE
  FOR SELECT TO authenticated
  USING (TRUE);

CREATE POLICY exam_sections_read ON public.exam_sections AS PERMISSIVE
  FOR SELECT TO authenticated
  USING (TRUE);

CREATE POLICY exam_types_read ON public.exam_types AS PERMISSIVE
  FOR SELECT TO authenticated
  USING (TRUE);

CREATE POLICY exams_read ON public.exams AS PERMISSIVE
  FOR SELECT TO authenticated
  USING (((upper(status) = ANY (ARRAY['SCHEDULED'::text, 'ACTIVE'::text, 'CLOSED'::text]))
    OR (
      SELECT
        app_private.has_permission ('admin.access'::text) AS has_permission)));

CREATE POLICY features_read ON public.features AS PERMISSIVE
  FOR SELECT TO authenticated
  USING (TRUE);

CREATE POLICY knowledge_node_paths_read ON public.knowledge_node_paths AS PERMISSIVE
  FOR SELECT TO authenticated
  USING (TRUE);

CREATE POLICY knowledge_nodes_read ON public.knowledge_nodes AS PERMISSIVE
  FOR SELECT TO authenticated
  USING (((upper(status) = 'ACTIVE'::text)
    OR (
      SELECT
        app_private.has_permission ('admin.access'::text) AS has_permission)));

CREATE POLICY leaderboard_entries_read ON public.leaderboard_entries AS PERMISSIVE
  FOR SELECT TO authenticated
  USING (TRUE);

CREATE POLICY leaderboards_read ON public.leaderboards AS PERMISSIVE
  FOR SELECT TO authenticated
  USING (((upper(status) = 'ACTIVE'::text)
    OR (
      SELECT
        app_private.has_permission ('admin.access'::text) AS has_permission)));

CREATE POLICY learning_recommendations_select_own ON public.learning_recommendations AS PERMISSIVE
  FOR SELECT TO authenticated
  USING (((user_id = (
    SELECT
      auth.uid () AS uid))
      OR (
        SELECT
          app_private.has_permission ('admin.access'::text) AS has_permission)));

CREATE POLICY material_knowledge_nodes_read ON public.material_knowledge_nodes AS PERMISSIVE
  FOR SELECT TO authenticated
  USING (TRUE);

CREATE POLICY materials_read ON public.materials AS PERMISSIVE
  FOR SELECT TO authenticated
  USING ((((upper(status) = 'PUBLISHED'::text)
    AND ((upper(access_type) = 'FREE'::text)
    OR ((upper(access_type) = 'PREMIUM'::text)
    AND (required_feature_id IS NOT NULL)
    AND (
      SELECT
        app_private.has_active_feature (materials.required_feature_id) AS has_active_feature))))
        OR (
          SELECT
            app_private.has_permission ('admin.access'::text) AS has_permission)));

CREATE POLICY notifications_select_own ON public.notifications AS PERMISSIVE
  FOR SELECT TO authenticated
  USING (((user_id = (
    SELECT
      auth.uid () AS uid))
      OR (
        SELECT
          app_private.has_permission ('admin.access'::text) AS has_permission)));

CREATE POLICY notifications_update_own ON public.notifications AS PERMISSIVE
  FOR UPDATE TO authenticated
  USING ((user_id = (
    SELECT
      auth.uid () AS uid)))
  WITH CHECK ((user_id = (
    SELECT
      auth.uid () AS uid)));

CREATE POLICY order_items_select_own ON public.order_items AS PERMISSIVE
  FOR SELECT TO authenticated
  USING (((EXISTS (
    SELECT
      1
    FROM
      orders o
    WHERE ((o.id = order_items.order_id)
    AND (o.user_id = (
      SELECT
        auth.uid () AS uid)))))
        OR (
          SELECT
            app_private.has_permission ('admin.access'::text) AS has_permission)));

CREATE POLICY orders_select_own ON public.orders AS PERMISSIVE
  FOR SELECT TO authenticated
  USING (((user_id = (
    SELECT
      auth.uid () AS uid))
      OR (
        SELECT
          app_private.has_permission ('admin.access'::text) AS has_permission)));

CREATE POLICY organization_exam_assignments_same_org ON public.organization_exam_assignments AS PERMISSIVE
  FOR SELECT TO authenticated
  USING (((
    SELECT
      app_private.is_org_member (organization_exam_assignments.organization_id) AS is_org_member)
      OR (
        SELECT
          app_private.has_permission ('admin.access'::text) AS has_permission)));

CREATE POLICY organization_licenses_same_org ON public.organization_licenses AS PERMISSIVE
  FOR SELECT TO authenticated
  USING (((
    SELECT
      app_private.is_org_member (organization_licenses.organization_id) AS is_org_member)
      OR (
        SELECT
          app_private.has_permission ('admin.access'::text) AS has_permission)));

CREATE POLICY organization_members_same_org ON public.organization_members AS PERMISSIVE
  FOR SELECT TO authenticated
  USING (((
    SELECT
      app_private.is_org_member (organization_members.organization_id) AS is_org_member)
      OR (
        SELECT
          app_private.has_permission ('admin.access'::text) AS has_permission)));

CREATE POLICY organizations_member_read ON public.organizations AS PERMISSIVE
  FOR SELECT TO authenticated
  USING (((
    SELECT
      app_private.is_org_member (organizations.id) AS is_org_member)
      OR (
        SELECT
          app_private.has_permission ('admin.access'::text) AS has_permission)));

CREATE POLICY payments_select_own ON public.payments AS PERMISSIVE
  FOR SELECT TO authenticated
  USING (((EXISTS (
    SELECT
      1
    FROM
      orders o
    WHERE ((o.id = payments.order_id)
    AND (o.user_id = (
      SELECT
        auth.uid () AS uid)))))
        OR (
          SELECT
            app_private.has_permission ('admin.access'::text) AS has_permission)));

CREATE POLICY periods_read ON public.periods AS PERMISSIVE
  FOR SELECT TO authenticated
  USING (((upper(status) = ANY (ARRAY['UPCOMING'::text, 'ACTIVE'::text, 'CLOSED'::text]))
    OR (
      SELECT
        app_private.has_permission ('admin.access'::text) AS has_permission)));

CREATE POLICY product_features_read ON public.product_features AS PERMISSIVE
  FOR SELECT TO authenticated
  USING (TRUE);

CREATE POLICY product_prices_read ON public.product_prices AS PERMISSIVE
  FOR SELECT TO authenticated
  USING (TRUE);

CREATE POLICY products_read ON public.products AS PERMISSIVE
  FOR SELECT TO authenticated
  USING (((upper(status) = 'ACTIVE'::text)
    OR (
      SELECT
        app_private.has_permission ('admin.access'::text) AS has_permission)));

CREATE POLICY profiles_select_own_or_admin ON public.profiles AS PERMISSIVE
  FOR SELECT TO authenticated
  USING (((id = (
    SELECT
      auth.uid () AS uid))
      OR (
        SELECT
          app_private.has_permission ('admin.access'::text) AS has_permission)));

CREATE POLICY profiles_update_own ON public.profiles AS PERMISSIVE
  FOR UPDATE TO authenticated
  USING ((id = (
    SELECT
      auth.uid () AS uid)))
  WITH CHECK ((id = (
    SELECT
      auth.uid () AS uid)));

CREATE POLICY programs_read ON public.programs AS PERMISSIVE
  FOR SELECT TO authenticated
  USING (((upper(status) = 'ACTIVE'::text)
    OR (
      SELECT
        app_private.has_permission ('admin.access'::text) AS has_permission)));

CREATE POLICY promotion_redemptions_select_own ON public.promotion_redemptions AS PERMISSIVE
  FOR SELECT TO authenticated
  USING (((user_id = (
    SELECT
      auth.uid () AS uid))
      OR (
        SELECT
          app_private.has_permission ('admin.access'::text) AS has_permission)));

CREATE POLICY promotions_read_active ON public.promotions AS PERMISSIVE
  FOR SELECT TO authenticated
  USING (((upper(status) = 'ACTIVE'::text)
    AND (starts_at <= now())
    AND ((ends_at IS NULL)
    OR (ends_at > now()))));
