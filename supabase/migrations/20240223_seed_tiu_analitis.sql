-- =============================================
-- Seed: TIU - Analitis (8 Soal)
-- =============================================
DO $$
DECLARE
  q_id uuid;
BEGIN
  -- Soal 1
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Dalam lomba lari, Riko sampai garis finis lebih cepat dari pada Tedi namun lebih lambat dari pada Budi. Jaka lebih cepat dari Budi. Urutan dari yang tercepat ke yang paling lambat adalah...', 'TIU', 'Analitis', 'Analitis',
   'Jaka > Budi. Budi > Riko > Tedi. Susunan: Jaka, Budi, Riko, Tedi.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Jaka, Budi, Riko, Tedi', true, 5),
  (q_id, 'Budi, Jaka, Riko, Tedi', false, 0),
  (q_id, 'Jaka, Riko, Budi, Tedi', false, 0),
  (q_id, 'Budi, Riko, Jaka, Tedi', false, 0),
  (q_id, 'Tedi, Riko, Budi, Jaka', false, 0);

  -- Soal 2
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Lima mahasiswa A, B, C, D, dan E presentasi berturut-turut. B presentasi setelah C dan sebelum E. D presentasi pada urutan kedua. A presentasi paling akhir. Siapakah yang presentasi pertama?', 'TIU', 'Analitis', 'Analitis',
   'Urutan (5 kursi): _ D _ _ A. C-B-E harus berurutan. Jika masuk ke 3 slot tersisa, tidak muat karena terpotong D. B "setelah" C bukan berarti "tepat setelah". Jika C di urutan 1: (1)C, (2)D, (3)B, (4)E, (5)A. Cocok.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'C', true, 5),
  (q_id, 'B', false, 0),
  (q_id, 'E', false, 0),
  (q_id, 'D', false, 0),
  (q_id, 'A', false, 0);

  -- Soal 3
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Ada 4 anak duduk melingkar: Dina, Reni, Sari, dan Tari. Tari persis berhadapan dengan Reni. Dina duduk di sebelah kanan Tari. Siapa yang duduk di sebelah kiri Sari?', 'TIU', 'Analitis', 'Analitis',
   'Tari berhadapan Reni. Dina di kanan Tari. Berarti posisi jarum jam: Tari, Dina, Reni, Sari. Berarti di sebelah kiri Sari (berlawanan jarum jam) adalah Reni.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Reni', true, 5),
  (q_id, 'Tari', false, 0),
  (q_id, 'Dina', false, 0),
  (q_id, 'Tidak ada, kursi kosong', false, 0),
  (q_id, 'Sari sendiri', false, 0);

  -- Soal 4
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('P adalah bilangan genap dan Q adalah bilangan ganjil. Manakah dari di bawah ini yang hasilnya PASTI merupakan bilangan ganjil?', 'TIU', 'Analitis', 'Analitis',
   'Genap + Ganjil = Ganjil. (misal: 2 + 3 = 5). Perkalian genap dgn apapun = genap.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'P + Q', true, 5),
  (q_id, 'P × Q', false, 0),
  (q_id, 'P + (2 × Q)', false, 0), -- Genap + Genap = Genap
  (q_id, '(P × P) + P', false, 0), -- Genap + Genap = Genap
  (q_id, 'P - P', false, 0);

  -- Soal 5
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Sebuah toko buka dari Senin hingga Sabtu. Barang K dikirim pada hari Selasa. Ada dua kiriman antara barang L dan M. Barang L dikirim sehari sebelum N. Jika M dikirim hari Senin, pada hari apakah L dikirim?', 'TIU', 'Analitis', 'Analitis',
   'M = Senin (1). M dan L diselingi 2 kiriman, berarti L di urutan ke-4 (Kamis). L dikirim sebelum N, N Jumat.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Kamis', true, 5),
  (q_id, 'Rabu', false, 0),
  (q_id, 'Jumat', false, 0),
  (q_id, 'Selasa', false, 0),
  (q_id, 'Sabtu', false, 0);

  -- Soal 6
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Buku Geografi lebih tebal dari Sosiologi. Buku Fisika lebih tipis dari Sosiologi. Buku Matematika lebih tebal dari Geografi. Buku apa yang paling tipis?', 'TIU', 'Analitis', 'Analitis',
   'Geo > Sosio. Sosio > Fisika. Mat > Geo. Urutan tebal: Mat > Geo > Sosio > Fisika. Paling tipis = Fisika.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Fisika', true, 5),
  (q_id, 'Sosiologi', false, 0),
  (q_id, 'Geografi', false, 0),
  (q_id, 'Matematika', false, 0),
  (q_id, 'Tidak dapat ditentukan', false, 0);

  -- Soal 7
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Enam mobil A, B, C, D, E, F diparkir sejajar. F tidak diparkir di ujung. E diparkir di antara A dan C. D diparkir bersebelahan dengan B dan A. Jika C ada di ujung paling kanan, mobil apa yang berada di ujung paling kiri?', 'TIU', 'Analitis', 'Analitis',
   'Susunan dari kiri ke kanan: C di no 6. E antara A dan C -> A(4), E(5), C(6). D bersebelahan B dan A -> B(2), D(3), A(4). Sisanya F di no 1. Tapi wait, F tidak di ujung. Berarti letaknya harus dibalik: B(1), D(2), A(3), E(4), C(5)... Wait, C (kanan). F tak di ujung berarti F harusnya 1? Tidak, F(2), B(1). B-F-D-A-E-C -> Tepat.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'B', true, 5),
  (q_id, 'F', false, 0),
  (q_id, 'A', false, 0),
  (q_id, 'D', false, 0),
  (q_id, 'Tidak bisa ditentukan', false, 0);

  -- Soal 8
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Agus lebih tinggi dari pada Bambang, dan lebih pendek dari pada Cici. Dodi lebih tinggi dari pada Cici dan Eko. Siapakah yang bisa BUKAN merupakan orang yang paling pendek?', 'TIU', 'Analitis', 'Analitis',
   'Susunan tinggi: D > C > A > B. Eko tingginya di bawah Dodi, tapi tidak tahu posisinya terhadap yang lain. Dodi jelas tertinggi, Cici & Agus di tengah. Yg bisa jadi terpendek: Bambang atau Eko. Yg dipastikan BUKAN paling pendek adalah Dodi, Cici, Agus. (Cici ada di opsi).') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Cici', true, 5),
  (q_id, 'Bambang', false, 0),
  (q_id, 'Eko', false, 0),
  (q_id, 'Bambang dan Eko', false, 0),
  (q_id, 'Semua salah', false, 0);

END $$;
