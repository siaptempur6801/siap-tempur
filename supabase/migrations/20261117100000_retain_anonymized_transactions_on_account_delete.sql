-- Audit 2026-11-17, N-19 — keputusan pemilik: simpan catatan transaksi, anonimkan
-- data pribadinya saat akun dihapus.
--
-- Sebelumnya `orders.user_id` memakai ON DELETE CASCADE, sehingga menghapus akun ikut
-- menghapus order, order_items, dan payments (bukti transaksi hilang). Selain itu
-- `refunds.requested_by` memakai ON DELETE RESTRICT, sehingga akun yang pernah
-- mengajukan refund tidak bisa dihapus sama sekali.
--
-- Setelah migration ini:
-- 1. order dan refund tetap ada dengan pemilik NULL (ON DELETE SET NULL);
-- 2. trigger BEFORE DELETE pada profiles menganonimkan transaksi milik akun itu untuk
--    SEMUA jalur penghapusan (hapus akun mandiri, admin, atau langsung di auth.users):
--    - membuang data pelanggan/kartu dari payments.raw_response dan payload webhook;
--    - membatalkan order/pembayaran yang masih pending agar cron rekonsiliasi tidak
--      memenuhi order tanpa pemilik;
--    - mencatat orders.anonymized_at.
--    Nominal, produk, status, waktu, dan nomor transaksi tetap tersimpan.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS anonymized_at timestamp with time zone;

ALTER TABLE public.orders
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.refunds
  ALTER COLUMN requested_by DROP NOT NULL;

-- Hapus FK lama apa pun namanya di lingkungan live (dicari lewat katalog, bukan nama
-- dari snapshot), lalu buat ulang dengan ON DELETE SET NULL.
DO $$
DECLARE
  v_target record;
  v_constraint record;
BEGIN
  FOR v_target IN
  SELECT
    *
  FROM (
    VALUES ('public.orders'::regclass, 'user_id'),
      ('public.refunds'::regclass, 'requested_by')) AS t (table_oid, column_name)
    LOOP
      FOR v_constraint IN
      SELECT
        c.conname
      FROM
        pg_constraint c
        JOIN pg_attribute a ON a.attrelid = c.conrelid
          AND a.attnum = ANY (c.conkey)
      WHERE
        c.contype = 'f'
        AND c.conrelid = v_target.table_oid
        AND c.confrelid = 'public.profiles'::regclass
        AND a.attname = v_target.column_name LOOP
          EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', v_target.table_oid, v_constraint.conname);
    END LOOP;
  END LOOP;
END
$$;

ALTER TABLE public.orders
  ADD CONSTRAINT fk_orders_user_id_profiles FOREIGN KEY (user_id) REFERENCES public.profiles (id) ON DELETE SET NULL;

ALTER TABLE public.refunds
  ADD CONSTRAINT fk_refunds_requested_by_profiles FOREIGN KEY (requested_by) REFERENCES public.profiles (id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION app_private.anonymize_commerce_before_profile_delete ()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_pii_keys text[] := ARRAY['customer_details', 'masked_card', 'card_token', 'saved_token_id', 'saved_token_id_expired_at', 'email', 'phone', 'first_name', 'last_name'];
BEGIN
  UPDATE
    public.payment_webhook_events AS e
  SET
    payload = e.payload - v_pii_keys
  FROM
    public.orders AS o
  WHERE
    o.user_id = OLD.id
    AND e.payload ->> 'order_id' = o.order_number;
  UPDATE
    public.payments AS p
  SET
    raw_response = p.raw_response - v_pii_keys,
    -- Kosakata status pembayaran mengikuti Midtrans (`cancel`); order memakai `cancelled`.
    status = CASE WHEN lower(p.status) = 'pending' THEN
      'cancel'
    ELSE
      p.status
    END,
    updated_at = now()
  FROM
    public.orders AS o
  WHERE
    o.id = p.order_id
    AND o.user_id = OLD.id;
  UPDATE
    public.orders AS o
  SET
    status = CASE WHEN lower(o.status) = 'pending' THEN
      'cancelled'
    ELSE
      o.status
    END,
    anonymized_at = now()
  WHERE
    o.user_id = OLD.id;
  RETURN OLD;
END;
$function$;

REVOKE ALL ON FUNCTION app_private.anonymize_commerce_before_profile_delete () FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS anonymize_commerce_before_profile_delete ON public.profiles;

CREATE TRIGGER anonymize_commerce_before_profile_delete
  BEFORE DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION app_private.anonymize_commerce_before_profile_delete ();
