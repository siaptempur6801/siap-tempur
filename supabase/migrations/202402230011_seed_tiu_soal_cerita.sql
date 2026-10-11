-- =============================================
-- Seed: TIU - Soal Cerita (10 Soal)
-- =============================================
DO $$
DECLARE
  q_id uuid;
BEGIN
  -- Soal 1
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Sebuah kereta api berangkat dari Stasiun A ke Stasiun B dengan kecepatan rata-rata 60 km/jam. Jarak kedua stasiun adalah 150 km. Jika kereta berangkat pukul 08:15, jam berapa kereta tiba di Stasiun B?', 'TIU', 'Soal Cerita', 'Soal Cerita', 'Waktu = Jarak / Kecepatan = 150 / 60 = 2,5 jam = 2 jam 30 menit. 08:15 + 2:30 = 10:45.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, '10:45', TRUE, 5),
    (q_id, '10:30', FALSE, 0),
    (q_id, '11:00', FALSE, 0),
    (q_id, '11:15', FALSE, 0),
    (q_id, '10:15', FALSE, 0);
  -- Soal 2
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Sebuah pekerjaan dapat diselesaikan oleh 12 pekerja dalam waktu 20 hari. Jika pekerjaan tersebut harus selesai dalam 15 hari, berapa banyak tambahan pekerja yang diperlukan?', 'TIU', 'Soal Cerita', 'Soal Cerita', 'Perbandingan berbalik nilai: 12 × 20 = x × 15 -> 240 = 15x -> x = 16 pekerja. Tambahan = 16 - 12 = 4 pekerja.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, '4 orang', TRUE, 5),
    (q_id, '16 orang', FALSE, 0),
    (q_id, '2 orang', FALSE, 0),
    (q_id, '6 orang', FALSE, 0),
    (q_id, '8 orang', FALSE, 0);
  -- Soal 3
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Pak Budi membeli 5 lusin buku tulis dengan harga Rp 180.000,00. Jika ia menjual kembali dengan harga Rp 3.500,00 per buku, berapakah persentase keuntungannya?', 'TIU', 'Soal Cerita', 'Soal Cerita', '5 lusin = 60 buku. Harga beli per buku = 180.000/60 = Rp 3.000. Harga jual = Rp 3.500. Untung per buku = Rp 500. Persentase untung = (500/3000) × 100% = 1/6 × 100% ≈ 16,67%.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, '16,67%', TRUE, 5),
    (q_id, '15,00%', FALSE, 0),
    (q_id, '20,00%', FALSE, 0),
    (q_id, '12,50%', FALSE, 0),
    (q_id, '18,33%', FALSE, 0);
  -- Soal 4
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Tiga buah mesin A, B, dan C masing-masing dapat memproduksi 100 lusin barang dalam waktu berturut-turut 2 jam, 3 jam, dan 6 jam. Jika ketiga mesin bekerja bersama-sama, waktu yang dibutuhkan untuk memproduksi 100 lusin barang adalah...', 'TIU', 'Soal Cerita', 'Soal Cerita', 'Laju A = 1/2. Laju B = 1/3. Laju C = 1/6. Total Laju = 1/2 + 1/3 + 1/6 = 3/6 + 2/6 + 1/6 = 6/6 = 1 (1 pekerjaan/jam). Waktu = 1/1 = 1 jam.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, '1 jam', TRUE, 5),
    (q_id, '1,5 jam', FALSE, 0),
    (q_id, '2 jam', FALSE, 0),
    (q_id, '45 menit', FALSE, 0),
    (q_id, '30 menit', FALSE, 0);
  -- Soal 5
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Umur ayah 3 kali umur anaknya. Selisih umur mereka adalah 26 tahun. Berapakah umur ayah 5 tahun yang akan datang?', 'TIU', 'Soal Cerita', 'Soal Cerita', 'A = 3a. A - a = 26 -> 2a = 26 -> a = 13 tahun. A = 39 tahun. 5 tahun lagi A = 39 + 5 = 44 tahun.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, '44 tahun', TRUE, 5),
    (q_id, '39 tahun', FALSE, 0),
    (q_id, '42 tahun', FALSE, 0),
    (q_id, '45 tahun', FALSE, 0),
    (q_id, '49 tahun', FALSE, 0);
  -- Soal 6
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Sebuah bak mandi berukuran 120 cm × 80 cm × 60 cm. Bak tersebut telah terisi air 1/3 bagian. Berapa liter air yang diperlukan untuk memenuhi bak tersebut?', 'TIU', 'Soal Cerita', 'Soal Cerita', 'Volume total = 12 × 8 × 6 dm = 576 dm^3 = 576 liter. Terisi 1/3 (192 liter). Kekurangan = 2/3 × 576 = 384 liter.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, '384 liter', TRUE, 5),
    (q_id, '192 liter', FALSE, 0),
    (q_id, '576 liter', FALSE, 0),
    (q_id, '288 liter', FALSE, 0),
    (q_id, '416 liter', FALSE, 0);
  -- Soal 7
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Harga sepotong kemeja didiskon 20%, kemudian pemegang kartu anggota mendapat diskon tambahan 10% dari harga setelah diskon pertama. Total diskon yang didapat adalah...', 'TIU', 'Soal Cerita', 'Soal Cerita', 'Harga awal 100. Diskon pertama 20% -> sisa 80. Diskon kedua 10% dari 80 = 8. Total harga sisa 72. Total diskon dari awal: 100 - 72 = 28%.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, '28%', TRUE, 5),
    (q_id, '30%', FALSE, 0),
    (q_id, '32%', FALSE, 0),
    (q_id, '25%', FALSE, 0),
    (q_id, '22%', FALSE, 0);
  -- Soal 8
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Data penjualan beras toko A selama 5 hari berturut-turut: 40 kg, 45 kg, 55 kg, 50 kg, 60 kg. Supaya rata-ratanya menjadi 52 kg selama 6 hari, berapa kg beras yang harus terjual di hari ke-6?', 'TIU', 'Soal Cerita', 'Soal Cerita', 'Total 5 hari = 40+45+55+50+60 = 250 kg. Target 6 hari = 52 × 6 = 312 kg. Hari ke-6 = 312 - 250 = 62 kg.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, '62 kg', TRUE, 5),
    (q_id, '60 kg', FALSE, 0),
    (q_id, '58 kg', FALSE, 0),
    (q_id, '64 kg', FALSE, 0),
    (q_id, '54 kg', FALSE, 0);
  -- Soal 9
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Dalam suatu kelas terdapat 40 anak. 25 anak gemar Matematika, 20 anak gemar Fisika, dan 10 anak tidak gemar keduanya. Berapa anak yang gemar keduanya (Matematika dan Fisika)?', 'TIU', 'Soal Cerita', 'Soal Cerita', 'Total (40) = n(M) + n(F) - n(M∩F) + n(Tidak Keduanya). 40 = 25 + 20 - x + 10 = 55 - x. x = 55 - 40 = 15 anak.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, '15 anak', TRUE, 5),
    (q_id, '10 anak', FALSE, 0),
    (q_id, '5 anak', FALSE, 0),
    (q_id, '20 anak', FALSE, 0),
    (q_id, '12 anak', FALSE, 0);
  -- Soal 10
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Sebuah mobil memakan bahan bakar 1 liter untuk jarak 12 km saat berjalan di tol, dan 1 liter untuk 8 km saat di dalam kota. Jika mobil melaju 60 km di tol dan 40 km di dalam kota, berapa liter total bahan bakar yang dihabiskan?', 'TIU', 'Soal Cerita', 'Soal Cerita', 'Tol: 60 / 12 = 5 liter. Kota: 40 / 8 = 5 liter. Total = 5 + 5 = 10 liter.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, '10 liter', TRUE, 5),
    (q_id, '12 liter', FALSE, 0),
    (q_id, '8 liter', FALSE, 0),
    (q_id, '11 liter', FALSE, 0),
    (q_id, '9 liter', FALSE, 0);

END
$$;
