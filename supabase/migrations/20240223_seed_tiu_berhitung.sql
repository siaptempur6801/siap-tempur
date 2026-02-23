-- =============================================
-- Seed: TIU - Berhitung (10 Soal)
-- =============================================
DO $$
DECLARE
  q_id uuid;
BEGIN
  -- Soal 1
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Berapakah hasil dari 25% dari 4/5 ?', 'TIU', 'Berhitung', 'Berhitung',
   '25% = 1/4. Maka 1/4 × 4/5 = 1/5 = 0.2.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, '1/5', true, 5),
  (q_id, '1/4', false, 0),
  (q_id, '2/5', false, 0),
  (q_id, '3/10', false, 0),
  (q_id, '1/2', false, 0);

  -- Soal 2
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Jika 3x + 5 = 20, berapakah nilai dari 6x - 2 ?', 'TIU', 'Berhitung', 'Berhitung',
   '3x = 15 -> x = 5. Maka 6(5) - 2 = 30 - 2 = 28.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, '28', true, 5),
  (q_id, '32', false, 0),
  (q_id, '24', false, 0),
  (q_id, '26', false, 0),
  (q_id, '30', false, 0);

  -- Soal 3
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Nilai dari (0,5 × 0,4) + (2/5 × 1/4) adalah...', 'TIU', 'Berhitung', 'Berhitung',
   '0.5 × 0.4 = 0.2. (2/5) × (1/4) = 2/20 = 1/10 = 0.1. Total = 0.2 + 0.1 = 0.3 atau 3/10.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, '0,3', true, 5),
  (q_id, '0,25', false, 0),
  (q_id, '0,4', false, 0),
  (q_id, '0,5', false, 0),
  (q_id, '0,15', false, 0);

  -- Soal 4
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Akar kuadrat dari (6^2 + 8^2) adalah...', 'TIU', 'Berhitung', 'Berhitung',
   '√(36 + 64) = √100 = 10.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, '10', true, 5),
  (q_id, '14', false, 0),
  (q_id, '12', false, 0),
  (q_id, '8', false, 0),
  (q_id, '100', false, 0);

  -- Soal 5
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Sebuah bilangan dibagi 4 hasilnya 15 bersisa 2. Bilangan tersebut adalah...', 'TIU', 'Berhitung', 'Berhitung',
   'Bilangan = (15 × 4) + 2 = 60 + 2 = 62.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, '62', true, 5),
  (q_id, '58', false, 0),
  (q_id, '60', false, 0),
  (q_id, '64', false, 0),
  (q_id, '61', false, 0);

  -- Soal 6
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Berapa hasil dari 1/3 + 1/4 - 1/6 ?', 'TIU', 'Berhitung', 'Berhitung',
   'KPK = 12. (4/12) + (3/12) - (2/12) = 5/12.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, '5/12', true, 5),
  (q_id, '7/12', false, 0),
  (q_id, '1/3', false, 0),
  (q_id, '1/4', false, 0),
  (q_id, '1/12', false, 0);

  -- Soal 7
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Jika a = 2, b = -3, dan c = 1, berapakah nilai dari ab^2 - c?', 'TIU', 'Berhitung', 'Berhitung',
   'a(b^2) - c = 2(-3)^2 - 1 = 2(9) - 1 = 18 - 1 = 17.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, '17', true, 5),
  (q_id, '19', false, 0),
  (q_id, '-17', false, 0),
  (q_id, '-19', false, 0),
  (q_id, '15', false, 0);

  -- Soal 8
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Hasil dari 125^(2/3) adalah...', 'TIU', 'Berhitung', 'Berhitung',
   '125 = 5^3. Maka (5^3)^(2/3) = 5^2 = 25.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, '25', true, 5),
  (q_id, '5', false, 0),
  (q_id, '15', false, 0),
  (q_id, '125', false, 0),
  (q_id, '50', false, 0);

  -- Soal 9
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Berapakah nilai x yang memenuhi persamaan 4(x - 2) = 2x + 10 ?', 'TIU', 'Berhitung', 'Berhitung',
   '4x - 8 = 2x + 10 -> 2x = 18 -> x = 9.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, '9', true, 5),
  (q_id, '8', false, 0),
  (q_id, '7', false, 0),
  (q_id, '10', false, 0),
  (q_id, '12', false, 0);

  -- Soal 10
  INSERT INTO questions (content, type, category, sub_category, explanation) VALUES 
  ('Harga sepotong kemeja setelah diskon 20% adalah Rp160.000. Harga awalnya adalah...', 'TIU', 'Berhitung', 'Berhitung',
   '80% = Rp160.000. 100% = (100/80) × 160.000 = Rp200.000.') 
  RETURNING id INTO q_id;
  INSERT INTO options (question_id, content, is_correct, score_value) VALUES
  (q_id, 'Rp 200.000', true, 5),
  (q_id, 'Rp 192.000', false, 0),
  (q_id, 'Rp 220.000', false, 0),
  (q_id, 'Rp 180.000', false, 0),
  (q_id, 'Rp 240.000', false, 0);

END $$;
