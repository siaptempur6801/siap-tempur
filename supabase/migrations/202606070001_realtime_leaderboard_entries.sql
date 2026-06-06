-- Realtime-ish national leaderboard backed by Postgres.
-- Postgres remains the source of truth; Redis/cache layers can be added later.

create table if not exists public.leaderboard_entries (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  best_session_id uuid not null references public.test_sessions(id) on delete cascade,
  full_name text not null default 'Calon ASN',
  avatar_url text,
  top_score int not null default 0,
  score_twk int not null default 0,
  score_tiu int not null default 0,
  score_tkp int not null default 0,
  completed_at timestamp with time zone not null,
  updated_at timestamp with time zone not null default now()
);

create index if not exists leaderboard_entries_score_idx
on public.leaderboard_entries (top_score desc, completed_at asc, user_id);

alter table public.leaderboard_entries enable row level security;

drop policy if exists "Authenticated users can view leaderboard entries" on public.leaderboard_entries;
create policy "Authenticated users can view leaderboard entries"
on public.leaderboard_entries
for select
to authenticated
using (true);

revoke all on public.leaderboard_entries from anon, authenticated;
grant select on public.leaderboard_entries to authenticated;

create or replace function public.upsert_leaderboard_from_session(p_session_id uuid)
returns table (
  success boolean,
  updated boolean,
  rank_pos bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session record;
  v_current_entry record;
  v_updated boolean := false;
begin
  if p_session_id is null then
    raise exception 'Invalid session id';
  end if;

  select
    ts.id,
    ts.user_id,
    ts.mode,
    ts.status,
    ts.score_twk,
    ts.score_tiu,
    ts.score_tkp,
    ts.total_score,
    coalesce(ts.end_time, ts.start_time, now()) as completed_at,
    coalesce(nullif(trim(p.full_name), ''), 'Calon ASN') as full_name,
    p.avatar_url
  into v_session
  from public.test_sessions ts
  left join public.profiles p on p.id = ts.user_id
  where ts.id = p_session_id;

  if not found then
    return query select false, false, null::bigint;
    return;
  end if;

  if coalesce(auth.role(), '') <> 'service_role'
    and v_session.user_id <> (select auth.uid())
  then
    raise exception 'Not authorized';
  end if;

  if v_session.mode <> 'tryout' or v_session.status <> 'completed' then
    return query select false, false, null::bigint;
    return;
  end if;

  insert into public.leaderboard_entries (
    user_id,
    best_session_id,
    full_name,
    avatar_url,
    top_score,
    score_twk,
    score_tiu,
    score_tkp,
    completed_at,
    updated_at
  )
  values (
    v_session.user_id,
    v_session.id,
    v_session.full_name,
    v_session.avatar_url,
    coalesce(v_session.total_score, 0),
    coalesce(v_session.score_twk, 0),
    coalesce(v_session.score_tiu, 0),
    coalesce(v_session.score_tkp, 0),
    v_session.completed_at,
    now()
  )
  on conflict (user_id) do update
  set
    best_session_id = excluded.best_session_id,
    full_name = excluded.full_name,
    avatar_url = excluded.avatar_url,
    top_score = excluded.top_score,
    score_twk = excluded.score_twk,
    score_tiu = excluded.score_tiu,
    score_tkp = excluded.score_tkp,
    completed_at = excluded.completed_at,
    updated_at = now()
  where excluded.top_score > public.leaderboard_entries.top_score
    or (
      excluded.top_score = public.leaderboard_entries.top_score
      and excluded.completed_at < public.leaderboard_entries.completed_at
    )
  returning true into v_updated;

  if v_updated is not true then
    update public.leaderboard_entries
    set
      full_name = v_session.full_name,
      avatar_url = v_session.avatar_url,
      updated_at = now()
    where user_id = v_session.user_id;
  end if;

  select *
  into v_current_entry
  from public.leaderboard_entries
  where user_id = v_session.user_id;

  select count(*) + 1
  into rank_pos
  from public.leaderboard_entries le
  where le.top_score > v_current_entry.top_score
    or (
      le.top_score = v_current_entry.top_score
      and (
        le.completed_at < v_current_entry.completed_at
        or (le.completed_at = v_current_entry.completed_at and le.user_id < v_current_entry.user_id)
      )
    );

  return query select true, coalesce(v_updated, false), rank_pos;
end;
$$;

create or replace function public.get_national_leaderboard(
  p_limit int default 100,
  p_user_id uuid default auth.uid()
)
returns table (
  rank_pos bigint,
  user_id uuid,
  full_name text,
  avatar_url text,
  top_score int,
  score_twk int,
  score_tiu int,
  score_tkp int,
  is_current_user boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit int := least(greatest(coalesce(p_limit, 100), 1), 100);
  v_current_user_id uuid := coalesce(p_user_id, auth.uid());
begin
  if auth.uid() is null and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Not authenticated';
  end if;

  return query
  with ranked as (
    select
      row_number() over (
        order by le.top_score desc, le.completed_at asc, le.user_id asc
      ) as rank_pos,
      le.user_id,
      coalesce(nullif(trim(p.full_name), ''), le.full_name, 'Calon ASN') as full_name,
      coalesce(p.avatar_url, le.avatar_url) as avatar_url,
      le.top_score,
      le.score_twk,
      le.score_tiu,
      le.score_tkp
    from public.leaderboard_entries le
    left join public.profiles p on p.id = le.user_id
  )
  select
    r.rank_pos,
    r.user_id,
    r.full_name,
    r.avatar_url,
    r.top_score,
    r.score_twk,
    r.score_tiu,
    r.score_tkp,
    r.user_id = v_current_user_id as is_current_user
  from ranked r
  where r.rank_pos <= v_limit
     or r.user_id = v_current_user_id
  order by r.rank_pos asc;
end;
$$;

drop function if exists public.get_live_event_leaderboard(uuid);

create function public.get_live_event_leaderboard(p_event_id uuid)
returns table (
  user_id uuid,
  full_name text,
  avatar_url text,
  progress_count bigint,
  total_score bigint,
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
    ss.total_score,
    rank() over (order by ss.total_score desc, ss.started_at asc) as live_rank
  from session_scores ss
  join public.profiles p on p.id = ss.user_id
  order by live_rank asc
  limit 50;
end;
$$;

revoke execute on function public.upsert_leaderboard_from_session(uuid) from public, anon;
revoke execute on function public.get_national_leaderboard(int, uuid) from public, anon;
grant execute on function public.upsert_leaderboard_from_session(uuid) to authenticated, service_role;
grant execute on function public.get_national_leaderboard(int, uuid) to authenticated, service_role;
grant execute on function public.get_live_event_leaderboard(uuid) to authenticated, service_role;

insert into public.leaderboard_entries (
  user_id,
  best_session_id,
  full_name,
  avatar_url,
  top_score,
  score_twk,
  score_tiu,
  score_tkp,
  completed_at,
  updated_at
)
select distinct on (ts.user_id)
  ts.user_id,
  ts.id,
  coalesce(nullif(trim(p.full_name), ''), 'Calon ASN') as full_name,
  p.avatar_url,
  coalesce(ts.total_score, 0),
  coalesce(ts.score_twk, 0),
  coalesce(ts.score_tiu, 0),
  coalesce(ts.score_tkp, 0),
  coalesce(ts.end_time, ts.start_time, now()) as completed_at,
  now()
from public.test_sessions ts
left join public.profiles p on p.id = ts.user_id
where ts.mode = 'tryout'
  and ts.status = 'completed'
order by ts.user_id, ts.total_score desc, coalesce(ts.end_time, ts.start_time, now()) asc, ts.id asc
on conflict (user_id) do update
set
  best_session_id = excluded.best_session_id,
  full_name = excluded.full_name,
  avatar_url = excluded.avatar_url,
  top_score = excluded.top_score,
  score_twk = excluded.score_twk,
  score_tiu = excluded.score_tiu,
  score_tkp = excluded.score_tkp,
  completed_at = excluded.completed_at,
  updated_at = now()
where excluded.top_score > public.leaderboard_entries.top_score
  or (
    excluded.top_score = public.leaderboard_entries.top_score
    and excluded.completed_at < public.leaderboard_entries.completed_at
  );
