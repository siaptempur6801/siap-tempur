-- =============================================
-- Seed: TIU - Serial (4 Soal)
-- =============================================
DO $$
DECLARE
  q_id uuid;
BEGIN
  -- Soal 1
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Terdapat deret gambar berurutan: (1) panah menunjuk jam 12, (2) panah menunjuk jam 3, (3) panah menunjuk jam 6. Maka gambar ke-(4) adalah...', 'TIU', 'Serial', 'Serial',
   'Pola putaran arah jarum jam sebesar 90 derajat. Jam 12 -> 3 -> 6 -> 9.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Panah menunjuk jam 9 (kiri)', true, 5),
  (q_id, 'Panah menunjuk jam 12 (atas)', false, 0),
  (q_id, 'Panah menunjuk jam 1 (serong atas)', false, 0),
  (q_id, 'Panah menunjuk jam 6 (bawah)', false, 0),
  (q_id, 'Panah tidak berputar', false, 0);

  -- Soal 2
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Seri gambar: (1) Kotak putih, (2) Kotak bergaris 1 horizontal, (3) Kotak bergaris 2 horizontal, (4) Kotak bergaris 3 horizontal. Gambar selanjutnya (5) adalah...', 'TIU', 'Serial', 'Serial',
   'Pola penambahan 1 garis horizontal setiap tahap. Maka selanjutnya kotak dengan 4 garis horizontal.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Kotak bergaris 4 horizontal', true, 5),
  (q_id, 'Kotak bergaris 4 vertikal', false, 0),
  (q_id, 'Kotak hitam penuh', false, 0),
  (q_id, 'Kotak bergaris menyilang X', false, 0),
  (q_id, 'Kotak tanpa garis', false, 0);

  -- Soal 3
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Seri gambar: (1) Segitiga dengan 1 titik hitam di dalam, (2) Segi empat dengan 2 titik hitam, (3) Segi lima dengan 3 titik hitam. Gambar ke-(4) adalah...', 'TIU', 'Serial', 'Serial',
   'Pola: Jumlah sisi bangun bertambah 1 (3, 4, 5, 6). Jumlah titik bertambah 1 (1, 2, 3, 4). Maka gambar selanjutnya segi enam dengan 4 titik hitam.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Segi enam dengan 4 titik hitam di dalamnya', true, 5),
  (q_id, 'Segi enam dengan 5 titik hitam di dalamnya', false, 0),
  (q_id, 'Segi lima dengan 4 titik hitam di dalamnya', false, 0),
  (q_id, 'Lingkaran dengan 4 titik hitam di dalamnya', false, 0),
  (q_id, 'Segitiga dengan 4 titik hitam di luarnya', false, 0);

  -- Soal 4
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Seri gambar bentuk awan yang perlahan-lahan menyusut dari luar ke dalam: (1) Awan besar, (2) Awan sedang, (3) Awan kecil. Maka gambar ke-(4) paling mungkin adalah...', 'TIU', 'Serial', 'Serial',
   'Pola zoom-out atau penyusutan skala berkelanjutan secara proporsional. Awan besar -> sedang -> kecil -> awan sangat kecil atau titik.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Bentuk awan yang sangat kecil atau hampir menyerupai titik', true, 5),
  (q_id, 'Bentuk awan raksasa', false, 0),
  (q_id, 'Awan yang menurunkan hujan lebat', false, 0),
  (q_id, 'Bentuk matahari bersinar cerah', false, 0),
  (q_id, 'Bentuk kotak persegi sebagai penyederhanaan awan', false, 0);

END $$;
