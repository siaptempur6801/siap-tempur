CREATE SEQUENCE IF NOT EXISTS questions_twk_code_seq START 1;

CREATE SEQUENCE IF NOT EXISTS questions_tiu_code_seq START 1;

CREATE SEQUENCE IF NOT EXISTS questions_tkp_code_seq START 1;

CREATE OR REPLACE FUNCTION next_question_code_by_type (question_type_input question_type)
  RETURNS text
  LANGUAGE plpgsql
  AS $$
DECLARE
  code_prefix text;
  next_number bigint;
BEGIN
  CASE question_type_input
  WHEN 'TWK' THEN
    code_prefix := 'TWK';
    next_number := nextval('questions_twk_code_seq');
  WHEN 'TIU' THEN
    code_prefix := 'TIU';
    next_number := nextval('questions_tiu_code_seq');
  WHEN 'TKP' THEN
    code_prefix := 'TKP';
    next_number := nextval('questions_tkp_code_seq');
  ELSE
    RAISE EXCEPTION 'Unsupported question type: %', question_type_input;
  END CASE;

  RETURN code_prefix || '-' || lpad(next_number::text, 6, '0');
END;
$$;

CREATE OR REPLACE FUNCTION assign_question_code_by_type ()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $$
BEGIN
  IF NEW.question_code IS NULL OR btrim(NEW.question_code) = '' THEN
    NEW.question_code := next_question_code_by_type (NEW.type);
  END IF;

  RETURN new;
END;
$$;

ALTER TABLE questions
  ALTER COLUMN question_code DROP DEFAULT;

DROP TRIGGER IF EXISTS questions_assign_question_code ON questions;

CREATE TRIGGER questions_assign_question_code
  BEFORE INSERT ON questions
  FOR EACH ROW
  EXECUTE FUNCTION assign_question_code_by_type ();

WITH ranked_questions AS (
  SELECT
    id,
    type,
    row_number() OVER (PARTITION BY type ORDER BY created_at,
      id) AS sequence_number
  FROM
    questions)
UPDATE
  questions AS q
SET
  question_code = CASE ranked_questions.type
  WHEN 'TWK' THEN
    'TWK-' || lpad(ranked_questions.sequence_number::text, 6, '0')
  WHEN 'TIU' THEN
    'TIU-' || lpad(ranked_questions.sequence_number::text, 6, '0')
  WHEN 'TKP' THEN
    'TKP-' || lpad(ranked_questions.sequence_number::text, 6, '0')
  END
FROM
  ranked_questions
WHERE
  q.id = ranked_questions.id;

SELECT
  setval('questions_twk_code_seq', greatest ((
      SELECT
        count(*)
      FROM questions
      WHERE
        type = 'TWK') + 1, 1), FALSE);

SELECT
  setval('questions_tiu_code_seq', greatest ((
      SELECT
        count(*)
      FROM questions
      WHERE
        type = 'TIU') + 1, 1), FALSE);

SELECT
  setval('questions_tkp_code_seq', greatest ((
      SELECT
        count(*)
      FROM questions
      WHERE
        type = 'TKP') + 1, 1), FALSE);
