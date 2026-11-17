CREATE OR REPLACE FUNCTION app_private.enforce_tka_smp_token_cost ()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
DECLARE
  v_program_code text;
  v_track_code text;
  v_exam_type_code text;
BEGIN
  SELECT
    upper(pr.code),
    upper(tr.code),
    upper(et.code)
  INTO
    v_program_code,
    v_track_code,
    v_exam_type_code
  FROM
    public.programs pr
    JOIN public.tracks tr ON tr.program_id = pr.id
    JOIN public.exam_types et ON et.id = NEW.exam_type_id
  WHERE
    pr.id = NEW.program_id
    AND tr.id = NEW.track_id;

  IF v_program_code = 'TKA' AND v_track_code = 'SMP' AND v_exam_type_code IN ('FULL_TRYOUT', 'MINI_TRYOUT', 'DRILL') AND lower(coalesce(NEW.status, '')) IN ('active', 'scheduled') AND coalesce(NEW.token_cost, 0) < 1 THEN
    RAISE EXCEPTION 'EXAM_TOKEN_COST_REQUIRED';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION app_private.enforce_tka_smp_token_cost () FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS exams_enforce_tka_smp_token_cost ON public.exams;

CREATE TRIGGER exams_enforce_tka_smp_token_cost
  BEFORE INSERT OR UPDATE OF program_id,
  track_id,
  exam_type_id,
  status,
  token_cost ON public.exams
  FOR EACH ROW
  EXECUTE FUNCTION app_private.enforce_tka_smp_token_cost ();
