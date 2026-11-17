-- Allow article writers to upload article images to their own storage folder.
INSERT INTO storage.buckets (id, name, public)
  VALUES ('question-images', 'question-images', TRUE)
ON CONFLICT (id)
  DO UPDATE SET
    public = TRUE;

DROP POLICY IF EXISTS "Article writers can upload own article images" ON storage.objects;

CREATE POLICY "Article writers can upload own article images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'question-images'
  AND (storage.foldername (name))[1] = 'articles'
  AND (storage.foldername (name))[2] = auth.uid ()::text
  AND (
    SELECT
      ROLE
    FROM
      public.profiles
    WHERE
      id = auth.uid ()) = 'article_writer');
