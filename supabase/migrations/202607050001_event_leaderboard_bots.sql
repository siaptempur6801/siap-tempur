-- Virtual event leaderboard bots.
-- Bots are display-only leaderboard entries, not real users or test sessions.
ALTER TABLE public.tryout_events
  ADD COLUMN IF NOT EXISTS bot_count int NOT NULL DEFAULT 0;

ALTER TABLE public.tryout_events
  DROP CONSTRAINT IF EXISTS tryout_events_bot_count_check;

ALTER TABLE public.tryout_events
  ADD CONSTRAINT tryout_events_bot_count_check CHECK (bot_count BETWEEN 0 AND 100);

COMMENT ON COLUMN public.tryout_events.bot_count IS TEXTVALUE0E; CREATE TABLE IF NOT EXISTS public.event_bot_names (
  id uuid DEFAULT uuid_generate_v4 () PRIMARY KEY,
  full_name text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT TRUE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT event_bot_names_full_name_words_check CHECK (array_length(regexp_split_to_array(trim(full_name), '\s+'), 1) BETWEEN 2 AND 3)
);

CREATE TABLE IF NOT EXISTS public.tryout_event_bot_entries (
  id uuid DEFAULT uuid_generate_v4 () PRIMARY KEY,
  event_id uuid REFERENCES public.tryout_events (id) ON DELETE CASCADE NOT NULL,
  display_name text NOT NULL,
  seed bigint NOT NULL,
  target_progress_count int NOT NULL CHECK (target_progress_count BETWEEN 0 AND 110),
  target_score_twk int NOT NULL CHECK (target_score_twk BETWEEN 0 AND 150),
  target_score_tiu int NOT NULL CHECK (target_score_tiu BETWEEN 0 AND 175),
  target_score_tkp int NOT NULL CHECK (target_score_tkp BETWEEN 0 AND 225),
  target_total_score int NOT NULL CHECK (target_total_score BETWEEN 0 AND 360),
  started_at timestamp with time zone NOT NULL,
  finished_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (event_id, display_name),
  CONSTRAINT tryout_event_bot_entries_time_check CHECK (finished_at >= started_at),
  CONSTRAINT tryout_event_bot_entries_total_check CHECK (target_total_score = target_score_twk + target_score_tiu + target_score_tkp)
);

CREATE INDEX IF NOT EXISTS event_bot_names_active_idx ON public.event_bot_names (is_active, full_name);

CREATE INDEX IF NOT EXISTS tryout_event_bot_entries_event_idx ON public.tryout_event_bot_entries (event_id, started_at);

ALTER TABLE public.event_bot_names ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tryout_event_bot_entries ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.event_bot_names FROM anon, authenticated;

REVOKE ALL ON public.tryout_event_bot_entries FROM anon, authenticated;

INSERT INTO public.event_bot_names (full_name)
VALUES
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
ON CONFLICT (full_name)
  DO NOTHING;
