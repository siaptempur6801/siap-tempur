-- Read projections only. Apply and verify on staging before deploying callers.
-- Privileged CPNS projections retain server-side authorization at their callers;
-- TKA quota summaries always use auth.uid() and the caller's existing RLS.
create or replace function public.practice_completed_attempt_totals(p_user_id uuid)
returns table(total_sessions bigint, total_xp bigint)
language sql stable security invoker set search_path = '' as $$
    select count(*), coalesce(sum(greatest(
        case when ea.total_score is null or ea.total_score::text in ('NaN', 'Infinity', '-Infinity') then 0
             else greatest(0, floor(ea.total_score)) end,
        case when jsonb_typeof(ea.metadata -> 'practiceKind') = 'string' then
            case ea.metadata ->> 'practiceKind'
                when 'mini_tryout' then 20
                when 'full_tryout' then 30
                when 'event' then 30
                else 10 end
            else 10 end
    )), 0)::bigint
    from public.exam_attempts ea
    where ea.user_id = p_user_id and ea.status in ('completed', 'COMPLETED');
$$;

create or replace function public.practice_active_attempt_overviews(p_user_id uuid)
returns table(
    id uuid, exam_id uuid, started_at timestamptz, last_saved_at timestamptz,
    last_question_position integer, metadata jsonb, question_count bigint, answered_questions bigint
)
language sql stable security invoker set search_path = '' as $$
    with active as materialized (
        select ea.id, ea.exam_id, ea.started_at, ea.last_saved_at, ea.last_question_position, ea.metadata
        from public.exam_attempts ea
        where ea.user_id = p_user_id
          and ea.status in ('in_progress', 'IN_PROGRESS', 'created', 'CREATED')
        order by ea.last_saved_at desc nulls last
        limit 30
    )
    select a.*, progress.question_count, progress.answered_questions
    from active a
    cross join lateral (
        select count(*) as question_count,
               count(aa.selected_option_id) as answered_questions
        from public.attempt_questions aq
        left join public.attempt_answers aa on aa.attempt_question_id = aq.id
        where aq.attempt_id = a.id
    ) progress
    order by a.last_saved_at desc nulls last;
$$;

create or replace function public.learner_exam_attempt_summaries(
    p_exam_ids uuid[], p_direct_only boolean default false
)
returns table(exam_id uuid, attempt_count bigint, active_attempt_id uuid)
language sql stable security invoker set search_path = '' as $$
    with scoped as materialized (
        select ea.exam_id, ea.id, ea.status, ea.updated_at
        from public.exam_attempts ea
        where ea.user_id = (select auth.uid()) and ea.exam_id = any(p_exam_ids)
          and (not p_direct_only or ea.metadata ->> 'accessContext' is null
               or ea.metadata ->> 'accessContext' = 'direct')
    ), totals as (
        select s.exam_id, count(*) as attempt_count from scoped s group by s.exam_id
    ), active as (
        select distinct on (s.exam_id) s.exam_id, s.id
        from scoped s where lower(s.status) = 'in_progress'
        order by s.exam_id, s.updated_at desc
    )
    select t.exam_id, t.attempt_count, a.id
    from totals t left join active a on a.exam_id = t.exam_id;
$$;

revoke all on function public.practice_completed_attempt_totals(uuid),
    public.practice_active_attempt_overviews(uuid),
    public.learner_exam_attempt_summaries(uuid[], boolean) from public, anon, authenticated;
grant execute on function public.practice_completed_attempt_totals(uuid),
    public.practice_active_attempt_overviews(uuid) to service_role;
grant execute on function public.learner_exam_attempt_summaries(uuid[], boolean) to authenticated, service_role;
