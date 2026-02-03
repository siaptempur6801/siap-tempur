
-- Cleanup Unused Columns (2024-02-04)
-- Removing columns that were added but never implemented in the UI/Logic

ALTER TABLE profiles 
DROP COLUMN IF EXISTS education,
DROP COLUMN IF EXISTS target_score,
DROP COLUMN IF EXISTS study_hours_per_day,
DROP COLUMN IF EXISTS cpns_year,
DROP COLUMN IF EXISTS reminder_enabled,
DROP COLUMN IF EXISTS reminder_time,
DROP COLUMN IF EXISTS role,
DROP COLUMN IF EXISTS email,
DROP COLUMN IF EXISTS subscription_status;

ALTER TABLE questions
DROP COLUMN IF EXISTS difficulty;

DROP TABLE IF EXISTS materials;

-- Optional: Drop unused enums
-- DROP TYPE IF EXISTS subscription_status;
-- DROP TYPE IF EXISTS user_role;
