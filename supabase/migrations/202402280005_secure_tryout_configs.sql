-- ==========================================
-- Migration: Enable RLS for tryout_configurations
-- Description: Secures the table and allows read access
-- ==========================================
-- 1. Enable Row Level Security
ALTER TABLE tryout_configurations ENABLE ROW LEVEL SECURITY;

-- 2. Create Policy for Reading (Select)
-- Anyone (even anonymous or authenticated users) needs to be able to read
-- the configurations so the system knows how many questions to pick.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT
      1
    FROM
      pg_policies
    WHERE
      tablename = 'tryout_configurations'
      AND policyname = 'Anyone can read tryout configurations') THEN
  CREATE POLICY "Anyone can read tryout configurations" ON tryout_configurations
    FOR SELECT
    USING (TRUE );
END IF;
END
$$;

-- Note: Insert, Update, and Delete policies are NOT created.
-- This means by default, NO ONE (except superusers/service roles) can modify the data via API.
-- This is the desired behavior for configuration tables.
