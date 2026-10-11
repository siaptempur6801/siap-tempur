-- Seed dummy materials for CPNS learning platform
-- You can edit the content later via Supabase dashboard or update this file
-- Clear existing dummy data (optional)
-- DELETE FROM materials WHERE slug LIKE 'dummy-%';
INSERT INTO materials (title, slug, description, content, video_url, category, is_premium)
VALUES
-- TWK Materials (Free & Premium)
('Pancasila: Sila Ke-1', 'pancasila-sila-1', 'Memahami butir-butir pengamalan Sila Ketuhanan Yang Maha Esa dalam kehidupan berbangsa dan bernegara.', '## Tujuan Pembelajaran\n\n[Konten akan diisi admin]\n\n## Pengantar Materi\n\n[Konten akan diisi admin]\n\n## Ringkasan\n\n[Konten akan diisi admin]', NULL, 'TWK', FALSE),
('Pancasila: Sila Ke-2', 'pancasila-sila-2', 'Mempelajari nilai-nilai kemanusiaan yang adil dan beradab dalam konteks kehidupan ASN.', '## Tujuan Pembelajaran\n\n[Konten akan diisi admin]\n\n## Pengantar Materi\n\n[Konten akan diisi admin]', NULL, 'TWK', FALSE),
('UUD 1945: Pasal-Pasal Penting', 'uud-1945-pasal', 'Memahami pasal-pasal kunci dalam UUD 1945 yang sering muncul di soal CPNS.', '## Tujuan Pembelajaran\n\n[Konten akan diisi admin]\n\n## Pembahasan Inti\n\n[Konten akan diisi admin]', NULL, 'TWK', TRUE),
('Bhinneka Tunggal Ika', 'bhinneka-tunggal-ika', 'Memahami makna semboyan bangsa dan penerapannya dalam kehidupan ASN.', '## Tujuan Pembelajaran\n\n[Konten akan diisi admin]', NULL, 'TWK', FALSE),
('Wawasan Nusantara', 'wawasan-nusantara', 'Konsep wawasan nusantara sebagai geopolitik Indonesia yang wajib dipahami ASN.', '## Tujuan Pembelajaran\n\n[Konten akan diisi admin]\n\n## Pengantar Materi\n\n[Konten akan diisi admin]', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'TWK', TRUE),
-- TIU Materials (Free & Premium)
('Deret Angka: Pola Dasar', 'deret-angka-dasar', 'Mengenali pola deret angka sederhana: naik, turun, loncat, dan kombinasi.', '## Tujuan Pembelajaran\n\n[Konten akan diisi admin]\n\n## Contoh Soal\n\n[Konten akan diisi admin]', NULL, 'TIU', FALSE),
('Deret Angka: Trik Cepat', 'deret-angka-trik', 'Shortcut dan strategi menyelesaikan soal deret angka dalam 10 detik.', '## Tujuan Pembelajaran\n\n[Konten akan diisi admin]\n\n## Tips & Jebakan\n\n[Konten akan diisi admin]', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'TIU', TRUE),
('Analogi Verbal', 'analogi-verbal', 'Memahami hubungan makna kata dan menemukan pasangan kata yang tepat.', '## Tujuan Pembelajaran\n\n[Konten akan diisi admin]', NULL, 'TIU', FALSE),
('Silogisme Sederhana', 'silogisme-dasar', 'Dasar-dasar penalaran logika silogisme untuk mengambil kesimpulan yang valid.', '## Tujuan Pembelajaran\n\n[Konten akan diisi admin]\n\n## Pembahasan Inti\n\n[Konten akan diisi admin]', NULL, 'TIU', FALSE),
('Operasi Hitung Cepat', 'operasi-hitung-cepat', 'Teknik perhitungan cepat untuk soal aritmatika tanpa kalkulator.', '## Tujuan Pembelajaran\n\n[Konten akan diisi admin]\n\n## Tips & Jebakan\n\n[Konten akan diisi admin]', NULL, 'TIU', TRUE),
-- TKP Materials (Free & Premium)
('Orientasi Pelayanan', 'orientasi-pelayanan', 'Memahami sikap melayani sebagai inti dari tugas ASN yang profesional.', '## Tujuan Pembelajaran\n\n[Konten akan diisi admin]\n\n## Pengantar Materi\n\n[Konten akan diisi admin]', NULL, 'TKP', FALSE),
('Integritas & Anti-Korupsi', 'integritas-anti-korupsi', 'Nilai-nilai integritas dan sikap anti-korupsi yang wajib dimiliki ASN.', '## Tujuan Pembelajaran\n\n[Konten akan diisi admin]\n\n## Contoh Kasus\n\n[Konten akan diisi admin]', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'TKP', TRUE),
('Kerjasama Tim', 'kerjasama-tim', 'Strategi menjawab soal tentang kolaborasi dan dinamika kerja kelompok.', '## Tujuan Pembelajaran\n\n[Konten akan diisi admin]', NULL, 'TKP', FALSE),
('Manajemen Konflik', 'manajemen-konflik', 'Cara mengelola konflik di lingkungan kerja dengan bijaksana dan profesional.', '## Tujuan Pembelajaran\n\n[Konten akan diisi admin]\n\n## Pembahasan Inti\n\n[Konten akan diisi admin]', NULL, 'TKP', FALSE),
('Adaptasi & Inovasi', 'adaptasi-inovasi', 'Kemampuan beradaptasi dengan perubahan dan berinovasi dalam tugas ASN.', '## Tujuan Pembelajaran\n\n[Konten akan diisi admin]\n\n## Tips Menjawab\n\n[Konten akan diisi admin]', NULL, 'TKP', TRUE);
