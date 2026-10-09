-- Read projections only. Apply and verify on staging before deploying callers.
-- Privileged CPNS projections retain server-side authorization at their callers;
-- TKA quota summaries always use auth.uid() and the caller's existing RLS.
create or replace function public.learner_completed_attempt_totals()
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
    where ea.user_id = (select auth.uid()) and ea.status in ('completed', 'COMPLETED');
$$;

revoke all on function public.learner_completed_attempt_totals() from public, anon;
grant execute on function public.learner_completed_attempt_totals() to authenticated, service_role;
