CREATE SEQUENCE IF NOT EXISTS question_code_seq START 1;

CREATE OR REPLACE FUNCTION generate_question_code ()
  RETURNS text
  LANGUAGE plpgsql
  AS $$
BEGIN
  RETURN 'Q-' || lpad(nextval('question_code_seq')::text, 6, '0');
END;
$$;

ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS question_code text;

ALTER TABLE questions
  ALTER COLUMN question_code SET DEFAULT generate_question_code ();

UPDATE
  questions
SET
  question_code = generate_question_code ()
WHERE
  question_code IS NULL;

ALTER TABLE questions
  ALTER COLUMN question_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS questions_question_code_key ON questions (question_code);
