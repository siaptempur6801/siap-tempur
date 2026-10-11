-- Remove redundant columns from profiles table that are not used in the application
ALTER TABLE profiles
  DROP COLUMN IF EXISTS email,
  DROP COLUMN IF EXISTS ROLE,
  DROP COLUMN IF EXISTS subscription_status,
  DROP COLUMN IF EXISTS notification_settings;
