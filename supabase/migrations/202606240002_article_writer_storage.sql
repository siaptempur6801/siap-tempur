-- Allow article writers to upload article images to their own storage folder.

insert into storage.buckets (id, name, public)
values ('question-images', 'question-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Article writers can upload own article images" on storage.objects;
create policy "Article writers can upload own article images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'question-images'
    and (storage.foldername(name))[1] = 'articles'
    and (storage.foldername(name))[2] = auth.uid()::text
    and (select role from public.profiles where id = auth.uid()) = 'article_writer'
  );

