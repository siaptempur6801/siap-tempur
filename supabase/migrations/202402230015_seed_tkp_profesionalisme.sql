-- =============================================
-- Seed: TKP - Profesionalisme (14 Soal)
-- =============================================
DO $$
DECLARE
  q_id uuid;
BEGIN
  -- Soal 1
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Saat menjalankan tugas penting di lapangan, atasan menelpon agar Anda segera kembali ke kantor untuk mengerjakan laporan rutin bulanan padahal tugas lapangan masih setengah jalan dan bersifat krusial. Anda...', 'TKP', 'Profesionalisme', 'Profesionalisme',
   'Profesionalisme: Menyelesaikan pekerjaan dengan skala prioritas, memberikan argumentasi logis kepada atasan.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Memberikan penjelasan sopan mengenai urgensi tugas lapangan ini, dan menjanjikan akan menyetor laporan bulanan tersebut sepulang kembali tugas secepat mungkin dan secara akurat', true, 5),
  (q_id, 'Segera mendelegasikan tanggung jawab di lapangan kepada anggota subordinasi terpercaya agar dapat bergegas menunaikan amanat komando pulang sesuai perintah lisan pimpinan teratas itu', false, 4),
  (q_id, 'Mengingatkan kembali dengan tenang kepada atasan bahwa agenda tugas krusial tersebut adalah tugas sah yang diinstruksikan pula oleh beliau pada nota edar rapat semalam kepada tim terkait', false, 3),
  (q_id, 'Mematuhi panggilan atasan tanpa berunding argumen sekalipun batin merana demi menghindari konsekuensi indisipliner fatal mutasi jabatannya lantaran menantang perintah eksekutif hierarkis di institusi', false, 2),
  (q_id, 'Menonaktifkan telepon pintar dengan alasan hilangnya jangkauan koneksi tower BTS semata untuk terhindar dari pemanggilan dan fokus menyelesaikan instruksi semula sampai tuntas mengesankan demi kebaikan warga', false, 1);

  -- Soal 2
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Sebuah perusahaan swasta mengajukan dokumen izin investasi pariwisata bermodal tinggi di meja administrasi Anda. Syarat lampirannya kurang dokumen wajib analisa dari badan tata kelestarian alam yang bisa memakan 1 bulan. Pihak konglomerat itu menyisipkan cek tebal menjanjikan beasiswa ke luar negeri asal Anda melancarkan ini kilat. Anda?', 'TKP', 'Profesionalisme', 'Profesionalisme',
   'Profesionalisme & Integritas: Taat SOP, menolak suap dengan ketegasan dan sopan.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Menolak secara sopan serta mengembalikan cek bernilai tersebut mutlak-mutlak, kemudian tegas menginformasikan bahwa berkas perizinan baru tertahap apabila syarat analisis terverifikasi legal kelak', true, 5),
  (q_id, 'Secara halus meminta delegasinya menyimpankan kembali uang sogokan, lantas membantu menelponkan pihak dinas tata alam guna mempercepat laju prioritas analisa tanpa cacat demi kesejahteraan instansi saya', false, 4),
  (q_id, 'Menyerahkan kembali paket suapnya tanpa bertutur banyak lantas segera meneruskan berkas itu mandek selamanya pada loket pimpinan untuk memperoleh sikap putusan murni dari pimpinan paling memegang kewenangan tinggi', false, 3),
  (q_id, 'Menasihati yang bersangkutan agar sadar hukum terkait pidana penyuapan aktif lantas mempersilakan pihak investor yang menyuap itu segera melengkapi izinnya kembali, alih-alih menghubungi polisi saat kejadian bermula usai di sana', false, 2),
  (q_id, 'Menerima dan menggunakan cek tersebut sebagai sumbangan amal panti asuhan tanpa memakai sepeserpun demi kepentingan perut diri, meski terpaksa menerbitkan dokumen itu atas belas kasihan dan keuntungan kaum termarjinalkan miskin semata', false, 1);

  -- Soal 3
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Dinas menugaskan Anda menghadiri pertemuan koordinasi dengan pemangku pusat esok lusa. Bersamaan dengan itu, anak tunggal Anda dijadwalkan menerima penghargaan nasional tingkat akademik di istana kemendikbud dan menginginkan figur Anda, sementara pasangan dinas keluar kota. Anda ...', 'TKP', 'Profesionalisme', 'Profesionalisme',
   'Profesionalisme: Kemampuan membagi ranah prioritas, di mana hal ini bersifat berimbang (keduanya tinggi). Delegasi tugas adalah opsi baik, namun menempatkan pekerjaan sesuai proporsi komitmen.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Berkonsultasi dengan atasan terkait pendelegasian atau perizinan pertemuan dinas itu agar rekan selevel Anda bisa mewakili secara memuaskan seraya saya cuti memenuhi kewajiban keluarga langka bagi pertumbuhan anak tercinta', true, 5),
  (q_id, 'Membawa anak saya ke tempat dinas luar kota dan menyelaraskannya dengan memundurkan durasi acara sekolah hingga saya dan pimpinan dapat menyaksikan ia bersama sama dari aula kementerian sana secara video conference', false, 4),
  (q_id, 'Memilah jadwal yang sangat bersinggungan tersebut, lalu mementingkan tugas dinas yang merupakan bakti kenegaraan asasi, dan memohon anak menangkap keutamaan berkorban secara rasional guna masa depan bangsa lebih adil nanti', false, 3),
  (q_id, 'Menyetujui agenda tugas tersebut dengan bersyarat jadwal tiket pulangnya ditanggung secara cepat dan mahal agar sempat berfoto di penghujung momen tersebut sebelum piala sepenuhnya tersembunyi ke dalam laci pajangan kementerian terkait ini', false, 2),
  (q_id, 'Berpura-pura menderita sakit demam tinggi pada pagi itu saat hari menampakkan tanggal kalender eksekusi, demi dapat membahagiakan buah hati di ujung penantian karir dia meskipun harus mangkir merugikan kepentingan pertemuan koordinasi', false, 1);

  -- Soal 4
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Rekan kerja di bagian administrasi yang memiliki beban kerja yang banyak sakit dan cuti melahirkan 3 bulan. Kebetulan tupoksinya hampir mirp bidang Anda. Atasan melimpahkan semuanya kepada Anda sementara tanpa kompensasi tambahan. Anda...', 'TKP', 'Profesionalisme', 'Profesionalisme',
   'Profesionalisme: Berkemampuan tinggi dalam manajemen waktu (time management), bekerja di bawah tekanan (pressure), tetap ikhlas dalam bakti.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Menyanggupinya tulus, mengatur kembali timeline kerja dan menentukan prioritas ketat agar baik tugas pokok saya maupun tugas titipannya selesai sesuai standar standar waktu kriteria instansi profesional', true, 5),
  (q_id, 'Mewajibkan diri saya untuk mendelegasikan serpihan-serpihan tupoksi tambahan rekan saya tersebut pada jajaran staff tenaga lepas honorer walau itu diluar tupoksi sang perbantuan itu yang semestinya, dengan niat efisiensi jam masuk saya usai malam menjelang lelahnya porsi ganda ini menyiksa diri', false, 4),
  (q_id, 'Mendiskusikan dan meminta keringanan pada pimpinan mengenai pengurangan proyek inovasi khusus diri saya agar rute penanganan laporan teman yg melimpah ini dapat lancar terlaksana tanpa saya menjadi drop menderita depresi berlebih oleh kuantitas jam kerja ganda', false, 3),
  (q_id, 'Menolak instruksi krusial secara elegan melalui penciptaan narasi bahwa fokus saya adalah 100 persen penyelesaian misi pokok jabatan karena sesuai isi spesifikasi tanda tangan pada SK perjanjian formasi kinerja bulanan awal karir pengabdian', false, 2),
  (q_id, 'Menerima pasrah seraya banyak curhat dan menyindiri instansi karena perlakuan eksploitatif pada dedikasi ini tidak pernah ditimpal baik oleh perlakuan pemberian uang kesejahteraan di saat saat rekan-rekan lain lenggang bebas ria sehabis waktu jam pulang dinamis berdentang manis lepas itu terbenam riuh di awan awan cerah', false, 1);

  -- Soal 5
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Anda sudah puluhan tahun menjabat di posisi struktural. Tiba-tiba ada kebijakan mutasi dan perputaran di mana rekan Anda yang usianya masih amat sangat junior di promosikan menaiki jabatan secara melejit melangkahi Anda sebagai atasan Anda saat ini. Sikap Anda?', 'TKP', 'Profesionalisme', 'Profesionalisme',
   'Profesionalisme: Objektif, berbesar hati (lapang dada), melihat kinerja daripada senioritas usia, terus berkarya membangun iklim positif.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Menerima hal itu dengan sikap dada lapang, menghormati dia sebagai wujud otoritas kapabilitas terbaru, lantas mensupport kelancaran kebijakannya seoptimal mungkin bagai seorang birokrat tulen yang menjunjung nilai rasional meritokrasi', true, 5),
  (q_id, 'Mengevaluasi kekurangan kapabilitas teknis manajemen saya melalui konsultasi dengan dinas diklat supaya lekas dapat tersusul kembali selagi menuruti pimpinan junior baru itu tanpa gejolak berarti dalam ruang instansi kami ini', false, 4),
  (q_id, 'Hanya mengikuti sebatas perintah teknis kerja formalnya tanpa repot berkecimpung turut memperkuat ikatan hubungan interpersonal atasan-bawahan, demi menjaga kewibawaan dan rasa risih saya karena rentang perbedaan usia tajam bertahun', false, 3),
  (q_id, 'Banyak menentang secara diam, lantaran menuntun atasan tersebut untuk gagal lewat kelicikan manipulasi kecil adalah taktik perpeloncoan psikologis lumrah di kancah struktur persaingan politik karir instansi publik bagi anak anak amatiran minim pengalaman panjang realita keras birokrasi tua itu, meski salah dari teori', false, 2),
  (q_id, 'Melayangkan gugatan pengujian SK perombakan tersebut pada lembaga sengketa komisi independen kepegawaian agar saya direstitusi hak waris naik jabatannya berdasar lamanya saya loyal menyetor upeti karir demi instansi di saat bocah junior tersebut masih menempuh bangku studinya bertahun lalu tak menyentuh pahitnya meja pengabdian sepersen pun usahanya', false, 1);

  -- Soal 6
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Sebuah kesalahan administrasi serius tidak sengaja Anda perbuat sewaktu dinas. Hal ini murni karena kecerobohan Anda saat begadang lembur mengejar tenggat (fatigue). Dokumen sudah terlanjur berlanjut ke sistem perbankan final. Apa langkah profesional secepatnya?', 'TKP', 'Profesionalisme', 'Profesionalisme',
   'Profesionalisme: Keberanian mengakui kesalahan, proaktif mitigasi krisis, bertanggung jawab mutlak (accountability).') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Melapor seketika pada pimpinan tanpa dalih alasan, menjabarkan dampak cacat yang terjadi, seraya turun memimpin kontak tanggap ke pihak perbankan guna menahan pemrosesan draf tersebut secepat kilat untuk amandemen koreksinya bersama tim bantuan khusus kilat dan bertanggung jawab atas sanksinya mutlak adil itu kelak mandiri utuh tegar', true, 5),
  (q_id, 'Mengirim nota darurat tertulis ke sistem vendor operasional perbankan seolah sistemnya tengah maintenance agar transaksi terjeda dan saya bisa meninjau pembetulan datanya tertutup dari pusat atasan, semata menjaga noda karir tak cacat memburuk karena sebuah slip bodoh tunggal usai deret kesempurnaan purna tanpa tanding bertahun lama usangnya membosankan sunyi senyap sepi', false, 4),
  (q_id, 'Membiarkan aliran dokumen terproses dulu sembari menyiapkan skenario permohonan kompromi audit penyesuaian saat revisi laporan komite tahunan digelar bulan depan lantaran mencabutnya sekarang dapat mencoreng institusi fatal sekali memusingkan sekelompok biro administrasi yang tidak tahu apa apa sepeser pun juga lelah dan bosan berkepanjangan pada runtutan ini', false, 3),
  (q_id, 'Berdalih dengan lihai mengklaim itu kesalahan gabungan dan malfungsi error dari perangkat piranti lunak jaringan sehingga semua bisa bebas tuntutan langsung menyalahkan fenomena kerusakan force majeure yang mutlak menyilaukan mata para auditor pemeriksa kaku garang tak kenal lelah letih letih jua itu di seberang kacamata pandang dunia dan di manapun adanya hal sejenis serupa ini lazim', false, 2),
  (q_id, 'Mengamankan posisi menyelamatkan jejak dengan lekas menyuap oknum pegawai input data server perbankan tersebut untuk menyunting diam diam kesalahan angka koma pelik ini sembari berpura polos hingga akhir hayat bekerja purna tak bermasalah mengkhatamkan riwayat jabatan gilang gemilang sejahtera tak ada kendala mengusik hidup kedamaian mutlak semata', false, 1);

  -- Soal 7
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Dalam sistem baru, indikator kinerja instansi Anda berubah menjadi target kuantitatif yang terlampau sangat ekstrem tidak realistis di kondisi geografis dinas daerah anda tersebut. Seluruh bawahan bersiap aksi unjuk rasa tanda protes pesimis meyerah massal memboikot. Sikap kepemimpinan jenjang Madya yang Anda sandang ditantang di hal inii...', 'TKP', 'Profesionalisme', 'Profesionalisme',
   'Profesionalisme: Pemikiran kritis, advokasi konstruktif (asertif ke atas) serta menjaga semangat tim (leadership ke bawah).') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Meredam emosi dan gejolak protes bawah lalu meyakinkan komitmen, kemudian bergerak menghadap pimpinan pusat mengajukan studi evaluasi berbasis kalkulasi potret geografis wilayah menuntut normalisasi rasio wajar agar tak sekadar menjadi target muluk namun tercapainya kualitas yang tetap terjaga utuh akurat sempurna tinggi sekali pun berat sedikit rasanya meneteskan lelah panjang bertarung di rapat itu', true, 5),
  (q_id, 'Mendukung gerakan tersebut secara moral karena saya tahu target memabukkan ini murni gagasan oknum tak turun di aspal, dan menyertakan tanda tangaan solidaritas di baris terdepan, walau saya faham sanksi mutasi pangkat siap menyambar posisi elok menawan di kursi ruangan nyaman megah ini sungguh tak berperikemanusiaan dan kejam tak beretika sekali saja', false, 4),
  (q_id, 'Mewajibkan bawahan mendiamkan opini negatif miring dan mencambuk ritme mereka agar menembus batasan demi memuaskan ekspektasi pusat seraya membiarkan mereka berguguran di palagan survei lapangan memeras keringat di tengah cuaca panas asalkan karier saya terjaga cemerlang tanpa letih memaparkan kesulitan bodoh di depan muka sang direktur menteri', false, 3),
  (q_id, 'Membiarkan situasi ini karena kebijakan di negara birokrat sentralisasi tidak dapat dinafikan bagai sebuah kitab absolut suci turun dari awan, dan kami bertugas semampu yang fisik nafas izinkan menanggung segala macam siksaan administratif', false, 2),
  (q_id, 'Menasihati seluruh tim untuk seolah memanipulasi pencatatan di atas kertas laporan agar grafiknya menembus fantastis dan menyenangkan raut wajah bapak jenderal pimpinan pusat karena ini adalah rahasia panggung pertunjukan trik lama untuk bertahan dan eksis nyaman di piranti birokrasi abu yang usang bobrok ini berabad seraya menyeruput tenang secangkir kopi mantap menyegarkan raga pagi hari di dalam kemacetan lajur metropolitan yang penat bising berasap kelabu berdebu itu juga sekalian dan sebagainya dan lain lain banyak sekali urusan', false, 1);

  -- Soal 8
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Perusahaan menempatkan Anda mengawasi unit yang berisikan kaum rebahan pesimistis. Pekerjaan mereka selesai, namun tidak pernah ada inovasi tambahan sehingga mutu hasil sekadarnya menjiplak template lawas. Anda adalah orang baru berambisi tinggi. Cara meningkatkan kualitas unit profesionalnya?', 'TKP', 'Profesionalisme', 'Profesionalisme',
   'Profesionalisme: Kemampuan memotivasi, menetapkan standar unggul (continuous improvement & excellence) secara persuasif berkelanjutan.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Melibatkan tim pada wacana diskusi perumusan masalah pelan pelan, serta menginisiasi perlombaan atau reward inovasi, lalu mendampingi sebagai penyokong gagasan bila sebuah loncatan mutu itu gagal direalisasikan dalam praktek perjalanannya perdana mereka secara konsisten menginspirasi gairah semangat berprestasi lebih tinggi jauh di atas langit harapan standar batas bawah', true, 5),
  (q_id, 'Mereka dipecut menggunakan teguran tegas terukur berupa ancaman tidak mendapatkan insentif liburan maupun fasilitas santai kecuali mereka membubuhi laporan kinerjanya dengan sebuah ekstra metodologi kekinian baru dari belahan asing agar mereka takut terpaksa melenting bangkit bergerak dari alam lelap kesunyiannya itu', false, 4),
  (q_id, 'Mengerjakan inovasinya menyendiri menyilaukan tanpa usah mencampur mereka yang terlanjur teracuni hawa mati, agar diri pribadi saja yang lekas tercatat memperoleh kenaikan kasta golongan cepat melesat bagai peluru tanpa menghabiskan energi menarik narik beban orang kusam yang pasrah terkapar menelan eksistensi zaman mutakhir 4.0 tak kunjung habis selesai letih lunglai tak bermanfaat sama sekali itu semua tak akan merubah nasib mereka secara berarti banyak usahanya pun tak guna di dunia ini sungguh sungguh sangat', false, 3),
  (q_id, 'Menerimanya sebagai nasib alamiah lantaran kultur mereka terbilang demikian, sedangkan tupoksi asalnya terselesaikan tuntas tanpa bolong maka secara hitam di atas putih profesionalisme dasar sudah lumrah dimaknai cukup wajar terukur absah lulus memuaskan', false, 2),
  (q_id, 'Merasa stres depresi kemudian secara terbuka memaki mereka lantaran kualitas mereka seperti zaman purba dan menjatuhkan motivasi saya berjuang, sehingga mengajukan pindah mutasi secepat secepatnya ke ibu kota jauh di sana lari menghindari bena nan gila orang orang pemalas', false, 1);

  -- Soal 9
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Menjelang tahap uji verifikasi proyek lapangan yang Anda tangani, pihak konsultan menawari Anda liburan fasilitas penuh dengan berkedok "kunjungan orientasi wisata kemitraan". Mereka menyatakan itu diluar fee kontrak resmi negara. Reaksi Anda...', 'TKP', 'Profesionalisme', 'Profesionalisme',
   'Profesionalisme: Integritas mutlak dan etika jabatan (konflik kepentingan / gratifikasi).') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Menolak asertif untuk memegang teguh larangan tegas gratifikasi di sumpah ASN, dan tetap berlaku objektif rasional terhadap pelaporan penyerahan kualitas bangunan proyek mereka kelak nantinya dengan ketat tajam tak tergoda', true, 5),
  (q_id, 'Menerima itu sebagai bagian lobi silaturahmi lumbung rezeki asalkan saya tidak mengubah secuil pun nilai rapor penilaian teknis bangunannya di masa evaluasi nanti agar kedua kubu sama sama senang tanpa merasa berdosa rugi mengkhianati amanat negeri', false, 4),
  (q_id, 'Mengembalikan tawaran tiket permai tersebut kepada konsultan dengan embel meminta uangnya diubah sumbangan langsung ke fakir yatim piatu kampung dekat rumah kediaman atasan demi terhindar label korup dan tersamarkan luhur terhormat mulia di benak kalbu bersih tanpa cacat dosa tercela noda kotor perih pedih lara sedih menyiksa diri perih membakar arang hitam kelam dan pedih', false, 3),
  (q_id, 'Bimbang lalu mendiskusikan di grup kolega apakah mereka biasa menerima kompensasi wisata tersebut di proyek tahun tahun lawas lampau sebelum memutuskan mengambil jatah liburan megah gratis langka persembahan dari kapitalisme manis lembut tersembunyi halus syahdu mendobrak tatanan iman', false, 2),
  (q_id, 'Menyetujuinya secara antusias namun memperintahkannya secara anonim tak tercatat agar pimpinan komisi audit tak mampu mencium sepeser pun aroma kenikmatan kongkalikong yang manis lezat dari hasil berteman pada pengerjaan berbudget bombastis meluas menggelegar ke antero negeri raya dan makmur ini selamanya sampai anak cucu sejahtera kaya melimpah berkuasa utuh merajai sistem piramida elit birokrat tua itu', false, 1);

  -- Soal 10
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Rekan sekerja Anda mengundurkan diri (resign) sebelum tenggat mega-proyek peluncuran platform e-government selesai, membuat bagian back-end kocar-kacir. Pimpinan panik dan menyuruh semua divisi lembur tanpa hari libur. Sebagai anggota front-end yang sudah kelar, sikap mental Anda...', 'TKP', 'Profesionalisme', 'Profesionalisme',
   'Profesionalisme: Kerja sama/teamwork, daya tangguh (resilience), dan empati terhadap visi pimpinan maupun kekurangan tim.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Memahami kekritisan insiden, dan turun langsung menawarkan sumbangih lembur mengerjakan elemen back-end simpel sebisa kemampuannya walau front-end saya purna terselesaikan paripurna dengan niat meloloskan hajat rilis instansi', true, 5),
  (q_id, 'Tetap lembur di ruangan dengan santai mempelajari keahlian desain baru buat proyek selanjutnya guna mematuhi kewajiban absen tanpa harus kerepotan membebankan masalah keruntuhan sistem program dari tangan back-end murahan kabur di masa darurat lari pengecut tersebut', false, 4),
  (q_id, 'Izin kepada pimpinan untuk libur asalkan bisa online siap panggilan dari rumah berdalih jobdesk utamanya beres paripurna tuntas memukau tanpa cela, demi porsi keadilan pemisahan kewajiban kerja modern di dunia korporat rasional dingin logis tegas tajam tak berbelah rasa simpati sekadar belaka di mata hukum tata bahasa kontrak formal yang usang kaku itu jua di ranah dewan pengupahan perburuhan nasional internasional antar benua raya sejagat', false, 3),
  (q_id, 'Memprotes keras penyamarataan lembur padahal rekan pelakunya adalah orang pengecut kabur, lantas saya membujuk karyawan lain turun melakukan perlawanan pasif boikot peluncuran sampai hak lembur dilunaskan purna oleh sang majikan birokrat pemarah yang kikir menjepit lelah urat ini mendendam panjang dan tajam bernada sumbang memalukan di depan publik luas jurnalis terkemuka dunia memaparkan perbudakan ini nyata tak henti di gedung wakil terhormat itu sendiri jua secara terbuka menawan memukau menantang mata elang beringas dan kelaparan mencari secuil noda kesalahan fana', false, 2),
  (q_id, 'Mengikuti seruan kerja lembur dengan penuh dengusan rasa muak caci maki serta memanas provokasi dan sengaja menanam sebaris error ringan pada program peluncuran rilis nanti sekira pimpinan gagal bangga dalam upacara perhelatan esoknya seumpama tamparan hukuman bagi penuntut kemustahilan', false, 1);

  -- Soal 11
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Ketika Anda bertugas meninjau laporan kualitas suatu proyek perairan dari daerah pedalaman, ternyata standar material tidak terpenuhi tapi bangunan tetap nampak memadai layaknya kokoh. Apabila Anda menolak ini, pimpinan desa akan tersinggung berat merusak hubungan kultural dinas Anda, tetapi mengiyakannya melanggar kode ketebalan ISO. Tindakan Anda...', 'TKP', 'Profesionalisme', 'Profesionalisme',
   'Profesionalisme: Berpegang pada standar teknis (objektif) dan integritas tak boleh kompromis soal keselamatan mutu, sekalipun ditekan sentimen publik.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Dengan takzim saya terangkan parameter teknokratik mengapa bangunan wajib tak lolos seleksi terkait standar jaminan nyawa di waktu masa rawan datang, serta memberikan rujukan poin revisi bangunan demi memperhalus rasa kekecewaan pimpinan desa itu lalu lapor komprehensif logis di pusat tertulis sahih', true, 5),
  (q_id, 'Berdiplomasi mencari pembenaran argumentatif celah agar laporan kualitasnya diloloskan dengan tanda kutip "bersyarat peringatan pemakaian", sekedar tidak mengundang murka desa terhina, dan proyek tak tercap mangkrak kotor di kementerian atasan jajaran dewan menteri bergengsi raya besar megah merakyat sentosa tentram gilang itu jua niscaya tercatat', false, 4),
  (q_id, 'Menerima dan ACC langsung saja karena kasat mata struktur dindingnya lumayan kokoh, sementara ketetapan standar di koran ISO dari pusat barat itu agaknya berlebih ukuran tebal lebay tak disesuaikan buat pemakaian orang dusun pelosok biasa sekalian meringankan penderitaan perombakan paksa dan pemborosan ulangan budget berlipat-lipat mencekik kas bendahara desa tercekik susah miskin meradang menderita kekurangan nutrisi dan malang peruntungannya menempuh perih nya dunia keras itu sendiri tanpa daya', false, 3),
  (q_id, 'Turut bersimpati menyesalkan kekurangan bahan itu, seraya mengundurkan diri sepihak di hari peninjauan tersebut, dan memilih minta digantikan sama staf verifikator senior berkarakter keji dan galak tanpa ampun agar dialah pihak yang bertikai bertabrakan frontal konfrontasi baku hantam sama gerombolan lurah ganas tak terpelajar yang mengerikan pemarah mengamuk menerkam siap mencabik di sana itu sendirian jauh dari bantuan keluarga dan rumah sejuk', false, 2),
  (q_id, 'Membegal laporan tersebut lalu merumuskan sebuah kesepakatan kelabu, bahwasanya mereka cukup membayarkan secarik fee kompensasi risiko kecelakaan di rekening dinas saya apabila ternyata kelak bendungan beton raksasa tebal itu runtuh tak sanggup mendobrak arus banjir sungai deras gemuruh', false, 1);

  -- Soal 12
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Atasan memiliki agenda sangat padat. Namun saat rapat krusial terkait kebijakan pemutusan bantuan langsung tunai kepada warga terindikasi kaya, beliau melempar ide mentah salah sasaran karena terburu-buru. Semua anggota komite membeo diam karena sungkan. Sebagai koordinator tim lapangan, profesionalisme Anda teruji dengan...', 'TKP', 'Profesionalisme', 'Profesionalisme',
   'Profesionalisme: Keberanian moral berargumen data ke atas (manage up), tak sekedar "Asal Bapak Senang" bila itu berakibat malpraktik pelayanan strategis.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Menginterupsi rapat secara santun dan memaparkan proyeksi simulasi tabel data ril dari survei, serta menawarkan jalan alternatif agar esensi ide beliau dapat termodifikasi tepat mengarah jitu dan valid tanpa menimbulkan blunder', true, 5),
  (q_id, 'Menahan masukan di forum agar muka atasan tak menanggung malu lalu mencoba menemuinya empat telinga setelah rapat membubarkan diri guna merombak kejanggalannya lewat pintu belakang koridor diam senyap dan merayu', false, 4),
  (q_id, 'Diam setuju lalu saya laksanakan, apabila ada kekecewaan keluhan warga akan menjadi porsinya sendiri kelak karena keputusan eksekutif absolut ditanggung pejabat eselon satu yang memiliki pangkat tinggi beserta konsekuensi dari takdir naas perbuatan semborno dia yang bergegas tak hati-hati merenung itu tadi di depan sidang paripurna bergengsi', false, 3),
  (q_id, 'Dalam bisu, secara sengaja menghambat penjalanan sistem arahan pelik tersebut seolah olah jaringan komputer teknis tengah menderita korup, agar implementasi di lapangannya urung berjalan sebelum ralat revisi yang lebih benar ditelurkan menteri esok tiba cerah kembali menyinari fajar senyum para kaum tertindas itu kembali', false, 2),
  (q_id, 'Maju menyuarakan kritik blak-blakan serta menyudutkannya lantaran keteledoran dan tergesanya ini tidak etis mencoreng profesinya sebagai direktur jempolan bertaraf pakar, karena kebenaran absolut sejati di atas segalanya walau sanksinya mutlak tak terperi di skorsing turun dari eselon biro ini selamanya ke jurang merana', false, 1);

  -- Soal 13
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Anda memiliki kebiasaan pribadi perfeksionis, sering terperinci dalam mengerjakan tugas ringan sampai menyita porsi berlama-lama (over-analyzing). Di posisi baru nan menuntut kecepatan respon administrasi masif (hi-volume task), tuntutan ini berbenturan dengan karakter asli kelambatan presisi. Bagaimana Anda profesional?', 'TKP', 'Profesionalisme', 'Profesionalisme',
   'Profesionalisme: Mampu beradaptasi / mengubah style gaya kerja personal demi memenuhi tujuan spesifik instansi terlepas watak asli yang kaku perfeksionis.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Melatih adaptasi berorientasi pada ketepatan utama dan kecepatan, serta mengurangi kebiasaan hiperdetail yang kurang krusial agar standar volume kuantitatif instansi terselesaikan dengan sempurna yang proporsional efisien cerdas matang lekat cepat padat tepat guna dan mumpuni tak bercacat cacat esensialnya', true, 5),
  (q_id, 'Menerima masukan teguran, tapi menegaskan bahwa mutu dan detail sempurna tidak pernah bisa kilat sehingga menuntut bos bersabar atau memaklumi rapor pengerjaan mingguan saya selalu terlampau menabrak tenggat jauh ke belakang dari teman saya yang kerjanya asal slesai cepat berantakan namun tertutupi kuantitas melimpah banyak mempesona semu', false, 4),
  (q_id, 'Saya paksa ngebut saja sampai standar kesalahan ejaan wajar merajalela asalkan jumlah dokumen tersaji purna untuk menuntut kesenangan instansi dan memperoleh rating hijau memanjakan karir diri sekadar lepas tanggung jawab formal semata untuk pamer di mata dewan inspektur perumus gajian bulanan menaikkan insentif tunjangan prestasi membengkak tajam', false, 3),
  (q_id, 'Segera mengajukan diri untuk dimutasikan di devisi litbang riset strategis saja di mana gaya kerja teliti membedah rumit secara mendalam sejalan sesuai selera genetis pribadi sayayang mulia tak terburu murahan diburu jarum waktu sempit menyiksa saraf kepala dan otak pusing tujuh keliling bertambah uban menua tanpa senyum membahagiakan diri saya pribadi di usia senja', false, 2),
  (q_id, 'Tetap memegang teguh idealis perfeksionis lambat itu secara saklek dan radikal keras pendirian lantaran birokrasi ini wajib dipaksa berubah standar kualitasnya menuju kelas wahid dunia internasional menyetarai mesin roket terhebat yang tak membiarkan debu bertebaran sekalipun bos murka menatap kinerja siput lelet parah tak memuaskan ini setiap fajar mentari bersinar tajam menusuk kalbu nurani di gedung megah tersebut selamanya kaku', false, 1);

  -- Soal 14
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Anda harus mengambil keputusan untuk menjatuhkan saksi pemecatan indisipliner pada staff terbaik dan kesayangan direktur karena ia telah melanggar SOP manipulasi data serius berdasar sidang komite yang Anda ketuai. Direktur memberi sinyal halus untuk melembek dan mereduksinya jadi teguran skors. Integritas dan keprofesionalan Anda diadu.', 'TKP', 'Profesionalisme', 'Profesionalisme',
   'Profesionalisme: Integritas tinggi, kepatuhan prosedural, dan menahan tekanan intervensi kepentingan sepihak atasan yang tidak sejalan kode etik hukuman disiplin ASN secara sah.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Menolak petunjuk samar tersebut melalui pembacaan tegas hasil telaah sidang komite yang berlandaskan kode etik instansi netral seadilnya demi integritas sistem lantas menanggung risikonya secara luhur dan siap mempertanggungjawabkan putusan itu pada majelis inspektorat kehormatan negara', true, 5),
  (q_id, 'Mencoba mengakomodasi arahan komandan dengan merumuskan pasal sanksi kompromistis di area abu-abu demi menghindari permusuhan vertikal atasan dan mempertahankan jabatan yang masih lapang mempesona untuk direngkuh karir panjang yang cerah cemerlang bagi sanak famili kesejahteraan jua di masa merengkuh tua bahagia pensiun dini santai tenteram damai mempesona', false, 4),
  (q_id, 'Secara mendadak mundur sebagai pemimpin mahkamah pengawas saat itu jua seraya menyerahkan putusan di tangan rekan agar bukan tangan saya yang meloloskan pengkhianatan intervensi nepotisme menjijikkan birokratis ini berlalu mulus sempurna tanpa noda pada raport karir cemerlang peribadi kesucian diri luhur yang terjaga paten selama ini dengan susah payah penuh kepedihan menderita pedih merana dan sebagainya di sudut sepi itu', false, 3),
  (q_id, 'Mempublikasikan memo ancaman direktur itu ke forum netizen jagat daring anonim untuk menjatuhkan wibawa rezim pimpinan yang kotor cacat moral membela penjilat itu agar hukuman rakyat di ranah sosial lebih mematikan meremukkan wibawanya seraya membalas dendam kesumat yang bergetar mengharu biru ini tanpa memedulikan etika institusi tatanan internal yang mewajibkan tertutup rahasia di dalam benteng dinding markas ini selamanya tak bertepi itu', false, 2),
  (q_id, 'Patuh melaksanakan pengampunan titipan tersebut dan memanipulasi putusan sidang komite semulus kilat mengatasnamakan diskresi pimpinan eksekutif mutlak agar saya dapat dipinang masuk gerbong kekuasaan beliau kelak di masa depan memperoleh previlese tak tergantikan sepanjang sisa hidup perabdi negara berkutat dalam pusaran suap berkarat murahan melimpah kekayaan material berlimpah gemilang menjulang mentereng mempesona membahagiakan diri mandiri asyik sendiri sejahtera', false, 1);

END $$;
