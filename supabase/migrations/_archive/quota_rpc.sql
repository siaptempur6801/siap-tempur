-- Archived on 2026-04-09.
-- Reason: ad-hoc non-timestamped script; functionality is already covered by schema.sql
-- and active timestamped migrations.
-- 1. Function to safely increment tryout quota
CREATE OR REPLACE FUNCTION increment_tryout_quota (user_id_param uuid, increment_by int)
  RETURNS void
  AS $$
BEGIN
  UPDATE
    profiles
  SET
    tryout_quota = coalesce(tryout_quota, 0) + increment_by
  WHERE
    id = user_id_param;
END;
$$
LANGUAGE plpgsql
SECURITY DEFINER;

-- 2. Add 'capture' to transaction_status enum (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT
      1
    FROM
      pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE
      t.typname = 'transaction_status'
      AND e.enumlabel = 'capture') THEN
  ALTER TYPE transaction_status
    ADD value 'capture';
END IF;
END
$$;

-- 3. Add Insert Policy for transactions (for authenticated users)
CREATE POLICY "Users can insert own transactions" ON transactions
  FOR INSERT
  WITH CHECK (auth.uid () = user_id);
