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

update public.products
   set status = upper(status)
 where status <> upper(status);

update public.product_prices
   set status = upper(status)
 where status <> upper(status);

-- Kunci bentuk kanoniknya supaya tidak terulang. Constraint ini tidak membatasi daftar nilai,
-- hanya mewajibkan huruf besar.
alter table public.products
    drop constraint if exists products_status_uppercase_check;
alter table public.products
    add constraint products_status_uppercase_check check (status = upper(status));

alter table public.product_prices
    drop constraint if exists product_prices_status_uppercase_check;
alter table public.product_prices
    add constraint product_prices_status_uppercase_check check (status = upper(status));
