-- =============================================
-- Seed: TWK - Pilar Negara (12 Soal)
-- =============================================
DO $$
DECLARE
  q_id uuid;
BEGIN
  -- Soal 1
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Fungsi Pancasila sebagai pandangan hidup bangsa Indonesia berarti bahwa Pancasila difungsikan sebagai...', 'TWK', 'Pilar Negara', 'Pilar Negara',
   'Sebagai pandangan hidup (way of life), Pancasila dijadikan sebagai penunjuk arah dan pedoman tingkah laku dalam kehidupan sehari-hari masyarakat Indonesia.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Pedoman dalam mengatur tingkah laku masyarakat baik dalam kehidupan bermasyarakat maupun bernegara', true, 5),
  (q_id, 'Perjanjian luhur yang menyatukan bangsa Indonesia sejak proklamasi kemerdekaan', false, 0),
  (q_id, 'Sumber dari segala sumber hukum yang mengatur seluruh ketertiban negara', false, 0),
  (q_id, 'Dasar untuk menentukan bentuk serta sistem pemerintahan sentralisasi', false, 0),
  (q_id, 'Identitas yang membedakan dengan bangsa lain di forum pergaulan internasional', false, 0);

  -- Soal 2
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Sila kedua Pancasila, "Kemanusiaan yang Adil dan Beradab", dilambangkan oleh rantai emas. Rantai kotak dan rantai bulat melambangkan...', 'TWK', 'Pilar Negara', 'Pilar Negara',
   'Rantai kotak melambangkan laki-laki, dan rantai bulat melambangkan perempuan. Mereka saling berkait tanpa putus, menunjukkan hubungan kemanusiaan yang erat antarsesama tanpa diskriminasi.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Ikatan antara laki-laki dan perempuan yang saling membutuhkan dan bersatu', true, 5),
  (q_id, 'Hubungan timbal balik antara rakyat dan pemimpin negara', false, 0),
  (q_id, 'Keseimbangan antara keadilan sosial dan penegakan hukum', false, 0),
  (q_id, 'Ikatan persaudaraan dari Sabang sampai Merauke secara politis', false, 0),
  (q_id, 'Pedoman generasi tua kepada generasi muda yang tiada akhir', false, 0);

  -- Soal 3
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Berdasarkan UUD 1945 hasil amandemen, lembaga negara yang berwenang memberhentikan Presiden dan/atau Wakil Presiden dalam masa jabatannya adalah...', 'TWK', 'Pilar Negara', 'Pilar Negara',
   'MPR berwenang memberhentikan Presiden/Wapres (impeachment), namun hal tersebut berdasarkan putusan Mahkamah Konstitusi serta diajukan oleh DPR.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Majelis Permusyawaratan Rakyat (MPR)', true, 5),
  (q_id, 'Dewan Perwakilan Rakyat (DPR)', false, 0),
  (q_id, 'Mahkamah Konstitusi (MK)', false, 0),
  (q_id, 'Mahkamah Agung (MA)', false, 0),
  (q_id, 'Dewan Pertimbangan Agung (DPA)', false, 0);

  -- Soal 4
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Bentuk negara Kesatuan Republik Indonesia (NKRI) memiliki konsekuensi logis yakni pemerintahan tidak memberikan kedaulatan kepada daerah, melainkan hanya otonomi. Hal ini tertuang pada Pasal...', 'TWK', 'Pilar Negara', 'Pilar Negara',
   'Pasal 1 Ayat (1) UUD 1945 secara tegas menyatakan: Negara Indonesia ialah Negara Kesatuan, yang berbentuk Republik.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Pasal 1 Ayat (1) UUD 1945', true, 5),
  (q_id, 'Pasal 4 Ayat (1) UUD 1945', false, 0),
  (q_id, 'Pasal 18 Ayat (1) UUD 1945', false, 0),
  (q_id, 'Pasal 27 Ayat (1) UUD 1945', false, 0),
  (q_id, 'Pasal 33 Ayat (1) UUD 1945', false, 0);

  -- Soal 5
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Prinsip demokrasi di Indonesia bertumpu pada asas gotong royong dan penyelesaian masalah melalui musyawarah. Praktik ini secara langsung merupakan manifestasi dari nilai Pancasila ke...', 'TWK', 'Pilar Negara', 'Pilar Negara',
   'Sila ke-4 berbunyi: "Kerakyatan yang dipimpin oleh hikmat kebijaksanaan dalam permusyawaratan/perwakilan". Segala hal terkait demokrasi, voting, atau musyawarah masuk ranah Sila ke-4.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Keempat', true, 5),
  (q_id, 'Pertama', false, 0),
  (q_id, 'Kedua', false, 0),
  (q_id, 'Ketiga', false, 0),
  (q_id, 'Kelima', false, 0);

  -- Soal 6
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Piagam Jakarta (Jakarta Charter) yang dirumuskan pada tanggal 22 Juni 1945 menimbulkan perdebatan karena sila pertamanya. Tokoh penting yang datang kepada Bung Hatta menyampaikan keberatan dari tokoh wilayah Timur adalah...', 'TWK', 'Pilar Negara', 'Pilar Negara',
   'Seorang opsir Angkatan Laut Jepang menemui Moh. Hatta menyampaikan keberatan masyarakat Indonesia Timur atas frasa "dengan kewajiban menjalankan syariat Islam bagi pemeluk-pemeluknya".') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Seorang utusan opsir Angkatan Laut Kekaisaran Jepang (Kaigun)', true, 5),
  (q_id, 'Perwakilan pemimpin raja-raja dari wilayah Nusa Tenggara', false, 0),
  (q_id, 'Utusan resmi dari organisasi Kristen di Indonesia bagian timur', false, 0),
  (q_id, 'Sutan Syahrir mewakili sayap pemuda pergerakan nasional', false, 0),
  (q_id, 'Laksamana Maeda selaku penyedia tempat penyusunan naskah proklamasi', false, 0);

  -- Soal 7
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Sesuai dengan UUD 1945, kekuasaan negara terbagi (separation of power atau distribution of power). Pemegang kekuasaan yudikatif secara konstitusional dilaksanakan oleh...', 'TWK', 'Pilar Negara', 'Pilar Negara',
   'Berdasarkan Pasal 24, kekuasaan kehakiman (Yudikatif) dilakukan oleh sebuah Mahkamah Agung dan badan peradilan di bawahnya, serta oleh sebuah Mahkamah Konstitusi.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Mahkamah Agung dan Mahkamah Konstitusi', true, 5),
  (q_id, 'Majelis Permusyawaratan Rakyat dan Dewan Perwakilan Rakyat', false, 0),
  (q_id, 'Presiden bersama dengan Mahkamah Agung', false, 0),
  (q_id, 'Komisi Yudisial dan Dewan Perwakilan Daerah', false, 0),
  (q_id, 'Kejaksaan Agung bersama Mahkamah Konstitusi', false, 0);

  -- Soal 8
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Pasal 33 ayat (3) UUD 1945 berbunyi: "Bumi dan air dan kekayaan alam yang terkandung di dalamnya dikuasai oleh negara dan dipergunakan untuk sebesar-besar kemakmuran rakyat." Implementasi pasal ini sejalan dengan Pancasila sila ke-...', 'TWK', 'Pilar Negara', 'Pilar Negara',
   'Penguasaan oleh negara untuk kemakmuran rakyat secara merata adalah wujud konkret dari Keadilan Sosial bagi Seluruh Rakyat Indonesia.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Kelima', true, 5),
  (q_id, 'Kesatu', false, 0),
  (q_id, 'Kedua', false, 0),
  (q_id, 'Ketiga', false, 0),
  (q_id, 'Keempat', false, 0);

  -- Soal 9
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Sistem penyelenggaraan pemerintahan negara RI menganut asas otonomi daerah luas. Undang-undang mengenai otonomi daerah diderivasi langsung dari UUD 1945 Pasal...', 'TWK', 'Pilar Negara', 'Pilar Negara',
   'Pasal 18 UUD 1945 mengatur pembagian wilayah Indonesia beserta prinsip desentralisasi dan otonomi daerah.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Pasal 18', true, 5),
  (q_id, 'Pasal 27', false, 0),
  (q_id, 'Pasal 30', false, 0),
  (q_id, 'Pasal 32', false, 0),
  (q_id, 'Pasal 34', false, 0);

  -- Soal 10
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Dalam hierarki Peraturan Perundang-undangan di Indonesia menurut UU No. 12 Tahun 2011 (diperbarui), posisi Ketetapan MPR (TAP MPR) berada di bawah...', 'TWK', 'Pilar Negara', 'Pilar Negara',
   'Hierarki: UUD 1945 -> TAP MPR -> UU/Perppu -> PP -> Perpres -> Perda Provinsi -> Perda Kab/Kota.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Undang-Undang Dasar Negara Republik Indonesia Tahun 1945', true, 5),
  (q_id, 'Pancasila sebagai stat fundamental norm', false, 0),
  (q_id, 'Undang-Undang atau Peraturan Pemerintah Pengganti Undang-Undang', false, 0),
  (q_id, 'Peraturan Pemerintah RI', false, 0),
  (q_id, 'Peraturan Presiden', false, 0);

  -- Soal 11
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Seorang ASN harus bersikap netral dalam pemilihan umum dan tidak boleh berpihak karena aparatur sipal negara merupakan perwujudan dari alat pemersatu bangsa. Ini paling mengamalkan pilar...', 'TWK', 'Pilar Negara', 'Pilar Negara',
   'Netralitas demi menjaga persatuan bangsa dari perpecahan akibat politik praktis, adalah pengamalan semangat Bhinneka Tunggal Ika (persatuan) dan Sila Ke-3 Pancasila.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Pancasila sila Ketiga dan semboyan Bhinneka Tunggal Ika', true, 5),
  (q_id, 'Pancasila sila Kelima terkait asas keadilan', false, 0),
  (q_id, 'Pancasila sila Keempat terkait sistem demokrasi', false, 0),
  (q_id, 'UUD 1945 Pasal 28 kebebasan berpendapat', false, 0),
  (q_id, 'NKRI dalam mempertahankan wilayah demografi', false, 0);

  -- Soal 12
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Dalam konsep 4 Pilar Kebangsaan, apabila Negara Kesatuan Republik Indonesia (NKRI) diibaratkan sebagai bangunan, maka UUD 1945 berfungsi sebagai...', 'TWK', 'Pilar Negara', 'Pilar Negara',
   'Pancasila sebagai fondasi/dasar. NKRI sebagai bentuk bangunan. Bhinneka Tunggal Ika semboyan/hiasan pemersatu. Dan UUD 1945 sebagai tiang/struktur penyangga konistitusional (atau atap pelindung hukum).') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Tiang atau pilar struktural yang mengatur lalu lintas hukum', true, 5),
  (q_id, 'Batu fondasi terdalam tempat bangunan berdiri', false, 0),
  (q_id, 'Dinding pembatas yang menahan budaya asing', false, 0),
  (q_id, 'Halaman depan yang mencerminkan wajah bangunan', false, 0),
  (q_id, 'Akses pembuangan kotoran tata kelola negara', false, 0);

END $$;
