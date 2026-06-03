-- =============================================
-- Seed: TIU - Deret Angka (10 Soal)
-- =============================================
DO $$
DECLARE
  q_id uuid;
BEGIN
  -- Soal 1
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Berapakah angka selanjutnya pada deret: 2, 4, 8, 16, 32, ...', 'TIU', 'Deret Angka', 'Deret Angka',
   'Pola perkalian 2. 32 × 2 = 64.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, '64', true, 5),
  (q_id, '48', false, 0),
  (q_id, '56', false, 0),
  (q_id, '72', false, 0),
  (q_id, '96', false, 0);

  -- Soal 2
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Tentukan angka selanjutnya pada deret Fibonacci: 1, 1, 2, 3, 5, 8, ...', 'TIU', 'Deret Angka', 'Deret Angka',
   'Setiap angka adalah jumlah dari 2 angka sebelumnya. 5 + 8 = 13.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, '13', true, 5),
  (q_id, '11', false, 0),
  (q_id, '12', false, 0),
  (q_id, '14', false, 0),
  (q_id, '15', false, 0);

  -- Soal 3
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Deret: 1, 4, 9, 16, 25, ...', 'TIU', 'Deret Angka', 'Deret Angka',
   'Pola bilangan kuadrat: 1^2, 2^2, 3^2, 4^2, 5^2. Selanjutnya 6^2 = 36.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, '36', true, 5),
  (q_id, '35', false, 0),
  (q_id, '37', false, 0),
  (q_id, '42', false, 0),
  (q_id, '45', false, 0);

  -- Soal 4
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Deret: 100, 95, 85, 70, 50, ...', 'TIU', 'Deret Angka', 'Deret Angka',
   'Selisih masing-masing: -5, -10, -15, -20. Selanjutnya selisih -25 -> 50 - 25 = 25.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, '25', true, 5),
  (q_id, '30', false, 0),
  (q_id, '20', false, 0),
  (q_id, '15', false, 0),
  (q_id, '35', false, 0);

  -- Soal 5
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Deret berseling: 2, 5, 4, 7, 6, 9, 8, ...', 'TIU', 'Deret Angka', 'Deret Angka',
   'Pola +3, -1, +3, -1. 8 + 3 = 11.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, '11', true, 5),
  (q_id, '10', false, 0),
  (q_id, '12', false, 0),
  (q_id, '7', false, 0),
  (q_id, '9', false, 0);

  -- Soal 6
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Deret: 3, 4, 7, 12, 19, ...', 'TIU', 'Deret Angka', 'Deret Angka',
   'Selisih bilangan ganjil: +1, +3, +5, +7. Selanjutnya +9 -> 19 + 9 = 28.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, '28', true, 5),
  (q_id, '25', false, 0),
  (q_id, '26', false, 0),
  (q_id, '29', false, 0),
  (q_id, '31', false, 0);

  -- Soal 7
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Deret: 10, 11, 15, 24, 40, ...', 'TIU', 'Deret Angka', 'Deret Angka',
   'Selisih adalah bilangan kuadrat berkelanjutan: +1(1^2), +4(2^2), +9(3^2), +16(4^2). Selanjutnya +25(5^2) -> 40 + 25 = 65.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, '65', true, 5),
  (q_id, '64', false, 0),
  (q_id, '56', false, 0),
  (q_id, '60', false, 0),
  (q_id, '71', false, 0);

  -- Soal 8
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Deret: 120, 60, 20, 5, ...', 'TIU', 'Deret Angka', 'Deret Angka',
   'Pembagi meningkat: /2 , /3 , /4. Selanjutnya /5 -> 5 / 5 = 1.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, '1', true, 5),
  (q_id, '0', false, 0),
  (q_id, '5', false, 0),
  (q_id, '2', false, 0),
  (q_id, '0.5', false, 0);

  -- Soal 9
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Deret huruf: A, C, F, J, O, ...', 'TIU', 'Deret Angka', 'Deret Angka',
   'Lompatan huruf: +2(B,C), +3(D,E,F), +4(G,H,I,J), +5(K,L,M,N,O). Selanjutnya lompatan +6 (P,Q,R,S,T,U) = U.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'U', true, 5),
  (q_id, 'T', false, 0),
  (q_id, 'V', false, 0),
  (q_id, 'S', false, 0),
  (q_id, 'W', false, 0);

  -- Soal 10
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Deret ganda: 2, 5, 4, 10, 8, 20, 16, ...', 'TIU', 'Deret Angka', 'Deret Angka',
   'Dua deret saling selip. A: 2, 4, 8, 16 (dikali 2). B: 5, 10, 20 (dikali 2). Selanjutnya milik B yaitu 20*2 = 40.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, '40', true, 5),
  (q_id, '32', false, 0),
  (q_id, '24', false, 0),
  (q_id, '30', false, 0),
  (q_id, '50', false, 0);

END $$;
