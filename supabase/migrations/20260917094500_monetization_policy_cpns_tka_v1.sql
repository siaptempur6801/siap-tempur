-- Kebijakan monetisasi CPNS + TKA pada satu akun (2026-09-17).
--
-- Keputusan produk:
--   * Token dipisah per program → grant token produk CPNS memakai wallet `exam_token_cpns`.
--   * Pass CPNS diaktifkan (jual) → `CPNS_PASS_30/90` ACTIVE + harga, dan exam CPNS tersambung
--     ke fitur pass sehingga pemegang pass tidak dipotong token (token tetap berlaku tanpa pass).
--   * Bundle lintas jenjang TKA disiapkan (`TKA_PASS_ALL_30/90`) — masih DRAFT karena konten SD/SMA
--     belum live; harga juga DRAFT supaya tidak bisa dibeli sebelum diaktifkan.
-- 1. Grant token mengikuti program
UPDATE
  public.product_wallet_grants g
SET
  wallet_type = 'exam_token_cpns'
FROM
  public.products p
WHERE
  p.id = g.product_id
  AND p.code LIKE 'CPNS_TOKEN_%'
  AND g.wallet_type = 'exam_token';

-- 2. Pass CPNS: aktifkan + harga awal (Rp39.000 / 30 hari, Rp89.000 / 90 hari)
UPDATE
  public.products
SET
  status = 'ACTIVE',
  updated_at = now()
WHERE
  code IN ('CPNS_PASS_30', 'CPNS_PASS_90')
  AND status IS DISTINCT FROM 'ACTIVE';

INSERT INTO public.product_prices (product_id, currency, amount, starts_at, ends_at, status)
SELECT
  p.id,
  'IDR',
  v.amount,
  now(),
  NULL,
  'ACTIVE'
FROM
  public.products p
  JOIN (
    VALUES ('CPNS_PASS_30', 39000.00::numeric),
      ('CPNS_PASS_90', 89000.00::numeric)) AS v (code, amount) ON v.code = p.code
WHERE
  NOT EXISTS (
    SELECT
      1
    FROM
      public.product_prices pp
    WHERE
      pp.product_id = p.id
      AND upper(pp.status) = 'ACTIVE');

-- 3. Exam CPNS: sambungkan ke fitur pass sesuai tipe exam (pass = bypass token)
UPDATE
  public.exams e
SET
  required_feature_id = f.id
FROM
  public.exam_types et,
  public.features f,
  public.programs pr
WHERE
  et.id = e.exam_type_id
  AND pr.id = e.program_id
  AND pr.code = 'CPNS'
  AND e.required_feature_id IS NULL
  AND f.code = CASE upper(et.code)
  WHEN 'FULL_TRYOUT' THEN
    'cpns.full_tryout.regular'
  WHEN 'MINI_TRYOUT' THEN
    'cpns.mini_tryout.unlimited'
  WHEN 'DRILL' THEN
    'cpns.drill.unlimited'
  ELSE
    NULL
  END;

-- 4. Bundle lintas jenjang TKA (SD + SMP + SMA) — produk DRAFT, menunggu konten SD/SMA live
INSERT INTO public.products (code, name, description, product_type, program_id, track_id, duration_days, status)
SELECT
  v.code,
  v.name,
  v.description,
  'PASS',
  pr.id,
  NULL,
  v.duration_days,
  'DRAFT'
FROM
  public.programs pr
  JOIN (
    VALUES ('TKA_PASS_ALL_30', 'Tempur Pass TKA Semua Jenjang 30 Hari', 'Akses Tempur Pass untuk TKA SD, SMP, dan SMA sekaligus selama 30 hari.', 30),
      ('TKA_PASS_ALL_90', 'Tempur Pass TKA Semua Jenjang 90 Hari', 'Akses Tempur Pass untuk TKA SD, SMP, dan SMA sekaligus selama 90 hari.', 90)) AS v (code, name, description, duration_days) ON TRUE
WHERE
  pr.code = 'TKA'
  AND NOT EXISTS (
    SELECT
      1
    FROM
      public.products p
    WHERE
      p.code = v.code);

-- 4a. Bundle memberi seluruh fitur TKA (semua jenjang)
INSERT INTO public.product_features (product_id, feature_id, limit_value)
SELECT
  p.id,
  f.id,
  NULL
FROM
  public.products p
  JOIN public.features f ON f.code LIKE 'tka.%'
WHERE
  p.code IN ('TKA_PASS_ALL_30', 'TKA_PASS_ALL_90')
  AND NOT EXISTS (
    SELECT
      1
    FROM
      public.product_features pf
    WHERE
      pf.product_id = p.id
      AND pf.feature_id = f.id);

-- 4b. Harga bundle disiapkan sebagai DRAFT (tidak bisa dibeli sebelum produk diaktifkan)
INSERT INTO public.product_prices (product_id, currency, amount, starts_at, ends_at, status)
SELECT
  p.id,
  'IDR',
  v.amount,
  now(),
  NULL,
  'DRAFT'
FROM
  public.products p
  JOIN (
    VALUES ('TKA_PASS_ALL_30', 79000.00::numeric),
      ('TKA_PASS_ALL_90', 179000.00::numeric)) AS v (code, amount) ON v.code = p.code
WHERE
  NOT EXISTS (
    SELECT
      1
    FROM
      public.product_prices pp
    WHERE
      pp.product_id = p.id);
