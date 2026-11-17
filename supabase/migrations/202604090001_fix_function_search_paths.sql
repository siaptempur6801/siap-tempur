-- Fix mutable search_path warnings for security-definer and helper functions.
DO $$
BEGIN
  IF EXISTS (
    SELECT
      1
    FROM
      pg_proc
    WHERE
      pronamespace = 'public'::regnamespace
      AND proname = 'generate_question_code'
      AND oidvectortypes(proargtypes) = '') THEN
  ALTER FUNCTION public.generate_question_code () SET search_path = public;
END IF;

  IF EXISTS (
    SELECT
      1
    FROM
      pg_proc
    WHERE
      pronamespace = 'public'::regnamespace
      AND proname = 'next_question_code_by_type'
      AND oidvectortypes(proargtypes) = 'question_type') THEN
  ALTER FUNCTION public.next_question_code_by_type (public.question_type) SET search_path = public;
END IF;

  IF EXISTS (
    SELECT
      1
    FROM
      pg_proc
    WHERE
      pronamespace = 'public'::regnamespace
      AND proname = 'assign_question_code_by_type'
      AND oidvectortypes(proargtypes) = '') THEN
  ALTER FUNCTION public.assign_question_code_by_type () SET search_path = public;
END IF;

  IF EXISTS (
    SELECT
      1
    FROM
      pg_proc
    WHERE
      pronamespace = 'public'::regnamespace
      AND proname = 'claim_voucher'
      AND oidvectortypes(proargtypes) = 'uuid, text') THEN
  ALTER FUNCTION public.claim_voucher (uuid, text) SET search_path = public;
END IF;

  IF EXISTS (
    SELECT
      1
    FROM
      pg_proc
    WHERE
      pronamespace = 'public'::regnamespace
      AND proname = 'claim_voucher'
      AND oidvectortypes(proargtypes) = 'uuid, text, text') THEN
  ALTER FUNCTION public.claim_voucher (uuid, text, text) SET search_path = public;
END IF;
END
$$;
