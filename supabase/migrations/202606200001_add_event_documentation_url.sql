-- Add optional public documentation URL for completed Tryout Akbar events.
ALTER TABLE public.tryout_events
  ADD COLUMN IF NOT EXISTS documentation_url text;

COMMENT ON COLUMN public.tryout_events.documentation_url IS TEXTVALUE0E;
