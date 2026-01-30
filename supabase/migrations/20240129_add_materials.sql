-- Learning Materials
create table materials (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  slug text unique not null,
  description text,
  content text, -- Markdown or HTML
  video_url text, -- YouTube embedded URL
  category text, -- TWK, TIU, TKP
  is_premium boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table materials enable row level security;

-- Policies
create policy "Authenticated read materials" on materials
  for select to authenticated using (true);

-- Insert Dummy Materials
insert into materials (title, slug, description, content, video_url, category, is_premium) values
('Pengamalan Sila ke-1', 'sila-1', 'Memahami butir-butir Pancasila sila pertama.', '## Butir Pengamalan Sila Ketuhanan Yang Maha Esa\n\n1. Bangsa Indonesia menyatakan kepercayaannya dan ketakwaannya terhadap Tuhan Yang Maha Esa.\n2. Manusia Indonesia percaya dan takwa terhadap Tuhan Yang Maha Esa...', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'TWK', false),
('Trik Cepat Deret Angka', 'trik-deret', 'Cara menyelesaikan soal deret dalam 10 detik.', '## Pola Deret\n\nPerhatikan pola loncat satu atau loncat dua...', null, 'TIU', true);
