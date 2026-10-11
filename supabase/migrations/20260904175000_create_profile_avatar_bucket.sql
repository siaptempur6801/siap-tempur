INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('avatars', 'avatars', TRUE, 1048576, ARRAY['image/jpeg']::text[])
ON CONFLICT (id)
  DO UPDATE SET
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

DROP POLICY IF EXISTS avatars_insert_own_folder ON storage.objects;

CREATE POLICY avatars_insert_own_folder ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars'
  AND (storage.foldername (name))[1] = (
    SELECT
      auth.uid ())::text
      AND lower(storage.extension (name)) = 'jpg');
