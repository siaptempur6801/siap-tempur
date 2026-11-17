-- Seed Data: 40 TKP Questions (Tes Karakteristik Pribadi)
-- TKP uses a 1-5 scoring system where higher scores indicate better personality traits
DO $$
DECLARE
  q_id uuid;
BEGIN
  -- Question 1
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Jika rekan kerja Anda melakukan kesalahan yang merugikan tim, apa yang akan Anda lakukan?', 'TKP', 'Integritas', 1, 'Memberitahu langsung dengan cara yang baik menunjukkan integritas dan kepedulian terhadap perbaikan.')
  RETURNING
    id
  INTO
    q_id;

  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Membiarkan saja karena bukan urusan saya', FALSE, 1),
    (q_id, 'Melaporkan kepada atasan tanpa bicara dengannya', FALSE, 2),
    (q_id, 'Memberitahu dengan cara yang baik dan membantu memperbaiki', FALSE, 5),
    (q_id, 'Menegur keras di depan orang lain', FALSE, 2),
    (q_id, 'Menasihati secara pribadi tanpa melibatkan atasan', FALSE, 4);
  -- Question 2
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Atasan memberikan tugas tambahan di luar jam kerja. Sikap Anda?', 'TKP', 'Pelayanan Publik', 1, 'Menerima dengan senang hati dan memastikan kualitas menunjukkan dedikasi tinggi terhadap pekerjaan.')
  RETURNING
    id
  INTO
    q_id;

  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Menolak karena sudah melewati jam kerja', FALSE, 1),
    (q_id, 'Menerima tapi mengerjakannya asal-asalan', FALSE, 2),
    (q_id, 'Menerima dengan senang hati dan memastikan kualitas tetap baik', FALSE, 5),
    (q_id, 'Menerima dengan terpaksa sambil mengeluh', FALSE, 2),
    (q_id, 'Meminta kompensasi tambahan terlebih dahulu', FALSE, 3);
  -- Question 3
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Anda menemukan uang di kantor. Apa yang akan Anda lakukan?', 'TKP', 'Integritas', 1, 'Menyerahkan kepada atasan atau bagian umum adalah tindakan yang paling jujur dan bertanggung jawab.')
  RETURNING
    id
  INTO
    q_id;

  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Mengambil dan menggunakannya sendiri', FALSE, 1),
    (q_id, 'Membiarkannya di tempat', FALSE, 2),
    (q_id, 'Menyerahkan ke atasan atau bagian umum', FALSE, 5),
    (q_id, 'Bertanya pada teman apakah boleh diambil', FALSE, 2),
    (q_id, 'Mengumumkan kepada semua orang di kantor', FALSE, 4);
  -- Question 4
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Tim Anda gagal mencapai target. Bagaimana sikap Anda?', 'TKP', 'Kerja Sama', 2, 'Evaluasi bersama dan mencari solusi perbaikan menunjukkan sikap konstruktif dan orientasi pada solusi.')
  RETURNING
    id
  INTO
    q_id;

  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Menyalahkan anggota tim yang tidak kompeten', FALSE, 1),
    (q_id, 'Mengundurkan diri dari tim', FALSE, 1),
    (q_id, 'Evaluasi bersama dan mencari solusi perbaikan', FALSE, 5),
    (q_id, 'Melaporkan kepada atasan bahwa tim tidak solid', FALSE, 2),
    (q_id, 'Menyusun strategi baru secara individual', FALSE, 3);
  -- Question 5
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Anda diminta mengerjakan pekerjaan yang tidak sesuai job desc. Sikap Anda?', 'TKP', 'Profesionalisme', 2, 'Mengerjakan dengan baik sambil mendiskusikan job desc menunjukkan fleksibilitas dan komunikasi yang baik.')
  RETURNING
    id
  INTO
    q_id;

  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Menolak dengan tegas', FALSE, 1),
    (q_id, 'Mengerjakan sambil terus mengeluh', FALSE, 2),
    (q_id, 'Mengerjakan dengan baik dan mendiskusikan job desc dengan atasan', FALSE, 5),
    (q_id, 'Mengerjakan asal-asalan', FALSE, 1),
    (q_id, 'Meminta izin mengerjakan di lain waktu', FALSE, 3);
  -- Question 6
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Rekan kerja sering terlambat menyelesaikan bagian tugasnya, mempengaruhi pekerjaan Anda. Apa yang Anda lakukan?', 'TKP', 'Kerja Sama', 2, 'Berbicara baik-baik dan menawarkan bantuan adalah pendekatan yang konstruktif dan empati.')
  RETURNING
    id
  INTO
    q_id;

  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Melaporkan ke atasan agar dia ditegur', FALSE, 2),
    (q_id, 'Mengambil alih tugasnya tanpa pemberitahuan', FALSE, 3),
    (q_id, 'Berbicara baik-baik dan menawarkan bantuan', FALSE, 5),
    (q_id, 'Mengabaikan dan fokus pada tugas sendiri', FALSE, 1),
    (q_id, 'Menegur di depan tim agar jera', FALSE, 1);
  -- Question 7
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Saat presentasi, Anda mendapat kritik keras dari peserta. Respons Anda?', 'TKP', 'Menerima Kritik', 2, 'Mendengarkan, berterima kasih, dan berkomitmen perbaiki menunjukkan keterbukaan dan kematangan emosi.')
  RETURNING
    id
  INTO
    q_id;

  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Membela diri dan menjelaskan bahwa kritik tidak tepat', FALSE, 2),
    (q_id, 'Diam saja dan mengabaikan kritik tersebut', FALSE, 1),
    (q_id, 'Mendengarkan, berterima kasih, dan berkomitmen untuk perbaiki', FALSE, 5),
    (q_id, 'Merasa tersinggung dan membalas kritik', FALSE, 1),
    (q_id, 'Mencatat kritik tapi tidak berniat memperbaiki', FALSE, 2);
  -- Question 8
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Anda diberi proyek besar dengan deadline ketat. Strategi Anda?', 'TKP', 'Manajemen Waktu', 2, 'Membuat prioritas, timeline, dan meminta bantuan bila perlu menunjukkan perencanaan yang baik.')
  RETURNING
    id
  INTO
    q_id;

  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Langsung mengerjakan tanpa rencana', FALSE, 2),
    (q_id, 'Meminta deadline diperpanjang', FALSE, 2),
    (q_id, 'Membuat prioritas, timeline, dan meminta bantuan bila perlu', FALSE, 5),
    (q_id, 'Mengerjakan semua sendiri meski beresiko terlambat', FALSE, 3),
    (q_id, 'Mendelegasikan semua ke tim tanpa supervisi', FALSE, 1);
  -- Question 9
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Atasan meminta Anda lembur tanpa kompensasi tambahan. Respons Anda?', 'TKP', 'Dedikasi', 2, 'Bersedia lembur dengan ikhlas karena bagian dari tanggung jawab menunjukkan dedikasi tinggi.')
  RETURNING
    id
  INTO
    q_id;

  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Menolak karena tidak ada kompensasi', FALSE, 1),
    (q_id, 'Bersedia tapi dengan wajah tidak senang', FALSE, 2),
    (q_id, 'Bersedia lembur dengan ikhlas karena bagian dari tanggung jawab', FALSE, 5),
    (q_id, 'Meminta kompensasi dulu baru bersedia', FALSE, 2),
    (q_id, 'Setuju tapi mengerjakan dengan asal-asalan', FALSE, 1);
  -- Question 10
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Anda melihat rekan melanggar aturan kantor. Apa tindakan Anda?', 'TKP', 'Integritas', 2, 'Mengingatkan secara pribadi dulu menunjukkan empati sambil tetap menjaga aturan.')
  RETURNING
    id
  INTO
    q_id;

  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Langsung melaporkan ke atasan', FALSE, 3),
    (q_id, 'Pura-pura tidak tahu', FALSE, 1),
    (q_id, 'Mengingatkan secara pribadi terlebih dahulu', FALSE, 5),
    (q_id, 'Ikut melanggar aturan juga', FALSE, 1),
    (q_id, 'Menegur di depan umum', FALSE, 2);
  -- Question 11
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Dalam rapat, ide Anda ditolak oleh mayoritas. Sikap Anda?', 'TKP', 'Kerja Sama', 2, 'Menerima keputusan dan mendukung ide yang dipilih menunjukkan sikap demokratis.')
  RETURNING
    id
  INTO
    q_id;

  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Tetap memaksakan ide sendiri', FALSE, 1),
    (q_id, 'Meninggalkan rapat karena tersinggung', FALSE, 1),
    (q_id, 'Menerima keputusan dan mendukung ide yang dipilih', FALSE, 5),
    (q_id, 'Setuju tapi tidak ikut berkontribusi implementasi', FALSE, 2),
    (q_id, 'Mencoba melobi anggota tim secara pribadi', FALSE, 3);
  -- Question 12
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Anda diberi kepercayaan mengelola dana proyek. Yang Anda lakukan?', 'TKP', 'Integritas', 2, 'Mengelola dengan hati-hati, transparan, dan membuat laporan jelas menunjukkan akuntabilitas tinggi.')
  RETURNING
    id
  INTO
    q_id;

  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Menggunakan sebagian untuk keperluan pribadi', FALSE, 1),
    (q_id, 'Mengelola seadanya tanpa pencatatan detail', FALSE, 2),
    (q_id, 'Mengelola dengan hati-hati, transparan, dan membuat laporan jelas', FALSE, 5),
    (q_id, 'Meminjam sedikit dengan niat mengembalikan', FALSE, 1),
    (q_id, 'Mendelegasikan pengelolaan ke orang lain', FALSE, 3);
  -- Question 13
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Terjadi konflik antara dua rekan dalam tim Anda. Peran Anda?', 'TKP', 'Mediasi', 3, 'Menjadi mediator netral dan membantu menemukan solusi win-win menunjukkan kemampuan resolusi konflik.')
  RETURNING
    id
  INTO
    q_id;

  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Membiarkan mereka menyelesaikan sendiri', FALSE, 2),
    (q_id, 'Memihak salah satu yang menurut saya benar', FALSE, 1),
    (q_id, 'Menjadi mediator netral dan membantu menemukan solusi win-win', FALSE, 5),
    (q_id, 'Melaporkan ke atasan untuk ditindak', FALSE, 3),
    (q_id, 'Menghindari keduanya', FALSE, 1);
  -- Question 14
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Anda ditunjuk memimpin tim baru dengan anggota senior. Langkah Anda?', 'TKP', 'Kepemimpinan', 3, 'Menghormati pengalaman mereka dan mengajak kolaborasi menunjukkan kepemimpinan yang inklusif.')
  RETURNING
    id
  INTO
    q_id;

  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Langsung memberikan perintah tegas', FALSE, 2),
    (q_id, 'Merasa tidak percaya diri dan pasif', FALSE, 1),
    (q_id, 'Menghormati pengalaman mereka dan mengajak kolaborasi', FALSE, 5),
    (q_id, 'Meminta diganti dengan orang yang lebih senior', FALSE, 1),
    (q_id, 'Fokus pada anggota junior saja', FALSE, 2);
  -- Question 15
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Stakeholder eksternal memberikan permintaan di luar prosedur. Respons Anda?', 'TKP', 'Integritas', 3, 'Menjelaskan prosedur dengan sopan dan menawarkan solusi yang sesuai aturan menunjukkan profesionalisme.')
  RETURNING
    id
  INTO
    q_id;

  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Menolak mentah-mentah tanpa penjelasan', FALSE, 2),
    (q_id, 'Mengikuti permintaan demi menjaga hubungan baik', FALSE, 1),
    (q_id, 'Menjelaskan prosedur dengan sopan dan menawarkan solusi yang sesuai aturan', FALSE, 5),
    (q_id, 'Meneruskan ke atasan tanpa memberikan jawaban', FALSE, 3),
    (q_id, 'Membuat pengecualian kali ini saja', FALSE, 1);
  -- Question 16
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Anda menemukan kesalahan dalam laporan yang sudah disetujui atasan. Tindakan Anda?', 'TKP', 'Integritas', 2, 'Segera memberitahu atasan dan menawarkan koreksi menunjukkan kejujuran dan tanggung jawab.')
  RETURNING
    id
  INTO
    q_id;

  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Membiarkan saja karena sudah disetujui', FALSE, 1),
    (q_id, 'Memperbaiki diam-diam tanpa pemberitahuan', FALSE, 2),
    (q_id, 'Segera memberitahu atasan dan menawarkan koreksi', FALSE, 5),
    (q_id, 'Menunggu orang lain yang menemukan', FALSE, 1),
    (q_id, 'Memberitahu rekan kerja dulu sebelum atasan', FALSE, 3);
  -- Question 17
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Rekan baru kesulitan beradaptasi. Yang Anda lakukan?', 'TKP', 'Kerja Sama', 2, 'Proaktif membantu dan membimbingnya menunjukkan empati dan orientasi tim.')
  RETURNING
    id
  INTO
    q_id;

  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Membiarkan dia belajar sendiri', FALSE, 1),
    (q_id, 'Melaporkan ke HRD bahwa dia kurang kompeten', FALSE, 1),
    (q_id, 'Proaktif membantu dan membimbingnya', FALSE, 5),
    (q_id, 'Membantu hanya jika dia meminta', FALSE, 3),
    (q_id, 'Menyuruh rekan lain yang membantu', FALSE, 2);
  -- Question 18
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Anda diminta berbicara di forum publik mewakili instansi. Persiapan Anda?', 'TKP', 'Profesionalisme', 2, 'Mempelajari materi secara mendalam, konsultasi dengan ahli, dan berlatih menunjukkan keseriusan.')
  RETURNING
    id
  INTO
    q_id;

  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Berbicara spontan tanpa persiapan', FALSE, 1),
    (q_id, 'Membaca sedikit materi malam sebelumnya', FALSE, 2),
    (q_id, 'Mempelajari materi secara mendalam, konsultasi dengan ahli, dan berlatih', FALSE, 5),
    (q_id, 'Meminta orang lain menggantikan', FALSE, 1),
    (q_id, 'Menyiapkan slide presentasi tanpa memahami isi', FALSE, 2);
  -- Question 19
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Target kinerja tim Anda tidak tercapai. Apa evaluasi Anda?', 'TKP', 'Evaluasi Diri', 2, 'Menganalisis penyebab secara objektif dan menyusun perbaikan menunjukkan sikap reflektif.')
  RETURNING
    id
  INTO
    q_id;

  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Menyalahkan sistem atau kebijakan', FALSE, 1),
    (q_id, 'Menyalahkan anggota tim yang kurang produktif', FALSE, 1),
    (q_id, 'Menganalisis penyebab secara objektif dan menyusun perbaikan', FALSE, 5),
    (q_id, 'Menurunkan target untuk periode berikutnya', FALSE, 2),
    (q_id, 'Fokus pada pencapaian yang sudah berhasil', FALSE, 3);
  -- Question 20
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Anda ditugaskan di daerah terpencil jauh dari keluarga. Sikap Anda?', 'TKP', 'Dedikasi', 3, 'Menerima dengan ikhlas dan memberikan yang terbaik menunjukkan pengabdian tinggi.')
  RETURNING
    id
  INTO
    q_id;

  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Menolak penugasan', FALSE, 1),
    (q_id, 'Menerima tapi bekerja seadanya', FALSE, 2),
    (q_id, 'Menerima dengan ikhlas dan memberikan yang terbaik', FALSE, 5),
    (q_id, 'Meminta pindah setelah beberapa bulan', FALSE, 3),
    (q_id, 'Menerima sambil terus mencari alasan pindah', FALSE, 2);
  -- Question 21
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Tawaran pekerjaan dengan gaji lebih tinggi datang saat Anda sedang menangani proyek penting. Keputusan Anda?', 'TKP', 'Komitmen', 3, 'Menyelesaikan proyek dulu dengan baik, baru mempertimbangkan tawaran menunjukkan integritas dan komitmen.')
  RETURNING
    id
  INTO
    q_id;

  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Langsung mengambil tawaran tersebut', FALSE, 1),
    (q_id, 'Meninggalkan proyek setengah jalan', FALSE, 1),
    (q_id, 'Menyelesaikan proyek dulu dengan baik, baru mempertimbangkan tawaran', FALSE, 5),
    (q_id, 'Mengerjakan proyek asal-asalan agar cepat selesai', FALSE, 1),
    (q_id, 'Mendelegasikan proyek ke orang lain', FALSE, 2);
  -- Question 22
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Anda mengetahui ada rekan yang menerima gratifikasi. Tindakan Anda?', 'TKP', 'Anti Korupsi', 3, 'Melaporkan melalui jalur resmi dengan bukti yang jelas menunjukkan integritas tinggi.')
  RETURNING
    id
  INTO
    q_id;

  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Pura-pura tidak tahu', FALSE, 1),
    (q_id, 'Ikut menerima juga', FALSE, 1),
    (q_id, 'Melaporkan melalui jalur resmi dengan bukti yang jelas', FALSE, 5),
    (q_id, 'Menasihati secara pribadi saja', FALSE, 3),
    (q_id, 'Menceritakan ke rekan kerja lain', FALSE, 2);
  -- Question 23
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Atasan memberikan instruksi yang menurut Anda kurang tepat. Langkah Anda?', 'TKP', 'Komunikasi', 2, 'Mengomunikasikan pandangan dengan sopan dan data yang mendukung menunjukkan assertiveness yang sehat.')
  RETURNING
    id
  INTO
    q_id;

  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Mengikuti saja tanpa bertanya', FALSE, 2),
    (q_id, 'Menolak instruksi tersebut', FALSE, 1),
    (q_id, 'Mengomunikasikan pandangan dengan sopan dan data yang mendukung', FALSE, 5),
    (q_id, 'Mengikuti tapi sambil mengeluh ke rekan kerja', FALSE, 1),
    (q_id, 'Melakukan sesuai cara sendiri tanpa pemberitahuan', FALSE, 1);
  -- Question 24
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Anda dipercaya menyimpan dokumen penting dan rahasia. Sikap Anda?', 'TKP', 'Kerahasiaan', 2, 'Menjaga dengan sangat hati-hati dan tidak membocorkan ke siapapun menunjukkan amanah.')
  RETURNING
    id
  INTO
    q_id;

  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Menceritakan isi dokumen ke teman dekat', FALSE, 1),
    (q_id, 'Menyimpan dengan biasa saja', FALSE, 2),
    (q_id, 'Menjaga dengan sangat hati-hati dan tidak membocorkan ke siapapun', FALSE, 5),
    (q_id, 'Memfotokopi untuk backup pribadi', FALSE, 2),
    (q_id, 'Mendelegasikan penyimpanan ke orang lain', FALSE, 1);
  -- Question 25
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Dalam situasi darurat, Anda harus mengambil keputusan cepat tanpa arahan atasan. Yang Anda lakukan?', 'TKP', 'Inisiatif', 3, 'Mengambil keputusan terbaik berdasarkan analisis situasi dan melaporkan menunjukkan inisiatif dan tanggung jawab.')
  RETURNING
    id
  INTO
    q_id;

  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Menunggu arahan atasan meski darurat', FALSE, 2),
    (q_id, 'Panik dan tidak tahu harus berbuat apa', FALSE, 1),
    (q_id, 'Mengambil keputusan terbaik berdasarkan analisis situasi dan melaporkan', FALSE, 5),
    (q_id, 'Menyerahkan keputusan ke rekan kerja', FALSE, 2),
    (q_id, 'Mengambil keputusan tanpa pertimbangan matang', FALSE, 1);
  -- Question 26
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Anda diminta membuat laporan yang memerlukan data dari unit lain yang tidak kooperatif. Tindakan Anda?', 'TKP', 'Koordinasi', 3, 'Berkomunikasi dengan baik, menjelaskan urgensi, dan melibatkan pimpinan bila perlu menunjukkan kemampuan koordinasi.')
  RETURNING
    id
  INTO
    q_id;

  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Melaporkan unit tersebut ke pimpinan', FALSE, 2),
    (q_id, 'Membuat laporan tanpa data dari mereka', FALSE, 1),
    (q_id, 'Berkomunikasi dengan baik, menjelaskan urgensi, dan melibatkan pimpinan bila perlu', FALSE, 5),
    (q_id, 'Menunda laporan menunggu mereka kooperatif', FALSE, 2),
    (q_id, 'Membuat data sendiri untuk melengkapi laporan', FALSE, 1);
  -- Question 27
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Anda harus memilih antara menyelesaikan pekerjaan kantor atau menghadiri acara keluarga penting. Pilihan Anda?', 'TKP', 'Prioritas', 3, 'Menyelesaikan pekerjaan dengan cepat dan efisien, lalu menghadiri acara keluarga menunjukkan keseimbangan.')
  RETURNING
    id
  INTO
    q_id;

  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Meninggalkan pekerjaan dan menghadiri acara keluarga', FALSE, 2),
    (q_id, 'Fokus pekerjaan dan tidak menghadiri acara keluarga', FALSE, 3),
    (q_id, 'Menyelesaikan pekerjaan dengan cepat dan efisien, lalu menghadiri acara keluarga', FALSE, 5),
    (q_id, 'Meminta izin tidak masuk kerja', FALSE, 2),
    (q_id, 'Mengerjakan pekerjaan sambil menghadiri acara', FALSE, 1);
  -- Question 28
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Rekan kerja meminta bantuan saat Anda juga sedang sibuk. Respons Anda?', 'TKP', 'Kerja Sama', 2, 'Membantu sesuai kapasitas dan menyarankan pembagian waktu yang baik menunjukkan empati dan manajemen waktu.')
  RETURNING
    id
  INTO
    q_id;

  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Menolak karena terlalu sibuk', FALSE, 2),
    (q_id, 'Membantu meski pekerjaan sendiri terbengkalai', FALSE, 2),
    (q_id, 'Membantu sesuai kapasitas dan menyarankan pembagian waktu yang baik', FALSE, 5),
    (q_id, 'Menyuruh dia mencari bantuan dari orang lain', FALSE, 1),
    (q_id, 'Membantu dengan terpaksa sambil mengeluh', FALSE, 1);
  -- Question 29
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Program yang Anda inisiasi mendapat penolakan dari masyarakat. Langkah Anda?', 'TKP', 'Pelayanan Publik', 3, 'Mendengar aspirasi, mengevaluasi program, dan melakukan penyesuaian menunjukkan responsivitas dan partisipatif.')
  RETURNING
    id
  INTO
    q_id;

  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Tetap melanjutkan program karena sudah direncanakan', FALSE, 1),
    (q_id, 'Membatalkan program tersebut', FALSE, 2),
    (q_id, 'Mendengar aspirasi, mengevaluasi program, dan melakukan penyesuaian', FALSE, 5),
    (q_id, 'Menyalahkan masyarakat yang tidak memahami', FALSE, 1),
    (q_id, 'Melanjutkan dengan sosialisasi lebih intensif', FALSE, 4);
  -- Question 30
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Anda menemukan cara kerja yang lebih efisien dari prosedur yang ada. Tindakan Anda?', 'TKP', 'Inovasi', 2, 'Mengusulkan ke atasan dengan data pendukung dan dampak positifnya menunjukkan inisiatif inovasi.')
  RETURNING
    id
  INTO
    q_id;

  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Langsung menerapkan cara baru tanpa pemberitahuan', FALSE, 1),
    (q_id, 'Tetap mengikuti prosedur lama', FALSE, 2),
    (q_id, 'Mengusulkan ke atasan dengan data pendukung dan dampak positifnya', FALSE, 5),
    (q_id, 'Memberitahu rekan kerja saja', FALSE, 3),
    (q_id, 'Menggunakan cara baru untuk diri sendiri', FALSE, 2);
  -- Question 31
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Tim Anda berhasil meraih prestasi. Bagaimana Anda menyikapinya?', 'TKP', 'Kerja Sama', 2, 'Mengapresiasi kontribusi semua anggota tim menunjukkan sikap humble dan menghargai kerja sama.')
  RETURNING
    id
  INTO
    q_id;

  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Mengklaim sebagai hasil kerja keras sendiri', FALSE, 1),
    (q_id, 'Menerima pujian tanpa menyebut kontribusi tim', FALSE, 1),
    (q_id, 'Mengapresiasi kontribusi semua anggota tim', FALSE, 5),
    (q_id, 'Bersikap biasa saja karena memang sudah seharusnya', FALSE, 2),
    (q_id, 'Merayakan secara berlebihan', FALSE, 2);
  -- Question 32
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Anda ditawarkan pelatihan di luar kota saat beban kerja sedang tinggi. Keputusan Anda?', 'TKP', 'Pengembangan Diri', 2, 'Menerima pelatihan dan mengatur ulang jadwal pekerjaan menunjukkan orientasi pengembangan diri.')
  RETURNING
    id
  INTO
    q_id;

  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Menolak karena terlalu sibuk', FALSE, 2),
    (q_id, 'Menerima dan meninggalkan pekerjaan begitu saja', FALSE, 1),
    (q_id, 'Menerima pelatihan dan mengatur ulang jadwal pekerjaan', FALSE, 5),
    (q_id, 'Meminta orang lain yang mengikuti', FALSE, 1),
    (q_id, 'Menerima tapi tidak fokus pada pelatihan', FALSE, 1);
  -- Question 33
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Masyarakat mengajukan keluhan atas layanan unit Anda. Respons Anda?', 'TKP', 'Pelayanan Publik', 2, 'Mendengarkan dengan empati, melakukan investigasi, dan memperbaiki layanan menunjukkan orientasi pelayanan.')
  RETURNING
    id
  INTO
    q_id;

  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Membela unit dan menyalahkan masyarakat', FALSE, 1),
    (q_id, 'Mengabaikan keluhan tersebut', FALSE, 1),
    (q_id, 'Mendengarkan dengan empati, melakukan investigasi, dan memperbaiki layanan', FALSE, 5),
    (q_id, 'Menyalahkan staf pelaksana', FALSE, 2),
    (q_id, 'Memberikan janji tanpa tindak lanjut', FALSE, 1);
  -- Question 34
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Anda diminta menjadi narasumber untuk topik yang kurang Anda kuasai. Sikap Anda?', 'TKP', 'Kejujuran', 2, 'Jujur tentang keterbatasan dan belajar intensif atau merekomendasikan ahli lebih tepat menunjukkan integritas.')
  RETURNING
    id
  INTO
    q_id;

  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Menerima dan berbicara seadanya', FALSE, 1),
    (q_id, 'Menolak mentah-mentah', FALSE, 2),
    (q_id, 'Jujur tentang keterbatasan dan belajar intensif atau merekomendasikan ahli lebih tepat', FALSE, 5),
    (q_id, 'Menerima dan plagiat materi orang lain', FALSE, 1),
    (q_id, 'Delegasikan ke rekan lain tanpa pemberitahuan', FALSE, 1);
  -- Question 35
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Terjadi perbedaan pendapat dalam tim tentang strategi kerja. Peran Anda?', 'TKP', 'Kolaborasi', 2, 'Memfasilitasi diskusi konstruktif untuk menemukan strategi terbaik menunjukkan kemampuan fasilitasi.')
  RETURNING
    id
  INTO
    q_id;

  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Memaksakan pendapat sendiri', FALSE, 1),
    (q_id, 'Diam saja dan tidak ikut berpendapat', FALSE, 2),
    (q_id, 'Memfasilitasi diskusi konstruktif untuk menemukan strategi terbaik', FALSE, 5),
    (q_id, 'Memihak pendapat mayoritas', FALSE, 3),
    (q_id, 'Menyerahkan keputusan ke atasan', FALSE, 2);
  -- Question 36
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Anda mendapat teguran dari atasan di depan rekan kerja. Reaksi Anda?', 'TKP', 'Kontrol Emosi', 2, 'Menerima dengan lapang dada, introspeksi, dan perbaiki menunjukkan kematangan emosional.')
  RETURNING
    id
  INTO
    q_id;

  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Merasa malu dan marah', FALSE, 1),
    (q_id, 'Membela diri dan berdebat', FALSE, 1),
    (q_id, 'Menerima dengan lapang dada, introspeksi, dan perbaiki', FALSE, 5),
    (q_id, 'Diam tapi menyimpan dendam', FALSE, 1),
    (q_id, 'Meminta teguran dilakukan secara pribadi', FALSE, 3);
  -- Question 37
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Ada kesempatan mengikuti kompetisi inovasi pelayanan publik. Sikap Anda?', 'TKP', 'Motivasi Berprestasi', 2, 'Antusias mengikuti dan mempersiapkan dengan maksimal menunjukkan motivasi berprestasi.')
  RETURNING
    id
  INTO
    q_id;

  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Tidak tertarik mengikuti', FALSE, 1),
    (q_id, 'Ikut tapi tanpa persiapan khusus', FALSE, 2),
    (q_id, 'Antusias mengikuti dan mempersiapkan dengan maksimal', FALSE, 5),
    (q_id, 'Menyerahkan ke rekan yang lebih muda', FALSE, 2),
    (q_id, 'Ikut hanya untuk formalitas', FALSE, 1);
  -- Question 38
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Sistem teknologi baru diterapkan di kantor. Anda yang sudah tua merasa kesulitan. Sikap Anda?', 'TKP', 'Adaptasi', 2, 'Belajar dengan giat dan meminta bantuan yang lebih muda menunjukkan keterbukaan terhadap perubahan.')
  RETURNING
    id
  INTO
    q_id;

  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Menolak menggunakan sistem baru', FALSE, 1),
    (q_id, 'Menyuruh anak buah yang mengoperasikan', FALSE, 2),
    (q_id, 'Belajar dengan giat dan meminta bantuan yang lebih muda', FALSE, 5),
    (q_id, 'Mengeluh tentang sistem baru', FALSE, 1),
    (q_id, 'Mengusulkan tetap menggunakan sistem lama', FALSE, 1);
  -- Question 39
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Anda melihat potensi masalah yang mungkin terjadi di masa depan. Tindakan Anda?', 'TKP', 'Antisipasi', 2, 'Menyampaikan analisis risiko dan rencana mitigasi ke atasan menunjukkan kemampuan antisipasi.')
  RETURNING
    id
  INTO
    q_id;

  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Diam saja karena belum terjadi', FALSE, 1),
    (q_id, 'Menunggu sampai masalah benar-benar terjadi', FALSE, 1),
    (q_id, 'Menyampaikan analisis risiko dan rencana mitigasi ke atasan', FALSE, 5),
    (q_id, 'Menceritakan ke rekan kerja saja', FALSE, 2),
    (q_id, 'Berharap orang lain yang menyadari', FALSE, 1);
  -- Question 40
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Instansi mengalami krisis kepercayaan publik. Kontribusi Anda sebagai ASN?', 'TKP', 'Integritas Publik', 3, 'Bekerja lebih baik, transparan, dan aktif membangun komunikasi positif menunjukkan komitmen pada pemulihan kepercayaan.')
  RETURNING
    id
  INTO
    q_id;

  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Bekerja seperti biasa saja', FALSE, 2),
    (q_id, 'Menjaga jarak dari publik', FALSE, 1),
    (q_id, 'Bekerja lebih baik, transparan, dan aktif membangun komunikasi positif', FALSE, 5),
    (q_id, 'Menyalahkan pimpinan atas krisis tersebut', FALSE, 1),
    (q_id, 'Fokus pada pekerjaan administratif saja', FALSE, 2);

END
$$;
