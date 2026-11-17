-- E-certificate support for completed Tryout Akbar events.
-- This migration is intentionally not applied by Codex.
ALTER TABLE public.tryout_events
  ADD COLUMN IF NOT EXISTS certificate_enabled boolean NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS certificate_released_at timestamptz;

COMMENT ON COLUMN public.tryout_events.certificate_enabled IS 'When true, completed participants can claim event certificates after ranking is final/released.';

COMMENT ON COLUMN public.tryout_events.certificate_released_at IS 'Timestamp when certificates are released for this event. Null means not released yet.';

CREATE TABLE IF NOT EXISTS public.event_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  event_id uuid NOT NULL REFERENCES public.tryout_events (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  certificate_number text NOT NULL UNIQUE,
  certificate_name text NOT NULL,
  certificate_kind text NOT NULL,
  rank integer,
  score integer,
  storage_path text,
  generated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users (id),
  updated_by uuid REFERENCES auth.users (id),
  CONSTRAINT event_certificates_kind_check CHECK (certificate_kind IN ('winner_1', 'winner_2', 'winner_3', 'participant')),
  CONSTRAINT event_certificates_rank_check CHECK ((certificate_kind = 'winner_1' AND rank = 1) OR (certificate_kind = 'winner_2' AND rank = 2) OR (certificate_kind = 'winner_3' AND rank = 3) OR (certificate_kind = 'participant' AND (rank IS NULL OR rank > 3))),
  CONSTRAINT event_certificates_name_check CHECK (char_length(trim(certificate_name)) BETWEEN 3 AND 100),
  UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS event_certificates_event_idx ON public.event_certificates (event_id, certificate_kind, rank);

CREATE INDEX IF NOT EXISTS event_certificates_user_idx ON public.event_certificates (user_id, created_at DESC);

ALTER TABLE public.event_certificates ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.event_certificates FROM anon, authenticated;

GRANT SELECT ON public.event_certificates TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.event_certificates TO service_role;

DROP POLICY IF EXISTS "Users can read own event certificates" ON public.event_certificates;

CREATE POLICY "Users can read own event certificates" ON public.event_certificates
  FOR SELECT TO authenticated
  USING (auth.uid () = user_id);

DROP POLICY IF EXISTS "Admins can read event certificates" ON public.event_certificates;

CREATE POLICY "Admins can read event certificates" ON public.event_certificates
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT
      1
    FROM
      public.profiles p
    WHERE
      p.id = auth.uid ()
      AND p.role IN ('admin', 'superadmin')));

INSERT INTO storage.buckets (id, name, public)
  VALUES ('event-certificates', 'event-certificates', FALSE)
ON CONFLICT (id)
  DO NOTHING;

DROP POLICY IF EXISTS "Users can read own event certificate files" ON storage.objects;

CREATE POLICY "Users can read own event certificate files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'event-certificates'
    AND (storage.foldername (name))[2] = auth.uid ()::text);

DROP POLICY IF EXISTS "Admins can manage event certificate files" ON storage.objects;

CREATE POLICY "Admins can manage event certificate files" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'event-certificates'
    AND EXISTS (
      SELECT
        1
      FROM
        public.profiles p
      WHERE
        p.id = auth.uid ()
        AND p.role IN ('admin', 'superadmin')))
  WITH CHECK (bucket_id = 'event-certificates'
  AND EXISTS (
    SELECT
      1
    FROM
      public.profiles p
    WHERE
      p.id = auth.uid ()
      AND p.role IN ('admin', 'superadmin')));
