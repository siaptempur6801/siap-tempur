-- Complete the Schema V2 event certificate model used by the application.
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS certificate_name text,
  ADD COLUMN IF NOT EXISTS certificate_kind text,
  ADD COLUMN IF NOT EXISTS rank integer,
  ADD COLUMN IF NOT EXISTS score numeric,
  ADD COLUMN IF NOT EXISTS name_locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE
  public.certificates c
SET
  certificate_name = coalesce(nullif (trim(p.full_name), ''), 'Nama Peserta'),
  certificate_kind = 'participant',
  name_locked_at = coalesce(c.name_locked_at, c.issued_at)
FROM
  public.profiles p
WHERE
  p.id = c.user_id
  AND (c.certificate_name IS NULL
    OR c.certificate_kind IS NULL);

UPDATE
  public.certificates
SET
  certificate_name = coalesce(certificate_name, 'Nama Peserta'),
  certificate_kind = coalesce(certificate_kind, 'participant'),
  name_locked_at = coalesce(name_locked_at, issued_at);

ALTER TABLE public.certificates
  ALTER COLUMN certificate_name SET NOT NULL,
  ALTER COLUMN certificate_kind SET NOT NULL;

ALTER TABLE public.certificates
  DROP CONSTRAINT IF EXISTS certificates_kind_check,
  ADD CONSTRAINT certificates_kind_check CHECK (certificate_kind IN ('winner_1', 'winner_2', 'winner_3', 'participant')),
  DROP CONSTRAINT IF EXISTS certificates_rank_check,
  ADD CONSTRAINT certificates_rank_check CHECK ((certificate_kind = 'winner_1' AND rank = 1) OR (certificate_kind = 'winner_2' AND rank = 2) OR (certificate_kind = 'winner_3' AND rank = 3) OR (certificate_kind = 'participant' AND (rank IS NULL OR rank > 3))),
  DROP CONSTRAINT IF EXISTS certificates_name_check,
  ADD CONSTRAINT certificates_name_check CHECK (char_length(trim(certificate_name)) BETWEEN 3 AND 100);

CREATE UNIQUE INDEX IF NOT EXISTS certificates_event_user_uq ON public.certificates (event_id, user_id);

INSERT INTO public.certificate_templates (name, template_url, config)
SELECT
  'Sertifikat Event Bawaan',
  'builtin:event-certificate-v1',
  '{"renderer":"event-certificate-v1"}'::jsonb
WHERE
  NOT EXISTS (
    SELECT
      1
    FROM
      public.certificate_templates
    WHERE
      template_url = 'builtin:event-certificate-v1');

INSERT INTO storage.buckets (id, name, public)
  VALUES ('event-certificates', 'event-certificates', FALSE)
ON CONFLICT (id)
  DO UPDATE SET
    public = FALSE;

DROP POLICY IF EXISTS "Users can read own event certificate files" ON storage.objects;

CREATE POLICY "Users can read own event certificate files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'event-certificates'
    AND (storage.foldername (name))[2] = (
      SELECT
        auth.uid ())::text);

DROP POLICY IF EXISTS "Admins can manage event certificate files" ON storage.objects;

CREATE POLICY "Admins can manage event certificate files" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'event-certificates'
    AND (
      SELECT
        app_private.has_permission ('admin.access')))
  WITH CHECK (bucket_id = 'event-certificates'
  AND (
    SELECT
      app_private.has_permission ('admin.access')));
