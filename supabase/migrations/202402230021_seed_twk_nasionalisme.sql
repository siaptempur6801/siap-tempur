-- =============================================
-- Seed: TWK - Nasionalisme (12 Soal)
-- =============================================
DO $$
DECLARE
  q_id uuid;
BEGIN
  -- Soal 1
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Prinsip nasionalisme Indonesia tidak mengarah pada chauvinisme. Makna chauvinisme adalah...', 'TWK', 'Nasionalisme', 'Nasionalisme',
   'Chauvinisme adalah rasa cinta tanah air yang berlebihan dengan mengagungkan bangsa sendiri dan merendahkan bangsa lain.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Rasa cinta tanah air yang berlebihan dan merendahkan bangsa lain', true, 5),
  (q_id, 'Paham yang menolak kerja sama dengan bangsa lain demi kemandirian', false, 0),
  (q_id, 'Ideologi yang menekankan kebebasan individu di atas kepentingan negara', false, 0),
  (q_id, 'Semangat kebangsaan untuk membebaskan diri dari penjajahan', false, 0),
  (q_id, 'Gerakan pemisahan diri dari suatu negara yang sah', false, 0);

  -- Soal 2
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Organisasi pergerakan nasional yang pertama kali secara tegas menggunakan istilah "Indonesia" dalam nama organisasinya adalah...', 'TWK', 'Nasionalisme', 'Nasionalisme',
   'Perhimpunan Indonesia (PI) yang berkedudukan di Belanda (sebelumnya bernama Indische Vereeniging) adalah organisasi pertama yang menggunakan istilah Indonesia secara politis pada tahun 1925.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Perhimpunan Indonesia', true, 5),
  (q_id, 'Budi Utomo', false, 0),
  (q_id, 'Sarekat Islam', false, 0),
  (q_id, 'Partai Nasional Indonesia', false, 0),
  (q_id, 'Indische Partij', false, 0);

  -- Soal 3
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Salah satu perwujudan nasionalisme dalam bidang ekonomi pada masa awal kemerdekaan adalah program Benteng. Tujuan utama program ini adalah...', 'TWK', 'Nasionalisme', 'Nasionalisme',
   'Program Benteng yang digagas oleh Sumitro Djojohadikusumo bertujuan untuk menumbuhkan kelas pengusaha pribumi dengan memberikan bantuan kredit.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Menumbuhkan kelas pengusaha pribumi agar mampu bersaing', true, 5),
  (q_id, 'Melakukan nasionalisasi terhadap perusahaan-perusahaan Belanda', false, 0),
  (q_id, 'Menolak pinjaman modal dari negara-negara blok barat', false, 0),
  (q_id, 'Membangun infrastruktur pertahanan dari serangan militer', false, 0),
  (q_id, 'Merintis sistem koperasi dasar hingga ke pelosok desa', false, 0);

  -- Soal 4
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Wawasan Nusantara sebagai perwujudan nasionalisme bangsa menekankan pada kesatuan dalam berbagai aspek, KECUALI...', 'TWK', 'Nasionalisme', 'Nasionalisme',
   'Wawasan Nusantara mencakup kesatuan politik, ekonomi, sosial budaya, dan pertahanan keamanan (POLEKSOSBUDHANKAM). Kesatuan pemerintahan tersentralisasi bukan aspek wawasan nusantara, justru Indonesia menganut desentralisasi.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Kesatuan sistem pemerintahan yang tersentralisasi', true, 5),
  (q_id, 'Kesatuan wilayah yang utuh', false, 0),
  (q_id, 'Kesatuan politik berbangsa dan bernegara', false, 0),
  (q_id, 'Kesatuan sosial budaya yang bhinneka', false, 0),
  (q_id, 'Kesatuan ekonomi nusantara', false, 0);

  -- Soal 5
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Kongres Pemuda II pada tanggal 28 Oktober 1928 memiliki makna penting bagi nasionalisme Indonesia, yaitu sebagai...', 'TWK', 'Nasionalisme', 'Nasionalisme',
   'Kongres Pemuda II menghasilkan Sumpah Pemuda yang menjadi titik puncak kristalisasi semangat kebangsaan dan persatuan pemuda dari berbagai daerah.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Titik puncak kristalisasi semangat persatuan dan kesatuan bangsa', true, 5),
  (q_id, 'Awal kebangkitan gerakan perlawanan bersenjata', false, 0),
  (q_id, 'Pendirian organisasi pemuda pertama di Nusantara', false, 0),
  (q_id, 'Proklamasi kemerdekaan secara de facto', false, 0),
  (q_id, 'Perumusan dasar negara yang akan digunakan kelak', false, 0);

  -- Soal 6
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Upaya melestarikan kebudayaan daerah merupakan wujud nasionalisme jika dilakukan dengan tujuan...', 'TWK', 'Nasionalisme', 'Nasionalisme',
   'Pelestarian budaya daerah sebagai bagian dari kebudayaan nasional yang bhinneka merupakan aset persatuan, bukan untuk menonjolkan ego kedaerahan (etnosentrisme).') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Memperkaya khazanah kebudayaan nasional', true, 5),
  (q_id, 'Membuktikan dominasi budaya daerah tertentu atas yang lain', false, 0),
  (q_id, 'Menolak pengaruh kebudayaan barat yang masuk ke Indonesia', false, 0),
  (q_id, 'Menarik wisatawan asing untuk mendatangkan devisa', false, 0),
  (q_id, 'Membentuk provinsi baru berbasis wilayah adat', false, 0);

  -- Soal 7
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Sikap primodialisme yang berlebihan dapat mengancam semangat nasionalisme karena...', 'TWK', 'Nasionalisme', 'Nasionalisme',
   'Primordialisme adalah pandangan yang memegang teguh ikatan asal-usul, tradisi, atau identitas kedaerahan. Jika berlebihan, dapat mengurangi rasa persatuan dalam bingkai NKRI.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Cenderung mengutamakan kepentingan kelompok daerahnya di atas kepentingan bangsa', true, 5),
  (q_id, 'Mengurangi loyalitas terhadap kebijakan pemerintah pusat', false, 0),
  (q_id, 'Membuka peluang masuknya campur tangan asing ke daerah', false, 0),
  (q_id, 'Menyebabkan terhentinya pembangunan infrastruktur di daerah lain', false, 0),
  (q_id, 'Menurunkan cadangan devisa negara karena eksploitasi lokal', false, 0);

  -- Soal 8
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Peristiwa Rengasdengklok yang diinisiasi oleh golongan muda memiliki motif yang didorong oleh semangat nasionalisme, yaitu agar...', 'TWK', 'Nasionalisme', 'Nasionalisme',
   'Golongan muda menculik Soekarno-Hatta agar proklamasi merdeka bebas dari bayang-bayang pemerintahan Jepang (PPKI bentukan Jepang) dan merupakan hasil perjuangan bangsa sendiri.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Proklamasi bebas dari pengaruh dan campur tangan Jepang', true, 5),
  (q_id, 'Menyelamatkan Soekarno-Hatta dari incaran tentara Sekutu', false, 0),
  (q_id, 'Menyiapkan basis pertahanan gerilya di luar kota Jakarta', false, 0),
  (q_id, 'Memaksa Soekarno mundur dari jabatannya di PPKI', false, 0),
  (q_id, 'Mendirikan pemerintahan sementara di Rengasdengklok', false, 0);

  -- Soal 9
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Penerapan nasionalisme dalam kehidupan digital saat ini dapat ditunjukkan melalui...', 'TWK', 'Nasionalisme', 'Nasionalisme',
   'Mendukung produk dan inovasi anak bangsa adalah wujud cinta tanah air di era digital/ekonomi kreatif.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Menggunakan dan mempromosikan platform buatan anak bangsa', true, 5),
  (q_id, 'Menghindari seluruh media sosial luar negeri', false, 0),
  (q_id, 'Menyerang akun negara asing yang berbeda pendapat', false, 0),
  (q_id, 'Meretas situs milik perusahaan multinasional', false, 0),
  (q_id, 'Hanya menyebarkan berita yang memuji pemerintah', false, 0);

  -- Soal 10
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Semboyan Bhinneka Tunggal Ika sangat relevan dengan semangat nasionalisme Indonesia karena...', 'TWK', 'Nasionalisme', 'Nasionalisme',
   'Nasionalisme Indonesia adalah nasionalisme yang majemuk. Bhinneka Tunggal Ika menjadi pengikat keberagaman menjadi satu kesatuan berbangsa.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Mengajarkan bahwa keberagaman adalah modal dasar persatuan bangsa', true, 5),
  (q_id, 'Mengisyaratkan penyeragaman budaya minoritas kepada mayoritas', false, 0),
  (q_id, 'Merupakan doktrin politik peninggalan masa kerajaan Majapahit', false, 0),
  (q_id, 'Mengharuskan penggunaan satu bahasa daerah sebagai standar', false, 0),
  (q_id, 'Mencegah terjadinya asimilasi dan akulturasi budaya', false, 0);

  -- Soal 11
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Salah satu penghambat tumbuhnya nasionalisme di masyarakat adalah sikap intoleran, karena...', 'TWK', 'Nasionalisme', 'Nasionalisme',
   'Intoleransi merusak rasa saling menghargai. Tanpa saling menghargai, rasa saling memiliki sebagai satu bangsa (nasionalisme) akan pudar.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Dapat merusak sendi-sendi persatuan dan rasa saling menghargai antar warga', true, 5),
  (q_id, 'Membutuhkan biaya sosial yang terlalu tinggi untuk diselesaikan', false, 0),
  (q_id, 'Selalu berujung pada tindak pidana makar', false, 0),
  (q_id, 'Memicu negara lain untuk campur tangan urusan dalam negeri', false, 0),
  (q_id, 'Menghalangi datangnya investasi asing', false, 0);

  -- Soal 12
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Karakteristik utama nasionalisme bangsa Indonesia berbeda dengan nasionalisme Eropa, di mana nasionalisme Indonesia dilandasi oleh...', 'TWK', 'Nasionalisme', 'Nasionalisme',
   'Nasionalisme Indonesia lahir dan terbentuk dari perasaan senasib dan sepenanggungan akibat penjajahan (sejarah), bukan karena kesamaan ras atau agama tunggal seperti beberapa di Eropa.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Kesamaan nasib dan sejarah yang panjang di bawah penjajahan', true, 5),
  (q_id, 'Kesamaan latar belakang etnis yang homogen', false, 0),
  (q_id, 'Kesamaan penggunaan satu kepercayaan agama sejak kerajaan bercorak Hindu', false, 0),
  (q_id, 'Keinginan memperluas wilayah hegemoni ke negara tetangga', false, 0),
  (q_id, 'Keikutsertaan dalam perlombaan persaingan industri global', false, 0);

END $$;
