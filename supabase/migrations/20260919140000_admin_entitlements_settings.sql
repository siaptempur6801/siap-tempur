-- =============================================================================
-- Modul admin: Entitlements (token, voucher, pass) dan Settings (konfigurasi)
--
-- LATAR
--   Dua permission terakhir yang punya data NYATA tetapi belum punya halaman:
--
--     entitlement.manage  (FINANCE, ADMIN)
--       Produksi memegang 426 dompet `exam_token_cpns` dengan saldo total 5.087
--       token, 87 baris wallet_transactions, 6 voucher, dan 307 klaim voucher.
--       Semuanya dikelola lewat SQL langsung karena tidak ada UI-nya.
--
--     settings.manage  (ADMIN)
--       `features` (40 baris) dan `certificate_templates` dipakai kode produksi
--       (`tempur-pass.service.ts`, `pass-catalog.service.ts`,
--       `app/actions/event-certificate.ts`), `feature_flags` dan
--       `periods`/`track_periods` sudah terisi.
--
--   Dua permission lain — `organization.manage` (B2B sekolah) dan
--   `notification.manage` — SENGAJA TIDAK dibuatkan halaman di sini:
--   `docs/STATUS.md` §3 menetapkan B2B sekolah "di luar cakupan (ditunda)" dan
--   §4 menandai "Platform expansion (B2B, notifikasi, analytics)" sebagai
--   ditunda. Tabelnya kosong di staging MAUPUN produksi dan tidak dirujuk satu
--   file kode pun. Membuatnya berarti memulai pekerjaan yang ditunda, bukan
--   melengkapi halaman.
--
-- KENAPA RPC
--   `wallets`, `wallet_transactions`, `vouchers`, `voucher_claims`,
--   `entitlements`, `features`, `feature_flags`, dan `certificate_templates`
--   mengaktifkan RLS tanpa policy tulis untuk `authenticated`, dan
--   `system_settings`/`periods`/`track_periods` tidak punya policy sama sekali.
--   Konsisten dengan arsitektur RPC-first repo ini, seluruh akses lewat fungsi
--   SECURITY DEFINER yang memeriksa permission di dalamnya.
--
-- PENJAGA
--   `admin_adjust_wallet` menyentuh SALDO TOKEN YANG BERNILAI UANG, jadi:
--     1. tidak boleh menyesuaikan dompet sendiri — kalau tidak, pemegang
--        entitlement.manage dapat memberi dirinya token tanpa batas;
--     2. jumlah tidak boleh 0 dan dibatasi (maks 1.000.000 per penyesuaian);
--     3. saldo tidak boleh menjadi negatif;
--     4. alasan WAJIB, minimal 3 karakter;
--     5. setiap penyesuaian menulis baris `wallet_transactions` sehingga
--        riwayatnya tidak bisa hilang.
-- =============================================================================
-- -----------------------------------------------------------------------------
-- 1. Ringkasan entitlements. Permission: entitlement.manage.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_entitlement_overview ()
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_actor uuid := auth.uid ();
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT app_private.current_user_has_permission ('entitlement.manage') THEN
    RAISE EXCEPTION 'Entitlement manage permission required';
  END IF;

  RETURN jsonb_build_object('wallets', coalesce((
      SELECT
        jsonb_agg(jsonb_build_object('wallet_type', w.wallet_type, 'wallets', w.wallets, 'balance', w.balance)
      ORDER BY w.wallet_type)
      FROM (
        SELECT
          wallet_type, count(*) AS wallets, coalesce(sum(balance), 0) AS balance
        FROM public.wallets GROUP BY wallet_type) w), '[]'::jsonb), 'transactions_total', (
  SELECT
    count(*)
  FROM public.wallet_transactions), 'transactions_30d', (
  SELECT
    count(*)
  FROM public.wallet_transactions
  WHERE
    created_at > now() - interval '30 days'), 'vouchers_total', (
  SELECT
    count(*)
  FROM public.vouchers), 'vouchers_active', (
  SELECT
    count(*)
  FROM public.vouchers
WHERE
  is_active), 'voucher_claims', (
  SELECT
    count(*)
  FROM public.voucher_claims), 'entitlements_total', (
  SELECT
    count(*)
  FROM public.entitlements), 'entitlements_active', (
  SELECT
    count(*)
  FROM public.entitlements
WHERE
  status = 'active'));
END;
$function$;

-- -----------------------------------------------------------------------------
-- 2. Daftar dompet per pengguna. Permission: entitlement.manage.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_wallets (p_search text DEFAULT NULL, p_wallet_type text DEFAULT NULL, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_actor uuid := auth.uid ();
  v_limit integer := least (greatest (coalesce(p_limit, 50), 1), 200);
  v_offset integer := greatest (coalesce(p_offset, 0), 0);
  v_rows jsonb;
  v_total integer := 0;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT app_private.current_user_has_permission ('entitlement.manage') THEN
    RAISE EXCEPTION 'Entitlement manage permission required';
  END IF;

  WITH filtered AS (
    SELECT
      w.id,
      w.user_id,
      w.wallet_type,
      w.balance,
      w.updated_at,
      pr.full_name,
      pr.display_name,
      au.email::text AS email
    FROM
      public.wallets w
    LEFT JOIN public.profiles pr ON pr.id = w.user_id
    LEFT JOIN auth.users au ON au.id = w.user_id
  WHERE (p_wallet_type IS NULL
    OR p_wallet_type = ''
    OR w.wallet_type = p_wallet_type)
    AND (p_search IS NULL
      OR p_search = ''
      OR pr.full_name ILIKE '%' || p_search || '%'
      OR pr.display_name ILIKE '%' || p_search || '%'
      OR au.email ILIKE '%' || p_search || '%')
),
paged AS (
  SELECT
    f.*,
    count(*) OVER () AS total_count
  FROM
    filtered f
  ORDER BY
    f.balance DESC,
    f.updated_at DESC
  LIMIT v_limit OFFSET v_offset
)
SELECT
  coalesce(jsonb_agg(to_jsonb (paged) - 'total_count'), '[]'::jsonb),
  coalesce(max(paged.total_count), 0)
INTO
  v_rows,
  v_total
FROM
  paged;

  RETURN jsonb_build_object('wallets', v_rows, 'total', v_total);
END;
$function$;

-- -----------------------------------------------------------------------------
-- 3. Riwayat transaksi dompet. Permission: entitlement.manage.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_wallet_transactions (p_user_id uuid DEFAULT NULL, p_wallet_type text DEFAULT NULL, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_actor uuid := auth.uid ();
  v_limit integer := least (greatest (coalesce(p_limit, 50), 1), 200);
  v_offset integer := greatest (coalesce(p_offset, 0), 0);
  v_rows jsonb;
  v_total integer := 0;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT app_private.current_user_has_permission ('entitlement.manage') THEN
    RAISE EXCEPTION 'Entitlement manage permission required';
  END IF;

  WITH filtered AS (
    SELECT
      t.id,
      t.wallet_id,
      t.type,
      t.amount,
      t.source_type,
      t.source_id,
      t.balance_after,
      t.created_at,
      w.user_id,
      w.wallet_type
    FROM
      public.wallet_transactions t
      JOIN public.wallets w ON w.id = t.wallet_id
    WHERE (p_user_id IS NULL
      OR w.user_id = p_user_id)
    AND (p_wallet_type IS NULL
      OR p_wallet_type = ''
      OR w.wallet_type = p_wallet_type)
),
paged AS (
  SELECT
    f.*,
    count(*) OVER () AS total_count
  FROM
    filtered f
  ORDER BY
    f.created_at DESC,
    f.id DESC
  LIMIT v_limit OFFSET v_offset
)
SELECT
  coalesce(jsonb_agg(to_jsonb (paged) - 'total_count'), '[]'::jsonb),
  coalesce(max(paged.total_count), 0)
INTO
  v_rows,
  v_total
FROM
  paged;

  RETURN jsonb_build_object('transactions', v_rows, 'total', v_total);
END;
$function$;

-- -----------------------------------------------------------------------------
-- 4. Sesuaikan saldo dompet. Permission: entitlement.manage.
--    PENJAGA: lihat catatan di kepala file. Setiap penyesuaian WAJIB beralasan
--    dan meninggalkan baris wallet_transactions.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_adjust_wallet (p_user_id uuid, p_wallet_type text, p_amount integer, p_reason text)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_actor uuid := auth.uid ();
  v_wallet_type text := btrim(coalesce(p_wallet_type, ''));
  v_reason text := btrim(coalesce(p_reason, ''));
  v_amount integer := coalesce(p_amount, 0);
  v_wallet_id uuid;
  v_balance integer;
  v_new_balance integer;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT app_private.current_user_has_permission ('entitlement.manage') THEN
    RAISE EXCEPTION 'Entitlement manage permission required';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User is required';
  END IF;
  -- Penjaga 1: tidak boleh menyesuaikan dompet sendiri. Token bernilai uang,
  -- jadi mem bolehkan ini sama dengan memberi akses cetak uang.
  IF p_user_id = v_actor THEN
    RAISE EXCEPTION 'Cannot adjust your own wallet';
  END IF;

  IF v_wallet_type NOT IN ('exam_token_cpns', 'exam_token_tka', 'exam_token') THEN
    RAISE EXCEPTION 'Unknown wallet type';
  END IF;
  -- Penjaga 2: jumlah harus masuk akal.
  IF v_amount = 0 THEN
    RAISE EXCEPTION 'Amount must not be zero';
  END IF;
  IF abs(v_amount) > 1000000 THEN
    RAISE EXCEPTION 'Amount exceeds the per-adjustment limit';
  END IF;
  -- Penjaga 4: alasan wajib.
  IF length(v_reason) < 3 THEN
    RAISE EXCEPTION 'A reason of at least 3 characters is required';
  END IF;

  IF NOT EXISTS (
    SELECT
      1
    FROM
      public.profiles
    WHERE
      id = p_user_id) THEN
  RAISE EXCEPTION 'User profile not found';
END IF;
  -- Kunci dompet supaya dua penyesuaian bersamaan tidak saling menimpa.
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
    AND wallet_type = v_wallet_type
  FOR UPDATE;

  IF v_wallet_id IS NULL THEN
    INSERT INTO public.wallets (user_id, wallet_type, balance)
      VALUES (p_user_id, v_wallet_type, 0)
    RETURNING
      id, balance
    INTO
      v_wallet_id, v_balance;
  END IF;

  v_new_balance := v_balance + v_amount;
  -- Penjaga 3: saldo tidak boleh negatif.
  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'Adjustment would make the balance negative';
  END IF;

  UPDATE
    public.wallets
  SET
    balance = v_new_balance,
    updated_at = now()
  WHERE
    id = v_wallet_id;

INSERT INTO public.wallet_transactions (wallet_id, type, amount, source_type, source_id, balance_after)
  VALUES (v_wallet_id, CASE WHEN v_amount > 0 THEN
      'credit'
    ELSE
      'debit'
    END, v_amount, 'admin_adjustment', NULL, v_new_balance);

  RETURN jsonb_build_object('user_id', p_user_id, 'wallet_type', v_wallet_type, 'amount', v_amount, 'previous_balance', v_balance, 'balance', v_new_balance, 'reason', v_reason);
END;
$function$;

-- -----------------------------------------------------------------------------
-- 5. Daftar voucher + jumlah klaimnya. Permission: entitlement.manage.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_vouchers ()
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_actor uuid := auth.uid ();
  v_rows jsonb;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT app_private.current_user_has_permission ('entitlement.manage') THEN
    RAISE EXCEPTION 'Entitlement manage permission required';
  END IF;

  SELECT
    coalesce(jsonb_agg(voucher_row ORDER BY voucher_row ->> 'code'), '[]'::jsonb)
  INTO
    v_rows
  FROM (
    SELECT
      jsonb_build_object('id', v.id, 'code', v.code, 'quota_amount', v.quota_amount, 'max_uses', v.max_uses, 'used_count', v.used_count, 'expires_at', v.expires_at, 'is_active', v.is_active, 'wallet_type', v.wallet_type, 'created_at', v.created_at, 'claims', (
          SELECT
            count(*)
          FROM public.voucher_claims c
          WHERE
            c.voucher_id = v.id),
          -- `voucher_claims` TIDAK menyimpan berapa token yang diberikan
          -- (kolomnya hanya id, voucher_id, user_id, user_email, claimed_at).
          --
          -- Angka otoritatifnya ada di buku besar dompet: transaksi dengan
          -- source_type 'voucher' dan source_id = voucher ini. TETAPI klaim
          -- yang diwarisi dari migrasi legacy TIDAK punya baris buku besar —
          -- di produksi ada 307 klaim voucher sementara transaksi bersumber
          -- 'voucher' nol. Menampilkan 0 di sebelah "37 klaim" menyesatkan.
          --
          -- Jadi: pakai buku besar bila ada, dan bila belum ada, PERKIRAKAN
          -- dari klaim x kuota sambil menandainya sebagai perkiraan supaya
          -- angka itu tidak disalahartikan sebagai catatan resmi.
          'tokens_ledger_rows', (
            SELECT
              count(*)
            FROM public.wallet_transactions t
          WHERE
            t.source_type = 'voucher'
            AND t.source_id = v.id), 'tokens_granted', CASE WHEN EXISTS (
            SELECT
              1
            FROM public.wallet_transactions t
          WHERE
            t.source_type = 'voucher'
            AND t.source_id = v.id) THEN
            coalesce((
              SELECT
                sum(t.amount)
              FROM public.wallet_transactions t
            WHERE
              t.source_type = 'voucher'
              AND t.source_id = v.id), 0)
          ELSE
            (
              SELECT
                count(*)
              FROM public.voucher_claims c
            WHERE
              c.voucher_id = v.id) * v.quota_amount
          END, 'tokens_source', CASE WHEN EXISTS (
            SELECT
              1
            FROM public.wallet_transactions t
          WHERE
            t.source_type = 'voucher'
            AND t.source_id = v.id) THEN
            'ledger'
          ELSE
            'estimated'
          END) AS voucher_row
    FROM
      public.vouchers v) x;

  RETURN jsonb_build_object('vouchers', v_rows);
END;
$function$;

-- -----------------------------------------------------------------------------
-- 6. Buat / ubah voucher. Permission: entitlement.manage.
--    PENJAGA: kuota tidak boleh lebih kecil dari yang SUDAH diklaim, dan
--    `max_uses` tidak boleh lebih kecil dari `used_count`. Tanpa itu, mengubah
--    voucher bisa membuat data klaim yang sudah ada menjadi tidak konsisten.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_upsert_voucher (p_id uuid, p_code text, p_quota_amount integer, p_max_uses integer, p_expires_at timestamptz, p_is_active boolean, p_wallet_type text)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_actor uuid := auth.uid ();
  v_code text := upper(btrim(coalesce(p_code, '')));
  v_wallet_type text := nullif (btrim(coalesce(p_wallet_type, '')), '');
  v_id uuid := p_id;
  v_used integer := 0;
  v_claim_count integer := 0;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT app_private.current_user_has_permission ('entitlement.manage') THEN
    RAISE EXCEPTION 'Entitlement manage permission required';
  END IF;

  IF v_code !~ '^[A-Z0-9][A-Z0-9_-]{2,31}$' THEN
    RAISE EXCEPTION 'Voucher code must be 3-32 characters of A-Z, 0-9, _ or -';
  END IF;

  IF coalesce(p_quota_amount, 0) <= 0 THEN
    RAISE EXCEPTION 'Quota must be greater than zero';
  END IF;

  IF coalesce(p_max_uses, 0) <= 0 THEN
    RAISE EXCEPTION 'Max uses must be greater than zero';
  END IF;

  IF v_wallet_type IS NOT NULL AND v_wallet_type NOT IN ('exam_token_cpns', 'exam_token_tka') THEN
    RAISE EXCEPTION 'Unknown wallet type';
  END IF;

  IF v_id IS NULL THEN
    INSERT INTO public.vouchers (code, quota_amount, max_uses, expires_at, is_active, wallet_type)
      VALUES (v_code, p_quota_amount, p_max_uses, p_expires_at, coalesce(p_is_active, TRUE), v_wallet_type)
    RETURNING
      id
    INTO
      v_id;
  ELSE
    SELECT
      used_count
    INTO
      v_used
    FROM
      public.vouchers
    WHERE
      id = v_id
    FOR UPDATE;
    IF v_used IS NULL THEN
      RAISE EXCEPTION 'Voucher not found';
    END IF;

    SELECT
      count(*)
    INTO
      v_claim_count
    FROM
      public.voucher_claims
    WHERE
      voucher_id = v_id;

    IF p_max_uses < v_used THEN
      RAISE EXCEPTION 'Max uses cannot be lower than the % times already used', v_used;
    END IF;
    IF p_quota_amount < 0 THEN
      RAISE EXCEPTION 'Quota must not be negative';
    END IF;
    -- Voucher yang sudah diklaim tidak boleh diubah kodenya: pengguna
    -- memegang kode itu, dan mengubahnya membuat klaim lama menunjuk kode
    -- yang tidak pernah mereka pakai.
    IF v_claim_count > 0 AND v_code <> (
      SELECT
        code
      FROM
        public.vouchers
      WHERE
        id = v_id) THEN
      RAISE EXCEPTION 'Cannot change the code of a voucher that already has claims';
    END IF;

    UPDATE
      public.vouchers
    SET
      code = v_code,
      quota_amount = p_quota_amount,
      max_uses = p_max_uses,
      expires_at = p_expires_at,
      is_active = coalesce(p_is_active, is_active),
      wallet_type = v_wallet_type,
      updated_at = now()
    WHERE
      id = v_id;
  END IF;

  RETURN jsonb_build_object('id', v_id, 'code', v_code, 'claims', v_claim_count, 'used_count', v_used);
END;
$function$;

-- -----------------------------------------------------------------------------
-- 7. Daftar entitlement (pass) per pengguna. Permission: entitlement.manage.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_entitlements (p_search text DEFAULT NULL, p_status text DEFAULT NULL, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_actor uuid := auth.uid ();
  v_limit integer := least (greatest (coalesce(p_limit, 50), 1), 200);
  v_offset integer := greatest (coalesce(p_offset, 0), 0);
  v_rows jsonb;
  v_total integer := 0;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT app_private.current_user_has_permission ('entitlement.manage') THEN
    RAISE EXCEPTION 'Entitlement manage permission required';
  END IF;

  WITH filtered AS (
    SELECT
      e.id,
      e.user_id,
      e.source_type,
      e.source_id,
      e.starts_at,
      e.expires_at,
      e.usage_limit,
      e.usage_count,
      e.status,
      e.created_at,
      f.code AS feature_code,
      f.name AS feature_name,
      pr.full_name,
      pr.display_name,
      au.email::text AS email
    FROM
      public.entitlements e
    LEFT JOIN public.features f ON f.id = e.feature_id
    LEFT JOIN public.profiles pr ON pr.id = e.user_id
    LEFT JOIN auth.users au ON au.id = e.user_id
  WHERE (p_status IS NULL
    OR p_status = ''
    OR e.status = p_status)
    AND (p_search IS NULL
      OR p_search = ''
      OR pr.full_name ILIKE '%' || p_search || '%'
      OR pr.display_name ILIKE '%' || p_search || '%'
      OR au.email ILIKE '%' || p_search || '%'
      OR f.code ILIKE '%' || p_search || '%')
),
paged AS (
  SELECT
    f.*,
    count(*) OVER () AS total_count
  FROM
    filtered f
  ORDER BY
    f.created_at DESC,
    f.id
  LIMIT v_limit OFFSET v_offset
)
SELECT
  coalesce(jsonb_agg(to_jsonb (paged) - 'total_count'), '[]'::jsonb),
  coalesce(max(paged.total_count), 0)
INTO
  v_rows,
  v_total
FROM
  paged;

  RETURN jsonb_build_object('entitlements', v_rows, 'total', v_total);
END;
$function$;

-- -----------------------------------------------------------------------------
-- 8. Semua konfigurasi platform dalam satu panggilan.
--    Permission: settings.manage.
--
--    Digabung karena halaman Settings menampilkan kelimanya sekaligus; lima
--    perjalanan bolak-balik ke database untuk satu halaman hanya menambah
--    waktu muat tanpa manfaat.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_settings ()
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_actor uuid := auth.uid ();
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT app_private.current_user_has_permission ('settings.manage') THEN
    RAISE EXCEPTION 'Settings manage permission required';
  END IF;

  RETURN jsonb_build_object('feature_flags', coalesce((
      SELECT
        jsonb_agg(jsonb_build_object('id', ff.id, 'key', ff.key, 'name', ff.name, 'enabled', ff.enabled, 'rollout_percentage', ff.rollout_percentage, 'config', ff.config)
      ORDER BY ff.key)
      FROM public.feature_flags ff), '[]'::jsonb), 'features', coalesce((
    SELECT
      jsonb_agg(jsonb_build_object('id', f.id, 'code', f.code, 'name', f.name, 'description', f.description, 'entitlements', (
            SELECT
              count(*)
          FROM public.entitlements e
        WHERE
          e.feature_id = f.id))
    ORDER BY f.code)
  FROM public.features f), '[]'::jsonb), 'certificate_templates', coalesce((
  SELECT
    jsonb_agg(jsonb_build_object('id', ct.id, 'name', ct.name, 'template_url', ct.template_url, 'config', ct.config, 'created_at', ct.created_at, 'certificates', (
          SELECT
            count(*)
        FROM public.certificates c
      WHERE
        c.template_id = ct.id))
  ORDER BY ct.name)
FROM public.certificate_templates ct), '[]'::jsonb), 'periods', coalesce((
  SELECT
    jsonb_agg(jsonb_build_object('id', p.id, 'code', p.code, 'name', p.name, 'start_date', p.start_date, 'end_date', p.end_date, 'status', p.status)
    ORDER BY p.start_date DESC)
  FROM public.periods p), '[]'::jsonb), 'track_periods', coalesce((
  SELECT
    jsonb_agg(jsonb_build_object('id', tp.id, 'is_active', tp.is_active, 'track_code', t.code, 'program_code', pr.code, 'period_code', p.code, 'period_name', p.name, 'start_date', p.start_date, 'end_date', p.end_date)
    ORDER BY pr.code, t.code)
  FROM public.track_periods tp
  JOIN public.tracks t ON t.id = tp.track_id
  JOIN public.programs pr ON pr.id = t.program_id
  LEFT JOIN public.periods p ON p.id = tp.period_id), '[]'::jsonb), 'system_settings', coalesce((
  SELECT
    jsonb_agg(jsonb_build_object('key', s.key, 'value', s.value, 'updated_at', s.updated_at, 'updated_by_name', pr.full_name)
    ORDER BY s.key)
  FROM public.system_settings s
  LEFT JOIN public.profiles pr ON pr.id = s.updated_by), '[]'::jsonb));
END;
$function$;

-- -----------------------------------------------------------------------------
-- 9. Buat / ubah feature flag. Permission: settings.manage.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_upsert_feature_flag (p_id uuid, p_key text, p_name text, p_enabled boolean, p_rollout_percentage integer)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_actor uuid := auth.uid ();
  v_key text := btrim(coalesce(p_key, ''));
  v_name text := btrim(coalesce(p_name, ''));
  v_rollout integer := coalesce(p_rollout_percentage, 0);
  v_id uuid := p_id;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT app_private.current_user_has_permission ('settings.manage') THEN
    RAISE EXCEPTION 'Settings manage permission required';
  END IF;

  IF v_key !~ '^[a-z0-9][a-z0-9_.-]{1,63}$' THEN
    RAISE EXCEPTION 'Flag key must be 2-64 characters of a-z, 0-9, _ . or -';
  END IF;

  IF length(v_name) < 2 THEN
    RAISE EXCEPTION 'Flag name is required';
  END IF;

  IF v_rollout < 0 OR v_rollout > 100 THEN
    RAISE EXCEPTION 'Rollout percentage must be between 0 and 100';
  END IF;

  IF v_id IS NULL THEN
    INSERT INTO public.feature_flags (key, name, enabled, rollout_percentage)
      VALUES (v_key, v_name, coalesce(p_enabled, FALSE), v_rollout)
    RETURNING
      id
    INTO
      v_id;
  ELSE
    IF NOT EXISTS (
      SELECT
        1
      FROM
        public.feature_flags
      WHERE
        id = v_id) THEN
    RAISE EXCEPTION 'Feature flag not found';
  END IF;

  UPDATE
    public.feature_flags
  SET
    key = v_key,
    name = v_name,
    enabled = coalesce(p_enabled, enabled),
    rollout_percentage = v_rollout
  WHERE
    id = v_id;
END IF;

  RETURN jsonb_build_object('id', v_id, 'key', v_key, 'enabled', coalesce(p_enabled, FALSE), 'rollout_percentage', v_rollout);
END;
$function$;

-- -----------------------------------------------------------------------------
-- 10. Ubah template sertifikat. Permission: settings.manage.
--     PENJAGA: template yang sudah dipakai sertifikat terbit tidak boleh
--     kehilangan `template_url`-nya — sertifikat lama akan gagal dirender ulang.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_upsert_certificate_template (p_id uuid, p_name text, p_template_url text, p_config jsonb)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_actor uuid := auth.uid ();
  v_name text := btrim(coalesce(p_name, ''));
  v_url text := nullif (btrim(coalesce(p_template_url, '')), '');
  v_in_use integer := 0;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT app_private.current_user_has_permission ('settings.manage') THEN
    RAISE EXCEPTION 'Settings manage permission required';
  END IF;

  IF p_id IS NULL THEN
    RAISE EXCEPTION 'Certificate template id is required';
  END IF;

  IF length(v_name) < 2 THEN
    RAISE EXCEPTION 'Template name is required';
  END IF;

  IF NOT EXISTS (
    SELECT
      1
    FROM
      public.certificate_templates
    WHERE
      id = p_id) THEN
  RAISE EXCEPTION 'Certificate template not found';
END IF;

  SELECT
    count(*)
  INTO
    v_in_use
  FROM
    public.certificates
  WHERE
    template_id = p_id;

  IF v_url IS NULL AND v_in_use > 0 THEN
    RAISE EXCEPTION 'Cannot clear the template URL: % certificates already use this template', v_in_use;
  END IF;

  UPDATE
    public.certificate_templates
  SET
    name = v_name,
    template_url = coalesce(v_url, template_url),
    config = coalesce(p_config, config)
  WHERE
    id = p_id;

  RETURN jsonb_build_object('id', p_id, 'name', v_name, 'certificates_in_use', v_in_use);
END;
$function$;

-- -----------------------------------------------------------------------------
-- 11. Aktifkan / nonaktifkan track period. Permission: settings.manage.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_set_track_period_active (p_track_period_id uuid, p_is_active boolean)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_actor uuid := auth.uid ();
  v_updated integer := 0;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT app_private.current_user_has_permission ('settings.manage') THEN
    RAISE EXCEPTION 'Settings manage permission required';
  END IF;

  UPDATE
    public.track_periods
  SET
    is_active = coalesce(p_is_active, FALSE),
    updated_at = now()
  WHERE
    id = p_track_period_id;
  get diagnostics v_updated = row_count;

  IF v_updated = 0 THEN
    RAISE EXCEPTION 'Track period not found';
  END IF;

  RETURN jsonb_build_object('id', p_track_period_id, 'is_active', coalesce(p_is_active, FALSE));
END;
$function$;

-- -----------------------------------------------------------------------------
-- 12. Tulis / hapus system setting (key-value). Permission: settings.manage.
--     Nilai disimpan sebagai jsonb, jadi angka, boolean, dan objek sama-sama sah.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_upsert_system_setting (p_key text, p_value jsonb)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_actor uuid := auth.uid ();
  v_key text := btrim(coalesce(p_key, ''));
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT app_private.current_user_has_permission ('settings.manage') THEN
    RAISE EXCEPTION 'Settings manage permission required';
  END IF;

  IF v_key !~ '^[a-z0-9][a-z0-9_.-]{1,63}$' THEN
    RAISE EXCEPTION 'Setting key must be 2-64 characters of a-z, 0-9, _ . or -';
  END IF;

  IF p_value IS NULL THEN
    RAISE EXCEPTION 'Setting value is required';
  END IF;

  INSERT INTO public.system_settings (key, value, updated_by, updated_at)
    VALUES (v_key, p_value, v_actor, now())
  ON CONFLICT (key)
    DO UPDATE SET
      value = excluded.value,
      updated_by = excluded.updated_by,
      updated_at = now();

  RETURN jsonb_build_object('key', v_key, 'value', p_value);
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_delete_system_setting (p_key text)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_actor uuid := auth.uid ();
  v_deleted integer := 0;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT app_private.current_user_has_permission ('settings.manage') THEN
    RAISE EXCEPTION 'Settings manage permission required';
  END IF;

  DELETE FROM public.system_settings
  WHERE key = btrim(coalesce(p_key, ''));
  get diagnostics v_deleted = row_count;

  RETURN jsonb_build_object('key', p_key, 'deleted', v_deleted > 0);
END;
$function$;

-- -----------------------------------------------------------------------------
-- ACL: `anon` tidak diberi akses; setiap fungsi memeriksa permission sendiri.
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.admin_entitlement_overview () FROM public, anon;

REVOKE ALL ON FUNCTION public.admin_list_wallets (text, text, integer, integer) FROM public, anon;

REVOKE ALL ON FUNCTION public.admin_list_wallet_transactions (uuid, text, integer, integer) FROM public, anon;

REVOKE ALL ON FUNCTION public.admin_adjust_wallet (uuid, text, integer, text) FROM public, anon;

REVOKE ALL ON FUNCTION public.admin_list_vouchers () FROM public, anon;

REVOKE ALL ON FUNCTION public.admin_upsert_voucher (uuid, text, integer, integer, timestamptz, boolean, text) FROM public, anon;

REVOKE ALL ON FUNCTION public.admin_list_entitlements (text, text, integer, integer) FROM public, anon;

REVOKE ALL ON FUNCTION public.admin_list_settings () FROM public, anon;

REVOKE ALL ON FUNCTION public.admin_upsert_feature_flag (uuid, text, text, boolean, integer) FROM public, anon;

REVOKE ALL ON FUNCTION public.admin_upsert_certificate_template (uuid, text, text, jsonb) FROM public, anon;

REVOKE ALL ON FUNCTION public.admin_set_track_period_active (uuid, boolean) FROM public, anon;

REVOKE ALL ON FUNCTION public.admin_upsert_system_setting (text, jsonb) FROM public, anon;

REVOKE ALL ON FUNCTION public.admin_delete_system_setting (text) FROM public, anon;

GRANT EXECUTE ON FUNCTION public.admin_entitlement_overview () TO authenticated;

GRANT EXECUTE ON FUNCTION public.admin_list_wallets (text, text, integer, integer) TO authenticated;

GRANT EXECUTE ON FUNCTION public.admin_list_wallet_transactions (uuid, text, integer, integer) TO authenticated;

GRANT EXECUTE ON FUNCTION public.admin_adjust_wallet (uuid, text, integer, text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.admin_list_vouchers () TO authenticated;

GRANT EXECUTE ON FUNCTION public.admin_upsert_voucher (uuid, text, integer, integer, timestamptz, boolean, text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.admin_list_entitlements (text, text, integer, integer) TO authenticated;

GRANT EXECUTE ON FUNCTION public.admin_list_settings () TO authenticated;

GRANT EXECUTE ON FUNCTION public.admin_upsert_feature_flag (uuid, text, text, boolean, integer) TO authenticated;

GRANT EXECUTE ON FUNCTION public.admin_upsert_certificate_template (uuid, text, text, jsonb) TO authenticated;

GRANT EXECUTE ON FUNCTION public.admin_set_track_period_active (uuid, boolean) TO authenticated;

GRANT EXECUTE ON FUNCTION public.admin_upsert_system_setting (text, jsonb) TO authenticated;

GRANT EXECUTE ON FUNCTION public.admin_delete_system_setting (text) TO authenticated;
