-- TKA Diagnostic Performance Hardening V1
-- Adds covering indexes for diagnostic foreign keys and makes auth.uid()
-- evaluation stable per statement in learner-facing RLS policies.
CREATE INDEX IF NOT EXISTS idx_diagnostic_profiles_user_track_id ON public.diagnostic_profiles (user_track_id);

CREATE INDEX IF NOT EXISTS idx_diagnostic_profiles_track_id ON public.diagnostic_profiles (track_id);

CREATE INDEX IF NOT EXISTS idx_diagnostic_profiles_exam_id ON public.diagnostic_profiles (exam_id);

CREATE INDEX IF NOT EXISTS idx_diagnostic_profiles_recommended_subject_id ON public.diagnostic_profiles (recommended_subject_id)
WHERE
  recommended_subject_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_diagnostic_profiles_recommended_knowledge_node_id ON public.diagnostic_profiles (recommended_knowledge_node_id)
WHERE
  recommended_knowledge_node_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_diagnostic_competency_results_subject_id ON public.diagnostic_competency_results (subject_id);

CREATE INDEX IF NOT EXISTS idx_diagnostic_competency_results_knowledge_node_id ON public.diagnostic_competency_results (knowledge_node_id);

DROP POLICY IF EXISTS diagnostic_profiles_select_own ON public.diagnostic_profiles;

CREATE POLICY diagnostic_profiles_select_own ON public.diagnostic_profiles
  FOR SELECT TO authenticated
  USING (user_id = (
    SELECT
      auth.uid ()));

DROP POLICY IF EXISTS diagnostic_competency_results_select_own ON public.diagnostic_competency_results;

CREATE POLICY diagnostic_competency_results_select_own ON public.diagnostic_competency_results
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT
      1
    FROM
      public.diagnostic_profiles dp
    WHERE
      dp.id = diagnostic_profile_id
      AND dp.user_id = (
        SELECT
          auth.uid ())));
