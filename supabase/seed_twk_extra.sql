-- =============================================
-- EXTRA TWK QUESTIONS (25 Soal)
-- =============================================
DO $$
DECLARE
  q_id uuid;
BEGIN
  -- 1. Nasionalisme
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('Paham nasionalisme yang memandang bangsanya lebih tinggi daripada bangsa lain disebut...', 'TWK', 'Nasionalisme', 1, 
   'Chauvinisme adalah bentuk nasionalisme berlebihan yang mengagung-agungkan bangsa sendiri dan merendahkan bangsa lain.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Chauvinisme', true, 0),
  (q_id, 'Patriotisme', false, 0),
  (q_id, 'Liberalisme', false, 0),
  (q_id, 'Etnosentrisme', false, 0),
  (q_id, 'Sukuisme', false, 0);

  -- 2. Pilar Negara - Pancasila
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('Sikap mengakui persamaan derajat, persamaan hak, dan kewajiban asasi setiap manusia sesuai dengan sila ke...', 'TWK', 'Pilar Negara', 2, 
   'Sila ke-2 (Kemanusiaan yang adil dan beradab) mengandung nilai persamaan derajat, hak, dan kewajiban antar sesama manusia.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Dua', true, 0),
  (q_id, 'Satu', false, 0),
  (q_id, 'Tiga', false, 0),
  (q_id, 'Empat', false, 0),
  (q_id, 'Lima', false, 0);

  -- 3. UUD 1945
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('Presiden dan Wakil Presiden memegang jabatan selama lima tahun, dan sesudahnya dapat dipilih kembali dalam jabatan yang sama, hanya untuk...', 'TWK', 'UUD 1945', 2, 
   'Sesuai Pasal 7 UUD 1945 (Amandemen), Presiden dan Wapres dapat dipilih kembali hanya untuk satu kali masa jabatan.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Satu kali masa jabatan', true, 0),
  (q_id, 'Dua kali masa jabatan', false, 0),
  (q_id, 'Tiga kali masa jabatan', false, 0),
  (q_id, 'Selamanya', false, 0),
  (q_id, 'Tidak terbatas', false, 0);

  -- 4. Bela Negara
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('Upaya bela negara non-fisik dapat dilakukan melalui...', 'TWK', 'Bela Negara', 2, 
   'Bela negara non-fisik adalah upaya meningkatkan kesadaran berbangsa dan bernegara, seperti pendidikan kewarganegaraan, bukan angkat senjata.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Pendidikan Kewarganegaraan', true, 0),
  (q_id, 'Wajib Militer', false, 0),
  (q_id, 'Latihan dasar keprajuritan', false, 0),
  (q_id, 'Menjadi anggota TNI', false, 0),
  (q_id, 'Menggunakan senjata api', false, 0);

  -- 5. Integritas
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('Seorang pejabat publik yang menggunakan fasilitas negara untuk kepentingan kampanye pribadi telah melanggar nilai integritas, yaitu...', 'TWK', 'Integritas', 2, 
   'Menggunakan fasilitas negara untuk kepentingan pribadi bukan merupakan sikap amanah dan jujur dalam mengemban jabatan publik.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Tanggung Jawab', true, 0),
  (q_id, 'Kerja Keras', false, 0),
  (q_id, 'Mandiri', false, 0),
  (q_id, 'Berani', false, 0),
  (q_id, 'Peduli', false, 0);

  -- 6. Bahasa Indonesia
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('Penulisan kata baku yang benar adalah...', 'TWK', 'Bahasa Indonesia', 2, 
   'Kata yang baku menurut KBBI adalah "Apotek", bukan Apotik. "Izin" bukan Ijin, "Jenderal" bukan Jendral, "Napas" bukan Nafas.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Apotek', true, 0),
  (q_id, 'Apotik', false, 0),
  (q_id, 'Praktek', false, 0),
  (q_id, 'Nasehat', false, 0),
  (q_id, 'Resiko', false, 0);

  -- 7. Sejarah Indonesia (Nasionalisme)
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('Organisasi Budi Utomo didirikan pada tanggal...', 'TWK', 'Nasionalisme', 1, 
   'Budi Utomo didirikan pada 20 Mei 1908, yang kini diperingati sebagai Hari Kebangkitan Nasional.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, '20 Mei 1908', true, 0),
  (q_id, '28 Oktober 1928', false, 0),
  (q_id, '17 Agustus 1945', false, 0),
  (q_id, '10 November 1945', false, 0),
  (q_id, '1 Juni 1945', false, 0);

  -- 8. Pilar Negara (Bhineka Tunggal Ika)
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('Semboyan Bhinneka Tunggal Ika terdapat dalam kitab...', 'TWK', 'Pilar Negara', 2, 
   'Bhinneka Tunggal Ika diambil dari kitab Sutasoma karangan Mpu Tantular.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Sutasoma', true, 0),
  (q_id, 'Negarakertagama', false, 0),
  (q_id, 'Arjunawiwaha', false, 0),
  (q_id, 'Pararaton', false, 0),
  (q_id, 'Ramayana', false, 0);

  -- 9. UUD 1945
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('Lembaga negara yang berwenang menguji undang-undang terhadap UUD 1945 adalah...', 'TWK', 'UUD 1945', 2, 
   'Mahkamah Konstitusi (MK) berwenang menguji undang-undang terhadap UUD 1945 (Judicial Review).') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Mahkamah Konstitusi', true, 0),
  (q_id, 'Mahkamah Agung', false, 0),
  (q_id, 'Komisi Yudisial', false, 0),
  (q_id, 'DPR', false, 0),
  (q_id, 'MPR', false, 0);

  -- 10. Bela Negara
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('Sistem pertahanan dan keamanan negara yang bersifat semesta melibatkan...', 'TWK', 'Bela Negara', 2, 
   'Sishankamrata (Sistem Pertahanan dan Keamanan Rakyat Semesta) melibatkan seluruh warga negara, wilayah, dan sumber daya nasional lainnya.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Seluruh warga negara', true, 0),
  (q_id, 'Hanya TNI dan Polri', false, 0),
  (q_id, 'Haparat pemerintah', false, 0),
  (q_id, 'Organisasi masyarkat', false, 0),
  (q_id, 'Tokoh agama', false, 0);

  -- 11. Integritas (Korupsi)
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('Tindakan memperkaya diri sendiri atau orang lain secara melawan hukum yang merugikan keuangan negara disebut...', 'TWK', 'Integritas', 1, 
   'Ini adalah definisi dasar dari Korupsi menurut UU Tindak Pidana Korupsi.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Korupsi', true, 0),
  (q_id, 'Kolusi', false, 0),
  (q_id, 'Nepotisme', false, 0),
  (q_id, 'Gratifikasi', false, 0),
  (q_id, 'Pungli', false, 0);

  -- 12. Bahasa Indonesia (Ejaan)
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('Penggunaan huruf kapital yang benar terdapat pada kalimat...', 'TWK', 'Bahasa Indonesia', 2, 
   'Huruf kapital digunakan untuk nama geografi jika diikuti nama diri. "Sungai Kapuas" benar. "menyeberangi sungai" (tanpa nama) salah jika kapital. "Suku Dayak" (Suku kapital jika diikuti nama, tapi kata suku tidak kapital, nama sukunya kapital? Suku Dayak -> Suku Dayak). Koreksi: "Kita berwisata ke Danau Toba" adalah benar.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Kita berwisata ke Danau Toba.', true, 0),
  (q_id, 'Ibu membeli pisang ambon di pasar.', false, 0),
  (q_id, 'Adik mandi di sungai Kapuas.', false, 0),
  (q_id, 'Dia berasal dari suku Jawa.', false, 0),
  (q_id, 'Presiden joko widodo meresmikan jembatan.', false, 0);

  -- 13. Pilar Negara (NKRI)
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('Bentuk negara Indonesia adalah Kesatuan, sedangkan bentuk pemerintahannya adalah...', 'TWK', 'Pilar Negara', 1, 
   'Pasal 1 Ayat 1 UUD 1945: Negara Indonesia ialah Negara Kesatuan, yang berbentuk Republik.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Republik', true, 0),
  (q_id, 'Serikat', false, 0),
  (q_id, 'Monarki', false, 0),
  (q_id, 'Parlementer', false, 0),
  (q_id, 'Presidensial', false, 0);

  -- 14. Sejarah (BPUPKI)
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('Ketua BPUPKI adalah...', 'TWK', 'Nasionalisme', 2, 
   'Dr. K.R.T. Radjiman Wedyodiningrat adalah ketua BPUPKI (Badan Penyelidik Usaha-Usaha Persiapan Kemerdekaan Indonesia).') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Dr. Radjiman Wedyodiningrat', true, 0),
  (q_id, 'Ir. Soekarno', false, 0),
  (q_id, 'Moh. Hatta', false, 0),
  (q_id, 'Mr. Supomo', false, 0),
  (q_id, 'Ichibangase Yosio', false, 0);

  -- 15. UUD 1945 (Amandemen)
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('UUD 1945 telah diamandemen sebanyak...', 'TWK', 'UUD 1945', 1, 
   'UUD 1945 diamandemen sebanyak 4 kali, yaitu pada tahun 1999, 2000, 2001, dan 2002.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, '4 kali', true, 0),
  (q_id, '3 kali', false, 0),
  (q_id, '2 kali', false, 0),
  (q_id, '5 kali', false, 0),
  (q_id, '1 kali', false, 0);

  -- 16. Pilar Negara (Pancasila)
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('Butir pengamalan Pancasila "Tidak memaksakan kehendak kepada orang lain" merupakan wujud sila ke...', 'TWK', 'Pilar Negara', 2, 
   'Tidak memaksakan kehendak adalah butir pengamalan Sila ke-4 (Kerakyatan...).') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Sila ke-4', true, 0),
  (q_id, 'Sila ke-2', false, 0),
  (q_id, 'Sila ke-3', false, 0),
  (q_id, 'Sila ke-5', false, 0),
  (q_id, 'Sila ke-1', false, 0);

  -- 17. Bela Negara (Sejarah Agresi)
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('Serangan Umum 1 Maret 1949 terjadi di kota...', 'TWK', 'Bela Negara', 2, 
   'Serangan Umum 1 Maret 1949 yang dipimpin Letkol Soeharto terjadi di Yogyakarta untuk menunjukkan kepada dunia bahwa TNI masih ada.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Yogyakarta', true, 0),
  (q_id, 'Surabaya', false, 0),
  (q_id, 'Semarang', false, 0),
  (q_id, 'Jakarta', false, 0),
  (q_id, 'Bandung', false, 0);

  -- 18. Integritas (Tokoh)
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('Tokoh bangsa yang dikenal sangat sederhana dan jujur, hingga disebut "Raja Tanpa Mahkota", yang menolak kenaikan gaji saat negara susah adalah...', 'TWK', 'Integritas', 2, 
   'Haji Agus Salim dikenal dengan kesederhanaannya. Atau mungkin maksudnya Moh Hatta? Tapi Bung Hatta juga sangat jujur. Salah satu contoh paling terkenal soal kesederhanaan adalah Bung Hatta (Sepatu Bally). Namun Agus Salim juga (hidup kontrakan). Jawaban paling umum untuk ikon kejujuran dan kesederhanaan pejabat sering merujuk pada Baharuddin Lopa atau Hoegeng. Tapi di konteks sejarah kemerdekaan: Moh Hatta.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Moh. Hatta', true, 0),
  (q_id, 'B.J. Habibie', false, 0),
  (q_id, 'Soeharto', false, 0),
  (q_id, 'Adam Malik', false, 0),
  (q_id, 'Ali Sastroamidjojo', false, 0);

  -- 19. Bahasa Indonesia (Kalimat Efektif)
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('Di bawah ini yang merupakan kalimat efektif adalah...', 'TWK', 'Bahasa Indonesia', 3, 
   'Kalimat efektif harus hemat, logis, dan tidak rancu. "Para hadirin dimohon berdiri" (salah, hadirin sudah jamak, jangan pakai para). "Bagi mahasiswa yang membawa HP harap dimatikan" (salah, yang dimatikan HP atau mahasiswa?). "Penyuri itu berhasil ditangkap polisi" (benar/pasif) atau "Polisi berhasil menangkap pencuri". Opsi A: "Hadirin dimohon berdiri" (Benar).') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Hadirin dimohon berdiri.', true, 0),
  (q_id, 'Para hadirin sekalian dimohon berdiri.', false, 0),
  (q_id, 'Waktu dan tempat kami persilakan.', false, 0),
  (q_id, 'Mundur ke belakang.', false, 0),
  (q_id, 'Naik ke atas.', false, 0);

  -- 20. Nasionalisme (Lambang Negara)
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('Warna keemasan pada burung Garuda melambangkan...', 'TWK', 'Nasionalisme', 2, 
   'Warna emas pada burung Garuda melambangkan keagungan dan kejayaan bangsa.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Keagungan dan kejayaan', true, 0),
  (q_id, 'Keberanian', false, 0),
  (q_id, 'Kesucian', false, 0),
  (q_id, 'Keabadian', false, 0),
  (q_id, 'Kesuburan', false, 0);

  -- 21. UUD 1945 (Hak Asasi)
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('Hak untuk hidup, hak untuk tidak disiksa, hak kemerdekaan pikiran dan hati nurani, adalah hak asasi manusia yang...', 'TWK', 'UUD 1945', 2, 
   'Pasal 28I: Hak-hak tersebut adalah hak asasi manusia yang tidak dapat dikurangi dalam keadaan apapun (non-derogable rights).') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Tidak dapat dikurangi dalam keadaan apapun', true, 0),
  (q_id, 'Dapat dibatasi undang-undang', false, 0),
  (q_id, 'Tergantung situasi negara', false, 0),
  (q_id, 'Hanya berlaku bagi WNI', false, 0),
  (q_id, 'Dapat ditunda pemenuhannya', false, 0);

  -- 22. Wawasan Nusantara
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('Wawasan Nusantara adalah cara pandang bangsa Indonesia mengenai...', 'TWK', 'Nasionalisme', 2, 
   'Wawasan Nusantara adalah cara pandang bangsa Indonesia mengenai diri dan lingkungannya yang serba beragam dan bernilai strategis dengan mengutamakan persatuan dan kesatuan.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Diri dan lingkungannya', true, 0),
  (q_id, 'Sejarah masa lalu', false, 0),
  (q_id, 'Sistem pemerintahan', false, 0),
  (q_id, 'Hubungan internasional', false, 0),
  (q_id, 'Ekonomi global', false, 0);

  -- 23. Konstitusi (Dekrit)
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('Dekrit Presiden 5 Juli 1959 menandai berlakunya kembali...', 'TWK', 'UUD 1945', 2, 
   'Dekrit Presiden 5 Juli 1959 membubarkan Konstituante dan memberlakukan kembali UUD 1945 serta tidak berlakunya UUDS 1950.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'UUD 1945', true, 0),
  (q_id, 'UUDS 1950', false, 0),
  (q_id, 'Konstitusi RIS', false, 0),
  (q_id, 'UUD 1945 Amandemen', false, 0),
  (q_id, 'Piagam Jakarta', false, 0);

  -- 24. Otonomi Daerah
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('Pelimpahan wewenang dari pemerintah pusat kepada pemerintah daerah untuk mengurus rumah tangganya sendiri disebut...', 'TWK', 'Pilar Negara', 2, 
   'Desentralisasi adalah penyerahan wewenang pemerintahan oleh Pemerintah kepada daerah otonom untuk mengatur dan mengurus urusan pemerintahan dalam sistem NKRI.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Desentralisasi', true, 0),
  (q_id, 'Dekonsentrasi', false, 0),
  (q_id, 'Tugas Pembantuan', false, 0),
  (q_id, 'Sentralisasi', false, 0),
  (q_id, 'Otonomi Khusus', false, 0);

  -- 25. Tokoh Pahlawan
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('Jenderal Sudirman terkenal dengan taktik perangnya, yaitu...', 'TWK', 'Bela Negara', 1, 
   'Jenderal Sudirman memimpin Perang Gerilya untuk mempertahankan kemerdekaan RI meski dalam keadaan sakit parah.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Perang Gerilya', true, 0),
  (q_id, 'Perang Diponegoro', false, 0),
  (q_id, 'Perang Puputan', false, 0),
  (q_id, 'Perang Padri', false, 0),
  (q_id, 'Benteng Stelsel', false, 0);

END $$;
