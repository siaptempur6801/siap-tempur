-- =============================================
-- Migration: Fix FK Cascade on Options → test_answers
-- Date: 2024-03-18
-- Purpose: Prevent FK violation when admin edits/deletes questions.
--          `test_answers.option_id` FK changed to ON DELETE SET NULL so that
--          deleting options doesn't break historical answer records.
-- =============================================

-- Drop existing FK constraint
ALTER TABLE public.test_answers
  DROP CONSTRAINT IF EXISTS test_answers_option_id_fkey;

-- Ensure option_id is nullable (required for ON DELETE SET NULL to work)
ALTER TABLE public.test_answers
  ALTER COLUMN option_id DROP NOT NULL;

-- Re-add FK with ON DELETE SET NULL
-- Historical answers are preserved; option_id becomes NULL when the option is removed.
ALTER TABLE public.test_answers
  ADD CONSTRAINT test_answers_option_id_fkey
  FOREIGN KEY (option_id)
  REFERENCES public.options(id)
  ON DELETE SET NULL;
