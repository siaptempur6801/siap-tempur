-- =============================================
-- Seed: TKP - Teknologi Informasi dan Komunikasi (14 Soal)
-- =============================================
DO $$
DECLARE
  q_id uuid;
BEGIN
  -- Soal 1
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Sistem pelaporan di divisi Anda baru saja beralih ke aplikasi digital yang sepenuhnya baru. Anda belum pernah menggunakan aplikasi serupa sebelumnya. Sikap Anda...', 'TKP', 'Teknologi Informasi dan Komunikasi', 'Teknologi Informasi dan Komunikasi', 'TIK: Menunjukkan sikap adaptif, kemauan tinggi untuk belajar teknologi baru secara mandiri demi efisiensi kerja.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Segera mempelajari buku panduan atau video tutorialnya, serta mencoba fitur-fiturnya secara mandiri hingga menguasai', TRUE, 5),
    (q_id, 'Meminta atasan atau rekan kerja yang sudah paham untuk memberikan pelatihan singkat kepada saya dan tim', FALSE, 4),
    (q_id, 'Mencoba-coba aplikasi tersebut perlahan sembari menyelesaikan rutinitas pekerjaan harian yang masih prioritas', FALSE, 3),
    (q_id, 'Menunggu hingga ada sosialisasi resmi dari bagian IT kantor sebelum berani menggunakan aplikasi baru itu', FALSE, 2),
    (q_id, 'Tetap menggunakan format pelaporan manual yang lama sampai saya merasa benar-benar siap dan mahir merubah kebiasaan', FALSE, 1);
  -- Soal 2
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Saat memeriksa email kantor, Anda menerima sebuah tautan misterius yang diklaim sebagai pembaruan profil kepegawaian dari alamat email yang menyerupai nama bagian kepegawaian. Anda...', 'TKP', 'Teknologi Informasi dan Komunikasi', 'Teknologi Informasi dan Komunikasi', 'TIK: Kesadaran keamanan siber (cybersecurity awareness) terhadap potensi phishing/social engineering.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Tidak mengkliknya, lalu langsung mengonfirmasi keaslian email tersebut dengan menghubungi bagian kepegawaian dan IT Security secara resmi', TRUE, 5),
    (q_id, 'Mengabaikan dan langsung menghapus email tersebut untuk menghindari risiko keamanan siber di komputer yang saya gunakan', FALSE, 4),
    (q_id, 'Meneruskan email tersebut ke grup WhatsApp divisi untuk bertanya apakah ada rekan lain yang mendapat tautan serupa', FALSE, 3),
    (q_id, 'Membuka tautan tersebut untuk melihat sekilas isinya, namun berhati-hati agar tak memasukkan password atau data privasi', FALSE, 2),
    (q_id, 'Segera mengisi formulirnya karena khawatir akan ketinggalan pembaharuan kepegawaian yang bisa berakibat buruk pada gaji bulan ini', FALSE, 1);
  -- Soal 3
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Atasan meminta Anda dan rekan lainnya yang lebih senior untuk merangkum data bulanan. Anda menggunakan software perumus otomatis Excel yang canggih sehingga selesai dalam 1 jam, sementara rekan senior masih menghitung manual. Anda akan...', 'TKP', 'Teknologi Informasi dan Komunikasi', 'Teknologi Informasi dan Komunikasi', 'TIK & Jejaring Kerja: Membantu dan mentransfer ilmu teknologi (knowledge transfer) ke rekan untuk efisiensi bersama.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Membantu merangkumkan sisanya, lalu dengan sopan mengajarkan cara penggunaan rumus canggih tersebut padanya agar ke depannya kerja ia lebih mudah', TRUE, 5),
    (q_id, 'Menyerahkan hasil pekerjaan saya, kemudian membantu mengerjakan laporannya agar tim kami dapat selesai bersamaan dan dipuji atasan', FALSE, 4),
    (q_id, 'Merekomendasikan senior tersebut agar mengikuti kursus pelatihan komputer guna menunjang produktivitas kerjanya', FALSE, 3),
    (q_id, 'Membialkannya bekerja sambil saya mengambil istirahat, sebab menggunakan cara yang berbeda adalah hak masing-masing pegawai', FALSE, 2),
    (q_id, 'Segera melaporkan hasil kerja saya yang fantastis tersebut pada pimpinan untuk mempertegas keunggulan kinerja saya ketimbang si senior', FALSE, 1);
  -- Soal 4
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Dalam rangka work from home (WFH), tim Anda diharuskan menggunakan aplikasi video conference yang memboroskan kuota dan jaringan bagi rekan yang tinggal di pedalaman. Sebagai inisiator rapat, Anda...', 'TKP', 'Teknologi Informasi dan Komunikasi', 'Teknologi Informasi dan Komunikasi', 'TIK: Penggunaan TIK yang inklusif, bijak, dan disesuaikan dengan limitasi resource anggota (low bandwidth alternatives).')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Menyesuaikan agenda, mengganti dengan aplikasi berbasis audio/teks untuk rapat harian, dan video hanya untuk momen esensial/presentasi', TRUE, 5),
    (q_id, 'Menyarankan rekan tersebut mematikan fitur kameranya agar lebih ringan namun ia tetap harus menyimak interaksi layar utuh tim', FALSE, 4),
    (q_id, 'Meminta atasan mengganti uang subsidi internet rekan tersebut atau mentransfer pulsa padanya agar kualitas rapat terjaga optimal', FALSE, 3),
    (q_id, 'Merekomendasikan ia untuk mencari perpustakaan, kafe, atau balai desa terdekat yang memiliki akses Wi-Fi memadai demi profesionalitas kerja', FALSE, 2),
    (q_id, 'Tidak mengubah sarana apa pun dengan dalih aturan kantor sudah baku, dia hanya perlu menyimak kesimpulan rapat via notula nanti', FALSE, 1);
  -- Soal 5
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Sebuah dokumen draf peraturan penting yang belum dirilis resmi tak sengaja tersebar meluas di berbagai grup WhatsApp karena seorang staf salah mengirimkan (salah kamar). Sebagai rekan kerjanya, yang pertama kali Anda lakukan adalah...', 'TKP', 'Teknologi Informasi dan Komunikasi', 'Teknologi Informasi dan Komunikasi', 'TIK: Manajemen insiden keamanan informasi, quick response untuk mitigasi atau menghapus pesan (recall).')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Segera menginstruksikan staf tersebut menggunakan fitur "Delete for Everyone", lalu melaporkan insiden kepatuhan ini secara berjenjang pada atasan', TRUE, 5),
    (q_id, 'Berusaha menghubungi ketua-ketua admin grup tersebut agar anggota dilarang mendownload dan segera menghapus draf tersebut dari memori gadget masing-masing', FALSE, 4),
    (q_id, 'Mengingatkan staf tersebut untuk menyegerakan permintaan maaf dan klarifikasi bahwa draf tersebut salah kirim secara terbuka pada grup WhatsApp tersebut', FALSE, 3),
    (q_id, 'Membiarkan insiden tersebut sebagai pembelajaran bagi sang staf yang ceroboh itu karena sudah terlanjur beredar dan agak mustahil dapat dicegah sepenuhnya', FALSE, 2),
    (q_id, 'Mencopot posisi pegawai tersebut secara definitif untuk meredam kekacauan persepsi draft yang telah viral dan merugikan reputasi lembaganya', FALSE, 1);
  -- Soal 6
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Keluarga meminta bantuan Anda mengurus usaha jualan tokonya yang menurun jauh dari sisi omzet. Anda sendiri bekerja penuh waktu, namun Anda menyadari potensinya. Solusi apa yang Anda berikan dari sudut pandang saat ini?', 'TKP', 'Teknologi Informasi dan Komunikasi', 'Teknologi Informasi dan Komunikasi', 'TIK: Memanfaatkan e-commerce / digital marketing untuk scale up usaha tanpa selalu harus full-time di toko fisik.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Membantu mereka menyiapkan sistem penjualan e-commerce dan strategi media sosial sederhana yang bisa dikelola dari rumah', TRUE, 5),
    (q_id, 'Menyarankan usaha itu diviralkan saja dengan menyewa seorang pemengaruh/influencer regional terlepas dari biaya promosinya', FALSE, 4),
    (q_id, 'Membekali mereka dengan tutorial pengemasan produk yang mempesona bila dijual secara daring', FALSE, 3),
    (q_id, 'Menjanjikan sokongan finansial untuk membayar sewa lapaknya apabila ternyata jualan tersebut tak kunjung mendatangkan arus profit', FALSE, 2),
    (q_id, 'Memohon maaf penuh penyesalan karena status bekerja saya amat menyulitkan campur tangan fisik ke tokonya tersebut secara langsung', FALSE, 1);
  -- Soal 7
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Anda menemukan sebuah artikel viral di media sosial yang menjelek-jelekkan instansi Anda berdasarkan data yang dipelintir maknanya (hoaks). Sikap Anda sebagai ASN instansi tersebut...', 'TKP', 'Teknologi Informasi dan Komunikasi', 'Teknologi Informasi dan Komunikasi', 'TIK: Literasi digital, menyikapi hoaks dengan prosedur bijak (klarifikasi terpusat), tidak defensif serampangan di kolom komentar.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Meneruskan temuan hoaks tersebut ke bagian Humas/Kominfo instansi agar segera dibuatkan rilis klarifikasi resmi dan counter-narasi berupa fakta sesungguhnya', TRUE, 5),
    (q_id, 'Membuat klarifikasi rinci di akun media sosial pribadi saya disertai lampiran bukti-bukti valid untuk meluruskan persepsi pembaca yang sudah termakan artikel palsu', FALSE, 4),
    (q_id, 'Melakukan report akun pembuat artikel tersebut beramai-ramai dengan tim agar konten tersebut ditumbangkan oleh pihak platform sesegera mungkin', FALSE, 3),
    (q_id, 'Turut membalas satu demi satu secara argumentatif kolom-kolom komentar negatif yang membanjiri feed untuk menjernihkan persepsi netizen saat itu juga', FALSE, 2),
    (q_id, 'Mengesampingkannya karena menganggap kabar viral akan surut dengan sendirinya digantikan tren kabar miring selebritas yang lebih baru', FALSE, 1);
  -- Soal 8
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Divisi Anda memutarbalikkan sistem presensi sidik jari yang usang dengan sistem face recognition smartphone dan geo-tagging (GPS). Hal ini menimbulkan kepanikan dari pegawai tua. Langkah konkrit Anda?', 'TKP', 'Teknologi Informasi dan Komunikasi', 'Teknologi Informasi dan Komunikasi', 'TIK: Membantu implementasi digital change management terhadap gap teknologi.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Berinisiatif membuat panduan bergambar/video super gampang, lalu mendampingi satu per satu registrasi awal mereka dengan sabar', TRUE, 5),
    (q_id, 'Mengusulkan kelonggaran masa transisi sambil memastikan helpdesk IT siap turun tangan penuh mendata mereka tiap pagi buta', FALSE, 4),
    (q_id, 'Menebar arahan berupa prosedur registrasi berukuran jumbo pada papan pengumuman absensi masuk yang bisa dicerna perlahan', FALSE, 3),
    (q_id, 'Mempersiapkan diri bila seandainya para senior gagal absen agar sayalah yang nanti rutin melakukan pelaporan absensi wakil mereka di sistem HR', FALSE, 2),
    (q_id, 'Mendiamkannya supaya alam seleksi sendiri, nanti mereka akan bisa karena dituntut takut gajinya dipotong', FALSE, 1);
  -- Soal 9
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Kantor Anda menggunakan cloud drive bersama untuk menyimpan file-file departemen. Anda sadar susunan folder di sana sangat kacau sehingga siapa pun susah mencari laporan tertentu, yang sering berujung menyalahkan Anda. Anda akan...', 'TKP', 'Teknologi Informasi dan Komunikasi', 'Teknologi Informasi dan Komunikasi', 'TIK: Manajemen data (Data Management / Information Architecture) yang tertib, efektif, dan mengefisienkan tim.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Menata ulang hierarki folder, membuat standar penamaan file (naming convention), lalu mensosialisasikannya ke seluruh anggota departemen', TRUE, 5),
    (q_id, 'Membersihkan file ganda/sampah seorang diri saat senggang agar cloud berjalan cepat kendati strukturnya masih membingungkan', FALSE, 4),
    (q_id, 'Membuat shortcut / bookmark khusus file-file primer agar setidaknya atasan mudah menarik dokumen laporan rutin saja', FALSE, 3),
    (q_id, 'Memisahkan folder eksklusif bagi hasil kerjaan saya seorang yang ditata mandiri dengan perlindungan password tersendiri', FALSE, 2),
    (q_id, 'Tergantung pada memori ingatan kapan dan dimana berkas disimpan sewaktu atasan bertanya mencarinya dengan kelabakan', FALSE, 1);
  -- Soal 10
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Atasan memiliki agenda padat sehingga sulit Anda jumpai fisiknya guna membahas disposisi laporan harian. Menyesuaikan era 4.0, Anda akan...', 'TKP', 'Teknologi Informasi dan Komunikasi', 'Teknologi Informasi dan Komunikasi', 'TIK: Komunikasi digital yang efisien, responsif, paperless untuk produktivitas.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Membuat dashboard monitoring kerja sederhana menggunakan spreedsheet kolaboratif/cloud agar beliau bisa menyisir progres di manapun lewat gawai selulernya', TRUE, 5),
    (q_id, 'Merutinkan pengiriman email summary eksekutif yang gampang dibaca menjelang ia pulang beraktivitas di malah harinya', FALSE, 4),
    (q_id, 'Mengirim berkas penting berformat PDF lewat pesan WhatsApp asalkan koneksinya masih satu jaringan korporat terenkripsi penuh', FALSE, 3),
    (q_id, 'Mensiasati menunggunya dengan sabar di beranda loby ruangannya walau hal itu membuat urusan jam kantor saya menjadi lebih lama selesainya', FALSE, 2),
    (q_id, 'Mencetaknya menumpuk berkas harian itu dan meletakkannya rutin tiap malam di meja kerjanya walau atasan urung mengoreksinya saat itu juga', FALSE, 1);
  -- Soal 11
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Anda diamanahkan untuk mempublikasikan capaian kantor per empat wulan. Namun budget yang diberikan amat sangat minim untuk menyewa media cetak maupun agensi desainer. Cara yang akan Anda tempuh?', 'TKP', 'Teknologi Informasi dan Komunikasi', 'Teknologi Informasi dan Komunikasi', 'TIK: Efektivitas teknologi/multi platform untuk publikasi gratis atau low budget.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Menggunakan template desain gratis populer untuk membuat postingan yang menarik secara visual dan merilisnya secara masif lintas semua media sosial official instansi', TRUE, 5),
    (q_id, 'Berupaya membuat buletin digital simpel berformatkan dokumen umum kemudian disebar via blast email ke database seluruh stakeholder terkait saja secara lugas', FALSE, 4),
    (q_id, 'Mengorganisir semacam rilis laporan ringan lalu mendistribusikannya sebagai pesan berantai (broadcast) ke seluruh list kontak pemangku kebijakan krusial', FALSE, 3),
    (q_id, 'Membuat laporan cetak biasa dengan layout sangat sederhana hasil fotokopian mesin kantor seadanya yang dipajang di lobi resepsionis semata demi pangkas bujet', FALSE, 2),
    (q_id, 'Memboikot instruksi pimpinan karena budget seret dan enggan menanggung cacat nama lantaran mutu promosi dianggap rendah di kacamata rakyat', FALSE, 1);
  -- Soal 12
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Anda menemukan sebuah celah (bug) pada aplikasi pelaporan data nasional yang memudahkan seseorang melakukan pengisian dummy/palsu. Aplikasi ini dikerjakan oleh vendor eksternal namun digunakan harian oleh Anda. Anda...', 'TKP', 'Teknologi Informasi dan Komunikasi', 'Teknologi Informasi dan Komunikasi', 'TIK: Sikap proaktif menjaga integritas sistem (bug reporting) alih-alih memanfaatkan / menyebarkannya.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Menghentikan eksperimen pemakaian bug itu, merekam buktinya dalam bentuk kronologis screenshoot, dan segera melapor secara resmi pada atasan serta support IT', TRUE, 5),
    (q_id, 'Berinisiatif mengirim pesan email atau laporan cacat perangkat lunak itu secara langsung tersembunyi demi kerahasiaan menutupi aib pada bagian programmer instansi terkait itu', FALSE, 4),
    (q_id, 'Berbagi pengetahuan itu hanya dengan kawan kolega seperjuangan dengan imbauan tegas mewanti-wanti menghindari kecerobohan mengisi formulir salah tersebut', FALSE, 3),
    (q_id, 'Berdiam diri saja karena hal itu murni ranah dan tanggung jawab vendor pihak ketiga tersebut, jika bocor negara menyalahkan mereka semata, bukan institusi lokal kita', FALSE, 2),
    (q_id, 'Menggunakan celah tersebut sementara waktu ini guna mengakselerasi input data harian yang memusingkan hingga aplikasinya resmi diperbaiki ulang pusat nanti', FALSE, 1);
  -- Soal 13
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Dalam grup Telegram dinas yang berisikan semua staf dan pihak manajerial eselon atas, sesama staf Anda terjerumus dalam sebuah argumen bernada kasar karena selilih faham kecil urusan cuti. Anda yang menyaksikan keributan ini sebaiknya...', 'TKP', 'Teknologi Informasi dan Komunikasi', 'Teknologi Informasi dan Komunikasi', 'TIK & Etika Digital: Menjaga profesionalisme di grup kantor (Netiquette); melerai secara etis.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Mengirim "Private Message" (PM) kepada keduanya, mengingatkan dengan asertif untuk memindahkan konflik pribadinya ke ranah DM demi kehormatan mereka di mata pimpinan', TRUE, 5),
    (q_id, 'Menyarankan dalam grup agar menahan emosi karena dapat terpantau jejak digitalnya oleh atasan tertinggi yang berada membisu dalam lingkaran grup tele tersebut', FALSE, 4),
    (q_id, 'Menjadi juru damai yang menyuruh keduanya stop mengetik, serta segera mencarikan sudut pandang terang atas pangkal silang sengketa cuti tersebut tanpa memihak mereka', FALSE, 3),
    (q_id, 'Sebagai administrator yang berwenang, saya menggunakan hak terhormat dengan menendang paksa (kick) kedua partisipan secara definitif dari percakapan publik tersebut selamanya', FALSE, 2),
    (q_id, 'Diam menyimak saja seolah bukan urusan diri saya selagi nama pangkat serta kinerja tidak terbawa campur-baur dalam prahara receh drama kantoran semacam kasus ini', FALSE, 1);
  -- Soal 14
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Bulan depan, penerapan tandatangan elektronik (Digital Signature) tersertifikasi akan menjadi kewajiban mutlak buat seluruh dokumen keluaran instansi. Banyak rekan Anda pesimis mengingat ke-gaptekan yang mengakar. Sikap Anda?', 'TKP', 'Teknologi Informasi dan Komunikasi', 'Teknologi Informasi dan Komunikasi', 'TIK: Menjadi agen perubahan (change agent) dalam adopsi teknologi.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Menanamkan mindset optimisme soal keamanan dan benefit masifnya, seraya mempelopori pengajuan sertifikat mandiri sebagai teladan/tutorial tim sesama', TRUE, 5),
    (q_id, 'Mempersiapkan segala dokumen administrasi digital tim secara kolektif demi mempermudah kelancaran pendirian hak aksestabilitas sandi persandian teman lainnya terjamin mulus ke depan', FALSE, 4),
    (q_id, 'Mempelajarinya sungguh di rumah secara autodidak penuh demi menyelamatkan otoritas dan kepentingan berkas laporan dari divisi di bawah kehendak nama sayalah pribadi', FALSE, 3),
    (q_id, 'Melapor pada unsur birokrasi penjaminan guna memohon penundaan tenggat penerapan mengingat kondisi kepanikan dan kompetensi para pimpinan struktural senior mumpuni seadanya', FALSE, 2),
    (q_id, 'Bersikap tak acuh atas fenomena kecemasan karena instrumen TTD itu adalah murni ranah privat di gawai pintar yang sudah patut melekat pada kompetensi wajib mandiri ASN kini', FALSE, 1);

END
$$;
