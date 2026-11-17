-- Seragamkan status produk & harga + jaga agar tidak campur kapital (2026-09-17).
--
-- Temuan: `products` dan `product_prices` berisi campuran `ACTIVE` (10 baris) dan `active`
-- (3 baris) karena penulis berbeda memakai kapital berbeda. Kode sebenarnya sudah toleran
-- (`.in('status', ['active','ACTIVE'])`), tetapi campuran ini membuat query/laporan mudah salah
-- filter — dan sempat membuat katalog paket token tidak terbaca.
--
-- Keputusan: `ACTIVE` (huruf besar) sebagai bentuk kanonik untuk kedua tabel ini, karena mayoritas
-- baris sudah huruf besar. Tabel lain (entitlements, exams, articles, orders) konsisten huruf kecil
-- dan tidak diubah di sini.
UPDATE
  public.products
SET
  status = upper(status)
WHERE
  status <> upper(status);

UPDATE
  public.product_prices
SET
  status = upper(status)
WHERE
  status <> upper(status);

-- Kunci bentuk kanoniknya supaya tidak terulang. Constraint ini tidak membatasi daftar nilai,
-- hanya mewajibkan huruf besar.
ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_status_uppercase_check;

ALTER TABLE public.products
  ADD CONSTRAINT products_status_uppercase_check CHECK (status = upper(status));

ALTER TABLE public.product_prices
  DROP CONSTRAINT IF EXISTS product_prices_status_uppercase_check;

ALTER TABLE public.product_prices
  ADD CONSTRAINT product_prices_status_uppercase_check CHECK (status = upper(status));
