-- =============================================
-- Seed: TWK - Bahasa Negara (12 Soal)
-- =============================================
DO $$
DECLARE
  q_id uuid;
BEGIN
  -- Soal 1
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Fungsi bahasa Indonesia sebagai bahasa resmi kenegaraan dibuktikan dengan peristiwa historis terpenting yakni...', 'TWK', 'Bahasa Negara', 'Bahasa Negara', 'Bahasa Indonesia diresmikan sebagai bahasa negara pasca proklamasi kemerdekaan, seiring dengan disahkannya UUD 1945 (Bab XV Pasal 36) pada tanggal 18 Agustus 1945. Namun, praktik penggunaannya dalam naskah kenegaraan pertama adalah teks Proklamasi Kemerdekaan.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Penggunaannya dalam penulisan naskah teks Proklamasi dan Konstitusi', TRUE, 5),
    (q_id, 'Pidato kenegaraan Soekarno saat menyampaikan gagasan Pancasila', FALSE, 0),
    (q_id, 'Pembacaan Ikrar Sumpah Pemuda 1928', FALSE, 0),
    (q_id, 'Penandatanganan Perjanjian Linggarjati dengan Belanda', FALSE, 0),
    (q_id, 'Terbitnya koran pertama berbahasa Melayu di Batavia', FALSE, 0);
  -- Soal 2
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Penulisan kata baku yang benar menurut Pedoman Umum Ejaan Bahasa Indonesia (PUEBI) adalah...', 'TWK', 'Bahasa Negara', 'Bahasa Negara', 'Penulisan baku yang tepat adalah: apotek (bukan apotik), sistem (bukan sistim), praktik (bukan praktek), risiko (bukan resiko), standardisasi (bukan standarisasi).')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Risiko, apotek, sistem, praktik', TRUE, 5),
    (q_id, 'Resiko, apotik, sistim, praktek', FALSE, 0),
    (q_id, 'Resiko, apotek, sistem, praktik', FALSE, 0),
    (q_id, 'Risiko, apotik, sistim, praktik', FALSE, 0),
    (q_id, 'Riska, apoteker, sistimatik, praktikum', FALSE, 0);
  -- Soal 3
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Di bawah ini yang merupakan kalimat efektif dan gramatikal adalah...', 'TWK', 'Bahasa Negara', 'Bahasa Negara', 'Kalimat efektif harus hemat kata, logis, dan tidak rancu. "Kepada Bapak Kepala Sekolah, kami persilakan" sering salah ditulis "Waktu dan tempat kami persilakan" (tidak logis).')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Bapak Kepala Sekolah, kami persilakan untuk memberikan sambutan.', TRUE, 5),
    (q_id, 'Waktu dan tempat, kami persilakan kepada Bapak Kepala Sekolah.', FALSE, 0),
    (q_id, 'Bagi mahasiswa yang belum membayar SPP tidak diperbolehkan ikut ujian.', FALSE, 0),
    (q_id, 'Ia sangat suka sekali makan nasi goreng pedas.', FALSE, 0),
    (q_id, 'Tugas ini mengharuskan kita agar supaya bekerja sama dengan baik.', FALSE, 0);
  -- Soal 4
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Penulisan nama dan gelar akademik yang sesuai dengan kaidah bahasa Indonesia adalah...', 'TWK', 'Bahasa Negara', 'Bahasa Negara', 'Singkatan nama gelar ditulis di belakang nama, diawali koma, singkatan gelarnya pakai titik. Misal: Prof. Dr. Andi Budi, S.H., M.H.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Prof. Dr. Antonius Budianto, S.E., M.Si.', TRUE, 5),
    (q_id, 'Prof. Dr. Antonius Budianto. S.E, M.Si', FALSE, 0),
    (q_id, 'Prof Dr Antonius Budianto, SE, MSi', FALSE, 0),
    (q_id, 'Prof, Dr, Antonius Budianto, S.E. M.Si', FALSE, 0),
    (q_id, 'Prof Dr. Antonius Budianto SE., M.Si.', FALSE, 0);
  -- Soal 5
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Kedudukan Bahasa Indonesia sebagai bahasa nasional dibuktikan dengan penggunaannya sebagai...', 'TWK', 'Bahasa Negara', 'Bahasa Negara', 'Sebagai bahasa nasional (berdasarkan Sumpah Pemuda 1928), Bahasa Indonesia berfungsi sebagai alat komunikasi pemersatu antar suku bangsa yang memiliki bahasa ibu berlainan.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Alat pemersatu berbagai masyarakat yang memiliki latar belakang bahasa dan budaya berbeda', TRUE, 5),
    (q_id, 'Bahasa pengantar wajib saat menjalin kerja sama sidang-sidang PBB', FALSE, 0),
    (q_id, 'Bahasa pengganti seluruh bahasa daerah yang dianggap sudah uzur', FALSE, 0),
    (q_id, 'Alat komunikasi khusus elit politik pada masa kolonial Belanda', FALSE, 0),
    (q_id, 'Bahasa sekunder setelah penggunaan bahasa internasional', FALSE, 0);
  -- Soal 6
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Penggunaan huruf kapital yang tepat terdapat pada kalimat...', 'TWK', 'Bahasa Negara', 'Bahasa Negara', 'Geografi ditulis kapital jika diikuti nama geografinya (Selat Sunda, Gunung Rinjani). Sedang jika bukan nama diri tidak kapital (mandi di sungai). "Pisang Ambon" ambon tidak kapital karena nama jenis.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Kapal feri tersebut berlayar mengarungi Selat Sunda.', TRUE, 5),
    (q_id, 'Ibu berbelanja gula Jawa dan pisang Ambon di pasar.', FALSE, 0),
    (q_id, 'Dia baru saja diangkat menjadi Gubernur di provinsi ini.', FALSE, 0),
    (q_id, 'Kami berjalan-jalan menyusuri Sungai yang airnya mengalir deras.', FALSE, 0),
    (q_id, 'Upacara diselenggarakan setiap datangnya hari Kemerdekaan.', FALSE, 0);
  -- Soal 7
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Berdasarkan Undang-Undang Nomor 24 Tahun 2009, Bahasa Indonesia diwajibkan untuk digunakan dalam dokumen-dokumen resmi. Salah satu contoh pelanggaran terhadap undang-undang ini dalam ranah bisnis adalah...', 'TWK', 'Bahasa Negara', 'Bahasa Negara', 'Gedung, perumahan, produk, dan kontrak bisnis (terutama perusahaan berbadan hukum Indonesia) wajib menggunakan bahasa Indonesia, atau minimal bilingual dengan porsi b.Indonesia diutamakan.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Menerbitkan surat perjanjian (kontrak) kerja dengan pihak lokal hanya menggunakan bahasa asing sepenuhnya', TRUE, 5),
    (q_id, 'Menggunakan bahasa Melayu Kuno untuk nama jalan di cagar budaya', FALSE, 0),
    (q_id, 'Menyelipkan istilah asing yang sudah ada padanannya ke dalam rapat internal divisi', FALSE, 0),
    (q_id, 'Berkomunikasi memakai bahasa isyarat untuk disabilitas pendaftaran', FALSE, 0),
    (q_id, 'Berbicara aksen asing dalam pidato kenegaraan di luar negeri', FALSE, 0);
  -- Soal 8
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Pemakaian tanda koma (,) yang tepat terdapat dalam kalimat...', 'TWK', 'Bahasa Negara', 'Bahasa Negara', 'Koma memisahkan anak kalimat yang mendahului induk kalimat. Atau merinci unsur lebih dari dua (Rini, Roni, dan Rendi).')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Karena sedih, ia menangis di kamarnya seharian penuh.', TRUE, 5),
    (q_id, 'Ia bernyanyi dengan keras, padahal sedang berada di perpustakaan', FALSE, 0),
    (q_id, 'Ibu membeli sayur, beras dan minyak goreng di warung.', FALSE, 0),
    (q_id, 'Mobil itu berwarna merah, yang melaju sangat cepat', FALSE, 0),
    (q_id, 'Anak itu tidak mau tidur siang, karena ingin bermain hujan.', FALSE, 0);
  -- Soal 9
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Kata serapan sering digunakan untuk memperkaya bahasa Indonesia. Aturan penyerapan yang sesuai kaidah jika kata tersebut berasal dari istilah asing "system" dan "frequency" adalah...', 'TWK', 'Bahasa Negara', 'Bahasa Negara', 'Penyerapan sistem ejaan (y->i). System -> sistem. Frequency (q->k, cy->si) -> frekuensi.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Sistem dan Frekuensi', TRUE, 5),
    (q_id, 'Sistim dan Frekwensi', FALSE, 0),
    (q_id, 'Sistem dan Frequensi', FALSE, 0),
    (q_id, 'Sistym dan frekuensi', FALSE, 0),
    (q_id, 'System dan Frekuensi', FALSE, 0);
  -- Soal 10
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Tujuan pemerintah Indonesia menetapkan Uji Kemahiran Berbahasa Indonesia (UKBI) terutama bagi tenaga kerja asing yang akan bekerja di Indonesia dalah wujud penguatan bahasa dalam bidang...', 'TWK', 'Bahasa Negara', 'Bahasa Negara', 'UKBI bagi warga asing adalah alat diplomasi budaya dan pelindungan kedaulatan bangsa (dalam arti menjaga agar WNA yang bekerja di RI bisa tunduk/komunikasi dengan pedoman lokal/hukum nasional).')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Sosial budaya dan kedaulatan negara (soft diplomacy)', TRUE, 5),
    (q_id, 'Pendapatan asli negara dari pajak ujian', FALSE, 0),
    (q_id, 'Mendiskriminasi pekerja asing di bursa tenaga kerja', FALSE, 0),
    (q_id, 'Strategi militer intelijen menghalau mata-mata', FALSE, 0),
    (q_id, 'Kepatuhan terhadap regulasi dari organisasi buruh dunia', FALSE, 0);
  -- Soal 11
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Dalam penulisan surat dinas, bentuk penulisan tanggal yang paling baku dan benar adalah...', 'TWK', 'Bahasa Negara', 'Bahasa Negara', 'Dalam surat dinas (yang menggunakan kop surat ber-kota tujuan/kop log), tanggal tidak perlu disebut lagi nama kotanya, atau jika disebut: Jakarta, 17 Agustus 1945.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, '14 Februari 2024 (jika kop ada nama tempat/kota) atau Jakarta, 14 Februari 2024', TRUE, 5),
    (q_id, '14 Feb 2024', FALSE, 0),
    (q_id, '14-02-2024', FALSE, 0),
    (q_id, 'Tgl. 14 Februari Tahun 2024', FALSE, 0),
    (q_id, 'Jakarta, 14-02-2024', FALSE, 0);
  -- Soal 12
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Pemakaian huruf miring (italics) menurut tata bahasa baku bahasa Indonesia digunakan untuk hal-hal berikut, KECUALI...', 'TWK', 'Bahasa Negara', 'Bahasa Negara', 'Huruf miring dipakai untuk: Judul buku, nama majalah/koran, istilah asing/daerah, menegaskan huruf/kata. Untuk mengutip percakapan lisan/pidato, digunakan tanda petik ("...").')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Menuliskan kutipan langsung dari pernyataan lisan seorang tokoh', TRUE, 5),
    (q_id, 'Menuliskan judul buku yang dikutip dalam tulisan', FALSE, 0),
    (q_id, 'Menuliskan kata atau ungkapan asing yang belum diserap', FALSE, 0),
    (q_id, 'Menuliskan istilah bahasa daerah', FALSE, 0),
    (q_id, 'Menegaskan atau mengkhususkan suatu huruf, bagian kata, atau kata', FALSE, 0);

END
$$;
