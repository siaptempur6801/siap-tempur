-- =============================================
-- Seed: TKP - Pelayanan Publik (16 Soal)
-- =============================================
DO $$
DECLARE
  q_id uuid;
BEGIN
  -- Soal 1
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Anda adalah seorang petugas front office di sebuah instansi pemerintah. Suatu pagi, seorang warga datang dengan marah-marah karena merasa dipersulit saat mengurus dokumen, padahal ia sudah membawa persyaratan yang menurutnya lengkap. Sikap Anda...', 'TKP', 'Pelayanan Publik', 'Pelayanan Publik', 'Pelayanan Publik: Mengedepankan sikap ramah, empati, solutif, dan profesional dalam merespon keluhan masyarakat tanpa terpancing emosi.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Mempersilahkannya duduk, mendengarkan keluhannya dengan tenang, kemudian memeriksa kembali berkasnya untuk mencarikan solusi', TRUE, 5),
    (q_id, 'Mendengarkan keluhannya dan menjelaskan dengan sopan bahwa aturan memang seperti itu dan tidak bisa diubah', FALSE, 4),
    (q_id, 'Meminta maaf atas ketidaknyamanan tersebut dan menyuruhnya melengkapi berkas yang masih kurang', FALSE, 3),
    (q_id, 'Memanggil petugas keamanan karena warga tersebut marah-marah dan mengganggu kenyamanan pengunjung lain', FALSE, 2),
    (q_id, 'Balas menegurnya agar menjaga sopan santun karena Anda hanya menjalankan tugas sesuai SOP instansi', FALSE, 1);
  -- Soal 2
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Menjelang jam istirahat siang, masih banyak antrean warga yang menunggu untuk dilayani. Teman Anda yang bertugas di loket sebelah sudah menutup loketnya dan bersiap istirahat. Sikap Anda...', 'TKP', 'Pelayanan Publik', 'Pelayanan Publik', 'Pelayanan Publik: Menunjukkan dedikasi dan orientasi pelayanan di atas kepentingan pribadi/istirahat.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Tetap melayani warga yang sudah antre hingga selesai meski jadwal istirahat saya harus tertunda', TRUE, 5),
    (q_id, 'Meminta izin kepada pimpinan untuk menunda jam istirahat agar bisa melayani warga yang tersisa', FALSE, 4),
    (q_id, 'Mengambil istirahat sebentar untuk makan, lalu bergegas kembali ke loket untuk melayani sisa antrean', FALSE, 3),
    (q_id, 'Memberitahukan kepada warga bahwa loket akan tutup sementara untuk istirahat dan meminta mereka menunggu', FALSE, 2),
    (q_id, 'Menutup loket tepat pada waktunya karena hak istirahat pegawai sudah diatur dalam peraturan instansi', FALSE, 1);
  -- Soal 3
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Anda ditugaskan mensosialisasikan aplikasi layanan publik yang baru dirilis instansi Anda ke sebuah desa terpencil. Saat di sana, Anda menyadari sebagian besar aparatur desa dan masyarakat setempat gagap teknologi. Tindakan Anda...', 'TKP', 'Pelayanan Publik', 'Pelayanan Publik', 'Pelayanan Publik: Memberikan kemudahan dan edukasi yang efektif agar layanan dapat diakses oleh semua kalangan.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Melakukan pendampingan khusus secara perlahan dan berkelanjutan dengan bahasa sederhana hingga mereka bisa', TRUE, 5),
    (q_id, 'Mempraktikkan cara penggunaan aplikasi secara langsung langkah demi langkah dan meninggalkan buku panduan', FALSE, 4),
    (q_id, 'Memfokuskan pelatihan pada beberapa aparatur desa yang terlihat lebih cepat paham agar mereka bisa mengajari yang lain', FALSE, 3),
    (q_id, 'Tetap melakukan sosialisasi sesuai materi presentasi yang disiapkan dan membagikan brosur', FALSE, 2),
    (q_id, 'Menyarankan warga agar meminta bantuan anak muda di desa tersebut untuk mengoperasikan aplikasinya nanti', FALSE, 1);
  -- Soal 4
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Saat bertugas di loket pendaftaran rumah sakit, Anda melihat seorang lansia kebingungan mengisi formulir perdaftaran. Antrean di belakangnya cukup panjang. Apa yang akan Anda lakukan?', 'TKP', 'Pelayanan Publik', 'Pelayanan Publik', 'Pelayanan Publik: Sigap memberikan bantuan proaktif kepada pihak rentan (lansia) tanpa mengorbankan kualitas layanan loket utama.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Meminta rekan kerja lain yang sedang tidak sibuk untuk mendampingi lansia tersebut mengisi formulir', TRUE, 5),
    (q_id, 'Membantunya mengisi formulir tersebut dengan cepat sambil tetap melayani pendaftaran dari dalam loket', FALSE, 4),
    (q_id, 'Menyarankan lansia tersebut untuk duduk dulu, dan saya akan membantunya setelah antrean agak sepi', FALSE, 3),
    (q_id, 'Meminta keluarga lansia tersebut atau orang lain di antrean untuk membantu mengisikan formulirnya', FALSE, 2),
    (q_id, 'Membiarkan saja karena setiap orang harus mengisi secara mandiri, dan ia pasti bisa bertanya pada security setempat', FALSE, 1);
  -- Soal 5
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Sistem layanan online di kantor Anda mengalami gangguan server sehingga layanan dialihkan secara manual. Hal ini membuat proses menjadi lebih lambat dan masyarakat mulai mengeluh panjangnya waktu tunggu. Respon Anda...', 'TKP', 'Pelayanan Publik', 'Pelayanan Publik', 'Pelayanan Publik: Transparan dalam menyampaikan kendala, solutif, serta proaktif agar masyarakat memaklumi dan tetap dilayani.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Menyampaikan permohonan maaf secara langsung beserta penjelasannya, lalu bekerja ekstra cepat melayani secara manual', TRUE, 5),
    (q_id, 'Menempelkan pengumuman gangguan server di depan pintu agar masyarakat maklum dengan kelambatan layanan', FALSE, 4),
    (q_id, 'Meminta masyarakat bersabar karena ini merupakan kendala teknis di luar kendali para pegawai loket', FALSE, 3),
    (q_id, 'Tetap melayani secara manual seperti biasa dan mengabaikan keluhan karena yang penting tetap bekerja', FALSE, 2),
    (q_id, 'Mengarahkan masyarakat agar pulang saja dan datang kembali besok saat sistem sudah diharapkan normal', FALSE, 1);
  -- Soal 6
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Anda adalah tim perumus kebijakan di sebuah lembaga pendidikan. Setelah evaluasi, masyarakat mengeluhkan rumitnya persyaratan pendaftaran jalur prestasi. Anda akan...', 'TKP', 'Pelayanan Publik', 'Pelayanan Publik', 'Pelayanan Publik: Continuous improvement, responsif terhadap umpan balik (feedback) masyarakat.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Membawa keluhan tersebut dalam rapat pimpinan dan mengusulkan penyederhanaan alur tanpa mengurangi akuntabilitas', TRUE, 5),
    (q_id, 'Mempelajari bagian mana yang dianggap rumit dan membuat panduan yang lebih mudah dipahami oleh masyarakat', FALSE, 4),
    (q_id, 'Mendiskusikan dengan rekan tim perumus untuk mencari jalan tengah antara aturan dan kemudahan layanan', FALSE, 3),
    (q_id, 'Menerima masukan tersebut sebagai bahan evaluasi untuk dipertimbangkan di tahun pelajaran berikutnya', FALSE, 2),
    (q_id, 'Menjelaskan kepada masyarakat bahwa kerumitan itu wajar untuk menyaring calon berprestasi secara ketat', FALSE, 1);
  -- Soal 7
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Saat Anda melayani, seorang disabilitas datang menggunakan kursi roda. Kondisi loket Anda cukup tinggi sehingga agak menyulitkannya. Sikap Anda...', 'TKP', 'Pelayanan Publik', 'Pelayanan Publik', 'Pelayanan Publik: Keramahan, empati, melayani kelompok rentan dengan inisiatif tinggi/jemput bola.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Langsung keluar dari loket menghampirinya untuk mengambil berkas dan melayaninya dengan ramah di area tunggu', TRUE, 5),
    (q_id, 'Meminta ia menunggu sebentar dan saya memanggil petugas khusus difabel untuk mendampinginya', FALSE, 4),
    (q_id, 'Menyarankannya untuk diwakili oleh kerabat atau orang lain yang menemaninya agar lebih mudah', FALSE, 3),
    (q_id, 'Berdiri agar bisa melihatnya lebih baik dan berbicara dengan suara lebih keras dari balik loket', FALSE, 2),
    (q_id, 'Tetap di meja dan melayani seperti biasa semampunya karena standar layanan harus setara ke semua orang', FALSE, 1);
  -- Soal 8
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Kantor Anda baru saja meluncurkan fitur pelayanan via WhatsApp (WA) bot. Jika ada keluhan yang tidak bisa dijawab oleh bot, pesan akan diteruskan ke admin manusia (Anda). Suatu hari pesan komplain membeludak, Anda...', 'TKP', 'Pelayanan Publik', 'Pelayanan Publik', 'Pelayanan Publik: Manajemen prioritas, ketangkasan, dan tidak membiarkan pelanggan telantar.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Mengelompokkan keluhan berdasarkan urgensi dan jenisnya, kemudian membalasnya satu persatu dengan efisien dan tepat', TRUE, 5),
    (q_id, 'Membalas keluhan satu per satu sesuai urutan masuk (first in first out) secepat kemampuan saya', FALSE, 4),
    (q_id, 'Membuat template jawaban umum baru untuk mempercepat balasan, lalu mengirimkannya kepada mereka', FALSE, 3),
    (q_id, 'Melaporkan lonjakan pesan ini pada pimpinan agar bisa mendapatkan tambahan admin IT untuk menangani WA', FALSE, 2),
    (q_id, 'Menjawab keluhan secara acak yang paling mudah diselesaikan terlebih dahulu agar antrean inbox berkurang', FALSE, 1);
  -- Soal 9
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Sebagai penyuluh lapangan, Anda dapati ada prosedur pengajuan pupuk bersubsidi yang sering disalahpahami petani sehingga banyak pengajuan yang ditolak. Tindakan Anda...', 'TKP', 'Pelayanan Publik', 'Pelayanan Publik', 'Pelayanan Publik: Proaktif mengedukasi masyarakat terkait proses kerja pemerintahan agar terlayani secara hak.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Mengumpulkan para ketua kelompok tani, menjelaskan detail prosedur yang benar, dan membuka layanan konsultasi', TRUE, 5),
    (q_id, 'Membuat selebaran bergambar yang mudah dipahami tentang syarat pengajuan lalu membagikannya ke balai desa', FALSE, 4),
    (q_id, 'Menginformasikan kembali setiap kali ada petani yang datang berkonsultasi secara individu', FALSE, 3),
    (q_id, 'Memberitahu pimpinan agar syarat pengajuan diubah menjadi lebih sederhana khusus untuk daerah tersebut', FALSE, 2),
    (q_id, 'Membiarkan saja karena hal itu murni keteledoran mereka dalam membaca aturan instruksi yang terpampang', FALSE, 1);
  -- Soal 10
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Anda diminta memimpin sebuah tim survey kepuasan masyarakat. Agar hasil yang didapat objektif dan dapat meningkatkan pelayanan, apa yang Anda lakukan?', 'TKP', 'Pelayanan Publik', 'Pelayanan Publik', 'Pelayanan Publik: Pemahaman kebutuhan riil pengguna layanan dengan riset yang objektif dan instrumen yang tepat.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Bekerja sama dengan tim menyusun kuesioner komprehensif anonim, serta menggali feedback langsung dari pengguna layanan', TRUE, 5),
    (q_id, 'Menggunakan kuesioner digital yang disebar luas melalui media sosial kantor agar cepat dan hemat waktu', FALSE, 4),
    (q_id, 'Menyeleksi responden dari warga yang rutin menggunakan pelayanan kantor untuk mengisi angket', FALSE, 3),
    (q_id, 'Menyebar kuesioner hanya kepada orang-orang yang terlihat santai di ruang tunggu antrean', FALSE, 2),
    (q_id, 'Meminta bagian pengaduan merekapitulasi kotak saran bulan lalu sebagai pengganti survey langsung lapangan', FALSE, 1);
  -- Soal 11
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Seorang ibu datang hampir jam tutup kantor, ingin melegalisir dokumen. Sebenarnya menurut SOP legalisir butuh waktu maksimal 1 hari kerja, karena dokumen besok akan sangat mendesak ia memohon kebijakan Anda. Sikap Anda?', 'TKP', 'Pelayanan Publik', 'Pelayanan Publik', 'Pelayanan Publik: Berorientasi hasil dan responsif menolong dalam keadaan gawat bila memungkinkan, tanpa serta merta menabrak aturan yang kaku.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Membantu melegalisir saat itu juga dengan cepat setelah memverifikasi keasliannya karena sifatnya mendesak', TRUE, 5),
    (q_id, 'Menerima berkasnya dan meminta ia menunggu, kemudian saya akan kerjakan sebisanya sebelum pulang kantor', FALSE, 4),
    (q_id, 'Berkonsultasi dengan pimpinan apakah diperbolehkan memprosesnya sekarang mengingat sudah jam pulang', FALSE, 3),
    (q_id, 'Menjelaskan dengan ramah bahwa aturan SOP adalah 1 hari kerja sehingga ibu bisa mengambilnya besok pagi', FALSE, 2),
    (q_id, 'Menolak permintaannya karena kantor segera tutup dan sistem cetak sudah dimatikan', FALSE, 1);
  -- Soal 12
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Anda menemukan banyak warga yang mengajukan pertanyaan berulang di media sosial instansi meskipun informasinya sudah ada di banner website. Apa yang Anda lakukan selaku admin media sosial?', 'TKP', 'Pelayanan Publik', 'Pelayanan Publik', 'Pelayanan Publik: User-centric. Pengguna mungkin malas baca atau bingung. Perlu penempatan FAQ yang strategis.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Membuat konten edukasi visual (infografis/video singkat) yang menarik dan dipin/disematkan di urutan teratas', TRUE, 5),
    (q_id, 'Merespon pertanyaan mereka dengan mengirimkan link yang mengarah langsung ke pengumuman di website', FALSE, 4),
    (q_id, 'Tetap membalas komentar mereka satu per satu dengan sabar karena itu merupakan risiko pekerjaannya', FALSE, 3),
    (q_id, 'Membuat bot otomatis (auto-reply) yang menyodorkan informasi tersebut jika ada kata kunci tertentu', FALSE, 2),
    (q_id, 'Mengabaikan komentar yang menanyakan hal-hal yang jawabannya sudah tertulis jelas', FALSE, 1);
  -- Soal 13
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Ketika Anda bertugas, listrik padam secara mendadak. Genset sedang diperbaiki, sehingga komputer mati dan pelayanan tertunda. Banyak warga mengeluh kepanasan karena AC mati. Sikap Anda...', 'TKP', 'Pelayanan Publik', 'Pelayanan Publik', 'Pelayanan Publik: Manajemen krisis pelayanan. Memberikan pengumuman jelas, menenangkan, dan membantu sebisanya.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Mengambil inisiatif memberikan penjelasan dan kepastian estimasi perbaikan listrik, serta membagikan air minum ke warga', TRUE, 5),
    (q_id, 'Meminta maaaf kepada warga secara langsung dan mengusulkan mereka untuk menunda kepengurusan hari ini', FALSE, 4),
    (q_id, 'Melakukan tugas administrasi yang bisa dikerjakan manual sambil menunggu tanggapan pihak teknisi', FALSE, 3),
    (q_id, 'Menunggu di ruangan staf yang kebetulan memiliki jendela terbuka lebar sambil sesekali memantau warga', FALSE, 2),
    (q_id, 'Menyarankan warga yang tidak kuat panas untuk keluar ruangan saja dan kembali jika lampu sudah menyala', FALSE, 1);
  -- Soal 14
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Sebuah kerabat dari pimpinan pusat datang ke puskesmas Anda dan meminta pelayanan didahulukan tanpa perlu mengantre lama dengan alasan kepentingan mendesak, padahal banyak pasien sakit lainnya di antrean. Anda...', 'TKP', 'Pelayanan Publik', 'Pelayanan Publik', 'Pelayanan Publik: Keadilan, perlakuan yang sama untuk semua pengguna layanan (non-diskriminatif) tanpa pandang bulu.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Menjelaskan secara ramah, profesional, dan tegas bahwa sistem antrean diberlakukan sama bagi seluruh pasien demi keadilan', TRUE, 5),
    (q_id, 'Meminta kerabat tersebut untuk menemui atasan langsung di kantor demi mendapat persetujuan lebih lanjut', FALSE, 4),
    (q_id, 'Mengarahkan ia ke layanan poliklinik VIP atau mandiri jika ingin mendapat penanganan eksklusif dengan cepat', FALSE, 3),
    (q_id, 'Melayaninya diam-diam dengan cepat agar tidak menimbulkan keributan yang menjatuhkan wibawa pimpinan', FALSE, 2),
    (q_id, 'Memarahi tindakannya yang mencoreng institusi karena bertindak sewenang-wenang di tempat umum', FALSE, 1);
  -- Soal 15
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Anda mendapat tugas dari atasan untuk menjadi petugas unit layanan keliling di perkampungan yang akses sulit. Di sana fasilitas kenyamanan (toilet, sinyal) kurang memadai sehingga sangat melelahkan. Anda...', 'TKP', 'Pelayanan Publik', 'Pelayanan Publik', 'Pelayanan Publik: Tangguh, mengutamakan tanggung jawab layanan publik terlepas dari kondisi sarana prasarana sekitar.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Melaksanakan tugas dengan penuh dedikasi dan senyum karena warga setempat merupakan prioritas pelayanan juga', TRUE, 5),
    (q_id, 'Fokus saja pada penyelesaian pekerjaan secepat mungkin agar bisa segera kembali ke kota yang lebih nyaman', FALSE, 4),
    (q_id, 'Mengerjakan tugas standar sesuai instruksi saja, karena memaklumi infrastruktur pendukungnya memang belum siap', FALSE, 3),
    (q_id, 'Meminta uang dinas tambahan ke pusat karena lokasi yang dituju memiliki tantangan di luar standar normal', FALSE, 2),
    (q_id, 'Mendelegasikan tugas tersebut kepada bawahan atau pegawai baru yang masih butuh pengalaman dinas lapangan', FALSE, 1);
  -- Soal 16
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Dalam memberikan pelayanan publik, instansi Anda menerapkan budaya "one-stop service" (layanan terpadu satu pintu). Saat warga menanyakan berkas yang belum selesai, ternyata hambatannya ada pada divisi lain di dalam kantor. Anda...', 'TKP', 'Pelayanan Publik', 'Pelayanan Publik', 'Pelayanan Publik: Kolaborasi internal yang kuat. Memastikan janji one-stop service terlaksana bagi pelanggan, tanpa saling lempar tanggung jawab.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Proaktif menghubungi divisi tersebut untuk menanyakan statusnya, dan memastikan warga tersebut menerima update dengan jelas', TRUE, 5),
    (q_id, 'Meminta maaf kepada warga dan mengatakan Anda sedang berusaha mengeceknya melalui sistem internal secepat mungkin', FALSE, 4),
    (q_id, 'Menjelaskan kepada warga bahwa hambatannya ada di divisi lain dan akan segera selesai jika divisi tersebut beres', FALSE, 3),
    (q_id, 'Mengarahkan warga untuk bertanya langsung ke ruangan divisi terkait karena itu bukan tanggung jawab loket Anda lagi', FALSE, 2),
    (q_id, 'Meminta warga meninggalkan nomor telepon, lalu mengabaikannya karena Anda harus melayani pelanggan berikutnya', FALSE, 1);

END
$$;
