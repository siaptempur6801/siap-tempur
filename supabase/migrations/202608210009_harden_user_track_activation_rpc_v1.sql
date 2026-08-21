-- Milestone 2: least-privilege hardening for authenticated track activation.
-- The app_private implementation is callable only by database-owner/security-definer paths.
-- Learners use the public wrapper, which remains authenticated-only.

revoke all on function app_private.activate_user_track_for_user(uuid,text,text,integer,text,text) from public;
revoke all on function public.activate_user_track(text,text,integer,text,text) from public;
grant execute on function public.activate_user_track(text,text,integer,text,text) to authenticated;
