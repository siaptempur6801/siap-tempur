
-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Role Enum
create type user_role as enum ('user', 'admin');
-- Subscription Enum
create type subscription_status as enum ('free', 'premium');
-- Question Type Enum
create type question_type as enum ('TWK', 'TIU', 'TKP');
-- Session Mode Enum
create type session_mode as enum ('practice', 'tryout');
-- Session Status Enum
create type session_status as enum ('in_progress', 'completed');

-- Profiles Table
create table profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  role user_role default 'user',
  subscription_status subscription_status default 'free',
  streak_count int default 0,
  last_activity_date date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Questions Table
create table questions (
  id uuid default uuid_generate_v4() primary key,
  content text not null,
  type question_type not null,
  category text, -- e.g., 'Nasionalisme', 'Hitung Cepat'
  explanation text,
  difficulty int default 1,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Options Table
create table options (
  id uuid default uuid_generate_v4() primary key,
  question_id uuid references questions(id) on delete cascade not null,
  content text not null,
  is_correct boolean default false, -- For TWK/TIU
  score_value int default 0, -- For TKP (1-5), others 0 or 5 handled by logic
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Test Sessions (Attempts)
create table test_sessions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
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

-- Test Answers
create table test_answers (
  id uuid default uuid_generate_v4() primary key,
  session_id uuid references test_sessions(id) on delete cascade not null,
  question_id uuid references questions(id) not null,
  option_id uuid references options(id), -- Null if skipped?
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  unique(session_id, question_id)
);

-- RLS Policies (Basic)
alter table profiles enable row level security;
alter table questions enable row level security;
alter table options enable row level security;
alter table test_sessions enable row level security;
alter table test_answers enable row level security;

create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

create policy "Public read questions" on questions for select using (true); -- Maybe restrict to authenticated?
create policy "Public read options" on options for select using (true);

create policy "Users can view own sessions" on test_sessions for select using (auth.uid() = user_id);
create policy "Users can insert own sessions" on test_sessions for insert with check (auth.uid() = user_id);
create policy "Users can update own sessions" on test_sessions for update using (auth.uid() = user_id);

create policy "Users can view own answers" on test_answers for select using (
  exists (select 1 from test_sessions where id = test_answers.session_id and user_id = auth.uid())
);
create policy "Users can insert own answers" on test_answers for insert with check (
  exists (select 1 from test_sessions where id = session_id and user_id = auth.uid())
);

-- SCORING FUNCTION (The Gold Standard)
create or replace function calculate_session_score(session_uuid uuid)
returns void as $$
declare
  v_twk int;
  v_tiu int;
  v_tkp int;
  v_total int;
  v_passed boolean;
  
  -- Passing Grades (2024 Standards - Example)
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

  -- Determine Passing
  if v_twk >= PASS_TWK and v_tiu >= PASS_TIU and v_tkp >= PASS_TKP then
    v_passed := true;
  else
    v_passed := false;
  end if;

  -- Update Session
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
