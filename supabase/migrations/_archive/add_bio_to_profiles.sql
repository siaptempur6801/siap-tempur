-- Archived on 2026-04-09.
-- Reason: ad-hoc non-timestamped script; profiles.bio is already covered by schema.sql.
-- Add bio column to profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS bio text;

-- Add comment
COMMENT ON COLUMN profiles.bio IS TEXTVALUE0E;
