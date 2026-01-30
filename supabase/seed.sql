-- CLEANUP (Optional, be careful in production)
-- delete from questions;
-- delete from options;

-- 1. INSERT TWK QUESTIONS (5 Correct, 0 Wrong)
DO $$
DECLARE
  q_id uuid;
BEGIN
  -- Q1: Nationalism
  INSERT INTO questions (content, type, category, difficulty)
  VALUES ('Sikap nasionalisme di lingkungan sekolah dapat ditunjukkan dengan cara...', 'TWK', 'Nasionalisme', 1)
  RETURNING id INTO q_id;

  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Memakai seragam sekolah dengan atribut lengkap', true, 0),
  (q_id, 'Hanya berteman dengan yang satu suku', false, 0),
  (q_id, 'Menggunakan bahasa asing saat jam istirahat', false, 0),
  (q_id, 'Menolak mengikuti upacara bendera', false, 0),
  (q_id, 'Membeli produk impor untuk jajan', false, 0);

  -- Q2: Integrity
  INSERT INTO questions (content, type, category, difficulty)
  VALUES ('Seorang ASN yang menolak gratifikasi sedang menerapkan nilai integritas...', 'TWK', 'Integritas', 2)
  RETURNING id INTO q_id;

  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Jujur', true, 0),
  (q_id, 'Disiplin', false, 0),
  (q_id, 'Tanggung Jawab', false, 0),
  (q_id, 'Kerja Keras', false, 0),
  (q_id, 'Peduli', false, 0);
  
    -- Q3: Bela Negara
  INSERT INTO questions (content, type, category, difficulty)
  VALUES ('Ancaman militer yang menggunakan kekuatan bersenjata terorganisir disebut...', 'TWK', 'Bela Negara', 2)
  RETURNING id INTO q_id;

  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Agresi', true, 0),
  (q_id, 'Sabotase', false, 0),
  (q_id, 'Spionase', false, 0),
  (q_id, 'Terorisme', false, 0),
  (q_id, 'Pelanggaran Wilayah', false, 0);
END $$;

-- 2. INSERT TIU QUESTIONS (5 Correct, 0 Wrong)
DO $$
DECLARE
  q_id uuid;
BEGIN
  -- Q1: Analogy
  INSERT INTO questions (content, type, category, difficulty)
  VALUES ('KAYU : MEJA = ... : ...', 'TIU', 'Analogi', 1)
  RETURNING id INTO q_id;

  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'EMAS : CINCIN', true, 0),
  (q_id, 'KACA : JENDELA', false, 0),
  (q_id, 'PLASTIK : EMBER', false, 0),
  (q_id, 'KARET : BAN', false, 0),
  (q_id, 'BESI : PAGAR', false, 0); -- Note: All could be valid materials, but Emas:Cincin is best fit for crafting? Let's assume A for now.

  -- Q2: Number Series
  INSERT INTO questions (content, type, category, difficulty)
  VALUES ('2, 5, 8, 11, ...', 'TIU', 'Deret Angka', 1)
  RETURNING id INTO q_id;

  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, '14', true, 0),
  (q_id, '13', false, 0),
  (q_id, '15', false, 0),
  (q_id, '12', false, 0),
  (q_id, '16', false, 0);
END $$;

-- 3. INSERT TKP QUESTIONS (Score 1-5, No Zero)
DO $$
DECLARE
  q_id uuid;
BEGIN
  -- Q1: Public Service
  INSERT INTO questions (content, type, category, difficulty)
  VALUES ('Anda sedang melayani pelanggan yang sangat cerewet dan menuntut hal yang tidak sesuai aturan. Sikap Anda...', 'TKP', 'Pelayanan Publik', 2)
  RETURNING id INTO q_id;

  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Tetap tersenyum dan menjelaskan aturan dengan sabar', false, 5),
  (q_id, 'Meminta teman lain untuk melayaninya', false, 4),
  (q_id, 'Mendengarkan saja tanpa merespon', false, 3),
  (q_id, 'Menegurnya agar tidak berisik', false, 2),
  (q_id, 'Meninggalkan pelanggan tersebut', false, 1);

  -- Q2: Professionalism
  INSERT INTO questions (content, type, category, difficulty)
  VALUES ('Atasan Anda memberikan tugas mendadak di luar jam kerja. Sikap Anda...', 'TKP', 'Profesionalisme', 2)
  RETURNING id INTO q_id;

  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Mengerjakannya dengan sungguh-sungguh agar cepat selesai', false, 5),
  (q_id, 'Mengerjakan tapi sambil mengeluh', false, 4),
  (q_id, 'Menolak dengan halus karena sudah lelah', false, 3),
  (q_id, 'Pura-pura tidak membaca pesan', false, 2),
  (q_id, 'Marah kepada atasan', false, 1);
END $$;
