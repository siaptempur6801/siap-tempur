-- Seed TWK (Tes Wawasan Kebangsaan) Materials
-- Total: 5 materials (3 free, 2 premium)

-- Delete existing TWK materials to prevent duplicates
DELETE FROM materials WHERE category = 'TWK';

INSERT INTO materials (title, slug, description, content, video_url, category, is_premium) VALUES

('Pancasila: Sila Ke-1', 'pancasila-sila-1', 
'Memahami butir-butir pengamalan Sila Ketuhanan Yang Maha Esa dalam kehidupan berbangsa dan bernegara.', 
'## Tujuan Pembelajaran

[Konten akan diisi admin]

## Pengantar Materi

[Konten akan diisi admin]

## Ringkasan

[Konten akan diisi admin]', 
null, 'TWK', false),

('Pancasila: Sila Ke-2', 'pancasila-sila-2', 
'Mempelajari nilai-nilai kemanusiaan yang adil dan beradab dalam konteks kehidupan ASN.', 
'## Tujuan Pembelajaran

[Konten akan diisi admin]

## Pengantar Materi

[Konten akan diisi admin]', 
null, 'TWK', false),

('UUD 1945: Pasal-Pasal Penting', 'uud-1945-pasal', 
'Memahami pasal-pasal kunci dalam UUD 1945 yang sering muncul di soal CPNS.', 
'## Tujuan Pembelajaran

[Konten akan diisi admin]

## Pembahasan Inti

[Konten akan diisi admin]', 
null, 'TWK', true),

('Bhinneka Tunggal Ika', 'bhinneka-tunggal-ika', 
'Memahami makna semboyan bangsa dan penerapannya dalam kehidupan ASN.', 
'## Tujuan Pembelajaran

[Konten akan diisi admin]', 
null, 'TWK', false),

('Wawasan Nusantara', 'wawasan-nusantara', 
'Konsep wawasan nusantara sebagai geopolitik Indonesia yang wajib dipahami ASN.', 
'## Tujuan Pembelajaran

[Konten akan diisi admin]

## Pengantar Materi

[Konten akan diisi admin]', 
'https://www.youtube.com/embed/dQw4w9WgXcQ', 'TWK', true);
