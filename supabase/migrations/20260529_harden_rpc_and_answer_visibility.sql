-- Harden security-definer RPCs and hide answer keys from direct client reads.

-- Authenticated users may read questions/options for active sessions, but they
-- must not be able to read answer keys or explanations directly from PostgREST.
revoke select on public.questions from anon, authenticated;
grant select (
  id,
  question_code,
  content,
  type,
  category,
  sub_category,
  image_url,
  created_at
) on public.questions to anon, authenticated;

revoke select on public.options from anon, authenticated;
grant select (
  id,
  question_id,
  content,
  image_url,
  created_at
) on public.options to anon, authenticated;

-- Keep direct writes blocked for normal clients. Admin/server code should use
-- the service role client or explicit admin-only RPCs.
revoke insert, update, delete on public.questions from anon, authenticated;
revoke insert, update, delete on public.options from anon, authenticated;

create or replace function public.increment_tryout_quota(user_id_param uuid, increment_by int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Not authorized';
  end if;

  if user_id_param is null or increment_by is null or increment_by <= 0 then
    raise exception 'Invalid quota increment';
  end if;

  update public.profiles
  set tryout_quota = coalesce(tryout_quota, 0) + increment_by
  where id = user_id_param;

  if not found then
    raise exception 'Profile not found';
  end if;
end;
$$;

create or replace function public.calculate_session_score(session_uuid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_user_id uuid;
  v_twk int;
  v_tiu int;
  v_tkp int;
  v_total int;
  v_passed boolean;
  pass_twk int := 65;
  pass_tiu int := 80;
  pass_tkp int := 166;
begin
  select user_id
  into v_session_user_id
  from public.test_sessions
  where id = session_uuid;

  if v_session_user_id is null then
    raise exception 'Session not found';
  end if;

  if coalesce(auth.role(), '') <> 'service_role'
    and v_session_user_id <> (select auth.uid())
  then
    raise exception 'Not authorized';
  end if;

  select coalesce(sum(case when q.type = 'TWK' and o.is_correct then 5 else 0 end), 0)
  into v_twk
  from public.test_answers a
  join public.questions q on a.question_id = q.id
  left join public.options o on a.option_id = o.id and o.question_id = a.question_id
  where a.session_id = session_uuid;

  select coalesce(sum(case when q.type = 'TIU' and o.is_correct then 5 else 0 end), 0)
  into v_tiu
  from public.test_answers a
  join public.questions q on a.question_id = q.id
  left join public.options o on a.option_id = o.id and o.question_id = a.question_id
  where a.session_id = session_uuid;

  select coalesce(sum(case when q.type = 'TKP' then coalesce(o.score_value, 0) else 0 end), 0)
  into v_tkp
  from public.test_answers a
  join public.questions q on a.question_id = q.id
  left join public.options o on a.option_id = o.id and o.question_id = a.question_id
  where a.session_id = session_uuid;

  v_total := v_twk + v_tiu + v_tkp;
  v_passed := (v_twk >= pass_twk and v_tiu >= pass_tiu and v_tkp >= pass_tkp);

  update public.test_sessions
  set
    score_twk = v_twk,
    score_tiu = v_tiu,
    score_tkp = v_tkp,
    total_score = v_total,
    is_passed = v_passed,
    status = 'completed',
    end_time = now(),
    last_activity_at = now()
  where id = session_uuid;
end;
$$;

create or replace function public.start_practice_session(
  p_user_id uuid,
  p_type question_type,
  p_limit int default 10
)
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
begin
  if coalesce(auth.role(), '') <> 'service_role'
    and p_user_id <> (select auth.uid())
  then
    raise exception 'Not authorized';
  end if;

  if p_user_id is null or p_type is null or p_limit is null or p_limit < 1 or p_limit > 110 then
    raise exception 'Invalid practice request';
  end if;

  insert into public.test_sessions (user_id, mode, status, start_time, last_activity_at)
  values (p_user_id, 'practice', 'in_progress', now(), now())
  returning id into v_session_id;

  with selected_questions as (
    select id, content, type, category, sub_category, image_url
    from public.questions
    where type = p_type
    order by random()
    limit p_limit
  ),
  inserted_answers as (
    insert into public.test_answers (session_id, question_id)
    select v_session_id, id from selected_questions
    returning question_id
  )
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
    )
  )
  into v_questions
  from selected_questions q
  join inserted_answers ia on ia.question_id = q.id;

  return query select v_session_id, v_questions;
end;
$$;

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
begin
  if coalesce(auth.role(), '') <> 'service_role'
    and p_user_id <> (select auth.uid())
  then
    raise exception 'Not authorized';
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

create or replace function public.claim_voucher(
  p_user_id uuid,
  p_voucher_code text,
  p_user_email text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_voucher_id uuid;
  v_quota_amount int;
  v_max_uses int;
  v_used_count int;
  v_expires_at timestamp with time zone;
  v_is_active boolean;
  v_has_claimed boolean;
  v_resolved_email text;
begin
  if coalesce(auth.role(), '') <> 'service_role'
    and p_user_id <> (select auth.uid())
  then
    raise exception 'Not authorized';
  end if;

  if p_user_id is null or p_voucher_code is null or btrim(p_voucher_code) = '' then
    raise exception 'User ID dan Kode Voucher tidak boleh kosong';
  end if;

  select lower(trim(email))
  into v_resolved_email
  from auth.users
  where id = p_user_id;

  if v_resolved_email is null and coalesce(auth.role(), '') = 'service_role' then
    v_resolved_email := nullif(lower(trim(p_user_email)), '');
  end if;

  select id, quota_amount, max_uses, used_count, expires_at, is_active
  into v_voucher_id, v_quota_amount, v_max_uses, v_used_count, v_expires_at, v_is_active
  from public.vouchers
  where code = upper(trim(p_voucher_code))
  for update;

  if not found then
    raise exception 'Kode voucher tidak valid atau tidak ditemukan';
  end if;

  if not v_is_active then
    raise exception 'Kode voucher ini sudah tidak aktif';
  end if;

  if v_expires_at is not null and v_expires_at < now() then
    raise exception 'Kode voucher ini sudah kadaluarsa';
  end if;

  if v_used_count >= v_max_uses then
    raise exception 'Kuota untuk kode voucher ini sudah habis digunakan';
  end if;

  select exists (
    select 1 from public.voucher_claims
    where voucher_id = v_voucher_id and user_id = p_user_id
  ) into v_has_claimed;

  if v_has_claimed then
    raise exception 'Anda sudah pernah mengklaim kode voucher ini sebelumnya';
  end if;

  if v_resolved_email is not null then
    select exists (
      select 1 from public.voucher_claims
      where voucher_id = v_voucher_id
        and lower(trim(user_email)) = v_resolved_email
    ) into v_has_claimed;

    if v_has_claimed then
      raise exception 'Email ini sudah pernah mengklaim kode voucher ini. Voucher hanya dapat diklaim satu kali per pengguna';
    end if;
  end if;

  insert into public.voucher_claims (voucher_id, user_id, user_email)
  values (v_voucher_id, p_user_id, v_resolved_email);

  update public.vouchers
  set used_count = used_count + 1,
      updated_at = now()
  where id = v_voucher_id;

  update public.profiles
  set tryout_quota = coalesce(tryout_quota, 0) + v_quota_amount
  where id = p_user_id;

  return true;
end;
$$;

create or replace function public.claim_voucher(
  p_user_id uuid,
  p_voucher_code text
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.claim_voucher(p_user_id, p_voucher_code, null);
$$;

revoke execute on function public.increment_tryout_quota(uuid, int) from public, anon, authenticated;
grant execute on function public.increment_tryout_quota(uuid, int) to service_role;

revoke execute on function public.calculate_session_score(uuid) from public;
revoke execute on function public.start_practice_session(uuid, question_type, int) from public;
revoke execute on function public.start_tryout_session(uuid) from public;
revoke execute on function public.claim_voucher(uuid, text) from public;
revoke execute on function public.claim_voucher(uuid, text, text) from public;

grant execute on function public.calculate_session_score(uuid) to authenticated, service_role;
grant execute on function public.start_practice_session(uuid, question_type, int) to authenticated, service_role;
grant execute on function public.start_tryout_session(uuid) to authenticated, service_role;
grant execute on function public.claim_voucher(uuid, text) to authenticated, service_role;
grant execute on function public.claim_voucher(uuid, text, text) to authenticated, service_role;
