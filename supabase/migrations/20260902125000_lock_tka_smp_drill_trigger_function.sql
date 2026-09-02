-- Keep the TKA SMP drill projection trigger internal-only.
-- SECURITY DEFINER functions inherit EXECUTE for PUBLIC unless explicitly revoked.
revoke execute on function app_private.refresh_tka_smp_drill_projection_after_attempt() from public;
revoke execute on function app_private.refresh_tka_smp_drill_projection_after_attempt() from anon;
revoke execute on function app_private.refresh_tka_smp_drill_projection_after_attempt() from authenticated;
