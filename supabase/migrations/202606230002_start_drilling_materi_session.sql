alter table public.test_sessions
add column if not exists session_kind text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'test_sessions_session_kind_check'
      and conrelid = 'public.test_sessions'::regclass
  ) then
    alter table public.test_sessions
    add constraint test_sessions_session_kind_check
    check (
      session_kind is null
      or session_kind in ('full_tryout', 'mini_tryout', 'drilling_materi', 'event')
    );
  end if;
end;
$$;

create or replace function public.set_default_test_session_kind()
returns trigger 
language plpgsql
set search_path = public
as $$
begin
  if new.session_kind is null then
    new.session_kind := case
      when new.mode = 'tryout' then 'full_tryout'
      when new.mode = 'practice' then 'mini_tryout'
      else null
    end;
  end if;

  return new;
end;
$$;

drop trigger if exists set_default_test_session_kind on public.test_sessions;
create trigger set_default_test_session_kind
before insert on public.test_sessions
for each row
execute function public.set_default_test_session_kind();

create or replace function public.start_drilling_materi_session(
  p_user_id uuid,
  p_type public.question_type,
  p_sub_category text
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
  v_existing_session_id uuid;
  v_questions json;
  v_remaining_quota int;
  v_selected_questions int;
  v_sub_category text;
begin
  if coalesce(auth.role(), '') <> 'service_role'
    and p_user_id <> (select auth.uid())
  then
    raise exception 'Not authorized';
  end if;

  v_sub_category := nullif(btrim(p_sub_category), '');

  if p_user_id is null or p_type is null or v_sub_category is null then
    raise exception 'Invalid drilling materi request';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    'start_drilling_materi_session:' || p_user_id::text || ':' || p_type::text || ':' || v_sub_category,
    0
  ));

  select ts.id
  into v_existing_session_id
  from public.test_sessions ts
  where ts.user_id = p_user_id
    and ts.mode = 'practice'
    and (ts.session_kind = 'drilling_materi' or ts.session_kind is null)
    and ts.status = 'in_progress'
    and (
      select count(*)
      from public.test_answers ta
      join public.questions q on q.id = ta.question_id
      where ta.session_id = ts.id
        and q.type = p_type
        and btrim(q.sub_category) = v_sub_category
    ) = 30
    and not exists (
      select 1
      from public.test_answers ta
      join public.questions q on q.id = ta.question_id
      where ta.session_id = ts.id
        and (q.type <> p_type or btrim(q.sub_category) is distinct from v_sub_category)
    )
  order by ts.last_activity_at desc nulls last, ts.start_time desc
  limit 1;

  if v_existing_session_id is not null then
    return query select v_existing_session_id, null::json;
    return;
  end if;

  create temp table if not exists temp_drilling_materi_questions (
    question_id uuid,
    sort_order int
  ) on commit drop;

  truncate temp_drilling_materi_questions;

  insert into temp_drilling_materi_questions (question_id, sort_order)
  select selected.id, (row_number() over ())::int
  from (
    select q.id
    from public.questions q
    where q.type = p_type
      and btrim(q.sub_category) = v_sub_category
    order by random()
    limit 30
  ) selected;

  select count(*)
  into v_selected_questions
  from temp_drilling_materi_questions;

  if v_selected_questions <> 30 then
    raise exception 'Bank soal drilling materi belum lengkap: expected 30 questions, selected %',
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

  insert into public.test_sessions (user_id, mode, status, session_kind, start_time, last_activity_at)
  values (p_user_id, 'practice', 'in_progress', 'drilling_materi', now(), now())
  returning id into v_session_id;

  insert into public.test_answers (session_id, question_id)
  select v_session_id, question_id
  from temp_drilling_materi_questions;

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
    ) order by tdmq.sort_order
  )
  into v_questions
  from temp_drilling_materi_questions tdmq
  join public.questions q on q.id = tdmq.question_id;

  return query select v_session_id, v_questions;
end;
$$;

revoke execute on function public.start_drilling_materi_session(uuid, public.question_type, text) from public, anon;
grant execute on function public.start_drilling_materi_session(uuid, public.question_type, text) to authenticated, service_role;
