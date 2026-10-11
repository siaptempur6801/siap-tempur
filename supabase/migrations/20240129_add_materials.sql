-- Learning Materials
CREATE TABLE materials (
  id uuid DEFAULT uuid_generate_v4 () PRIMARY KEY,
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  content text, -- Markdown or HTML
  video_url text, -- YouTube embedded URL
  category text, -- TWK, TIU, TKP
  is_premium boolean DEFAULT FALSE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated read materials" ON materials
  FOR SELECT TO authenticated
  USING (TRUE);

-- Insert Dummy Materials
INSERT INTO materials (title, slug, description, content, video_url, category, is_premium)
VALUES
  ('Pengamalan Sila ke-1', 'sila-1', 'Memahami butir-butir Pancasila sila pertama.', '## Butir Pengamalan Sila Ketuhanan Yang Maha Esa\n\n1. Bangsa Indonesia menyatakan kepercayaannya dan ketakwaannya terhadap Tuhan Yang Maha Esa.\n2. Manusia Indonesia percaya dan takwa terhadap Tuhan Yang Maha Esa...', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'TWK', FALSE),
  ('Trik Cepat Deret Angka', 'trik-deret', 'Cara menyelesaikan soal deret dalam 10 detik.', '## Pola Deret\n\nPerhatikan pola loncat satu atau loncat dua...', NULL, 'TIU', TRUE);
