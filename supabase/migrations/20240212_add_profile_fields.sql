-- Add personal data fields to profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS phone_number text,
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS gender text CHECK (gender IN ('Laki-laki', 'Perempuan')),
  ADD COLUMN IF NOT EXISTS education_level text,
  ADD COLUMN IF NOT EXISTS target_instance text;
