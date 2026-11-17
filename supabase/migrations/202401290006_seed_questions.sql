-- TWK Questions
INSERT INTO questions (content, type, difficulty, explanation)
VALUES
  ('Berdasarkan UUD 1945, kekuasaan membentuk undang-undang merupakan kekuasaan...', 'TWK', 1, 'Legislatif (DPR) memiliki kekuasaan membentuk UU.'),
  ('Lambang negara ialah Garuda Pancasila dengan semboyan Bhinneka Tunggal Ika. Pasal berapa yang mengaturnya?', 'TWK', 2, 'Pasal 36A.');

-- TIU Questions
INSERT INTO questions (content, type, difficulty, explanation)
VALUES
  ('Jika 2x + 3 = 11, berapakah nilai x?', 'TIU', 1, '2x = 8, maka x = 4.'),
  ('Semua dokter adalah orang pintar. Sebagian orang pintar suka membaca. Kesimpulan yang benar adalah...', 'TIU', 2, 'Sebagian dokter suka membaca (Tidak bisa disimpulkan secara universal, tapi opsi terbaik biasanya silogisme).');

-- Link Options for TWK 1
INSERT INTO options (question_id, content, is_correct)
VALUES
  ((
      SELECT
        id
      FROM
        questions
      WHERE
        content LIKE 'Berdasarkan UUD 1945%'
      LIMIT 1),
    'Ekskutif',
    FALSE),
((
  SELECT
    id
  FROM questions
  WHERE
    content LIKE 'Berdasarkan UUD 1945%' LIMIT 1), 'Legislatif', TRUE),
((
  SELECT
    id
  FROM questions
WHERE
  content LIKE 'Berdasarkan UUD 1945%' LIMIT 1), 'Yudikatif', FALSE),
((
  SELECT
    id
  FROM questions
WHERE
  content LIKE 'Berdasarkan UUD 1945%' LIMIT 1), 'Federatif', FALSE),
((
  SELECT
    id
  FROM questions
WHERE
  content LIKE 'Berdasarkan UUD 1945%' LIMIT 1), 'Konstitutif', FALSE);

-- Link Options for TIU 1
INSERT INTO options (question_id, content, is_correct)
VALUES
  ((
      SELECT
        id
      FROM
        questions
      WHERE
        content LIKE 'Jika 2x + 3%'
      LIMIT 1),
    '2',
    FALSE),
((
  SELECT
    id
  FROM questions
  WHERE
    content LIKE 'Jika 2x + 3%' LIMIT 1), '3', FALSE),
((
  SELECT
    id
  FROM questions
WHERE
  content LIKE 'Jika 2x + 3%' LIMIT 1), '4', TRUE),
((
  SELECT
    id
  FROM questions
WHERE
  content LIKE 'Jika 2x + 3%' LIMIT 1), '5', FALSE),
((
  SELECT
    id
  FROM questions
WHERE
  content LIKE 'Jika 2x + 3%' LIMIT 1), '6', FALSE);
