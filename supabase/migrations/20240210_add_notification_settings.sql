-- Add notification_settings column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{
  "emailNotifications": true,
  "reminderNotifications": true,
  "achievementNotifications": true,
  "weeklyReport": false
}'::jsonb;
