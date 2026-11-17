ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS flyer_image_url text;

COMMENT ON COLUMN public.events.flyer_image_url IS 'Public URL for the event poster stored in the event-flyers bucket.';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('event-flyers', 'event-flyers', TRUE, 4194304, ARRAY['image/jpeg', 'image/png', 'image/webp']::text[])
ON CONFLICT (id)
  DO UPDATE SET
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

DROP POLICY IF EXISTS event_flyers_insert_manage ON storage.objects;

CREATE POLICY event_flyers_insert_manage ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'event-flyers'
  AND (storage.foldername (name))[1] = (
    SELECT
      auth.uid ())::text
      AND (
        SELECT
          app_private.current_user_has_permission ('event.manage')));

DROP POLICY IF EXISTS event_flyers_update_manage ON storage.objects;

CREATE POLICY event_flyers_update_manage ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'event-flyers'
    AND (storage.foldername (name))[1] = (
      SELECT
        auth.uid ())::text
        AND (
          SELECT
            app_private.current_user_has_permission ('event.manage')))
  WITH CHECK (bucket_id = 'event-flyers'
  AND (storage.foldername (name))[1] = (
    SELECT
      auth.uid ())::text
      AND (
        SELECT
          app_private.current_user_has_permission ('event.manage')));

DROP POLICY IF EXISTS event_flyers_delete_manage ON storage.objects;

CREATE POLICY event_flyers_delete_manage ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'event-flyers'
    AND (storage.foldername (name))[1] = (
      SELECT
        auth.uid ())::text
        AND (
          SELECT
            app_private.current_user_has_permission ('event.manage')));
