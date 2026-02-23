-- =============================================
-- Seed: TIU - Analogi (6 Soal)
-- =============================================
DO $$
DECLARE
  q_id uuid;
BEGIN
  -- Soal 1
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('GITAR : PETIK = ... : ...', 'TIU', 'Analogi', 'Analogi',
   'Gitar dimainkan dengan cara dipetik. Seruling dimainkan dengan cara ditiup.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Seruling : Tiup', true, 5),
  (q_id, 'Drum : Ketuk', false, 0),
  (q_id, 'Piano : Gesek', false, 0),
  (q_id, 'Biola : Tekan', false, 0),
  (q_id, 'Gamelan : Pukul', false, 0);

  -- Soal 2
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('RUMAH : ATAP = KEPALA : ...', 'TIU', 'Analogi', 'Analogi',
   'Atap adalah pelindung bagian paling atas dari rumah. Rambut (atau topi) adalah pelindung bagian atas kepala.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Rambut', true, 5),
  (q_id, 'Mata', false, 0),
  (q_id, 'Otak', false, 0),
  (q_id, 'Telinga', false, 0),
  (q_id, 'Hidung', false, 0);

  -- Soal 3
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('GUDANG : BARANG = ... : ...', 'TIU', 'Analogi', 'Analogi',
   'Gudang adalah tempat untuk menyimpan barang. Bank adalah tempat untuk menyimpan uang.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Bank : Uang', true, 5),
  (q_id, 'Perpustakaan : Pustakawan', false, 0),
  (q_id, 'Garasi : Mobil', false, 0), -- Garasi:Kendaraan lebih tepat
  (q_id, 'Buku : Rak', false, 0), -- Terbalik
  (q_id, 'Sekolah : Guru', false, 0);

  -- Soal 4
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('KEDELAI : TEMPE = ... : ...', 'TIU', 'Analogi', 'Analogi',
   'Kedelai adalah bahan baku utama untuk membuat tempe. Gandum adalah bahan baku utama pembuat roti.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Gandum : Roti', true, 5),
  (q_id, 'Susu : Sapi', false, 0), -- Terbalik
  (q_id, 'Kain : Baju', false, 0),
  (q_id, 'Pohon : Papan', false, 0),
  (q_id, 'Garam : Asin', false, 0);

  -- Soal 5
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('HUJAN : PAYUNG = ... : ...', 'TIU', 'Analogi', 'Analogi',
   'Payung digunakan untuk melindungi tubuh dari hujan. Helm digunakan melindungi diri saat terjadi benturan.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Benturan : Helm', true, 5),
  (q_id, 'Lapar : Makan', false, 0),
  (q_id, 'Banjir : Perahu', false, 0),
  (q_id, 'Terik : Kipas', false, 0),
  (q_id, 'Gelap : Lampu', false, 0);

  -- Soal 6
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('SUHU : TERMOMETER = GEMPA BUMI : ...', 'TIU', 'Analogi', 'Analogi',
   'Suhu diukur dengan alat bernama termometer. Gempa bumi diukur dengan alat bernama seismograf.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Seismograf', true, 5),
  (q_id, 'Richter', false, 0), -- Richter adalah satuan
  (q_id, 'Barometer', false, 0),
  (q_id, 'Anemometer', false, 0),
  (q_id, 'Dinamometer', false, 0);

END $$;
