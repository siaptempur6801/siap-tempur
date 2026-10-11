-- Aktifkan produk pass TKA SD/SMA + bundle lintas jenjang (2026-09-17).
--
-- Konteks: keputusan pemilik produk adalah langsung mengaktifkan TKA SD & SMA tanpa menunggu
-- kelengkapan konten. Catatan penting (jangan diabaikan sebelum production GO):
--   * TKA **SD**: pass sudah ACTIVE dan track SD sudah punya 6 exam.
--   * TKA **SMA**: pass diaktifkan di sini, tetapi track SMA **belum punya exam** (0) sehingga
--     pembeli belum bisa mengerjakan apa pun. Produksi tetap belum mengaktifkan pembayaran, jadi
--     aktivasi ini hanya berlaku di staging sampai SMA punya konten.
--   * Bundle `TKA_PASS_ALL_30/90` meng-grant fitur TKA SD+SMP+SMA; karena itu ikut terdampak.
-- 1. Pass SMA: aktifkan + harga setara SD/SMP (Rp29.000 / Rp69.000)
UPDATE
  public.products
SET
  status = 'ACTIVE',
  updated_at = now()
WHERE
  code IN ('TKA_SMA_PASS_30', 'TKA_SMA_PASS_90')
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
    VALUES ('TKA_SMA_PASS_30', 29000.00::numeric),
      ('TKA_SMA_PASS_90', 69000.00::numeric)) AS v (code, amount) ON v.code = p.code
WHERE
  NOT EXISTS (
    SELECT
      1
    FROM
      public.product_prices pp
    WHERE
      pp.product_id = p.id);

-- 2. Bundle lintas jenjang: aktifkan produk + harga yang sudah disiapkan (DRAFT → ACTIVE)
UPDATE
  public.products
SET
  status = 'ACTIVE',
  updated_at = now()
WHERE
  code IN ('TKA_PASS_ALL_30', 'TKA_PASS_ALL_90')
  AND status IS DISTINCT FROM 'ACTIVE';

UPDATE
  public.product_prices pp
SET
  status = 'ACTIVE'
FROM
  public.products p
WHERE
  p.id = pp.product_id
  AND p.code IN ('TKA_PASS_ALL_30', 'TKA_PASS_ALL_90')
  AND upper(pp.status) <> 'ACTIVE';
