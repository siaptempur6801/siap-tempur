-- Allow Tryout Akbar events to use either a full SKD package or a focused mini package.
-- Full TO stays 110 questions. Mini event packages use the standard TWK/TIU/TKP counts.

create or replace function public.start_tryout_event_session(
  p_user_id uuid,
  p_event_id uuid
)
returns table (
  session_id uuid,
  resumed boolean,
  message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event record;
  v_existing_session uuid;
  v_session_id uuid;
  v_question_count int;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Not authorized';
  end if;

  if p_user_id is null or p_event_id is null then
    raise exception 'Invalid event session request';
  end if;

  select tes.session_id
  into v_existing_session
  from public.tryout_event_sessions tes
  where tes.event_id = p_event_id
    and tes.user_id = p_user_id;

  if v_existing_session is not null then
    return query select v_existing_session, true, 'Sesi event sudah ada';
    return;
  end if;

  select id, status, starts_at, start_grace_minutes
  into v_event
  from public.tryout_events
  where id = p_event_id
  for update;

  if not found then
    return query select null::uuid, false, 'Event tidak ditemukan';
    return;
  end if;

  if v_event.status not in ('scheduled', 'live')
    or now() < v_event.starts_at
    or now() > v_event.starts_at + (v_event.start_grace_minutes || ' minutes')::interval
  then
    return query select null::uuid, false, 'Event belum live atau start window sudah ditutup';
    return;
  end if;

  if not exists (
    select 1
    from public.tryout_event_participants
    where event_id = p_event_id
      and user_id = p_user_id
  ) then
    return query select null::uuid, false, 'Daftar event terlebih dahulu sebelum mulai';
    return;
  end if;

  select count(*)
  into v_question_count
  from public.tryout_event_questions
  where event_id = p_event_id;

  if v_question_count not in (30, 35, 45, 110) then
    return query select null::uuid, false, 'Paket soal event belum lengkap';
    return;
  end if;

  insert into public.test_sessions (user_id, mode, status, start_time, last_activity_at)
  values (p_user_id, 'tryout', 'in_progress', now(), now())
  returning id into v_session_id;

  insert into public.test_answers (session_id, question_id)
  select v_session_id, question_id
  from public.tryout_event_questions
  where event_id = p_event_id
  order by sort_order;

  insert into public.tryout_event_sessions (
    event_id,
    user_id,
    session_id,
    status,
    started_at
  )
  values (
    p_event_id,
    p_user_id,
    v_session_id,
    'started',
    now()
  );

  update public.tryout_event_participants
  set status = 'started'
  where event_id = p_event_id
    and user_id = p_user_id;

  return query select v_session_id, false, 'Sesi event berhasil dibuat';
end;
$$;

revoke execute on function public.start_tryout_event_session(uuid, uuid) from public, anon, authenticated;
grant execute on function public.start_tryout_event_session(uuid, uuid) to service_role;
