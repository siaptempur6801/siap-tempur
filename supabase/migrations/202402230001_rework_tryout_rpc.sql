-- =============================================
-- Migration: Rework start_tryout_session with Blueprint Randomizer
-- Date: 2024-02-23
-- Purpose: Replace start_tryout_session to generate 110 soal
--          following the official SKD CPNS blueprint composition
-- =============================================

-- Drop old function signature (had extra parameters)
DROP FUNCTION IF EXISTS start_tryout_session(UUID, INT, INT, INT);

CREATE OR REPLACE FUNCTION start_tryout_session(p_user_id UUID)
RETURNS TABLE (
  session_id UUID,
  questions JSON
) AS $$
DECLARE
  v_session_id UUID;
  v_questions JSON;
  v_quota INT;
BEGIN
  -- ==========================================
  -- 0. CHECK & CONSUME TOKEN (1 per session)
  -- ==========================================
  SELECT tryout_quota INTO v_quota FROM profiles WHERE id = p_user_id;
  
  IF v_quota IS NULL OR v_quota < 1 THEN
    RAISE EXCEPTION 'Not enough SKD tickets';
  END IF;

  UPDATE profiles SET tryout_quota = tryout_quota - 1 WHERE id = p_user_id;

  -- ==========================================
  -- 1. CREATE SESSION
  -- ==========================================
  INSERT INTO test_sessions (user_id, mode, status, start_time)
  VALUES (p_user_id, 'tryout', 'in_progress', NOW())
  RETURNING id INTO v_session_id;

  -- ==========================================
  -- 2. BLUEPRINT RANDOMIZER (110 Soal Total)
  --    Each CTE samples N random questions from a specific sub_category
  --    Using ORDER BY random() LIMIT n — fast with idx_questions_type_subcategory
  -- ==========================================
  WITH
  -- === TWK (30 Soal) ===
  slot_twk_nasionalisme AS (
    SELECT id FROM questions WHERE type = 'TWK' AND sub_category = 'Nasionalisme'
    ORDER BY random() LIMIT 6
  ),
  slot_twk_integritas AS (
    SELECT id FROM questions WHERE type = 'TWK' AND sub_category = 'Integritas'
    ORDER BY random() LIMIT 6
  ),
  slot_twk_bela_negara AS (
    SELECT id FROM questions WHERE type = 'TWK' AND sub_category = 'Bela Negara'
    ORDER BY random() LIMIT 6
  ),
  slot_twk_pilar_negara AS (
    SELECT id FROM questions WHERE type = 'TWK' AND sub_category = 'Pilar Negara'
    ORDER BY random() LIMIT 6
  ),
  slot_twk_bahasa_negara AS (
    SELECT id FROM questions WHERE type = 'TWK' AND sub_category = 'Bahasa Negara'
    ORDER BY random() LIMIT 6
  ),

  -- === TIU (35 Soal) ===
  -- Kemampuan Verbal
  slot_tiu_analogi AS (
    SELECT id FROM questions WHERE type = 'TIU' AND sub_category = 'Analogi'
    ORDER BY random() LIMIT 3
  ),
  slot_tiu_silogisme AS (
    SELECT id FROM questions WHERE type = 'TIU' AND sub_category = 'Silogisme'
    ORDER BY random() LIMIT 3
  ),
  slot_tiu_analitis AS (
    SELECT id FROM questions WHERE type = 'TIU' AND sub_category = 'Analitis'
    ORDER BY random() LIMIT 4
  ),
  -- Kemampuan Numerik
  slot_tiu_berhitung AS (
    SELECT id FROM questions WHERE type = 'TIU' AND sub_category = 'Berhitung'
    ORDER BY random() LIMIT 5
  ),
  slot_tiu_deret_angka AS (
    SELECT id FROM questions WHERE type = 'TIU' AND sub_category = 'Deret Angka'
    ORDER BY random() LIMIT 5
  ),
  slot_tiu_perbandingan AS (
    SELECT id FROM questions WHERE type = 'TIU' AND sub_category = 'Perbandingan Kuantitatif'
    ORDER BY random() LIMIT 5
  ),
  slot_tiu_soal_cerita AS (
    SELECT id FROM questions WHERE type = 'TIU' AND sub_category = 'Soal Cerita'
    ORDER BY random() LIMIT 5
  ),
  -- Kemampuan Figural
  slot_tiu_analogi_figural AS (
    SELECT id FROM questions WHERE type = 'TIU' AND sub_category = 'Analogi Figural'
    ORDER BY random() LIMIT 2
  ),
  slot_tiu_ketidaksamaan AS (
    SELECT id FROM questions WHERE type = 'TIU' AND sub_category = 'Ketidaksamaan'
    ORDER BY random() LIMIT 1
  ),
  slot_tiu_serial AS (
    SELECT id FROM questions WHERE type = 'TIU' AND sub_category = 'Serial'
    ORDER BY random() LIMIT 2
  ),

  -- === TKP (45 Soal) ===
  slot_tkp_pelayanan AS (
    SELECT id FROM questions WHERE type = 'TKP' AND sub_category = 'Pelayanan Publik'
    ORDER BY random() LIMIT 8
  ),
  slot_tkp_jejaring AS (
    SELECT id FROM questions WHERE type = 'TKP' AND sub_category = 'Jejaring Kerja'
    ORDER BY random() LIMIT 8
  ),
  slot_tkp_sosial AS (
    SELECT id FROM questions WHERE type = 'TKP' AND sub_category = 'Sosial Budaya'
    ORDER BY random() LIMIT 7
  ),
  slot_tkp_tik AS (
    SELECT id FROM questions WHERE type = 'TKP' AND sub_category = 'Teknologi Informasi dan Komunikasi'
    ORDER BY random() LIMIT 7
  ),
  slot_tkp_profesionalisme AS (
    SELECT id FROM questions WHERE type = 'TKP' AND sub_category = 'Profesionalisme'
    ORDER BY random() LIMIT 7
  ),
  slot_tkp_anti_radikalisme AS (
    SELECT id FROM questions WHERE type = 'TKP' AND sub_category = 'Anti-Radikalisme'
    ORDER BY random() LIMIT 8
  ),

  -- === COMBINE ALL 21 SLOTS ===
  all_selected AS (
    SELECT id FROM slot_twk_nasionalisme
    UNION ALL SELECT id FROM slot_twk_integritas
    UNION ALL SELECT id FROM slot_twk_bela_negara
    UNION ALL SELECT id FROM slot_twk_pilar_negara
    UNION ALL SELECT id FROM slot_twk_bahasa_negara
    UNION ALL SELECT id FROM slot_tiu_analogi
    UNION ALL SELECT id FROM slot_tiu_silogisme
    UNION ALL SELECT id FROM slot_tiu_analitis
    UNION ALL SELECT id FROM slot_tiu_berhitung
    UNION ALL SELECT id FROM slot_tiu_deret_angka
    UNION ALL SELECT id FROM slot_tiu_perbandingan
    UNION ALL SELECT id FROM slot_tiu_soal_cerita
    UNION ALL SELECT id FROM slot_tiu_analogi_figural
    UNION ALL SELECT id FROM slot_tiu_ketidaksamaan
    UNION ALL SELECT id FROM slot_tiu_serial
    UNION ALL SELECT id FROM slot_tkp_pelayanan
    UNION ALL SELECT id FROM slot_tkp_jejaring
    UNION ALL SELECT id FROM slot_tkp_sosial
    UNION ALL SELECT id FROM slot_tkp_tik
    UNION ALL SELECT id FROM slot_tkp_profesionalisme
    UNION ALL SELECT id FROM slot_tkp_anti_radikalisme
  ),

  -- ==========================================
  -- 3. INSERT INTO TEST_ANSWERS (placeholder rows)
  -- ==========================================
  inserted_answers AS (
    INSERT INTO test_answers (session_id, question_id)
    SELECT v_session_id, id FROM all_selected
    RETURNING question_id
  )

  -- ==========================================
  -- 4. BUILD RESPONSE JSON
  --    Order: TWK first, then TIU, then TKP (within each, randomized)
  -- ==========================================
  SELECT json_agg(
    json_build_object(
      'id', q.id,
      'content', q.content,
      'type', q.type,
      'category', q.category,
      'sub_category', q.sub_category,
      'options', (
        SELECT json_agg(
          json_build_object(
            'id', o.id,
            'content', o.content
          ) ORDER BY random()  -- Randomize option order too
        ) FROM options o WHERE o.question_id = q.id
      )
    ) ORDER BY 
      CASE q.sub_category 
        WHEN 'Nasionalisme' THEN 1
        WHEN 'Integritas' THEN 2
        WHEN 'Bela Negara' THEN 3
        WHEN 'Pilar Negara' THEN 4
        WHEN 'Bahasa Negara' THEN 5
        WHEN 'Analogi' THEN 6
        WHEN 'Silogisme' THEN 7
        WHEN 'Analitis' THEN 8
        WHEN 'Berhitung' THEN 9
        WHEN 'Deret Angka' THEN 10
        WHEN 'Perbandingan Kuantitatif' THEN 11
        WHEN 'Soal Cerita' THEN 12
        WHEN 'Analogi Figural' THEN 13
        WHEN 'Ketidaksamaan' THEN 14
        WHEN 'Serial' THEN 15
        WHEN 'Pelayanan Publik' THEN 16
        WHEN 'Jejaring Kerja' THEN 17
        WHEN 'Sosial Budaya' THEN 18
        WHEN 'Teknologi Informasi dan Komunikasi' THEN 19
        WHEN 'Profesionalisme' THEN 20
        WHEN 'Anti-Radikalisme' THEN 21
      END, random()
  ) INTO v_questions
  FROM questions q
  JOIN inserted_answers ia ON ia.question_id = q.id;

  RETURN QUERY SELECT v_session_id, v_questions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
