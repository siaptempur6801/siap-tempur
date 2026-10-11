-- ==========================================
-- Migration: Add Admin RLS for tryout_configurations
-- Description: Allows admins to insert, update, delete
-- ==========================================
DO $$
BEGIN
  -- Policy for INSERT
  IF NOT EXISTS (
    SELECT
      1
    FROM
      pg_policies
    WHERE
      tablename = 'tryout_configurations'
      AND policyname = 'Admins can insert tryout configurations') THEN
  CREATE POLICY "Admins can insert tryout configurations" ON tryout_configurations
    FOR INSERT
    WITH CHECK ((
      SELECT
        ROLE
      FROM
        profiles
      WHERE
        id = auth.uid ( ) ) = 'admin' );
END IF;
  -- Policy for UPDATE
  IF NOT EXISTS (
    SELECT
      1
    FROM
      pg_policies
    WHERE
      tablename = 'tryout_configurations'
      AND policyname = 'Admins can update tryout configurations') THEN
  CREATE POLICY "Admins can update tryout configurations" ON tryout_configurations
    FOR UPDATE
    USING ((
      SELECT
        ROLE
      FROM
        profiles
      WHERE
        id = auth.uid ( ) ) = 'admin' );
END IF;
  -- Policy for DELETE
  IF NOT EXISTS (
    SELECT
      1
    FROM
      pg_policies
    WHERE
      tablename = 'tryout_configurations'
      AND policyname = 'Admins can delete tryout configurations') THEN
  CREATE POLICY "Admins can delete tryout configurations" ON tryout_configurations
    FOR DELETE
    USING ((
      SELECT
        ROLE
      FROM
        profiles
      WHERE
        id = auth.uid ( ) ) = 'admin' );
END IF;
END
$$;
