-- Production readiness hardening for token/session integrity and event concurrency.
-- Forward-only migration. Do not apply without a tested deployment plan.

create or replace function public.start_tryout_session(p_user_id uuid)
returns table (
  session_id uuid,
  questions json
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
  v_questions json;
  v_remaining_quota int;
  v_expected_questions int;
  v_selected_questions int;
begin
  if coalesce(auth.role(), '') <> 'service_role'
    and p_user_id <> (select auth.uid())
  then
    raise exception 'Not authorized';
  end if;

  select coalesce(sum(question_count), 0)
  into v_expected_questions
  from public.tryout_configurations
  where is_active = true;

  if v_expected_questions <> 110 then
    raise exception 'Konfigurasi tryout tidak valid: expected 110 questions, got %', v_expected_questions;
  end if;

  create temp table if not exists temp_selected_questions (
    question_id uuid,
    sort_order int
  ) on commit drop;

  truncate temp_selected_questions;

  insert into temp_selected_questions (question_id, sort_order)
  select q.id, tc.sort_order
  from public.tryout_configurations tc
  cross join lateral (
    select id
    from public.questions q_inner
    where q_inner.type = tc.type::question_type
      and q_inner.sub_category = tc.sub_category
    order by random()
    limit tc.question_count
  ) q
  where tc.is_active = true;

  select count(*)
  into v_selected_questions
  from temp_selected_questions;

  if v_selected_questions <> v_expected_questions then
    raise exception 'Bank soal belum lengkap: expected % questions, selected %', v_expected_questions, v_selected_questions;
  end if;

  update public.profiles
  set tryout_quota = tryout_quota - 1
  where id = p_user_id
    and coalesce(tryout_quota, 0) > 0
  returning tryout_quota into v_remaining_quota;

  if not found then
    raise exception 'Not enough SKD tickets';
  end if;

  insert into public.test_sessions (user_id, mode, status, start_time, last_activity_at)
  values (p_user_id, 'tryout', 'in_progress', now(), now())
  returning id into v_session_id;

  insert into public.test_answers (session_id, question_id)
  select v_session_id, question_id
  from temp_selected_questions;

  select json_agg(
    json_build_object(
      'id', q.id,
      'content', q.content,
      'type', q.type,
      'category', q.category,
      'sub_category', q.sub_category,
      'image_url', q.image_url,
      'options', (
        select json_agg(
          json_build_object(
            'id', o.id,
            'content', o.content,
            'image_url', o.image_url
          ) order by random()
        )
        from public.options o
        where o.question_id = q.id
      )
    ) order by tsq.sort_order, random()
  )
  into v_questions
  from temp_selected_questions tsq
  join public.questions q on q.id = tsq.question_id;

  return query select v_session_id, v_questions;
end;
$$;

create or replace function public.register_tryout_event_participant(
  p_user_id uuid,
  p_event_id uuid,
  p_event_code text default null
)
returns table (
  success boolean,
  message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event record;
  v_code record;
  v_participant_count int;
  v_normalized_code text := upper(trim(coalesce(p_event_code, '')));
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Not authorized';
  end if;

  if p_user_id is null or p_event_id is null then
    raise exception 'Invalid event registration request';
  end if;

  select id, status, max_participants, requires_code
  into v_event
  from public.tryout_events
  where id = p_event_id
  for update;

  if not found then
    return query select false, 'Event tidak ditemukan';
    return;
  end if;

  if v_event.status not in ('scheduled', 'live') then
    return query select false, 'Event belum dibuka untuk pendaftaran';
    return;
  end if;

  if exists (
    select 1
    from public.tryout_event_participants
    where event_id = p_event_id
      and user_id = p_user_id
  ) then
    return query select true, 'Kamu sudah terdaftar di event ini';
    return;
  end if;

  if v_event.max_participants is not null then
    select count(*)
    into v_participant_count
    from public.tryout_event_participants
    where event_id = p_event_id;

    if v_participant_count >= v_event.max_participants then
      return query select false, 'Kuota peserta event sudah penuh';
      return;
    end if;
  end if;

  if v_event.requires_code then
    if v_normalized_code = '' then
      return query select false, 'Kode masuk wajib diisi untuk event ini';
      return;
    end if;

    select id, max_uses, used_count, is_active, expires_at
    into v_code
    from public.tryout_event_codes
    where event_id = p_event_id
      and code = v_normalized_code
    for update;

    if not found then
      return query select false, 'Kode masuk tidak ditemukan';
      return;
    end if;

    if not v_code.is_active then
      return query select false, 'Kode masuk sudah tidak aktif';
      return;
    end if;

    if v_code.expires_at is not null and v_code.expires_at <= now() then
      return query select false, 'Kode masuk sudah kadaluarsa';
      return;
    end if;

    if v_code.used_count >= v_code.max_uses then
      return query select false, 'Limit penggunaan kode masuk sudah penuh';
      return;
    end if;

    update public.tryout_event_codes
    set used_count = used_count + 1,
        updated_at = now()
    where id = v_code.id;
  end if;

  insert into public.tryout_event_participants (
    event_id,
    event_code_id,
    user_id,
    status
  )
  values (
    p_event_id,
    case when v_event.requires_code then v_code.id else null end,
    p_user_id,
    'registered'
  );

  return query select true, 'Berhasil daftar Tryout Akbar';
end;
$$;

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

  if v_question_count <> 110 then
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

revoke execute on function public.register_tryout_event_participant(uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public.start_tryout_event_session(uuid, uuid) from public, anon, authenticated;
grant execute on function public.register_tryout_event_participant(uuid, uuid, text) to service_role;
grant execute on function public.start_tryout_event_session(uuid, uuid) to service_role;
