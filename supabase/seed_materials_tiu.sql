-- Seed TIU (Tes Intelegensi Umum) Materials
-- Total: 5 materials (3 free, 2 premium)

-- Delete existing TIU materials to prevent duplicates
DELETE FROM materials WHERE category = 'TIU';

INSERT INTO materials (title, slug, description, content, video_url, category, is_premium) VALUES

('Deret Angka: Pola Dasar', 'deret-angka-dasar', 
'Mengenali pola deret angka sederhana: naik, turun, loncat, dan kombinasi.', 
'## Tujuan Pembelajaran

[Konten akan diisi admin]

## Contoh Soal

[Konten akan diisi admin]', 
null, 'TIU', false),

('Deret Angka: Trik Cepat', 'deret-angka-trik', 
'Shortcut dan strategi menyelesaikan soal deret angka dalam 10 detik.', 
'## Tujuan Pembelajaran

[Konten akan diisi admin]

## Tips & Jebakan

[Konten akan diisi admin]', 
'https://www.youtube.com/embed/dQw4w9WgXcQ', 'TIU', true),

('Analogi Verbal', 'analogi-verbal', 
'Memahami hubungan makna kata dan menemukan pasangan kata yang tepat.', 
'## Tujuan Pembelajaran

[Konten akan diisi admin]', 
null, 'TIU', false),

('Silogisme Sederhana', 'silogisme-dasar', 
'Dasar-dasar penalaran logika silogisme untuk mengambil kesimpulan yang valid.', 
'## Tujuan Pembelajaran

[Konten akan diisi admin]

## Pembahasan Inti

[Konten akan diisi admin]', 
null, 'TIU', false),

('Operasi Hitung Cepat', 'operasi-hitung-cepat', 
'Teknik perhitungan cepat untuk soal aritmatika tanpa kalkulator.', 
'## Tujuan Pembelajaran

[Konten akan diisi admin]

## Tips & Jebakan

[Konten akan diisi admin]', 
null, 'TIU', true);
