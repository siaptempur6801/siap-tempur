-- ==========================================
-- Migration: Add Voucher System
-- Description: Creates vouchers, voucher_claims tables and claim_voucher RPC
-- ==========================================
-- 1. Create vouchers table
CREATE TABLE IF NOT EXISTS vouchers (
  id uuid DEFAULT uuid_generate_v4 () PRIMARY KEY,
  code text UNIQUE NOT NULL,
  quota_amount int NOT NULL CHECK (quota_amount > 0),
  max_uses int DEFAULT 1 CHECK (max_uses > 0),
  used_count int DEFAULT 0,
  expires_at timestamp with time zone,
  is_active boolean DEFAULT TRUE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 2. Create voucher_claims table (to track who claimed what)
CREATE TABLE IF NOT EXISTS voucher_claims (
  id uuid DEFAULT uuid_generate_v4 () PRIMARY KEY,
  voucher_id uuid REFERENCES vouchers (id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles (id) ON DELETE CASCADE NOT NULL,
  claimed_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  -- Ensure a user can only claim a specific voucher once
  UNIQUE (voucher_id, user_id)
);

-- 3. Enable RLS
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;

ALTER TABLE voucher_claims ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Anyone authenticated can read active vouchers (needed to verify them)
CREATE POLICY "Authenticated users can read vouchers" ON vouchers
  FOR SELECT TO authenticated
  USING (TRUE);

-- Users can only read their own claims
CREATE POLICY "Users can read own voucher claims" ON voucher_claims
  FOR SELECT TO authenticated
  USING (auth.uid () = user_id);

-- 5. RPC Function to Claim Voucher securely
CREATE OR REPLACE FUNCTION claim_voucher (p_user_id uuid, p_voucher_code text)
  RETURNS boolean
  AS $$
DECLARE
  v_voucher_id uuid;
  v_quota_amount int;
  v_max_uses int;
  v_used_count int;
  v_expires_at timestamp with time zone;
  v_is_active boolean;
  v_has_claimed boolean;
BEGIN
  -- Validate inputs
  IF p_user_id IS NULL OR p_voucher_code IS NULL OR p_voucher_code = '' THEN
    RAISE EXCEPTION 'User ID dan Kode Voucher tidak boleh kosong';
  END IF;
  -- 1. Check if voucher exists and get its details
  SELECT
    id,
    quota_amount,
    max_uses,
    used_count,
    expires_at,
    is_active
  INTO
    v_voucher_id,
    v_quota_amount,
    v_max_uses,
    v_used_count,
    v_expires_at,
    v_is_active
  FROM
    vouchers
  WHERE
    code = p_voucher_code
  FOR UPDATE;
  -- Lock the row to prevent race conditions
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
  -- 3. Check if user already claimed this voucher
  SELECT
    EXISTS (
      SELECT
        1
      FROM
        voucher_claims
      WHERE
        voucher_id = v_voucher_id
        AND user_id = p_user_id)
  INTO
    v_has_claimed;

  IF v_has_claimed THEN
    RAISE EXCEPTION 'Anda sudah pernah mengklaim kode voucher ini sebelumnya';
  END IF;
  -- 4. All checks passed, process the claim
  -- Record the claim
  INSERT INTO voucher_claims (voucher_id, user_id)
    VALUES (v_voucher_id, p_user_id);
  -- Increment use count on voucher
  UPDATE
    vouchers
  SET
    used_count = used_count + 1,
    updated_at = NOW()
  WHERE
    id = v_voucher_id;
  -- Add quota to user's profile
  -- Using existing tryout_quota as the SKD quota field
  UPDATE
    profiles
  SET
    tryout_quota = COALESCE(tryout_quota, 0) + v_quota_amount
  WHERE
    id = p_user_id;

  RETURN TRUE;
END;
$$
LANGUAGE plpgsql
SECURITY DEFINER;
