-- =============================================
-- EXTRA TIU QUESTIONS (30 Soal)
-- =============================================
DO $$
DECLARE
  q_id uuid;
BEGIN
  -- 1. Verbal - Analogi
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('GURU : SEKOLAH = ... : ...', 'TIU', 'Analogi', 1, 
   'Hubungan: PROFESI - TEMPAT KERJA. Guru bekerja di sekolah. Petani bekerja di ladang.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'PETANI : LADANG', true, 0),
  (q_id, 'PENEBANG : POHON', false, 0),
  (q_id, 'PENGACARA : HUKUM', false, 0),
  (q_id, 'PENYANYI : NOVEL', false, 0),
  (q_id, 'PELUKIS : KANVAS', false, 0);

  -- 2. Verbal - Sinonim
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('Sinonim dari kata AGITASI adalah...', 'TIU', 'Verbal', 2, 
   'Agitasi berarti hasutan atau pembangkitan emosi massa. Sinonim yang tepat adalah Hasutan.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Hasutan', true, 0),
  (q_id, 'Penolakan', false, 0),
  (q_id, 'Perencanaan', false, 0),
  (q_id, 'Perdamaian', false, 0),
  (q_id, 'Pertemuan', false, 0);

  -- 3. Numerik - Deret Angka
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('3, 6, 12, 24, ...', 'TIU', 'Deret Angka', 1, 
   'Pola: Dikali 2. 3x2=6, 6x2=12, 12x2=24. Maka 24x2=48.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, '48', true, 0),
  (q_id, '36', false, 0),
  (q_id, '30', false, 0),
  (q_id, '60', false, 0),
  (q_id, '72', false, 0);

  -- 4. Logika - Silogisme
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('Semua tentara adalah profesional. Semua profesional disiplin. Kesimpulan...', 'TIU', 'Silogisme', 1, 
   'Premis 1: A -> B. Premis 2: B -> C. Kesimpulan: A -> C (Semua tentara disiplin).') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Semua tentara disiplin', true, 0),
  (q_id, 'Sebagian tentara disiplin', false, 0),
  (q_id, 'Semua yang disiplin adalah tentara', false, 0),
  (q_id, 'Tidak ada tentara yang disiplin', false, 0),
  (q_id, 'Semua profesional adalah tentara', false, 0);

  -- 5. Numerik - Berhitung Pecahan
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('Hasil dari 3/4 + 0,5 - 25% adalah...', 'TIU', 'Berhitung', 2, 
   'Jadikan desimal: 0,75 + 0,5 - 0,25 = 1,0. Atau pecahan 3/4 + 2/4 - 1/4 = 4/4 = 1.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, '1,0', true, 0),
  (q_id, '0,75', false, 0),
  (q_id, '1,25', false, 0),
  (q_id, '0,5', false, 0),
  (q_id, '1,5', false, 0);

  -- 6. Verbal - Antonim
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('Lawan kata dari EKLEKTIK adalah...', 'TIU', 'Verbal', 3, 
   'Eklektik berarti memilih yang terbaik dari berbagai sumber/campuran. Lawannya adalah TAK-PILIH-PILIH.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'TIDAK PILIH-PILIH', true, 0),
  (q_id, 'SELEKTIF', false, 0),
  (q_id, 'CAMPURAN', false, 0),
  (q_id, 'MODERN', false, 0),
  (q_id, 'KUNO', false, 0);

  -- 7. Numerik - Soal Cerita
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('Sebuah baju didiskon 20%, kemudian didiskon lagi 10% dari harga setelah diskon pertama. Total diskon sebenarnya adalah...', 'TIU', 'Berhitung', 2, 
   'Misal harga 100. Diskon 1 (20) -> 80. Diskon 2 (10% dari 80 = 8) -> 72. Total potongan 100-72 = 28. Jadi 28%.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, '28%', true, 0),
  (q_id, '30%', false, 0),
  (q_id, '25%', false, 0),
  (q_id, '18%', false, 0),
  (q_id, '32%', false, 0);

  -- 8. Logika - Posisi Duduk
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('A duduk di sebelah kiri B. C duduk di sebelah kanan B. D duduk di sebelah kiri A. Siapa yang duduk paling kanan?', 'TIU', 'Logika Analitis', 2, 
   'Urutan: D - A - B - C. Jadi yang paling kanan adalah C.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'C', true, 0),
  (q_id, 'B', false, 0),
  (q_id, 'A', false, 0),
  (q_id, 'D', false, 0),
  (q_id, 'Tidak dapat ditentukan', false, 0);

  -- 9. Numerik - Deret Huruf
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('A, C, E, G, ...', 'TIU', 'Deret Angka', 1, 
   'A(1), C(3), E(5), G(7). Pola +2 huruf. Selanjutnya I(9).') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'I', true, 0),
  (q_id, 'H', false, 0),
  (q_id, 'J', false, 0),
  (q_id, 'K', false, 0),
  (q_id, 'F', false, 0);

  -- 10. Verbal - Analogi
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('TELUR : AYAM = ... : ...', 'TIU', 'Analogi', 1, 
   'Hubungan: PRODUK : PENGHASIL. Telur produk ayam. Susu produk sapi.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'SUSU : SAPI', true, 0),
  (q_id, 'ANAK : IBU', false, 0), 
  (q_id, 'BUAH : POHON', false, 0),
  (q_id, 'MADU : LEBAH', false, 0),
  (q_id, 'KERTAS : KAYU', false, 0);

  -- 11. Numerik - Perbandingan
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('A dapat menyelesaikan pekerjaan dalam 3 hari. B dalam 6 hari. Jika bekerja bersama, berapa hari selesai?', 'TIU', 'Berhitung', 2, 
   'Rumus: 1/t = 1/3 + 1/6 = 3/6. t = 2 hari.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, '2 hari', true, 0),
  (q_id, '3 hari', false, 0),
  (q_id, '4 hari', false, 0),
  (q_id, '4,5 hari', false, 0),
  (q_id, '1,5 hari', false, 0);

  -- 12. Figural - Rotasi
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('Manakah yang merupakan rotasi dari gambar X (bayangkan gambar panah ke atas)?', 'TIU', 'Figural', 2, 
   'Rotasi 90 derajat searah jarum jam dari panah atas adalah panah kanan.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Panah Kanan', true, 0),
  (q_id, 'Panah Bawah', false, 0),
  (q_id, 'Panah Kiri', false, 0),
  (q_id, 'Panah Serong Kanan', false, 0),
  (q_id, 'Panah Serong Kiri', false, 0);

  -- 13. Verbal - Wacana
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('Ide pokok paragraf biasanya terdapat di...', 'TIU', 'Verbal', 1, 
   'Ide pokok biasanya ada di kalimat utama, yang seringkali di awal (deduktif) atau akhir (induktif) paragraf.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Awal atau akhir paragraf', true, 0),
  (q_id, 'Tengah paragraf', false, 0),
  (q_id, 'Setiap kalimat', false, 0),
  (q_id, 'Judul bacaan', false, 0),
  (q_id, 'Kesimpulan saja', false, 0);

  -- 14. Numerik - Jarak Waktu Kecepatan
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('Jarak kota A ke B 60 km. Ditempuh dengan kecepatan 40 km/jam. Waktu yang diperlukan...', 'TIU', 'Berhitung', 1, 
   'Waktu = Jarak / Kecepatan = 60 / 40 = 1,5 jam = 1 jam 30 menit.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, '1 jam 30 menit', true, 0),
  (q_id, '1 jam 15 menit', false, 0),
  (q_id, '1 jam 20 menit', false, 0),
  (q_id, '1 jam 45 menit', false, 0),
  (q_id, '2 jam', false, 0);

  -- 15. Logika - Premis
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('Jika hujan, maka tanah basah. Tanah tidak basah. Kesimpulan...', 'TIU', 'Silogisme', 1, 
   'Modus Tollens: P -> Q. ~Q. Maka ~P (Tidak hujan).') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Tidak hujan', true, 0),
  (q_id, 'Hujan tapi pakai payung', false, 0),
  (q_id, 'Tanah kering', false, 0),
  (q_id, 'Hujan berhenti', false, 0),
  (q_id, 'Tidak dapat disimpulkan', false, 0);

  -- 16. Verbal - Ejaan
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('Manakah penulisan gelar yang benar?', 'TIU', 'Bahasa Indonesia', 2, 
   'Penulisan gelar: Dr. (Doktor), S.H. (Sarjana Hukum), Ir. (Insinyur). Tanda titik di setiap singkatan kata.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Ir. Soekarno', true, 0),
  (q_id, 'Ir Soekarno', false, 0),
  (q_id, 'Ir. Soekarno.', false, 0),
  (q_id, 'Drandus. Moh. Hatta', false, 0),
  (q_id, 'Prof Dr Habibie', false, 0);

  -- 17. Numerik - Kuantitatif
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('Jika 2x + 4 = 10, berapakah nilai 3x - 1?', 'TIU', 'Berhitung', 1, 
   '2x = 6 -> x = 3. Maka 3(3) - 1 = 9 - 1 = 8.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, '8', true, 0),
  (q_id, '7', false, 0),
  (q_id, '9', false, 0),
  (q_id, '10', false, 0),
  (q_id, '5', false, 0);

  -- 18. Numerik - Bilangan
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('Manakah bilangan terbesar?', 'TIU', 'Berhitung', 2, 
   'A. 1/2 (0.5), B. 0.55, C. 4/7 (~0.57), D. 40% (0.4), E. 3/8 (0.375). Terbesar adalah 4/7 (0.57).') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, '4/7', true, 0),
  (q_id, '0,55', false, 0),
  (q_id, '1/2', false, 0),
  (q_id, '40%', false, 0),
  (q_id, '3/8', false, 0);

  -- 19. Verbal - Analogi
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('GANDUM : ROTI = ... : ...', 'TIU', 'Analogi', 1, 
   'Bahan baku -> Produk. Gandum jadi Roti. Benang jadi Kain.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'BENANG : KAIN', true, 0),
  (q_id, 'AIR : EMBER', false, 0),
  (q_id, 'GULA : MANIS', false, 0),
  (q_id, 'SAPI : DAGING', false, 0),
  (q_id, 'UANG : KAYA', false, 0);

  -- 20. Numerik - Deret
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('1, 4, 9, 16, 25, ...', 'TIU', 'Deret Angka', 1, 
   'Deret kuadrat: 1^2, 2^2, ..., 5^2. Selanjutnya 6^2 = 36.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, '36', true, 0),
  (q_id, '30', false, 0),
  (q_id, '34', false, 0),
  (q_id, '42', false, 0),
  (q_id, '49', false, 0);

  -- 21. Logika - Analitis
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('Siswa yang rajin akan lulus. Budi tidak rajin. Kesimpulan...', 'TIU', 'Logika Analitis', 2, 
   'Jika P -> Q, dan ~P, maka TIDAK DAPAT DISIMPULKAN dalam logika formal.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Tidak dapat disimpulkan', true, 0),
  (q_id, 'Budi tidak lulus', false, 0),
  (q_id, 'Budi lulus', false, 0),
  (q_id, 'Budi siswa bodoh', false, 0),
  (q_id, 'Budi mungkin lulus', false, 0);

  -- 22. Numerik - Geometri
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('Keliling persegi dengan luas 144 cm2 adalah...', 'TIU', 'Berhitung', 1, 
   'Luas = s x s = 144. Maka s = 12. Keliling = 4s = 48.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, '48 cm', true, 0),
  (q_id, '12 cm', false, 0),
  (q_id, '24 cm', false, 0),
  (q_id, '36 cm', false, 0),
  (q_id, '60 cm', false, 0);

  -- 23. Verbal - Sinonim
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('Sinonim NISBI adalah...', 'TIU', 'Verbal', 2, 
   'Nisbi artinya relatif, tidak mutlak.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Relatif', true, 0),
  (q_id, 'Mutlak', false, 0),
  (q_id, 'Pasti', false, 0),
  (q_id, 'Abstrak', false, 0),
  (q_id, 'Nyata', false, 0);

  -- 24. Numerik - Operasi
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('8 + 4 x 3 - 6 : 2 = ...', 'TIU', 'Berhitung', 1, 
   'Kabataku: 4x3=12. 6:2=3. Jadi 8 + 12 - 3 = 17.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, '17', true, 0),
  (q_id, '15', false, 0),
  (q_id, '3', false, 0),
  (q_id, '12', false, 0),
  (q_id, '21', false, 0);

  -- 25. Verbal - Pengelompokan
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('Manakah kata yang tidak termasuk kelompoknya?', 'TIU', 'Verbal', 1, 
   'MEJA adalah perabot, sisanya benda langit.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'MEJA', true, 0),
  (q_id, 'MATAHARI', false, 0),
  (q_id, 'BUMI', false, 0),
  (q_id, 'BULAN', false, 0),
  (q_id, 'BINTANG', false, 0);

  -- 26. Numerik - Perbandingan Berbalik Nilai
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('Pembangunan gedung selesai 30 hari oleh 10 pekerja. Jika ingin selesai 15 hari, berapa pekerja tambahan yang dibutuhkan?', 'TIU', 'Berhitung', 3, 
   '30 x 10 = 300. 15 x P = 300 -> P = 20. Tambahan = 20 - 10 = 10 pekerja.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, '10 pekerja', true, 0),
  (q_id, '15 pekerja', false, 0),
  (q_id, '5 pekerja', false, 0),
  (q_id, '20 pekerja', false, 0),
  (q_id, '25 pekerja', false, 0);

  -- 27. Verbal - Analogi
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('APOTEKER : OBAT = ... : ...', 'TIU', 'Analogi', 1, 
   'Apoteker meracik obat. Koki memasak masakan. (Profesinya langsung terkait membuat objek tsb).') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'KOKI : MASAKAN', true, 0),
  (q_id, 'PENULIS : BUKU', false, 0),
  (q_id, 'DOKTER : PASIEN', false, 0),
  (q_id, 'MONTIR : BENGKEL', false, 0),
  (q_id, 'GURU : MURID', false, 0);

  -- 28. Numerik - Deret Fibonaci
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('1, 1, 2, 3, 5, 8, ...', 'TIU', 'Deret Angka', 2, 
   'Deret Fibonacci (jumlah 2 angka sebelumnya). 5+8=13.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, '13', true, 0),
  (q_id, '11', false, 0),
  (q_id, '12', false, 0),
  (q_id, '15', false, 0),
  (q_id, '10', false, 0);

  -- 29. Logika - Urutan
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('Ani lebih tinggi dari Budi. Cici lebih pendek dari Budi. Siapa yang paling tinggi?', 'TIU', 'Logika Analitis', 1, 
   'Ani > Budi > Cici. Paling tinggi Ani.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Ani', true, 0),
  (q_id, 'Budi', false, 0),
  (q_id, 'Cici', false, 0),
  (q_id, 'Semua sama', false, 0),
  (q_id, 'Tidak bisa ditentukan', false, 0);

  -- 30. Figural - Pola
  INSERT INTO questions (content, type, category, difficulty, explanation) VALUES 
  ('Pola: O, OO, OOO, ...', 'TIU', 'Deret Gambar', 1, 
   'Polanya bertambah satu. Maka OOOO.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'OOOO', true, 0),
  (q_id, 'OOO', false, 0),
  (q_id, 'OOOOO', false, 0),
  (q_id, 'O', false, 0),
  (q_id, 'OO', false, 0);

END $$;
