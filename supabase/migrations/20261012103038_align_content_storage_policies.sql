-- Restore the canonical article bucket and creator upload policy.
-- Remove obsolete Storage policies tied to legacy_prod profiles or looser
-- avatar writes; current owner-folder and permission policies remain in place.
-- Public image delivery uses existing public buckets and getPublicUrl().
-- This migration never deletes stored objects or copies production data.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
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
DROP POLICY IF EXISTS "Admin delete access" ON storage.objects;
DROP POLICY IF EXISTS "Admin update access" ON storage.objects;
DROP POLICY IF EXISTS "Admin upload access" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public read open to all" ON storage.objects;
DROP POLICY IF EXISTS event_flyers_public_read ON storage.objects;
COMMIT;
