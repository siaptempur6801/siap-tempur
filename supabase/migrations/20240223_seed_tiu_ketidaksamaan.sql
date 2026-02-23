-- =============================================
-- Seed: TIU - Ketidaksamaan (2 Soal)
-- =============================================
DO $$
DECLARE
  q_id uuid;
BEGIN
  -- Soal 1
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Di antara kelima gambar bangun datar berikut, manakah yang tidak memiliki kesamaan kelompok dengan yang lainnya? (A) Persegi Panjang (B) Trapesium (C) Jajar Genjang (D) Lingkaran (E) Belah Ketupat', 'TIU', 'Ketidaksamaan', 'Ketidaksamaan',
   'A, B, C, dan E adalah bangun datar segi empat yang dibentuk oleh garis lurus (poligon). D (Lingkaran) dibentuk oleh garis lengkung dan bukan segi empat.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Lingkaran', true, 5),
  (q_id, 'Persegi Panjang', false, 0),
  (q_id, 'Trapesium', false, 0),
  (q_id, 'Jajar Genjang', false, 0),
  (q_id, 'Belah Ketupat', false, 0);

  -- Soal 2
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Manakah kelompok gambar yang berbeda polanya? (A) Bintang 5 sudut dengan 5 titik hitam (B) Segi empat dengan 4 titik hitam (C) Segitiga dengan 3 titik hitam (D) Segi enam dengan 5 titik hitam (E) Segi delapan dengan 8 titik hitam', 'TIU', 'Ketidaksamaan', 'Ketidaksamaan',
   'Semua gambar memiliki jumlah titik hitam yang sama dengan jumlah sudut/sisinya, KECUALI D (segi enam dengan 5 titik hitam).') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Segi enam dengan 5 titik hitam', true, 5),
  (q_id, 'Bintang 5 sudut dengan 5 titik hitam', false, 0),
  (q_id, 'Segi empat dengan 4 titik hitam', false, 0),
  (q_id, 'Segitiga dengan 3 titik hitam', false, 0),
  (q_id, 'Segi delapan dengan 8 titik hitam', false, 0);

END $$;
