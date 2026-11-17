-- Milestone 2: least-privilege hardening for authenticated track activation.
-- The app_private implementation is callable only by database-owner/security-definer paths.
-- Learners use the public wrapper, which remains authenticated-only.
REVOKE ALL ON FUNCTION app_private.activate_user_track_for_user (uuid, text, text, integer, text, text) FROM public;

REVOKE ALL ON FUNCTION public.activate_user_track (text, text, integer, text, text) FROM public;

GRANT EXECUTE ON FUNCTION public.activate_user_track (text, text, integer, text, text) TO authenticated;
