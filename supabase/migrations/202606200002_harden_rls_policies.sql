-- Phase 1 Security Hardening: RLS Policies
-- 1. Restrict options table to prevent leakage of is_correct and score_value
-- The public read policy is replaced with one that only allows admins and superadmins.
-- Normal users fetch exam options via the start_tryout_session RPC (which is SECURITY DEFINER).
DROP POLICY IF EXISTS "Public read options" ON options;

CREATE POLICY "Admin read options" ON options
  FOR SELECT
  USING ((
    SELECT
      ROLE
    FROM
      profiles
    WHERE
      id = (
        SELECT
          auth.uid ())) IN ('admin', 'superadmin'));

-- 2. Restrict questions table to prevent leakage of explanations
-- The public read policy is replaced with one that only allows admins and superadmins.
-- Normal users fetch exam questions via the start_tryout_session RPC (which is SECURITY DEFINER).
DROP POLICY IF EXISTS "Public read questions" ON questions;

CREATE POLICY "Admin read questions" ON questions
  FOR SELECT
  USING ((
    SELECT
      ROLE
    FROM
      profiles
    WHERE
      id = (
        SELECT
          auth.uid ())) IN ('admin', 'superadmin'));

-- 3. Fix tryout_configurations to include superadmin
DROP POLICY IF EXISTS "Admins can insert tryout configurations" ON tryout_configurations;

CREATE POLICY "Admins can insert tryout configurations" ON tryout_configurations
  FOR INSERT
  WITH CHECK ((
    SELECT
      ROLE
    FROM
      profiles
    WHERE
      id = (
        SELECT
          auth.uid ())) IN ('admin', 'superadmin'));

DROP POLICY IF EXISTS "Admins can update tryout configurations" ON tryout_configurations;

CREATE POLICY "Admins can update tryout configurations" ON tryout_configurations
  FOR UPDATE
  USING ((
    SELECT
      ROLE
    FROM
      profiles
    WHERE
      id = (
        SELECT
          auth.uid ())) IN ('admin', 'superadmin'));

DROP POLICY IF EXISTS "Admins can delete tryout configurations" ON tryout_configurations;

CREATE POLICY "Admins can delete tryout configurations" ON tryout_configurations
  FOR DELETE
  USING ((
    SELECT
      ROLE
    FROM
      profiles
    WHERE
      id = (
        SELECT
          auth.uid ())) IN ('admin', 'superadmin'));

-- 4. Fix storage bucket policies to include superadmin
DROP POLICY IF EXISTS "Admin upload access" ON storage.objects;

CREATE POLICY "Admin upload access" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'question-images'
  AND (
    SELECT
      ROLE
    FROM
      profiles
    WHERE
      id = auth.uid ()) IN ('admin', 'superadmin'));

DROP POLICY IF EXISTS "Admin update access" ON storage.objects;

CREATE POLICY "Admin update access" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'question-images'
    AND (
      SELECT
        ROLE
      FROM
        profiles
      WHERE
        id = auth.uid ()) IN ('admin', 'superadmin'));

DROP POLICY IF EXISTS "Admin delete access" ON storage.objects;

CREATE POLICY "Admin delete access" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'question-images'
    AND (
      SELECT
        ROLE
      FROM
        profiles
      WHERE
        id = auth.uid ()) IN ('admin', 'superadmin'));

-- 5. Fix avatars upload policy so anyone can't upload to any path
DROP POLICY IF EXISTS "Anyone can upload an avatar" ON storage.objects;

CREATE POLICY "Authenticated users can upload own avatar" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars'
  AND (storage.foldername (name))[1] = auth.uid ()::text);
