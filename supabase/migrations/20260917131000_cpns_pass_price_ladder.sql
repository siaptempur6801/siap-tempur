-- Tangga harga Tempur Pass CPNS (2026-09-17).
--
-- Rekomendasi produk: tambahkan paket **pintu masuk 7 hari** dan **paket panjang 180 hari**, sambil
-- mempertahankan 30 & 90 hari yang sudah ada.
--
--   CPNS_PASS_7    Rp19.000    (pintu masuk / dekat ujian, di atas lantai biaya pembayaran)
--   CPNS_PASS_30   Rp39.000    (tetap — impas di 4–5 token, di bawah ambang psikologis Rp50rb)
--   CPNS_PASS_90   Rp89.000    (tetap — hemat 24% vs 3× paket 30 hari)
--   CPNS_PASS_180  Rp149.000   (hemat 36% vs 6× paket 30 hari; menaikkan LTV & arus kas awal)
--
-- Kedua paket baru memakai fitur yang sama dengan CPNS_PASS_30 (10 fitur, scope `cpns`) supaya
-- cakupannya identik — yang berbeda hanya durasi dan harga.
DO $$
DECLARE
  v_program uuid;
  v_track uuid;
  v_source uuid;
  v_new uuid;
BEGIN
  SELECT
    p.program_id,
    p.track_id,
    p.id
  INTO
    v_program,
    v_track,
    v_source
  FROM
    public.products p
  WHERE
    p.code = 'CPNS_PASS_30';

  IF v_source IS NULL THEN
    RAISE NOTICE 'CPNS_PASS_30 tidak ditemukan — migrasi tangga harga dilewati';
    RETURN;
  END IF;
  -- ---------------------------------------------------------------- paket 7 hari
  INSERT INTO public.products (code, name, description, product_type, program_id, track_id, duration_days, status)
    VALUES ('CPNS_PASS_7', 'Tempur Pass CPNS 7 Hari', 'Akses penuh fitur belajar CPNS selama 7 hari: Mini Tryout dan Full Tryout tanpa token per sesi.', 'PASS', v_program, v_track, 7, 'ACTIVE')
  ON CONFLICT (code)
    DO UPDATE SET
      name = excluded.name,
      description = excluded.description,
      product_type = excluded.product_type,
      program_id = excluded.program_id,
      track_id = excluded.track_id,
      duration_days = excluded.duration_days,
      status = excluded.status
    RETURNING
      id
    INTO
      v_new;

  IF v_new IS NULL THEN
    SELECT
      id
    INTO
      v_new
    FROM
      public.products
    WHERE
      code = 'CPNS_PASS_7';
  END IF;

  INSERT INTO public.product_features (product_id, feature_id, limit_value)
  SELECT
    v_new,
    pf.feature_id,
    pf.limit_value
  FROM
    public.product_features pf
  WHERE
    pf.product_id = v_source
  ON CONFLICT (product_id,
    feature_id)
    DO NOTHING;

  INSERT INTO public.product_prices (product_id, currency, amount, starts_at, ends_at, status)
  SELECT
    v_new,
    'IDR',
    19000,
    now(),
    NULL,
    'ACTIVE'
  WHERE
    NOT EXISTS (
      SELECT
        1
      FROM
        public.product_prices pp
      WHERE
        pp.product_id = v_new
        AND pp.status = 'ACTIVE');
  -- -------------------------------------------------------------- paket 180 hari
  INSERT INTO public.products (code, name, description, product_type, program_id, track_id, duration_days, status)
    VALUES ('CPNS_PASS_180', 'Tempur Pass CPNS 180 Hari', 'Akses penuh fitur belajar CPNS selama 180 hari — pilihan paling hemat untuk persiapan panjang.', 'PASS', v_program, v_track, 180, 'ACTIVE')
  ON CONFLICT (code)
    DO UPDATE SET
      name = excluded.name,
      description = excluded.description,
      product_type = excluded.product_type,
      program_id = excluded.program_id,
      track_id = excluded.track_id,
      duration_days = excluded.duration_days,
      status = excluded.status
    RETURNING
      id
    INTO
      v_new;

  IF v_new IS NULL THEN
    SELECT
      id
    INTO
      v_new
    FROM
      public.products
    WHERE
      code = 'CPNS_PASS_180';
  END IF;

  INSERT INTO public.product_features (product_id, feature_id, limit_value)
  SELECT
    v_new,
    pf.feature_id,
    pf.limit_value
  FROM
    public.product_features pf
  WHERE
    pf.product_id = v_source
  ON CONFLICT (product_id,
    feature_id)
    DO NOTHING;

  INSERT INTO public.product_prices (product_id, currency, amount, starts_at, ends_at, status)
  SELECT
    v_new,
    'IDR',
    149000,
    now(),
    NULL,
    'ACTIVE'
  WHERE
    NOT EXISTS (
      SELECT
        1
      FROM
        public.product_prices pp
      WHERE
        pp.product_id = v_new
        AND pp.status = 'ACTIVE');
END
$$;
