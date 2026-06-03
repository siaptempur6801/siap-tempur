create or replace function public.complete_tryout_event_session(
    p_user_id uuid,
    p_session_id uuid
)
returns table(
    success boolean,
    event_id uuid,
    message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
    v_event_id uuid;
begin
    if coalesce(auth.role(), '') <> 'service_role' then
        raise exception 'Not authorized';
    end if;

    if p_user_id is null or p_session_id is null then
        raise exception 'Invalid event completion request';
    end if;

    select tes.event_id
    into v_event_id
    from public.tryout_event_sessions tes
    where tes.session_id = p_session_id
      and tes.user_id = p_user_id
    for update;

    if v_event_id is null then
        return query select false, null::uuid, 'Event session not found';
        return;
    end if;

    update public.tryout_event_sessions tes
    set
        status = 'completed',
        finished_at = now()
    where tes.session_id = p_session_id
      and tes.user_id = p_user_id;

    update public.tryout_event_participants tep
    set status = 'completed'
    where tep.event_id = v_event_id
      and tep.user_id = p_user_id;

    return query select true, v_event_id, 'Event session completed';
end;
$$;

revoke execute on function public.complete_tryout_event_session(uuid, uuid) from public;
revoke execute on function public.complete_tryout_event_session(uuid, uuid) from anon;
revoke execute on function public.complete_tryout_event_session(uuid, uuid) from authenticated;
grant execute on function public.complete_tryout_event_session(uuid, uuid) to service_role;
