-- =============================================
-- Seed: TWK - Integritas (12 Soal)
-- =============================================
DO $$
DECLARE
  q_id uuid;
BEGIN
  -- Soal 1
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Nilai dasar antikorupsi yang paling utama sebagai bentuk perwujudan peduli terhadap perbuatan menyimpang adalah...', 'TWK', 'Integritas', 'Integritas',
   'Keberanian adalah nilai antikorupsi yang mendorong seseorang untuk berani melaporkan atau menentang perbuatan menyimpang.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Keberanian', true, 5),
  (q_id, 'Keadilan', false, 0),
  (q_id, 'Kedisiplinan', false, 0),
  (q_id, 'Kemandirian', false, 0),
  (q_id, 'Kegigihan', false, 0);

  -- Soal 2
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Konsep integritas bagi Aparatur Sipil Negara (ASN) secara etimologis maupun praktis mengandung makna...', 'TWK', 'Integritas', 'Integritas',
   'Integritas berarti keutuhan pribadi; keselarasan antara hati (niat), pikiran, ucapan, dan tindakan dalam menegakkan kebenaran.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Keselarasan antara hati, pikiran, ucapan, dan perbuatan', true, 5),
  (q_id, 'Kepatuhan mutlak terhadap setiap arahan atasan tanpa kecuali', false, 0),
  (q_id, 'Kemampuan menyelesaikan pekerjaan sebelum tenggat waktu', false, 0),
  (q_id, 'Kerelaan mengorbankan keluarga demi tugas negara setiap saat', false, 0),
  (q_id, 'Kecepatan melayani masyarakat meskipun harus melanggar SOP', false, 0);

  -- Soal 3
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Tokoh bangsa yang dikenal sangat sederhana, jujur, hingga sering disebut pejabat yang tidak pernah bisa membeli sepatu baru favoritnya karena kehabisan uang untuk keperluan negara adalah...', 'TWK', 'Integritas', 'Integritas',
   'Mohammad Hatta adalah tokoh yang sangat terkenal akan kesederhanaan dan integritasnya. Hingga akhir hayatnya, ia menyimpan guntingan iklan sepatu Bally yang belum terwujud ia beli.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Mohammad Hatta', true, 5),
  (q_id, 'Soekarno', false, 0),
  (q_id, 'Sutan Syahrir', false, 0),
  (q_id, 'Jenderal Sudirman', false, 0),
  (q_id, 'Agus Salim', false, 0);

  -- Soal 4
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Menerima parsel bingkisan hari raya dari pihak ketiga yang memiliki hubungan kerja dengan institusi merupakan bentuk pelanggaran integritas berupa...', 'TWK', 'Integritas', 'Integritas',
   'Pemberian bingkisan/hadiah kepada penyelenggara negara yang berhubungan dengan jabatannya termasuk dalam kategori gratifikasi.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Gratifikasi', true, 5),
  (q_id, 'Pungutan Liar (Pungli)', false, 0),
  (q_id, 'Suap menyuap', false, 0),
  (q_id, 'Pemerasan', false, 0),
  (q_id, 'Penggelapan barang', false, 0);

  -- Soal 5
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Ketika seorang ASN menolak menggunakan fasilitas kendaraan dinas operasional untuk pergi mudik lebaran, ia telah menerapkan nilai integritas yaitu...', 'TWK', 'Integritas', 'Integritas',
   'Tidak menggunakan fasilitas negara untuk kepentingan pribadi menunjukkan sikap memegang teguh aturan dan kejujuran dalam membedakan hak pribadi dan alat negara, yang identik dengan sikap tanggung jawab dan jujur.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Kejujuran dan Tanggung Jawab', true, 5),
  (q_id, 'Kemandirian dan Kepedulian', false, 0),
  (q_id, 'Keberanian dan Keadilan', false, 0),
  (q_id, 'Kerja Keras dan Disiplin', false, 0),
  (q_id, 'Kegigihan dan Ketekunan', false, 0);

  -- Soal 6
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Sejarah mencatat Baharuddin Lopa (Mantan Jaksa Agung) sebagai figur berintegritas karena pernah...', 'TWK', 'Integritas', 'Integritas',
   'Baharuddin Lopa dikenal sangat ketat, bahkan menolak sekecil apapun gratifikasi (termasuk bensin yang diisikan ke mobil dinasnya oleh pejabat lokal) dan mengembalikan/membayarnya.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Sangat menentang segala bentuk gratifikasi sekecil apapun termasuk isi bensin mobil dinas', true, 5),
  (q_id, 'Menjadi tokoh pertama yang mendirikan KPK', false, 0),
  (q_id, 'Mengingkari janji jabatannya demi melindungi rekan kerjanya yang difitnah', false, 0),
  (q_id, 'Menggratiskan layanan pengadilan bagi seluruh masyarakat miskin', false, 0),
  (q_id, 'Membuat sistem elektronik pengawasan jaksa terintegrasi pertama', false, 0);

  -- Soal 7
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Seseorang dengan integritas tinggi tidak akan membiarkan konflik kepentingan (conflict of interest) memengaruhi pekerjaannya. Di bawah ini yang merupakan contoh konflik kepentingan adalah...', 'TWK', 'Integritas', 'Integritas',
   'Konflik kepentingan terjadi ketika keputusan penyelenggara negara dipengaruhi oleh hubungan kekerabatan/kepentingan pribadi/bisnis (misal: anggota lelang menangkan saudara).') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Panitia pengadaan menunjuk perusahaan adik kandungnya sebagai pemenang lelang proyek', true, 5),
  (q_id, 'Pejabat yang merotasi pegawainya karena penurunan kinerja', false, 0),
  (q_id, 'Seorang guru memberikan nilai merah kepada siswanya yang malas meski tahu itu anak kepala dinas', false, 0),
  (q_id, 'Polisi menilang pengendara karena melanggar lalu lintas tanpa pandang bulu', false, 0),
  (q_id, 'Aparatur memeriksa ketelitian dokumen pengadaan secara berulang-ulang', false, 0);

  -- Soal 8
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Dalam sistem integritas nasional, peran Whistleblower System sangat penting karena...', 'TWK', 'Integritas', 'Integritas',
   'Whistleblower system menyediakan jalur aman atau rahasia bagi pegawai/masyarakat untuk melaporkan pelanggaran yang terjadi di internal instansi.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Memberikan saluran pelaporan yang aman bagi pelapor tindakan kejahatan kerah putih di lingkungannya', true, 5),
  (q_id, 'Memudahkan pencairan dana tunjangan kinerja bulanan', false, 0),
  (q_id, 'Menjadi dasar pemecatan otomatis bagi siapapun yang dilaporkan', false, 0),
  (q_id, 'Mengawasi kinerja pihak swasta dalam menjalankan roda ekonomi', false, 0),
  (q_id, 'Menggantikan peran inspektorat jenderal dan BPK seutuhnya', false, 0);

  -- Soal 9
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Salah satu langkah represif dalam penegakan integritas oleh negara melalui instrumen hukum adalah...', 'TWK', 'Integritas', 'Integritas',
   'Tindakan represif artinya penindakan setelah terjadi pelanggaran. Operasi Tangkap Tangan (OTT) dan penuntutan adalah contoh penegakan hukum represif.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Melaksanakan Operasi Tangkap Tangan (OTT) bagi oknum pejabat korup', true, 5),
  (q_id, 'Membangun kampanye antikorupsi di pedesaan', false, 0),
  (q_id, 'Memasukkan pendidikan antikorupsi ke kurikulum pendidikan', false, 0),
  (q_id, 'Mewajibkan pelaporan LHKPN secara berkala', false, 0),
  (q_id, 'Sertifikasi ahli pembangun integritas di setiap pemda', false, 0);

  -- Soal 10
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Bagi seorang ASN, dimensi integritas memiliki 3 komponen, yaitu core value, dimensi konseptual/nilai dasar, dan dimensi...",', 'TWK', 'Integritas', 'Integritas',
   'Dimensi integritas meliputi core values (keyakinan), konseptual (konsep turunan), dan dimensi Perilaku / Sikap, yang terlihat oleh orang lain (action).') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Perilaku secara nyata dalam bekerja', true, 5),
  (q_id, 'Wawasan terhadap masalah hukum politik', false, 0),
  (q_id, 'Orientasi pada kenaikan jabatan', false, 0),
  (q_id, 'Ketrampilan berbahasa birokrasi', false, 0),
  (q_id, 'Kebijakan kepemimpinan nasional', false, 0);

  -- Soal 11
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Integritas sering dihadapkan pada godaan lingkungan kerja (budaya permisif). Sikap mempertahankan integritas saat lingkungan sekitar melanggar sering disebut memiliki prinsip...', 'TWK', 'Integritas', 'Integritas',
   'Orang yang berintegritas tetap memegang kebenaran meski dia bertindak sendirian di tengah mayoritas yang keliru (prinsip berdiri teguh).') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Teguh pendirian atau independensi moral', true, 5),
  (q_id, 'Solidaritas buta terhadap atasan', false, 0),
  (q_id, 'Pragmatisme birokrasi', false, 0),
  (q_id, 'Kompromistis situasional', false, 0),
  (q_id, 'Fleksibilitas moral demi keharmonisan tim', false, 0);

  -- Soal 12
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Perbedaan esensial antara Suap dan Pemerasan adalah pada pihak yang berinisiatif. Pemerasan terjadi jika...', 'TWK', 'Integritas', 'Integritas',
   'Pemerasan terjadi ketika oknum penyelenggara negara/ASN memaksa atau meminta imbalan kepada warga secara paksa/mengancam untuk layanan yang seharusnya menjadi hak warga.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Penyelenggara negara mengancam atau memaksa secara sepihak meminta uang demi layanan', true, 5),
  (q_id, 'Pemberi memberi uang sebagai tanda terima kasih setelah layanan selesai tanpa diminta', false, 0),
  (q_id, 'Warga secara sukarela menawarkan uang di awal agar layanannya didahulukan', false, 0),
  (q_id, 'Pertukaran bingkisan antar instansi pemerintah', false, 0),
  (q_id, 'Kegiatan pungutan resmi berdasarkan peraturan daerah', false, 0);

END $$;
