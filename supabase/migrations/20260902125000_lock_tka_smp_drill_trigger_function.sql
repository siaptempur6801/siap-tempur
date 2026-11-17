-- Keep the TKA SMP drill projection trigger internal-only.
-- SECURITY DEFINER functions inherit EXECUTE for PUBLIC unless explicitly revoked.
REVOKE EXECUTE ON FUNCTION app_private.refresh_tka_smp_drill_projection_after_attempt () FROM public;

REVOKE EXECUTE ON FUNCTION app_private.refresh_tka_smp_drill_projection_after_attempt () FROM anon;

REVOKE EXECUTE ON FUNCTION app_private.refresh_tka_smp_drill_projection_after_attempt () FROM authenticated;
