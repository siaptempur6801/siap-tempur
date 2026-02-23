-- =============================================
-- Seed: TIU - Analogi Figural (4 Soal)
-- =============================================
DO $$
DECLARE
  q_id uuid;
BEGIN
  -- Soal 1
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Gambar A adalah segitiga utuh. Gambar B adalah segitiga yang terbelah dua. Jika Gambar C adalah persegi utuh, maka analogi Gambar D yang paling tepat adalah...', 'TIU', 'Analogi Figural', 'Analogi Figural',
   'Pola: Bangun datar utuh menjadi dibelah/dibagi dua garis tengah. Persegi utuh menjadi persegi yang terbelah dua (menjadi dua persegi panjang atau dua segitiga sesuai potongan).') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Persegi yang dibelah dengan garis diagonal/tengah menjadi dua bagian', true, 5),
  (q_id, 'Persegi yang dipotong menjadi empat bagian kecil', false, 0),
  (q_id, 'Lingkaran yang terbelah dua', false, 0),
  (q_id, 'Persegi utuh tanpa potongan', false, 0),
  (q_id, 'Dua buah segitiga terpisah', false, 0);

  -- Soal 2
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('A -> B : C -> D. A: Lingkaran warna Hitam. B: Lingkaran bersarang (Hitam di dalam, Putih di luar). C: Persegi warna Putih. Maka bentuk D adalah...', 'TIU', 'Analogi Figural', 'Analogi Figural',
   'Pola: Bangun ditambahkan bingkai luaran dengan warna berlawanan. Persegi putih ditambahkan bingkai luar persegi hitam.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Persegi ganda dengan persegi dalam putih dan persegi luar hitam', true, 5),
  (q_id, 'Persegi ganda dengan warna hitam semua', false, 0),
  (q_id, 'Persegi ganda dengan warna putih semua', false, 0),
  (q_id, 'Persegi dengan lingkaran di tengahnya', false, 0),
  (q_id, 'Satu buah persegi berukuran raksasa warna Hitam', false, 0);

  -- Soal 3
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('A -> B : C -> D. A: Titik tiga berjajar horizontal. B: Titik tiga berjajar vertikal. C: Garis lurus horizontal, maka D adalah...', 'TIU', 'Analogi Figural', 'Analogi Figural',
   'Pola: Objek diputar 90 derajat. Titik horizontal ( - ) menjadi vertikal ( | ). Maka Garis horizontal (-) diputar 90 derajat menjadi garis vertikal (|).') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Garis lurus vertikal', true, 5),
  (q_id, 'Garis tebal melengkung', false, 0),
  (q_id, 'Dua garis lurus sejajar', false, 0),
  (q_id, 'Titik-titik berbaris miring', false, 0),
  (q_id, 'Garis putus-putus mendatar', false, 0);

  -- Soal 4
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('A: Huruf L. B: Huruf V. C: Persegi terbuka 3 sisi (bentuk huruf U kotak). Maka polanya berhubungan dengan jumlah titik sudut. Huruf L ada 1 sudut. Huruf V ada 1 sudut. Hubungan C (2 sudut siku) ke D adalah...', 'TIU', 'Analogi Figural', 'Analogi Figural',
   'Bentuk-bentuk yang memiliki kesetaraan dalam sifat geometris dasar. Anggap kita mencari yang punya 2 titik sudut persendian seperti Z atau N, dsb.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Bentuk dengan tepat dua titik sudut/lekukan (misal tangga dua anak tubuh)', true, 5),
  (q_id, 'Bentuk lingkaran penuh tanpa sudut', false, 0),
  (q_id, 'Bentuk segitiga bersudut tiga', false, 0),
  (q_id, 'Bentuk V terbalik', false, 0),
  (q_id, 'Persegi utuh', false, 0);

END $$;
