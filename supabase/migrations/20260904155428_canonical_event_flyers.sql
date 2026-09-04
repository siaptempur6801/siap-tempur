alter table public.events
add column if not exists flyer_image_url text;

comment on column public.events.flyer_image_url is
  'Public URL for the event poster stored in the event-flyers bucket.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-flyers',
  'event-flyers',
  true,
  4194304,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists event_flyers_insert_manage on storage.objects;
create policy event_flyers_insert_manage
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'event-flyers'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (select app_private.current_user_has_permission('event.manage'))
);

drop policy if exists event_flyers_update_manage on storage.objects;
create policy event_flyers_update_manage
on storage.objects
for update
to authenticated
using (
  bucket_id = 'event-flyers'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (select app_private.current_user_has_permission('event.manage'))
)
with check (
  bucket_id = 'event-flyers'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (select app_private.current_user_has_permission('event.manage'))
);

drop policy if exists event_flyers_delete_manage on storage.objects;
create policy event_flyers_delete_manage
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'event-flyers'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (select app_private.current_user_has_permission('event.manage'))
);
