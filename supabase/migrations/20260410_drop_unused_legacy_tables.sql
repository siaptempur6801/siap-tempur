-- Remove legacy tables that are no longer used by the active application flow.
-- Safe to rerun.
DO $cleanup$
BEGIN
  IF to_regclass('public.materials') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Authenticated read materials" ON public.materials;
  END IF;

  IF to_regclass('public.tryouts') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Authenticated read tryouts" ON public.tryouts;
  END IF;

  IF to_regclass('public.tryout_questions') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Authenticated read tryout questions" ON public.tryout_questions;
  END IF;
END
$cleanup$;

DROP INDEX IF EXISTS public.tryout_questions_question_id_idx;

ALTER TABLE IF EXISTS public.test_sessions
  DROP CONSTRAINT IF EXISTS test_sessions_tryout_id_fkey;

ALTER TABLE IF EXISTS public.test_sessions
  DROP COLUMN IF EXISTS tryout_id;

DROP TABLE IF EXISTS public.tryout_questions;

DROP TABLE IF EXISTS public.tryouts;

DROP TABLE IF EXISTS public.materials;
