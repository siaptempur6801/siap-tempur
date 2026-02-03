
-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- 1. Enums
create type question_type as enum ('TWK', 'TIU', 'TKP');
create type session_mode as enum ('practice', 'tryout');
create type session_status as enum ('in_progress', 'completed');
create type transaction_status as enum ('pending', 'settlement', 'expire', 'cancel', 'deny');

-- 2. Profiles Table
create table profiles (
  id uuid references auth.users not null primary key,
  full_name text,
  avatar_url text,
  bio text,
  tryout_quota int default 0,
  streak_count int default 0,
  last_activity_date date,
  
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Questions & Options
create table questions (
  id uuid default uuid_generate_v4() primary key,
  content text not null,
  type question_type not null,
  category text,
  explanation text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table options (
  id uuid default uuid_generate_v4() primary key,
  question_id uuid references questions(id) on delete cascade not null,
  content text not null,
  is_correct boolean default false,
  score_value int default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Tryout Events
create table tryouts (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  duration_minutes int not null,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table tryout_questions (
  tryout_id uuid references tryouts(id) on delete cascade not null,
  question_id uuid references questions(id) on delete cascade not null,
  order_index int not null,
  primary key (tryout_id, question_id)
);

-- 6. Test Sessions & Answers
create table test_sessions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  tryout_id uuid references tryouts(id),
  mode session_mode default 'practice',
  status session_status default 'in_progress',
  start_time timestamp with time zone default timezone('utc'::text, now()) not null,
  end_time timestamp with time zone,
  
  -- Scores
  score_twk int default 0,
  score_tiu int default 0,
  score_tkp int default 0,
  total_score int default 0,
  is_passed boolean default false,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table test_answers (
  id uuid default uuid_generate_v4() primary key,
  session_id uuid references test_sessions(id) on delete cascade not null,
  question_id uuid references questions(id) not null,
  option_id uuid references options(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  unique(session_id, question_id)
);

-- 7. Transactions (Midtrans)
create table transactions (
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

-- 8. Policies (RLS)
alter table profiles enable row level security;
alter table materials enable row level security;
alter table questions enable row level security;
alter table options enable row level security;
alter table tryouts enable row level security;
alter table test_sessions enable row level security;
alter table test_answers enable row level security;
alter table transactions enable row level security;

-- (Basic Policies - Extend as needed)
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Authenticated read materials" on materials for select to authenticated using (true);
create policy "Public read questions" on questions for select using (true);
create policy "Public read options" on options for select using (true);
create policy "Users can view own sessions" on test_sessions for select using (auth.uid() = user_id);
create policy "Users can insert own sessions" on test_sessions for insert with check (auth.uid() = user_id);
create policy "Users can update own sessions" on test_sessions for update using (auth.uid() = user_id);
create policy "Users can view own transactions" on transactions for select using (auth.uid() = user_id);

-- 9. Functions
create or replace function calculate_session_score(session_uuid uuid)
returns void as $$
declare
  v_twk int;
  v_tiu int;
  v_tkp int;
  v_total int;
  v_passed boolean;
  
  PASS_TWK int := 65;
  PASS_TIU int := 80;
  PASS_TKP int := 166;
begin
  -- Calculate TWK
  select coalesce(sum(case when q.type = 'TWK' and o.is_correct then 5 else 0 end), 0)
  into v_twk
  from test_answers a
  join questions q on a.question_id = q.id
  join options o on a.option_id = o.id
  where a.session_id = session_uuid;

  -- Calculate TIU
  select coalesce(sum(case when q.type = 'TIU' and o.is_correct then 5 else 0 end), 0)
  into v_tiu
  from test_answers a
  join questions q on a.question_id = q.id
  join options o on a.option_id = o.id
  where a.session_id = session_uuid;

  -- Calculate TKP
  select coalesce(sum(case when q.type = 'TKP' then o.score_value else 0 end), 0)
  into v_tkp
  from test_answers a
  join questions q on a.question_id = q.id
  join options o on a.option_id = o.id
  where a.session_id = session_uuid;

  v_total := v_twk + v_tiu + v_tkp;
  v_passed := (v_twk >= PASS_TWK and v_tiu >= PASS_TIU and v_tkp >= PASS_TKP);

  update test_sessions
  set 
    score_twk = v_twk,
    score_tiu = v_tiu,
    score_tkp = v_tkp,
    total_score = v_total,
    is_passed = v_passed,
    status = 'completed',
    end_time = now()
  where id = session_uuid;
end;
$$ language plpgsql security definer;
