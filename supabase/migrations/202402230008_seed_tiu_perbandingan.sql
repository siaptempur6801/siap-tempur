-- =============================================
-- Seed: TIU - Perbandingan (10 Soal)
-- =============================================
DO $$
DECLARE
  q_id uuid;
BEGIN
  -- Soal 1
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Jika X = 2/3 dari Y, dan Y = 45, manakah hubungan yang benar antara X dan Y?', 'TIU', 'Perbandingan Kuantitatif', 'Perbandingan Kuantitatif', 'X = 2/3 * 45 = 30. Karena 30 < 45, maka X < Y.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'X < Y', TRUE, 5),
    (q_id, 'X > Y', FALSE, 0),
    (q_id, 'X = Y', FALSE, 0),
    (q_id, 'X = 2Y', FALSE, 0),
    (q_id, 'Hubungan X dan Y tidak dapat ditentukan', FALSE, 0);
  -- Soal 2
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Diketahui X = luas lingkaran berjari-jari 14 cm (π=22/7) dan Y = luas persegi panjang berukuran 30x20 cm. Hubungan X dan Y?', 'TIU', 'Perbandingan Kuantitatif', 'Perbandingan Kuantitatif', 'X = (22/7)*14*14 = 616 cm^2. Y = 30*20 = 600 cm^2. Maka X > Y.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'X > Y', TRUE, 5),
    (q_id, 'X < Y', FALSE, 0),
    (q_id, 'X = Y', FALSE, 0),
    (q_id, '2X = Y', FALSE, 0),
    (q_id, 'Hubungan X dan Y tidak dapat ditentukan', FALSE, 0);
  -- Soal 3
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Jika rata-rata dari p, q, dan r adalah 12, dan rata-rata p dan q adalah 10. Nilai r dibandingkan dengan x = 16?', 'TIU', 'Perbandingan Kuantitatif', 'Perbandingan Kuantitatif', 'Total (p,q,r) = 12 × 3 = 36. Total (p,q) = 10 × 2 = 20. Berarti r = 36 - 20 = 16. Maka r = x.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'r = x', TRUE, 5),
    (q_id, 'r > x', FALSE, 0),
    (q_id, 'r < x', FALSE, 0),
    (q_id, 'r = 2x', FALSE, 0),
    (q_id, 'Hubungan r dan x tidak dapat ditentukan', FALSE, 0);
  -- Soal 4
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('X = -(-3)^2 dan Y = (-3)^2. Hubungannya?', 'TIU', 'Perbandingan Kuantitatif', 'Perbandingan Kuantitatif', '(-3)^2 = 9. Jadi Y = 9. Sedangkan X = -(9) = -9. Maka X < Y.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'X < Y', TRUE, 5),
    (q_id, 'X > Y', FALSE, 0),
    (q_id, 'X = Y', FALSE, 0),
    (q_id, 'X = -Y (tetapi bukan opsi utama/lebih spesifik X < Y)', FALSE, 0),
    (q_id, 'Hubungan X dan Y tidak dapat ditentukan', FALSE, 0);
  -- Soal 5
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Misalkan a, b bilangan real kelipatan 5. X = (a+b)^2 dan Y = a^2 + b^2. Hubungannya?', 'TIU', 'Perbandingan Kuantitatif', 'Perbandingan Kuantitatif', 'X = a^2 + 2ab + b^2 = Y + 2ab. Jika ab positif, X > Y. Jika ab negatif, X < Y. Jika ab=0, X=Y. Informasi tidak cukup (bisa di bawah 0 atau di atas 0).')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Hubungan X dan Y tidak dapat ditentukan', TRUE, 5),
    (q_id, 'X > Y', FALSE, 0),
    (q_id, 'X < Y', FALSE, 0),
    (q_id, 'X = Y', FALSE, 0),
    (q_id, 'X = 2Y', FALSE, 0);
  -- Soal 6
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('X = jumlah sudut dalam segi-8 (oktagon) beraturan. Y = 1080 derajad.', 'TIU', 'Perbandingan Kuantitatif', 'Perbandingan Kuantitatif', 'Rumus jumlah sudut segi-n = (n-2) × 180. (8-2) × 180 = 6 × 180 = 1080. X = 1080. Y = 1080. Maka X = Y.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'X = Y', TRUE, 5),
    (q_id, 'X > Y', FALSE, 0),
    (q_id, 'X < Y', FALSE, 0),
    (q_id, '2X = Y', FALSE, 0),
    (q_id, 'Hubungan X dan Y tidak dapat ditentukan', FALSE, 0);
  -- Soal 7
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('A berlari 10 km dalam 60 menit. B berlari 5 km dalam 25 menit. Jika X = kecepatan lari A dan Y = kecepatan lari B?', 'TIU', 'Perbandingan Kuantitatif', 'Perbandingan Kuantitatif', 'Kecepatan A = 10 km / 1 jam = 10 km/jam. Kecepatan B = 5 km / (25/60) jam = (5 × 60) / 25 = 12 km/jam. Y > X.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'X < Y', TRUE, 5),
    (q_id, 'X > Y', FALSE, 0),
    (q_id, 'X = Y', FALSE, 0),
    (q_id, 'X = 2Y', FALSE, 0),
    (q_id, 'Hubungan X dan Y tidak dapat ditentukan', FALSE, 0);
  -- Soal 8
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Diketahui P adalah penyelesaian dari P^2 = 25, dan Q = 5.', 'TIU', 'Perbandingan Kuantitatif', 'Perbandingan Kuantitatif', 'P^2 = 25 -> P bisa 5 atau -5. Q = 5. Hubungan P dan Q tidak dapat dipastikan (bisa P = Q, bisa P < Q).')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Hubungan P dan Q tidak dapat ditentukan', TRUE, 5),
    (q_id, 'P < Q', FALSE, 0),
    (q_id, 'P > Q', FALSE, 0),
    (q_id, 'P = Q', FALSE, 0),
    (q_id, 'P = -Q', FALSE, 0);
  -- Soal 9
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Jika X = 77% dari 25, dan Y = 25% dari 77.', 'TIU', 'Perbandingan Kuantitatif', 'Perbandingan Kuantitatif', 'A% dari B akan selalu sama dengan B% dari A. 77/100 × 25 = 25/100 × 77. Maka X = Y.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'X = Y', TRUE, 5),
    (q_id, 'X > Y', FALSE, 0),
    (q_id, 'X < Y', FALSE, 0),
    (q_id, 'X = 2Y', FALSE, 0),
    (q_id, 'Hubungan X dan Y tidak dapat ditentukan', FALSE, 0);
  -- Soal 10
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Sebuah mobil membutuhkan 5 liter bensin untuk 60 km (X). Mobil lain butuh X liter untuk 120 km. Y = 10.', 'TIU', 'Perbandingan Kuantitatif', 'Perbandingan Kuantitatif', 'Mobil pertama: rasio 60/5 = 12 km/liter. Jika mobil "lain" identik, ia butuh X=10 liter untuk 120 km. Jika maksud soal variabel X = 10, Maka X = Y. Mari asumsikan kecepatan sama, dll (X bernilai 10). X = Y')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'X = Y', TRUE, 5),
    (q_id, 'X > Y', FALSE, 0),
    (q_id, 'X < Y', FALSE, 0),
    (q_id, 'X = 2Y', FALSE, 0),
    (q_id, 'Hubungan X dan Y tidak dapat ditentukan', FALSE, 0);

END
$$;
