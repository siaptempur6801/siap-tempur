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
update public.products
   set status = 'ACTIVE',
       updated_at = now()
 where code in ('TKA_SMA_PASS_30', 'TKA_SMA_PASS_90')
   and status is distinct from 'ACTIVE';

insert into public.product_prices (product_id, currency, amount, starts_at, ends_at, status)
select p.id, 'IDR', v.amount, now(), null, 'ACTIVE'
  from public.products p
  join (values
        ('TKA_SMA_PASS_30', 29000.00::numeric),
        ('TKA_SMA_PASS_90', 69000.00::numeric)
       ) as v(code, amount) on v.code = p.code
 where not exists (
        select 1 from public.product_prices pp
         where pp.product_id = p.id
       );

-- 2. Bundle lintas jenjang: aktifkan produk + harga yang sudah disiapkan (DRAFT → ACTIVE)
update public.products
   set status = 'ACTIVE',
       updated_at = now()
 where code in ('TKA_PASS_ALL_30', 'TKA_PASS_ALL_90')
   and status is distinct from 'ACTIVE';

update public.product_prices pp
   set status = 'ACTIVE'
  from public.products p
 where p.id = pp.product_id
   and p.code in ('TKA_PASS_ALL_30', 'TKA_PASS_ALL_90')
   and upper(pp.status) <> 'ACTIVE';
