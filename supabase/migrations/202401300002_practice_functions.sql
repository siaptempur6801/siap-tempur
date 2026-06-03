-- Migration: Practice Functions
-- Date: 2024-01-30

-- Function to Start a Practice Session
-- Generates a session and pre-fills it with random questions of the specific type
CREATE OR REPLACE FUNCTION start_practice_session(
  p_user_id UUID,
  p_type question_type,
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  session_id UUID,
  questions JSON
) AS $$
DECLARE
  v_session_id UUID;
  v_questions JSON;
BEGIN
  -- 1. Create Session
  INSERT INTO test_sessions (user_id, mode, status, start_time)
  VALUES (p_user_id, 'practice', 'in_progress', NOW())
  RETURNING id INTO v_session_id;

  -- 2. Select Random Questions & Insert into Test Answers
  -- This "locks" the questions for this specific session
  WITH selected_questions AS (
    SELECT id, content, type, category, difficulty, explanation
    FROM questions
    WHERE type = p_type
    ORDER BY RANDOM()
    LIMIT p_limit
  ),
  inserted_answers AS (
    INSERT INTO test_answers (session_id, question_id)
    SELECT v_session_id, id FROM selected_questions
    RETURNING question_id
  )
  -- 3. Fetch Question Details to Return
  SELECT json_agg(
    json_build_object(
      'id', q.id,
      'content', q.content,
      'type', q.type,
      'category', q.category,
      'options', (
        SELECT json_agg(
          json_build_object(
            'id', o.id,
            'content', o.content
          ) ORDER BY RANDOM() -- Randomize Option Order too!
        ) FROM options o WHERE o.question_id = q.id
      )
    )
  ) INTO v_questions
  FROM selected_questions q
  JOIN inserted_answers ia ON ia.question_id = q.id;

  RETURN QUERY SELECT v_session_id, v_questions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
