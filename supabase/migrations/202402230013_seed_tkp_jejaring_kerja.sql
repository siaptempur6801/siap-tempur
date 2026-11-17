-- =============================================
-- Seed: TKP - Jejaring Kerja (16 Soal)
-- =============================================
DO $$
DECLARE
  q_id uuid;
BEGIN
  -- Soal 1
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Anda sering ditugaskan di acara dinas lintas instansi yang dihadiri oleh ASN dari kementerian dan pemerintah daerah lain. Apa yang biasanya Anda lakukan di sela-sela acara tersebut?', 'TKP', 'Jejaring Kerja', 'Jejaring Kerja', 'Jejaring Kerja: Membangun relasi profesional secara aktif untuk mendukung kolaborasi tugas di masa depan.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Berinisiatif memperkenalkan diri, bertukar kontak, dan berdiskusi seputar pekerjaan serta inovasi dari instansinya', TRUE, 5),
    (q_id, 'Mencoba mengobrol ringan dengan pegawai dari instansi lain jika kebetulan duduk bersebelahan atau berhadapan', FALSE, 4),
    (q_id, 'Bersosialisasi secukupnya dengan rekan dari instansi lain, namun lebih sering berkumpul dengan rekan sekantor', FALSE, 3),
    (q_id, 'Hanya berbicara ketika disapa terlebih dahulu karena saya lebih mementingkan mengikuti jalannya inti materi acara', FALSE, 2),
    (q_id, 'Fokus saja pada agenda utama acara dan menghabiskan waktu istirahat secara pribadi untuk memulihkan energi', FALSE, 1);
  -- Soal 2
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Instansi Anda membentuk tim khusus gabungan dari beberapa direktorat untuk sebuah proyek nasional. Dalam rapat perdana, suasana sangat pasif dan canggung karena anggota tim belum saling mengenal. Tindakan Anda...', 'TKP', 'Jejaring Kerja', 'Jejaring Kerja', 'Jejaring Kerja: Menjadi inisiator/ice breaker dalam pergaulan tim untuk mempercepat kekompakan kerja.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Mengambil inisiatif untuk memperkenalkan diri terlebih dahulu, kemudian melempar humor ringan untuk mencairkan suasana', TRUE, 5),
    (q_id, 'Mengusulkan ketua rapat untuk memulai sesi perkenalan singkat terlebih dahulu agar anggota lebih saling mengenal', FALSE, 4),
    (q_id, 'Menunggu orang lain mulai berbicara atau menunggu pimpinan rapat menyuruh masing-masing anggota berkenalan', FALSE, 3),
    (q_id, 'Menyapa orang di sebelah saya secara personal agar tidak terlihat kaku, lalu menunggu arahan rapat', FALSE, 2),
    (q_id, 'Fokus saja mencatat dokumen draft proyek karena kecanggungan sosial niscaya akan hilang seiring berjalannya proyek', FALSE, 1);
  -- Soal 3
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Rekan kerja dari divisi lain secara konsisten membantu tim Anda memberikan validasi data lebih cepat dari tenggat waktunya. Hal ini sangat mendukung kinerja tim Anda. Sikap Anda?', 'TKP', 'Jejaring Kerja', 'Jejaring Kerja', 'Jejaring Kerja: Menjaga relasi yang baik dengan apresiasi dan siap melakukan bantuan balik (timbal balik profesional).')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Mendatanginya untuk mengucapkan terima kasih secara personal dan berkomitmen siap membantu divisi mereka jika dibutuhkan', TRUE, 5),
    (q_id, 'Memberikan traktir makan siang sebagai bentuk apresiasi serta menjaga silaturahmi agar kerja sama tetap langgeng', FALSE, 4),
    (q_id, 'Mengirimkan pesan singkat atau email ucapan terima kasih karena bantuan mereka sangat berarti secara birokrasi', FALSE, 3),
    (q_id, 'Menganggap itu memang sudah menjadi tugas dari divisi mereka dan mencatat performa mereka yang bagus di laporan', FALSE, 2),
    (q_id, 'Membiarkan saja karena mereka pasti hanya bekerja untuk memenuhi Key Performance Indicator (KPI) divisinya sendiri', FALSE, 1);
  -- Soal 4
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Di dalam organisasi yang baru Anda masuki, terdapat dua kelompok pegawai yang sering berbeda pandangan secara tajam. Anda adalah pegawai baru yang netral. Sikap Anda...', 'TKP', 'Jejaring Kerja', 'Jejaring Kerja', 'Jejaring Kerja: Bersikap menjaga keharmonisan organisasi, tak memihak pada konflik tak sehat, tapi menyatukan energi untuk tujuan kerja.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Menjalin hubungan baik dan komunikasi konstruktif dengan kedua belah kelompok semata-mata demi kelancaran tugas organisasi', TRUE, 5),
    (q_id, 'Fokus mendengarkan pandangan dari kedua kelompok secara pasif untuk mengetahui letak masalahnya tanpa ikut campur', FALSE, 4),
    (q_id, 'Berusaha mendamaikan kedua kelompok dengan mengusulkan perbincangan informal di luar jam kantor saat ada waktu luang', FALSE, 3),
    (q_id, 'Menghindari untuk terlibat diskusi dengan kedua kelompok tersebut demi melindungi diri dari sentimen internal', FALSE, 2),
    (q_id, 'Bergabung dengan kelompok yang memiliki visi paling logis menurut rasionalitas pekerjaan tanpa peduli pandangan mayoritas', FALSE, 1);
  -- Soal 5
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Sebuah perusahaan swasta mengundang institusi Anda dalam forum seminar teknologi terbaru. Namun pimpinan Anda berhalangan hadir dan mendelegasikannya kepada Anda, padahal Anda aslinya introvert. Apa yang Anda lakukan?', 'TKP', 'Jejaring Kerja', 'Jejaring Kerja', 'Jejaring Kerja: Mengoptimalkan kesempatan untuk memperluas networking demi manfaat dan nama baik instansi meskipun ada rintangan sifat pribadi.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Melawan rasa canggung, hadir membawa nama instansi secara profesional, serta aktif berdiskusi menjalin kemitraan baru', TRUE, 5),
    (q_id, 'Mempersiapkan materi dengan matang sehingga saat ditanya saya bisa menjawab dengan otoritas sebagai wakil instansi', FALSE, 4),
    (q_id, 'Menghadiri acara tersebut untuk mencatat hasil seminarnya dengan baik agar dapat saya laporkan kepada pimpinan', FALSE, 3),
    (q_id, 'Pergi ke acara tersebut namun sebisa mungkin menghindar dari sesi networking sosial yang panjang', FALSE, 2),
    (q_id, 'Meminta atasan agar mendelegasikan kepada rekan lain yang lebih pandai berbicara dan bersosialisasi di depan publik', FALSE, 1);
  -- Soal 6
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Kerja sama tim dalam pengerjaan dokumen negara sering terhambat karena ada satu anggota yang sangat senior dan enggan menyelaraskan format dengan sistem digital baru. Sikap Anda sebagai ketua tim?', 'TKP', 'Jejaring Kerja', 'Jejaring Kerja', 'Jejaring Kerja/Kolaborasi: Menjalin pendekatan interpersonal (diplomatis dan menghargai) demi mengajak senior beradaptasi.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Melakukan pendekatan personal secara kekeluargaan, mengajarinya perlahan mengenai sistem digital dengan tetap menghormatinya', TRUE, 5),
    (q_id, 'Meminta rekan lain yang lebih sepadan umur untuk membujuk senior tersebut agar mau memakai format digital terbaru', FALSE, 4),
    (q_id, 'Memberikan kompromi bahwa ia dapat memakai cara lama, nanti saya/staf lain yang akan memindahkannya ke sistem digital', FALSE, 3),
    (q_id, 'Mengingatkan beliau dengan tegas dalam rapat tim tentang kewajiban semua pegawai untuk patuh pada sistem instruksi baru', FALSE, 2),
    (q_id, 'Melaporkan keengganan kerjanya kepada bagian HRD karena itu akan terus menghambat kecepatan penyelesaian tugas tim', FALSE, 1);
  -- Soal 7
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Sebuah LSM yang kritis terhadap instansi Anda meminta pertemuan dialog dengan unit kerja Anda. Sikap kelompok Anda sebaiknya adalah...', 'TKP', 'Jejaring Kerja', 'Jejaring Kerja', 'Jejaring Kerja: Terbuka pada seluruh stakeholders (termasuk yang kritis) demi membangun jejaring komunikasi yang positif dan perbaikan.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Menerima mereka dengan tangan terbuka, siap untuk berdialog mendengarkan kritik, serta menjelaskan posisi dengan data akurat', TRUE, 5),
    (q_id, 'Menerima dan menjadwalkan pertemuan formal dengan perwakilan mereka saja, didampingi staf legal dan humas instansi', FALSE, 4),
    (q_id, 'Menyetujui pertemuan secara pasif namun bersikap hati-hati dalam memberikan informasi selama acara tatap muka', FALSE, 3),
    (q_id, 'Menolak pertemuan tatap muka tetapi meminta mereka mensubmit kritik dan keluhan secara tertulis melalui kotak saran', FALSE, 2),
    (q_id, 'Menolak permintaan pertemuan karena kekritisan mereka lebih sering berujung mengganggu jadwal operasional pekerja', FALSE, 1);
  -- Soal 8
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Anda memiliki teman kuliah yang kebetulan kini memegang posisi strategis di instansi pusat yang berhubungan dengan kucuran dana APBN daerah Anda. Anda dimintai tolong atasan untuk mencari pelicin informasi. Sikap Anda?', 'TKP', 'Jejaring Kerja', 'Jejaring Kerja', 'Jejaring Kerja & Profesionalisme: Relasi tidak boleh digunakan untuk nepotisme / KKN atau hal menyimpang birokrasi yang sah.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Memanfaatkan relasi persahabatan tersebut HANYA untuk berkoordinasi dan mencari informasi teknis jalur resmi dengan profesional', TRUE, 5),
    (q_id, 'Berkomunikasi dengannya, memberitahu bahwa daerah Anda sedang butuh kucuran tanpa memintanya langsung untuk diistimewakan', FALSE, 4),
    (q_id, 'Meminta atasan menugaskan orang lain saja guna menjaga independensi dan menghindari tudingan buruk akan pertemanan kita', FALSE, 3),
    (q_id, 'Mencoba merayunya secara halus demi memperoleh informasi orang dalam agar daerah Anda lebih diuntungkan oleh anggaran', FALSE, 2),
    (q_id, 'Menggunakan kedekatan personal agar proses proposal daerah saya diluluskan lebih cepat dibanding dari daerah pesaing lainnya', FALSE, 1);
  -- Soal 9
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Anda baru ditugaskan ke cabang wilayah baru. Di sana Anda melihat antar-rekan pegawai jarang mengobrol dan sibuk dengan gadget di jam istirahat. Untuk membangun jejaring internal, yang Anda lakukan?', 'TKP', 'Jejaring Kerja', 'Jejaring Kerja', 'Jejaring Kerja: Inisiatif proaktif merangkul orang (bridging relationship) di situasi diam.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Menyapa lebih dahulu, membawa cemilan ringan, dan memancing percakapan santai di ruang pantry saat jam istirahat', TRUE, 5),
    (q_id, 'Memulai diskusi mengenai tugas kantor terlebih dahulu dengan rekan terdekat agar pelan-pelan menjurus ke obrolan personal', FALSE, 4),
    (q_id, 'Mengucapkan salam ramah saat masuk dan pulang kantor saja dan membiarkan mereka karena menghargai privacy istirahat', FALSE, 3),
    (q_id, 'Menyesuaikan diri dan ikut sibuk memainkan gadget selama jam istirahat guna menghindari suasana kikuk', FALSE, 2),
    (q_id, 'Mengkritik gaya individualistis mereka dan memaksa pimpinan rutin rapat evaluasi di jam istirahat meja bundar', FALSE, 1);
  -- Soal 10
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Dalam pelaksanaan program bantuan sosial, data yang dipegang kantor Anda berbeda dengan data dari kementerian pusat. Untuk menyelesaikan disparitas data, maka Anda...', 'TKP', 'Jejaring Kerja', 'Jejaring Kerja', 'Jejaring Kerja: Mengedepankan integrasi kerja, cross-checking lembaga, dan dialog solutif.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Menginisiasi rapat koordinasi lanjutan dengan instansi pusaat dan pihak desa untuk mensinkronkan data di lapangan kembali', TRUE, 5),
    (q_id, 'Melakukan verifikasi data internal instansi sendiri lalu melaporkannya dalam bentuk nota dinas yang lengkap ke pusat', FALSE, 4),
    (q_id, 'Berpendapat bahwa data dari kantor yang langsung di daerah pasti lebih valid, sehingga menggunakan data internal saja', FALSE, 3),
    (q_id, 'Menyerahkan keputusan sepenuhnya kepada arahan dari kementerian pusat demi meredakan potensi konflik vertikal', FALSE, 2),
    (q_id, 'Mengembalikan anggaran bansos tersebut dan menunda pelaksanaannya sampai seluruh masalah pendataan ini kelar', FALSE, 1);
  -- Soal 11
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Seorang vendor IT rekanan pemerintah dari proyek tahun lalu menghubungi Anda untuk mengajak ngopi dan "berbagi cerita". Proyek tender berikutnya kebetulan di bulan depan. Anda akan...', 'TKP', 'Jejaring Kerja', 'Jejaring Kerja', 'Jejaring Kerja / Integritas: Membina jejaring kerja secara etis, memutus potensi konflik kepentingan dan intervensi tender.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Menolaknya dengan halus dan sopan guna menjaga objektivitas dan integritas institusi saat masa persiapan tender berlangsung', TRUE, 5),
    (q_id, 'Menerima ajakannya dengan syarat tegas bahwa pembicaraan sama sekali tidak boleh menyinggung terkait pengadaan tender proyek', FALSE, 4),
    (q_id, 'Menerima ajakan ngopi, asalkan ia juga mengundang pimpinan saya agar pertemuan bersifat adil, formal, dan diketahui instansi', FALSE, 3),
    (q_id, 'Menolaknya sembari mengatakan saya tidak memiliki kuasa di panitia tender seandainya ia ingin melobi proyek-proyek tertentu', FALSE, 2),
    (q_id, 'Menerima saja karena dari perbincangan itu mungkin saya akan mendapat info bisnis lain yang berguna untuk jejaring karir pribadi', FALSE, 1);
  -- Soal 12
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Tim kepanitiaan acara Peringatan Hari Pahlawan dari instansi Anda membutuhkan kontribusi pengusaha lokal untuk mengisi booth acara rakyat. Anda ditugaskan menggaet pendaftar pengusaha UMKM. Anda...', 'TKP', 'Jejaring Kerja', 'Jejaring Kerja', 'Jejaring Kerja: Kemampuan membangun kolaborasi dari pihak swasta/bawah dan merangkul (persuasi).')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Berkoordinasi dengan komunitas/paguyuban UMKM lokal, menawarkan benefit dari acara ini sehingga saling menguntungkan dua peran', TRUE, 5),
    (q_id, 'Membuat surat edaran undangan fisik maupun digital lalu mengirimkannya kepada deretan perusahaan lewat balai daerah desa', FALSE, 4),
    (q_id, 'Memanfaatkan media sosial untuk open recruitment UMKM dan mencantumkan persyaratan administrasinya dengan jelas dan terbuka', FALSE, 3),
    (q_id, 'Hanya menghubungi kenalan vendor katering biasa untuk menjaga efisiensi karena kepanitiaan harus fokus menyukseskan inti acara', FALSE, 2),
    (q_id, 'Menunggu hingga para pelaku UMKM sendiri yang mendaftar dan memohon izin karena ini adalah pesta kemerdekaan milik bersama', FALSE, 1);
  -- Soal 13
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Rekan satu bagian selalu saja mencuri ide program kerja yang Anda sampaikan pada obrolan informal, lalu mengklaimnya dalam rapat atasan bagai gagasannya sendiri. Demi menjaga relasi seksi namun tak mau dirugikan, Anda...', 'TKP', 'Jejaring Kerja', 'Jejaring Kerja', 'Jejaring Kerja: Assertive and professional. Mengamankan reputasi profesional tanpa merusak relasi dalam tim terbuka.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Menegurnya baik-baik secara privat dan selanjutnya hanya memaparkan ide di dalam forum resmi guna menunjukkan kepemilikan gagasan', TRUE, 5),
    (q_id, 'Kini selalu mendokumentasikan gagasan dalam nota konsep untuk langsung dikirim ke atasan, sebelum menceritakan idenya ke rekan', FALSE, 4),
    (q_id, 'Dalam rapat, setiap ia menjelaskan ide curian itu saya menimpali dengan elaborasi detil untuk membuktikan saya inisiator orisinalnya', FALSE, 3),
    (q_id, 'Kecewa berat lalu mendiamkannya secara mutlak dalam perbincangan kerja, serta bersumpah tak membagi masukan penting di sekitar dia', FALSE, 2),
    (q_id, 'Melaporkan sifat buruk rekan tersebut secara frontal kepada manajemen SDM lantaran telah bertindak mencuri kredibilitas intelektual', FALSE, 1);
  -- Soal 14
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Pegawai junior yang baru bergabung kurang luwes bergabung dalam candaan tim dan terlihat sendirian mengerjakan laporan sepanjang waktu. Anda sebagai atap mentor/seniornya...', 'TKP', 'Jejaring Kerja', 'Jejaring Kerja', 'Jejaring Kerja: Mengembangkan SDM orang lain / mentoring, sehingga mereka mampu menjadi part integral organisasi.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Meluangkan waktu lebih untuk mendekatinya, memandu pekerjaannya dan mengajaknya ngobrol santai perkenalan dengan anggota satu tim', TRUE, 5),
    (q_id, 'Sering melibatkan dia dalam proyek tim berpasangan dengan orang berbeda supaya ia terbiasa adaptasi dengan suhu ritme organisasi', FALSE, 4),
    (q_id, 'Menegurnya dalam rapat tertutup supaya dia bisa lebih ramah, luwes, dan bisa menyesuaikan pergerakan agar tak merusak dinamika grup', FALSE, 3),
    (q_id, 'Menganggap itu sebagai proses penjajakannya sendiri dan percaya ia akan belajar melebur ke dalam tim ini lambat tapi secara alamiah', FALSE, 2),
    (q_id, 'Menghargai watak pendiam kepribadian introvertnya selama dia masih menyelesaikan pekerjaannya tepat deadline untuk perusahaan', FALSE, 1);
  -- Soal 15
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Atasan baru saja memberikan teguran keras atas sebuah presentasi buruk hasil buah tangan gabungan tim Anda dan tim lain. Karena hal ini, kedua tim mulai saling menyalahkan satu sama lain (blame game). Anda akan...', 'TKP', 'Jejaring Kerja', 'Jejaring Kerja', 'Jejaring Kerja: Resolusi konflik demi harmoni organisasi. Fokus pada penyelesaian masalah, bukan saling tuduh.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Menghentikan sifat saling salahkan dengan meredakan emosi, lalu memprakarsai evaluasi konstruktif bersama menentukan akar perbaikan', TRUE, 5),
    (q_id, 'Menjadi penengah netral antara dua tim, kemudian memaparkan porsi kesalahan secara adil guna mempercepat pengerjaan revisi ini', FALSE, 4),
    (q_id, 'Bertanggung jawab menanggung kesalahan presentasi tersebut secara moril demi meredam silang sengketa dan mencegah kemarahan fatal pimpinan', FALSE, 3),
    (q_id, 'Membedah pembagian tupoksi ulang secara tertulis lantas menempelkannya di email agar tim lain sadar secara gamblang tupoksi bagian mana yang cacat', FALSE, 2),
    (q_id, 'Menyarankan komplain ini diselesaikan mandiri oleh para manajer lintas divisi itu sebelum efek buruk teguran menimpa karyawan junior', FALSE, 1);
  -- Soal 16
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Demi mengefisienkan prosedur birokrasi, Anda punya terobosan merubah skema kerja yang menguntungkan namun harus menabrak adat dan kebijakan konvensional yang dijunjung kepala biro sebelah. Strategi jejaring Anda...', 'TKP', 'Jejaring Kerja', 'Jejaring Kerja', 'Jejaring Kerja: Menggunakan persuasi diplomatis berbasis data dan kolaborasi antarpemangku kepentingan.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Membangun dukungan argumentatif dan fakta bersama rekan tim, lantas mempresentasikan draf lobi tersebut memohon perimbangan langsung kepadanya', TRUE, 5),
    (q_id, 'Melakukan sosialisasi kasual terlebih dahulu ke jajaran di bawah dari sang kepala biro, guna membangun momentum dasar pendukung ide gagasan kita', FALSE, 4),
    (q_id, 'Meminta atasan utama tertinggi membuat disposisi resmi yang mutlak untuk dieksekusi oleh kepala biro belah, agar inovasi kita diwajibkan seketika', FALSE, 3),
    (q_id, 'Menjalankan skema prototipe baru tersebut di instansi saya sendiri saja, dan menunda konfrontasi sampai ada bukti pilot evaluasinya mumpuni', FALSE, 2),
    (q_id, 'Terpaksa memendam ide gagasan bagus tersebut daripada bersekongkol menjatuhkan citra pejabat lama dan bermusuhan yang merusak stabilitas', FALSE, 1);

END
$$;
