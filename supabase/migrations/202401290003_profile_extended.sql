-- Add new columns to profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS education text,
  ADD COLUMN IF NOT EXISTS target_score int DEFAULT 450,
  ADD COLUMN IF NOT EXISTS study_hours_per_day int DEFAULT 1,
  ADD COLUMN IF NOT EXISTS cpns_year int DEFAULT 2024,
  ADD COLUMN IF NOT EXISTS reminder_enabled boolean DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reminder_time time DEFAULT '19:00:00', -- Default 7 PM
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());

-- Create a view or function for user statistics might be useful later,
-- but we can compute it in the server component for now.
