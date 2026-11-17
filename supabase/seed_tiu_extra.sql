-- =============================================
-- EXTRA TIU QUESTIONS (30 Soal)
-- =============================================
DO $$
DECLARE
  q_id uuid;
BEGIN
  -- 1. Verbal - Analogi
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('GURU : SEKOLAH = ... : ...', 'TIU', 'Analogi', 1, 'Hubungan: PROFESI - TEMPAT KERJA. Guru bekerja di sekolah. Petani bekerja di ladang.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'PETANI : LADANG', TRUE, 0),
    (q_id, 'PENEBANG : POHON', FALSE, 0),
    (q_id, 'PENGACARA : HUKUM', FALSE, 0),
    (q_id, 'PENYANYI : NOVEL', FALSE, 0),
    (q_id, 'PELUKIS : KANVAS', FALSE, 0);
  -- 2. Verbal - Sinonim
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Sinonim dari kata AGITASI adalah...', 'TIU', 'Verbal', 2, 'Agitasi berarti hasutan atau pembangkitan emosi massa. Sinonim yang tepat adalah Hasutan.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Hasutan', TRUE, 0),
    (q_id, 'Penolakan', FALSE, 0),
    (q_id, 'Perencanaan', FALSE, 0),
    (q_id, 'Perdamaian', FALSE, 0),
    (q_id, 'Pertemuan', FALSE, 0);
  -- 3. Numerik - Deret Angka
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('3, 6, 12, 24, ...', 'TIU', 'Deret Angka', 1, 'Pola: Dikali 2. 3x2=6, 6x2=12, 12x2=24. Maka 24x2=48.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, '48', TRUE, 0),
    (q_id, '36', FALSE, 0),
    (q_id, '30', FALSE, 0),
    (q_id, '60', FALSE, 0),
    (q_id, '72', FALSE, 0);
  -- 4. Logika - Silogisme
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Semua tentara adalah profesional. Semua profesional disiplin. Kesimpulan...', 'TIU', 'Silogisme', 1, 'Premis 1: A -> B. Premis 2: B -> C. Kesimpulan: A -> C (Semua tentara disiplin).')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Semua tentara disiplin', TRUE, 0),
    (q_id, 'Sebagian tentara disiplin', FALSE, 0),
    (q_id, 'Semua yang disiplin adalah tentara', FALSE, 0),
    (q_id, 'Tidak ada tentara yang disiplin', FALSE, 0),
    (q_id, 'Semua profesional adalah tentara', FALSE, 0);
  -- 5. Numerik - Berhitung Pecahan
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Hasil dari 3/4 + 0,5 - 25% adalah...', 'TIU', 'Berhitung', 2, 'Jadikan desimal: 0,75 + 0,5 - 0,25 = 1,0. Atau pecahan 3/4 + 2/4 - 1/4 = 4/4 = 1.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, '1,0', TRUE, 0),
    (q_id, '0,75', FALSE, 0),
    (q_id, '1,25', FALSE, 0),
    (q_id, '0,5', FALSE, 0),
    (q_id, '1,5', FALSE, 0);
  -- 6. Verbal - Antonim
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Lawan kata dari EKLEKTIK adalah...', 'TIU', 'Verbal', 3, 'Eklektik berarti memilih yang terbaik dari berbagai sumber/campuran. Lawannya adalah TAK-PILIH-PILIH.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'TIDAK PILIH-PILIH', TRUE, 0),
    (q_id, 'SELEKTIF', FALSE, 0),
    (q_id, 'CAMPURAN', FALSE, 0),
    (q_id, 'MODERN', FALSE, 0),
    (q_id, 'KUNO', FALSE, 0);
  -- 7. Numerik - Soal Cerita
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Sebuah baju didiskon 20%, kemudian didiskon lagi 10% dari harga setelah diskon pertama. Total diskon sebenarnya adalah...', 'TIU', 'Berhitung', 2, 'Misal harga 100. Diskon 1 (20) -> 80. Diskon 2 (10% dari 80 = 8) -> 72. Total potongan 100-72 = 28. Jadi 28%.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, '28%', TRUE, 0),
    (q_id, '30%', FALSE, 0),
    (q_id, '25%', FALSE, 0),
    (q_id, '18%', FALSE, 0),
    (q_id, '32%', FALSE, 0);
  -- 8. Logika - Posisi Duduk
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('A duduk di sebelah kiri B. C duduk di sebelah kanan B. D duduk di sebelah kiri A. Siapa yang duduk paling kanan?', 'TIU', 'Logika Analitis', 2, 'Urutan: D - A - B - C. Jadi yang paling kanan adalah C.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'C', TRUE, 0),
    (q_id, 'B', FALSE, 0),
    (q_id, 'A', FALSE, 0),
    (q_id, 'D', FALSE, 0),
    (q_id, 'Tidak dapat ditentukan', FALSE, 0);
  -- 9. Numerik - Deret Huruf
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('A, C, E, G, ...', 'TIU', 'Deret Angka', 1, 'A(1), C(3), E(5), G(7). Pola +2 huruf. Selanjutnya I(9).')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'I', TRUE, 0),
    (q_id, 'H', FALSE, 0),
    (q_id, 'J', FALSE, 0),
    (q_id, 'K', FALSE, 0),
    (q_id, 'F', FALSE, 0);
  -- 10. Verbal - Analogi
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('TELUR : AYAM = ... : ...', 'TIU', 'Analogi', 1, 'Hubungan: PRODUK : PENGHASIL. Telur produk ayam. Susu produk sapi.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'SUSU : SAPI', TRUE, 0),
    (q_id, 'ANAK : IBU', FALSE, 0),
    (q_id, 'BUAH : POHON', FALSE, 0),
    (q_id, 'MADU : LEBAH', FALSE, 0),
    (q_id, 'KERTAS : KAYU', FALSE, 0);
  -- 11. Numerik - Perbandingan
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('A dapat menyelesaikan pekerjaan dalam 3 hari. B dalam 6 hari. Jika bekerja bersama, berapa hari selesai?', 'TIU', 'Berhitung', 2, 'Rumus: 1/t = 1/3 + 1/6 = 3/6. t = 2 hari.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, '2 hari', TRUE, 0),
    (q_id, '3 hari', FALSE, 0),
    (q_id, '4 hari', FALSE, 0),
    (q_id, '4,5 hari', FALSE, 0),
    (q_id, '1,5 hari', FALSE, 0);
  -- 12. Figural - Rotasi
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Manakah yang merupakan rotasi dari gambar X (bayangkan gambar panah ke atas)?', 'TIU', 'Figural', 2, 'Rotasi 90 derajat searah jarum jam dari panah atas adalah panah kanan.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Panah Kanan', TRUE, 0),
    (q_id, 'Panah Bawah', FALSE, 0),
    (q_id, 'Panah Kiri', FALSE, 0),
    (q_id, 'Panah Serong Kanan', FALSE, 0),
    (q_id, 'Panah Serong Kiri', FALSE, 0);
  -- 13. Verbal - Wacana
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Ide pokok paragraf biasanya terdapat di...', 'TIU', 'Verbal', 1, 'Ide pokok biasanya ada di kalimat utama, yang seringkali di awal (deduktif) atau akhir (induktif) paragraf.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Awal atau akhir paragraf', TRUE, 0),
    (q_id, 'Tengah paragraf', FALSE, 0),
    (q_id, 'Setiap kalimat', FALSE, 0),
    (q_id, 'Judul bacaan', FALSE, 0),
    (q_id, 'Kesimpulan saja', FALSE, 0);
  -- 14. Numerik - Jarak Waktu Kecepatan
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Jarak kota A ke B 60 km. Ditempuh dengan kecepatan 40 km/jam. Waktu yang diperlukan...', 'TIU', 'Berhitung', 1, 'Waktu = Jarak / Kecepatan = 60 / 40 = 1,5 jam = 1 jam 30 menit.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, '1 jam 30 menit', TRUE, 0),
    (q_id, '1 jam 15 menit', FALSE, 0),
    (q_id, '1 jam 20 menit', FALSE, 0),
    (q_id, '1 jam 45 menit', FALSE, 0),
    (q_id, '2 jam', FALSE, 0);
  -- 15. Logika - Premis
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Jika hujan, maka tanah basah. Tanah tidak basah. Kesimpulan...', 'TIU', 'Silogisme', 1, 'Modus Tollens: P -> Q. ~Q. Maka ~P (Tidak hujan).')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Tidak hujan', TRUE, 0),
    (q_id, 'Hujan tapi pakai payung', FALSE, 0),
    (q_id, 'Tanah kering', FALSE, 0),
    (q_id, 'Hujan berhenti', FALSE, 0),
    (q_id, 'Tidak dapat disimpulkan', FALSE, 0);
  -- 16. Verbal - Ejaan
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Manakah penulisan gelar yang benar?', 'TIU', 'Bahasa Indonesia', 2, 'Penulisan gelar: Dr. (Doktor), S.H. (Sarjana Hukum), Ir. (Insinyur). Tanda titik di setiap singkatan kata.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Ir. Soekarno', TRUE, 0),
    (q_id, 'Ir Soekarno', FALSE, 0),
    (q_id, 'Ir. Soekarno.', FALSE, 0),
    (q_id, 'Drandus. Moh. Hatta', FALSE, 0),
    (q_id, 'Prof Dr Habibie', FALSE, 0);
  -- 17. Numerik - Kuantitatif
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Jika 2x + 4 = 10, berapakah nilai 3x - 1?', 'TIU', 'Berhitung', 1, '2x = 6 -> x = 3. Maka 3(3) - 1 = 9 - 1 = 8.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, '8', TRUE, 0),
    (q_id, '7', FALSE, 0),
    (q_id, '9', FALSE, 0),
    (q_id, '10', FALSE, 0),
    (q_id, '5', FALSE, 0);
  -- 18. Numerik - Bilangan
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Manakah bilangan terbesar?', 'TIU', 'Berhitung', 2, 'A. 1/2 (0.5), B. 0.55, C. 4/7 (~0.57), D. 40% (0.4), E. 3/8 (0.375). Terbesar adalah 4/7 (0.57).')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, '4/7', TRUE, 0),
    (q_id, '0,55', FALSE, 0),
    (q_id, '1/2', FALSE, 0),
    (q_id, '40%', FALSE, 0),
    (q_id, '3/8', FALSE, 0);
  -- 19. Verbal - Analogi
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('GANDUM : ROTI = ... : ...', 'TIU', 'Analogi', 1, 'Bahan baku -> Produk. Gandum jadi Roti. Benang jadi Kain.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'BENANG : KAIN', TRUE, 0),
    (q_id, 'AIR : EMBER', FALSE, 0),
    (q_id, 'GULA : MANIS', FALSE, 0),
    (q_id, 'SAPI : DAGING', FALSE, 0),
    (q_id, 'UANG : KAYA', FALSE, 0);
  -- 20. Numerik - Deret
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('1, 4, 9, 16, 25, ...', 'TIU', 'Deret Angka', 1, 'Deret kuadrat: 1^2, 2^2, ..., 5^2. Selanjutnya 6^2 = 36.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, '36', TRUE, 0),
    (q_id, '30', FALSE, 0),
    (q_id, '34', FALSE, 0),
    (q_id, '42', FALSE, 0),
    (q_id, '49', FALSE, 0);
  -- 21. Logika - Analitis
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Siswa yang rajin akan lulus. Budi tidak rajin. Kesimpulan...', 'TIU', 'Logika Analitis', 2, 'Jika P -> Q, dan ~P, maka TIDAK DAPAT DISIMPULKAN dalam logika formal.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Tidak dapat disimpulkan', TRUE, 0),
    (q_id, 'Budi tidak lulus', FALSE, 0),
    (q_id, 'Budi lulus', FALSE, 0),
    (q_id, 'Budi siswa bodoh', FALSE, 0),
    (q_id, 'Budi mungkin lulus', FALSE, 0);
  -- 22. Numerik - Geometri
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Keliling persegi dengan luas 144 cm2 adalah...', 'TIU', 'Berhitung', 1, 'Luas = s x s = 144. Maka s = 12. Keliling = 4s = 48.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, '48 cm', TRUE, 0),
    (q_id, '12 cm', FALSE, 0),
    (q_id, '24 cm', FALSE, 0),
    (q_id, '36 cm', FALSE, 0),
    (q_id, '60 cm', FALSE, 0);
  -- 23. Verbal - Sinonim
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Sinonim NISBI adalah...', 'TIU', 'Verbal', 2, 'Nisbi artinya relatif, tidak mutlak.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Relatif', TRUE, 0),
    (q_id, 'Mutlak', FALSE, 0),
    (q_id, 'Pasti', FALSE, 0),
    (q_id, 'Abstrak', FALSE, 0),
    (q_id, 'Nyata', FALSE, 0);
  -- 24. Numerik - Operasi
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('8 + 4 x 3 - 6 : 2 = ...', 'TIU', 'Berhitung', 1, 'Kabataku: 4x3=12. 6:2=3. Jadi 8 + 12 - 3 = 17.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, '17', TRUE, 0),
    (q_id, '15', FALSE, 0),
    (q_id, '3', FALSE, 0),
    (q_id, '12', FALSE, 0),
    (q_id, '21', FALSE, 0);
  -- 25. Verbal - Pengelompokan
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Manakah kata yang tidak termasuk kelompoknya?', 'TIU', 'Verbal', 1, 'MEJA adalah perabot, sisanya benda langit.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'MEJA', TRUE, 0),
    (q_id, 'MATAHARI', FALSE, 0),
    (q_id, 'BUMI', FALSE, 0),
    (q_id, 'BULAN', FALSE, 0),
    (q_id, 'BINTANG', FALSE, 0);
  -- 26. Numerik - Perbandingan Berbalik Nilai
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Pembangunan gedung selesai 30 hari oleh 10 pekerja. Jika ingin selesai 15 hari, berapa pekerja tambahan yang dibutuhkan?', 'TIU', 'Berhitung', 3, '30 x 10 = 300. 15 x P = 300 -> P = 20. Tambahan = 20 - 10 = 10 pekerja.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, '10 pekerja', TRUE, 0),
    (q_id, '15 pekerja', FALSE, 0),
    (q_id, '5 pekerja', FALSE, 0),
    (q_id, '20 pekerja', FALSE, 0),
    (q_id, '25 pekerja', FALSE, 0);
  -- 27. Verbal - Analogi
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('APOTEKER : OBAT = ... : ...', 'TIU', 'Analogi', 1, 'Apoteker meracik obat. Koki memasak masakan. (Profesinya langsung terkait membuat objek tsb).')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'KOKI : MASAKAN', TRUE, 0),
    (q_id, 'PENULIS : BUKU', FALSE, 0),
    (q_id, 'DOKTER : PASIEN', FALSE, 0),
    (q_id, 'MONTIR : BENGKEL', FALSE, 0),
    (q_id, 'GURU : MURID', FALSE, 0);
  -- 28. Numerik - Deret Fibonaci
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('1, 1, 2, 3, 5, 8, ...', 'TIU', 'Deret Angka', 2, 'Deret Fibonacci (jumlah 2 angka sebelumnya). 5+8=13.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, '13', TRUE, 0),
    (q_id, '11', FALSE, 0),
    (q_id, '12', FALSE, 0),
    (q_id, '15', FALSE, 0),
    (q_id, '10', FALSE, 0);
  -- 29. Logika - Urutan
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Ani lebih tinggi dari Budi. Cici lebih pendek dari Budi. Siapa yang paling tinggi?', 'TIU', 'Logika Analitis', 1, 'Ani > Budi > Cici. Paling tinggi Ani.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Ani', TRUE, 0),
    (q_id, 'Budi', FALSE, 0),
    (q_id, 'Cici', FALSE, 0),
    (q_id, 'Semua sama', FALSE, 0),
    (q_id, 'Tidak bisa ditentukan', FALSE, 0);
  -- 30. Figural - Pola
  INSERT INTO questions (content, type, category, difficulty, explanation)
    VALUES ('Pola: O, OO, OOO, ...', 'TIU', 'Deret Gambar', 1, 'Polanya bertambah satu. Maka OOOO.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'OOOO', TRUE, 0),
    (q_id, 'OOO', FALSE, 0),
    (q_id, 'OOOOO', FALSE, 0),
    (q_id, 'O', FALSE, 0),
    (q_id, 'OO', FALSE, 0);

END
$$;
