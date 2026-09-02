-- TKA Diagnostic Performance Hardening V1
-- Adds covering indexes for diagnostic foreign keys and makes auth.uid()
-- evaluation stable per statement in learner-facing RLS policies.

create index if not exists idx_diagnostic_profiles_user_track_id
  on public.diagnostic_profiles(user_track_id);

create index if not exists idx_diagnostic_profiles_track_id
  on public.diagnostic_profiles(track_id);

create index if not exists idx_diagnostic_profiles_exam_id
  on public.diagnostic_profiles(exam_id);

create index if not exists idx_diagnostic_profiles_recommended_subject_id
  on public.diagnostic_profiles(recommended_subject_id)
  where recommended_subject_id is not null;

create index if not exists idx_diagnostic_profiles_recommended_knowledge_node_id
  on public.diagnostic_profiles(recommended_knowledge_node_id)
  where recommended_knowledge_node_id is not null;

create index if not exists idx_diagnostic_competency_results_subject_id
  on public.diagnostic_competency_results(subject_id);

create index if not exists idx_diagnostic_competency_results_knowledge_node_id
  on public.diagnostic_competency_results(knowledge_node_id);

drop policy if exists diagnostic_profiles_select_own on public.diagnostic_profiles;
create policy diagnostic_profiles_select_own
on public.diagnostic_profiles
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists diagnostic_competency_results_select_own on public.diagnostic_competency_results;
create policy diagnostic_competency_results_select_own
on public.diagnostic_competency_results
for select
to authenticated
using (
  exists (
    select 1
    from public.diagnostic_profiles dp
    where dp.id = diagnostic_profile_id
      and dp.user_id = (select auth.uid())
  )
);
