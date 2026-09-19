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
create or replace function public.admin_entitlement_overview()
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
    v_actor uuid := auth.uid();
begin
    if v_actor is null then
        raise exception 'Authentication required';
    end if;

    if not app_private.current_user_has_permission('entitlement.manage') then
        raise exception 'Entitlement manage permission required';
    end if;

    return jsonb_build_object(
        'wallets', coalesce((
            select jsonb_agg(jsonb_build_object(
                'wallet_type', w.wallet_type,
                'wallets', w.wallets,
                'balance', w.balance
            ) order by w.wallet_type)
              from (
                select wallet_type, count(*) as wallets, coalesce(sum(balance), 0) as balance
                  from public.wallets group by wallet_type
              ) w
        ), '[]'::jsonb),
        'transactions_total', (select count(*) from public.wallet_transactions),
        'transactions_30d', (select count(*) from public.wallet_transactions where created_at > now() - interval '30 days'),
        'vouchers_total', (select count(*) from public.vouchers),
        'vouchers_active', (select count(*) from public.vouchers where is_active),
        'voucher_claims', (select count(*) from public.voucher_claims),
        'entitlements_total', (select count(*) from public.entitlements),
        'entitlements_active', (select count(*) from public.entitlements where status = 'active')
    );
end;
$function$;

-- -----------------------------------------------------------------------------
-- 2. Daftar dompet per pengguna. Permission: entitlement.manage.
-- -----------------------------------------------------------------------------
create or replace function public.admin_list_wallets(
    p_search      text default null,
    p_wallet_type text default null,
    p_limit       integer default 50,
    p_offset      integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
    v_actor uuid := auth.uid();
    v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 200);
    v_offset integer := greatest(coalesce(p_offset, 0), 0);
    v_rows jsonb;
    v_total integer := 0;
begin
    if v_actor is null then
        raise exception 'Authentication required';
    end if;

    if not app_private.current_user_has_permission('entitlement.manage') then
        raise exception 'Entitlement manage permission required';
    end if;

    with filtered as (
        select
            w.id,
            w.user_id,
            w.wallet_type,
            w.balance,
            w.updated_at,
            pr.full_name,
            pr.display_name,
            au.email::text as email
          from public.wallets w
          left join public.profiles pr on pr.id = w.user_id
          left join auth.users au on au.id = w.user_id
         where (p_wallet_type is null or p_wallet_type = '' or w.wallet_type = p_wallet_type)
           and (p_search is null or p_search = ''
                or pr.full_name ilike '%' || p_search || '%'
                or pr.display_name ilike '%' || p_search || '%'
                or au.email ilike '%' || p_search || '%')
    ), paged as (
        select f.*, count(*) over () as total_count
          from filtered f
         order by f.balance desc, f.updated_at desc
         limit v_limit offset v_offset
    )
    select
        coalesce(jsonb_agg(to_jsonb(paged) - 'total_count'), '[]'::jsonb),
        coalesce(max(paged.total_count), 0)
      into v_rows, v_total
      from paged;

    return jsonb_build_object('wallets', v_rows, 'total', v_total);
end;
$function$;

-- -----------------------------------------------------------------------------
-- 3. Riwayat transaksi dompet. Permission: entitlement.manage.
-- -----------------------------------------------------------------------------
create or replace function public.admin_list_wallet_transactions(
    p_user_id     uuid default null,
    p_wallet_type text default null,
    p_limit       integer default 50,
    p_offset      integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
    v_actor uuid := auth.uid();
    v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 200);
    v_offset integer := greatest(coalesce(p_offset, 0), 0);
    v_rows jsonb;
    v_total integer := 0;
begin
    if v_actor is null then
        raise exception 'Authentication required';
    end if;

    if not app_private.current_user_has_permission('entitlement.manage') then
        raise exception 'Entitlement manage permission required';
    end if;

    with filtered as (
        select
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
          from public.wallet_transactions t
          join public.wallets w on w.id = t.wallet_id
         where (p_user_id is null or w.user_id = p_user_id)
           and (p_wallet_type is null or p_wallet_type = '' or w.wallet_type = p_wallet_type)
    ), paged as (
        select f.*, count(*) over () as total_count
          from filtered f
         order by f.created_at desc, f.id desc
         limit v_limit offset v_offset
    )
    select
        coalesce(jsonb_agg(to_jsonb(paged) - 'total_count'), '[]'::jsonb),
        coalesce(max(paged.total_count), 0)
      into v_rows, v_total
      from paged;

    return jsonb_build_object('transactions', v_rows, 'total', v_total);
end;
$function$;

-- -----------------------------------------------------------------------------
-- 4. Sesuaikan saldo dompet. Permission: entitlement.manage.
--    PENJAGA: lihat catatan di kepala file. Setiap penyesuaian WAJIB beralasan
--    dan meninggalkan baris wallet_transactions.
-- -----------------------------------------------------------------------------
create or replace function public.admin_adjust_wallet(
    p_user_id     uuid,
    p_wallet_type text,
    p_amount      integer,
    p_reason      text
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
    v_actor        uuid := auth.uid();
    v_wallet_type  text := btrim(coalesce(p_wallet_type, ''));
    v_reason       text := btrim(coalesce(p_reason, ''));
    v_amount       integer := coalesce(p_amount, 0);
    v_wallet_id    uuid;
    v_balance      integer;
    v_new_balance  integer;
begin
    if v_actor is null then
        raise exception 'Authentication required';
    end if;

    if not app_private.current_user_has_permission('entitlement.manage') then
        raise exception 'Entitlement manage permission required';
    end if;

    if p_user_id is null then
        raise exception 'User is required';
    end if;

    -- Penjaga 1: tidak boleh menyesuaikan dompet sendiri. Token bernilai uang,
    -- jadi mem bolehkan ini sama dengan memberi akses cetak uang.
    if p_user_id = v_actor then
        raise exception 'Cannot adjust your own wallet';
    end if;

    if v_wallet_type not in ('exam_token_cpns', 'exam_token_tka', 'exam_token') then
        raise exception 'Unknown wallet type';
    end if;

    -- Penjaga 2: jumlah harus masuk akal.
    if v_amount = 0 then
        raise exception 'Amount must not be zero';
    end if;
    if abs(v_amount) > 1000000 then
        raise exception 'Amount exceeds the per-adjustment limit';
    end if;

    -- Penjaga 4: alasan wajib.
    if length(v_reason) < 3 then
        raise exception 'A reason of at least 3 characters is required';
    end if;

    if not exists (select 1 from public.profiles where id = p_user_id) then
        raise exception 'User profile not found';
    end if;

    -- Kunci dompet supaya dua penyesuaian bersamaan tidak saling menimpa.
    select id, balance into v_wallet_id, v_balance
      from public.wallets
     where user_id = p_user_id and wallet_type = v_wallet_type
     for update;

    if v_wallet_id is null then
        insert into public.wallets (user_id, wallet_type, balance)
        values (p_user_id, v_wallet_type, 0)
        returning id, balance into v_wallet_id, v_balance;
    end if;

    v_new_balance := v_balance + v_amount;

    -- Penjaga 3: saldo tidak boleh negatif.
    if v_new_balance < 0 then
        raise exception 'Adjustment would make the balance negative';
    end if;

    update public.wallets
       set balance = v_new_balance,
           updated_at = now()
     where id = v_wallet_id;

    insert into public.wallet_transactions (wallet_id, type, amount, source_type, source_id, balance_after)
    values (
        v_wallet_id,
        case when v_amount > 0 then 'credit' else 'debit' end,
        v_amount,
        'admin_adjustment',
        null,
        v_new_balance
    );

    return jsonb_build_object(
        'user_id', p_user_id,
        'wallet_type', v_wallet_type,
        'amount', v_amount,
        'previous_balance', v_balance,
        'balance', v_new_balance,
        'reason', v_reason
    );
end;
$function$;

-- -----------------------------------------------------------------------------
-- 5. Daftar voucher + jumlah klaimnya. Permission: entitlement.manage.
-- -----------------------------------------------------------------------------
create or replace function public.admin_list_vouchers()
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
    v_actor uuid := auth.uid();
    v_rows jsonb;
begin
    if v_actor is null then
        raise exception 'Authentication required';
    end if;

    if not app_private.current_user_has_permission('entitlement.manage') then
        raise exception 'Entitlement manage permission required';
    end if;

    select coalesce(jsonb_agg(voucher_row order by voucher_row->>'code'), '[]'::jsonb) into v_rows
      from (
        select jsonb_build_object(
            'id', v.id,
            'code', v.code,
            'quota_amount', v.quota_amount,
            'max_uses', v.max_uses,
            'used_count', v.used_count,
            'expires_at', v.expires_at,
            'is_active', v.is_active,
            'wallet_type', v.wallet_type,
            'created_at', v.created_at,
            'claims', (select count(*) from public.voucher_claims c where c.voucher_id = v.id),
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
                select count(*) from public.wallet_transactions t
                 where t.source_type = 'voucher' and t.source_id = v.id
            ),
            'tokens_granted', case
                when exists (
                    select 1 from public.wallet_transactions t
                     where t.source_type = 'voucher' and t.source_id = v.id
                ) then coalesce((
                    select sum(t.amount) from public.wallet_transactions t
                     where t.source_type = 'voucher' and t.source_id = v.id
                ), 0)
                else (
                    select count(*) from public.voucher_claims c where c.voucher_id = v.id
                ) * v.quota_amount
            end,
            'tokens_source', case
                when exists (
                    select 1 from public.wallet_transactions t
                     where t.source_type = 'voucher' and t.source_id = v.id
                ) then 'ledger'
                else 'estimated'
            end
        ) as voucher_row
          from public.vouchers v
      ) x;

    return jsonb_build_object('vouchers', v_rows);
end;
$function$;

-- -----------------------------------------------------------------------------
-- 6. Buat / ubah voucher. Permission: entitlement.manage.
--    PENJAGA: kuota tidak boleh lebih kecil dari yang SUDAH diklaim, dan
--    `max_uses` tidak boleh lebih kecil dari `used_count`. Tanpa itu, mengubah
--    voucher bisa membuat data klaim yang sudah ada menjadi tidak konsisten.
-- -----------------------------------------------------------------------------
create or replace function public.admin_upsert_voucher(
    p_id           uuid,
    p_code         text,
    p_quota_amount integer,
    p_max_uses     integer,
    p_expires_at   timestamptz,
    p_is_active    boolean,
    p_wallet_type  text
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
    v_actor        uuid := auth.uid();
    v_code         text := upper(btrim(coalesce(p_code, '')));
    v_wallet_type  text := nullif(btrim(coalesce(p_wallet_type, '')), '');
    v_id           uuid := p_id;
    v_used         integer := 0;
    v_claim_count  integer := 0;
begin
    if v_actor is null then
        raise exception 'Authentication required';
    end if;

    if not app_private.current_user_has_permission('entitlement.manage') then
        raise exception 'Entitlement manage permission required';
    end if;

    if v_code !~ '^[A-Z0-9][A-Z0-9_-]{2,31}$' then
        raise exception 'Voucher code must be 3-32 characters of A-Z, 0-9, _ or -';
    end if;

    if coalesce(p_quota_amount, 0) <= 0 then
        raise exception 'Quota must be greater than zero';
    end if;

    if coalesce(p_max_uses, 0) <= 0 then
        raise exception 'Max uses must be greater than zero';
    end if;

    if v_wallet_type is not null and v_wallet_type not in ('exam_token_cpns', 'exam_token_tka') then
        raise exception 'Unknown wallet type';
    end if;

    if v_id is null then
        insert into public.vouchers (code, quota_amount, max_uses, expires_at, is_active, wallet_type)
        values (v_code, p_quota_amount, p_max_uses, p_expires_at, coalesce(p_is_active, true), v_wallet_type)
        returning id into v_id;
    else
        select used_count into v_used from public.vouchers where id = v_id for update;
        if v_used is null then
            raise exception 'Voucher not found';
        end if;

        select count(*) into v_claim_count from public.voucher_claims where voucher_id = v_id;

        if p_max_uses < v_used then
            raise exception 'Max uses cannot be lower than the % times already used', v_used;
        end if;
        if p_quota_amount < 0 then
            raise exception 'Quota must not be negative';
        end if;

        -- Voucher yang sudah diklaim tidak boleh diubah kodenya: pengguna
        -- memegang kode itu, dan mengubahnya membuat klaim lama menunjuk kode
        -- yang tidak pernah mereka pakai.
        if v_claim_count > 0 and v_code <> (select code from public.vouchers where id = v_id) then
            raise exception 'Cannot change the code of a voucher that already has claims';
        end if;

        update public.vouchers
           set code = v_code,
               quota_amount = p_quota_amount,
               max_uses = p_max_uses,
               expires_at = p_expires_at,
               is_active = coalesce(p_is_active, is_active),
               wallet_type = v_wallet_type,
               updated_at = now()
         where id = v_id;
    end if;

    return jsonb_build_object(
        'id', v_id,
        'code', v_code,
        'claims', v_claim_count,
        'used_count', v_used
    );
end;
$function$;

-- -----------------------------------------------------------------------------
-- 7. Daftar entitlement (pass) per pengguna. Permission: entitlement.manage.
-- -----------------------------------------------------------------------------
create or replace function public.admin_list_entitlements(
    p_search text default null,
    p_status text default null,
    p_limit  integer default 50,
    p_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
    v_actor uuid := auth.uid();
    v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 200);
    v_offset integer := greatest(coalesce(p_offset, 0), 0);
    v_rows jsonb;
    v_total integer := 0;
begin
    if v_actor is null then
        raise exception 'Authentication required';
    end if;

    if not app_private.current_user_has_permission('entitlement.manage') then
        raise exception 'Entitlement manage permission required';
    end if;

    with filtered as (
        select
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
            f.code as feature_code,
            f.name as feature_name,
            pr.full_name,
            pr.display_name,
            au.email::text as email
          from public.entitlements e
          left join public.features f on f.id = e.feature_id
          left join public.profiles pr on pr.id = e.user_id
          left join auth.users au on au.id = e.user_id
         where (p_status is null or p_status = '' or e.status = p_status)
           and (p_search is null or p_search = ''
                or pr.full_name ilike '%' || p_search || '%'
                or pr.display_name ilike '%' || p_search || '%'
                or au.email ilike '%' || p_search || '%'
                or f.code ilike '%' || p_search || '%')
    ), paged as (
        select f.*, count(*) over () as total_count
          from filtered f
         order by f.created_at desc, f.id
         limit v_limit offset v_offset
    )
    select
        coalesce(jsonb_agg(to_jsonb(paged) - 'total_count'), '[]'::jsonb),
        coalesce(max(paged.total_count), 0)
      into v_rows, v_total
      from paged;

    return jsonb_build_object('entitlements', v_rows, 'total', v_total);
end;
$function$;

-- -----------------------------------------------------------------------------
-- 8. Semua konfigurasi platform dalam satu panggilan.
--    Permission: settings.manage.
--
--    Digabung karena halaman Settings menampilkan kelimanya sekaligus; lima
--    perjalanan bolak-balik ke database untuk satu halaman hanya menambah
--    waktu muat tanpa manfaat.
-- -----------------------------------------------------------------------------
create or replace function public.admin_list_settings()
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
    v_actor uuid := auth.uid();
begin
    if v_actor is null then
        raise exception 'Authentication required';
    end if;

    if not app_private.current_user_has_permission('settings.manage') then
        raise exception 'Settings manage permission required';
    end if;

    return jsonb_build_object(
        'feature_flags', coalesce((
            select jsonb_agg(jsonb_build_object(
                'id', ff.id, 'key', ff.key, 'name', ff.name, 'enabled', ff.enabled,
                'rollout_percentage', ff.rollout_percentage, 'config', ff.config
            ) order by ff.key)
              from public.feature_flags ff
        ), '[]'::jsonb),
        'features', coalesce((
            select jsonb_agg(jsonb_build_object(
                'id', f.id, 'code', f.code, 'name', f.name, 'description', f.description,
                'entitlements', (select count(*) from public.entitlements e where e.feature_id = f.id)
            ) order by f.code)
              from public.features f
        ), '[]'::jsonb),
        'certificate_templates', coalesce((
            select jsonb_agg(jsonb_build_object(
                'id', ct.id, 'name', ct.name, 'template_url', ct.template_url,
                'config', ct.config, 'created_at', ct.created_at,
                'certificates', (select count(*) from public.certificates c where c.template_id = ct.id)
            ) order by ct.name)
              from public.certificate_templates ct
        ), '[]'::jsonb),
        'periods', coalesce((
            select jsonb_agg(jsonb_build_object(
                'id', p.id, 'code', p.code, 'name', p.name,
                'start_date', p.start_date, 'end_date', p.end_date, 'status', p.status
            ) order by p.start_date desc)
              from public.periods p
        ), '[]'::jsonb),
        'track_periods', coalesce((
            select jsonb_agg(jsonb_build_object(
                'id', tp.id, 'is_active', tp.is_active,
                'track_code', t.code, 'program_code', pr.code,
                'period_code', p.code, 'period_name', p.name,
                'start_date', p.start_date, 'end_date', p.end_date
            ) order by pr.code, t.code)
              from public.track_periods tp
              join public.tracks t on t.id = tp.track_id
              join public.programs pr on pr.id = t.program_id
              left join public.periods p on p.id = tp.period_id
        ), '[]'::jsonb),
        'system_settings', coalesce((
            select jsonb_agg(jsonb_build_object(
                'key', s.key, 'value', s.value, 'updated_at', s.updated_at,
                'updated_by_name', pr.full_name
            ) order by s.key)
              from public.system_settings s
              left join public.profiles pr on pr.id = s.updated_by
        ), '[]'::jsonb)
    );
end;
$function$;

-- -----------------------------------------------------------------------------
-- 9. Buat / ubah feature flag. Permission: settings.manage.
-- -----------------------------------------------------------------------------
create or replace function public.admin_upsert_feature_flag(
    p_id                 uuid,
    p_key                text,
    p_name               text,
    p_enabled            boolean,
    p_rollout_percentage integer
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
    v_actor   uuid := auth.uid();
    v_key     text := btrim(coalesce(p_key, ''));
    v_name    text := btrim(coalesce(p_name, ''));
    v_rollout integer := coalesce(p_rollout_percentage, 0);
    v_id      uuid := p_id;
begin
    if v_actor is null then
        raise exception 'Authentication required';
    end if;

    if not app_private.current_user_has_permission('settings.manage') then
        raise exception 'Settings manage permission required';
    end if;

    if v_key !~ '^[a-z0-9][a-z0-9_.-]{1,63}$' then
        raise exception 'Flag key must be 2-64 characters of a-z, 0-9, _ . or -';
    end if;

    if length(v_name) < 2 then
        raise exception 'Flag name is required';
    end if;

    if v_rollout < 0 or v_rollout > 100 then
        raise exception 'Rollout percentage must be between 0 and 100';
    end if;

    if v_id is null then
        insert into public.feature_flags (key, name, enabled, rollout_percentage)
        values (v_key, v_name, coalesce(p_enabled, false), v_rollout)
        returning id into v_id;
    else
        if not exists (select 1 from public.feature_flags where id = v_id) then
            raise exception 'Feature flag not found';
        end if;

        update public.feature_flags
           set key = v_key,
               name = v_name,
               enabled = coalesce(p_enabled, enabled),
               rollout_percentage = v_rollout
         where id = v_id;
    end if;

    return jsonb_build_object('id', v_id, 'key', v_key, 'enabled', coalesce(p_enabled, false), 'rollout_percentage', v_rollout);
end;
$function$;

-- -----------------------------------------------------------------------------
-- 10. Ubah template sertifikat. Permission: settings.manage.
--     PENJAGA: template yang sudah dipakai sertifikat terbit tidak boleh
--     kehilangan `template_url`-nya — sertifikat lama akan gagal dirender ulang.
-- -----------------------------------------------------------------------------
create or replace function public.admin_upsert_certificate_template(
    p_id           uuid,
    p_name         text,
    p_template_url text,
    p_config       jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
    v_actor    uuid := auth.uid();
    v_name     text := btrim(coalesce(p_name, ''));
    v_url      text := nullif(btrim(coalesce(p_template_url, '')), '');
    v_in_use   integer := 0;
begin
    if v_actor is null then
        raise exception 'Authentication required';
    end if;

    if not app_private.current_user_has_permission('settings.manage') then
        raise exception 'Settings manage permission required';
    end if;

    if p_id is null then
        raise exception 'Certificate template id is required';
    end if;

    if length(v_name) < 2 then
        raise exception 'Template name is required';
    end if;

    if not exists (select 1 from public.certificate_templates where id = p_id) then
        raise exception 'Certificate template not found';
    end if;

    select count(*) into v_in_use from public.certificates where template_id = p_id;

    if v_url is null and v_in_use > 0 then
        raise exception 'Cannot clear the template URL: % certificates already use this template', v_in_use;
    end if;

    update public.certificate_templates
       set name = v_name,
           template_url = coalesce(v_url, template_url),
           config = coalesce(p_config, config)
     where id = p_id;

    return jsonb_build_object('id', p_id, 'name', v_name, 'certificates_in_use', v_in_use);
end;
$function$;

-- -----------------------------------------------------------------------------
-- 11. Aktifkan / nonaktifkan track period. Permission: settings.manage.
-- -----------------------------------------------------------------------------
create or replace function public.admin_set_track_period_active(
    p_track_period_id uuid,
    p_is_active       boolean
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
    v_actor   uuid := auth.uid();
    v_updated integer := 0;
begin
    if v_actor is null then
        raise exception 'Authentication required';
    end if;

    if not app_private.current_user_has_permission('settings.manage') then
        raise exception 'Settings manage permission required';
    end if;

    update public.track_periods
       set is_active = coalesce(p_is_active, false),
           updated_at = now()
     where id = p_track_period_id;
    get diagnostics v_updated = row_count;

    if v_updated = 0 then
        raise exception 'Track period not found';
    end if;

    return jsonb_build_object('id', p_track_period_id, 'is_active', coalesce(p_is_active, false));
end;
$function$;

-- -----------------------------------------------------------------------------
-- 12. Tulis / hapus system setting (key-value). Permission: settings.manage.
--     Nilai disimpan sebagai jsonb, jadi angka, boolean, dan objek sama-sama sah.
-- -----------------------------------------------------------------------------
create or replace function public.admin_upsert_system_setting(p_key text, p_value jsonb)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
    v_actor uuid := auth.uid();
    v_key   text := btrim(coalesce(p_key, ''));
begin
    if v_actor is null then
        raise exception 'Authentication required';
    end if;

    if not app_private.current_user_has_permission('settings.manage') then
        raise exception 'Settings manage permission required';
    end if;

    if v_key !~ '^[a-z0-9][a-z0-9_.-]{1,63}$' then
        raise exception 'Setting key must be 2-64 characters of a-z, 0-9, _ . or -';
    end if;

    if p_value is null then
        raise exception 'Setting value is required';
    end if;

    insert into public.system_settings (key, value, updated_by, updated_at)
    values (v_key, p_value, v_actor, now())
    on conflict (key) do update
       set value = excluded.value,
           updated_by = excluded.updated_by,
           updated_at = now();

    return jsonb_build_object('key', v_key, 'value', p_value);
end;
$function$;

create or replace function public.admin_delete_system_setting(p_key text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
    v_actor   uuid := auth.uid();
    v_deleted integer := 0;
begin
    if v_actor is null then
        raise exception 'Authentication required';
    end if;

    if not app_private.current_user_has_permission('settings.manage') then
        raise exception 'Settings manage permission required';
    end if;

    delete from public.system_settings where key = btrim(coalesce(p_key, ''));
    get diagnostics v_deleted = row_count;

    return jsonb_build_object('key', p_key, 'deleted', v_deleted > 0);
end;
$function$;

-- -----------------------------------------------------------------------------
-- ACL: `anon` tidak diberi akses; setiap fungsi memeriksa permission sendiri.
-- -----------------------------------------------------------------------------
revoke all on function public.admin_entitlement_overview() from public, anon;
revoke all on function public.admin_list_wallets(text, text, integer, integer) from public, anon;
revoke all on function public.admin_list_wallet_transactions(uuid, text, integer, integer) from public, anon;
revoke all on function public.admin_adjust_wallet(uuid, text, integer, text) from public, anon;
revoke all on function public.admin_list_vouchers() from public, anon;
revoke all on function public.admin_upsert_voucher(uuid, text, integer, integer, timestamptz, boolean, text) from public, anon;
revoke all on function public.admin_list_entitlements(text, text, integer, integer) from public, anon;
revoke all on function public.admin_list_settings() from public, anon;
revoke all on function public.admin_upsert_feature_flag(uuid, text, text, boolean, integer) from public, anon;
revoke all on function public.admin_upsert_certificate_template(uuid, text, text, jsonb) from public, anon;
revoke all on function public.admin_set_track_period_active(uuid, boolean) from public, anon;
revoke all on function public.admin_upsert_system_setting(text, jsonb) from public, anon;
revoke all on function public.admin_delete_system_setting(text) from public, anon;

grant execute on function public.admin_entitlement_overview() to authenticated;
grant execute on function public.admin_list_wallets(text, text, integer, integer) to authenticated;
grant execute on function public.admin_list_wallet_transactions(uuid, text, integer, integer) to authenticated;
grant execute on function public.admin_adjust_wallet(uuid, text, integer, text) to authenticated;
grant execute on function public.admin_list_vouchers() to authenticated;
grant execute on function public.admin_upsert_voucher(uuid, text, integer, integer, timestamptz, boolean, text) to authenticated;
grant execute on function public.admin_list_entitlements(text, text, integer, integer) to authenticated;
grant execute on function public.admin_list_settings() to authenticated;
grant execute on function public.admin_upsert_feature_flag(uuid, text, text, boolean, integer) to authenticated;
grant execute on function public.admin_upsert_certificate_template(uuid, text, text, jsonb) to authenticated;
grant execute on function public.admin_set_track_period_active(uuid, boolean) to authenticated;
grant execute on function public.admin_upsert_system_setting(text, jsonb) to authenticated;
grant execute on function public.admin_delete_system_setting(text) to authenticated;
