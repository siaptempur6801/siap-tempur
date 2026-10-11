-- FUNCTION: Calculate Session Score (Robust Version)
-- Optimized to handle unanswered questions (NULL options) safely.
CREATE OR REPLACE FUNCTION calculate_session_score (session_uuid uuid)
  RETURNS void
  AS $$
DECLARE
  v_twk int;
  v_tiu int;
  v_tkp int;
  v_total int;
  v_passed boolean;
  -- Passing Grades (Adjust as needed)
  PASS_TWK int := 65;
  PASS_TIU int := 80;
  PASS_TKP int := 166;
BEGIN
  -- Calculate TWK (Correct = 5, Wrong/Empty = 0)
  -- Uses LEFT JOIN so unanswered questions are counted as 0, not skipped
  SELECT
    COALESCE(SUM(
        CASE WHEN q.type = 'TWK'
          AND o.is_correct THEN
          5
        ELSE
          0
        END), 0)
  INTO
    v_twk
  FROM
    test_answers a
    JOIN questions q ON a.question_id = q.id
    LEFT JOIN options o ON a.option_id = o.id
  WHERE
    a.session_id = session_uuid;
  -- Calculate TIU (Correct = 5, Wrong/Empty = 0)
  SELECT
    COALESCE(SUM(
        CASE WHEN q.type = 'TIU'
          AND o.is_correct THEN
          5
        ELSE
          0
        END), 0)
  INTO
    v_tiu
  FROM
    test_answers a
    JOIN questions q ON a.question_id = q.id
    LEFT JOIN options o ON a.option_id = o.id
  WHERE
    a.session_id = session_uuid;
  -- Calculate TKP (Score based on option value 1-5, Empty = 0)
  SELECT
    COALESCE(SUM(
        CASE WHEN q.type = 'TKP' THEN
          COALESCE(o.score_value, 0)
        ELSE
          0
        END), 0)
  INTO
    v_tkp
  FROM
    test_answers a
    JOIN questions q ON a.question_id = q.id
    LEFT JOIN options o ON a.option_id = o.id
  WHERE
    a.session_id = session_uuid;

  v_total := v_twk + v_tiu + v_tkp;
  -- Determine Passing (Only if ALL thresholds are met)
  IF v_twk >= PASS_TWK AND v_tiu >= PASS_TIU AND v_tkp >= PASS_TKP THEN
    v_passed := TRUE;
  ELSE
    v_passed := FALSE;
  END IF;
  -- Update Session
  UPDATE
    test_sessions
  SET
    score_twk = v_twk,
    score_tiu = v_tiu,
    score_tkp = v_tkp,
    total_score = v_total,
    is_passed = v_passed,
    status = 'completed',
    end_time = NOW()
  WHERE
    id = session_uuid;
END;
$$
LANGUAGE plpgsql
SECURITY DEFINER;
