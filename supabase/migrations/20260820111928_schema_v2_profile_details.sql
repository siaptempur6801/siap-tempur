ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS education_level text,
  ADD COLUMN IF NOT EXISTS target_instance text;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_bio_length_check,
  ADD CONSTRAINT profiles_bio_length_check CHECK (bio IS NULL OR char_length(bio) <= 500),
  DROP CONSTRAINT IF EXISTS profiles_education_level_length_check,
  ADD CONSTRAINT profiles_education_level_length_check CHECK (education_level IS NULL OR char_length(education_level) <= 80),
  DROP CONSTRAINT IF EXISTS profiles_target_instance_length_check,
  ADD CONSTRAINT profiles_target_instance_length_check CHECK (target_instance IS NULL OR char_length(target_instance) <= 120);
