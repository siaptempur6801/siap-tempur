-- =============================================
-- Seed: TKP - Anti-Radikalisme (16 Soal)
-- =============================================
DO $$
DECLARE
  q_id uuid;
BEGIN
  -- Soal 1
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Di lingkungan tempat tinggal Anda, ada seorang warga baru yang sangat tertutup dan sering mengadakan pengajian kecil pada malam hari yang isinya terdengar sering menjelek-jelekkan ideologi Pancasila dan pemerintah sah. Sikap Anda?', 'TKP', 'Anti-Radikalisme', 'Anti-Radikalisme',
   'Anti-Radikalisme: Kesadaran melapor ke pihak berwenang (RT/RW/Aparat) secara objektif tanpa main hakim sendiri ketika menemukan indikasi ancaman ideologi negara.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Melaporkan kecurigaan dan hasil pengamatan saya secara diam-diam dan objektif kepada Ketua RT/RW dan Bhabinkamtibmas/aparat berwenang untuk ditelusuri lebih lanjut', true, 5),
  (q_id, 'Mengingatkan warga baru tersebut secara langsung dengan baik-baik agar tidak menyebarkan kebencian terhadap negara di lingkungan kami karena berpotensi melanggar hukum', false, 4),
  (q_id, 'Mengajak warga lain untuk memantau terus aktivitasnya dan melakukan penggerebekan massal jika terbukti ada makar agar kampung aman dari teroris', false, 3),
  (q_id, 'Membiarkan saja karena urusan keyakinan dan diskusi di rumah pribadinya adalah hak asasi setiap warga negara yang bebas berpendapat', false, 2),
  (q_id, 'Menjauhi warga tersebut dan melarang keluarga saya untuk berinteraksi dengannya agar tidak tertular paham ekstremis yang membahayakan', false, 1);

  -- Soal 2
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Rekan kerja Anda di instansi pemerintahan sering membagikan artikel dan narasi di media sosial pribadinya yang secara jelas mendukung organisasi terlarang dan mendelegitimasi dasar negara Republik Indonesia. Anda akan...', 'TKP', 'Anti-Radikalisme', 'Anti-Radikalisme',
   'Anti-Radikalisme: ASN harus setia pada Pancasila. Menegur rekan secara etis atau melaporkan ke atasan jika indikasinya kuat melanggar sumpah ASN.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Mengamankan bukti unggahannya, memberi teguran persuasif sebagai sesama rekan, dan jika ia tetap membangkang, saya malaporkannya ke atasan/dewan etik instansi', true, 5),
  (q_id, 'Melaporkannya langsung kepada pimpinan agar ia segera diberikan sanksi berat karena sebagai ASN ia telah melanggar sumpah setia kepada Pancasila dan UUD 1945', false, 4),
  (q_id, 'Mengingatkannya dengan halus lewat pesan pribadi agar berhati-hati dalam bermedia sosial karena jejak digital ASN terus dipantau oleh instansi terkait', false, 3),
  (q_id, 'Membantahnya di kolom komentar postingan tersebut dengan argumen kebangsaan yang rasional agar publik tahu bahwa tidak semua ASN sepemikiran dengannya', false, 2),
  (q_id, 'Meng-unfollow atau memblokir akun media sosialnya karena saya tidak mau ikut berurusan jika suatu saat nanti ia diciduk aparat akibat postingannya itu', false, 1);

  -- Soal 3
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Sebuah kelompok masyarakat di daerah Anda menolak keras perayaan upacara bendera 17 Agustus dengan alasan bertentangan dengan keyakinan kelompok mereka. Anda bertugas sebagai aparat desa di sana. Langkah Anda?', 'TKP', 'Anti-Radikalisme', 'Anti-Radikalisme',
   'Anti-Radikalisme: Melakukan pendekatan persuasif, edukasi wawasan kebangsaan, dan penegakan supremasi hukum yang humanis.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Menggandeng tokoh agama dan aparat keamanan untuk berdialog persuasif dengan kelompok tersebut mengenai makna nasionalisme yang tidak bertentangan dengan agama', true, 5),
  (q_id, 'Bersama aparat keamanan membubarkan paksa setiap upaya provokasi mereka untuk memboikot acara sakral kemerdekaan Republik Indonesia tercinta', false, 4),
  (q_id, 'Membiarkan kelompok tersebut tidak ikut upacara dengan syarat mereka tidak mengganggu jalannya upacara warga lain demi menghindari konflik berdarah di hari merdeka', false, 3),
  (q_id, 'Mewajibkan semua warga tanpa terkecuali untuk ikut upacara dengan ancaman pencabutan fasilitas administrasi desa bagi yang membangkang pada negara', false, 2),
  (q_id, 'Melaporkan kelompok tersebut ke pihak kepolisian atas tuduhan tindakan makar anti-Pancasila agar diproses sesuai undang-undang subversif yang berlaku tegak lurus', false, 1);

  -- Soal 4
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Di tengah diskusi santai istirahat makan siang, kawan karib Anda melontarkan pendapat bahwa mengganti ideologi negara ke sistem keagamaan tertentu adalah satu-satunya solusi atas terpuruknya ekonomi negara saat ini. Sikap Anda?', 'TKP', 'Anti-Radikalisme', 'Anti-Radikalisme',
   'Anti-Radikalisme: Konter wacana secara logis, asertif, mempertahankan Pancasila sebagai konsensus final bangsa tanpa langsung menuduh.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Menyanggah pendapatnya secara tenang, logis, dan asertif, menjelaskan bahwa Pancasila adalah konsensus final bangsa yang mampu mewadahi perbaikan ekonomi jika dijalankan konsisten tanpa perlu mengganti wadah negaranya', true, 5),
  (q_id, 'Menasihatinya secara pribadi agar tidak sembarangan melontarkan wacana ekstrem seperti itu di ranah publik kantor karena bisa disalahartikan sebagai bibit radikalisme', false, 4),
  (q_id, 'Berdiam diri dan mengalihkan pembicaraan ke topik cuaca atau pekerjaan untuk menghindari perdebatan sensitif yang dapat merusak persahabatan karib kami', false, 3),
  (q_id, 'Menyetujui sebagian pendapatnya tentang kerusuhan ekonomi namun menegaskan ketidaksetujuan soal penggantian dasar negara yang terlalu radikal konsekuensinya', false, 2),
  (q_id, 'Segera melaporkan diam-diam pembicaraan kawan saya itu ke Badan Intelijen Negara karena pikirannya sudah sangat berbahaya bagi kedaulatan NKRI', false, 1);

  -- Soal 5
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Anak Anda yang masih remaja bergaul dengan komunitas pemuda dari luar kota via game online, belakangan ia menunjukkan penolakan untuk menghormat bendera merah putih di sekolahnya karena doktrin baru dari teman mabar-nya. Reaksi Anda sebagai orang tua?', 'TKP', 'Anti-Radikalisme', 'Anti-Radikalisme',
   'Anti-Radikalisme: Proteksi keluarga inti dari radikalisme (deteksi dini), komunikasi empati, edukasi ulang tanpa hukuman fisik berlebih.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Mendekatinya secara empati, memutuskan akses komunikasi dengan komunitas tersebut pelan-pelan, lalu menanamkan kembali edukasi makna sejarah bendera dan perjuangan bangsa ke dalam dirinya secara sabar', true, 5),
  (q_id, 'Langsung mencabut semua akses gawai game online-nya dan menghukumnya keras agar doktrin anti-negara itu segera musnah dari pikirannya saat itu juga', false, 4),
  (q_id, 'Bekerjasama dengan pihak guru Bimbingan Konseling di sekolahnya untuk memberikan pencerahan terkait bahaya paham ekstremis pada remaja labil', false, 3),
  (q_id, 'Membiarkannya sebentar karena menganggap itu hanya fase labil pencarian jati diri remaja yang akan luntur dengan sendirinya seiring pertambahan usia dan nalar', false, 2),
  (q_id, 'Memaksa dia menonton film-film dokumenter peperangan kemerdekaan setiap hari sebagai bentuk cuci otak tandingan yang menumbuhkan rasa nasionalsmenya', false, 1);

  -- Soal 6
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Sebuah ormas yang berhaluan intoleran memaksakan diri mendaftarkan keabsahan hukum organisasinya di instansi perizinan tempat Anda bekerja, dengan kelengkapan syarat administratif yang secara kasat mata terpenuhi namun asas kegiatannya di duga membahayakan. Langkah Anda?', 'TKP', 'Anti-Radikalisme', 'Anti-Radikalisme',
   'Anti-Radikalisme: Bertindak profesional namun cermat terhadap potensi ancaman negara, melibatkan koordinasi lintas sektoral.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Menerima berkasnya secara profesional, mengkaji teliti asasnya, dan berkoordinasi dengan lembaga telik sandi/aparat keamanan sebelum atasan memberikan putusan persetujuan/penolakan berbasis undang-undang', true, 5),
  (q_id, 'Menolak secara frontal pada loket pelayanan saat itu juga dengan alasan integritas instansi karena ormas tersebut jelas terafiliasi rekam jejak makar', false, 4),
  (q_id, 'Memproses perizinannya sesuai prosedur loket administrasi reguler agar saya tidak dituduh bertindak sewenang-wenang melanggar UU Pelayanan Publik yang berlaku', false, 3),
  (q_id, 'Menahan berkasnya berlama-lama (di-pingpong) tanpa kejelasan hukum agar mereka menyerah dengan sendirinya mencabut pendaftaran secara sukarela', false, 2),
  (q_id, 'Menyarankan mereka agar merubah nama dan anggaran dasar ormasnya menjadi lebih nasionalis agar mudah diloloskan proses administrasinya kelembagaannya', false, 1);

  -- Soal 7
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Dalam ruang grup alumni sekolah, beberapa teman memposting tautan donasi ke sebuah lembaga kemanusiaan mancanegara yang kredibilitasnya sangat dicurigai mendanai kelompok pemberontak ekstremis di Timur Tengah. Sikap Anda?', 'TKP', 'Anti-Radikalisme', 'Anti-Radikalisme',
   'Anti-Radikalisme: Literasi donasi yang waspada pendanaan terorisme (CFT), mengedukasi lingkaran terdekat.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Menyertakan tautan berita kredibel di grup mengenai rekam jejak mencurigakan lembaga donasi tersebut, dan menyarankan teman-teman untuk menyalurkan amalnya lewat lembaga resmi pemerintah yang diaudit transparan', true, 5),
  (q_id, 'Mengirim pesan peringatan secara pribadi ke teman yang membagikan tautan agar segera men-take down pesan tersebut karena berpotensi terjerat UU Pemberantasan Pendanaan Terorisme', false, 4),
  (q_id, 'Diam dan mengabaikan pesan tersebut sembari tidak ikut berdonasi, biarlah mereka menanggung risikonya sendiri jika kelak diselidiki polisi atas aliran dana terlarang itu', false, 3),
  (q_id, 'Mengingatkan mereka di grup dengan bahasa pelan namun pasti bahwa sumbangan kemanusiaan tidak selayaknya nyasar ke tangan kelompok kombatan bersenjata di wilayah negara lain', false, 2),
  (q_id, 'Keluar segera dari grup (left group) karena tak ingin nama saya terbawa-bawa ke masalah serius jika suatu saat grup tersebut dibidik oleh aparat intelejen penyidik', false, 1);

  -- Soal 8
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Instansi Anda mewajibkan tes Wawasan Kebangsaan ulang bagi seluruh staf buntut dari penangkapan seorang pegawai oknum teroris. Mayoritas staf divisi Anda menolak keras karena merasa tes tersebut merendahkan intelektualitas mereka yang tak berdosa. Anda sebagai koordinator?', 'TKP', 'Anti-Radikalisme', 'Anti-Radikalisme',
   'Anti-Radikalisme: Mendukung kebijakan mitigasi radikalisme pemerintah/instansi, memberikan teladan, meredam resistensi bawahan.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Memberikan edukasi pemahaman bahwa tes ini adalah upaya mitigasi preventif sistemik dan perlindungan institusi, lalu menjadi orang pertama yang mendaftarkan tes tersebut sebagai teladan tanpa merasa tersinggung luhur jabatannya runtuh sedikitpun', true, 5),
  (q_id, 'Mewajibkan bawahan mematuhi instruksi atasan secara mutlak mengenai tes itu dengan ancaman sanksi tidak cairnya tunjangan jika berani memboikot kehendak negara membersihkan sel sel perusak', false, 4),
  (q_id, 'Mengusulkan kompromi kepada manajerial atas agar tes kebangsaan tersebut dibentuk formatnya lebih kekinian (seperti outbond atau dinamika kelompok) agar staff merasa nyaman tak bagai terdakwa diaudit ketat di depan interogator bengis', false, 3),
  (q_id, 'Turut bersimpati pada penolakan mereka, lalu mengirimkan delegasi nota keberatan tertulis kepada pimpinan terkait narasi stigmatisasi ASN berdosa masal yang berlebihan ini merugikan moral luhurnya pengabdian tiada tara cacat sela selama hayat dikandung badan raga sempurna nian di sana ini selamanya tanpa dosa fana', false, 2),
  (q_id, 'Mengerjakan tes saya secara sendirian menuruti atasan lantas mendiamkan pasif staf lain yang mogok sebagai pilihan merdeka hak absolut mereka atas resiko pribadi masing-masing menanggung hukuman mutasi atau pecat di ujung perjalanan nasibnya suram tanpa terang cahaya sama sekali itu', false, 1);

  -- Soal 9
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Saat Anda sedang makan siang di kantin umum, Anda tanpa sengaja menguping percakapan meja sebelah yang merencanakan penyerangan/teror bom fisik ke objek vital keesokan harinya dengan rinci. Langkah terukur dan profesional yang Anda ambil di detik itu?', 'TKP', 'Anti-Radikalisme', 'Anti-Radikalisme',
   'Anti-Radikalisme: Insting intelijen dasar (deteksi ancaman). Jangan gegabah, laporkan diam-diam tapi cepat aparat negara.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Mengingat detail wajah, percakapan, dan kendaraan mereka sebisa mungkin, segera berlalu menjauh dengan tenang, dan secepat kilat menelpon aparat keamanan (polisi/Densus) untuk pelaporan ancaman faktual mendesak negara yang sangat genting itu', true, 5),
  (q_id, 'Mengambil telepon pintar dan pura-pura bermain sosmed padahal memvideokan diam-diam meja sebelah untuk diserahkan ke markas kepolisian guna dijadikan rekaman barang bukti forensik mutlak', false, 4),
  (q_id, 'Dengan keberanian patriotik menegur mereka detik itu juga sambil menggebrak meja agar mereka ketakutan dan membubarkan diri batal memuluskan rencana biadab nista menghancurkan bangsa kemanusiaan secara keji tak bermoral sepeser pun', false, 3),
  (q_id, 'Membayar makanan secepatnya lalu lari ke kantor keamanan gedung melaporkan ada gerak gerik gahar orang aneh di meja kantin sebelah agar digeledah petugas sekuriti setempat', false, 2),
  (q_id, 'Berusaha berpikir positif dan mengenyampingkan prasangka menuduh, lantaran sangat mungkin itu hanya percakapan bocah iseng candaan belaka atau anak komunitas teater drama bersimulasi akting tegang, dan melanjutkan suapan lahap siang harinya menyantap hidangan lezat tersebut seketika lepas seiring angin berlalu ringan di sana semata tuntas paripurna', false, 1);

  -- Soal 10
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Anda memiliki bawahan ASN muda yang sangat pintar, berkinerja sempurna, luhur tanpa cacat, pilar utama divisi. Namun, akhir-akhir ini terpantau secara konsisten ia tidak pernah mau mengikuti perayaan hari nasional yang diwajibkan instansi, karena meyakini bahwa ritual semacam itu merupakan perbuatan dosa (intoleran pada nilai kenegaraan dasar). Bagaimana Anda membinanya?', 'TKP', 'Anti-Radikalisme', 'Anti-Radikalisme',
   'Anti-Radikalisme: Pembinaan berkelanjutan. Merekonsiliasi radikalisme laten yang bersembunyi di balik "prestasi dan integritas semu" seorang pegawai.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Melakukan pendekatan dialogis intensif secara mendalam perihal wawasan kebangsaan, bila ia bersikeras menolak nilai-nilai dasar NKRI tersebut, menyetorkan namanya ke jenjang pembinaan khusus ideologi instansi betapapun bagus kinerjanya menyumbang emas di departemen ini', true, 5),
  (q_id, 'Mengamankan rapor kinerjanya yang tinggi ekselen mempesona tersebut seraya memberikan dispensasi ketidakhadiran dalam apel negara secara diam senyap agar ia dapat menyumbang prestasi luar biasa berharga buat negara tanpa diganggu sentimen ideologi receh semata fana yang tak bernilai substansi riil pada perut rakyat di alam nyata sana ini sesungguhnya esensinya utama', false, 4),
  (q_id, 'Menberinya ultimatum keras: ubah pemikiran beracun anti negara itu seketika, atau dipaksa serahkan surat permohonan berhenti esok paginya tak bersela sepeser toleransi pada para kaum oposan kaku buta fanatik kelabu tegar membelot sistem perundangan pancasila di tanah asalnya ini selamanya utuh saklek', false, 3),
  (q_id, 'Membedah akar argumen spiritualitas pemikirannya itu dengan dalil logis kenegaraan perlahan perlahan sampai akalnya sadar lurus menemukan hidayah nasionalisme kembali seraya mempertahankan ia menjabat kursi pokok spesialis andalan proyek departemen tanpa menyentuh sanksi sedikitpun jua utuh berharga karirnya ke depan terang menderang membahagiakan keluarganya kelak merengkuh damai sejahtera', false, 2),
  (q_id, 'Mengisolasi tugas-tugas vital darinya dan memutasikan dirinya di tempat terpencil pojok tanpa panggung eksistensi guna mematikan pelan pelan sinar karir gemilangnya lantaran bibit pemikirannya sungguh menelan nalar mencirikan intoleransi sejati absolut parah di luar ambang batas sehat memilukan sungguh keji menohok dada patriot', false, 1);

  -- Soal 11
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Anda diundang oleh tokoh masayarakat senior dalam sebuah diskusi majelis. Dalam pembukaan, beliau secara halus namun persuasif memasukkan materi doktrin anti-pancasila sebagai solusi kemunduran moral masyarakat saat ini. Di sana banyak pemuda desa membeo takzim padanya. Anda?', 'TKP', 'Anti-Radikalisme', 'Anti-Radikalisme',
   'Anti-Radikalisme: Berani asertif memberikan narasi penyeimbang / counter, mencegah masyarakat awam / pemuda terdoktrin paham radikal di forum sosial.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Menyampaikan saran santun namun kritis, memaparkan bukti sejarah bahwa keluhuran nilai Pancasila telah secara sukses merawat keberagaman dan solusi kemunduran moral ada pada implementasi utuhnya, bukan meruntuhkan pondasi negara dasar kita yang luhur ini', true, 5),
  (q_id, 'Guna menjaga perasaan dan kewibawaan beliau, saya memilih bungkam dalam majelis namun berupaya mengumpulkan pemuda tadi esok harinya untuk menetralisir racun ideologi di sebuah acara karang taruna beda sesi', false, 4),
  (q_id, 'Beranjak pamit keluar dari majelis sesudahnya seketika untuk menegaskan pada masyarakat pendukungnya bahwa aparatur negara tidak mentolerir ceramah makar sekecil apapun sekalipun ia adalah sesepuh paling kharismatik di tanah leluhur itu mengayomi seluruh pelosok', false, 3),
  (q_id, 'Langsung mencatat isi provokasi tersebut rapi-rapi kemudian besok membawa bukti ini pada meja intelijen daerah komando untuk menetapkan tokoh itu ke dalam deretan pantauan subversif hitam pekat terlarang tingkat dewa mengkhawatirkan perongrong kedaulatan teguh merdeka republik', false, 2),
  (q_id, 'Menyimak mematung dengan patuh namun hati menolak mentah mentah semata mata untuk lolos dari intimidasi massa beliau yang fanatik reaktif dan radikal kaku tanpa otak tersebut memukuli wajah babak belur menderita perih menyebalkan di pelosok pedalaman yang minim akses bantuan pasukan militer bergegas lekas', false, 1);

  -- Soal 12
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Sebuah postingan di grup WhatsApp RT Anda berisi tautan petisi online untuk menutup tempat ibadah agama minoritas kecil di kampung sebelah dengan provokasi sentimen rasial yang kental. Ketua RT mendiamkan hal tersebut. Respon profesional Anda?', 'TKP', 'Anti-Radikalisme', 'Anti-Radikalisme',
   'Anti-Radikalisme: Counter aksi intoleransi, toleransi kehidupan beragama, menghargai kebhinekaan dalam hidup bermasyarakat.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Membalas postingan dengan argumen konstitusional UU Kebebasan Beribadah yang bijak tanpa menyerang individu, lalu menyarankan ketua RT merapikan aturan grup agar terhindar dari disinformasi ujaran kebencian berpotensi delik pidana berujung jeruji sel', true, 5),
  (q_id, 'Menelepon pihak aparat komando desa setempat seketika untuk meredam cikal bakal presekusi anarkis fisik ke tempat ibadah itu sebelum petisinya viral mengumpulkan ribuan emosi tak terkendali berparang meruncing tajam menyayat malam duka di perkampungan damai ini sirna sudah', false, 4),
  (q_id, 'Mengirim pesan pribadi ke penyebar tautan itu dan menganjurkannya menghapus petisi demi merawat toleransi tetangga berdampingan harmoni warisan nenek moyang walau itu tempat seberang kampung sekalipun merajut asa damai di nusantara merayakan rukun kasih saling mengasihi manusia seutuhnya ada bersaudara', false, 3),
  (q_id, 'Membalas sindiran kasar dengan kutipan ayat-ayat toleransi agar ia malu merasa disudutkan wawasannya lalu membiarkan ketua RT mengambil alih pertikaian wacana memanas di WAG itu seutuhnya sendirian mengatasi pusing kemelut ego warga fanatik tak bertoleransi rendah tak bermoral utuh luhur dan mulia sepeser nusa', false, 2),
  (q_id, 'Mengabaikan wacana bising tersebut karena yakin aksi di dunia maya seperti grup RT jarang sekali betul-betul berejawantah menjadi serangan massa konkret perusak rumah ibadah, selama saya pribadi fokus memupuk kerukunan di keluarga inti rumah tangga saya semata terhindar marabahaya nista kelam', false, 1);

  -- Soal 13
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Saat memeriksa hasil tes wawancara CPNS, Anda menemukan satu peserta berekspektasi kinerja teknis 100% sempurna mumpuni, namun di segmen wawasan kebangsaan ia jelas menyiratkan pesimisme parah dan kecenderungan menyetujui paham separatisme karena dendam perlakuan pemerintah masa lalu pada daerahnya.', 'TKP', 'Anti-Radikalisme', 'Anti-Radikalisme',
   'Anti-Radikalisme: ASN harus bersih dari bibit separatisme/radikalisme sejak tahap rekrutmen. Kompetensi tanpa loyalitas ideologi adalah berbahaya.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Merekomendasikan penolakan mutlak (tidak lulus) sebab nilai-nilai kesetiaan ideologi dan dasar NKRI merupakan prasyarat absolut yang tidak bisa ditawar oleh kompensasi kompetensi teknokrat manapun hebat jeniusnya di muka bumi nusantara berkedaulatan sah ini', true, 5),
  (q_id, 'Memberinya nilai memuaskan pada teknisnya lantas merendahkan porsi nasionalismenya agar ia tetap masuk cadangan lalu akan dikuliahkan wawasan kebangsaan masif kelak oleh pusat saat penataran dasar kepemimpinan birokrat terpadu asrama isolasi sebulan merengkuh jiwa patriotik tuntas merata wangi nian', false, 4),
  (q_id, 'Melimpahkan berkas kontroversial calon ini ke panitia penilai selektor eselon lebih atas guna divonis nasib murninya karena putusan menjatuhkan talenta terbaik negeri karena luka masa lampau hatinya bukan keputusan mudah dan saya tak tega mengambil porsi karma dosanya mutlak mematikan rezeki anak cemerlang pembebas kemiskinan sukunya mandiri brilian', false, 3),
  (q_id, 'Meloloskannya tersembunyi karena saya memaklumi dendam wilayahnya paska tragedi lampau lalu berencana menjadi mentor pribadinya menanamkan simpati sedikit demi sedikit melalui kedekatan lunak lembut pelan mempesona humanis memanusiakan agar ia mencintai ibukota pada akhirnya di ujung fajar terbenam syahdu nan merdu', false, 2),
  (q_id, 'Bekerjasama dengan aparat menelusur jaringan peserta pintar ini lantaran ucapannya membahayakan kursi birokrasi pemerintahan, sehingga jangan hanya ia tak lolos tapi dijebloskan juga sekalian meringkuk merana menanggung akibat membual berteriak kebohongan menyanjung pemberontak merusak integrasi mulia leluhur abadi pertiwi menawan berderai air mata merah darah', false, 1);

  -- Soal 14
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Anda menemukan literatur buku-buku lama yang berbau dukungan terhadap eks-organisasi partai paham komunis secara jelas di perpustakaan kantor milik instansi negara tempat Anda mengabdi, yang mana masih sesekali dipinjam abdi negara lain untuk referensi ringan.', 'TKP', 'Anti-Radikalisme', 'Anti-Radikalisme',
   'Anti-Radikalisme: Kurasi informasi publik di instansi pemerintah. Mencegah penyebaran ideologi terlarang sesuai aturan perundangan yang berlaku (Tap MPR tentang pembubaran faham tsb).') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Melaporkan temuan buku-buku terlarang tersebut secara proaktif kepada pimpinan dan pengelola pustaka agar dapat segera ditarik dari peredaran umum sesuai undang-undang larangan penyebaran ideologi tersebut dan mencegah paparan pemahaman sesat bawahan naif', true, 5),
  (q_id, 'Mengamankan secara diam pribadi menyembunyikan buku bacaan subversif itu ke gudang kardus berdebu tak terjamah di sudut belakang toilet kantor guna memastikan secara aman tak pernah tersentuh dan dibaca generasi anak magang hijau polos tanpa mencoreng menyibukkan rapat departemen terkait isu kecil perpustakaan minim pembaca kutu buku ini', false, 4),
  (q_id, 'Mengusulkan penambahan stempel merah bertuliskan "Hanya Untuk Referensi Historis" di sampul depannya kepada admin sehingga para pembaca tau menyikapinya sebagai masa lalu tanpa harus repot memusnahkannya menghilangkan arsip sejarah berbekas ini di bumi abadi kenangan kusam', false, 3),
  (q_id, 'Meminjam buku itu dan menyobek lembaran berisi doktrin krusial berbahaya, lalu mengembalikannya diam-diam bagaikan buku usang biasa rusak menua dimakan waktu purna tak berfungsi utuh menawan mencuci otak brilian nan perih itu sendirian tak ada yang tahu menderita sakit hati membaca nista derita komunisme sejati', false, 2),
  (q_id, 'Membiarkan peredaran literasi tersebut lantaran memilah milih bahan bacaan merupakan esensi kecerdasan manusia abad pencerahan di kampus birokrasi ini yang tidak selayaknya ditakut takuti hantu masa lawas kelam sejarah purba bertaruh letih lunglai tak jelas urusan tatanan buku tipis reyot dan usang tanpa makna berarti tajam pada perut berbunyi keras merdeka', false, 1);

  -- Soal 15
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Sebuah kebijakan pemerintah daerah menghapuskan kewajiban penggunaan atribut budaya nusantara di sekolah guna menuruti desakan ormas garis keras yang menilainya menyimpang dari moral absolut doktrin mereka. Sebagai pegawai dinas pendidikan yang cinta kearifan lokal, Anda...', 'TKP', 'Anti-Radikalisme', 'Anti-Radikalisme',
   'Anti-Radikalisme: ASN harus pro terhadap akar budaya nasional & kebhinekaan dalam birokrasi (tidak menyerah pada tekanan kelompok intoleran).') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Membuat telaah analisis kritis dan kajian ilmiah secara resmi kepada pimpinan mengenai urgensi melestarikan budaya nasional, serta memprakarsai petisi diskusi dialogis mempertemukan pihak ormas dengan budayawan dan dewan kependidikan demi mencapai titik temu yang moderasi', true, 5),
  (q_id, 'Mematuhi kebijakan tersebut secara formal agar kursi aman, tapi tetap mengenakan pakaian bernuansa budaya batik tiap saat inspeksi ke bawah agar anak sekolah tahu bahwa ASN masih peduli warisan kebesaran bhineka nusantara melampaui aturan tulisan fana pimpinan tak menentu itu menyebalkan pasrah sedih pedih lara meronta dalam dada diam bisu sepi tanpa kata kata', false, 4),
  (q_id, 'Menggelar kampanye viral dukungan membatalkan kebijakan tersebut lewat akun anonim media sosial agar tekanan massa arus mayoritas pro budaya memukul balik kekuatan paksaan ormas brutal ekstrem tersebut seraya bersembunyi rapi di lindungan profil tak bernama luhur mempesona mendoktrin generasi alpha beta menuntut keadilan tak pandang lelah letih letih nian merana itu semuanya tiada henti mendera bangsa terpuruk', false, 3),
  (q_id, 'Menasihati kepala sekolah di lingkungan dinas untuk secara mandiri memelintir kebijakan pemda dengan diam-diam mengadakan pentas seninya setelah jam pulang formal bubar sekolah tuntas agar ormas tak menyoroti curiga menciduk menekan menyiksa dan sebagainya lelah membatalkan niat mulia menjaga pilar sejarah pertiwi utuh sentosa tanpa cacat gila menderita nista malang itu sungguh pedih menakutkan horor muram', false, 2),
  (q_id, 'Menerimanya penuh kecewa karena takdir pimpinan lemah tunduk pada desakan preman jalanan lantas meminta mutasi keluar provinsi guna mencari nafas lega di instansi toleransi yang menjunjung nusa seutuhnya jauh di perbatasan ufuk pertiwi tercinta ini merajuk memendam duka kelam mendalam perih membara bagai terpercik bara api membakar jiwa muda patriotik luntur terhapus pasrah', false, 1);

  -- Soal 16
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Pada masa pemilihan jabatan manajerial publik, mencuat isu kampanye "Jangan pilih kandidat yang agamanya A, karena tidak murni mewakili identitas sakral lokal", diviralkan di grup internal instansi. Kandidat A adalah sosok paling berkompeten dan berintegritas dan murni WNI. Sikap Anda?', 'TKP', 'Anti-Radikalisme', 'Anti-Radikalisme',
   'Anti-Radikalisme & Nasionalisme: Menolak politisasi agama/SARA di rekrutmen jabatan; mendukung meritokrasi utuh sesuai semangat Pancasila.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Berusaha mencerahkan grup tersebut bahwa meritokrasi ASN menilai dari kecerdasan inovasi dan loyalitas kinerja tanpa membedakan sekat keyakinan amanat UUD dan mendukung A secara wajar hak suara murni saya kelak', true, 5),
  (q_id, 'Mengirim kritik terbuka di grup mengecam penyebaran narasi SARA rasis fanatik lalu keluar darinya guna tidak terbawa campur kotoran sentimen politik praktis kotor rendahan tak bermartabat di gedung suci birokrasi pemerintahan ini', false, 4),
  (q_id, 'Memantau perkembangan polemiknya dan mencatat id akun pelopor penyebar isu rasialis ini guna diserahkan kelak ke panitia komisi pengawas manakala proses pemilihan usai memenangkan siapapun figur pemimpin merengkuh kedamaian utuh sentosa jaya merdeka nusantara ini dan sebagainya bebas terlepas gencar tanpa menoleh kemurungan pahit pedih lelah sepi jua', false, 3),
  (q_id, 'Tidak terpancing debat retoris, namun tetap memilih A di bilik pemilihan lantas bersikap acuh tak acuh perihal kelakuan grup kolega fana semata karena manusia tak kuasa mengubah nurani gelap pekat kotoran dendam kesumat kebencian ideologis tak beralasan sama sekali mustahil utuh tersentuh nalar pemikiran akal sehat logika filsafat rasio barat atau timur sekalipun jaya raya menderita', false, 2),
  (q_id, 'Turut bersimpati pada pergerakan isu itu secara minor di ranah sosial warkop lantaran pemimpin berintitas lokal acap lebih mempermudah urus pelicin birokrasi internal berdalih pertemanan sesuku meskipun secara prestasi si juara A memang hebat mumpuni jempolan dewa penolong cerdas brilian mempesona tak tertandingi di abad milenium digital mutakhir modern mutlak fana memusingkan dan lain lain jua senyap meronta sendirian', false, 1);

END $$;
