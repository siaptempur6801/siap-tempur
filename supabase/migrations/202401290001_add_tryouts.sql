-- Tryouts Table
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

-- Link Sessions to Tryouts (Optional, if session is linked to a specific tryout event)
alter table test_sessions add column tryout_id uuid references tryouts(id);

-- Questions in a Tryout (Many-to-Many)
create table tryout_questions (
  tryout_id uuid references tryouts(id) on delete cascade not null,
  question_id uuid references questions(id) on delete cascade not null,
  order_index int not null,
  primary key (tryout_id, question_id)
);
