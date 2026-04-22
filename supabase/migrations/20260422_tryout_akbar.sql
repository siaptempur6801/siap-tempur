-- Tryout Akbar event layer.
-- Keeps event operations separate from regular B2C tryout sessions.

create table if not exists public.tryout_events (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  starts_at timestamp with time zone not null,
  ends_at timestamp with time zone not null,
  start_grace_minutes int not null default 15 check (start_grace_minutes >= 0),
  duration_minutes int not null default 100 check (duration_minutes > 0),
  max_participants int check (max_participants is null or max_participants > 0),
  requires_code boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'live', 'closed', 'cancelled')),
  result_visible_at timestamp with time zone,
  explanation_visible_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.tryout_events
  add column if not exists requires_code boolean not null default false;

create table if not exists public.tryout_event_participants (
  id uuid default uuid_generate_v4() primary key,
  event_id uuid references public.tryout_events(id) on delete cascade not null,
  event_code_id uuid,
  user_id uuid references public.profiles(id) on delete cascade not null,
  status text not null default 'registered' check (status in ('registered', 'started', 'completed', 'timeout', 'cancelled')),
  registered_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(event_id, user_id)
);

alter table public.tryout_event_participants
  add column if not exists event_code_id uuid;

create table if not exists public.tryout_event_codes (
  id uuid default uuid_generate_v4() primary key,
  event_id uuid references public.tryout_events(id) on delete cascade not null,
  code text not null,
  max_uses int not null default 1 check (max_uses > 0),
  used_count int not null default 0 check (used_count >= 0),
  is_active boolean not null default true,
  expires_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(event_id, code)
);

alter table public.tryout_event_participants
  drop constraint if exists tryout_event_participants_event_code_id_fkey;

alter table public.tryout_event_participants
  add constraint tryout_event_participants_event_code_id_fkey
  foreign key (event_code_id) references public.tryout_event_codes(id) on delete set null;

create table if not exists public.tryout_event_questions (
  id uuid default uuid_generate_v4() primary key,
  event_id uuid references public.tryout_events(id) on delete cascade not null,
  question_id uuid references public.questions(id) on delete cascade not null,
  sort_order int not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(event_id, question_id)
);

create table if not exists public.tryout_event_sessions (
  id uuid default uuid_generate_v4() primary key,
  event_id uuid references public.tryout_events(id) on delete cascade not null,
  session_id uuid references public.test_sessions(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  status text not null default 'started' check (status in ('started', 'completed', 'timeout', 'cancelled')),
  started_at timestamp with time zone default timezone('utc'::text, now()) not null,
  finished_at timestamp with time zone,
  unique(event_id, user_id),
  unique(session_id)
);

create index if not exists tryout_events_status_starts_idx on public.tryout_events(status, starts_at desc);
create index if not exists tryout_event_participants_event_idx on public.tryout_event_participants(event_id, status);
create index if not exists tryout_event_questions_event_idx on public.tryout_event_questions(event_id, sort_order);
create index if not exists tryout_event_sessions_event_idx on public.tryout_event_sessions(event_id, status);
create index if not exists tryout_event_codes_event_idx on public.tryout_event_codes(event_id, is_active);
create index if not exists tryout_event_codes_lookup_idx on public.tryout_event_codes(event_id, code);
create index if not exists tryout_event_participants_code_idx on public.tryout_event_participants(event_code_id);

alter table public.tryout_events enable row level security;
alter table public.tryout_event_participants enable row level security;
alter table public.tryout_event_questions enable row level security;
alter table public.tryout_event_sessions enable row level security;
alter table public.tryout_event_codes enable row level security;

drop policy if exists "Authenticated read scheduled tryout events" on public.tryout_events;
create policy "Authenticated read scheduled tryout events"
  on public.tryout_events for select
  to authenticated
  using (status in ('scheduled', 'live', 'closed'));

drop policy if exists "Users read own tryout event participants" on public.tryout_event_participants;
create policy "Users read own tryout event participants"
  on public.tryout_event_participants for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Authenticated read tryout event questions" on public.tryout_event_questions;
create policy "Authenticated read tryout event questions"
  on public.tryout_event_questions for select
  to authenticated
  using (
    exists (
      select 1 from public.tryout_events te
      where te.id = tryout_event_questions.event_id
        and te.status in ('scheduled', 'live', 'closed')
    )
  );

drop policy if exists "Users read own tryout event sessions" on public.tryout_event_sessions;
create policy "Users read own tryout event sessions"
  on public.tryout_event_sessions for select
  to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.generate_tryout_event_questions(p_event_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count int;
begin
  if p_event_id is null then
    raise exception 'Event ID wajib diisi';
  end if;

  if not exists (select 1 from public.tryout_events where id = p_event_id) then
    raise exception 'Event tidak ditemukan';
  end if;

  delete from public.tryout_event_questions where event_id = p_event_id;

  create temp table if not exists temp_event_questions (
    question_id uuid,
    sort_order int
  ) on commit drop;

  truncate temp_event_questions;

  insert into temp_event_questions (question_id, sort_order)
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

  insert into public.tryout_event_questions (event_id, question_id, sort_order)
  select p_event_id, question_id, sort_order
  from temp_event_questions;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

create or replace function public.decrement_tryout_event_code_usage(p_code_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.tryout_event_codes
  set used_count = greatest(used_count - 1, 0),
      updated_at = timezone('utc'::text, now())
  where id = p_code_id;
end;
$$;
