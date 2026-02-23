-- =============================================
-- Seed: TIU - Silogisme (6 Soal)
-- =============================================
DO $$
DECLARE
  q_id uuid;
BEGIN
  -- Soal 1
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Semua pekerja pabrik memakai helm kuning. Beberapa pemuda di halte adalah pekerja pabrik. Kesimpulan yang tepat adalah...', 'TIU', 'Silogisme', 'Silogisme',
   'Beberapa pemuda di halte adalah pekerja pabrik (premis mayor terpenuhi pada sebagian pemuda). Berarti beberapa pemuda di halte tersebut pasti memakai helm kuning.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Beberapa pemuda di halte memakai helm kuning', true, 5),
  (q_id, 'Semua pemuda di halte memakai helm kuning', false, 0),
  (q_id, 'Semua pekerja pabrik berada di halte', false, 0),
  (q_id, 'Tidak ada pemuda di halte yang memakai helm kuning', false, 0),
  (q_id, 'Beberapa pekerja pabrik tidak memakai helm kuning', false, 0);

  -- Soal 2
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Tidak ada siswa malas yang lulus ujian. Anton lulus ujian tahun ini. Kesimpulan yang sah adalah...', 'TIU', 'Silogisme', 'Silogisme',
   'Modus Tollens: Jika malas -> tidak lulus. Anton lulus. Maka Anton tidak malas.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Anton bukan siswa yang malas', true, 5),
  (q_id, 'Anton adalah siswa yang paling rajin', false, 0),
  (q_id, 'Sebagian siswa rajin tidak lulus ujian', false, 0),
  (q_id, 'Siswa yang lulus ujian pastilah pintar', false, 0),
  (q_id, 'Anton mungkin saja malas jika beruntung', false, 0);

  -- Soal 3
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Jika hari hujan, tanah di pekarangan basah. Jika tanah di pekarangan basah, maka rumput akan tumbuh subur. Ternyata hari ini rumput tidak tumbuh subur.', 'TIU', 'Silogisme', 'Silogisme',
   'Silogisme berantai: Hujan -> Basah -> Subur. Jika tidak subur, berarti runutan ke atas batal: Tidak hujan.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Hari ini tidak hujan', true, 5),
  (q_id, 'Hari ini hujan tetapi tidak subur', false, 0),
  (q_id, 'Tanah di pekarangan basah', false, 0),
  (q_id, 'Rumput butuh pupuk untuk subur', false, 0),
  (q_id, 'Hari ini mendung', false, 0);

  -- Soal 4
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Semua koki mahir memotong sayuran. Sebagian ibu rumah tangga adalah koki. Kesimpulan...', 'TIU', 'Silogisme', 'Silogisme',
   'Karena sebagian ibu RT adalah koki, dan SEMUA koki mahir, maka sebagian ibu RT mahir memotong sayuran.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Sebagian ibu rumah tangga mahir memotong sayuran', true, 5),
  (q_id, 'Semua ibu rumah tangga mahir memotong sayuran', false, 0),
  (q_id, 'Sebagian ibu rumah tangga bukan koki yang mahir', false, 0),
  (q_id, 'Semua koki adalah ibu rumah tangga', false, 0),
  (q_id, 'Sebagian koki tidak mahir memotong sayuran', false, 0);

  -- Soal 5
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Setiap pendaki gunung harus membawa perbekalan cukup. Andi tidak membawa perbekalan cukup.', 'TIU', 'Silogisme', 'Silogisme',
   'Andi tidak memenuhi syarat mutlak "membawa perbekalan cukup" bagi pendaki gunung. Maka Andi bukan/tidak boleh menjadi pendaki gunung.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Andi bukan seorang pendaki gunung', true, 5),
  (q_id, 'Andi akan meminjam perbekalan dari temannya', false, 0),
  (q_id, 'Andi seorang pendaki gunung yang ceroboh', false, 0),
  (q_id, 'Beberapa pendaki tidak membawa perbekalan', false, 0),
  (q_id, 'Andi seorang pemanjat tebing', false, 0);

  -- Soal 6
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Semua buku pelajaran bersampul plastik. Ada buku di atas meja kelas yang tidak bersampul plastik.', 'TIU', 'Silogisme', 'Silogisme',
   'Jika ada benda yang tidak memiliki atribut wajib "bersampul plastik" dari suatu himpunan (buku pelajaran), maka benda tersebut pasti BUKAN himpunan tersebut.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Ada buku di atas meja kelas yang bukan buku pelajaran', true, 5),
  (q_id, 'Semua buku di atas meja kelas bukan buku pelajaran', false, 0),
  (q_id, 'Semua buku pelajaran belum diberi sampul', false, 0),
  (q_id, 'Ada buku pelajaran yang tidak bersampul plastik', false, 0),
  (q_id, 'Beberapa meja tidak memiliki buku pelajaran', false, 0);

END $$;
