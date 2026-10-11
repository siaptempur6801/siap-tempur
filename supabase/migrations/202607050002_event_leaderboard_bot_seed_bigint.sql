-- Allow unsigned 32-bit deterministic bot seeds.
ALTER TABLE public.tryout_event_bot_entries
  ALTER COLUMN seed TYPE bigint;
