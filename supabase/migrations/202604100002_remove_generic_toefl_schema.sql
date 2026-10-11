-- Remove deprecated generic/TOEFL schema now that the product is CPNS-only.
-- Safe to rerun.
DO $cleanup$
BEGIN
  IF to_regclass('public.generic_tests') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Public read generic_tests" ON public.generic_tests;
  END IF;

  IF to_regclass('public.generic_questions') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Public read generic_questions" ON public.generic_questions;
  END IF;

  IF to_regclass('public.generic_options') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Public read generic_options" ON public.generic_options;
  END IF;

  IF to_regclass('public.generic_sessions') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Users can view own generic_sessions" ON public.generic_sessions;
    DROP POLICY IF EXISTS "Users can insert own generic_sessions" ON public.generic_sessions;
    DROP POLICY IF EXISTS "Users can update own generic_sessions" ON public.generic_sessions;
  END IF;

  IF to_regclass('public.generic_answers') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Users can view own generic_answers" ON public.generic_answers;
    DROP POLICY IF EXISTS "Users can insert own generic_answers" ON public.generic_answers;
    DROP POLICY IF EXISTS "Users can update own generic_answers" ON public.generic_answers;
  END IF;
END
$cleanup$;

DROP TABLE IF EXISTS public.generic_answers;

DROP TABLE IF EXISTS public.generic_sessions;

DROP TABLE IF EXISTS public.generic_options;

DROP TABLE IF EXISTS public.generic_questions;

DROP TABLE IF EXISTS public.generic_tests;

DROP FUNCTION IF EXISTS public.increment_toefl_quota (uuid, int);

ALTER TABLE IF EXISTS public.profiles
  DROP COLUMN IF EXISTS tryout_quota_toefl;
