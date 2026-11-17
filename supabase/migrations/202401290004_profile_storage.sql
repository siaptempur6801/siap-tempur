-- Create a storage bucket for avatars
-- Note: Supabase storage creation is usually done via API/UI or specific storage.buckets inserts if allowed.
-- This script assumes the 'avatars' bucket will be created via UI or client logic if not exists,
-- but let's try to set up policies assuming the bucket 'avatars' exists.
INSERT INTO storage.buckets (id, name, public)
  VALUES ('avatars', 'avatars', TRUE)
ON CONFLICT (id)
  DO NOTHING;

-- Policy to allow authenticated uploads to 'avatars'
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Anyone can upload an avatar" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Anyone can update their own avatar" ON storage.objects
  FOR UPDATE
  USING (auth.uid () = OWNER)
  WITH CHECK (bucket_id = 'avatars');

-- Update profiles table to include avatar_url if not exists (it might be missing)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS avatar_url text;
