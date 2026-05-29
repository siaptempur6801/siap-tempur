-- Harden direct client access to answer keys, vouchers, and payment writes.

alter type public.user_role add value if not exists 'superadmin';

create or replace function public.is_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role::text in ('admin', 'superadmin')
  );
end;
$$;

-- Keep sensitive answer columns unavailable through PostgREST.
revoke all privileges on public.questions from anon, authenticated;
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
) on public.questions to authenticated;

revoke all privileges on public.options from anon, authenticated;
revoke select on public.options from anon, authenticated;
grant select (
  id,
  question_id,
  content,
  image_url,
  created_at
) on public.options to authenticated;

drop policy if exists "Everyone can view questions" on public.questions;
drop policy if exists "Users can view session questions" on public.questions;
create policy "Users can view session questions"
on public.questions
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.test_answers ta
    join public.test_sessions ts on ts.id = ta.session_id
    where ta.question_id = questions.id
      and ts.user_id = auth.uid()
  )
);

drop policy if exists "Everyone can view options" on public.options;
drop policy if exists "Users can view session options" on public.options;
create policy "Users can view session options"
on public.options
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.test_answers ta
    join public.test_sessions ts on ts.id = ta.session_id
    where ta.question_id = options.question_id
      and ts.user_id = auth.uid()
  )
);

-- Voucher codes are validated via claim_voucher(); users should not list all active codes.
drop policy if exists "Authenticated users can read vouchers" on public.vouchers;
drop policy if exists "Admins can read vouchers" on public.vouchers;
revoke all privileges on public.vouchers from anon, authenticated;
revoke select on public.vouchers from anon, authenticated;
create policy "Admins can read vouchers"
on public.vouchers
for select
to authenticated
using (public.is_admin());

-- Client-created payment rows are no longer needed. Server actions use service role.
drop policy if exists "Users can insert own transactions" on public.transactions;
revoke all privileges on public.transactions from anon, authenticated;
grant select on public.transactions to authenticated;
revoke insert on public.transactions from anon, authenticated;

-- Align tryout configuration write policies with the shared admin helper.
drop policy if exists "Admins can delete tryout configurations" on public.tryout_configurations;
drop policy if exists "Admins can insert tryout configurations" on public.tryout_configurations;
drop policy if exists "Admins can update tryout configurations" on public.tryout_configurations;

create policy "Admins can delete tryout configurations"
on public.tryout_configurations
for delete
to authenticated
using (public.is_admin());

create policy "Admins can insert tryout configurations"
on public.tryout_configurations
for insert
to authenticated
with check (public.is_admin());

create policy "Admins can update tryout configurations"
on public.tryout_configurations
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace function public.process_paid_transaction(
  p_order_id text,
  p_transaction_status transaction_status,
  p_increment_by int default 0
)
returns table (
  status transaction_status,
  quota_granted boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_transaction record;
  v_success_statuses transaction_status[] := array['capture'::transaction_status, 'settlement'::transaction_status];
  v_is_success boolean;
  v_already_success boolean;
  v_next_status transaction_status;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Not authorized';
  end if;

  if p_order_id is null or btrim(p_order_id) = '' or p_transaction_status is null then
    raise exception 'Invalid transaction status update';
  end if;

  select t.id, t.user_id, t.status
  into v_transaction
  from public.transactions t
  where t.order_id = p_order_id
  for update;

  if not found then
    raise exception 'Transaction not found';
  end if;

  v_is_success := p_transaction_status = any(v_success_statuses);
  v_already_success := v_transaction.status = any(v_success_statuses);
  v_next_status := p_transaction_status;
  quota_granted := false;

  if v_is_success then
    if v_already_success then
      if v_transaction.status = 'settlement'::transaction_status then
        v_next_status := v_transaction.status;
      elsif p_transaction_status = 'settlement'::transaction_status then
        v_next_status := 'settlement'::transaction_status;
      else
        v_next_status := v_transaction.status;
      end if;
    elsif coalesce(p_increment_by, 0) > 0 then
      update public.profiles
      set tryout_quota = coalesce(tryout_quota, 0) + p_increment_by
      where id = v_transaction.user_id;

      if not found then
        raise exception 'Profile not found';
      end if;

      quota_granted := true;
    end if;
  elsif v_already_success then
    v_next_status := v_transaction.status;
  end if;

  update public.transactions
  set status = v_next_status,
      updated_at = now()
  where id = v_transaction.id;

  status := v_next_status;
  return next;
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
begin
  if coalesce(auth.role(), '') <> 'service_role'
    and p_user_id <> (select auth.uid())
  then
    raise exception 'Not authorized';
  end if;

  update public.profiles
  set tryout_quota = tryout_quota - 1
  where id = p_user_id
    and coalesce(tryout_quota, 0) > 0;

  if not found then
    raise exception 'Not enough SKD tickets';
  end if;

  insert into public.test_sessions (user_id, mode, status, start_time, last_activity_at)
  values (p_user_id, 'tryout', 'in_progress', now(), now())
  returning id into v_session_id;

  with selected_questions as (
    select q.id, tc.sort_order
    from public.tryout_configurations tc
    cross join lateral (
      select q_inner.id
      from public.questions q_inner
      where q_inner.type = tc.type::question_type
        and q_inner.sub_category = tc.sub_category
      order by random()
      limit tc.question_count
    ) q
    where tc.is_active = true
  ),
  inserted_answers as (
    insert into public.test_answers (session_id, question_id)
    select v_session_id, id
    from selected_questions
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
    ) order by sq.sort_order, random()
  )
  into v_questions
  from selected_questions sq
  join inserted_answers ia on ia.question_id = sq.id
  join public.questions q on q.id = sq.id;

  return query select v_session_id, v_questions;
end;
$$;

create or replace function public.get_live_event_leaderboard(p_event_id uuid)
returns table (
  user_id uuid,
  full_name text,
  avatar_url text,
  progress_count bigint,
  live_rank bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Access denied. Only admins can view the live leaderboard.';
  end if;

  return query
  with session_scores as (
    select
      tes.user_id,
      tes.started_at,
      count(a.option_id) as answered_count,
      coalesce(sum(
        case
          when q.type in ('TWK', 'TIU') and o.is_correct then 5
          when q.type = 'TKP' then coalesce(o.score_value, 0)
          else 0
        end
      ), 0) as total_score
    from public.tryout_event_sessions tes
    left join public.test_answers a on a.session_id = tes.session_id
    left join public.questions q on q.id = a.question_id
    left join public.options o on o.id = a.option_id
    where tes.event_id = p_event_id
    group by tes.user_id, tes.started_at
  )
  select
    ss.user_id,
    p.full_name,
    p.avatar_url,
    ss.answered_count,
    rank() over (order by ss.total_score desc, ss.started_at asc) as live_rank
  from session_scores ss
  join public.profiles p on p.id = ss.user_id
  order by live_rank asc
  limit 50;
end;
$$;

revoke execute on function public.process_paid_transaction(text, transaction_status, int) from public, anon, authenticated;
grant execute on function public.process_paid_transaction(text, transaction_status, int) to service_role;
