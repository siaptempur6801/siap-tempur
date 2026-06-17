-- Charge one SKD token when a user starts a new mini tryout session.
-- Existing in-progress mini sessions are resumed from the app action and do not call this RPC.

create or replace function public.start_mini_tryout_session(
  p_user_id uuid,
  p_type public.question_type,
  p_limit int
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
  v_remaining_quota int;
  v_expected_limit int;
  v_selected_questions int;
begin
  if coalesce(auth.role(), '') <> 'service_role'
    and p_user_id <> (select auth.uid())
  then
    raise exception 'Not authorized';
  end if;

  if p_user_id is null or p_type is null or p_limit is null then
    raise exception 'Invalid mini tryout request';
  end if;

  v_expected_limit := case p_type
    when 'TWK'::public.question_type then 30
    when 'TIU'::public.question_type then 35
    when 'TKP'::public.question_type then 45
  end;

  if v_expected_limit is null or p_limit <> v_expected_limit then
    raise exception 'Invalid mini tryout request';
  end if;

  create temp table if not exists temp_mini_tryout_questions (
    question_id uuid,
    sort_order int
  ) on commit drop;

  truncate temp_mini_tryout_questions;

  insert into temp_mini_tryout_questions (question_id, sort_order)
  select selected.id, (row_number() over ())::int
  from (
    select q.id
    from public.questions q
    where q.type = p_type
    order by random()
    limit v_expected_limit
  ) selected;

  select count(*)
  into v_selected_questions
  from temp_mini_tryout_questions;

  if v_selected_questions <> v_expected_limit then
    raise exception 'Bank soal mini tryout belum lengkap: expected % questions, selected %',
      v_expected_limit,
      v_selected_questions;
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
  values (p_user_id, 'practice', 'in_progress', now(), now())
  returning id into v_session_id;

  insert into public.test_answers (session_id, question_id)
  select v_session_id, question_id
  from temp_mini_tryout_questions;

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
    ) order by tmq.sort_order
  )
  into v_questions
  from temp_mini_tryout_questions tmq
  join public.questions q on q.id = tmq.question_id;

  return query select v_session_id, v_questions;
end;
$$;

revoke execute on function public.start_practice_session(uuid, public.question_type, int) from public, anon, authenticated;
grant execute on function public.start_practice_session(uuid, public.question_type, int) to service_role;

revoke execute on function public.start_mini_tryout_session(uuid, public.question_type, int) from public, anon;
grant execute on function public.start_mini_tryout_session(uuid, public.question_type, int) to authenticated, service_role;
