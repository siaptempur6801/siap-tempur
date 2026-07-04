-- Virtual event leaderboard bots.
-- Bots are display-only leaderboard entries, not real users or test sessions.

alter table public.tryout_events
  add column if not exists bot_count int not null default 0;

alter table public.tryout_events
  drop constraint if exists tryout_events_bot_count_check;

alter table public.tryout_events
  add constraint tryout_events_bot_count_check
  check (bot_count between 0 and 100);

comment on column public.tryout_events.bot_count is
  'Number of virtual display-only bots to show on event leaderboards. Bots are not participants or sessions.';

create table if not exists public.event_bot_names (
  id uuid default uuid_generate_v4() primary key,
  full_name text not null unique,
  is_active boolean not null default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint event_bot_names_full_name_words_check
    check (array_length(regexp_split_to_array(trim(full_name), '\s+'), 1) between 2 and 3)
);

create table if not exists public.tryout_event_bot_entries (
  id uuid default uuid_generate_v4() primary key,
  event_id uuid references public.tryout_events(id) on delete cascade not null,
  display_name text not null,
  seed bigint not null,
  target_progress_count int not null check (target_progress_count between 0 and 110),
  target_score_twk int not null check (target_score_twk between 0 and 150),
  target_score_tiu int not null check (target_score_tiu between 0 and 175),
  target_score_tkp int not null check (target_score_tkp between 0 and 225),
  target_total_score int not null check (target_total_score between 0 and 360),
  started_at timestamp with time zone not null,
  finished_at timestamp with time zone not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(event_id, display_name),
  constraint tryout_event_bot_entries_time_check check (finished_at >= started_at),
  constraint tryout_event_bot_entries_total_check
    check (target_total_score = target_score_twk + target_score_tiu + target_score_tkp)
);

create index if not exists event_bot_names_active_idx
  on public.event_bot_names(is_active, full_name);

create index if not exists tryout_event_bot_entries_event_idx
  on public.tryout_event_bot_entries(event_id, started_at);

alter table public.event_bot_names enable row level security;
alter table public.tryout_event_bot_entries enable row level security;

revoke all on public.event_bot_names from anon, authenticated;
revoke all on public.tryout_event_bot_entries from anon, authenticated;

insert into public.event_bot_names (full_name)
values
  ('Andi Pratama'),
  ('Siti Nur Aisyah'),
  ('Rizky Maulana'),
  ('Dewi Lestari'),
  ('Budi Santoso'),
  ('Ayu Kartika'),
  ('Fajar Nugroho'),
  ('Nadia Putri'),
  ('Agus Setiawan'),
  ('Rina Anggraini'),
  ('Dimas Saputra'),
  ('Maya Sari'),
  ('Hendra Wijaya'),
  ('Fitri Amalia'),
  ('Yoga Firmansyah'),
  ('Nurul Hidayah'),
  ('Arif Rahman'),
  ('Intan Permata'),
  ('Bayu Aditya'),
  ('Lina Marlina'),
  ('Reza Ramadhan'),
  ('Sri Wahyuni'),
  ('Taufik Hidayat'),
  ('Vina Oktaviani'),
  ('Ilham Akbar'),
  ('Putri Maharani'),
  ('Rian Saputra'),
  ('Mega Puspita'),
  ('Eko Prasetyo'),
  ('Anisa Rahma'),
  ('Gilang Ramadhan'),
  ('Dian Safitri'),
  ('Farhan Maulana'),
  ('Citra Dewi'),
  ('Joko Susilo'),
  ('Nabila Zahra'),
  ('Ahmad Fauzi'),
  ('Rossa Amelia'),
  ('Galih Pradana'),
  ('Yuni Astuti'),
  ('Muhammad Iqbal'),
  ('Aulia Putri'),
  ('Rangga Pratama'),
  ('Salsa Bila'),
  ('Hani Nuraini'),
  ('Bagas Firmansyah'),
  ('Miftahul Jannah'),
  ('Rafi Alfarizi'),
  ('Indah Purnama'),
  ('Wahyu Saputra')
on conflict (full_name) do nothing;
