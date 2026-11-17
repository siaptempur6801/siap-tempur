-- =============================================
-- Seed: TIU - Analogi (6 Soal)
-- =============================================
DO $$
DECLARE
  q_id uuid;
BEGIN
  -- Soal 1
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('GITAR : PETIK = ... : ...', 'TIU', 'Analogi', 'Analogi', 'Gitar dimainkan dengan cara dipetik. Seruling dimainkan dengan cara ditiup.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Seruling : Tiup', TRUE, 5),
    (q_id, 'Drum : Ketuk', FALSE, 0),
    (q_id, 'Piano : Gesek', FALSE, 0),
    (q_id, 'Biola : Tekan', FALSE, 0),
    (q_id, 'Gamelan : Pukul', FALSE, 0);
  -- Soal 2
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('RUMAH : ATAP = KEPALA : ...', 'TIU', 'Analogi', 'Analogi', 'Atap adalah pelindung bagian paling atas dari rumah. Rambut (atau topi) adalah pelindung bagian atas kepala.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Rambut', TRUE, 5),
    (q_id, 'Mata', FALSE, 0),
    (q_id, 'Otak', FALSE, 0),
    (q_id, 'Telinga', FALSE, 0),
    (q_id, 'Hidung', FALSE, 0);
  -- Soal 3
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('GUDANG : BARANG = ... : ...', 'TIU', 'Analogi', 'Analogi', 'Gudang adalah tempat untuk menyimpan barang. Bank adalah tempat untuk menyimpan uang.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Bank : Uang', TRUE, 5),
    (q_id, 'Perpustakaan : Pustakawan', FALSE, 0),
    (q_id, 'Garasi : Mobil', FALSE, 0), -- Garasi:Kendaraan lebih tepat
    (q_id, 'Buku : Rak', FALSE, 0), -- Terbalik
    (q_id, 'Sekolah : Guru', FALSE, 0);
  -- Soal 4
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('KEDELAI : TEMPE = ... : ...', 'TIU', 'Analogi', 'Analogi', 'Kedelai adalah bahan baku utama untuk membuat tempe. Gandum adalah bahan baku utama pembuat roti.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Gandum : Roti', TRUE, 5),
    (q_id, 'Susu : Sapi', FALSE, 0), -- Terbalik
    (q_id, 'Kain : Baju', FALSE, 0),
    (q_id, 'Pohon : Papan', FALSE, 0),
    (q_id, 'Garam : Asin', FALSE, 0);
  -- Soal 5
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('HUJAN : PAYUNG = ... : ...', 'TIU', 'Analogi', 'Analogi', 'Payung digunakan untuk melindungi tubuh dari hujan. Helm digunakan melindungi diri saat terjadi benturan.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Benturan : Helm', TRUE, 5),
    (q_id, 'Lapar : Makan', FALSE, 0),
    (q_id, 'Banjir : Perahu', FALSE, 0),
    (q_id, 'Terik : Kipas', FALSE, 0),
    (q_id, 'Gelap : Lampu', FALSE, 0);
  -- Soal 6
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('SUHU : TERMOMETER = GEMPA BUMI : ...', 'TIU', 'Analogi', 'Analogi', 'Suhu diukur dengan alat bernama termometer. Gempa bumi diukur dengan alat bernama seismograf.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Seismograf', TRUE, 5),
    (q_id, 'Richter', FALSE, 0), -- Richter adalah satuan
    (q_id, 'Barometer', FALSE, 0),
    (q_id, 'Anemometer', FALSE, 0),
    (q_id, 'Dinamometer', FALSE, 0);

END
$$;
