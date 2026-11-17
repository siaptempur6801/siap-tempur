create or replace function public.recalculate_event_rankings(p_event_id uuid)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
    v_count integer;
begin
    delete from public.event_rankings
    where event_id = p_event_id;

    with best_attempts as (
        select distinct on (a.user_id)
            a.user_id,
            a.id as attempt_id,
            coalesce(a.total_score, 0)::numeric as score,
            coalesce(a.duration_used_seconds, 2147483647) as duration_seconds,
            a.submitted_at,
            a.passed
        from public.exam_attempts a
        where lower(a.status) = 'completed'
          and a.metadata ->> 'eventId' = p_event_id::text
        order by
            a.user_id,
            coalesce(a.total_score, 0) desc,
            coalesce(a.duration_used_seconds, 2147483647) asc,
            a.submitted_at asc nulls last,
            a.id asc
    ), ranked as (
        select
            p_event_id as event_id,
            b.user_id,
            b.attempt_id,
            b.score,
            b.duration_seconds,
            row_number() over (
                order by
                    b.score desc,
                    b.duration_seconds asc,
                    b.submitted_at asc nulls last,
                    b.attempt_id asc
            )::integer as rank,
            case when b.passed is true then 'passed' else 'not_passed' end as rank_group
        from best_attempts b
    )
    insert into public.event_rankings (
        event_id,
        user_id,
        attempt_id,
        score,
        duration_seconds,
        rank,
        rank_group,
        calculated_at
    )
    select
        r.event_id,
        r.user_id,
        r.attempt_id,
        r.score,
        r.duration_seconds,
        r.rank,
        r.rank_group,
        now()
    from ranked r;

    update public.exam_attempts a
       set rank = er.rank,
           updated_at = now()
      from public.event_rankings er
     where er.event_id = p_event_id
       and er.attempt_id = a.id;

    select count(*)::integer
      into v_count
      from public.event_rankings
     where event_id = p_event_id;

    return v_count;
end;
$$;

revoke all on function public.recalculate_event_rankings(uuid) from public;
revoke all on function public.recalculate_event_rankings(uuid) from anon;
revoke all on function public.recalculate_event_rankings(uuid) from authenticated;
grant execute on function public.recalculate_event_rankings(uuid) to service_role;
