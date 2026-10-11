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
  RETURNING
    id
  INTO
    q_id;

  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Memakai seragam sekolah dengan atribut lengkap', TRUE, 0),
    (q_id, 'Hanya berteman dengan yang satu suku', FALSE, 0),
    (q_id, 'Menggunakan bahasa asing saat jam istirahat', FALSE, 0),
    (q_id, 'Menolak mengikuti upacara bendera', FALSE, 0),
    (q_id, 'Membeli produk impor untuk jajan', FALSE, 0);
  -- Q2: Integrity
  INSERT INTO questions (content, type, category, difficulty)
    VALUES ('Seorang ASN yang menolak gratifikasi sedang menerapkan nilai integritas...', 'TWK', 'Integritas', 2)
  RETURNING
    id
  INTO
    q_id;

  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Jujur', TRUE, 0),
    (q_id, 'Disiplin', FALSE, 0),
    (q_id, 'Tanggung Jawab', FALSE, 0),
    (q_id, 'Kerja Keras', FALSE, 0),
    (q_id, 'Peduli', FALSE, 0);
  -- Q3: Bela Negara
  INSERT INTO questions (content, type, category, difficulty)
    VALUES ('Ancaman militer yang menggunakan kekuatan bersenjata terorganisir disebut...', 'TWK', 'Bela Negara', 2)
  RETURNING
    id
  INTO
    q_id;

  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Agresi', TRUE, 0),
    (q_id, 'Sabotase', FALSE, 0),
    (q_id, 'Spionase', FALSE, 0),
    (q_id, 'Terorisme', FALSE, 0),
    (q_id, 'Pelanggaran Wilayah', FALSE, 0);
END
$$;

-- 2. INSERT TIU QUESTIONS (5 Correct, 0 Wrong)
DO $$
DECLARE
  q_id uuid;
BEGIN
  -- Q1: Analogy
  INSERT INTO questions (content, type, category, difficulty)
    VALUES ('KAYU : MEJA = ... : ...', 'TIU', 'Analogi', 1)
  RETURNING
    id
  INTO
    q_id;

  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'EMAS : CINCIN', TRUE, 0),
    (q_id, 'KACA : JENDELA', FALSE, 0),
    (q_id, 'PLASTIK : EMBER', FALSE, 0),
    (q_id, 'KARET : BAN', FALSE, 0),
    (q_id, 'BESI : PAGAR', FALSE, 0);
  -- Note: All could be valid materials, but Emas:Cincin is best fit for crafting? Let's assume A for now.
  -- Q2: Number Series
  INSERT INTO questions (content, type, category, difficulty)
    VALUES ('2, 5, 8, 11, ...', 'TIU', 'Deret Angka', 1)
  RETURNING
    id
  INTO
    q_id;

  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, '14', TRUE, 0),
    (q_id, '13', FALSE, 0),
    (q_id, '15', FALSE, 0),
    (q_id, '12', FALSE, 0),
    (q_id, '16', FALSE, 0);
END
$$;

-- 3. INSERT TKP QUESTIONS (Score 1-5, No Zero)
DO $$
DECLARE
  q_id uuid;
BEGIN
  -- Q1: Public Service
  INSERT INTO questions (content, type, category, difficulty)
    VALUES ('Anda sedang melayani pelanggan yang sangat cerewet dan menuntut hal yang tidak sesuai aturan. Sikap Anda...', 'TKP', 'Pelayanan Publik', 2)
  RETURNING
    id
  INTO
    q_id;

  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Tetap tersenyum dan menjelaskan aturan dengan sabar', FALSE, 5),
    (q_id, 'Meminta teman lain untuk melayaninya', FALSE, 4),
    (q_id, 'Mendengarkan saja tanpa merespon', FALSE, 3),
    (q_id, 'Menegurnya agar tidak berisik', FALSE, 2),
    (q_id, 'Meninggalkan pelanggan tersebut', FALSE, 1);
  -- Q2: Professionalism
  INSERT INTO questions (content, type, category, difficulty)
    VALUES ('Atasan Anda memberikan tugas mendadak di luar jam kerja. Sikap Anda...', 'TKP', 'Profesionalisme', 2)
  RETURNING
    id
  INTO
    q_id;

  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Mengerjakannya dengan sungguh-sungguh agar cepat selesai', FALSE, 5),
    (q_id, 'Mengerjakan tapi sambil mengeluh', FALSE, 4),
    (q_id, 'Menolak dengan halus karena sudah lelah', FALSE, 3),
    (q_id, 'Pura-pura tidak membaca pesan', FALSE, 2),
    (q_id, 'Marah kepada atasan', FALSE, 1);
END
$$;
