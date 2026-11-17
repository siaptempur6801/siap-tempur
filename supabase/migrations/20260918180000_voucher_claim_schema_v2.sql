-- =============================================================================
-- Voucher: hidupkan kembali klaim voucher di Schema V2
--
-- LATAR
--   Fitur voucher dimatikan saat cutover Schema V2 tanpa penggantinya:
--   `claimVoucherCode()` di `app/actions/profile.ts` menjadi stub yang SELALU
--   gagal ("Voucher sedang dimigrasikan ke Promotions Schema V2..."), sementara
--   formnya masih tampil di halaman profil. Artinya pengguna melihat form yang
--   tidak mungkin berhasil.
--
--   Data lamanya utuh di `legacy_prod`: 6 voucher dan 310 klaim nyata
--   (PENGGUNABARU 122, SMAN2TANJUNGBALAI 143, GRATISDARIBAYU 38, dst).
--   Semua user pemilik klaim masih ada di `public.profiles` (0 hilang), dan
--   tidak ada pasangan voucher+user maupun voucher+email yang duplikat.
--
-- PERBEDAAN PENTING DARI SISTEM LAMA
--   1. Token TIDAK LAGI satu kolam. Schema V2 memisahkan saldo per program
--      (`programs.token_wallet_type`: `exam_token_cpns`, `exam_token_tka`).
--      Karena itu voucher kini menentukan wallet mana yang boleh diklaim.
--      Voucher lama diberi `wallet_type = null` yang berarti "keduanya boleh" —
--      persis perilaku lama, di mana token masuk ke kolam tunggal.
--
--   2. Kredit masuk ke `wallets.balance` + satu baris `wallet_transactions`
--      (pola yang sudah dipakai `debit_exam_token_once`), bukan lagi kolom
--      `profiles.tryout_quota` yang sudah tidak ada di Schema V2.
--
--   3. Idempoten. Sistem lama melempar error bila voucher yang sama diklaim dua
--      kali; sekarang klaim ulang mengembalikan `already_claimed = true` TANPA
--      menambah token lagi. Alasannya: pengguna yang jaringan-nya terputus tepat
--      setelah klaim berhasil akan mencoba lagi, dan tanpa idempotensi mereka
--      melihat "gagal" padahal tokennya sudah masuk. Pesan error lama tetap
--      disampaikan UI lewat flag ini.
--
-- KEAMANAN
--   - SECURITY DEFINER + `search_path = ''` (seluruh nama di-schema-qualify).
--   - Pemanggil hanya boleh mengklaim untuk dirinya sendiri: `auth.uid()` harus
--     sama dengan `p_user_id`, kecuali `service_role`.
--   - `voucher_claims.user_id` NOT NULL, dan RLS hanya mengizinkan pemilik
--     membaca klaimnya sendiri. `vouchers` TIDAK dapat dibaca klien sama sekali
--     (hanya lewat RPC) supaya daftar kode tidak bocor.
--   - Voucher dikunci (`for update`) selama klaim sehingga dua permintaan
--     bersamaan tidak bisa melampaui `max_uses`.
--
-- IDEMPOTEN (migration)
--   `create table if not exists`, `add column if not exists`, dan seed dengan
--   `on conflict ... do nothing`.
-- =============================================================================
-- -----------------------------------------------------------------------------
-- 1. Tabel
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  code text NOT NULL UNIQUE,
  quota_amount integer NOT NULL DEFAULT 1,
  max_uses integer,
  used_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT TRUE,
  -- null = boleh diklaim untuk wallet program mana pun (perilaku voucher lama).
  wallet_type text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz,
  CONSTRAINT vouchers_quota_positive CHECK (quota_amount > 0),
  CONSTRAINT vouchers_max_uses_positive CHECK (max_uses IS NULL OR max_uses > 0),
  CONSTRAINT vouchers_used_non_negative CHECK (used_count >= 0),
  CONSTRAINT vouchers_wallet_type_check CHECK (wallet_type IS NULL OR wallet_type IN ('exam_token_cpns', 'exam_token_tka'))
);

CREATE TABLE IF NOT EXISTS public.voucher_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  voucher_id uuid NOT NULL REFERENCES public.vouchers (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  user_email text,
  claimed_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS voucher_claims_voucher_user_uq ON public.voucher_claims (voucher_id, user_id);

CREATE INDEX IF NOT EXISTS voucher_claims_user_idx ON public.voucher_claims (user_id);

-- Dedup per email: satu email hanya boleh mengklaim satu voucher satu kali.
CREATE UNIQUE INDEX IF NOT EXISTS voucher_claims_voucher_email_uq ON public.voucher_claims (voucher_id, lower(trim(user_email)))
WHERE
  user_email IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 2. RLS
--    Klien hanya boleh MELIHAT klaimnya sendiri. Tidak ada policy INSERT/UPDATE/
--    DELETE: satu-satunya jalur tulis adalah RPC di bawah.
-- -----------------------------------------------------------------------------
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.voucher_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS voucher_claims_select_own ON public.voucher_claims;

CREATE POLICY voucher_claims_select_own ON public.voucher_claims
  FOR SELECT TO authenticated
  USING (user_id = (
    SELECT
      auth.uid ()));

-- `vouchers` sengaja TANPA policy: daftar kode voucher tidak boleh terbaca klien.
REVOKE ALL ON public.vouchers FROM anon, authenticated;

REVOKE ALL ON public.voucher_claims FROM anon;

GRANT SELECT ON public.voucher_claims TO authenticated;

-- -----------------------------------------------------------------------------
-- 3. RPC klaim voucher
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_voucher (p_user_id uuid, p_voucher_code text, p_wallet_type text)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $$
DECLARE
  v_voucher_id uuid;
  v_quota integer;
  v_max_uses integer;
  v_used_count integer;
  v_expires_at timestamptz;
  v_is_active boolean;
  v_voucher_wallet text;
  v_email text;
  v_wallet_id uuid;
  v_balance integer;
  v_new_balance integer;
BEGIN
  -- 3a. Otorisasi: hanya untuk diri sendiri, kecuali service_role.
  IF coalesce(auth.role (), '') <> 'service_role' AND p_user_id IS DISTINCT FROM auth.uid () THEN
    RAISE EXCEPTION 'Not authorized'
      USING errcode = 'P0001';
  END IF;

  IF p_user_id IS NULL OR p_voucher_code IS NULL OR btrim(p_voucher_code) = '' THEN
    RAISE EXCEPTION 'User ID dan Kode Voucher tidak boleh kosong'
      USING errcode = 'P0001';
  END IF;

  IF p_wallet_type IS NULL OR p_wallet_type NOT IN ('exam_token_cpns', 'exam_token_tka') THEN
    RAISE EXCEPTION 'WALLET_TYPE_INVALID'
      USING errcode = 'P0001';
  END IF;
  -- 3b. Kunci voucher supaya kuota tidak bisa dilampaui oleh klaim bersamaan.
  SELECT
    id,
    quota_amount,
    max_uses,
    used_count,
    expires_at,
    is_active,
    wallet_type
  INTO
    v_voucher_id,
    v_quota,
    v_max_uses,
    v_used_count,
    v_expires_at,
    v_is_active,
    v_voucher_wallet
  FROM
    public.vouchers
  WHERE
    code = upper(btrim(p_voucher_code))
  FOR UPDATE;

  IF NOT found THEN
    RAISE EXCEPTION 'Kode voucher tidak valid atau tidak ditemukan'
      USING errcode = 'P0001';
  END IF;
  -- 3c. Voucher boleh dibatasi ke satu program.
  IF v_voucher_wallet IS NOT NULL AND v_voucher_wallet <> p_wallet_type THEN
    RAISE EXCEPTION 'Voucher ini tidak berlaku untuk program tersebut'
      USING errcode = 'P0001';
  END IF;
  -- 3d. Idempotensi diperiksa SEBELUM validasi aktif/kadaluarsa/kuota, supaya
  --     pengguna yang sudah pernah klaim tidak melihat error menyesatkan
  --     ketika vouchernya kebetulan sudah tidak aktif atau kuotanya habis.
  IF EXISTS (
    SELECT
      1
    FROM
      public.voucher_claims
    WHERE
      voucher_id = v_voucher_id
      AND user_id = p_user_id) THEN
  SELECT
    balance
  INTO
    v_balance
  FROM
    public.wallets
  WHERE
    user_id = p_user_id
    AND wallet_type = p_wallet_type;

  RETURN jsonb_build_object('claimed', TRUE, 'already_claimed', TRUE, 'amount', 0, 'balance', coalesce(v_balance, 0), 'message', 'Anda sudah pernah mengklaim kode voucher ini sebelumnya');
END IF;

  IF NOT v_is_active THEN
    RAISE EXCEPTION 'Kode voucher ini sudah tidak aktif'
      USING errcode = 'P0001';
  END IF;

  IF v_expires_at IS NOT NULL AND v_expires_at < now() THEN
    RAISE EXCEPTION 'Kode voucher ini sudah kadaluarsa'
      USING errcode = 'P0001';
  END IF;

  IF v_max_uses IS NOT NULL AND v_used_count >= v_max_uses THEN
    RAISE EXCEPTION 'Kuota untuk kode voucher ini sudah habis digunakan'
      USING errcode = 'P0001';
  END IF;
  -- 3e. Dedup per email. Email diambil dari auth.users, bukan dari klien.
  SELECT
    lower(btrim(u.email))
  INTO
    v_email
  FROM
    auth.users u
  WHERE
    u.id = p_user_id;

  IF v_email IS NOT NULL AND EXISTS (
    SELECT
      1
    FROM
      public.voucher_claims
    WHERE
      voucher_id = v_voucher_id AND lower(btrim(user_email)) = v_email) THEN
    RAISE EXCEPTION 'Email ini sudah pernah mengklaim kode voucher ini. Voucher hanya dapat diklaim satu kali per pengguna'
      USING errcode = 'P0001';
  END IF;
  -- 3f. Kredit token ke wallet program yang diminta.
  SELECT
    id,
    balance
  INTO
    v_wallet_id,
    v_balance
  FROM
    public.wallets
  WHERE
    user_id = p_user_id
    AND wallet_type = p_wallet_type
  FOR UPDATE;

  IF NOT found THEN
    INSERT INTO public.wallets (user_id, wallet_type, balance)
      VALUES (p_user_id, p_wallet_type, 0)
    RETURNING
      id, balance
    INTO
      v_wallet_id, v_balance;
  END IF;

  v_new_balance := coalesce(v_balance, 0) + v_quota;

  UPDATE
    public.wallets
  SET
    balance = v_new_balance,
    updated_at = now()
  WHERE
    id = v_wallet_id;

INSERT INTO public.wallet_transactions (wallet_id, type, amount, source_type, source_id, balance_after)
  VALUES (v_wallet_id, 'credit', v_quota, 'voucher', v_voucher_id, v_new_balance);

INSERT INTO public.voucher_claims (voucher_id, user_id, user_email)
  VALUES (v_voucher_id, p_user_id, v_email);

  UPDATE
    public.vouchers
  SET
    used_count = used_count + 1,
    updated_at = now()
  WHERE
    id = v_voucher_id;

  RETURN jsonb_build_object('claimed', TRUE, 'already_claimed', FALSE, 'amount', v_quota, 'balance', v_new_balance, 'message', 'Voucher berhasil diklaim');
END;
$$;

COMMENT ON FUNCTION public.claim_voucher (uuid, text, text) IS 'Klaim kode voucher dan kredit token ke wallet program yang diminta. '
    'Idempoten per user+voucher. Hanya boleh untuk diri sendiri (kecuali service_role).';

REVOKE ALL ON FUNCTION public.claim_voucher (uuid, text, text) FROM public;

REVOKE ALL ON FUNCTION public.claim_voucher (uuid, text, text) FROM anon;

GRANT EXECUTE ON FUNCTION public.claim_voucher (uuid, text, text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.claim_voucher (uuid, text, text) TO service_role;

-- -----------------------------------------------------------------------------
-- 4. Pindahkan voucher & klaim lama
--    `wallet_type = null` -> boleh diklaim untuk program mana pun, sesuai
--    perilaku lama (satu kolam token).
-- -----------------------------------------------------------------------------
-- Dijalankan hanya bila `legacy_prod` ada. Staging tidak punya schema itu, dan
-- migration ini harus tetap berhasil di sana (skemanya identik; hanya datanya
-- yang berbeda).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT
      1
    FROM
      pg_namespace
    WHERE
      nspname = 'legacy_prod') THEN
  RAISE NOTICE 'legacy_prod tidak ada — pemindahan voucher dilewati (environment tanpa arsip cutover)';
  RETURN;
END IF;

  INSERT INTO public.vouchers (id, code, quota_amount, max_uses, used_count, expires_at, is_active, wallet_type, created_at, updated_at)
  SELECT
    l.id,
    l.code,
    l.quota_amount,
    l.max_uses,
    coalesce(l.used_count, 0),
    l.expires_at,
    coalesce(l.is_active, FALSE),
    NULL,
    l.created_at,
    l.updated_at
  FROM
    legacy_prod.vouchers l
  ON CONFLICT (code)
    DO NOTHING;

  INSERT INTO public.voucher_claims (id, voucher_id, user_id, user_email, claimed_at)
  SELECT
    c.id,
    c.voucher_id,
    c.user_id,
    c.user_email,
    c.claimed_at
  FROM
    legacy_prod.voucher_claims c
  WHERE
    c.user_id IS NOT NULL
    AND EXISTS (
      SELECT
        1
      FROM
        public.vouchers v
      WHERE
        v.id = c.voucher_id)
    AND EXISTS (
      SELECT
        1
      FROM
        public.profiles p
      WHERE
        p.id = c.user_id)
  ON CONFLICT (voucher_id,
    user_id)
    DO NOTHING;
END
$$;
