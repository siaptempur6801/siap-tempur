-- Add optional flyer images for Tryout Akbar events.
ALTER TABLE public.tryout_events
  ADD COLUMN IF NOT EXISTS flyer_image_url text;

COMMENT ON COLUMN public.tryout_events.flyer_image_url IS TEXTVALUE0E; INSERT INTO storage.buckets (id, name, public)
  VALUES ('event-flyers', 'event-flyers', TRUE)
ON CONFLICT (id)
  DO UPDATE SET
    public = TRUE;

DROP POLICY IF EXISTS "Event flyers are publicly readable" ON storage.objects;

CREATE POLICY "Event flyers are publicly readable" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'event-flyers');

DROP POLICY IF EXISTS "Admins can upload event flyers" ON storage.objects;

CREATE POLICY "Admins can upload event flyers" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'event-flyers'
  AND (
    SELECT
      ROLE
    FROM
      public.profiles
    WHERE
      id = auth.uid ()) = 'admin');

DROP POLICY IF EXISTS "Admins can update event flyers" ON storage.objects;

CREATE POLICY "Admins can update event flyers" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'event-flyers'
    AND (
      SELECT
        ROLE
      FROM
        public.profiles
      WHERE
        id = auth.uid ()) = 'admin')
  WITH CHECK (bucket_id = 'event-flyers'
  AND (
    SELECT
      ROLE
    FROM
      public.profiles
    WHERE
      id = auth.uid ()) = 'admin');

DROP POLICY IF EXISTS "Admins can delete event flyers" ON storage.objects;

CREATE POLICY "Admins can delete event flyers" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'event-flyers'
    AND (
      SELECT
        ROLE
      FROM
        public.profiles
      WHERE
        id = auth.uid ()) = 'admin');
