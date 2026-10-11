-- RLS decides which row a user owns; column grants limit which profile fields
-- that owner may change through the Data API.
GRANT UPDATE (full_name, bio, phone, birth_date, gender, education_level, target_instance, avatar_url, updated_at) ON TABLE public.profiles TO authenticated;
