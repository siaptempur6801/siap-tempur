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

do $$
declare
    v_program uuid;
    v_track   uuid;
    v_source  uuid;
    v_new     uuid;
begin
    select p.program_id, p.track_id, p.id
      into v_program, v_track, v_source
      from public.products p
     where p.code = 'CPNS_PASS_30';

    if v_source is null then
        raise notice 'CPNS_PASS_30 tidak ditemukan — migrasi tangga harga dilewati';
        return;
    end if;

    -- ---------------------------------------------------------------- paket 7 hari
    insert into public.products (code, name, description, product_type, program_id, track_id, duration_days, status)
    values (
        'CPNS_PASS_7',
        'Tempur Pass CPNS 7 Hari',
        'Akses penuh fitur belajar CPNS selama 7 hari: Mini Tryout dan Full Tryout tanpa token per sesi.',
        'PASS', v_program, v_track, 7, 'ACTIVE'
    )
    on conflict (code) do update
        set name = excluded.name,
            description = excluded.description,
            product_type = excluded.product_type,
            program_id = excluded.program_id,
            track_id = excluded.track_id,
            duration_days = excluded.duration_days,
            status = excluded.status
    returning id into v_new;

    if v_new is null then
        select id into v_new from public.products where code = 'CPNS_PASS_7';
    end if;

    insert into public.product_features (product_id, feature_id, limit_value)
    select v_new, pf.feature_id, pf.limit_value
      from public.product_features pf
     where pf.product_id = v_source
    on conflict (product_id, feature_id) do nothing;

    insert into public.product_prices (product_id, currency, amount, starts_at, ends_at, status)
    select v_new, 'IDR', 19000, now(), null, 'ACTIVE'
     where not exists (
        select 1 from public.product_prices pp
         where pp.product_id = v_new and pp.status = 'ACTIVE'
     );

    -- -------------------------------------------------------------- paket 180 hari
    insert into public.products (code, name, description, product_type, program_id, track_id, duration_days, status)
    values (
        'CPNS_PASS_180',
        'Tempur Pass CPNS 180 Hari',
        'Akses penuh fitur belajar CPNS selama 180 hari — pilihan paling hemat untuk persiapan panjang.',
        'PASS', v_program, v_track, 180, 'ACTIVE'
    )
    on conflict (code) do update
        set name = excluded.name,
            description = excluded.description,
            product_type = excluded.product_type,
            program_id = excluded.program_id,
            track_id = excluded.track_id,
            duration_days = excluded.duration_days,
            status = excluded.status
    returning id into v_new;

    if v_new is null then
        select id into v_new from public.products where code = 'CPNS_PASS_180';
    end if;

    insert into public.product_features (product_id, feature_id, limit_value)
    select v_new, pf.feature_id, pf.limit_value
      from public.product_features pf
     where pf.product_id = v_source
    on conflict (product_id, feature_id) do nothing;

    insert into public.product_prices (product_id, currency, amount, starts_at, ends_at, status)
    select v_new, 'IDR', 149000, now(), null, 'ACTIVE'
     where not exists (
        select 1 from public.product_prices pp
         where pp.product_id = v_new and pp.status = 'ACTIVE'
     );
end $$;
