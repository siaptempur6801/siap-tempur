-- =============================================
-- Seed: TWK - Pilar Negara (12 Soal)
-- =============================================
DO $$
DECLARE
  q_id uuid;
BEGIN
  -- Soal 1
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Fungsi Pancasila sebagai pandangan hidup bangsa Indonesia berarti bahwa Pancasila difungsikan sebagai...', 'TWK', 'Pilar Negara', 'Pilar Negara', 'Sebagai pandangan hidup (way of life), Pancasila dijadikan sebagai penunjuk arah dan pedoman tingkah laku dalam kehidupan sehari-hari masyarakat Indonesia.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Pedoman dalam mengatur tingkah laku masyarakat baik dalam kehidupan bermasyarakat maupun bernegara', TRUE, 5),
    (q_id, 'Perjanjian luhur yang menyatukan bangsa Indonesia sejak proklamasi kemerdekaan', FALSE, 0),
    (q_id, 'Sumber dari segala sumber hukum yang mengatur seluruh ketertiban negara', FALSE, 0),
    (q_id, 'Dasar untuk menentukan bentuk serta sistem pemerintahan sentralisasi', FALSE, 0),
    (q_id, 'Identitas yang membedakan dengan bangsa lain di forum pergaulan internasional', FALSE, 0);
  -- Soal 2
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Sila kedua Pancasila, "Kemanusiaan yang Adil dan Beradab", dilambangkan oleh rantai emas. Rantai kotak dan rantai bulat melambangkan...', 'TWK', 'Pilar Negara', 'Pilar Negara', 'Rantai kotak melambangkan laki-laki, dan rantai bulat melambangkan perempuan. Mereka saling berkait tanpa putus, menunjukkan hubungan kemanusiaan yang erat antarsesama tanpa diskriminasi.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Ikatan antara laki-laki dan perempuan yang saling membutuhkan dan bersatu', TRUE, 5),
    (q_id, 'Hubungan timbal balik antara rakyat dan pemimpin negara', FALSE, 0),
    (q_id, 'Keseimbangan antara keadilan sosial dan penegakan hukum', FALSE, 0),
    (q_id, 'Ikatan persaudaraan dari Sabang sampai Merauke secara politis', FALSE, 0),
    (q_id, 'Pedoman generasi tua kepada generasi muda yang tiada akhir', FALSE, 0);
  -- Soal 3
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Berdasarkan UUD 1945 hasil amandemen, lembaga negara yang berwenang memberhentikan Presiden dan/atau Wakil Presiden dalam masa jabatannya adalah...', 'TWK', 'Pilar Negara', 'Pilar Negara', 'MPR berwenang memberhentikan Presiden/Wapres (impeachment), namun hal tersebut berdasarkan putusan Mahkamah Konstitusi serta diajukan oleh DPR.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Majelis Permusyawaratan Rakyat (MPR)', TRUE, 5),
    (q_id, 'Dewan Perwakilan Rakyat (DPR)', FALSE, 0),
    (q_id, 'Mahkamah Konstitusi (MK)', FALSE, 0),
    (q_id, 'Mahkamah Agung (MA)', FALSE, 0),
    (q_id, 'Dewan Pertimbangan Agung (DPA)', FALSE, 0);
  -- Soal 4
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Bentuk negara Kesatuan Republik Indonesia (NKRI) memiliki konsekuensi logis yakni pemerintahan tidak memberikan kedaulatan kepada daerah, melainkan hanya otonomi. Hal ini tertuang pada Pasal...', 'TWK', 'Pilar Negara', 'Pilar Negara', 'Pasal 1 Ayat (1) UUD 1945 secara tegas menyatakan: Negara Indonesia ialah Negara Kesatuan, yang berbentuk Republik.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Pasal 1 Ayat (1) UUD 1945', TRUE, 5),
    (q_id, 'Pasal 4 Ayat (1) UUD 1945', FALSE, 0),
    (q_id, 'Pasal 18 Ayat (1) UUD 1945', FALSE, 0),
    (q_id, 'Pasal 27 Ayat (1) UUD 1945', FALSE, 0),
    (q_id, 'Pasal 33 Ayat (1) UUD 1945', FALSE, 0);
  -- Soal 5
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Prinsip demokrasi di Indonesia bertumpu pada asas gotong royong dan penyelesaian masalah melalui musyawarah. Praktik ini secara langsung merupakan manifestasi dari nilai Pancasila ke...', 'TWK', 'Pilar Negara', 'Pilar Negara', 'Sila ke-4 berbunyi: "Kerakyatan yang dipimpin oleh hikmat kebijaksanaan dalam permusyawaratan/perwakilan". Segala hal terkait demokrasi, voting, atau musyawarah masuk ranah Sila ke-4.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Keempat', TRUE, 5),
    (q_id, 'Pertama', FALSE, 0),
    (q_id, 'Kedua', FALSE, 0),
    (q_id, 'Ketiga', FALSE, 0),
    (q_id, 'Kelima', FALSE, 0);
  -- Soal 6
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Piagam Jakarta (Jakarta Charter) yang dirumuskan pada tanggal 22 Juni 1945 menimbulkan perdebatan karena sila pertamanya. Tokoh penting yang datang kepada Bung Hatta menyampaikan keberatan dari tokoh wilayah Timur adalah...', 'TWK', 'Pilar Negara', 'Pilar Negara', 'Seorang opsir Angkatan Laut Jepang menemui Moh. Hatta menyampaikan keberatan masyarakat Indonesia Timur atas frasa "dengan kewajiban menjalankan syariat Islam bagi pemeluk-pemeluknya".')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Seorang utusan opsir Angkatan Laut Kekaisaran Jepang (Kaigun)', TRUE, 5),
    (q_id, 'Perwakilan pemimpin raja-raja dari wilayah Nusa Tenggara', FALSE, 0),
    (q_id, 'Utusan resmi dari organisasi Kristen di Indonesia bagian timur', FALSE, 0),
    (q_id, 'Sutan Syahrir mewakili sayap pemuda pergerakan nasional', FALSE, 0),
    (q_id, 'Laksamana Maeda selaku penyedia tempat penyusunan naskah proklamasi', FALSE, 0);
  -- Soal 7
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Sesuai dengan UUD 1945, kekuasaan negara terbagi (separation of power atau distribution of power). Pemegang kekuasaan yudikatif secara konstitusional dilaksanakan oleh...', 'TWK', 'Pilar Negara', 'Pilar Negara', 'Berdasarkan Pasal 24, kekuasaan kehakiman (Yudikatif) dilakukan oleh sebuah Mahkamah Agung dan badan peradilan di bawahnya, serta oleh sebuah Mahkamah Konstitusi.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Mahkamah Agung dan Mahkamah Konstitusi', TRUE, 5),
    (q_id, 'Majelis Permusyawaratan Rakyat dan Dewan Perwakilan Rakyat', FALSE, 0),
    (q_id, 'Presiden bersama dengan Mahkamah Agung', FALSE, 0),
    (q_id, 'Komisi Yudisial dan Dewan Perwakilan Daerah', FALSE, 0),
    (q_id, 'Kejaksaan Agung bersama Mahkamah Konstitusi', FALSE, 0);
  -- Soal 8
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Pasal 33 ayat (3) UUD 1945 berbunyi: "Bumi dan air dan kekayaan alam yang terkandung di dalamnya dikuasai oleh negara dan dipergunakan untuk sebesar-besar kemakmuran rakyat." Implementasi pasal ini sejalan dengan Pancasila sila ke-...', 'TWK', 'Pilar Negara', 'Pilar Negara', 'Penguasaan oleh negara untuk kemakmuran rakyat secara merata adalah wujud konkret dari Keadilan Sosial bagi Seluruh Rakyat Indonesia.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Kelima', TRUE, 5),
    (q_id, 'Kesatu', FALSE, 0),
    (q_id, 'Kedua', FALSE, 0),
    (q_id, 'Ketiga', FALSE, 0),
    (q_id, 'Keempat', FALSE, 0);
  -- Soal 9
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Sistem penyelenggaraan pemerintahan negara RI menganut asas otonomi daerah luas. Undang-undang mengenai otonomi daerah diderivasi langsung dari UUD 1945 Pasal...', 'TWK', 'Pilar Negara', 'Pilar Negara', 'Pasal 18 UUD 1945 mengatur pembagian wilayah Indonesia beserta prinsip desentralisasi dan otonomi daerah.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Pasal 18', TRUE, 5),
    (q_id, 'Pasal 27', FALSE, 0),
    (q_id, 'Pasal 30', FALSE, 0),
    (q_id, 'Pasal 32', FALSE, 0),
    (q_id, 'Pasal 34', FALSE, 0);
  -- Soal 10
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Dalam hierarki Peraturan Perundang-undangan di Indonesia menurut UU No. 12 Tahun 2011 (diperbarui), posisi Ketetapan MPR (TAP MPR) berada di bawah...', 'TWK', 'Pilar Negara', 'Pilar Negara', 'Hierarki: UUD 1945 -> TAP MPR -> UU/Perppu -> PP -> Perpres -> Perda Provinsi -> Perda Kab/Kota.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Undang-Undang Dasar Negara Republik Indonesia Tahun 1945', TRUE, 5),
    (q_id, 'Pancasila sebagai stat fundamental norm', FALSE, 0),
    (q_id, 'Undang-Undang atau Peraturan Pemerintah Pengganti Undang-Undang', FALSE, 0),
    (q_id, 'Peraturan Pemerintah RI', FALSE, 0),
    (q_id, 'Peraturan Presiden', FALSE, 0);
  -- Soal 11
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Seorang ASN harus bersikap netral dalam pemilihan umum dan tidak boleh berpihak karena aparatur sipal negara merupakan perwujudan dari alat pemersatu bangsa. Ini paling mengamalkan pilar...', 'TWK', 'Pilar Negara', 'Pilar Negara', 'Netralitas demi menjaga persatuan bangsa dari perpecahan akibat politik praktis, adalah pengamalan semangat Bhinneka Tunggal Ika (persatuan) dan Sila Ke-3 Pancasila.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Pancasila sila Ketiga dan semboyan Bhinneka Tunggal Ika', TRUE, 5),
    (q_id, 'Pancasila sila Kelima terkait asas keadilan', FALSE, 0),
    (q_id, 'Pancasila sila Keempat terkait sistem demokrasi', FALSE, 0),
    (q_id, 'UUD 1945 Pasal 28 kebebasan berpendapat', FALSE, 0),
    (q_id, 'NKRI dalam mempertahankan wilayah demografi', FALSE, 0);
  -- Soal 12
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Dalam konsep 4 Pilar Kebangsaan, apabila Negara Kesatuan Republik Indonesia (NKRI) diibaratkan sebagai bangunan, maka UUD 1945 berfungsi sebagai...', 'TWK', 'Pilar Negara', 'Pilar Negara', 'Pancasila sebagai fondasi/dasar. NKRI sebagai bentuk bangunan. Bhinneka Tunggal Ika semboyan/hiasan pemersatu. Dan UUD 1945 sebagai tiang/struktur penyangga konistitusional (atau atap pelindung hukum).')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Tiang atau pilar struktural yang mengatur lalu lintas hukum', TRUE, 5),
    (q_id, 'Batu fondasi terdalam tempat bangunan berdiri', FALSE, 0),
    (q_id, 'Dinding pembatas yang menahan budaya asing', FALSE, 0),
    (q_id, 'Halaman depan yang mencerminkan wajah bangunan', FALSE, 0),
    (q_id, 'Akses pembuangan kotoran tata kelola negara', FALSE, 0);

END
$$;
