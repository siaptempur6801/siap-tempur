-- Remove redundant columns from profiles table that are not used in the application
alter table profiles
drop column if exists email,
drop column if exists role,
drop column if exists subscription_status,
drop column if exists notification_settings;
