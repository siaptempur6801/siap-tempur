-- =============================================
-- Seed: TIU - Serial (4 Soal)
-- =============================================
DO $$
DECLARE
  q_id uuid;
BEGIN
  -- Soal 1
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Terdapat deret gambar berurutan: (1) panah menunjuk jam 12, (2) panah menunjuk jam 3, (3) panah menunjuk jam 6. Maka gambar ke-(4) adalah...', 'TIU', 'Serial', 'Serial', 'Pola putaran arah jarum jam sebesar 90 derajat. Jam 12 -> 3 -> 6 -> 9.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Panah menunjuk jam 9 (kiri)', TRUE, 5),
    (q_id, 'Panah menunjuk jam 12 (atas)', FALSE, 0),
    (q_id, 'Panah menunjuk jam 1 (serong atas)', FALSE, 0),
    (q_id, 'Panah menunjuk jam 6 (bawah)', FALSE, 0),
    (q_id, 'Panah tidak berputar', FALSE, 0);
  -- Soal 2
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Seri gambar: (1) Kotak putih, (2) Kotak bergaris 1 horizontal, (3) Kotak bergaris 2 horizontal, (4) Kotak bergaris 3 horizontal. Gambar selanjutnya (5) adalah...', 'TIU', 'Serial', 'Serial', 'Pola penambahan 1 garis horizontal setiap tahap. Maka selanjutnya kotak dengan 4 garis horizontal.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Kotak bergaris 4 horizontal', TRUE, 5),
    (q_id, 'Kotak bergaris 4 vertikal', FALSE, 0),
    (q_id, 'Kotak hitam penuh', FALSE, 0),
    (q_id, 'Kotak bergaris menyilang X', FALSE, 0),
    (q_id, 'Kotak tanpa garis', FALSE, 0);
  -- Soal 3
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Seri gambar: (1) Segitiga dengan 1 titik hitam di dalam, (2) Segi empat dengan 2 titik hitam, (3) Segi lima dengan 3 titik hitam. Gambar ke-(4) adalah...', 'TIU', 'Serial', 'Serial', 'Pola: Jumlah sisi bangun bertambah 1 (3, 4, 5, 6). Jumlah titik bertambah 1 (1, 2, 3, 4). Maka gambar selanjutnya segi enam dengan 4 titik hitam.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Segi enam dengan 4 titik hitam di dalamnya', TRUE, 5),
    (q_id, 'Segi enam dengan 5 titik hitam di dalamnya', FALSE, 0),
    (q_id, 'Segi lima dengan 4 titik hitam di dalamnya', FALSE, 0),
    (q_id, 'Lingkaran dengan 4 titik hitam di dalamnya', FALSE, 0),
    (q_id, 'Segitiga dengan 4 titik hitam di luarnya', FALSE, 0);
  -- Soal 4
  INSERT INTO questions (content, type, category, sub_category, explanation)
    VALUES ('Seri gambar bentuk awan yang perlahan-lahan menyusut dari luar ke dalam: (1) Awan besar, (2) Awan sedang, (3) Awan kecil. Maka gambar ke-(4) paling mungkin adalah...', 'TIU', 'Serial', 'Serial', 'Pola zoom-out atau penyusutan skala berkelanjutan secara proporsional. Awan besar -> sedang -> kecil -> awan sangat kecil atau titik.')
  RETURNING
    id
  INTO
    q_id;
  INSERT INTO options (question_id, content, is_correct, score_value)
  VALUES
    (q_id, 'Bentuk awan yang sangat kecil atau hampir menyerupai titik', TRUE, 5),
    (q_id, 'Bentuk awan raksasa', FALSE, 0),
    (q_id, 'Awan yang menurunkan hujan lebat', FALSE, 0),
    (q_id, 'Bentuk matahari bersinar cerah', FALSE, 0),
    (q_id, 'Bentuk kotak persegi sebagai penyederhanaan awan', FALSE, 0);

END
$$;
