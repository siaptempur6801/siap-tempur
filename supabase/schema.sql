-- Bootstrap schema for a fresh database.
-- For an existing database, apply files in supabase/migrations instead of rerunning this file end-to-end.

-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- 1. Enums
do $$
begin
  if not exists (select 1 from pg_type where typname = 'question_type') then
    create type question_type as enum ('TWK', 'TIU', 'TKP');
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'session_mode') then
    create type session_mode as enum ('practice', 'tryout');
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'session_status') then
    create type session_status as enum ('in_progress', 'completed');
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'transaction_status') then
    create type transaction_status as enum ('pending', 'capture', 'settlement', 'expire', 'cancel', 'deny');
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'transaction_status'
      and e.enumlabel = 'capture'
  ) then
    alter type transaction_status add value 'capture';
  end if;
end
$$;

-- 2. Profiles Table
create table if not exists profiles (
  id uuid references auth.users(id) on delete cascade not null primary key,
  full_name text,
  avatar_url text,
  bio text,
  role text not null default 'user',
  tryout_quota int not null default 0,
  tryout_quota_toefl int not null default 0,
  streak_count int not null default 0,
  last_activity_date date,
  
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table profiles add column if not exists avatar_url text;
alter table profiles add column if not exists bio text;
alter table profiles add column if not exists role text not null default 'user';
alter table profiles add column if not exists tryout_quota int not null default 0;
alter table profiles add column if not exists tryout_quota_toefl int not null default 0;
alter table profiles add column if not exists streak_count int not null default 0;
alter table profiles add column if not exists last_activity_date date;
alter table profiles add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now());
alter table profiles add column if not exists created_at timestamp with time zone default timezone('utc'::text, now()) not null;

create table if not exists materials (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  slug text unique not null,
  description text,
  content text,
  video_url text,
  category text,
  is_premium boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Questions & Options
create table if not exists questions (
  id uuid default uuid_generate_v4() primary key,
  content text not null,
  type question_type not null,
  category text,
  sub_category text,
  explanation text,
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table questions add column if not exists category text;
alter table questions add column if not exists sub_category text;
alter table questions add column if not exists explanation text;
alter table questions add column if not exists image_url text;
alter table questions add column if not exists created_at timestamp with time zone default timezone('utc'::text, now()) not null;

create table if not exists options (
  id uuid default uuid_generate_v4() primary key,
  question_id uuid references questions(id) on delete cascade not null,
  content text not null,
  image_url text,
  is_correct boolean not null default false,
  score_value int not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table options add column if not exists image_url text;
alter table options add column if not exists is_correct boolean not null default false;
alter table options add column if not exists score_value int not null default 0;
alter table options add column if not exists created_at timestamp with time zone default timezone('utc'::text, now()) not null;

-- 5. Tryout Events
create table if not exists tryouts (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  duration_minutes int not null,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists tryout_questions (
  tryout_id uuid references tryouts(id) on delete cascade not null,
  question_id uuid references questions(id) on delete cascade not null,
  order_index int not null,
  primary key (tryout_id, question_id)
);

-- 6. Test Sessions & Answers
create table if not exists test_sessions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  tryout_id uuid references tryouts(id),
  mode session_mode not null default 'practice',
  status session_status not null default 'in_progress',
  start_time timestamp with time zone default timezone('utc'::text, now()) not null,
  end_time timestamp with time zone,
  
  -- Scores
  score_twk int not null default 0,
  score_tiu int not null default 0,
  score_tkp int not null default 0,
  total_score int not null default 0,
  is_passed boolean not null default false,
  current_question_index integer not null default 0,
  marked_questions jsonb not null default '{}'::jsonb,
  last_activity_at timestamp with time zone not null default timezone('utc'::text, now()),
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table test_sessions add column if not exists tryout_id uuid references tryouts(id);
alter table test_sessions add column if not exists current_question_index integer not null default 0;
alter table test_sessions add column if not exists marked_questions jsonb not null default '{}'::jsonb;
alter table test_sessions add column if not exists last_activity_at timestamp with time zone not null default timezone('utc'::text, now());
alter table test_sessions add column if not exists created_at timestamp with time zone default timezone('utc'::text, now()) not null;

create table if not exists test_answers (
  id uuid default uuid_generate_v4() primary key,
  session_id uuid references test_sessions(id) on delete cascade not null,
  question_id uuid references questions(id) not null,
  option_id uuid references options(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  unique(session_id, question_id)
);

-- 7. Transactions (Midtrans)
create table if not exists transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  order_id text unique not null,
  amount int not null,
  status transaction_status default 'pending',
  package_name text not null,
  snap_token text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists tryout_configurations (
  id uuid default uuid_generate_v4() primary key,
  type varchar not null,
  sub_category varchar not null,
  question_count int not null default 0,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tryout_configurations_type_sub_category_key'
  ) then
    alter table tryout_configurations
      add constraint tryout_configurations_type_sub_category_key unique (type, sub_category);
  end if;
end
$$;

do $$
begin
  if to_regclass('public.leaderboard_snapshot') is null then
    create table leaderboard_snapshot (
      rank_pos int,
      user_id uuid primary key references profiles(id) on delete cascade,
      full_name text,
      avatar_url text,
      top_score int,
      score_twk int,
      score_tiu int,
      score_tkp int,
      updated_at timestamp with time zone default now()
    );
  end if;
end
$$;

insert into tryout_configurations (type, sub_category, question_count, sort_order)
values
  ('TWK', 'Nasionalisme', 6, 1),
  ('TWK', 'Integritas', 6, 2),
  ('TWK', 'Bela Negara', 6, 3),
  ('TWK', 'Pilar Negara', 6, 4),
  ('TWK', 'Bahasa Negara', 6, 5),
  ('TIU', 'Analogi', 3, 6),
  ('TIU', 'Silogisme', 3, 7),
  ('TIU', 'Analitis', 4, 8),
  ('TIU', 'Berhitung', 5, 9),
  ('TIU', 'Deret Angka', 5, 10),
  ('TIU', 'Perbandingan Kuantitatif', 5, 11),
  ('TIU', 'Soal Cerita', 5, 12),
  ('TIU', 'Analogi Figural', 2, 13),
  ('TIU', 'Ketidaksamaan', 1, 14),
  ('TIU', 'Serial', 2, 15),
  ('TKP', 'Pelayanan Publik', 8, 16),
  ('TKP', 'Jejaring Kerja', 8, 17),
  ('TKP', 'Sosial Budaya', 7, 18),
  ('TKP', 'Teknologi Informasi dan Komunikasi', 7, 19),
  ('TKP', 'Profesionalisme', 7, 20),
  ('TKP', 'Anti-Radikalisme', 8, 21)
on conflict (type, sub_category) do update
set
  question_count = excluded.question_count,
  sort_order = excluded.sort_order;

create index if not exists idx_questions_type_subcategory on questions(type, sub_category);
create index if not exists test_sessions_active_lookup_idx on test_sessions(user_id, mode, status, last_activity_at desc);
do $$
begin
  if exists (
    select 1
    from pg_class
    where oid = to_regclass('public.leaderboard_snapshot')
      and relkind in ('r', 'm')
  ) then
    create index if not exists idx_leaderboard_score on leaderboard_snapshot(top_score desc);
  end if;
end
$$;

-- 8. Policies (RLS)
alter table if exists profiles enable row level security;
alter table if exists materials enable row level security;
alter table if exists questions enable row level security;
alter table if exists options enable row level security;
alter table if exists tryouts enable row level security;
alter table if exists tryout_questions enable row level security;
alter table if exists test_sessions enable row level security;
alter table if exists test_answers enable row level security;
alter table if exists transactions enable row level security;
alter table if exists tryout_configurations enable row level security;
do $$
begin
  if exists (
    select 1
    from pg_class
    where oid = to_regclass('public.leaderboard_snapshot')
      and relkind = 'r'
  ) then
    alter table leaderboard_snapshot enable row level security;
  end if;
end
$$;

-- (Basic Policies - Extend as needed)
drop policy if exists "Users can view own profile" on profiles;
create policy "Users can view own profile" on profiles for select using ((select auth.uid()) = id);

drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile" on profiles for update using ((select auth.uid()) = id);

drop policy if exists "Authenticated read materials" on materials;
create policy "Authenticated read materials" on materials for select to authenticated using (true);

drop policy if exists "Public read questions" on questions;
create policy "Public read questions" on questions for select using (true);

drop policy if exists "Public read options" on options;
create policy "Public read options" on options for select using (true);

drop policy if exists "Authenticated read tryouts" on tryouts;
create policy "Authenticated read tryouts" on tryouts for select to authenticated using (true);

drop policy if exists "Authenticated read tryout questions" on tryout_questions;
create policy "Authenticated read tryout questions" on tryout_questions for select to authenticated using (true);

drop policy if exists "Users can view own sessions" on test_sessions;
create policy "Users can view own sessions" on test_sessions for select using ((select auth.uid()) = user_id);

drop policy if exists "Users can create own sessions" on test_sessions;
drop policy if exists "Users can insert own sessions" on test_sessions;
create policy "Users can create own sessions" on test_sessions for insert with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own sessions" on test_sessions;
create policy "Users can update own sessions" on test_sessions for update using ((select auth.uid()) = user_id);

drop policy if exists "Users can view own answers" on test_answers;
create policy "Users can view own answers" on test_answers for select using (
  exists (
    select 1
    from test_sessions ts
    where ts.id = test_answers.session_id
      and ts.user_id = (select auth.uid())
  )
);

drop policy if exists "Users can update own answers" on test_answers;
create policy "Users can update own answers" on test_answers for update using (
  exists (
    select 1
    from test_sessions ts
    where ts.id = test_answers.session_id
      and ts.user_id = (select auth.uid())
  )
) with check (
  exists (
    select 1
    from test_sessions ts
    where ts.id = test_answers.session_id
      and ts.user_id = (select auth.uid())
  )
);

drop policy if exists "Users can view own transactions" on transactions;
create policy "Users can view own transactions" on transactions for select using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own transactions" on transactions;
create policy "Users can insert own transactions" on transactions for insert with check ((select auth.uid()) = user_id);

drop policy if exists "Anyone can read tryout configurations" on tryout_configurations;
create policy "Anyone can read tryout configurations" on tryout_configurations for select using (true);

drop policy if exists "Admins can insert tryout configurations" on tryout_configurations;
create policy "Admins can insert tryout configurations" on tryout_configurations for insert with check (
  (select role from profiles where id = (select auth.uid())) = 'admin'
);

drop policy if exists "Admins can update tryout configurations" on tryout_configurations;
create policy "Admins can update tryout configurations" on tryout_configurations for update using (
  (select role from profiles where id = (select auth.uid())) = 'admin'
);

drop policy if exists "Admins can delete tryout configurations" on tryout_configurations;
create policy "Admins can delete tryout configurations" on tryout_configurations for delete using (
  (select role from profiles where id = (select auth.uid())) = 'admin'
);

do $$
begin
  if exists (
    select 1
    from pg_class
    where oid = to_regclass('public.leaderboard_snapshot')
      and relkind = 'r'
  ) then
    drop policy if exists "Anyone can view leaderboard" on leaderboard_snapshot;
    create policy "Anyone can view leaderboard" on leaderboard_snapshot for select to authenticated using (true);
  end if;
end
$$;

-- 9. Functions
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, full_name, streak_count)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    0
  )
  on conflict (id) do update
  set full_name = coalesce(excluded.full_name, profiles.full_name);

  return new;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function update_user_streak()
returns trigger as $$
declare
  current_streak int;
  last_date date;
  today date := current_date;
begin
  if new.status = 'completed' and old.status != 'completed' then
    select streak_count, last_activity_date
    into current_streak, last_date
    from profiles
    where id = new.user_id;

    if last_date is null then
      update profiles set streak_count = 1, last_activity_date = today where id = new.user_id;
    elsif last_date = today - 1 then
      update profiles set streak_count = current_streak + 1, last_activity_date = today where id = new.user_id;
    elsif last_date < today - 1 then
      update profiles set streak_count = 1, last_activity_date = today where id = new.user_id;
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function update_tryout_configurations_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql set search_path = public;

create or replace function increment_tryout_quota(user_id_param uuid, increment_by int)
returns void as $$
begin
  update profiles
  set tryout_quota = coalesce(tryout_quota, 0) + increment_by
  where id = user_id_param;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function increment_toefl_quota(user_id_param uuid, increment_by int)
returns void as $$
begin
  update profiles
  set tryout_quota_toefl = coalesce(tryout_quota_toefl, 0) + increment_by
  where id = user_id_param;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function calculate_session_score(session_uuid uuid)
returns void as $$
declare
  v_twk int;
  v_tiu int;
  v_tkp int;
  v_total int;
  v_passed boolean;
  pass_twk int := 65;
  pass_tiu int := 80;
  pass_tkp int := 166;
begin
  select coalesce(sum(case when q.type = 'TWK' and o.is_correct then 5 else 0 end), 0)
  into v_twk
  from test_answers a
  join questions q on a.question_id = q.id
  left join options o on a.option_id = o.id
  where a.session_id = session_uuid;

  select coalesce(sum(case when q.type = 'TIU' and o.is_correct then 5 else 0 end), 0)
  into v_tiu
  from test_answers a
  join questions q on a.question_id = q.id
  left join options o on a.option_id = o.id
  where a.session_id = session_uuid;

  select coalesce(sum(case when q.type = 'TKP' then coalesce(o.score_value, 0) else 0 end), 0)
  into v_tkp
  from test_answers a
  join questions q on a.question_id = q.id
  left join options o on a.option_id = o.id
  where a.session_id = session_uuid;

  v_total := v_twk + v_tiu + v_tkp;
  v_passed := (v_twk >= pass_twk and v_tiu >= pass_tiu and v_tkp >= pass_tkp);

  update test_sessions
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
$$ language plpgsql security definer set search_path = public;

create or replace function start_practice_session(
  p_user_id uuid,
  p_type question_type,
  p_limit int default 10
)
returns table (
  session_id uuid,
  questions json
) as $$
declare
  v_session_id uuid;
  v_questions json;
begin
  insert into test_sessions (user_id, mode, status, start_time, last_activity_at)
  values (p_user_id, 'practice', 'in_progress', now(), now())
  returning id into v_session_id;

  with selected_questions as (
    select id, content, type, category, sub_category, image_url
    from questions
    where type = p_type
    order by random()
    limit p_limit
  ),
  inserted_answers as (
    insert into test_answers (session_id, question_id)
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
        from options o
        where o.question_id = q.id
      )
    )
  )
  into v_questions
  from selected_questions q
  join inserted_answers ia on ia.question_id = q.id;

  return query select v_session_id, v_questions;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function start_tryout_session(p_user_id uuid)
returns table (
  session_id uuid,
  questions json
) as $$
declare
  v_session_id uuid;
  v_questions json;
  v_quota int;
begin
  select tryout_quota into v_quota
  from profiles
  where id = p_user_id;

  if v_quota is null or v_quota < 1 then
    raise exception 'Not enough SKD tickets';
  end if;

  update profiles
  set tryout_quota = tryout_quota - 1
  where id = p_user_id;

  insert into test_sessions (user_id, mode, status, start_time, last_activity_at)
  values (p_user_id, 'tryout', 'in_progress', now(), now())
  returning id into v_session_id;

  create temp table if not exists temp_selected_questions (
    question_id uuid,
    sort_order int
  ) on commit drop;

  truncate temp_selected_questions;

  insert into temp_selected_questions (question_id, sort_order)
  select q.id, tc.sort_order
  from tryout_configurations tc
  cross join lateral (
    select id
    from questions q_inner
    where q_inner.type = tc.type::question_type
      and q_inner.sub_category = tc.sub_category
    order by random()
    limit tc.question_count
  ) q
  where tc.is_active = true;

  insert into test_answers (session_id, question_id)
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
        from options o
        where o.question_id = q.id
      )
    ) order by tsq.sort_order, random()
  )
  into v_questions
  from temp_selected_questions tsq
  join questions q on q.id = tsq.question_id;

  return query select v_session_id, v_questions;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function refresh_leaderboard_snapshot()
returns void as $$
begin
  if exists (
    select 1
    from pg_class
    where oid = to_regclass('public.leaderboard_snapshot')
      and relkind = 'm'
  ) then
    refresh materialized view leaderboard_snapshot;
    return;
  end if;

  if exists (
    select 1
    from pg_class
    where oid = to_regclass('public.leaderboard_snapshot')
      and relkind = 'r'
  ) then
    truncate leaderboard_snapshot;

    insert into leaderboard_snapshot (
      rank_pos,
      user_id,
      full_name,
      avatar_url,
      top_score,
      score_twk,
      score_tiu,
      score_tkp,
      updated_at
    )
    with user_best_scores as (
      select distinct on (user_id)
        user_id,
        total_score,
        score_twk,
        score_tiu,
        score_tkp,
        end_time
      from test_sessions
      where status = 'completed'
      order by user_id, total_score desc, end_time asc nulls last
    )
    select
      row_number() over (order by total_score desc, end_time asc nulls last) as rank_pos,
      ubs.user_id,
      coalesce(p.full_name, 'Pejuang SKD'),
      p.avatar_url,
      ubs.total_score,
      ubs.score_twk,
      ubs.score_tiu,
      ubs.score_tkp,
      now()
    from user_best_scores ubs
    left join profiles p on p.id = ubs.user_id
    order by ubs.total_score desc, ubs.end_time asc nulls last;
  end if;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function get_leaderboard_snapshot()
returns table (
  rank_pos int,
  user_id uuid,
  full_name text,
  avatar_url text,
  top_score int,
  score_twk int,
  score_tiu int,
  score_tkp int,
  updated_at timestamp with time zone
) as $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'leaderboard_snapshot'
      and column_name = 'updated_at'
  ) then
    return query execute '
      select
        ls.rank_pos::int,
        ls.user_id,
        ls.full_name,
        ls.avatar_url,
        ls.top_score,
        ls.score_twk,
        ls.score_tiu,
        ls.score_tkp,
        ls.updated_at
      from public.leaderboard_snapshot ls
      order by ls.rank_pos asc
      limit 100
    ';
    return;
  end if;

  return query execute '
    select
      ls.rank_pos::int,
      ls.user_id,
      ls.full_name,
      ls.avatar_url,
      ls.top_score,
      ls.score_twk,
      ls.score_tiu,
      ls.score_tkp,
      ls.achieved_at as updated_at
    from public.leaderboard_snapshot ls
    order by ls.rank_pos asc
    limit 100
  ';
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function handle_new_user();

drop trigger if exists on_session_complete on test_sessions;
create trigger on_session_complete
  after update on test_sessions
  for each row
  execute function update_user_streak();

drop trigger if exists trg_update_tryout_configurations on tryout_configurations;
create trigger trg_update_tryout_configurations
  before update on tryout_configurations
  for each row
  execute function update_tryout_configurations_updated_at();

insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('question-images', 'question-images', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "Avatar images are publicly accessible" on storage.objects;
create policy "Avatar images are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "Anyone can upload an avatar" on storage.objects;
create policy "Anyone can upload an avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatars');

drop policy if exists "Anyone can update their own avatar" on storage.objects;
create policy "Anyone can update their own avatar"
  on storage.objects for update
  using (auth.uid() = owner)
  with check (bucket_id = 'avatars');

drop policy if exists "Public read open to all" on storage.objects;
create policy "Public read open to all"
  on storage.objects for select
  using (bucket_id = 'question-images');

drop policy if exists "Admin upload access" on storage.objects;
create policy "Admin upload access"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'question-images'
    and (select role from profiles where id = auth.uid()) = 'admin'
  );

drop policy if exists "Admin update access" on storage.objects;
create policy "Admin update access"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'question-images'
    and (select role from profiles where id = auth.uid()) = 'admin'
  );

drop policy if exists "Admin delete access" on storage.objects;
create policy "Admin delete access"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'question-images'
    and (select role from profiles where id = auth.uid()) = 'admin'
  );

grant execute on function get_leaderboard_snapshot() to anon, authenticated;

select refresh_leaderboard_snapshot();
