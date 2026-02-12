-- Drop notification_settings column from profiles table
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS notification_settings;
