-- =============================================
-- Seed: TWK - Bela Negara (12 Soal)
-- =============================================
DO $$
DECLARE
  q_id uuid;
BEGIN
  -- Soal 1
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Di bawah ini yang merupakan ciri utama dari sistem pertahanan dan keamanan rakyat semesta (Sishankamrata) yang dianut oleh Indonesia adalah...', 'TWK', 'Bela Negara', 'Bela Negara', 'Sishankamrata melibatkan seluruh warga negara, wilayah, dan sumber daya nasional lainnya secara aktif guna menghadapi ancaman.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Melibatkan seluruh komponen bangsa sesuai dengan peran dan profesinya masing-masing', TRUE, 5),
    (q_id, 'Mengandalkan persenjataan yang paling modern di kawasan Asia Tenggara', FALSE, 0),
    (q_id, 'Menyerahkan urusan keamanan sepenuhnya kepada prajurit TNI dan Polri', FALSE, 0),
    (q_id, 'Mewajibkan warga negara mengikuti wajib militer minimal tiga tahun', FALSE, 0),
    (q_id, 'Pusat komando pertahanan diserahkan kepada pihak asing agar netral', FALSE, 0);
  -- Soal 2
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Ancaman non-militer saat ini menjadi fokus kewaspadaan nasional karena dapat menghancurkan sendi kehidupan bangsa. Salah satu bentuk ancaman non-militer berdimensi ideologi adalah...', 'TWK', 'Bela Negara', 'Bela Negara', 'Ancaman ideologi berupa masuknya paham yang bertentangan dengan Pancasila, seperti liberalisme radikal, komunisme, atau radikalisme agama.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Masuknya paham radikalisme yang ingin mengganti dasar negara Pancasila', TRUE, 5),
    (q_id, 'Penyelundupan narkotika melintasi batas negara', FALSE, 0),
    (q_id, 'Impor barang-barang konsumsi secara besar-besaran', FALSE, 0),
    (q_id, 'Penyebaran hoaks untuk menimbulkan kepanikan akibat bencana alam', FALSE, 0),
    (q_id, 'Aksi spionase yang mencuri data rahasia pertahanan', FALSE, 0);
  -- Soal 3
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Bagi seorang pelajar atau mahasiswa, bentuk bela negara yang paling tepat dan esensial dalam kondisi negara yang damai (tidak sedang berperang) adalah...', 'TWK', 'Bela Negara', 'Bela Negara', 'Bela negara bukan hanya mengangkat senjata, melainkan sesuai profesi. Bagi pelajar, belajar dengan giat untuk berprestasi adalah bentuk nyata membela (membangun) negara.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Belajar dengan tekun dan mengukir prestasi untuk mengharumkan nama bangsa', TRUE, 5),
    (q_id, 'Ikut serta dalam latihan kemiliteran di bawah komando aparat setempat', FALSE, 0),
    (q_id, 'Patroli menjaga pos kamling setiap malam demi keamanan desa', FALSE, 0),
    (q_id, 'Melakukan unjuk rasa secara rutin untuk mengawasi kebijakan pemerintah', FALSE, 0),
    (q_id, 'Menjadi relawan perang di negara sekutu yang sedang berkonflik', FALSE, 0);
  -- Soal 4
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Pada UUD 1945 Pasal 27 ayat (3), diamanatkan bahwa "Setiap warga negara berhak dan wajib ikut serta dalam upaya pembelaan negara". Makna dari "berhak" secara konstitusional dalam konteks bela negara adalah...', 'TWK', 'Bela Negara', 'Bela Negara', 'Kata "berhak" berarti hak asasi dan kehormatan setiap warga untuk turut serta membela tanah airnya sesuai dengan kapasitas yang dimilikinya.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Negara tidak boleh melarang warga negara yang ingin berkontribusi sesuai profesinya', TRUE, 5),
    (q_id, 'Setiap warga negara mendapat bayaran layak jika mengikuti wajib militer', FALSE, 0),
    (q_id, 'TNI dan Polri harus membuka rekrutmen setiap saat', FALSE, 0),
    (q_id, 'Masyarakat boleh mempersenjatai diri secara mandiri jika merasa terancam', FALSE, 0),
    (q_id, 'Bela negara hanya dapat dilakukan jika warga negara tersebut setuju', FALSE, 0);
  -- Soal 5
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Sikap bela negara juga diwujudkan dengan menggunakan dan mencintai produk dalam negeri. Tujuan strategis secara nasional di balik sikap tersebut adalah...', 'TWK', 'Bela Negara', 'Bela Negara', 'Mencintai produk dalam negeri memperkuat sendi ekonomi nasional, sehingga negara tidak goyah atau bergantung pada asing, yang merupakan ketahanan nasional (bela negara).')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Memperkuat kemandirian dan ketahanan ekonomi bangsa dari ancaman krisis global', TRUE, 5),
    (q_id, 'Memutus sama sekali hubungan perdagangan internasional dengan negara lain', FALSE, 0),
    (q_id, 'Menarik investor asing untuk membuka pabrik di dalam negeri', FALSE, 0),
    (q_id, 'Memberikan subsidi silang bagi industri pertahanan persenjataan', FALSE, 0),
    (q_id, 'Menyamakan selera masyarakat sesuai dengan budaya lokal semata', FALSE, 0);
  -- Soal 6
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Ancaman proxy war (perang proksi) semakin nyata di era modern. Salah satu strategi bela negara yang paling efektif untuk menangkal proxy war di kalangan generasi muda adalah...', 'TWK', 'Bela Negara', 'Bela Negara', 'Proxy war sering kali menyerang pola pikir dan budaya. Pertahanan terbaiknya adalah menanamkan kesadaran kritis melalui literasi digital dan pemahaman nilai Pancasila.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Meningkatkan literasi digital dan penanaman nilai-nilai luhur Pancasila', TRUE, 5),
    (q_id, 'Membangun kekuatan siber dengan cara meretas server negara musuh', FALSE, 0),
    (q_id, 'Mewajibkan pendidikan militer dasar bagi setiap mahasiswa baru', FALSE, 0),
    (q_id, 'Memblokir semua akses informasi media asing yang masuk ke Indonesia', FALSE, 0),
    (q_id, 'Mengisolasi generasi muda dari pergaulan internasional', FALSE, 0);
  -- Soal 7
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Agresi, sabotase, dan spionase termasuk dalam kategori ancaman...', 'TWK', 'Bela Negara', 'Bela Negara', 'Ketiga hal tersebut merupakan ancaman militer karena umumnya melibatkan kekuatan bersenjata atau operasi intelijen tingkat tinggi yang membahayakan negara langsung.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Militer', TRUE, 5),
    (q_id, 'Non-militer', FALSE, 0),
    (q_id, 'Ekonomi', FALSE, 0),
    (q_id, 'Sosial Budaya', FALSE, 0),
    (q_id, 'Politik internal', FALSE, 0);
  -- Soal 8
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Pertempuran 10 November 1945 di Surabaya merupakan salah satu wujud heroik bela negara dalam mempertahankan kemerdekaan. Peristiwa ini dipicu oleh...', 'TWK', 'Bela Negara', 'Bela Negara', 'Pemicu utama meletusnya pertempuran besar di Surabaya adalah adanya insiden tewasnya Brigjen A.W.S Mallaby, komandan tentara Inggris (Sekutu).')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Tewasnya Brigadir Jenderal Mallaby dalam sebuah bentrokan', TRUE, 5),
    (q_id, 'Penolakan Belanda atas isi Perundingan Linggarjati', FALSE, 0),
    (q_id, 'Adanya ultimatum Sekutu untuk menyerahkan senjata di Ambarawa', FALSE, 0),
    (q_id, 'Serangan udara tiba-tiba ke markas tentara Indonesia', FALSE, 0),
    (q_id, 'Ditangkapnya Presiden Soekarno oleh tentara NICA', FALSE, 0);
  -- Soal 9
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Sikap toleransi antar umat beragama bukan sekadar perwujudan sila pertama Pancasila, melainkan juga bagian dari upaya bela negara karena...', 'TWK', 'Bela Negara', 'Bela Negara', 'Bela negara adalah tentang menjaga keutuhan. Toleransi mencegah konflik horizontal/perpecahan internal yang dapat melemahkan kekuatan nasional.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Toleransi dapat mencegah terjadinya konflik sosial yang melemahkan ketahanan nasional', TRUE, 5),
    (q_id, 'Kebebasan memeluk agama diatur dalam undang-undang internasional secara ketat', FALSE, 0),
    (q_id, 'Negara membutuhkan retribusi dari masyarakat untuk membiayai operasi keamanan', FALSE, 0),
    (q_id, 'Agar tidak dianggap sebagai negara yang melanggar hak asasi manusia oleh PBB', FALSE, 0),
    (q_id, 'Banyaknya jumlah penduduk menjadi kekuatan utama pasukan cadangan', FALSE, 0);
  -- Soal 10
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Salah satu nilai dasar bela negara adalah "Rela Berkorban untuk Bangsa dan Negara". Contoh perwujudan konkret dari nilai ini bagi seorang pegawai instansi pemerintah adalah...', 'TWK', 'Bela Negara', 'Bela Negara', 'Mengutamakan kepentingan layanan birokrasi, meskipun menuntut kerja lembur atau situasi mendesak, adalah cara pelayan publik (ASN) membela kepentingan negara/masyarakat.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Bersedia bekerja melampaui waktu demi melayani masyarakat di saat mendesak', TRUE, 5),
    (q_id, 'Menyumbangkan seluruh gajinya setiap bulan kepada yayasan sosial', FALSE, 0),
    (q_id, 'Menolak kenaikan pangkat agar rekan kerja yang lain bisa naik pangkat lebih dulu', FALSE, 0),
    (q_id, 'Hanya mau ditempatkan di daerah pedalaman tanpa akses listrik', FALSE, 0),
    (q_id, 'Mengambil alih pekerjaan atasan tanpa perlu diminta', FALSE, 0);
  -- Soal 11
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Dalam konsep wawasan nusantara, laut Indonesia tidak dipandang sebagai pemisah antar pulau, melainkan sebagai...', 'TWK', 'Bela Negara', 'Bela Negara', 'Konsep negara kepulauan memandang laut adalah pemersatu, yang menyambungkan pulau satu dengan lainnya menjadi satu kesatuan wilayah (Bela Negara - Kesadaran Berbangsa/Bernegara).')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Media pemersatu yang merangkai pulau-pulau menjadi satu kesatuan wilayah utuh', TRUE, 5),
    (q_id, 'Sumber pemasukan utama devisa negara melalui penangkapan kelautan', FALSE, 0),
    (q_id, 'Zona pertahanan alamiah yang mustahil ditembus oleh kekuatan asing', FALSE, 0),
    (q_id, 'Ruang eksplorasi yang menjadi cadangan masa depan karena belum dihuni massal', FALSE, 0),
    (q_id, 'Wilayah bebas tempat bersandar kapal dagang dari seluruh penjuru dunia', FALSE, 0);
  -- Soal 12
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Sebagai ASN, mengamankan data dan informasi negara yang bersifat rahasia dari pihak-pihak yang tidak berkepentingan merupakan perwujudan bela negara secara khusus pada lingkungan...', 'TWK', 'Bela Negara', 'Bela Negara', 'Ancaman spionase dan kebocoran data sangat nyata. Menjaga kerahasiaan jabatan adalah wujud kewaspadaan nasional dan bela negara profesi (ASN).')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Kewaspadaan Nasional dalam bentuk pengamanan informasi', TRUE, 5),
    (q_id, 'Pengabdian masyarakat sesuai peran masing-masing profesi', FALSE, 0),
    (q_id, 'Cinta tanah air dengan bangga terhadap instalasi jaringan dalam negeri', FALSE, 0),
    (q_id, 'Pendidikan Kewarganegaraan secara non formal melalui teknologi', FALSE, 0),
    (q_id, 'Pertahanan keamanan rakyat semesta tingkat lingkungan kantor', FALSE, 0);

END
$$;
