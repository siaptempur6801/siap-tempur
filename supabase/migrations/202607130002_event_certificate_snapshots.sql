-- Harden event certificate release snapshots.
-- Apply manually after reviewing existing production data.
ALTER TABLE public.event_certificates
  ADD COLUMN IF NOT EXISTS name_locked_at timestamptz;

UPDATE
  public.event_certificates
SET
  name_locked_at = coalesce(generated_at, created_at)
WHERE
  name_locked_at IS NULL
  AND generated_at IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS event_certificates_winner_rank_unique_idx ON public.event_certificates (event_id, rank)
WHERE
  certificate_kind IN ('winner_1', 'winner_2', 'winner_3');

CREATE INDEX IF NOT EXISTS event_certificates_unlocked_idx ON public.event_certificates (event_id, user_id)
WHERE
  name_locked_at IS NULL;
