-- Add optional public documentation URL for completed Tryout Akbar events.

alter table public.tryout_events
  add column if not exists documentation_url text;

comment on column public.tryout_events.documentation_url is 'Optional public documentation URL, such as a YouTube replay, shown on landing page event history.';
