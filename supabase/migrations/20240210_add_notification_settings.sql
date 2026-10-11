-- Add notification_settings column to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notification_settings jsonb DEFAULT '{
  "emailNotifications": true,
  "reminderNotifications": true,
  "achievementNotifications": true,
  "weeklyReport": false
}'::jsonb;
