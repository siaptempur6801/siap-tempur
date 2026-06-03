-- =============================================
-- Seed: TKP - Sosial Budaya (14 Soal)
-- =============================================
DO $$
DECLARE
  q_id uuid;
BEGIN
  -- Soal 1
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Anda ditempatkan di sebuah daerah pelumpur yang memiliki adat istiadat sangat kental. Saat hari kerja tiba-tiba ada ritual desa yang mengharuskan seluruh warga dan instansi libur. Pimpinan kantor Anda yang berasal dari luar daerah memaksa tetap buka. Sikap Anda?', 'TKP', 'Sosial Budaya', 'Sosial Budaya',
   'Sosial Budaya: Kemampuan beradaptasi dan menghormati kearifan lokal tanpa melanggar aturan instansi secara kaku (mencari resolusi harmonis).') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Memberikan pemahaman mendalam pada pimpinan soal sensitivitas budaya setempat agar kantor bisa tutup atau kompromi buka setengah hari secara diam-diam', true, 5),
  (q_id, 'Mematuhi perintah pimpinan untuk tetap bekerja karena tugas negara adalah prioritas, sambil meminta maaf pada tokoh adat secara tertutup', false, 4),
  (q_id, 'Meminta izin secara pribadi untuk ikut ritual adat demi menghargai tetangga, meski tahu pimpinan akan marah', false, 3),
  (q_id, 'Menyarankan warga agar tidak mengganggu operasional kantor dengan melakukan ritualnya di luar area instansi pemerintah', false, 2),
  (q_id, 'Menentang pimpinan dengan keras dan melakukan provokasi mogok kerja demi menghargai adat istiadat leluhur', false, 1);

  -- Soal 2
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Saat rapat tim, ada rekan baru dari suku A yang berbicara dengan nada yang terkesan selalu membentak lantaran bawaan logat dari daerahnya. Beberapa anggota tim asli daerah situ merasa tersinggung. Anda...', 'TKP', 'Sosial Budaya', 'Sosial Budaya',
   'Sosial Budaya: Pemahaman keberagaman (diversity awareness) dan kemampuan menjadi penengah menjembatani gap persepsi budaya.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Memberikan pengertian halus kepada anggota tim lain bahwa itu murni gaya bahasa sukunya, serta membantu rekan agar melembutkan intonasi', true, 5),
  (q_id, 'Memaklumi saja tanpa bertindak apapun, karena seiring berjalannya waktu tim pasti akan paham sifat asli orang tersebut', false, 4),
  (q_id, 'Menegur keras rekan dari suku A agar menyesuaikan gaya bicaranya dengan kearifan lokal tim agar tidak sering menimbulkan salah paham', false, 3),
  (q_id, 'Membawa hal ini kepada Manajer SDM untuk mengagendakan kelas training komunikasi budaya bagi karyawan perantau', false, 2),
  (q_id, 'Mengurangi interaksi intens dengan rekan tersebut demi menjaga kenyamanan emosional staf lain', false, 1);

  -- Soal 3
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Rekan kerja Anda yang beragama minoritas sedang berpuasa. Pada saat istirahat siang, biasanya tim Anda selalu makan masakan bekal beramai-ramai di ruang istirahat yang sempit. Sikap Anda...', 'TKP', 'Sosial Budaya', 'Sosial Budaya',
   'Sosial Budaya: Toleransi, empati, kebersamaan, dan sensitivitas sosial beragama dalam lingkungan kerja.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Berinisiatif mengajak tim mencari tempat makan lain di pantry luar atau menunda makan sampai ia beristirahat, untuk menghormati puasanya', true, 5),
  (q_id, 'Menghormati haknya berpuasa dengan cara menutup makanan dan tidak menawarkan, meski kami tertap makan berdampingan', false, 4),
  (q_id, 'Makan seperti biasa namun mengingatkannya agar bisa beristirahat di masjid atau ruangan sepi agar tidak tergoda', false, 3),
  (q_id, 'Tidak peduli karena urusan perut dan urusan ibadah masing-masing adalah hak personal warga negara yang egaliter', false, 2),
  (q_id, 'Marah ketika ada yang menawari makanan padanya, dan memaksa rekan tersebut untuk meminta izin sebelum makan di depan orang puasa', false, 1);

  -- Soal 4
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Instansi Anda akan mengadakan perlombaan 17 Agustus antardivisi. Banyak divisi yang antusias dengan lomba modern, tapi atasan menugaskan divisi Anda merancang lomba tradisional (bakiak, egrang) untuk melestarikan budaya. Anggota Anda menolak karena dianggap usang. Anda?', 'TKP', 'Sosial Budaya', 'Sosial Budaya',
   'Sosial Budaya: Melestarikan nilai luhur bangsa, inklusivitas acara, dan kemampuan mempersuasi rekan.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Mengemas perlombaan tradisional tersebut dengan kreativitas kekinian (misal: hadiah unik, iringan musik) sehingga terlihat menarik dan kompetitif', true, 5),
  (q_id, 'Menjelaskan filosofi dan makna penting pelestarian budaya tradisional pada anggota tim lalu memaksakan acara itu terselenggara', false, 4),
  (q_id, 'Mengabulkan keluhan anggota dengan mencampur separuh lomba modern dan separuh lomba tradisional asal atasan tetap puas', false, 3),
  (q_id, 'Mewajibkan semua pegawai berpartisipasi dalam lomba lawas tersebut dengan ancaman pemotongan jam kerja jika absen', false, 2),
  (q_id, 'Bernegosiasi ulang kepada pimpinan untuk membatalkan niat itu karena tren milenial karyawan tidak menyukai lomba kuno tersebut', false, 1);

  -- Soal 5
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Di suatu daerah perbatasan pinggiran kota, masyarakat memiliki budaya menyelesaikan konflik sengketa melalui tokoh adat (tua desa) alih-alih jalur hukum formal polisi. Anda sebagai aparatur pemerintah di sana tertuntut menyelesaikan sengketa lahan warga. Langkah Anda...', 'TKP', 'Sosial Budaya', 'Sosial Budaya',
   'Sosial Budaya: Menghormati pranata sosial lokal dan berkolaborasi secara sinergis tanpa mengabaikan koridor hukum ketatanegaraan.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Menggandeng tokoh adat setempat dalam proses mediasi sengketa dengan berpegang pada esensi hukum agraria sebagai pedoman resolusi akhir', true, 5),
  (q_id, 'Menyerahkan sepenuhnya urusan sengketa pada dewan adat demi mencegah resistensi masyarakat kepada pemerintah pendatang', false, 4),
  (q_id, 'Membiarkan musyawarah adat berlangsung lebih dahulu, lalu masuk mematenkannya di notaris secara administrasi belakangan', false, 3),
  (q_id, 'Mensosialisasikan bahwa hukum adat tak setara hukum positif, lalu menarik perwakilan warga ke persidangan yang beradab', false, 2),
  (q_id, 'Menolak pengakuan hukum adat dan menyewa aparat kepolisian bersenjata guna menjaga kelengkapan survei tanah resmi', false, 1);

  -- Soal 6
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Anda bekerja di institusi pelayanan kesehatan masyarakat pelacur. Anda mendapati sekelompok pegawai yang tidak nyaman dan membedakan pelayanan terhadap pasien dari suku X akibat stereotip tertentu yang memburuk di media massa berita. Anda sebaiknya...', 'TKP', 'Sosial Budaya', 'Sosial Budaya',
   'Sosial Budaya & Anti Diskriminasi: Tidak bersikap bias / stereotip. Melayani setara. Memberikan koreksi kepada orang yang bias.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Menjadi role model dengan memberikan pelayanan yang prima dan adil bagi pasien suku X, lalu mengedukasi rekan agar profesional dan membuang stigma rasial', true, 5),
  (q_id, 'Melaporkan perlakuan rasialis ini kepada atasan teratas agar diterbitkan surat edaran wajib melayani semua pasien', false, 4),
  (q_id, 'Mengambil alih seluruh penanganan pasien-pasien beretnis X tersebut agar mereka mendapat pelayanan prima', false, 3),
  (q_id, 'Mengingatkan rekan-rekan ketika terlihat enggan masuk ke ruang observasi agar mereka lebih sungkan', false, 2),
  (q_id, 'Tidak ikut campur ranah rasisme rekan karena itu karakter mereka, asalkan saya tetap bersikap normal', false, 1);

  -- Soal 7
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Anda mendapatkan hadiah oleh-oleh berupa makanan khas yang eksotis dari pimpinan yang baru kembali dinas dari pulau seberang. Anda mengetahui bahwa bahan dasar makanan tersebut bertentangan dengan pantangan agama Anda. Atasan menantikan kesan Anda. Sikap Anda?', 'TKP', 'Sosial Budaya', 'Sosial Budaya',
   'Sosial Budaya: Asertivitas berbudaya. Menolak dengan halus, mempertahankan keyakinan religius, menghargai niat si pemberi.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Menerimanya dengan ucapan terima kasih mendalam atas perhatiannya, namun jujur mengatakan belum bisa memakannya karena alasan keyakinan agama secara sopan', true, 5),
  (q_id, 'Menerima oleh-oleh tersebut sambil memujinya, kemudian diam-diam memberikannya kepada teman lain yang bisa mengkonsumsinya tanpa sepengetahuan pimpinan', false, 4),
  (q_id, 'Menolak dengan sopan sejak awal pemberian tersebut dengan argumen medis bahwa saya sedang diet atas anjuran dokter', false, 3),
  (q_id, 'Menerima dan memakan secuil saja sekadar untuk menghargai pemberian atasan agar hubungan kekeluargaan tidak canggung', false, 2),
  (q_id, 'Secara frontal menolak di tempat dan mengembalikan karena saya sangat taat asas pantangan absolut', false, 1);

  -- Soal 8
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Sebuah acara peringatan kantor mengharuskan para pegawai mengenakan pakaian adat dari daerah masing-masing. Namun, Anda tidak memiliki baju adat tersebut karena harganya mahal dan sulit disewa di kota Anda. Anda...', 'TKP', 'Sosial Budaya', 'Sosial Budaya',
   'Sosial Budaya & Nasionalisme: Kebanggaan identitas budaya didukung solusi cerdas. Menghargai keberagaman pakaian adat negeri.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Berusaha meminjam dari kerabat atau jika tidak memungkinkan, saya memodifikasi pakaian batik nasional/motif nusantara agar tetap bernuansa budaya luhur', true, 5),
  (q_id, 'Tetap mencari sewaan baju adat meskipun sederhana atau baju adat dari daerah lain yang lebih murah sewanya untuk tetap berpartisipasi menghargai', false, 4),
  (q_id, 'Mengenakan pakaian batik biasa saja dari rumah tanpa perlu bersusah payah mencari baju adat karena esensinya hanya memeriahkan saja', false, 3),
  (q_id, 'Menghubungi panitia dan meminta izin untuk menggunakan seragam pdh dinas karena terkendala biaya dan pencarian kustomnya', false, 2),
  (q_id, 'Tidak berangkat ke kantor dengan mengajukan cuti karena malu menjadi satu-satunya yang tidak menggunakan baju seragam adat', false, 1);

  -- Soal 9
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Rekan kerja Anda baru saja mengalami musibah kematian anggota keluarga inti. Karena adat istiadat yang berbeda, proses pemakamannya cukup rumit dan memakan biaya adat yang sangat besar sehingga rekan Anda kesulitan dana. Sikap Anda?', 'TKP', 'Sosial Budaya', 'Sosial Budaya',
   'Sosial Budaya: Kepedulian sosial, kesetiakawanan, gotong royong terlepas dari seberapa berbeda/rasional adat kawan kita tersebut.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Menggalang dana sosial secara sukarela dari rekan-rekan kantor dan diserahkan untuk membantu meringankan beban adat keluarga yang tertimpa musibah', true, 5),
  (q_id, 'Memberikan sumbangan dari dompet pribadi semampu yang saya miliki dan mendoakannya agar diberikan jalan keluar rejekinya', false, 4),
  (q_id, 'Ikut berduka cita secara mendalam dan hadir menjenguk rumah dukanya sebagai bentuk empati dan kewajiban moral berteman', false, 3),
  (q_id, 'Memberikan nasihat rasional agar teman saya mengadakan pemakaman secara sederhana agar tak berhutang mahal demi tradisi', false, 2),
  (q_id, 'Merasa iba namun itu adalah resiko suku mereka yang menerapkan tuntutan adat terlalu ketat pada anggota keluarganya', false, 1);

  -- Soal 10
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Pemda sedang melaksanakan proyek pembangunan infrastruktur jalan besar di sebuah lahan warisan sakral. Hal ini menuai protes besar dari tetua adat padahal proyek bertujuan modernisasi mobilitas ekonomi wilayah. Sebagai penyuluh dinas, solusi yang Anda sampaikan...', 'TKP', 'Sosial Budaya', 'Sosial Budaya',
   'Sosial Budaya: Merangkul (approach) emosi kultural masyarakat lokal tanpa henti untuk mengedukasi esensi keuntungan peradaban bersama.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Menggelar dialog dua arah secara kekeluargaan, mengintegrasikan sedikit modifikasi arsitektur yang menonjolkan situs sakral mereka, seraya menekankan manfaat ekonomi masif warga', true, 5),
  (q_id, 'Mensosialisasikan pentingnya kesejahteraan masa depan bagi anak cucu desa ketimbang sekadar mempertahankan sepetak tanah peribadatan lama yang kosong', false, 4),
  (q_id, 'Meminta pemerintah tunda eksekusi proyek tersebut dan memindahkan trayek aspal sejauh beberapa kilo ke tanah biasa supaya aman konflik bersenjata', false, 3),
  (q_id, 'Menggalang petisi masyarakat pemuda desa yang pro pembangunan agar terjadi kekuatan massa seimbang untuk melobi tetua keras kepala itu', false, 2),
  (q_id, 'Bergerak menyingkirkan oknum-oknum yang merecoki tata laksana negara dengan aturan adat fanatik', false, 1);

  -- Soal 11
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Dalam ruang diskusi lintas generasi di kantor, para pegawai senior seringkali meremehkan pendapat gen-Z karena menganggap kurang merasakan asam garam perjuangan, sedangkan Gen-Z merasa gaya birokrasi tua tidak relevan. Bagaimana Anda bersikap?', 'TKP', 'Sosial Budaya', 'Sosial Budaya',
   'Sosial Budaya: Cross-generational understanding (kemampuan menghargai pengalaman tua sekaligus meredam arogansi inovasi muda). Bridging gap.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Menjembatani gagasan rasional kedua pihak secara positif, dimana saya menampilkan bahwa pengalaman senior sangat esensial dijadikan pondasi memvalidasi kecanggihan inovasi teknologi junior', true, 5),
  (q_id, 'Bersikap di tengah. Ketika senior bicara saya mengangguk hormat, saat junior bicara saya mendukung kelogisannya', false, 4),
  (q_id, 'Mengusulkan sesi sharing terbuka tanpa baper di internal agar kedua elemen saling menurunkan egonya masing-masing', false, 3),
  (q_id, 'Mendukung penuh generasi Z lantaran kita bekerja untuk tantangan 4.0, namun cara memberitahu senior harus amat lembut', false, 2),
  (q_id, 'Mengingatkan semua teman sebaya untuk takluk secara hierarkis birokrasi pada yang tua karena memang begitu adat ketimurannya', false, 1);

  -- Soal 12
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Anda bertugas sebagai guru penempatan terpencil. Anda melihat siswa punya tradisi tidak sekolah selama berminggu-minggu saat panen raya tiba karena harus membantu orangtua memanen. Kebijakan Anda menyikapi tradisi ini?', 'TKP', 'Sosial Budaya', 'Sosial Budaya',
   'Sosial Budaya: Inovasi layanan (fleksibilitas) tanpa mencabut hak masyarakat di realitas keras (konteks sosiologis daerah agrarian).') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Tidak melarang tradisi tersebut namun mengakalinya dengan sistem pembelajaran modul lapangan siang hari, atau jam belajar petang seusai jam panen selesai', true, 5),
  (q_id, 'Menemui lurah dan para wali murid berdiskusi intens bahwa pendidikan formal anak mutlak lebih tinggi nilainya dari kegiatan memanen musiman', false, 4),
  (q_id, 'Mengecualikan siswa dari sanksi alpha karena maklum pada tekanan kemiskinan warga, lalu memberi tugas rumah berlebih untuk kompensasinya', false, 3),
  (q_id, 'Mematuhi disiplin kurikulum sekolah pusat; yang tak hadir panen langsung di-alpha tanpa pilih kasih untuk efek jera', false, 2),
  (q_id, 'Meliburkan sekolah secara sepihak sekalian agar tak ada rasa tidak adil di ruang kelas yang ditinggalkan mayoritas penghuninya', false, 1);

  -- Soal 13
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Instansi mengadakan program CSR pertukaran pemuda ke provinsi yang mayoritas warganya beragama dan bersuku amat sangat berbeda dengan yang sering ditemui selama ini. Anda ditunjuk, kerabat mewanti-wanti kekhawatiran karena budaya mereka dikenal kasar. Anda berpikir...', 'TKP', 'Sosial Budaya', 'Sosial Budaya',
   'Sosial Budaya: Open-mindedness. Anti Prasangka. Memiliki resiliensi kultural yang adaptif.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Ini adalah anugerah tak ternilai untuk memperluas perspektif Nusantara; saya akan datang dengan hati terbuka, positif asimilasi, dan menjunjung filosofi di mana bumi dipijak di situ langit dijunjung', true, 5),
  (q_id, 'Merasa tertantang beradaptasi namun dalam lubuk hati menyiapkan kewaspadaan pertahanan emosional jika sterotip kasar tersebut benar terjadi adanya', false, 4),
  (q_id, 'Berangkat karena itu tugas pimpinan, dan mencari rekan grup dari daerah yang seasal dengan saya agar adaptasi bisa bertukar cerita aman', false, 3),
  (q_id, 'Membedah literatur daerah sana dan menyusun pedoman Do And Dont secara akademis agar saat di sana saya tidak blunder kelakukan', false, 2),
  (q_id, 'Mencari cara medis cerdik seperti memakai masker beralasan polusi, atau berpura sakit agar masa pertukaran saya dipersingkat jadwalnya', false, 1);

  -- Soal 14
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Di tengah acara kumpul arisan kantor yang mayoritas pepegawainya adalah perempuan muda, beberapa staf mulai asyik bergosip membahas preferensi suku untuk jodoh seraya memojokkan keturunan salah satu suku secara bercandaan tapi nyinyir. Anda di situ...', 'TKP', 'Sosial Budaya', 'Sosial Budaya',
   'Sosial Budaya: Berani asertif dan pro-keberagaman di situasi informal/cair, memotong mikroagresi/diskriminasi halus.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Memotong bercandaan mereka lewat humor cerdas tentang keunggulan masing-masing suku Nusantara secara adil lantas memindahkan bahasan ke topik pertemanan netral', true, 5),
  (q_id, 'Langsung menjauh dari kerumunan rumpian tersebut agar tidak dianggap menyetujui, dan pindah duduk ke sudut sepi menikmati santapan', false, 4),
  (q_id, 'Mengingatkan mereka serius di tempat tersebut bahwa candaan membawa identitas primordial dapat memicu ketersinggungan yang tidak terlihat di grup sosial', false, 3),
  (q_id, 'Hanya diam mendengarkan karena tidak mau merusak suasana arisan santai yang sulit terbangun kekerabatannya', false, 2),
  (q_id, 'Tertawa sekadarnya agar tak dicap kaku asalkan tidak ikut menambahkan komentar sentimen yang menyerang etnis tersebut', false, 1);

END $$;
