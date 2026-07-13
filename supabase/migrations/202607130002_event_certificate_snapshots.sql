-- Harden event certificate release snapshots.
-- Apply manually after reviewing existing production data.

alter table public.event_certificates
  add column if not exists name_locked_at timestamptz;

update public.event_certificates
set name_locked_at = coalesce(generated_at, created_at)
where name_locked_at is null
  and generated_at is not null;

create unique index if not exists event_certificates_winner_rank_unique_idx
  on public.event_certificates(event_id, rank)
  where certificate_kind in ('winner_1', 'winner_2', 'winner_3');

create index if not exists event_certificates_unlocked_idx
  on public.event_certificates(event_id, user_id)
  where name_locked_at is null;
