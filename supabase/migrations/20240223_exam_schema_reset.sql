-- =============================================
-- Migration: Exam Schema Reset
-- Date: 2024-02-23
-- Purpose: Wipe all question data and add sub_category column
-- =============================================
-- 1. Wipe all existing question/session data (cascade via FK)
DELETE FROM test_answers;

DELETE FROM test_sessions;

DELETE FROM options;

DELETE FROM questions;

-- Also clean up tryout_questions if any
DELETE FROM tryout_questions;

-- 2. Add sub_category column for blueprint-based randomization
ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS sub_category text;

-- 3. Composite index for fast random sampling per blueprint slot
-- This makes "WHERE type = X AND sub_category = Y ORDER BY random() LIMIT n" fast
CREATE INDEX IF NOT EXISTS idx_questions_type_subcategory ON questions (type, sub_category);

-- 4. Update category column comment for clarity
COMMENT ON COLUMN questions.sub_category IS TEXTVALUE0E;
