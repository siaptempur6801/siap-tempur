-- Allow unsigned 32-bit deterministic bot seeds.

alter table public.tryout_event_bot_entries
  alter column seed type bigint;
