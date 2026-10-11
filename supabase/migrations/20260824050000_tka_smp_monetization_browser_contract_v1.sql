CREATE OR REPLACE FUNCTION public.is_tka_smp_monetization_enforced ()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  SELECT
    coalesce((
      SELECT
        ff.enabled
      FROM public.feature_flags ff
      WHERE
        ff.key = 'tka.smp.monetization_enforcement'), FALSE);
$function$;

REVOKE ALL ON FUNCTION public.is_tka_smp_monetization_enforced () FROM public, anon;

GRANT EXECUTE ON FUNCTION public.is_tka_smp_monetization_enforced () TO authenticated;
