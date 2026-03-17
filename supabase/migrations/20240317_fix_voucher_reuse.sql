-- ==========================================
-- Migration: Fix Voucher Reuse Bug
-- Description: 
--   Users could delete their account and re-register to re-claim the same voucher
--   because voucher_claims used ON DELETE CASCADE on the user_id FK.
--   Fix: store user_email permanently, change FK to SET NULL, check by email in RPC.
-- ==========================================

-- 1. Add user_email column to voucher_claims
ALTER TABLE voucher_claims 
ADD COLUMN IF NOT EXISTS user_email text;

-- 2. Backfill existing records with email from auth.users
UPDATE voucher_claims vc
SET user_email = au.email
FROM auth.users au
WHERE vc.user_id = au.id
AND vc.user_email IS NULL;

-- 3. Drop the old NOT NULL + CASCADE FK on user_id
ALTER TABLE voucher_claims
DROP CONSTRAINT IF EXISTS voucher_claims_user_id_fkey;

-- 4. Re-add as nullable + SET NULL (so the claim record survives account deletion)
ALTER TABLE voucher_claims
ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE voucher_claims
ADD CONSTRAINT voucher_claims_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- 5. Add index on user_email for fast duplicate checks
CREATE INDEX IF NOT EXISTS idx_voucher_claims_user_email 
ON voucher_claims(user_email);

-- 6. Update the claim_voucher RPC to check by email AND user_id
CREATE OR REPLACE FUNCTION claim_voucher(
  p_user_id uuid,
  p_voucher_code text,
  p_user_email text DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
  v_voucher_id uuid;
  v_quota_amount int;
  v_max_uses int;
  v_used_count int;
  v_expires_at timestamp with time zone;
  v_is_active boolean;
  v_has_claimed boolean;
  v_resolved_email text;
BEGIN
  -- Validate inputs
  IF p_user_id IS NULL OR p_voucher_code IS NULL OR p_voucher_code = '' THEN
    RAISE EXCEPTION 'User ID dan Kode Voucher tidak boleh kosong';
  END IF;

  -- Resolve the email: prefer passed param, fallback to auth.users lookup
  IF p_user_email IS NOT NULL AND p_user_email <> '' THEN
    v_resolved_email := lower(trim(p_user_email));
  ELSE
    SELECT lower(trim(email)) INTO v_resolved_email
    FROM auth.users
    WHERE id = p_user_id;
  END IF;

  -- 1. Check if voucher exists and get its details
  SELECT id, quota_amount, max_uses, used_count, expires_at, is_active
  INTO v_voucher_id, v_quota_amount, v_max_uses, v_used_count, v_expires_at, v_is_active
  FROM vouchers
  WHERE code = p_voucher_code
  FOR UPDATE; -- Lock the row to prevent race conditions

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Kode voucher tidak valid atau tidak ditemukan';
  END IF;

  -- 2. Validate Voucher Status
  IF NOT v_is_active THEN
    RAISE EXCEPTION 'Kode voucher ini sudah tidak aktif';
  END IF;

  IF v_expires_at IS NOT NULL AND v_expires_at < NOW() THEN
    RAISE EXCEPTION 'Kode voucher ini sudah kadaluarsa';
  END IF;

  IF v_used_count >= v_max_uses THEN
    RAISE EXCEPTION 'Kuota untuk kode voucher ini sudah habis digunakan';
  END IF;

  -- 3. Check by user_id (current session)
  SELECT EXISTS (
    SELECT 1 FROM voucher_claims
    WHERE voucher_id = v_voucher_id AND user_id = p_user_id
  ) INTO v_has_claimed;

  IF v_has_claimed THEN
    RAISE EXCEPTION 'Anda sudah pernah mengklaim kode voucher ini sebelumnya';
  END IF;

  -- 4. Also check by email (catches account-delete & re-register abuse)
  IF v_resolved_email IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM voucher_claims
      WHERE voucher_id = v_voucher_id
        AND lower(trim(user_email)) = v_resolved_email
    ) INTO v_has_claimed;

    IF v_has_claimed THEN
      RAISE EXCEPTION 'Email ini sudah pernah mengklaim kode voucher ini. Voucher hanya dapat diklaim satu kali per pengguna';
    END IF;
  END IF;

  -- 5. All checks passed, process the claim
  INSERT INTO voucher_claims (voucher_id, user_id, user_email)
  VALUES (v_voucher_id, p_user_id, v_resolved_email);

  -- Increment use count on voucher
  UPDATE vouchers
  SET used_count = used_count + 1,
      updated_at = NOW()
  WHERE id = v_voucher_id;

  -- Add quota to user's profile
  UPDATE profiles
  SET tryout_quota = COALESCE(tryout_quota, 0) + v_quota_amount
  WHERE id = p_user_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
