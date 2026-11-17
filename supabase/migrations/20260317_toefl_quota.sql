-- Add TOEFL quota column
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS tryout_quota_toefl int DEFAULT 0;

-- Function to safely increment TOEFL tryout quota
CREATE OR REPLACE FUNCTION increment_toefl_quota (user_id_param uuid, increment_by int)
  RETURNS void
  AS $$
BEGIN
  UPDATE
    profiles
  SET
    tryout_quota_toefl = COALESCE(tryout_quota_toefl, 0) + increment_by
  WHERE
    id = user_id_param;
END;
$$
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public;
