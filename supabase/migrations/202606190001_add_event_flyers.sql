-- Add optional flyer images for Tryout Akbar events.

alter table public.tryout_events
  add column if not exists flyer_image_url text;

comment on column public.tryout_events.flyer_image_url is 'Public URL for optional event flyer image shown on admin and user event pages.';

insert into storage.buckets (id, name, public)
values ('event-flyers', 'event-flyers', true)
on conflict (id) do update set public = true;

drop policy if exists "Event flyers are publicly readable" on storage.objects;
create policy "Event flyers are publicly readable"
  on storage.objects for select
  using (bucket_id = 'event-flyers');

drop policy if exists "Admins can upload event flyers" on storage.objects;
create policy "Admins can upload event flyers"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'event-flyers'
    and (select role from public.profiles where id = auth.uid()) = 'admin'
  );

drop policy if exists "Admins can update event flyers" on storage.objects;
create policy "Admins can update event flyers"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'event-flyers'
    and (select role from public.profiles where id = auth.uid()) = 'admin'
  )
  with check (
    bucket_id = 'event-flyers'
    and (select role from public.profiles where id = auth.uid()) = 'admin'
  );

drop policy if exists "Admins can delete event flyers" on storage.objects;
create policy "Admins can delete event flyers"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'event-flyers'
    and (select role from public.profiles where id = auth.uid()) = 'admin'
  );
