-- Kebijakan monetisasi CPNS + TKA pada satu akun (2026-09-17).
--
-- Keputusan produk:
--   * Token dipisah per program → grant token produk CPNS memakai wallet `exam_token_cpns`.
--   * Pass CPNS diaktifkan (jual) → `CPNS_PASS_30/90` ACTIVE + harga, dan exam CPNS tersambung
--     ke fitur pass sehingga pemegang pass tidak dipotong token (token tetap berlaku tanpa pass).
--   * Bundle lintas jenjang TKA disiapkan (`TKA_PASS_ALL_30/90`) — masih DRAFT karena konten SD/SMA
--     belum live; harga juga DRAFT supaya tidak bisa dibeli sebelum diaktifkan.

-- 1. Grant token mengikuti program
update public.product_wallet_grants g
   set wallet_type = 'exam_token_cpns'
  from public.products p
 where p.id = g.product_id
   and p.code like 'CPNS_TOKEN_%'
   and g.wallet_type = 'exam_token';

-- 2. Pass CPNS: aktifkan + harga awal (Rp39.000 / 30 hari, Rp89.000 / 90 hari)
update public.products
   set status = 'ACTIVE',
       updated_at = now()
 where code in ('CPNS_PASS_30', 'CPNS_PASS_90')
   and status is distinct from 'ACTIVE';

insert into public.product_prices (product_id, currency, amount, starts_at, ends_at, status)
select p.id, 'IDR', v.amount, now(), null, 'ACTIVE'
  from public.products p
  join (values
        ('CPNS_PASS_30', 39000.00::numeric),
        ('CPNS_PASS_90', 89000.00::numeric)
       ) as v(code, amount) on v.code = p.code
 where not exists (
        select 1 from public.product_prices pp
         where pp.product_id = p.id
           and upper(pp.status) = 'ACTIVE'
       );

-- 3. Exam CPNS: sambungkan ke fitur pass sesuai tipe exam (pass = bypass token)
update public.exams e
   set required_feature_id = f.id
  from public.exam_types et,
       public.features f,
       public.programs pr
 where et.id = e.exam_type_id
   and pr.id = e.program_id
   and pr.code = 'CPNS'
   and e.required_feature_id is null
   and f.code = case upper(et.code)
                    when 'FULL_TRYOUT' then 'cpns.full_tryout.regular'
                    when 'MINI_TRYOUT' then 'cpns.mini_tryout.unlimited'
                    when 'DRILL' then 'cpns.drill.unlimited'
                    else null
                end;

-- 4. Bundle lintas jenjang TKA (SD + SMP + SMA) — produk DRAFT, menunggu konten SD/SMA live
insert into public.products (code, name, description, product_type, program_id, track_id, duration_days, status)
select v.code, v.name, v.description, 'PASS', pr.id, null, v.duration_days, 'DRAFT'
  from public.programs pr
  join (values
        ('TKA_PASS_ALL_30', 'Tempur Pass TKA Semua Jenjang 30 Hari',
         'Akses Tempur Pass untuk TKA SD, SMP, dan SMA sekaligus selama 30 hari.', 30),
        ('TKA_PASS_ALL_90', 'Tempur Pass TKA Semua Jenjang 90 Hari',
         'Akses Tempur Pass untuk TKA SD, SMP, dan SMA sekaligus selama 90 hari.', 90)
       ) as v(code, name, description, duration_days) on true
 where pr.code = 'TKA'
   and not exists (select 1 from public.products p where p.code = v.code);

-- 4a. Bundle memberi seluruh fitur TKA (semua jenjang)
insert into public.product_features (product_id, feature_id, limit_value)
select p.id, f.id, null
  from public.products p
  join public.features f on f.code like 'tka.%'
 where p.code in ('TKA_PASS_ALL_30', 'TKA_PASS_ALL_90')
   and not exists (
        select 1 from public.product_features pf
         where pf.product_id = p.id and pf.feature_id = f.id
       );

-- 4b. Harga bundle disiapkan sebagai DRAFT (tidak bisa dibeli sebelum produk diaktifkan)
insert into public.product_prices (product_id, currency, amount, starts_at, ends_at, status)
select p.id, 'IDR', v.amount, now(), null, 'DRAFT'
  from public.products p
  join (values
        ('TKA_PASS_ALL_30', 79000.00::numeric),
        ('TKA_PASS_ALL_90', 179000.00::numeric)
       ) as v(code, amount) on v.code = p.code
 where not exists (select 1 from public.product_prices pp where pp.product_id = p.id);
