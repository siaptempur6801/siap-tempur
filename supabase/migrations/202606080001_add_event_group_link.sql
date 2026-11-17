-- Adds an optional invite/group link for Tryout Akbar events.
-- The application only exposes this link to users with a participant record.
ALTER TABLE public.tryout_events
  ADD COLUMN IF NOT EXISTS group_link text;

COMMENT ON COLUMN public.tryout_events.group_link IS TEXTVALUE0E;
