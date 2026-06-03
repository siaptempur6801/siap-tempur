-- Add new columns to profiles table
alter table profiles 
add column if not exists education text,
add column if not exists target_score int default 450,
add column if not exists study_hours_per_day int default 1,
add column if not exists cpns_year int default 2024,
add column if not exists reminder_enabled boolean default false,
add column if not exists reminder_time time default '19:00:00', -- Default 7 PM
add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now());

-- Create a view or function for user statistics might be useful later, 
-- but we can compute it in the server component for now.
