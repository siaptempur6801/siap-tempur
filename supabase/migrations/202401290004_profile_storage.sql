-- Create a storage bucket for avatars
-- Note: Supabase storage creation is usually done via API/UI or specific storage.buckets inserts if allowed.
-- This script assumes the 'avatars' bucket will be created via UI or client logic if not exists, 
-- but let's try to set up policies assuming the bucket 'avatars' exists.

insert into storage.buckets (id, name, public) 
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Policy to allow authenticated uploads to 'avatars'
create policy "Avatar images are publicly accessible"
  on storage.objects for select
  using ( bucket_id = 'avatars' );

create policy "Anyone can upload an avatar"
  on storage.objects for insert
  with check ( bucket_id = 'avatars' );

create policy "Anyone can update their own avatar"
  on storage.objects for update
  using ( auth.uid() = owner )
  with check ( bucket_id = 'avatars' );

-- Update profiles table to include avatar_url if not exists (it might be missing)
alter table profiles add column if not exists avatar_url text;
