-- CLEANUP (CAUTION: Deletes existing questions to prevent duplicates)
DELETE FROM test_answers;
DELETE FROM test_sessions;
DELETE FROM questions;
DELETE FROM options;

-- =============================================
-- 1. TWK (TES WAWASAN KEBANGSAAN) - 5 Soal
-- =============================================
DO $$
DECLARE
  q_id uuid;
BEGIN
  -- Q1: Nasionalisme
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('Sikap nasionalisme di lingkungan sekolah dapat ditunjukkan dengan cara...', 'TWK', 'Nasionalisme', 1, 
   'Memakai seragam sekolah dengan atribut lengkap merupakan wujud cinta tanah air, penghargaan terhadap identitas nasional, dan disiplin di lingkungan pendidikan.') 
  RETURNING id INTO q_id;
  
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Memakai seragam sekolah dengan atribut lengkap', true, 0),
  (q_id, 'Hanya berteman dengan yang satu suku', false, 0),
  (q_id, 'Menggunakan bahasa asing saat jam istirahat', false, 0),
  (q_id, 'Menolak mengikuti upacara bendera', false, 0),
  (q_id, 'Membeli produk impor untuk jajan', false, 0);

  -- Q2: Integritas
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('Seorang ASN yang menolak gratifikasi sedang menerapkan nilai integritas...', 'TWK', 'Integritas', 2,
   'Jujur adalah pondasi utama integritas. Menolak gratifikasi berarti berani bersikap jujur pada diri sendiri dan amanah, menolak keuntungan pribadi yang tidak sah.') 
  RETURNING id INTO q_id;
  
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Jujur', true, 0),
  (q_id, 'Disiplin', false, 0),
  (q_id, 'Tanggung Jawab', false, 0),
  (q_id, 'Kerja Keras', false, 0),
  (q_id, 'Peduli', false, 0);

  -- Q3: Bela Negara
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('Ancaman militer yang menggunakan kekuatan bersenjata terorganisir disebut...', 'TWK', 'Bela Negara', 2,
   'Agresi adalah penggunaan kekuatan bersenjata oleh negara lain terhadap kedaulatan negara, keutuhan wilayah, dan keselamatan segenap bangsa.') 
  RETURNING id INTO q_id;
  
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Agresi', true, 0),
  (q_id, 'Sabotase', false, 0),
  (q_id, 'Spionase', false, 0),
  (q_id, 'Terorisme', false, 0),
  (q_id, 'Pelanggaran Wilayah', false, 0);

  -- Q4: Pilar Negara (Pancasila)
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('Lambang sila ke-4 Pancasila adalah...', 'TWK', 'Pilar Negara', 1,
   'Kepala Banteng melambangkan Sila ke-4 (Kerakyatan yang dipimpin oleh hikmat kebijaksanaan dalam permusyawaratan perwakilan), yang mencerminkan hewan sosial yang suka berkumpul (musyawarah).') 
  RETURNING id INTO q_id;
  
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Kepala Banteng', true, 0),
  (q_id, 'Pohon Beringin', false, 0),
  (q_id, 'Bintang', false, 0),
  (q_id, 'Padi dan Kapas', false, 0),
  (q_id, 'Rantai', false, 0);

  -- Q5: UUD 1945
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('Pasal 1 Ayat 3 UUD 1945 menegaskan bahwa Indonesia adalah negara...', 'TWK', 'UUD 1945', 2,
   'Pasal 1 Ayat 3 UUD 1945 secara tegas berbunyi "Negara Indonesia adalah negara hukum". Ini berarti segala tatanan kehidupan berbangsa dilandasi oleh aturan hukum.') 
  RETURNING id INTO q_id;
  
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Hukum', true, 0),
  (q_id, 'Kesatuan', false, 0),
  (q_id, 'Republik', false, 0),
  (q_id, 'Demokrasi', false, 0),
  (q_id, 'Berkedaulatan Rakyat', false, 0);
END $$;

-- =============================================
-- 2. TIU (TES INTELEGENSI UMUM) - 5 Soal
-- =============================================
DO $$
DECLARE
  q_id uuid;
BEGIN
  -- Q1: Analogi
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('KAYU : MEJA = ... : ...', 'TIU', 'Analogi', 1,
   'Hubungan: BAHAN BAKU -> PRODUK JADI. Kayu diolah menjadi meja. Emas diolah menjadi Cincin. Pilihan lain salah (Kaca bagian dari jendela, Plastik bahan dari ember tapi urutan bisa terbalik, dll).') 
  RETURNING id INTO q_id;
  
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'EMAS : CINCIN', true, 0),
  (q_id, 'KACA : JENDELA', false, 0),
  (q_id, 'PLASTIK : EMBER', false, 0),
  (q_id, 'KARET : BAN', false, 0),
  (q_id, 'BESI : PAGAR', false, 0);

  -- Q2: Deret Angka
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('2, 5, 8, 11, ...', 'TIU', 'Deret Angka', 1,
   'Pola deret adalah penambahan 3 (+3) secara konsisten. 2(+3)=5, 5(+3)=8, 8(+3)=11. Maka selanjutnya 11 + 3 = 14.') 
  RETURNING id INTO q_id;
  
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, '14', true, 0),
  (q_id, '13', false, 0),
  (q_id, '15', false, 0),
  (q_id, '12', false, 0),
  (q_id, '16', false, 0);

  -- Q3: Silogisme
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('Semua mamalia bernapas dengan paru-paru. Paus adalah mamalia. Kesimpulannya...', 'TIU', 'Silogisme', 2,
   'Menggunakan Modus Ponens. \nPremis 1: Semua A adalah B.\nPremis 2: C adalah A.\nKesimpulan: C adalah B (Paus bernapas dengan paru-paru).') 
  RETURNING id INTO q_id;
  
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Paus bernapas dengan paru-paru', true, 0),
  (q_id, 'Paus bernapas dengan insang', false, 0),
  (q_id, 'Sebagian paus bernapas dengan paru-paru', false, 0),
  (q_id, 'Paus bukan mamalia', false, 0),
  (q_id, 'Tidak dapat ditarik kesimpulan', false, 0);

  -- Q4: Berhitung
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('Jika x = 1/16 dan y = 16%, maka...', 'TIU', 'Berhitung', 3,
   'Ubah ke desimal agar mudah dibandingkan.\nx = 1/16 = 0,0625\ny = 16% = 16/100 = 0,16\nJelas bahwa 0,0625 lebih kecil dari 0,16. Maka x < y.') 
  RETURNING id INTO q_id;
  
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'x < y', true, 0),
  (q_id, 'x > y', false, 0),
  (q_id, 'x = y', false, 0),
  (q_id, 'x = 2y', false, 0),
  (q_id, 'Hubungan x dan y tidak dapat ditentukan', false, 0);

  -- Q5: Antonim
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('Lawan kata dari SPORADIS adalah...', 'TIU', 'Verbal', 2,
   'Sporadis artinya kadang-kadang, tidak tentu, atau jarang-jarang. Lawan katanya adalah sesuatu yang terjadi terus-menerus atau kerap. Dari pilihan yang ada, SERING adalah lawan kata yang paling mendekati (Jarng vs Sering).') 
  RETURNING id INTO q_id;
  
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'SERING', true, 0),
  (q_id, 'JARANG', false, 0),
  (q_id, 'KADANG-KADANG', false, 0),
  (q_id, 'TERATUR', false, 0),
  (q_id, 'BERHENTI', false, 0);
END $$;

-- =============================================
-- 3. TKP (TES KARAKTERISTIK PRIBADI) - 5 Soal
-- =============================================
DO $$
DECLARE
  q_id uuid;
BEGIN
  -- Q1: Pelayanan Publik
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('Anda sedang melayani pelanggan yang sangat cerewet dan menuntut hal yang tidak sesuai aturan. Sikap Anda...', 'TKP', 'Pelayanan Publik', 2,
   'Dalam pelayanan publik, aspek kesabaran dan pengendalian diri sangat penting. Melayani sesuai SOP namun tetap ramah (tersenyum) adalah nilai tertinggi (5). Meninggalkan atau memarahi pelanggan adalah nilai terendah.') 
  RETURNING id INTO q_id;
  
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Tetap tersenyum dan menjelaskan aturan dengan sabar', false, 5),
  (q_id, 'Meminta teman lain untuk melayaninya', false, 4),
  (q_id, 'Mendengarkan saja tanpa merespon', false, 3),
  (q_id, 'Menegurnya agar tidak berisik', false, 2),
  (q_id, 'Meninggalkan pelanggan tersebut', false, 1);

  -- Q2: Profesionalisme
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('Atasan Anda memberikan tugas mendadak di luar jam kerja. Sikap Anda...', 'TKP', 'Profesionalisme', 2,
   'Profesionalisme diuji saat kondisi tidak nyaman. Mengerjakan tugas dengan sungguh-sungguh menunjukkan dedikasi total (5). Mengeluh atau menolak mengurangi nilai profesionalisme.') 
  RETURNING id INTO q_id;
  
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Mengerjakannya dengan sungguh-sungguh agar cepat selesai', false, 5),
  (q_id, 'Mengerjakan tapi sambil mengeluh', false, 4),
  (q_id, 'Menolak dengan halus karena sudah lelah', false, 3),
  (q_id, 'Pura-pura tidak membaca pesan', false, 2),
  (q_id, 'Marah kepada atasan', false, 1);

  -- Q3: Jejaring Kerja
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('Rekan kerja Anda mengalami kesulitan dalam menggunakan aplikasi kantor baru. Yang Anda lakukan...', 'TKP', 'Jejaring Kerja', 2,
   'Membangun jejaring kerja berarti saling membantu untuk kesuksesan bersama. Mengajarkan rekan kerja secara langsung adalah tindakan paling suportif (5).') 
  RETURNING id INTO q_id;
  
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Mengajarkannya cara menggunakan aplikasi tersebut', false, 5),
  (q_id, 'Menyarankan dia membaca buku manual', false, 4),
  (q_id, 'Membiarkannya belajar sendiri agar mandiri', false, 3),
  (q_id, 'Mengeluhkan kompetensinya kepada atasan', false, 2),
  (q_id, 'Mengerjakan pekerjaannya agar cepat beres', false, 1);

  -- Q4: TIK
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('Kantor menerapkan sistem absensi online baru. Sikap Anda...', 'TKP', 'Teknologi Informasi', 2,
   'Adaptabilitas terhadap teknologi (TIK) adalah kompetensi wajib ASN. Sikap antusias dan proaktif mempelajari sistem baru mendapat nilai tertinggi (5).') 
  RETURNING id INTO q_id;
  
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Mempelajari dan menggunakannya dengan antusias', false, 5),
  (q_id, 'Menggunakannya karena terpaksa aturan', false, 4),
  (q_id, 'Mengkritik sistem baru tersebut karena ribet', false, 3),
  (q_id, 'Tetap menggunakan absensi manual jika bisa', false, 2),
  (q_id, 'Meminta orang lain mengabsensikan', false, 1);

  -- Q5: Sosial Budaya
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('Tetangga baru Anda berasal dari suku yang berbeda dan mengadakan acara syukuran. Undangan diberikan kepada Anda. Sikap Anda...', 'TKP', 'Sosial Budaya', 2,
   'Kompetensi Sosial Budaya menekankan pada sikap toleransi dan keterbukaan. Hadir dan membaur menunjukkan penerimaan yang tulus terhadap keberagaman (5).') 
  RETURNING id INTO q_id;
  
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Datang dan membaur dengan tamu lain', false, 5),
  (q_id, 'Datang sebentar saja untuk menghormati', false, 4),
  (q_id, 'Titip salam saja karena malas', false, 3),
  (q_id, 'Menolak hadir dengan alasan sibuk', false, 2),
  (q_id, 'Merasa terganggu dengan acara tersebut', false, 1);

END $$;
