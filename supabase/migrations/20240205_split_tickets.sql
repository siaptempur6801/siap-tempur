-- Add UTBK quota column
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS tryout_quota_utbk int DEFAULT 0;

-- Rename existing quota to clarify it is for SKD (optional, but good for clarity, though risky for existing code)
-- For now, we will treat 'tryout_quota' as SKD quota and 'tryout_quota_utbk' as UTBK quota.
-- Update start_tryout_session to Consume Quota
CREATE OR REPLACE FUNCTION start_tryout_session (p_user_id uuid, p_twk_count int DEFAULT 30, p_tiu_count int DEFAULT 35, p_tkp_count int DEFAULT 45)
  RETURNS TABLE (
    session_id uuid,
    questions json
  )
  AS $$
DECLARE
  v_session_id uuid;
  v_questions json;
  v_quota int;
BEGIN
  -- 0. Check Quota (SKD)
  SELECT
    tryout_quota
  INTO
    v_quota
  FROM
    profiles
  WHERE
    id = p_user_id;
  IF v_quota IS NULL OR v_quota < 1 THEN
    RAISE EXCEPTION 'Not enough SKD tickets';
  END IF;
  -- 1. Decrement Quota
  UPDATE
    profiles
  SET
    tryout_quota = tryout_quota - 1
  WHERE
    id = p_user_id;
  -- 2. Create Session with mode 'tryout'
  INSERT INTO test_sessions (user_id, mode, status, start_time)
    VALUES (p_user_id, 'tryout', 'in_progress', NOW())
  RETURNING
    id
  INTO
    v_session_id;
  -- 3. Select Random Questions & Insert into Test Answers
  WITH selected_twk AS (
    SELECT
      id
    FROM
      questions
    WHERE
      type = 'TWK'
    ORDER BY
      RANDOM()
    LIMIT p_twk_count
),
selected_tiu AS (
  SELECT
    id
  FROM
    questions
  WHERE
    type = 'TIU'
  ORDER BY
    RANDOM()
  LIMIT p_tiu_count
),
selected_tkp AS (
  SELECT
    id
  FROM
    questions
  WHERE
    type = 'TKP'
  ORDER BY
    RANDOM()
  LIMIT p_tkp_count
),
all_selected AS (
  SELECT
    id
  FROM
    selected_twk
  UNION ALL
  SELECT
    id
  FROM
    selected_tiu
  UNION ALL
  SELECT
    id
  FROM
    selected_tkp
),
inserted_answers AS (
INSERT INTO test_answers (session_id, question_id)
  SELECT
    v_session_id,
    id
  FROM
    all_selected
  RETURNING
    question_id)
  -- 4. Fetch Question Details to Return
  SELECT
    json_agg(json_build_object('id', q.id, 'content', q.content, 'type', q.type, 'category', q.category, -- Include category
        'options', (
          SELECT
            json_agg(json_build_object('id', o.id, 'content', o.content)
          ORDER BY RANDOM())
        FROM options o
      WHERE
        o.question_id = q.id))
  ORDER BY CASE q.type
    WHEN 'TWK' THEN
      1
    WHEN 'TIU' THEN
      2
    WHEN 'TKP' THEN
      3
    END, RANDOM()
  -- Order by Type then Random
)
  INTO
    v_questions
  FROM
    questions q
    JOIN inserted_answers ia ON ia.question_id = q.id;

  RETURN QUERY
  SELECT
    v_session_id,
    v_questions;
END;
$$
LANGUAGE plpgsql
SECURITY DEFINER;
