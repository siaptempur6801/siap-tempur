-- FUNCTION: Start Tryout Session (Simulasi SKD)
-- Generates a combined session with TWK, TIU, and TKP
-- Defaults: TWK=30, TIU=35, TKP=45 (Total 110 - Standard CPNS)
-- User Requested: TWK=35, TIU=35, TKP=45 (Total 115) -> I will set TWK to 30 to match 110 total, but easy to adjust.
-- actually user said "twk maks 35", so 30 is within max.

CREATE OR REPLACE FUNCTION start_tryout_session(
  p_user_id UUID,
  p_twk_count INT DEFAULT 30, -- Standard
  p_tiu_count INT DEFAULT 35, -- Standard
  p_tkp_count INT DEFAULT 45  -- Standard
)
RETURNS TABLE (
  session_id UUID,
  questions JSON
) AS $$
DECLARE
  v_session_id UUID;
  v_questions JSON;
BEGIN
  -- 1. Create Session with mode 'tryout'
  INSERT INTO test_sessions (user_id, mode, status, start_time)
  VALUES (p_user_id, 'tryout', 'in_progress', NOW())
  RETURNING id INTO v_session_id;

  -- 2. Select Random Questions & Insert into Test Answers
  WITH selected_twk AS (
    SELECT id FROM questions WHERE type = 'TWK' ORDER BY RANDOM() LIMIT p_twk_count
  ),
  selected_tiu AS (
    SELECT id FROM questions WHERE type = 'TIU' ORDER BY RANDOM() LIMIT p_tiu_count
  ),
  selected_tkp AS (
    SELECT id FROM questions WHERE type = 'TKP' ORDER BY RANDOM() LIMIT p_tkp_count
  ),
  all_selected AS (
    SELECT id FROM selected_twk
    UNION ALL
    SELECT id FROM selected_tiu
    UNION ALL
    SELECT id FROM selected_tkp
  ),
  inserted_answers AS (
    INSERT INTO test_answers (session_id, question_id)
    SELECT v_session_id, id FROM all_selected
    RETURNING question_id
  )
  
  -- 3. Fetch Question Details to Return (re-using logic from start_practice)
  SELECT json_agg(
    json_build_object(
      'id', q.id,
      'content', q.content,
      'type', q.type,
      'category', q.category, -- Include category
      'options', (
        SELECT json_agg(
          json_build_object(
            'id', o.id,
            'content', o.content
          ) ORDER BY RANDOM()
        ) FROM options o WHERE o.question_id = q.id
      )
    ) ORDER BY 
      CASE q.type 
        WHEN 'TWK' THEN 1 
        WHEN 'TIU' THEN 2 
        WHEN 'TKP' THEN 3 
      END, RANDOM() -- Order by Type then Random
  ) INTO v_questions
  FROM questions q
  JOIN inserted_answers ia ON ia.question_id = q.id;

  RETURN QUERY SELECT v_session_id, v_questions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
