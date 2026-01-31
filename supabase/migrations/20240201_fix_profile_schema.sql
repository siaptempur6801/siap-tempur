-- Add missing columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS last_activity_date date,
ADD COLUMN IF NOT EXISTS streak_count int default 0;
