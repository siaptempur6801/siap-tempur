-- Seed TKP (Tes Karakteristik Pribadi) Materials
-- Total: 5 materials (3 free, 2 premium)

-- Delete existing TKP materials to prevent duplicates
DELETE FROM materials WHERE category = 'TKP';

INSERT INTO materials (title, slug, description, content, video_url, category, is_premium) VALUES

('Orientasi Pelayanan', 'orientasi-pelayanan', 
'Memahami sikap melayani sebagai inti dari tugas ASN yang profesional.', 
'## Tujuan Pembelajaran

[Konten akan diisi admin]

## Pengantar Materi

[Konten akan diisi admin]', 
null, 'TKP', false),

('Integritas & Anti-Korupsi', 'integritas-anti-korupsi', 
'Nilai-nilai integritas dan sikap anti-korupsi yang wajib dimiliki ASN.', 
'## Tujuan Pembelajaran

[Konten akan diisi admin]

## Contoh Kasus

[Konten akan diisi admin]', 
'https://www.youtube.com/embed/dQw4w9WgXcQ', 'TKP', true),

('Kerjasama Tim', 'kerjasama-tim', 
'Strategi menjawab soal tentang kolaborasi dan dinamika kerja kelompok.', 
'## Tujuan Pembelajaran

[Konten akan diisi admin]', 
null, 'TKP', false),

('Manajemen Konflik', 'manajemen-konflik', 
'Cara mengelola konflik di lingkungan kerja dengan bijaksana dan profesional.', 
'## Tujuan Pembelajaran

[Konten akan diisi admin]

## Pembahasan Inti

[Konten akan diisi admin]', 
null, 'TKP', false),

('Adaptasi & Inovasi', 'adaptasi-inovasi', 
'Kemampuan beradaptasi dengan perubahan dan berinovasi dalam tugas ASN.', 
'## Tujuan Pembelajaran

[Konten akan diisi admin]

## Tips Menjawab

[Konten akan diisi admin]', 
null, 'TKP', true);
