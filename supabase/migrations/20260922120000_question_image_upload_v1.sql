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
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'question-images',
  'question-images',
  true,
  2097152,
  array['image/jpeg','image/png','image/webp','image/gif']::text[]
)
on conflict (id) do update set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Article writers can upload own article images" on storage.objects;
drop policy if exists question_images_content_upload on storage.objects;
drop policy if exists question_images_content_delete on storage.objects;

create policy question_images_content_upload
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'question-images'
  and (storage.foldername(name))[1] = 'questions'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and (
    app_private.current_user_has_permission('content.create')
    or app_private.current_user_has_permission('content.update')
    or app_private.current_user_has_permission('question.manage')
  )
);

-- Penulis boleh menghapus gambarnya sendiri (mis. salah upload).
create policy question_images_content_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'question-images'
  and (storage.foldername(name))[1] = 'questions'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and (
    app_private.current_user_has_permission('content.create')
    or app_private.current_user_has_permission('content.update')
    or app_private.current_user_has_permission('question.manage')
  )
);
