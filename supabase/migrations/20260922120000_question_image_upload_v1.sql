-- Upload gambar soal & opsi ke bucket `question-images`.
--
-- MASALAH
--   Policy lama (`Article writers can upload own article images`) memeriksa kolom
--   `profiles.role` yang sudah dihapus di Schema V2 dan hanya mengizinkan folder
--   `articles/`, sehingga tidak ada satu pun jalur upload gambar soal yang sah.
--
-- ATURAN BARU
--   Pemegang permission konten boleh upload/hapus berkas di folder miliknya
--   sendiri: `questions/<uid>/<nama>`. Bucket tetap publik untuk dibaca.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('question-images', 'question-images', TRUE, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[])
ON CONFLICT (id)
  DO UPDATE SET
    public = TRUE,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

DROP POLICY IF EXISTS "Article writers can upload own article images" ON storage.objects;

DROP POLICY IF EXISTS question_images_content_upload ON storage.objects;

DROP POLICY IF EXISTS question_images_content_delete ON storage.objects;

CREATE POLICY question_images_content_upload ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'question-images'
  AND (storage.foldername (name))[1] = 'questions'
  AND (storage.foldername (name))[2] = (
    SELECT
      auth.uid ())::text
      AND (app_private.current_user_has_permission ('content.create')
      OR app_private.current_user_has_permission ('content.update')
      OR app_private.current_user_has_permission ('question.manage')));

-- Penulis boleh menghapus gambarnya sendiri (mis. salah upload).
CREATE POLICY question_images_content_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'question-images'
    AND (storage.foldername (name))[1] = 'questions'
    AND (storage.foldername (name))[2] = (
      SELECT
        auth.uid ())::text
        AND (app_private.current_user_has_permission ('content.create')
        OR app_private.current_user_has_permission ('content.update')
        OR app_private.current_user_has_permission ('question.manage')));
