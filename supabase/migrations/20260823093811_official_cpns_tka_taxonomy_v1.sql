-- Official CPNS SKD + TKA taxonomy V1.
-- Sources:
-- - BKN CPNS 2024 SKD announcement + KepmenPANRB 321/2024.
-- - Pusmendik TKA official matrices / Perkaban BSKAP 45/2025 and 47/2025.
-- Staging-first: preserve existing knowledge-node IDs via (subject_id, slug) upsert.
CREATE TEMPORARY TABLE _official_taxonomy (
  track_code text NOT NULL,
  subject_code text NOT NULL,
  node_code text NOT NULL,
  parent_code text NULL,
  name text NOT NULL,
  slug text NOT NULL,
  node_type text NOT NULL,
  depth integer NOT NULL,
  sort_order integer NOT NULL,
  description text NULL
) ON COMMIT DROP;

INSERT INTO _official_taxonomy (track_code, subject_code, node_code, parent_code, name, slug, node_type, depth, sort_order, description)
VALUES
  ('SKD', 'TWK', 'TWK-NAS', NULL, 'Nasionalisme', 'nasionalisme', 'topic', 0, 1, 'Kisi-kisi resmi SKD CPNS BKN/Kementerian PANRB.'),
  ('SKD', 'TWK', 'TWK-INT', NULL, 'Integritas', 'integritas', 'topic', 0, 2, 'Kisi-kisi resmi SKD CPNS BKN/Kementerian PANRB.'),
  ('SKD', 'TWK', 'TWK-BELA', NULL, 'Bela Negara', 'bela-negara', 'topic', 0, 3, 'Kisi-kisi resmi SKD CPNS BKN/Kementerian PANRB.'),
  ('SKD', 'TWK', 'TWK-PILAR', NULL, 'Pilar Negara', 'pilar-negara', 'topic', 0, 4, 'Kisi-kisi resmi SKD CPNS BKN/Kementerian PANRB.'),
  ('SKD', 'TWK', 'TWK-BAHASA', NULL, 'Bahasa Negara', 'bahasa-negara', 'topic', 0, 5, 'Kisi-kisi resmi SKD CPNS BKN/Kementerian PANRB.'),
  ('SKD', 'TWK', 'TWK-PILAR-PANCASILA', 'TWK-PILAR', 'Pancasila', 'pancasila', 'subtopic', 1, 1, 'Kisi-kisi resmi SKD CPNS BKN/Kementerian PANRB.'),
  ('SKD', 'TWK', 'TWK-PILAR-UUD45', 'TWK-PILAR', 'Undang-Undang Dasar Negara Republik Indonesia Tahun 1945', 'undang-undang-dasar-negara-republik-indonesia-tahun-1945', 'subtopic', 1, 2, 'Kisi-kisi resmi SKD CPNS BKN/Kementerian PANRB.'),
  ('SKD', 'TWK', 'TWK-PILAR-NKRI', 'TWK-PILAR', 'Negara Kesatuan Republik Indonesia', 'negara-kesatuan-republik-indonesia', 'subtopic', 1, 3, 'Kisi-kisi resmi SKD CPNS BKN/Kementerian PANRB.'),
  ('SKD', 'TWK', 'TWK-PILAR-BHINNEKA', 'TWK-PILAR', 'Bhinneka Tunggal Ika', 'bhinneka-tunggal-ika', 'subtopic', 1, 4, 'Kisi-kisi resmi SKD CPNS BKN/Kementerian PANRB.'),
  ('SKD', 'TIU', 'TIU-VERBAL', NULL, 'Kemampuan Verbal', 'kemampuan-verbal', 'element', 0, 1, 'Kisi-kisi resmi SKD CPNS BKN/Kementerian PANRB.'),
  ('SKD', 'TIU', 'TIU-NUMERIK', NULL, 'Kemampuan Numerik', 'kemampuan-numerik', 'element', 0, 2, 'Kisi-kisi resmi SKD CPNS BKN/Kementerian PANRB.'),
  ('SKD', 'TIU', 'TIU-FIGURAL', NULL, 'Kemampuan Figural', 'kemampuan-figural', 'element', 0, 3, 'Kisi-kisi resmi SKD CPNS BKN/Kementerian PANRB.'),
  ('SKD', 'TIU', 'TIU-VERBAL-ANALOGI', 'TIU-VERBAL', 'Analogi', 'analogi', 'subtopic', 1, 1, 'Kisi-kisi resmi SKD CPNS BKN/Kementerian PANRB.'),
  ('SKD', 'TIU', 'TIU-VERBAL-SILOGISME', 'TIU-VERBAL', 'Silogisme', 'silogisme', 'subtopic', 1, 2, 'Kisi-kisi resmi SKD CPNS BKN/Kementerian PANRB.'),
  ('SKD', 'TIU', 'TIU-VERBAL-ANALITIS', 'TIU-VERBAL', 'Analitis', 'analitis', 'subtopic', 1, 3, 'Kisi-kisi resmi SKD CPNS BKN/Kementerian PANRB.'),
  ('SKD', 'TIU', 'TIU-NUM-BERHITUNG', 'TIU-NUMERIK', 'Berhitung', 'berhitung', 'subtopic', 1, 1, 'Kisi-kisi resmi SKD CPNS BKN/Kementerian PANRB.'),
  ('SKD', 'TIU', 'TIU-NUM-DERET', 'TIU-NUMERIK', 'Deret Angka', 'deret-angka', 'subtopic', 1, 2, 'Kisi-kisi resmi SKD CPNS BKN/Kementerian PANRB.'),
  ('SKD', 'TIU', 'TIU-NUM-PERBANDINGAN', 'TIU-NUMERIK', 'Perbandingan Kuantitatif', 'perbandingan-kuantitatif', 'subtopic', 1, 3, 'Kisi-kisi resmi SKD CPNS BKN/Kementerian PANRB.'),
  ('SKD', 'TIU', 'TIU-NUM-CERITA', 'TIU-NUMERIK', 'Soal Cerita', 'soal-cerita', 'subtopic', 1, 4, 'Kisi-kisi resmi SKD CPNS BKN/Kementerian PANRB.'),
  ('SKD', 'TIU', 'TIU-FIG-ANALOGI', 'TIU-FIGURAL', 'Analogi Figural', 'analogi-figural', 'subtopic', 1, 1, 'Kisi-kisi resmi SKD CPNS BKN/Kementerian PANRB.'),
  ('SKD', 'TIU', 'TIU-FIG-KETIDAKSAMAAN', 'TIU-FIGURAL', 'Ketidaksamaan', 'ketidaksamaan', 'subtopic', 1, 2, 'Kisi-kisi resmi SKD CPNS BKN/Kementerian PANRB.'),
  ('SKD', 'TIU', 'TIU-FIG-SERIAL', 'TIU-FIGURAL', 'Serial', 'serial', 'subtopic', 1, 3, 'Kisi-kisi resmi SKD CPNS BKN/Kementerian PANRB.'),
  ('SKD', 'TKP', 'TKP-PELAYANAN', NULL, 'Pelayanan Publik', 'pelayanan-publik', 'topic', 0, 1, 'Kisi-kisi resmi SKD CPNS BKN/Kementerian PANRB.'),
  ('SKD', 'TKP', 'TKP-JEJARING', NULL, 'Jejaring Kerja', 'jejaring-kerja', 'topic', 0, 2, 'Kisi-kisi resmi SKD CPNS BKN/Kementerian PANRB.'),
  ('SKD', 'TKP', 'TKP-SOSBUD', NULL, 'Sosial Budaya', 'sosial-budaya', 'topic', 0, 3, 'Kisi-kisi resmi SKD CPNS BKN/Kementerian PANRB.'),
  ('SKD', 'TKP', 'TKP-TIK', NULL, 'Teknologi Informasi dan Komunikasi', 'teknologi-informasi-dan-komunikasi', 'topic', 0, 4, 'Kisi-kisi resmi SKD CPNS BKN/Kementerian PANRB.'),
  ('SKD', 'TKP', 'TKP-PROF', NULL, 'Profesionalisme', 'profesionalisme', 'topic', 0, 5, 'Kisi-kisi resmi SKD CPNS BKN/Kementerian PANRB.'),
  ('SKD', 'TKP', 'TKP-ANTI-RAD', NULL, 'Anti Radikalisme', 'anti-radikalisme', 'topic', 0, 6, 'Kisi-kisi resmi SKD CPNS BKN/Kementerian PANRB.'),
  ('SD', 'MAT', 'SD-MAT-BIL', NULL, 'Bilangan', 'bilangan', 'element', 0, 1, ''),
  ('SD', 'MAT', 'SD-MAT-BIL-RAS', 'SD-MAT-BIL', 'Bilangan Rasional', 'bilangan-rasional', 'subelement', 1, 1, ''),
  ('SD', 'MAT', 'SD-MAT-BIL-RAS-1', 'SD-MAT-BIL-RAS', 'Pecahan Senilai', 'pecahan-senilai', 'topic', 2, 1, ''),
  ('SD', 'MAT', 'SD-MAT-BIL-RAS-2', 'SD-MAT-BIL-RAS', 'Perbandingan dan Pengurutan Bilangan Pecahan', 'perbandingan-dan-pengurutan-bilangan-pecahan', 'topic', 2, 2, ''),
  ('SD', 'MAT', 'SD-MAT-BIL-RAS-3', 'SD-MAT-BIL-RAS', 'Relasi Berbagai Bentuk Pecahan', 'relasi-berbagai-bentuk-pecahan', 'topic', 2, 3, ''),
  ('SD', 'MAT', 'SD-MAT-BIL-RAS-4', 'SD-MAT-BIL-RAS', 'Operasi Bilangan Cacah', 'operasi-bilangan-cacah', 'topic', 2, 4, ''),
  ('SD', 'MAT', 'SD-MAT-BIL-RAS-5', 'SD-MAT-BIL-RAS', 'Operasi Bilangan Pecahan', 'operasi-bilangan-pecahan', 'topic', 2, 5, ''),
  ('SD', 'MAT', 'SD-MAT-BIL-RAS-6', 'SD-MAT-BIL-RAS', 'Kelipatan, Faktor, KPK, dan FPB', 'kelipatan-faktor-kpk-dan-fpb', 'topic', 2, 6, ''),
  ('SD', 'MAT', 'SD-MAT-GEO', NULL, 'Geometri dan Pengukuran', 'geometri-dan-pengukuran', 'element', 0, 2, ''),
  ('SD', 'MAT', 'SD-MAT-GEO-OBJ', 'SD-MAT-GEO', 'Objek Geometri', 'objek-geometri', 'subelement', 1, 1, ''),
  ('SD', 'MAT', 'SD-MAT-GEO-PENG', 'SD-MAT-GEO', 'Pengukuran', 'pengukuran', 'subelement', 1, 2, ''),
  ('SD', 'MAT', 'SD-MAT-GEO-OBJ-1', 'SD-MAT-GEO-OBJ', 'Bentuk Bangun Datar', 'bentuk-bangun-datar', 'topic', 2, 1, ''),
  ('SD', 'MAT', 'SD-MAT-GEO-OBJ-2', 'SD-MAT-GEO-OBJ', 'Konstruksi Bangun Ruang dan Visualisasi Spasial', 'konstruksi-bangun-ruang-dan-visualisasi-spasial', 'topic', 2, 2, ''),
  ('SD', 'MAT', 'SD-MAT-GEO-PENG-1', 'SD-MAT-GEO-PENG', 'Panjang', 'panjang', 'topic', 2, 1, ''),
  ('SD', 'MAT', 'SD-MAT-GEO-PENG-2', 'SD-MAT-GEO-PENG', 'Volume', 'volume', 'topic', 2, 2, ''),
  ('SD', 'MAT', 'SD-MAT-GEO-PENG-3', 'SD-MAT-GEO-PENG', 'Berat', 'berat', 'topic', 2, 3, ''),
  ('SD', 'MAT', 'SD-MAT-GEO-PENG-4', 'SD-MAT-GEO-PENG', 'Waktu', 'waktu', 'topic', 2, 4, ''),
  ('SD', 'MAT', 'SD-MAT-GEO-PENG-5', 'SD-MAT-GEO-PENG', 'Laju Perubahan (Kecepatan)', 'laju-perubahan-kecepatan', 'topic', 2, 5, ''),
  ('SD', 'MAT', 'SD-MAT-GEO-PENG-6', 'SD-MAT-GEO-PENG', 'Keliling dan Luas Bangun Datar', 'keliling-dan-luas-bangun-datar', 'topic', 2, 6, ''),
  ('SD', 'MAT', 'SD-MAT-GEO-PENG-7', 'SD-MAT-GEO-PENG', 'Volume Bangun Ruang', 'volume-bangun-ruang', 'topic', 2, 7, ''),
  ('SD', 'MAT', 'SD-MAT-GEO-PENG-8', 'SD-MAT-GEO-PENG', 'Besar Sudut', 'besar-sudut', 'topic', 2, 8, ''),
  ('SD', 'MAT', 'SD-MAT-GEO-PENG-9', 'SD-MAT-GEO-PENG', 'Penaksiran Ukuran', 'penaksiran-ukuran', 'topic', 2, 9, ''),
  ('SD', 'MAT', 'SD-MAT-DATA', NULL, 'Data', 'data', 'element', 0, 3, ''),
  ('SD', 'MAT', 'SD-MAT-DATA-PENYAJIAN', 'SD-MAT-DATA', 'Penyajian dan Penggunaan Data', 'penyajian-dan-penggunaan-data', 'subelement', 1, 1, ''),
  ('SD', 'MAT', 'SD-MAT-DATA-1', 'SD-MAT-DATA-PENYAJIAN', 'Penyajian Data', 'penyajian-data', 'topic', 2, 1, ''),
  ('SD', 'MAT', 'SD-MAT-DATA-2', 'SD-MAT-DATA-PENYAJIAN', 'Pengambilan Informasi dan Penggunaan Data', 'pengambilan-informasi-dan-penggunaan-data', 'topic', 2, 2, ''),
  ('SD', 'BIN', 'SD-BIN-TYPE', NULL, 'Jenis Teks', 'jenis-teks', 'dimension', 0, 1, ''),
  ('SD', 'BIN', 'SD-BIN-TYPE-INFO', 'SD-BIN-TYPE', 'Teks Informasi', 'teks-informasi', 'text_type', 1, 1, ''),
  ('SD', 'BIN', 'SD-BIN-TYPE-FIKSI', 'SD-BIN-TYPE', 'Teks Fiksi', 'teks-fiksi', 'text_type', 1, 2, ''),
  ('SD', 'BIN', 'SD-BIN-COMP', NULL, 'Kompetensi Membaca', 'kompetensi-membaca', 'domain', 0, 2, ''),
  ('SD', 'BIN', 'SD-BIN-COMP-1', 'SD-BIN-COMP', 'Pemahaman Tekstual', 'pemahaman-tekstual', 'competency', 1, 1, ''),
  ('SD', 'BIN', 'SD-BIN-COMP-2', 'SD-BIN-COMP', 'Pemahaman Inferensial', 'pemahaman-inferensial', 'competency', 1, 2, ''),
  ('SD', 'BIN', 'SD-BIN-COMP-3', 'SD-BIN-COMP', 'Evaluasi dan Apresiasi', 'evaluasi-dan-apresiasi', 'competency', 1, 3, ''),
  ('SD', 'BIN', 'SD-BIN-COMP-1-1', 'SD-BIN-COMP-1', 'Mengidentifikasi penggunaan kosakata umum dan khusus dalam berbagai bidang', 'mengidentifikasi-penggunaan-kosakata-umum-dan-khusus-dalam-berbagai-bidang', 'subcompetency', 2, 1, ''),
  ('SD', 'BIN', 'SD-BIN-COMP-1-2', 'SD-BIN-COMP-1', 'Mengidentifikasi objek berdasarkan kosakata dalam teks', 'mengidentifikasi-objek-berdasarkan-kosakata-dalam-teks', 'subcompetency', 2, 2, ''),
  ('SD', 'BIN', 'SD-BIN-COMP-1-3', 'SD-BIN-COMP-1', 'Menyusun kembali informasi dalam bentuk ikhtisar atau bagan', 'menyusun-kembali-informasi-dalam-bentuk-ikhtisar-atau-bagan', 'subcompetency', 2, 3, ''),
  ('SD', 'BIN', 'SD-BIN-COMP-1-4', 'SD-BIN-COMP-1', 'Mengidentifikasi informasi tersurat dalam teks', 'mengidentifikasi-informasi-tersurat-dalam-teks', 'subcompetency', 2, 4, ''),
  ('SD', 'BIN', 'SD-BIN-COMP-2-1', 'SD-BIN-COMP-2', 'Menyimpulkan ide pokok, gagasan pendukung, amanat, tokoh, peristiwa, dan nilai', 'menyimpulkan-ide-pokok-gagasan-pendukung-amanat-tokoh-peristiwa-dan-nilai', 'subcompetency', 2, 1, ''),
  ('SD', 'BIN', 'SD-BIN-COMP-2-2', 'SD-BIN-COMP-2', 'Menyimpulkan perubahan sederhana pada objek, karakter, atau latar', 'menyimpulkan-perubahan-sederhana-pada-objek-karakter-atau-latar', 'subcompetency', 2, 2, ''),
  ('SD', 'BIN', 'SD-BIN-COMP-2-3', 'SD-BIN-COMP-2', 'Menjelaskan makna ungkapan dalam teks', 'menjelaskan-makna-ungkapan-dalam-teks', 'subcompetency', 2, 3, ''),
  ('SD', 'BIN', 'SD-BIN-COMP-3-1', 'SD-BIN-COMP-3', 'Menilai relevansi peristiwa dengan kehidupan sehari-hari', 'menilai-relevansi-peristiwa-dengan-kehidupan-sehari-hari', 'subcompetency', 2, 1, ''),
  ('SD', 'BIN', 'SD-BIN-COMP-3-2', 'SD-BIN-COMP-3', 'Menilai kesesuaian antarunsur atau antarinformasi', 'menilai-kesesuaian-antarunsur-atau-antarinformasi', 'subcompetency', 2, 2, ''),
  ('SD', 'BIN', 'SD-BIN-COMP-3-3', 'SD-BIN-COMP-3', 'Menyimpulkan respons emosional terhadap unsur teks fiksi', 'menyimpulkan-respons-emosional-terhadap-unsur-teks-fiksi', 'subcompetency', 2, 3, ''),
  ('SMA', 'MAT', 'SMA-MAT-BIL', NULL, 'Bilangan', 'bilangan', 'element', 0, 1, ''),
  ('SMA', 'MAT', 'SMA-MAT-BIL-1', 'SMA-MAT-BIL', 'Bilangan Real', 'bilangan-real', 'subelement', 1, 1, ''),
  ('SMA', 'MAT', 'SMA-MAT-ALG', NULL, 'Aljabar', 'aljabar', 'element', 0, 2, ''),
  ('SMA', 'MAT', 'SMA-MAT-ALG-1', 'SMA-MAT-ALG', 'Persamaan dan Pertidaksamaan Linear', 'persamaan-dan-pertidaksamaan-linear', 'subelement', 1, 1, ''),
  ('SMA', 'MAT', 'SMA-MAT-ALG-2', 'SMA-MAT-ALG', 'Fungsi', 'fungsi', 'subelement', 1, 2, ''),
  ('SMA', 'MAT', 'SMA-MAT-ALG-3', 'SMA-MAT-ALG', 'Barisan dan Deret', 'barisan-dan-deret', 'subelement', 1, 3, ''),
  ('SMA', 'MAT', 'SMA-MAT-GEO', NULL, 'Geometri dan Pengukuran', 'geometri-dan-pengukuran', 'element', 0, 3, ''),
  ('SMA', 'MAT', 'SMA-MAT-GEO-1', 'SMA-MAT-GEO', 'Objek Geometri', 'objek-geometri', 'subelement', 1, 1, ''),
  ('SMA', 'MAT', 'SMA-MAT-GEO-2', 'SMA-MAT-GEO', 'Transformasi Geometri', 'transformasi-geometri', 'subelement', 1, 2, ''),
  ('SMA', 'MAT', 'SMA-MAT-GEO-3', 'SMA-MAT-GEO', 'Pengukuran', 'pengukuran', 'subelement', 1, 3, ''),
  ('SMA', 'MAT', 'SMA-MAT-TRIG', NULL, 'Trigonometri', 'trigonometri', 'element', 0, 4, ''),
  ('SMA', 'MAT', 'SMA-MAT-TRIG-1', 'SMA-MAT-TRIG', 'Perbandingan Trigonometri', 'perbandingan-trigonometri', 'subelement', 1, 1, ''),
  ('SMA', 'MAT', 'SMA-MAT-DATA', NULL, 'Data dan Peluang', 'data-dan-peluang', 'element', 0, 5, ''),
  ('SMA', 'MAT', 'SMA-MAT-DATA-1', 'SMA-MAT-DATA', 'Data', 'data', 'subelement', 1, 1, ''),
  ('SMA', 'MAT', 'SMA-MAT-DATA-2', 'SMA-MAT-DATA', 'Peluang', 'peluang', 'subelement', 1, 2, ''),
  ('SMA', 'BIN', 'SMA-BIN-TYPE', NULL, 'Jenis Teks', 'jenis-teks', 'dimension', 0, 1, ''),
  ('SMA', 'BIN', 'SMA-BIN-TYPE-1', 'SMA-BIN-TYPE', 'Teks Informasi', 'teks-informasi', 'text_type', 1, 1, ''),
  ('SMA', 'BIN', 'SMA-BIN-TYPE-2', 'SMA-BIN-TYPE', 'Teks Fiksi', 'teks-fiksi', 'text_type', 1, 2, ''),
  ('SMA', 'BIN', 'SMA-BIN-COMP', NULL, 'Kompetensi Membaca', 'kompetensi-membaca', 'domain', 0, 2, ''),
  ('SMA', 'BIN', 'SMA-BIN-COMP-1', 'SMA-BIN-COMP', 'Pemahaman Tekstual', 'pemahaman-tekstual', 'competency', 1, 1, ''),
  ('SMA', 'BIN', 'SMA-BIN-COMP-2', 'SMA-BIN-COMP', 'Pemahaman Inferensial', 'pemahaman-inferensial', 'competency', 1, 2, ''),
  ('SMA', 'BIN', 'SMA-BIN-COMP-3', 'SMA-BIN-COMP', 'Evaluasi dan Apresiasi', 'evaluasi-dan-apresiasi', 'competency', 1, 3, ''),
  ('SMA', 'BIG', 'SMA-BIG-TYPE', NULL, 'Jenis Teks', 'jenis-teks', 'dimension', 0, 1, ''),
  ('SMA', 'BIG', 'SMA-BIG-TYPE-1', 'SMA-BIG-TYPE', 'Descriptive', 'descriptive', 'text_type', 1, 1, ''),
  ('SMA', 'BIG', 'SMA-BIG-TYPE-2', 'SMA-BIG-TYPE', 'Recount', 'recount', 'text_type', 1, 2, ''),
  ('SMA', 'BIG', 'SMA-BIG-TYPE-3', 'SMA-BIG-TYPE', 'Narrative', 'narrative', 'text_type', 1, 3, ''),
  ('SMA', 'BIG', 'SMA-BIG-TYPE-4', 'SMA-BIG-TYPE', 'Procedure', 'procedure', 'text_type', 1, 4, ''),
  ('SMA', 'BIG', 'SMA-BIG-TYPE-5', 'SMA-BIG-TYPE', 'Analytical Exposition', 'analytical-exposition', 'text_type', 1, 5, ''),
  ('SMA', 'BIG', 'SMA-BIG-COMP', NULL, 'Kompetensi Membaca', 'kompetensi-membaca', 'domain', 0, 2, ''),
  ('SMA', 'BIG', 'SMA-BIG-COMP-1', 'SMA-BIG-COMP', 'Pemahaman Tekstual', 'pemahaman-tekstual', 'competency', 1, 1, ''),
  ('SMA', 'BIG', 'SMA-BIG-COMP-2', 'SMA-BIG-COMP', 'Pemahaman Inferensial', 'pemahaman-inferensial', 'competency', 1, 2, ''),
  ('SMA', 'BIG', 'SMA-BIG-COMP-3', 'SMA-BIG-COMP', 'Evaluasi dan Apresiasi', 'evaluasi-dan-apresiasi', 'competency', 1, 3, ''),
  ('SMA', 'BIN-LANJUT', 'SMA-BINL-TYPE', NULL, 'Jenis Teks', 'jenis-teks', 'dimension', 0, 1, ''),
  ('SMA', 'BIN-LANJUT', 'SMA-BINL-TYPE-1', 'SMA-BINL-TYPE', 'Teks Informasi', 'teks-informasi', 'text_type', 1, 1, ''),
  ('SMA', 'BIN-LANJUT', 'SMA-BINL-TYPE-2', 'SMA-BINL-TYPE', 'Teks Fiksi', 'teks-fiksi', 'text_type', 1, 2, ''),
  ('SMA', 'BIN-LANJUT', 'SMA-BINL-COMP', NULL, 'Kompetensi Membaca', 'kompetensi-membaca', 'domain', 0, 2, ''),
  ('SMA', 'BIN-LANJUT', 'SMA-BINL-COMP-1', 'SMA-BINL-COMP', 'Pemahaman Tekstual', 'pemahaman-tekstual', 'competency', 1, 1, ''),
  ('SMA', 'BIN-LANJUT', 'SMA-BINL-COMP-2', 'SMA-BINL-COMP', 'Pemahaman Inferensial', 'pemahaman-inferensial', 'competency', 1, 2, ''),
  ('SMA', 'BIN-LANJUT', 'SMA-BINL-COMP-3', 'SMA-BINL-COMP', 'Evaluasi dan Apresiasi', 'evaluasi-dan-apresiasi', 'competency', 1, 3, ''),
  ('SMA', 'BIG-LANJUT', 'SMA-BIGL-TYPE', NULL, 'Jenis Teks', 'jenis-teks', 'dimension', 0, 1, ''),
  ('SMA', 'BIG-LANJUT', 'SMA-BIGL-TYPE-1', 'SMA-BIGL-TYPE', 'Exposition', 'exposition', 'text_type', 1, 1, ''),
  ('SMA', 'BIG-LANJUT', 'SMA-BIGL-TYPE-2', 'SMA-BIGL-TYPE', 'Discussion', 'discussion', 'text_type', 1, 2, ''),
  ('SMA', 'BIG-LANJUT', 'SMA-BIGL-COMP', NULL, 'Kompetensi Membaca', 'kompetensi-membaca', 'domain', 0, 2, ''),
  ('SMA', 'BIG-LANJUT', 'SMA-BIGL-COMP-1', 'SMA-BIGL-COMP', 'Pemahaman Tekstual', 'pemahaman-tekstual', 'competency', 1, 1, ''),
  ('SMA', 'BIG-LANJUT', 'SMA-BIGL-COMP-2', 'SMA-BIGL-COMP', 'Pemahaman Inferensial', 'pemahaman-inferensial', 'competency', 1, 2, ''),
  ('SMA', 'BIG-LANJUT', 'SMA-BIGL-COMP-3', 'SMA-BIGL-COMP', 'Evaluasi dan Apresiasi', 'evaluasi-dan-apresiasi', 'competency', 1, 3, ''),
  ('SMA', 'MAT-LANJUT', 'SMA-MATL-ALG', NULL, 'Aljabar', 'aljabar', 'element', 0, 1, ''),
  ('SMA', 'MAT-LANJUT', 'SMA-MATL-ALG-1', 'SMA-MATL-ALG', 'Matriks', 'matriks', 'subelement', 1, 1, ''),
  ('SMA', 'MAT-LANJUT', 'SMA-MATL-ALG-2', 'SMA-MATL-ALG', 'Polinomial', 'polinomial', 'subelement', 1, 2, ''),
  ('SMA', 'MAT-LANJUT', 'SMA-MATL-ALG-3', 'SMA-MATL-ALG', 'Fungsi', 'fungsi', 'subelement', 1, 3, ''),
  ('SMA', 'MAT-LANJUT', 'SMA-MATL-GEO', NULL, 'Geometri dan Pengukuran', 'geometri-dan-pengukuran', 'element', 0, 2, ''),
  ('SMA', 'MAT-LANJUT', 'SMA-MATL-GEO-1', 'SMA-MATL-GEO', 'Vektor', 'vektor', 'subelement', 1, 1, ''),
  ('SMA', 'MAT-LANJUT', 'SMA-MATL-GEO-2', 'SMA-MATL-GEO', 'Transformasi Geometri', 'transformasi-geometri', 'subelement', 1, 2, ''),
  ('SMA', 'MAT-LANJUT', 'SMA-MATL-KAL', NULL, 'Kalkulus', 'kalkulus', 'element', 0, 3, ''),
  ('SMA', 'MAT-LANJUT', 'SMA-MATL-KAL-1', 'SMA-MATL-KAL', 'Limit', 'limit', 'subelement', 1, 1, ''),
  ('SMA', 'MAT-LANJUT', 'SMA-MATL-KAL-2', 'SMA-MATL-KAL', 'Turunan', 'turunan', 'subelement', 1, 2, ''),
  ('SMA', 'MAT-LANJUT', 'SMA-MATL-KAL-3', 'SMA-MATL-KAL', 'Integral', 'integral', 'subelement', 1, 3, ''),
  ('SMA', 'FIS', 'SMA-FIS-KIN', NULL, 'Kinematika', 'kinematika', 'element', 0, 1, ''),
  ('SMA', 'FIS', 'SMA-FIS-KIN-1', 'SMA-FIS-KIN', 'Pengukuran', 'pengukuran', 'subelement', 1, 1, ''),
  ('SMA', 'FIS', 'SMA-FIS-KIN-2', 'SMA-FIS-KIN', 'Gerak Lurus', 'gerak-lurus', 'subelement', 1, 2, ''),
  ('SMA', 'FIS', 'SMA-FIS-KIN-3', 'SMA-FIS-KIN', 'Gerak Parabola', 'gerak-parabola', 'subelement', 1, 3, ''),
  ('SMA', 'FIS', 'SMA-FIS-KIN-4', 'SMA-FIS-KIN', 'Gerak Melingkar Beraturan', 'gerak-melingkar-beraturan', 'subelement', 1, 4, ''),
  ('SMA', 'FIS', 'SMA-FIS-DIN', NULL, 'Dinamika', 'dinamika', 'element', 0, 2, ''),
  ('SMA', 'FIS', 'SMA-FIS-DIN-1', 'SMA-FIS-DIN', 'Hukum Newton', 'hukum-newton', 'subelement', 1, 1, ''),
  ('SMA', 'FIS', 'SMA-FIS-DIN-2', 'SMA-FIS-DIN', 'Momentum dan Impuls', 'momentum-dan-impuls', 'subelement', 1, 2, ''),
  ('SMA', 'FIS', 'SMA-FIS-FLU', NULL, 'Fluida', 'fluida', 'element', 0, 3, ''),
  ('SMA', 'FIS', 'SMA-FIS-FLU-1', 'SMA-FIS-FLU', 'Fluida Statis', 'fluida-statis', 'subelement', 1, 1, ''),
  ('SMA', 'FIS', 'SMA-FIS-FLU-2', 'SMA-FIS-FLU', 'Fluida Dinamis', 'fluida-dinamis', 'subelement', 1, 2, ''),
  ('SMA', 'FIS', 'SMA-FIS-GEL', NULL, 'Gelombang', 'gelombang', 'element', 0, 4, ''),
  ('SMA', 'FIS', 'SMA-FIS-GEL-1', 'SMA-FIS-GEL', 'Gelombang Mekanik', 'gelombang-mekanik', 'subelement', 1, 1, ''),
  ('SMA', 'FIS', 'SMA-FIS-GEL-2', 'SMA-FIS-GEL', 'Bunyi', 'bunyi', 'subelement', 1, 2, ''),
  ('SMA', 'FIS', 'SMA-FIS-GEL-3', 'SMA-FIS-GEL', 'Cahaya', 'cahaya', 'subelement', 1, 3, ''),
  ('SMA', 'FIS', 'SMA-FIS-GEL-4', 'SMA-FIS-GEL', 'Gelombang Elektromagnetik', 'gelombang-elektromagnetik', 'subelement', 1, 4, ''),
  ('SMA', 'FIS', 'SMA-FIS-KAL', NULL, 'Kalor dan Termodinamika', 'kalor-dan-termodinamika', 'element', 0, 5, ''),
  ('SMA', 'FIS', 'SMA-FIS-KAL-1', 'SMA-FIS-KAL', 'Kalor dan Perubahan Suhu/Wujud', 'kalor-dan-perubahan-suhu-wujud', 'subelement', 1, 1, ''),
  ('SMA', 'FIS', 'SMA-FIS-KAL-2', 'SMA-FIS-KAL', 'Perpindahan Kalor', 'perpindahan-kalor', 'subelement', 1, 2, ''),
  ('SMA', 'FIS', 'SMA-FIS-KAL-3', 'SMA-FIS-KAL', 'Gas Ideal', 'gas-ideal', 'subelement', 1, 3, ''),
  ('SMA', 'FIS', 'SMA-FIS-KAL-4', 'SMA-FIS-KAL', 'Hukum Termodinamika', 'hukum-termodinamika', 'subelement', 1, 4, ''),
  ('SMA', 'FIS', 'SMA-FIS-LIS', NULL, 'Kelistrikan', 'kelistrikan', 'element', 0, 6, ''),
  ('SMA', 'FIS', 'SMA-FIS-LIS-1', 'SMA-FIS-LIS', 'Listrik Statis', 'listrik-statis', 'subelement', 1, 1, ''),
  ('SMA', 'FIS', 'SMA-FIS-LIS-2', 'SMA-FIS-LIS', 'Medan dan Potensial Listrik', 'medan-dan-potensial-listrik', 'subelement', 1, 2, ''),
  ('SMA', 'FIS', 'SMA-FIS-LIS-3', 'SMA-FIS-LIS', 'Arus Listrik Searah', 'arus-listrik-searah', 'subelement', 1, 3, ''),
  ('SMA', 'FIS', 'SMA-FIS-LIS-4', 'SMA-FIS-LIS', 'Rangkaian Listrik', 'rangkaian-listrik', 'subelement', 1, 4, ''),
  ('SMA', 'KIM', 'SMA-KIM-DAS', NULL, 'Kimia Dasar', 'kimia-dasar', 'element', 0, 1, ''),
  ('SMA', 'KIM', 'SMA-KIM-DAS-1', 'SMA-KIM-DAS', 'Struktur Atom', 'struktur-atom', 'subelement', 1, 1, ''),
  ('SMA', 'KIM', 'SMA-KIM-DAS-2', 'SMA-KIM-DAS', 'Teori/Model Atom', 'teori-model-atom', 'subelement', 1, 2, ''),
  ('SMA', 'KIM', 'SMA-KIM-DAS-3', 'SMA-KIM-DAS', 'Sistem dan Sifat Periodik Unsur', 'sistem-dan-sifat-periodik-unsur', 'subelement', 1, 3, ''),
  ('SMA', 'KIM', 'SMA-KIM-DAS-4', 'SMA-KIM-DAS', 'Ikatan Kimia', 'ikatan-kimia', 'subelement', 1, 4, ''),
  ('SMA', 'KIM', 'SMA-KIM-DAS-5', 'SMA-KIM-DAS', 'Geometri Molekul', 'geometri-molekul', 'subelement', 1, 5, ''),
  ('SMA', 'KIM', 'SMA-KIM-DAS-6', 'SMA-KIM-DAS', 'Interaksi Antarmolekul', 'interaksi-antarmolekul', 'subelement', 1, 6, ''),
  ('SMA', 'KIM', 'SMA-KIM-DAS-7', 'SMA-KIM-DAS', 'Hukum Dasar Kimia', 'hukum-dasar-kimia', 'subelement', 1, 7, ''),
  ('SMA', 'KIM', 'SMA-KIM-DAS-8', 'SMA-KIM-DAS', 'Stoikiometri', 'stoikiometri', 'subelement', 1, 8, ''),
  ('SMA', 'KIM', 'SMA-KIM-DAS-9', 'SMA-KIM-DAS', 'Persamaan Reaksi Kimia', 'persamaan-reaksi-kimia', 'subelement', 1, 9, ''),
  ('SMA', 'KIM', 'SMA-KIM-AN', NULL, 'Kimia Analitik', 'kimia-analitik', 'element', 0, 2, ''),
  ('SMA', 'KIM', 'SMA-KIM-AN-1', 'SMA-KIM-AN', 'Larutan', 'larutan', 'subelement', 1, 1, ''),
  ('SMA', 'KIM', 'SMA-KIM-AN-2', 'SMA-KIM-AN', 'Kesetimbangan Larutan', 'kesetimbangan-larutan', 'subelement', 1, 2, ''),
  ('SMA', 'KIM', 'SMA-KIM-AN-3', 'SMA-KIM-AN', 'Asam-Basa', 'asam-basa', 'subelement', 1, 3, ''),
  ('SMA', 'KIM', 'SMA-KIM-AN-4', 'SMA-KIM-AN', 'pH', 'ph', 'subelement', 1, 4, ''),
  ('SMA', 'KIM', 'SMA-KIM-AN-5', 'SMA-KIM-AN', 'Koloid', 'koloid', 'subelement', 1, 5, ''),
  ('SMA', 'KIM', 'SMA-KIM-FIS', NULL, 'Kimia Fisik', 'kimia-fisik', 'element', 0, 3, ''),
  ('SMA', 'KIM', 'SMA-KIM-FIS-1', 'SMA-KIM-FIS', 'Energetika', 'energetika', 'subelement', 1, 1, ''),
  ('SMA', 'KIM', 'SMA-KIM-FIS-2', 'SMA-KIM-FIS', 'Dinamika Reaksi', 'dinamika-reaksi', 'subelement', 1, 2, ''),
  ('SMA', 'KIM', 'SMA-KIM-ORG', NULL, 'Kimia Organik', 'kimia-organik', 'element', 0, 4, ''),
  ('SMA', 'KIM', 'SMA-KIM-ORG-1', 'SMA-KIM-ORG', 'Struktur dan Kereaktifan Senyawa Karbon', 'struktur-dan-kereaktifan-senyawa-karbon', 'subelement', 1, 1, ''),
  ('SMA', 'BIO', 'SMA-BIO-HAY', NULL, 'Keanekaragaman Hayati', 'keanekaragaman-hayati', 'element', 0, 1, ''),
  ('SMA', 'BIO', 'SMA-BIO-HAY-1', 'SMA-BIO-HAY', 'Klasifikasi dan Keanekaragaman Makhluk Hidup', 'klasifikasi-dan-keanekaragaman-makhluk-hidup', 'subelement', 1, 1, ''),
  ('SMA', 'BIO', 'SMA-BIO-HAY-2', 'SMA-BIO-HAY', 'Bakteri', 'bakteri', 'subelement', 1, 2, ''),
  ('SMA', 'BIO', 'SMA-BIO-HAY-3', 'SMA-BIO-HAY', 'Ekosistem', 'ekosistem', 'subelement', 1, 3, ''),
  ('SMA', 'BIO', 'SMA-BIO-SEL', NULL, 'Sel', 'sel', 'element', 0, 2, ''),
  ('SMA', 'BIO', 'SMA-BIO-SEL-1', 'SMA-BIO-SEL', 'Metabolisme Sel', 'metabolisme-sel', 'subelement', 1, 1, ''),
  ('SMA', 'BIO', 'SMA-BIO-PROC', NULL, 'Proses-proses pada Makhluk Hidup', 'proses-proses-pada-makhluk-hidup', 'element', 0, 3, ''),
  ('SMA', 'BIO', 'SMA-BIO-PROC-1', 'SMA-BIO-PROC', 'Transport dan Pertukaran Zat pada Manusia', 'transport-dan-pertukaran-zat-pada-manusia', 'subelement', 1, 1, ''),
  ('SMA', 'BIO', 'SMA-BIO-PROC-2', 'SMA-BIO-PROC', 'Sistem Imun', 'sistem-imun', 'subelement', 1, 2, ''),
  ('SMA', 'BIO', 'SMA-BIO-PROC-3', 'SMA-BIO-PROC', 'Sistem Koordinasi', 'sistem-koordinasi', 'subelement', 1, 3, ''),
  ('SMA', 'BIO', 'SMA-BIO-PROC-4', 'SMA-BIO-PROC', 'Sistem Reproduksi', 'sistem-reproduksi', 'subelement', 1, 4, ''),
  ('SMA', 'BIO', 'SMA-BIO-KPS', NULL, 'Keterampilan Proses', 'keterampilan-proses', 'element', 0, 4, ''),
  ('SMA', 'BIO', 'SMA-BIO-KPS-1', 'SMA-BIO-KPS', 'Mempertanyakan dan Memprediksi', 'mempertanyakan-dan-memprediksi', 'subelement', 1, 1, ''),
  ('SMA', 'BIO', 'SMA-BIO-KPS-2', 'SMA-BIO-KPS', 'Merencanakan dan Melakukan Penyelidikan', 'merencanakan-dan-melakukan-penyelidikan', 'subelement', 1, 2, ''),
  ('SMA', 'BIO', 'SMA-BIO-KPS-3', 'SMA-BIO-KPS', 'Memproses dan Menganalisis Data dan Informasi', 'memproses-dan-menganalisis-data-dan-informasi', 'subelement', 1, 3, ''),
  ('SMA', 'BIO', 'SMA-BIO-PROC-1-1', 'SMA-BIO-PROC-1', 'Sistem Sirkulasi', 'sistem-sirkulasi', 'topic', 2, 1, ''),
  ('SMA', 'BIO', 'SMA-BIO-PROC-1-2', 'SMA-BIO-PROC-1', 'Sistem Respirasi', 'sistem-respirasi', 'topic', 2, 2, ''),
  ('SMA', 'BIO', 'SMA-BIO-PROC-1-3', 'SMA-BIO-PROC-1', 'Sistem Ekskresi', 'sistem-ekskresi', 'topic', 2, 3, ''),
  ('SMA', 'EKO', 'SMA-EKO-DAS', NULL, 'Konsep Dasar Ilmu Ekonomi', 'konsep-dasar-ilmu-ekonomi', 'element', 0, 1, ''),
  ('SMA', 'EKO', 'SMA-EKO-DAS-1', 'SMA-EKO-DAS', 'Kelangkaan', 'kelangkaan', 'subelement', 1, 1, ''),
  ('SMA', 'EKO', 'SMA-EKO-DAS-2', 'SMA-EKO-DAS', 'Biaya Peluang', 'biaya-peluang', 'subelement', 1, 2, ''),
  ('SMA', 'EKO', 'SMA-EKO-DAS-3', 'SMA-EKO-DAS', 'Kegiatan Ekonomi', 'kegiatan-ekonomi', 'subelement', 1, 3, ''),
  ('SMA', 'EKO', 'SMA-EKO-MM', NULL, 'Ekonomi Mikro dan Makro', 'ekonomi-mikro-dan-makro', 'element', 0, 2, ''),
  ('SMA', 'EKO', 'SMA-EKO-MM-1', 'SMA-EKO-MM', 'Permintaan dan Penawaran', 'permintaan-dan-penawaran', 'subelement', 1, 1, ''),
  ('SMA', 'EKO', 'SMA-EKO-MM-2', 'SMA-EKO-MM', 'Pertumbuhan dan Pembangunan Ekonomi', 'pertumbuhan-dan-pembangunan-ekonomi', 'subelement', 1, 2, ''),
  ('SMA', 'EKO', 'SMA-EKO-MM-3', 'SMA-EKO-MM', 'Ketenagakerjaan', 'ketenagakerjaan', 'subelement', 1, 3, ''),
  ('SMA', 'EKO', 'SMA-EKO-MM-4', 'SMA-EKO-MM', 'Kebijakan Moneter', 'kebijakan-moneter', 'subelement', 1, 4, ''),
  ('SMA', 'EKO', 'SMA-EKO-MM-5', 'SMA-EKO-MM', 'Kebijakan Fiskal', 'kebijakan-fiskal', 'subelement', 1, 5, ''),
  ('SMA', 'EKO', 'SMA-EKO-INT', NULL, 'Ekonomi Internasional', 'ekonomi-internasional', 'element', 0, 3, ''),
  ('SMA', 'EKO', 'SMA-EKO-INT-1', 'SMA-EKO-INT', 'Perdagangan Internasional', 'perdagangan-internasional', 'subelement', 1, 1, ''),
  ('SMA', 'EKO', 'SMA-EKO-INT-2', 'SMA-EKO-INT', 'Kerja Sama Ekonomi Internasional', 'kerja-sama-ekonomi-internasional', 'subelement', 1, 2, ''),
  ('SMA', 'EKO', 'SMA-EKO-INT-3', 'SMA-EKO-INT', 'Neraca Pembayaran', 'neraca-pembayaran', 'subelement', 1, 3, ''),
  ('SMA', 'EKO', 'SMA-EKO-AK', NULL, 'Akuntansi Keuangan Dasar', 'akuntansi-keuangan-dasar', 'element', 0, 4, ''),
  ('SMA', 'EKO', 'SMA-EKO-AK-1', 'SMA-EKO-AK', 'Laporan Keuangan', 'laporan-keuangan', 'subelement', 1, 1, ''),
  ('SMA', 'EKO', 'SMA-EKO-AK-2', 'SMA-EKO-AK', 'Analisis Kondisi Keuangan', 'analisis-kondisi-keuangan', 'subelement', 1, 2, ''),
  ('SMA', 'SOS', 'SMA-SOS-ILMU', NULL, 'Sosiologi sebagai Ilmu', 'sosiologi-sebagai-ilmu', 'element', 0, 1, ''),
  ('SMA', 'SOS', 'SMA-SOS-ILMU-1', 'SMA-SOS-ILMU', 'Pengertian dan Perkembangan Sosiologi serta Manfaatnya', 'pengertian-dan-perkembangan-sosiologi-serta-manfaatnya', 'subelement', 1, 1, ''),
  ('SMA', 'SOS', 'SMA-SOS-HUB', NULL, 'Hubungan dan Gejala Sosial', 'hubungan-dan-gejala-sosial', 'element', 0, 2, ''),
  ('SMA', 'SOS', 'SMA-SOS-HUB-1', 'SMA-SOS-HUB', 'Konsep dan Bentuk Hubungan Sosial', 'konsep-dan-bentuk-hubungan-sosial', 'subelement', 1, 1, ''),
  ('SMA', 'SOS', 'SMA-SOS-HUB-2', 'SMA-SOS-HUB', 'Pembentukan Kepribadian, Kelompok, dan Lembaga Sosial', 'pembentukan-kepribadian-kelompok-dan-lembaga-sosial', 'subelement', 1, 2, ''),
  ('SMA', 'SOS', 'SMA-SOS-HUB-3', 'SMA-SOS-HUB', 'Ragam Gejala Sosial', 'ragam-gejala-sosial', 'subelement', 1, 3, ''),
  ('SMA', 'SOS', 'SMA-SOS-HUB-4', 'SMA-SOS-HUB', 'Masyarakat Multikultural', 'masyarakat-multikultural', 'subelement', 1, 4, ''),
  ('SMA', 'SOS', 'SMA-SOS-PEN', NULL, 'Penelitian Sosial', 'penelitian-sosial', 'element', 0, 3, ''),
  ('SMA', 'SOS', 'SMA-SOS-PEN-1', 'SMA-SOS-PEN', 'Langkah Penelitian Sosial dan Metode Penelitian', 'langkah-penelitian-sosial-dan-metode-penelitian', 'subelement', 1, 1, ''),
  ('SMA', 'SOS', 'SMA-SOS-KEL', NULL, 'Kelompok Sosial, Kesetaraan, dan Konflik Sosial', 'kelompok-sosial-kesetaraan-dan-konflik-sosial', 'element', 0, 4, ''),
  ('SMA', 'SOS', 'SMA-SOS-KEL-1', 'SMA-SOS-KEL', 'Konsep dan Dinamika Kelompok Sosial', 'konsep-dan-dinamika-kelompok-sosial', 'subelement', 1, 1, ''),
  ('SMA', 'SOS', 'SMA-SOS-KEL-2', 'SMA-SOS-KEL', 'Ketidaksetaraan dan Kesetaraan Sosial', 'ketidaksetaraan-dan-kesetaraan-sosial', 'subelement', 1, 2, ''),
  ('SMA', 'SOS', 'SMA-SOS-KEL-3', 'SMA-SOS-KEL', 'Konflik Sosial dan Penanganannya', 'konflik-sosial-dan-penanganannya', 'subelement', 1, 3, ''),
  ('SMA', 'SOS', 'SMA-SOS-PER', NULL, 'Perubahan Sosial dan Globalisasi', 'perubahan-sosial-dan-globalisasi', 'element', 0, 5, ''),
  ('SMA', 'SOS', 'SMA-SOS-PER-1', 'SMA-SOS-PER', 'Bentuk Perubahan Sosial dan Dampaknya', 'bentuk-perubahan-sosial-dan-dampaknya', 'subelement', 1, 1, ''),
  ('SMA', 'SOS', 'SMA-SOS-PER-2', 'SMA-SOS-PER', 'Globalisasi dan Dampaknya', 'globalisasi-dan-dampaknya', 'subelement', 1, 2, ''),
  ('SMA', 'SOS', 'SMA-SOS-PER-3', 'SMA-SOS-PER', 'Sikap Kritis terhadap Globalisasi', 'sikap-kritis-terhadap-globalisasi', 'subelement', 1, 3, ''),
  ('SMA', 'GEO', 'SMA-GEO-WIL', NULL, 'Wilayah Tempat Tinggal dan Lingkungan Sekitar', 'wilayah-tempat-tinggal-dan-lingkungan-sekitar', 'element', 0, 1, ''),
  ('SMA', 'GEO', 'SMA-GEO-WIL-1', 'SMA-GEO-WIL', 'Karakteristik Fisik dan Sosial Wilayah', 'karakteristik-fisik-dan-sosial-wilayah', 'subelement', 1, 1, ''),
  ('SMA', 'GEO', 'SMA-GEO-WIL-2', 'SMA-GEO-WIL', 'Dinamika Kependudukan', 'dinamika-kependudukan', 'subelement', 1, 2, ''),
  ('SMA', 'GEO', 'SMA-GEO-WIL-3', 'SMA-GEO-WIL', 'Keterkaitan Karakteristik Fisik dan Sosial', 'keterkaitan-karakteristik-fisik-dan-sosial', 'subelement', 1, 3, ''),
  ('SMA', 'GEO', 'SMA-GEO-WIL-4', 'SMA-GEO-WIL', 'Permasalahan Kewilayahan', 'permasalahan-kewilayahan', 'subelement', 1, 4, ''),
  ('SMA', 'GEO', 'SMA-GEO-PRO', NULL, 'Proses yang Memengaruhi Lingkungan Fisik dan Sosial', 'proses-yang-memengaruhi-lingkungan-fisik-dan-sosial', 'element', 0, 2, ''),
  ('SMA', 'GEO', 'SMA-GEO-PRO-1', 'SMA-GEO-PRO', 'Faktor yang Berpengaruh dalam Lingkungan Sosial', 'faktor-yang-berpengaruh-dalam-lingkungan-sosial', 'subelement', 1, 1, ''),
  ('SMA', 'GEO', 'SMA-GEO-PRO-2', 'SMA-GEO-PRO', 'Proses/Fenomena yang Memengaruhi Lingkungan Fisik', 'proses-fenomena-yang-memengaruhi-lingkungan-fisik', 'subelement', 1, 2, ''),
  ('SMA', 'GEO', 'SMA-GEO-INT', NULL, 'Interaksi Antargejala Fisik Alam dan Manusia', 'interaksi-antargejala-fisik-alam-dan-manusia', 'element', 0, 3, ''),
  ('SMA', 'GEO', 'SMA-GEO-INT-1', 'SMA-GEO-INT', 'Posisi Strategis Indonesia', 'posisi-strategis-indonesia', 'subelement', 1, 1, ''),
  ('SMA', 'GEO', 'SMA-GEO-INT-2', 'SMA-GEO-INT', 'Potensi Sumber Daya Alam Indonesia', 'potensi-sumber-daya-alam-indonesia', 'subelement', 1, 2, ''),
  ('SMA', 'GEO', 'SMA-GEO-BEN', NULL, 'Mitigasi dan Adaptasi Bencana Alam', 'mitigasi-dan-adaptasi-bencana-alam', 'element', 0, 4, ''),
  ('SMA', 'GEO', 'SMA-GEO-BEN-1', 'SMA-GEO-BEN', 'Bencana Geologis/Hidroklimatologis', 'bencana-geologis-hidroklimatologis', 'subelement', 1, 1, ''),
  ('SMA', 'GEO', 'SMA-GEO-BEN-2', 'SMA-GEO-BEN', 'Mitigasi dan Adaptasi terhadap Bencana', 'mitigasi-dan-adaptasi-terhadap-bencana', 'subelement', 1, 2, ''),
  ('SMA', 'GEO', 'SMA-GEO-FEN', NULL, 'Fenomena Geografi dalam Kehidupan Sehari-hari', 'fenomena-geografi-dalam-kehidupan-sehari-hari', 'element', 0, 5, ''),
  ('SMA', 'GEO', 'SMA-GEO-FEN-1', 'SMA-GEO-FEN', 'Peta, Penginderaan Jauh, dan SIG', 'peta-penginderaan-jauh-dan-sig', 'subelement', 1, 1, ''),
  ('SMA', 'SEJ', 'SMA-SEJ-PEN', NULL, 'Pengantar Ilmu Sejarah', 'pengantar-ilmu-sejarah', 'element', 0, 1, ''),
  ('SMA', 'SEJ', 'SMA-SEJ-PEN-1', 'SMA-SEJ-PEN', 'Konsep Dasar Sejarah', 'konsep-dasar-sejarah', 'subelement', 1, 1, ''),
  ('SMA', 'SEJ', 'SMA-SEJ-PEN-2', 'SMA-SEJ-PEN', 'Fenomena Sejarah dalam Kehidupan Sehari-hari', 'fenomena-sejarah-dalam-kehidupan-sehari-hari', 'subelement', 1, 2, ''),
  ('SMA', 'SEJ', 'SMA-SEJ-PEN-3', 'SMA-SEJ-PEN', 'Sumber-sumber Sejarah', 'sumber-sumber-sejarah', 'subelement', 1, 3, ''),
  ('SMA', 'SEJ', 'SMA-SEJ-KER', NULL, 'Periode Kerajaan Hindu-Buddha dan Islam', 'periode-kerajaan-hindu-buddha-dan-islam', 'element', 0, 2, ''),
  ('SMA', 'SEJ', 'SMA-SEJ-KER-1', 'SMA-SEJ-KER', 'Kehidupan Masa Kerajaan Hindu-Buddha', 'kehidupan-masa-kerajaan-hindu-buddha', 'subelement', 1, 1, ''),
  ('SMA', 'SEJ', 'SMA-SEJ-KER-2', 'SMA-SEJ-KER', 'Kehidupan Masa Kerajaan Islam', 'kehidupan-masa-kerajaan-islam', 'subelement', 1, 2, ''),
  ('SMA', 'SEJ', 'SMA-SEJ-ERO', NULL, 'Perlawanan terhadap Bangsa Eropa', 'perlawanan-terhadap-bangsa-eropa', 'element', 0, 3, ''),
  ('SMA', 'SEJ', 'SMA-SEJ-ERO-1', 'SMA-SEJ-ERO', 'Proses Kedatangan Bangsa Eropa ke Nusantara', 'proses-kedatangan-bangsa-eropa-ke-nusantara', 'subelement', 1, 1, ''),
  ('SMA', 'SEJ', 'SMA-SEJ-ERO-2', 'SMA-SEJ-ERO', 'Perlawanan sebelum Abad ke-20', 'perlawanan-sebelum-abad-ke-20', 'subelement', 1, 2, ''),
  ('SMA', 'SEJ', 'SMA-SEJ-NAS', NULL, 'Pergerakan Nasional sampai Proklamasi Kemerdekaan', 'pergerakan-nasional-sampai-proklamasi-kemerdekaan', 'element', 0, 4, ''),
  ('SMA', 'SEJ', 'SMA-SEJ-NAS-1', 'SMA-SEJ-NAS', 'Pergerakan Nasional Indonesia', 'pergerakan-nasional-indonesia', 'subelement', 1, 1, ''),
  ('SMA', 'SEJ', 'SMA-SEJ-NAS-2', 'SMA-SEJ-NAS', 'Relevansi Semangat Pergerakan Nasional', 'relevansi-semangat-pergerakan-nasional', 'subelement', 1, 2, ''),
  ('SMA', 'SEJ', 'SMA-SEJ-NAS-3', 'SMA-SEJ-NAS', 'Pendudukan Jepang dan Perlawanan Bangsa Indonesia', 'pendudukan-jepang-dan-perlawanan-bangsa-indonesia', 'subelement', 1, 3, ''),
  ('SMA', 'SEJ', 'SMA-SEJ-NAS-4', 'SMA-SEJ-NAS', 'Peristiwa dan Makna Proklamasi', 'peristiwa-dan-makna-proklamasi', 'subelement', 1, 4, ''),
  ('SMA', 'SEJ', 'SMA-SEJ-REV', NULL, 'Revolusi Kemerdekaan Indonesia sampai Demokrasi Terpimpin', 'revolusi-kemerdekaan-indonesia-sampai-demokrasi-terpimpin', 'element', 0, 5, ''),
  ('SMA', 'SEJ', 'SMA-SEJ-REV-1', 'SMA-SEJ-REV', 'Perjuangan Mempertahankan Kemerdekaan', 'perjuangan-mempertahankan-kemerdekaan', 'subelement', 1, 1, ''),
  ('SMA', 'SEJ', 'SMA-SEJ-REV-2', 'SMA-SEJ-REV', 'Demokrasi Liberal', 'demokrasi-liberal', 'subelement', 1, 2, ''),
  ('SMA', 'SEJ', 'SMA-SEJ-REV-3', 'SMA-SEJ-REV', 'Demokrasi Terpimpin', 'demokrasi-terpimpin', 'subelement', 1, 3, ''),
  ('SMA', 'SEJ', 'SMA-SEJ-REF', NULL, 'Orde Baru sampai Reformasi', 'orde-baru-sampai-reformasi', 'element', 0, 6, ''),
  ('SMA', 'SEJ', 'SMA-SEJ-REF-1', 'SMA-SEJ-REF', 'Orde Baru', 'orde-baru', 'subelement', 1, 1, ''),
  ('SMA', 'SEJ', 'SMA-SEJ-REF-2', 'SMA-SEJ-REF', 'Reformasi', 'reformasi', 'subelement', 1, 2, ''),
  ('SMA', 'ANT', 'SMA-ANT-PEN', NULL, 'Pengantar dan Ruang Lingkup Antropologi', 'pengantar-dan-ruang-lingkup-antropologi', 'element', 0, 1, ''),
  ('SMA', 'ANT', 'SMA-ANT-PEN-1', 'SMA-ANT-PEN', 'Konsep Dasar dan Sejarah Perkembangan Antropologi', 'konsep-dasar-dan-sejarah-perkembangan-antropologi', 'subelement', 1, 1, ''),
  ('SMA', 'ANT', 'SMA-ANT-PEN-2', 'SMA-ANT-PEN', 'Prinsip Dasar dan Pendekatan Antropologi', 'prinsip-dasar-dan-pendekatan-antropologi', 'subelement', 1, 2, ''),
  ('SMA', 'ANT', 'SMA-ANT-PEN-3', 'SMA-ANT-PEN', 'Ruang Lingkup Antropologi', 'ruang-lingkup-antropologi', 'subelement', 1, 3, ''),
  ('SMA', 'ANT', 'SMA-ANT-ETN', NULL, 'Etnografi', 'etnografi', 'element', 0, 2, ''),
  ('SMA', 'ANT', 'SMA-ANT-ETN-1', 'SMA-ANT-ETN', 'Pengertian Etnografi', 'pengertian-etnografi', 'subelement', 1, 1, ''),
  ('SMA', 'ANT', 'SMA-ANT-ETN-2', 'SMA-ANT-ETN', 'Metode dan Proses Penelitian Etnografi', 'metode-dan-proses-penelitian-etnografi', 'subelement', 1, 2, ''),
  ('SMA', 'ANT', 'SMA-ANT-ETN-3', 'SMA-ANT-ETN', 'Pemanfaatan Hasil Penelitian Etnografi secara Kritis', 'pemanfaatan-hasil-penelitian-etnografi-secara-kritis', 'subelement', 1, 3, ''),
  ('SMA', 'ANT', 'SMA-ANT-ETN-4', 'SMA-ANT-ETN', 'Penerapan Etnografi dalam Kehidupan Sehari-hari', 'penerapan-etnografi-dalam-kehidupan-sehari-hari', 'subelement', 1, 4, ''),
  ('SMA', 'ANT', 'SMA-ANT-MUL', NULL, 'Masyarakat Multikultural', 'masyarakat-multikultural', 'element', 0, 3, ''),
  ('SMA', 'ANT', 'SMA-ANT-MUL-1', 'SMA-ANT-MUL', 'Jenis-Jenis Multikulturalisme dalam Masyarakat', 'jenis-jenis-multikulturalisme-dalam-masyarakat', 'subelement', 1, 1, ''),
  ('SMA', 'ANT', 'SMA-ANT-MUL-2', 'SMA-ANT-MUL', 'Masyarakat Multikultural Indonesia dan Global: Tantangan dan Peluang', 'masyarakat-multikultural-indonesia-dan-global-tantangan-dan-peluang', 'subelement', 1, 2, ''),
  ('SMA', 'ANT', 'SMA-ANT-PER', NULL, 'Perubahan Sosial Budaya', 'perubahan-sosial-budaya', 'element', 0, 4, ''),
  ('SMA', 'ANT', 'SMA-ANT-PER-1', 'SMA-ANT-PER', 'Konsep, Bentuk, dan Faktor Perubahan Sosial Budaya', 'konsep-bentuk-dan-faktor-perubahan-sosial-budaya', 'subelement', 1, 1, ''),
  ('SMA', 'ANT', 'SMA-ANT-PER-2', 'SMA-ANT-PER', 'Dampak dan Respons Masyarakat terhadap Perubahan Sosial Budaya', 'dampak-dan-respons-masyarakat-terhadap-perubahan-sosial-budaya', 'subelement', 1, 2, ''),
  ('SMA', 'ANT', 'SMA-ANT-SOS', NULL, 'Antropologi Sosial dan Antropologi Budaya', 'antropologi-sosial-dan-antropologi-budaya', 'element', 0, 5, ''),
  ('SMA', 'ANT', 'SMA-ANT-SOS-1', 'SMA-ANT-SOS', 'Pengertian dan Cakupan Antropologi Sosial dan Budaya', 'pengertian-dan-cakupan-antropologi-sosial-dan-budaya', 'subelement', 1, 1, ''),
  ('SMA', 'ANT', 'SMA-ANT-SOS-2', 'SMA-ANT-SOS', 'Antropologi Terapan dan Studi Kasus', 'antropologi-terapan-dan-studi-kasus', 'subelement', 1, 2, ''),
  ('SMA', 'ANT', 'SMA-ANT-KEA', NULL, 'Kearifan Lokal dan Tradisi Lisan', 'kearifan-lokal-dan-tradisi-lisan', 'element', 0, 6, ''),
  ('SMA', 'ANT', 'SMA-ANT-KEA-1', 'SMA-ANT-KEA', 'Definisi dan Bentuk Kearifan Lokal', 'definisi-dan-bentuk-kearifan-lokal', 'subelement', 1, 1, ''),
  ('SMA', 'ANT', 'SMA-ANT-KEA-2', 'SMA-ANT-KEA', 'Peran Kearifan Lokal', 'peran-kearifan-lokal', 'subelement', 1, 2, ''),
  ('SMA', 'ANT', 'SMA-ANT-KEA-3', 'SMA-ANT-KEA', 'Jenis dan Fungsi Tradisi Lisan', 'jenis-dan-fungsi-tradisi-lisan', 'subelement', 1, 3, ''),
  ('SMA', 'ANT', 'SMA-ANT-KEA-4', 'SMA-ANT-KEA', 'Tantangan Kearifan Lokal dan Tradisi Lisan di Era Modern', 'tantangan-kearifan-lokal-dan-tradisi-lisan-di-era-modern', 'subelement', 1, 4, ''),
  ('SMA', 'PPKN', 'SMA-PPKN-PAN', NULL, 'Pancasila', 'pancasila', 'element', 0, 1, ''),
  ('SMA', 'PPKN', 'SMA-PPKN-PAN-1', 'SMA-PPKN-PAN', 'Pancasila sebagai Dasar Negara', 'pancasila-sebagai-dasar-negara', 'subelement', 1, 1, ''),
  ('SMA', 'PPKN', 'SMA-PPKN-PAN-2', 'SMA-PPKN-PAN', 'Ideologi Negara', 'ideologi-negara', 'subelement', 1, 2, ''),
  ('SMA', 'PPKN', 'SMA-PPKN-PAN-3', 'SMA-PPKN-PAN', 'Identitas Nasional', 'identitas-nasional', 'subelement', 1, 3, ''),
  ('SMA', 'PPKN', 'SMA-PPKN-PAN-4', 'SMA-PPKN-PAN', 'Hak Asasi Manusia', 'hak-asasi-manusia', 'subelement', 1, 4, ''),
  ('SMA', 'PPKN', 'SMA-PPKN-PAN-5', 'SMA-PPKN-PAN', 'Demokrasi Pancasila', 'demokrasi-pancasila', 'subelement', 1, 5, ''),
  ('SMA', 'PPKN', 'SMA-PPKN-UUD', NULL, 'Undang-Undang Dasar Negara Republik Indonesia Tahun 1945', 'undang-undang-dasar-negara-republik-indonesia-tahun-1945', 'element', 0, 2, ''),
  ('SMA', 'PPKN', 'SMA-PPKN-UUD-1', 'SMA-PPKN-UUD', 'Penegakan Hukum', 'penegakan-hukum', 'subelement', 1, 1, ''),
  ('SMA', 'PPKN', 'SMA-PPKN-UUD-2', 'SMA-PPKN-UUD', 'Perlindungan HAM', 'perlindungan-ham', 'subelement', 1, 2, ''),
  ('SMA', 'PPKN', 'SMA-PPKN-UUD-3', 'SMA-PPKN-UUD', 'Ketentuan UUD NRI Tahun 1945', 'ketentuan-uud-nri-tahun-1945', 'subelement', 1, 3, ''),
  ('SMA', 'PPKN', 'SMA-PPKN-UUD-4', 'SMA-PPKN-UUD', 'Demokrasi', 'demokrasi', 'subelement', 1, 4, ''),
  ('SMA', 'PPKN', 'SMA-PPKN-UUD-5', 'SMA-PPKN-UUD', 'Hubungan Pemerintah Pusat dan Daerah', 'hubungan-pemerintah-pusat-dan-daerah', 'subelement', 1, 5, ''),
  ('SMA', 'PPKN', 'SMA-PPKN-BHI', NULL, 'Bhinneka Tunggal Ika', 'bhinneka-tunggal-ika', 'element', 0, 3, ''),
  ('SMA', 'PPKN', 'SMA-PPKN-BHI-1', 'SMA-PPKN-BHI', 'Integrasi Nasional', 'integrasi-nasional', 'subelement', 1, 1, ''),
  ('SMA', 'PPKN', 'SMA-PPKN-BHI-2', 'SMA-PPKN-BHI', 'Kebinekaan sebagai Modal Sosial', 'kebinekaan-sebagai-modal-sosial', 'subelement', 1, 2, ''),
  ('SMA', 'PPKN', 'SMA-PPKN-BHI-3', 'SMA-PPKN-BHI', 'Harmoni dalam Keberagaman', 'harmoni-dalam-keberagaman', 'subelement', 1, 3, ''),
  ('SMA', 'PPKN', 'SMA-PPKN-BHI-4', 'SMA-PPKN-BHI', 'Ancaman terhadap Kebinekaan', 'ancaman-terhadap-kebinekaan', 'subelement', 1, 4, ''),
  ('SMA', 'PPKN', 'SMA-PPKN-NKRI', NULL, 'Komitmen terhadap Negara Kesatuan Republik Indonesia', 'komitmen-terhadap-negara-kesatuan-republik-indonesia', 'element', 0, 4, ''),
  ('SMA', 'PPKN', 'SMA-PPKN-NKRI-1', 'SMA-PPKN-NKRI', 'Perilaku Warga Negara yang Baik', 'perilaku-warga-negara-yang-baik', 'subelement', 1, 1, ''),
  ('SMA', 'PPKN', 'SMA-PPKN-NKRI-2', 'SMA-PPKN-NKRI', 'Menjaga Keutuhan NKRI', 'menjaga-keutuhan-nkri', 'subelement', 1, 2, ''),
  ('SMA', 'PPKN', 'SMA-PPKN-NKRI-3', 'SMA-PPKN-NKRI', 'Sistem Pertahanan Indonesia', 'sistem-pertahanan-indonesia', 'subelement', 1, 3, ''),
  ('SMA', 'PPKN', 'SMA-PPKN-NKRI-4', 'SMA-PPKN-NKRI', 'Peran Indonesia dalam Perdamaian Dunia', 'peran-indonesia-dalam-perdamaian-dunia', 'subelement', 1, 4, ''),
  ('SMA', 'PPKN', 'SMA-PPKN-NKRI-5', 'SMA-PPKN-NKRI', 'Demokrasi Indonesia', 'demokrasi-indonesia', 'subelement', 1, 5, ''),
  ('SMA', 'FRA', 'SMA-FRA-TOPIK', NULL, 'Topik Teks', 'topik-teks', 'domain', 0, 1, ''),
  ('SMA', 'FRA', 'SMA-FRA-TOPIK-1', 'SMA-FRA-TOPIK', 'Salam dan Berpamitan', 'salam-dan-berpamitan', 'topic', 1, 1, ''),
  ('SMA', 'FRA', 'SMA-FRA-TOPIK-2', 'SMA-FRA-TOPIK', 'Selamat dan Harapan', 'selamat-dan-harapan', 'topic', 1, 2, ''),
  ('SMA', 'FRA', 'SMA-FRA-TOPIK-3', 'SMA-FRA-TOPIK', 'Menyatakan Opini', 'menyatakan-opini', 'topic', 1, 3, ''),
  ('SMA', 'FRA', 'SMA-FRA-TOPIK-4', 'SMA-FRA-TOPIK', 'Angka, Jam, dan Tanggal', 'angka-jam-dan-tanggal', 'topic', 1, 4, ''),
  ('SMA', 'FRA', 'SMA-FRA-TOPIK-5', 'SMA-FRA-TOPIK', 'Pemberitahuan', 'pemberitahuan', 'topic', 1, 5, ''),
  ('SMA', 'FRA', 'SMA-FRA-TOPIK-6', 'SMA-FRA-TOPIK', 'Perkenalan Diri dan Aktivitas Sehari-hari', 'perkenalan-diri-dan-aktivitas-sehari-hari', 'topic', 1, 6, ''),
  ('SMA', 'FRA', 'SMA-FRA-TOPIK-7', 'SMA-FRA-TOPIK', 'Keberadaan Orang dan Benda', 'keberadaan-orang-dan-benda', 'topic', 1, 7, ''),
  ('SMA', 'FRA', 'SMA-FRA-TOPIK-8', 'SMA-FRA-TOPIK', 'Instruksi Tanda dan Rambu', 'instruksi-tanda-dan-rambu', 'topic', 1, 8, ''),
  ('SMA', 'FRA', 'SMA-FRA-TOPIK-9', 'SMA-FRA-TOPIK', 'Karakteristik Seseorang', 'karakteristik-seseorang', 'topic', 1, 9, ''),
  ('SMA', 'FRA', 'SMA-FRA-TOPIK-10', 'SMA-FRA-TOPIK', 'Benda dan Bangunan Publik', 'benda-dan-bangunan-publik', 'topic', 1, 10, ''),
  ('SMA', 'FRA', 'SMA-FRA-COMP', NULL, 'Kompetensi Membaca', 'kompetensi-membaca', 'domain', 0, 2, ''),
  ('SMA', 'FRA', 'SMA-FRA-COMP-1', 'SMA-FRA-COMP', 'Pemahaman Literal', 'pemahaman-literal', 'competency', 1, 1, ''),
  ('SMA', 'FRA', 'SMA-FRA-COMP-2', 'SMA-FRA-COMP', 'Reorganisasi', 'reorganisasi', 'competency', 1, 2, ''),
  ('SMA', 'FRA', 'SMA-FRA-COMP-3', 'SMA-FRA-COMP', 'Pemahaman Inferensial', 'pemahaman-inferensial', 'competency', 1, 3, ''),
  ('SMA', 'DEU', 'SMA-DEU-TOPIK', NULL, 'Topik Teks', 'topik-teks', 'domain', 0, 1, ''),
  ('SMA', 'DEU', 'SMA-DEU-TOPIK-1', 'SMA-DEU-TOPIK', 'Identität', 'identität', 'topic', 1, 1, ''),
  ('SMA', 'DEU', 'SMA-DEU-TOPIK-2', 'SMA-DEU-TOPIK', 'Schulleben', 'schulleben', 'topic', 1, 2, ''),
  ('SMA', 'DEU', 'SMA-DEU-TOPIK-3', 'SMA-DEU-TOPIK', 'Familien', 'familien', 'topic', 1, 3, ''),
  ('SMA', 'DEU', 'SMA-DEU-TOPIK-4', 'SMA-DEU-TOPIK', 'Wohnen', 'wohnen', 'topic', 1, 4, ''),
  ('SMA', 'DEU', 'SMA-DEU-TOPIK-5', 'SMA-DEU-TOPIK', 'Freizeitaktivitäten', 'freizeitaktivitäten', 'topic', 1, 5, ''),
  ('SMA', 'DEU', 'SMA-DEU-TOPIK-6', 'SMA-DEU-TOPIK', 'Berufe', 'berufe', 'topic', 1, 6, ''),
  ('SMA', 'DEU', 'SMA-DEU-TOPIK-7', 'SMA-DEU-TOPIK', 'Essen und Trinken', 'essen-und-trinken', 'topic', 1, 7, ''),
  ('SMA', 'DEU', 'SMA-DEU-TOPIK-8', 'SMA-DEU-TOPIK', 'Einkaufen', 'einkaufen', 'topic', 1, 8, ''),
  ('SMA', 'DEU', 'SMA-DEU-TOPIK-9', 'SMA-DEU-TOPIK', 'Reisen', 'reisen', 'topic', 1, 9, ''),
  ('SMA', 'DEU', 'SMA-DEU-COMP', NULL, 'Kompetensi Membaca', 'kompetensi-membaca', 'domain', 0, 2, ''),
  ('SMA', 'DEU', 'SMA-DEU-COMP-1', 'SMA-DEU-COMP', 'Pemahaman Literal', 'pemahaman-literal', 'competency', 1, 1, ''),
  ('SMA', 'DEU', 'SMA-DEU-COMP-2', 'SMA-DEU-COMP', 'Reorganisasi', 'reorganisasi', 'competency', 1, 2, ''),
  ('SMA', 'DEU', 'SMA-DEU-COMP-3', 'SMA-DEU-COMP', 'Pemahaman Inferensial', 'pemahaman-inferensial', 'competency', 1, 3, ''),
  ('SMA', 'JPN', 'SMA-JPN-TOPIK', NULL, 'Topik Teks', 'topik-teks', 'domain', 0, 1, ''),
  ('SMA', 'JPN', 'SMA-JPN-TOPIK-1', 'SMA-JPN-TOPIK', 'Aisatsu (Persalaman)', 'aisatsu-persalaman', 'topic', 1, 1, ''),
  ('SMA', 'JPN', 'SMA-JPN-TOPIK-2', 'SMA-JPN-TOPIK', 'Jikoshoukai (Perkenalan Diri)', 'jikoshoukai-perkenalan-diri', 'topic', 1, 2, ''),
  ('SMA', 'JPN', 'SMA-JPN-TOPIK-3', 'SMA-JPN-TOPIK', 'Jikan (Waktu)', 'jikan-waktu', 'topic', 1, 3, ''),
  ('SMA', 'JPN', 'SMA-JPN-TOPIK-4', 'SMA-JPN-TOPIK', 'Kazoku (Keluarga)', 'kazoku-keluarga', 'topic', 1, 4, ''),
  ('SMA', 'JPN', 'SMA-JPN-TOPIK-5', 'SMA-JPN-TOPIK', 'Dekirukoto (Kemampuan)', 'dekirukoto-kemampuan', 'topic', 1, 5, ''),
  ('SMA', 'JPN', 'SMA-JPN-TOPIK-6', 'SMA-JPN-TOPIK', 'Gakkou no Seikatsu (Kehidupan Sekolah)', 'gakkou-no-seikatsu-kehidupan-sekolah', 'topic', 1, 6, ''),
  ('SMA', 'JPN', 'SMA-JPN-TOPIK-7', 'SMA-JPN-TOPIK', 'Uchi (Rumah)', 'uchi-rumah', 'topic', 1, 7, ''),
  ('SMA', 'JPN', 'SMA-JPN-TOPIK-8', 'SMA-JPN-TOPIK', 'Mainichi no Seikatsu (Kehidupan Sehari-hari)', 'mainichi-no-seikatsu-kehidupan-sehari-hari', 'topic', 1, 8, ''),
  ('SMA', 'JPN', 'SMA-JPN-TOPIK-9', 'SMA-JPN-TOPIK', 'Shumi (Hobi)', 'shumi-hobi', 'topic', 1, 9, ''),
  ('SMA', 'JPN', 'SMA-JPN-TOPIK-10', 'SMA-JPN-TOPIK', 'Himana Toki (Waktu Senggang)', 'himana-toki-waktu-senggang', 'topic', 1, 10, ''),
  ('SMA', 'JPN', 'SMA-JPN-COMP', NULL, 'Kompetensi Membaca', 'kompetensi-membaca', 'domain', 0, 2, ''),
  ('SMA', 'JPN', 'SMA-JPN-COMP-1', 'SMA-JPN-COMP', 'Pemahaman Literal', 'pemahaman-literal', 'competency', 1, 1, ''),
  ('SMA', 'JPN', 'SMA-JPN-COMP-2', 'SMA-JPN-COMP', 'Reorganisasi', 'reorganisasi', 'competency', 1, 2, ''),
  ('SMA', 'JPN', 'SMA-JPN-COMP-3', 'SMA-JPN-COMP', 'Pemahaman Inferensial', 'pemahaman-inferensial', 'competency', 1, 3, ''),
  ('SMA', 'KOR', 'SMA-KOR-TOPIK', NULL, 'Topik Teks', 'topik-teks', 'domain', 0, 1, ''),
  ('SMA', 'KOR', 'SMA-KOR-TOPIK-1', 'SMA-KOR-TOPIK', 'Perkenalan Diri', 'perkenalan-diri', 'topic', 1, 1, ''),
  ('SMA', 'KOR', 'SMA-KOR-TOPIK-2', 'SMA-KOR-TOPIK', 'Salam', 'salam', 'topic', 1, 2, ''),
  ('SMA', 'KOR', 'SMA-KOR-TOPIK-3', 'SMA-KOR-TOPIK', 'Belanja', 'belanja', 'topic', 1, 3, ''),
  ('SMA', 'KOR', 'SMA-KOR-TOPIK-4', 'SMA-KOR-TOPIK', 'Hobi', 'hobi', 'topic', 1, 4, ''),
  ('SMA', 'KOR', 'SMA-KOR-TOPIK-5', 'SMA-KOR-TOPIK', 'Transportasi', 'transportasi', 'topic', 1, 5, ''),
  ('SMA', 'KOR', 'SMA-KOR-TOPIK-6', 'SMA-KOR-TOPIK', 'Cuaca', 'cuaca', 'topic', 1, 6, ''),
  ('SMA', 'KOR', 'SMA-KOR-TOPIK-7', 'SMA-KOR-TOPIK', 'Kehidupan Sehari-hari', 'kehidupan-sehari-hari', 'topic', 1, 7, ''),
  ('SMA', 'KOR', 'SMA-KOR-TOPIK-8', 'SMA-KOR-TOPIK', 'Kehidupan Keluarga', 'kehidupan-keluarga', 'topic', 1, 8, ''),
  ('SMA', 'KOR', 'SMA-KOR-TOPIK-9', 'SMA-KOR-TOPIK', 'Wisata', 'wisata', 'topic', 1, 9, ''),
  ('SMA', 'KOR', 'SMA-KOR-TOPIK-10', 'SMA-KOR-TOPIK', 'Kehidupan Sekolah', 'kehidupan-sekolah', 'topic', 1, 10, ''),
  ('SMA', 'KOR', 'SMA-KOR-COMP', NULL, 'Kompetensi Membaca', 'kompetensi-membaca', 'domain', 0, 2, ''),
  ('SMA', 'KOR', 'SMA-KOR-COMP-1', 'SMA-KOR-COMP', 'Pemahaman Literal', 'pemahaman-literal', 'competency', 1, 1, ''),
  ('SMA', 'KOR', 'SMA-KOR-COMP-2', 'SMA-KOR-COMP', 'Reorganisasi', 'reorganisasi', 'competency', 1, 2, ''),
  ('SMA', 'KOR', 'SMA-KOR-COMP-3', 'SMA-KOR-COMP', 'Pemahaman Inferensial', 'pemahaman-inferensial', 'competency', 1, 3, ''),
  ('SMA', 'ZHO', 'SMA-ZHO-TOPIK', NULL, 'Topik Teks', 'topik-teks', 'domain', 0, 1, ''),
  ('SMA', 'ZHO', 'SMA-ZHO-TOPIK-1', 'SMA-ZHO-TOPIK', 'Identitas Diri', 'identitas-diri', 'topic', 1, 1, ''),
  ('SMA', 'ZHO', 'SMA-ZHO-TOPIK-2', 'SMA-ZHO-TOPIK', 'Kehidupan Sekolah', 'kehidupan-sekolah', 'topic', 1, 2, ''),
  ('SMA', 'ZHO', 'SMA-ZHO-TOPIK-3', 'SMA-ZHO-TOPIK', 'Kehidupan Keluarga', 'kehidupan-keluarga', 'topic', 1, 3, ''),
  ('SMA', 'ZHO', 'SMA-ZHO-TOPIK-4', 'SMA-ZHO-TOPIK', 'Kehidupan Sehari-hari', 'kehidupan-sehari-hari', 'topic', 1, 4, ''),
  ('SMA', 'ZHO', 'SMA-ZHO-TOPIK-5', 'SMA-ZHO-TOPIK', 'Waktu Senggang dan Hobi', 'waktu-senggang-dan-hobi', 'topic', 1, 5, ''),
  ('SMA', 'ZHO', 'SMA-ZHO-COMP', NULL, 'Kompetensi Membaca', 'kompetensi-membaca', 'domain', 0, 2, ''),
  ('SMA', 'ZHO', 'SMA-ZHO-COMP-1', 'SMA-ZHO-COMP', 'Pemahaman Literal', 'pemahaman-literal', 'competency', 1, 1, ''),
  ('SMA', 'ZHO', 'SMA-ZHO-COMP-2', 'SMA-ZHO-COMP', 'Reorganisasi', 'reorganisasi', 'competency', 1, 2, ''),
  ('SMA', 'ZHO', 'SMA-ZHO-COMP-3', 'SMA-ZHO-COMP', 'Pemahaman Inferensial', 'pemahaman-inferensial', 'competency', 1, 3, ''),
  ('SMA', 'ARB', 'SMA-ARB-TOPIK', NULL, 'Topik Teks', 'topik-teks', 'domain', 0, 1, ''),
  ('SMA', 'ARB', 'SMA-ARB-TOPIK-1', 'SMA-ARB-TOPIK', 'Kehidupan Sekolah', 'kehidupan-sekolah', 'topic', 1, 1, ''),
  ('SMA', 'ARB', 'SMA-ARB-TOPIK-2', 'SMA-ARB-TOPIK', 'Kehidupan Keluarga', 'kehidupan-keluarga', 'topic', 1, 2, ''),
  ('SMA', 'ARB', 'SMA-ARB-TOPIK-3', 'SMA-ARB-TOPIK', 'Hobi', 'hobi', 'topic', 1, 3, ''),
  ('SMA', 'ARB', 'SMA-ARB-TOPIK-4', 'SMA-ARB-TOPIK', 'Pekerjaan', 'pekerjaan', 'topic', 1, 4, ''),
  ('SMA', 'ARB', 'SMA-ARB-TOPIK-5', 'SMA-ARB-TOPIK', 'Pelayanan Umum', 'pelayanan-umum', 'topic', 1, 5, ''),
  ('SMA', 'ARB', 'SMA-ARB-TOPIK-6', 'SMA-ARB-TOPIK', 'Lingkungan Sekitar', 'lingkungan-sekitar', 'topic', 1, 6, ''),
  ('SMA', 'ARB', 'SMA-ARB-TOPIK-7', 'SMA-ARB-TOPIK', 'Ungkapan Persetujuan', 'ungkapan-persetujuan', 'topic', 1, 7, ''),
  ('SMA', 'ARB', 'SMA-ARB-TOPIK-8', 'SMA-ARB-TOPIK', 'Perintah', 'perintah', 'topic', 1, 8, ''),
  ('SMA', 'ARB', 'SMA-ARB-TOPIK-9', 'SMA-ARB-TOPIK', 'Larangan', 'larangan', 'topic', 1, 9, ''),
  ('SMA', 'ARB', 'SMA-ARB-COMP', NULL, 'Kompetensi Membaca', 'kompetensi-membaca', 'domain', 0, 2, ''),
  ('SMA', 'ARB', 'SMA-ARB-COMP-1', 'SMA-ARB-COMP', 'Pemahaman Literal', 'pemahaman-literal', 'competency', 1, 1, ''),
  ('SMA', 'ARB', 'SMA-ARB-COMP-2', 'SMA-ARB-COMP', 'Reorganisasi', 'reorganisasi', 'competency', 1, 2, ''),
  ('SMA', 'ARB', 'SMA-ARB-COMP-3', 'SMA-ARB-COMP', 'Pemahaman Inferensial', 'pemahaman-inferensial', 'competency', 1, 3, ''),
  ('SMA', 'PKK', 'SMA-PKK-PROD', NULL, 'Kegiatan Produksi, Pemasaran, dan Distribusi', 'kegiatan-produksi-pemasaran-dan-distribusi', 'element', 0, 1, ''),
  ('SMA', 'PKK', 'SMA-PKK-PROD-1', 'SMA-PKK-PROD', 'Desain Produk Barang/Jasa', 'desain-produk-barang-jasa', 'subelement', 1, 1, ''),
  ('SMA', 'PKK', 'SMA-PKK-PROD-2', 'SMA-PKK-PROD', 'Desain Kemasan Produk', 'desain-kemasan-produk', 'subelement', 1, 2, ''),
  ('SMA', 'PKK', 'SMA-PKK-PROD-3', 'SMA-PKK-PROD', 'Prototipe Produk Barang/Jasa', 'prototipe-produk-barang-jasa', 'subelement', 1, 3, ''),
  ('SMA', 'PKK', 'SMA-PKK-PROD-4', 'SMA-PKK-PROD', 'Perencanaan Produksi', 'perencanaan-produksi', 'subelement', 1, 4, ''),
  ('SMA', 'PKK', 'SMA-PKK-PROD-5', 'SMA-PKK-PROD', 'Produksi', 'produksi', 'subelement', 1, 5, ''),
  ('SMA', 'PKK', 'SMA-PKK-PROD-6', 'SMA-PKK-PROD', 'Pengendalian Mutu', 'pengendalian-mutu', 'subelement', 1, 6, ''),
  ('SMA', 'PKK', 'SMA-PKK-PROD-7', 'SMA-PKK-PROD', 'Pemasaran Produk', 'pemasaran-produk', 'subelement', 1, 7, ''),
  ('SMA', 'PKK', 'SMA-PKK-PROD-8', 'SMA-PKK-PROD', 'Distribusi Produk', 'distribusi-produk', 'subelement', 1, 8, ''),
  ('SMA', 'PKK', 'SMA-PKK-USAHA', NULL, 'Peluang dan Perencanaan Usaha', 'peluang-dan-perencanaan-usaha', 'element', 0, 2, ''),
  ('SMA', 'PKK', 'SMA-PKK-USAHA-1', 'SMA-PKK-USAHA', 'Peluang Usaha', 'peluang-usaha', 'subelement', 1, 1, ''),
  ('SMA', 'PKK', 'SMA-PKK-USAHA-2', 'SMA-PKK-USAHA', 'Perencanaan Usaha', 'perencanaan-usaha', 'subelement', 1, 2, ''),
  ('SMA', 'PKK', 'SMA-PKK-USAHA-3', 'SMA-PKK-USAHA', 'Proposal Usaha', 'proposal-usaha', 'subelement', 1, 3, ''),
  ('SMA', 'PKK', 'SMA-PKK-BIAYA', NULL, 'Biaya dan Keuangan Usaha', 'biaya-dan-keuangan-usaha', 'element', 0, 3, ''),
  ('SMA', 'PKK', 'SMA-PKK-BIAYA-1', 'SMA-PKK-BIAYA', 'Biaya Produksi', 'biaya-produksi', 'subelement', 1, 1, ''),
  ('SMA', 'PKK', 'SMA-PKK-BIAYA-2', 'SMA-PKK-BIAYA', 'Harga Pokok', 'harga-pokok', 'subelement', 1, 2, ''),
  ('SMA', 'PKK', 'SMA-PKK-BIAYA-3', 'SMA-PKK-BIAYA', 'Laporan Keuangan', 'laporan-keuangan', 'subelement', 1, 3, ''),
  ('SMA', 'PKK', 'SMA-PKK-HKI', NULL, 'Hak atas Kekayaan Intelektual', 'hak-atas-kekayaan-intelektual', 'element', 0, 4, ''),
  ('SMA', 'PKK', 'SMA-PKK-HKI-1', 'SMA-PKK-HKI', 'Konsep dan Penerapan HaKI', 'konsep-dan-penerapan-haki', 'subelement', 1, 1, '');

UPDATE
  public.subjects s
SET
  status = 'INACTIVE',
  subject_type = 'ENRICHMENT',
  updated_at = now()
FROM
  public.tracks t
  JOIN public.programs p ON p.id = t.program_id
WHERE
  s.track_id = t.id
  AND p.code = 'TKA'
  AND ((t.code = 'SD'
      AND s.code = 'BIG')
    OR (t.code = 'SMP'
      AND s.code IN ('BIG', 'IPA')));

UPDATE
  public.subjects s
SET
  status = 'ACTIVE',
  subject_type = 'MANDATORY',
  updated_at = now()
FROM
  public.tracks t
  JOIN public.programs p ON p.id = t.program_id
WHERE
  s.track_id = t.id
  AND p.code = 'TKA'
  AND ((t.code = 'SD'
      AND s.code IN ('BIN', 'MAT'))
    OR (t.code = 'SMP'
      AND s.code IN ('BIN', 'MAT')));

INSERT INTO public.knowledge_nodes (subject_id, parent_id, code, name, slug, node_type, description, depth, sort_order, status, created_at, updated_at)
SELECT
  s.id,
  NULL,
  x.node_code,
  x.name,
  x.slug,
  x.node_type,
  coalesce(nullif (x.description, ''), 'Official government assessment taxonomy'),
  x.depth,
  x.sort_order,
  'active',
  now(),
  now()
FROM
  _official_taxonomy x
  JOIN public.tracks t ON t.code = x.track_code
  JOIN public.programs p ON p.id = t.program_id
  JOIN public.subjects s ON s.track_id = t.id
    AND s.code = x.subject_code
WHERE (p.code = 'CPNS'
  AND t.code = 'SKD')
  OR p.code = 'TKA'
ON CONFLICT (subject_id,
  slug)
  DO UPDATE SET
    code = excluded.code,
    name = excluded.name,
    node_type = excluded.node_type,
    description = excluded.description,
    depth = excluded.depth,
    sort_order = excluded.sort_order,
    status = 'active',
    updated_at = now();

UPDATE
  public.knowledge_nodes child
SET
  parent_id = parent.id,
  updated_at = now()
FROM
  _official_taxonomy x
  JOIN public.tracks t ON t.code = x.track_code
  JOIN public.programs p ON p.id = t.program_id
  JOIN public.subjects s ON s.track_id = t.id
    AND s.code = x.subject_code
  JOIN public.knowledge_nodes parent ON parent.subject_id = s.id
    AND parent.code = x.parent_code
WHERE
  x.parent_code IS NOT NULL
  AND child.subject_id = s.id
  AND child.code = x.node_code
  AND ((p.code = 'CPNS'
      AND t.code = 'SKD')
    OR p.code = 'TKA');

UPDATE
  public.knowledge_nodes child
SET
  parent_id = NULL,
  updated_at = now()
FROM
  _official_taxonomy x
  JOIN public.tracks t ON t.code = x.track_code
  JOIN public.programs p ON p.id = t.program_id
  JOIN public.subjects s ON s.track_id = t.id
    AND s.code = x.subject_code
WHERE
  x.parent_code IS NULL
  AND child.subject_id = s.id
  AND child.code = x.node_code
  AND ((p.code = 'CPNS'
      AND t.code = 'SKD')
    OR p.code = 'TKA');

DELETE FROM public.knowledge_node_paths;

WITH RECURSIVE lineage AS (
  SELECT
    kn.id descendant_id,
    kn.id ancestor_id,
    0 depth
  FROM
    public.knowledge_nodes kn
  UNION ALL
  SELECT
    l.descendant_id,
    current_node.parent_id,
    l.depth + 1
  FROM
    lineage l
    JOIN public.knowledge_nodes current_node ON current_node.id = l.ancestor_id
  WHERE
    current_node.parent_id IS NOT NULL)
INSERT INTO public.knowledge_node_paths (ancestor_id, descendant_id, depth)
SELECT
  ancestor_id,
  descendant_id,
  min(depth)
FROM
  lineage
WHERE
  ancestor_id IS NOT NULL
GROUP BY
  ancestor_id,
  descendant_id;

-- Exact-only legacy mapping. No guessed classification.
INSERT INTO public.question_knowledge_nodes (question_id, knowledge_node_id, relation_type)
SELECT
  q.id,
  kn.id,
  'primary'
FROM
  public.questions q
  JOIN public.subjects s ON s.id = q.subject_id
    AND s.code = 'MAT'
  JOIN public.tracks t ON t.id = q.track_id
    AND t.code = 'SD'
  JOIN public.programs p ON p.id = q.program_id
    AND p.code = 'TKA'
  JOIN public.knowledge_nodes kn ON kn.subject_id = s.id
    AND kn.name = q.response_config ->> 'legacySubCategory'
    AND kn.node_type = 'subelement'
WHERE
  q.status IN ('approved', 'published')
  AND q.response_config ->> 'legacySubCategory' IN ('Bilangan Rasional', 'Objek Geometri', 'Pengukuran', 'Penyajian dan Penggunaan Data')
ON CONFLICT (question_id,
  knowledge_node_id)
  DO UPDATE SET
    relation_type = 'primary';

INSERT INTO public.question_knowledge_nodes (question_id, knowledge_node_id, relation_type)
SELECT
  q.id,
  kn.id,
  'primary'
FROM
  public.questions q
  JOIN public.subjects s ON s.id = q.subject_id
    AND s.code = 'BIN'
  JOIN public.tracks t ON t.id = q.track_id
    AND t.code = 'SD'
  JOIN public.programs p ON p.id = q.program_id
    AND p.code = 'TKA'
  JOIN public.knowledge_nodes kn ON kn.subject_id = s.id
    AND kn.name = q.response_config ->> 'legacySubCategory'
    AND kn.node_type = 'text_type'
WHERE
  q.status IN ('approved', 'published')
  AND q.response_config ->> 'legacySubCategory' IN ('Teks Informasi', 'Teks Fiksi')
ON CONFLICT (question_id,
  knowledge_node_id)
  DO UPDATE SET
    relation_type = 'primary';

INSERT INTO public.question_knowledge_nodes (question_id, knowledge_node_id, relation_type)
SELECT
  q.id,
  kn.id,
  'secondary'
FROM
  public.questions q
  JOIN public.subjects s ON s.id = q.subject_id
    AND s.code = 'BIN'
  JOIN public.tracks t ON t.id = q.track_id
    AND t.code = 'SD'
  JOIN public.programs p ON p.id = q.program_id
    AND p.code = 'TKA'
  JOIN public.knowledge_nodes kn ON kn.subject_id = s.id
    AND kn.name = q.cognitive_level
    AND kn.node_type = 'competency'
WHERE
  q.status IN ('approved', 'published')
  AND q.cognitive_level IN ('Pemahaman Tekstual', 'Pemahaman Inferensial', 'Evaluasi dan Apresiasi')
ON CONFLICT (question_id,
  knowledge_node_id)
  DO UPDATE SET
    relation_type = 'secondary';

-- Freeze only official TKA SD Bahasa Indonesia/Matematika questions.
INSERT INTO public.question_versions (question_id, version, snapshot, changed_by, change_reason, created_at)
SELECT
  q.id,
  q.version,
  jsonb_build_object('question', jsonb_build_object('question_code', q.question_code, 'program_id', q.program_id, 'track_id', q.track_id, 'subject_id', q.subject_id, 'question_type', q.question_type, 'stem', q.stem, 'difficulty', q.difficulty, 'cognitive_level', q.cognitive_level, 'source_type', q.source_type, 'source_reference', q.source_reference, 'estimated_seconds', q.estimated_seconds, 'stimulus_id', q.stimulus_id, 'stimulus_order', q.stimulus_order, 'response_config', q.response_config), 'options', coalesce((
      SELECT
        jsonb_agg(jsonb_build_object('id', qo.id, 'option_key', qo.option_key, 'content', qo.content, 'is_correct', qo.is_correct, 'score', qo.score, 'sort_order', qo.sort_order, 'image_url', qo.image_url, 'response_group', qo.response_group, 'response_group_order', qo.response_group_order, 'metadata', qo.metadata)
      ORDER BY qo.sort_order)
      FROM public.question_options qo
      WHERE
        qo.question_id = q.id), '[]'::jsonb), 'stimulus', CASE WHEN q.stimulus_id IS NULL THEN
      NULL
    ELSE
      (
        SELECT
          to_jsonb (qs)
        FROM public.question_stimuli qs
        WHERE
          qs.id = q.stimulus_id)
    END, 'explanations', coalesce((
      SELECT
        jsonb_agg(jsonb_build_object('format', qe.format, 'content', qe.content, 'version', qe.version, 'video_url', qe.video_url)
        ORDER BY qe.version)
      FROM public.question_explanations qe
      WHERE
        qe.question_id = q.id), '[]'::jsonb), 'knowledge_nodes', coalesce((
      SELECT
        jsonb_agg(jsonb_build_object('relation_type', qkn.relation_type, 'knowledge_node_id', qkn.knowledge_node_id)
        ORDER BY qkn.relation_type, qkn.knowledge_node_id)
      FROM public.question_knowledge_nodes qkn
    WHERE
      qkn.question_id = q.id), '[]'::jsonb)),
  q.author_id,
  'Official TKA SD BIN/MAT taxonomy snapshot backfill for Drill compatibility',
  now()
FROM
  public.questions q
  JOIN public.tracks t ON t.id = q.track_id
    AND t.code = 'SD'
  JOIN public.programs p ON p.id = q.program_id
    AND p.code = 'TKA'
  JOIN public.subjects s ON s.id = q.subject_id
    AND s.code IN ('BIN', 'MAT')
WHERE
  q.status IN ('approved', 'published')
  AND NOT EXISTS (
    SELECT
      1
    FROM
      public.question_versions qv
    WHERE
      qv.question_id = q.id
      AND qv.version = q.version)
  ON CONFLICT (question_id,
    version)
  DO NOTHING;
