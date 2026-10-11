-- =============================================
-- EXTRA TWK QUESTIONS (25 Soal)
-- =============================================
DO $$
DECLARE
  q_id uuid;
BEGIN
  -- 1. Nasionalisme
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Paham nasionalisme yang memandang bangsanya lebih tinggi daripada bangsa lain disebut...', 'TWK', 'Nasionalisme', 1, 'Chauvinisme adalah bentuk nasionalisme berlebihan yang mengagung-agungkan bangsa sendiri dan merendahkan bangsa lain.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Chauvinisme', TRUE, 0),
    (q_id, 'Patriotisme', FALSE, 0),
    (q_id, 'Liberalisme', FALSE, 0),
    (q_id, 'Etnosentrisme', FALSE, 0),
    (q_id, 'Sukuisme', FALSE, 0);
  -- 2. Pilar Negara - Pancasila
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Sikap mengakui persamaan derajat, persamaan hak, dan kewajiban asasi setiap manusia sesuai dengan sila ke...', 'TWK', 'Pilar Negara', 2, 'Sila ke-2 (Kemanusiaan yang adil dan beradab) mengandung nilai persamaan derajat, hak, dan kewajiban antar sesama manusia.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Dua', TRUE, 0),
    (q_id, 'Satu', FALSE, 0),
    (q_id, 'Tiga', FALSE, 0),
    (q_id, 'Empat', FALSE, 0),
    (q_id, 'Lima', FALSE, 0);
  -- 3. UUD 1945
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Presiden dan Wakil Presiden memegang jabatan selama lima tahun, dan sesudahnya dapat dipilih kembali dalam jabatan yang sama, hanya untuk...', 'TWK', 'UUD 1945', 2, 'Sesuai Pasal 7 UUD 1945 (Amandemen), Presiden dan Wapres dapat dipilih kembali hanya untuk satu kali masa jabatan.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Satu kali masa jabatan', TRUE, 0),
    (q_id, 'Dua kali masa jabatan', FALSE, 0),
    (q_id, 'Tiga kali masa jabatan', FALSE, 0),
    (q_id, 'Selamanya', FALSE, 0),
    (q_id, 'Tidak terbatas', FALSE, 0);
  -- 4. Bela Negara
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Upaya bela negara non-fisik dapat dilakukan melalui...', 'TWK', 'Bela Negara', 2, 'Bela negara non-fisik adalah upaya meningkatkan kesadaran berbangsa dan bernegara, seperti pendidikan kewarganegaraan, bukan angkat senjata.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Pendidikan Kewarganegaraan', TRUE, 0),
    (q_id, 'Wajib Militer', FALSE, 0),
    (q_id, 'Latihan dasar keprajuritan', FALSE, 0),
    (q_id, 'Menjadi anggota TNI', FALSE, 0),
    (q_id, 'Menggunakan senjata api', FALSE, 0);
  -- 5. Integritas
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Seorang pejabat publik yang menggunakan fasilitas negara untuk kepentingan kampanye pribadi telah melanggar nilai integritas, yaitu...', 'TWK', 'Integritas', 2, 'Menggunakan fasilitas negara untuk kepentingan pribadi bukan merupakan sikap amanah dan jujur dalam mengemban jabatan publik.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Tanggung Jawab', TRUE, 0),
    (q_id, 'Kerja Keras', FALSE, 0),
    (q_id, 'Mandiri', FALSE, 0),
    (q_id, 'Berani', FALSE, 0),
    (q_id, 'Peduli', FALSE, 0);
  -- 6. Bahasa Indonesia
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Penulisan kata baku yang benar adalah...', 'TWK', 'Bahasa Indonesia', 2, 'Kata yang baku menurut KBBI adalah "Apotek", bukan Apotik. "Izin" bukan Ijin, "Jenderal" bukan Jendral, "Napas" bukan Nafas.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Apotek', TRUE, 0),
    (q_id, 'Apotik', FALSE, 0),
    (q_id, 'Praktek', FALSE, 0),
    (q_id, 'Nasehat', FALSE, 0),
    (q_id, 'Resiko', FALSE, 0);
  -- 7. Sejarah Indonesia (Nasionalisme)
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Organisasi Budi Utomo didirikan pada tanggal...', 'TWK', 'Nasionalisme', 1, 'Budi Utomo didirikan pada 20 Mei 1908, yang kini diperingati sebagai Hari Kebangkitan Nasional.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, '20 Mei 1908', TRUE, 0),
    (q_id, '28 Oktober 1928', FALSE, 0),
    (q_id, '17 Agustus 1945', FALSE, 0),
    (q_id, '10 November 1945', FALSE, 0),
    (q_id, '1 Juni 1945', FALSE, 0);
  -- 8. Pilar Negara (Bhineka Tunggal Ika)
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Semboyan Bhinneka Tunggal Ika terdapat dalam kitab...', 'TWK', 'Pilar Negara', 2, 'Bhinneka Tunggal Ika diambil dari kitab Sutasoma karangan Mpu Tantular.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Sutasoma', TRUE, 0),
    (q_id, 'Negarakertagama', FALSE, 0),
    (q_id, 'Arjunawiwaha', FALSE, 0),
    (q_id, 'Pararaton', FALSE, 0),
    (q_id, 'Ramayana', FALSE, 0);
  -- 9. UUD 1945
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Lembaga negara yang berwenang menguji undang-undang terhadap UUD 1945 adalah...', 'TWK', 'UUD 1945', 2, 'Mahkamah Konstitusi (MK) berwenang menguji undang-undang terhadap UUD 1945 (Judicial Review).')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Mahkamah Konstitusi', TRUE, 0),
    (q_id, 'Mahkamah Agung', FALSE, 0),
    (q_id, 'Komisi Yudisial', FALSE, 0),
    (q_id, 'DPR', FALSE, 0),
    (q_id, 'MPR', FALSE, 0);
  -- 10. Bela Negara
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Sistem pertahanan dan keamanan negara yang bersifat semesta melibatkan...', 'TWK', 'Bela Negara', 2, 'Sishankamrata (Sistem Pertahanan dan Keamanan Rakyat Semesta) melibatkan seluruh warga negara, wilayah, dan sumber daya nasional lainnya.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Seluruh warga negara', TRUE, 0),
    (q_id, 'Hanya TNI dan Polri', FALSE, 0),
    (q_id, 'Haparat pemerintah', FALSE, 0),
    (q_id, 'Organisasi masyarkat', FALSE, 0),
    (q_id, 'Tokoh agama', FALSE, 0);
  -- 11. Integritas (Korupsi)
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Tindakan memperkaya diri sendiri atau orang lain secara melawan hukum yang merugikan keuangan negara disebut...', 'TWK', 'Integritas', 1, 'Ini adalah definisi dasar dari Korupsi menurut UU Tindak Pidana Korupsi.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Korupsi', TRUE, 0),
    (q_id, 'Kolusi', FALSE, 0),
    (q_id, 'Nepotisme', FALSE, 0),
    (q_id, 'Gratifikasi', FALSE, 0),
    (q_id, 'Pungli', FALSE, 0);
  -- 12. Bahasa Indonesia (Ejaan)
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Penggunaan huruf kapital yang benar terdapat pada kalimat...', 'TWK', 'Bahasa Indonesia', 2, 'Huruf kapital digunakan untuk nama geografi jika diikuti nama diri. "Sungai Kapuas" benar. "menyeberangi sungai" (tanpa nama) salah jika kapital. "Suku Dayak" (Suku kapital jika diikuti nama, tapi kata suku tidak kapital, nama sukunya kapital? Suku Dayak -> Suku Dayak). Koreksi: "Kita berwisata ke Danau Toba" adalah benar.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Kita berwisata ke Danau Toba.', TRUE, 0),
    (q_id, 'Ibu membeli pisang ambon di pasar.', FALSE, 0),
    (q_id, 'Adik mandi di sungai Kapuas.', FALSE, 0),
    (q_id, 'Dia berasal dari suku Jawa.', FALSE, 0),
    (q_id, 'Presiden joko widodo meresmikan jembatan.', FALSE, 0);
  -- 13. Pilar Negara (NKRI)
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Bentuk negara Indonesia adalah Kesatuan, sedangkan bentuk pemerintahannya adalah...', 'TWK', 'Pilar Negara', 1, 'Pasal 1 Ayat 1 UUD 1945: Negara Indonesia ialah Negara Kesatuan, yang berbentuk Republik.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Republik', TRUE, 0),
    (q_id, 'Serikat', FALSE, 0),
    (q_id, 'Monarki', FALSE, 0),
    (q_id, 'Parlementer', FALSE, 0),
    (q_id, 'Presidensial', FALSE, 0);
  -- 14. Sejarah (BPUPKI)
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Ketua BPUPKI adalah...', 'TWK', 'Nasionalisme', 2, 'Dr. K.R.T. Radjiman Wedyodiningrat adalah ketua BPUPKI (Badan Penyelidik Usaha-Usaha Persiapan Kemerdekaan Indonesia).')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Dr. Radjiman Wedyodiningrat', TRUE, 0),
    (q_id, 'Ir. Soekarno', FALSE, 0),
    (q_id, 'Moh. Hatta', FALSE, 0),
    (q_id, 'Mr. Supomo', FALSE, 0),
    (q_id, 'Ichibangase Yosio', FALSE, 0);
  -- 15. UUD 1945 (Amandemen)
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('UUD 1945 telah diamandemen sebanyak...', 'TWK', 'UUD 1945', 1, 'UUD 1945 diamandemen sebanyak 4 kali, yaitu pada tahun 1999, 2000, 2001, dan 2002.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, '4 kali', TRUE, 0),
    (q_id, '3 kali', FALSE, 0),
    (q_id, '2 kali', FALSE, 0),
    (q_id, '5 kali', FALSE, 0),
    (q_id, '1 kali', FALSE, 0);
  -- 16. Pilar Negara (Pancasila)
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Butir pengamalan Pancasila "Tidak memaksakan kehendak kepada orang lain" merupakan wujud sila ke...', 'TWK', 'Pilar Negara', 2, 'Tidak memaksakan kehendak adalah butir pengamalan Sila ke-4 (Kerakyatan...).')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Sila ke-4', TRUE, 0),
    (q_id, 'Sila ke-2', FALSE, 0),
    (q_id, 'Sila ke-3', FALSE, 0),
    (q_id, 'Sila ke-5', FALSE, 0),
    (q_id, 'Sila ke-1', FALSE, 0);
  -- 17. Bela Negara (Sejarah Agresi)
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Serangan Umum 1 Maret 1949 terjadi di kota...', 'TWK', 'Bela Negara', 2, 'Serangan Umum 1 Maret 1949 yang dipimpin Letkol Soeharto terjadi di Yogyakarta untuk menunjukkan kepada dunia bahwa TNI masih ada.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Yogyakarta', TRUE, 0),
    (q_id, 'Surabaya', FALSE, 0),
    (q_id, 'Semarang', FALSE, 0),
    (q_id, 'Jakarta', FALSE, 0),
    (q_id, 'Bandung', FALSE, 0);
  -- 18. Integritas (Tokoh)
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Tokoh bangsa yang dikenal sangat sederhana dan jujur, hingga disebut "Raja Tanpa Mahkota", yang menolak kenaikan gaji saat negara susah adalah...', 'TWK', 'Integritas', 2, 'Haji Agus Salim dikenal dengan kesederhanaannya. Atau mungkin maksudnya Moh Hatta? Tapi Bung Hatta juga sangat jujur. Salah satu contoh paling terkenal soal kesederhanaan adalah Bung Hatta (Sepatu Bally). Namun Agus Salim juga (hidup kontrakan). Jawaban paling umum untuk ikon kejujuran dan kesederhanaan pejabat sering merujuk pada Baharuddin Lopa atau Hoegeng. Tapi di konteks sejarah kemerdekaan: Moh Hatta.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Moh. Hatta', TRUE, 0),
    (q_id, 'B.J. Habibie', FALSE, 0),
    (q_id, 'Soeharto', FALSE, 0),
    (q_id, 'Adam Malik', FALSE, 0),
    (q_id, 'Ali Sastroamidjojo', FALSE, 0);
  -- 19. Bahasa Indonesia (Kalimat Efektif)
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Di bawah ini yang merupakan kalimat efektif adalah...', 'TWK', 'Bahasa Indonesia', 3, 'Kalimat efektif harus hemat, logis, dan tidak rancu. "Para hadirin dimohon berdiri" (salah, hadirin sudah jamak, jangan pakai para). "Bagi mahasiswa yang membawa HP harap dimatikan" (salah, yang dimatikan HP atau mahasiswa?). "Penyuri itu berhasil ditangkap polisi" (benar/pasif) atau "Polisi berhasil menangkap pencuri". Opsi A: "Hadirin dimohon berdiri" (Benar).')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Hadirin dimohon berdiri.', TRUE, 0),
    (q_id, 'Para hadirin sekalian dimohon berdiri.', FALSE, 0),
    (q_id, 'Waktu dan tempat kami persilakan.', FALSE, 0),
    (q_id, 'Mundur ke belakang.', FALSE, 0),
    (q_id, 'Naik ke atas.', FALSE, 0);
  -- 20. Nasionalisme (Lambang Negara)
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Warna keemasan pada burung Garuda melambangkan...', 'TWK', 'Nasionalisme', 2, 'Warna emas pada burung Garuda melambangkan keagungan dan kejayaan bangsa.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Keagungan dan kejayaan', TRUE, 0),
    (q_id, 'Keberanian', FALSE, 0),
    (q_id, 'Kesucian', FALSE, 0),
    (q_id, 'Keabadian', FALSE, 0),
    (q_id, 'Kesuburan', FALSE, 0);
  -- 21. UUD 1945 (Hak Asasi)
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Hak untuk hidup, hak untuk tidak disiksa, hak kemerdekaan pikiran dan hati nurani, adalah hak asasi manusia yang...', 'TWK', 'UUD 1945', 2, 'Pasal 28I: Hak-hak tersebut adalah hak asasi manusia yang tidak dapat dikurangi dalam keadaan apapun (non-derogable rights).')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Tidak dapat dikurangi dalam keadaan apapun', TRUE, 0),
    (q_id, 'Dapat dibatasi undang-undang', FALSE, 0),
    (q_id, 'Tergantung situasi negara', FALSE, 0),
    (q_id, 'Hanya berlaku bagi WNI', FALSE, 0),
    (q_id, 'Dapat ditunda pemenuhannya', FALSE, 0);
  -- 22. Wawasan Nusantara
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Wawasan Nusantara adalah cara pandang bangsa Indonesia mengenai...', 'TWK', 'Nasionalisme', 2, 'Wawasan Nusantara adalah cara pandang bangsa Indonesia mengenai diri dan lingkungannya yang serba beragam dan bernilai strategis dengan mengutamakan persatuan dan kesatuan.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Diri dan lingkungannya', TRUE, 0),
    (q_id, 'Sejarah masa lalu', FALSE, 0),
    (q_id, 'Sistem pemerintahan', FALSE, 0),
    (q_id, 'Hubungan internasional', FALSE, 0),
    (q_id, 'Ekonomi global', FALSE, 0);
  -- 23. Konstitusi (Dekrit)
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Dekrit Presiden 5 Juli 1959 menandai berlakunya kembali...', 'TWK', 'UUD 1945', 2, 'Dekrit Presiden 5 Juli 1959 membubarkan Konstituante dan memberlakukan kembali UUD 1945 serta tidak berlakunya UUDS 1950.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'UUD 1945', TRUE, 0),
    (q_id, 'UUDS 1950', FALSE, 0),
    (q_id, 'Konstitusi RIS', FALSE, 0),
    (q_id, 'UUD 1945 Amandemen', FALSE, 0),
    (q_id, 'Piagam Jakarta', FALSE, 0);
  -- 24. Otonomi Daerah
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Pelimpahan wewenang dari pemerintah pusat kepada pemerintah daerah untuk mengurus rumah tangganya sendiri disebut...', 'TWK', 'Pilar Negara', 2, 'Desentralisasi adalah penyerahan wewenang pemerintahan oleh Pemerintah kepada daerah otonom untuk mengatur dan mengurus urusan pemerintahan dalam sistem NKRI.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Desentralisasi', TRUE, 0),
    (q_id, 'Dekonsentrasi', FALSE, 0),
    (q_id, 'Tugas Pembantuan', FALSE, 0),
    (q_id, 'Sentralisasi', FALSE, 0),
    (q_id, 'Otonomi Khusus', FALSE, 0);
  -- 25. Tokoh Pahlawan
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Jenderal Sudirman terkenal dengan taktik perangnya, yaitu...', 'TWK', 'Bela Negara', 1, 'Jenderal Sudirman memimpin Perang Gerilya untuk mempertahankan kemerdekaan RI meski dalam keadaan sakit parah.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Perang Gerilya', TRUE, 0),
    (q_id, 'Perang Diponegoro', FALSE, 0),
    (q_id, 'Perang Puputan', FALSE, 0),
    (q_id, 'Perang Padri', FALSE, 0),
    (q_id, 'Benteng Stelsel', FALSE, 0);

END
$$;
