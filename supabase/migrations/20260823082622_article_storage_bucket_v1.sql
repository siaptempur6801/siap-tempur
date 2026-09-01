insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'article-images',
  'article-images',
  true,
  2097152,
  array['image/jpeg','image/png','image/webp','image/gif']::text[]
)
on conflict (id) do update set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists articles_content_creator_upload on storage.objects;
create policy articles_content_creator_upload
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'article-images'
  and (storage.foldername(name))[1] = 'articles'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and app_private.current_user_has_permission('content.create')
);
