INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('article-images', 'article-images', TRUE, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[])
ON CONFLICT (id)
  DO UPDATE SET
    public = TRUE,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

DROP POLICY IF EXISTS articles_content_creator_upload ON storage.objects;

CREATE POLICY articles_content_creator_upload ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'article-images'
  AND (storage.foldername (name))[1] = 'articles'
  AND (storage.foldername (name))[2] = (
    SELECT
      auth.uid ())::text
      AND app_private.current_user_has_permission ('content.create'));
