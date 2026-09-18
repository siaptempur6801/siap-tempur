-- =============================================================================
-- Voucher: hidupkan kembali klaim voucher di Schema V2
--
-- LATAR
--   Fitur voucher dimatikan saat cutover Schema V2 tanpa penggantinya:
--   `claimVoucherCode()` di `app/actions/profile.ts` menjadi stub yang SELALU
--   gagal ("Voucher sedang dimigrasikan ke Promotions Schema V2..."), sementara
--   formnya masih tampil di halaman profil. Artinya pengguna melihat form yang
--   tidak mungkin berhasil.
--
--   Data lamanya utuh di `legacy_prod`: 6 voucher dan 310 klaim nyata
--   (PENGGUNABARU 122, SMAN2TANJUNGBALAI 143, GRATISDARIBAYU 38, dst).
--   Semua user pemilik klaim masih ada di `public.profiles` (0 hilang), dan
--   tidak ada pasangan voucher+user maupun voucher+email yang duplikat.
--
-- PERBEDAAN PENTING DARI SISTEM LAMA
--   1. Token TIDAK LAGI satu kolam. Schema V2 memisahkan saldo per program
--      (`programs.token_wallet_type`: `exam_token_cpns`, `exam_token_tka`).
--      Karena itu voucher kini menentukan wallet mana yang boleh diklaim.
--      Voucher lama diberi `wallet_type = null` yang berarti "keduanya boleh" —
--      persis perilaku lama, di mana token masuk ke kolam tunggal.
--
--   2. Kredit masuk ke `wallets.balance` + satu baris `wallet_transactions`
--      (pola yang sudah dipakai `debit_exam_token_once`), bukan lagi kolom
--      `profiles.tryout_quota` yang sudah tidak ada di Schema V2.
--
--   3. Idempoten. Sistem lama melempar error bila voucher yang sama diklaim dua
--      kali; sekarang klaim ulang mengembalikan `already_claimed = true` TANPA
--      menambah token lagi. Alasannya: pengguna yang jaringan-nya terputus tepat
--      setelah klaim berhasil akan mencoba lagi, dan tanpa idempotensi mereka
--      melihat "gagal" padahal tokennya sudah masuk. Pesan error lama tetap
--      disampaikan UI lewat flag ini.
--
-- KEAMANAN
--   - SECURITY DEFINER + `search_path = ''` (seluruh nama di-schema-qualify).
--   - Pemanggil hanya boleh mengklaim untuk dirinya sendiri: `auth.uid()` harus
--     sama dengan `p_user_id`, kecuali `service_role`.
--   - `voucher_claims.user_id` NOT NULL, dan RLS hanya mengizinkan pemilik
--     membaca klaimnya sendiri. `vouchers` TIDAK dapat dibaca klien sama sekali
--     (hanya lewat RPC) supaya daftar kode tidak bocor.
--   - Voucher dikunci (`for update`) selama klaim sehingga dua permintaan
--     bersamaan tidak bisa melampaui `max_uses`.
--
-- IDEMPOTEN (migration)
--   `create table if not exists`, `add column if not exists`, dan seed dengan
--   `on conflict ... do nothing`.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Tabel
-- -----------------------------------------------------------------------------
create table if not exists public.vouchers (
    id           uuid primary key default gen_random_uuid(),
    code         text not null unique,
    quota_amount integer not null default 1,
    max_uses     integer,
    used_count   integer not null default 0,
    expires_at   timestamptz,
    is_active    boolean not null default true,
    -- null = boleh diklaim untuk wallet program mana pun (perilaku voucher lama).
    wallet_type  text,
    created_at   timestamptz not null default now(),
    updated_at   timestamptz,
    constraint vouchers_quota_positive check (quota_amount > 0),
    constraint vouchers_max_uses_positive check (max_uses is null or max_uses > 0),
    constraint vouchers_used_non_negative check (used_count >= 0),
    constraint vouchers_wallet_type_check check (
        wallet_type is null or wallet_type in ('exam_token_cpns', 'exam_token_tka')
    )
);

create table if not exists public.voucher_claims (
    id         uuid primary key default gen_random_uuid(),
    voucher_id uuid not null references public.vouchers(id) on delete cascade,
    user_id    uuid not null references public.profiles(id) on delete cascade,
    user_email text,
    claimed_at timestamptz not null default now()
);

create unique index if not exists voucher_claims_voucher_user_uq
    on public.voucher_claims(voucher_id, user_id);

create index if not exists voucher_claims_user_idx
    on public.voucher_claims(user_id);

-- Dedup per email: satu email hanya boleh mengklaim satu voucher satu kali.
create unique index if not exists voucher_claims_voucher_email_uq
    on public.voucher_claims(voucher_id, lower(trim(user_email)))
    where user_email is not null;

-- -----------------------------------------------------------------------------
-- 2. RLS
--    Klien hanya boleh MELIHAT klaimnya sendiri. Tidak ada policy INSERT/UPDATE/
--    DELETE: satu-satunya jalur tulis adalah RPC di bawah.
-- -----------------------------------------------------------------------------
alter table public.vouchers enable row level security;
alter table public.voucher_claims enable row level security;

drop policy if exists voucher_claims_select_own on public.voucher_claims;
create policy voucher_claims_select_own on public.voucher_claims
    for select to authenticated
    using (user_id = (select auth.uid()));

-- `vouchers` sengaja TANPA policy: daftar kode voucher tidak boleh terbaca klien.
revoke all on public.vouchers from anon, authenticated;
revoke all on public.voucher_claims from anon;
grant select on public.voucher_claims to authenticated;

-- -----------------------------------------------------------------------------
-- 3. RPC klaim voucher
-- -----------------------------------------------------------------------------
create or replace function public.claim_voucher(
    p_user_id     uuid,
    p_voucher_code text,
    p_wallet_type  text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_voucher_id    uuid;
    v_quota         integer;
    v_max_uses      integer;
    v_used_count    integer;
    v_expires_at    timestamptz;
    v_is_active     boolean;
    v_voucher_wallet text;
    v_email         text;
    v_wallet_id     uuid;
    v_balance       integer;
    v_new_balance   integer;
begin
    -- 3a. Otorisasi: hanya untuk diri sendiri, kecuali service_role.
    if coalesce(auth.role(), '') <> 'service_role'
       and p_user_id is distinct from auth.uid()
    then
        raise exception 'Not authorized' using errcode = 'P0001';
    end if;

    if p_user_id is null or p_voucher_code is null or btrim(p_voucher_code) = '' then
        raise exception 'User ID dan Kode Voucher tidak boleh kosong' using errcode = 'P0001';
    end if;

    if p_wallet_type is null or p_wallet_type not in ('exam_token_cpns', 'exam_token_tka') then
        raise exception 'WALLET_TYPE_INVALID' using errcode = 'P0001';
    end if;

    -- 3b. Kunci voucher supaya kuota tidak bisa dilampaui oleh klaim bersamaan.
    select id, quota_amount, max_uses, used_count, expires_at, is_active, wallet_type
      into v_voucher_id, v_quota, v_max_uses, v_used_count, v_expires_at, v_is_active, v_voucher_wallet
      from public.vouchers
     where code = upper(btrim(p_voucher_code))
     for update;

    if not found then
        raise exception 'Kode voucher tidak valid atau tidak ditemukan' using errcode = 'P0001';
    end if;

    -- 3c. Voucher boleh dibatasi ke satu program.
    if v_voucher_wallet is not null and v_voucher_wallet <> p_wallet_type then
        raise exception 'Voucher ini tidak berlaku untuk program tersebut' using errcode = 'P0001';
    end if;

    -- 3d. Idempotensi diperiksa SEBELUM validasi aktif/kadaluarsa/kuota, supaya
    --     pengguna yang sudah pernah klaim tidak melihat error menyesatkan
    --     ketika vouchernya kebetulan sudah tidak aktif atau kuotanya habis.
    if exists (
        select 1 from public.voucher_claims
         where voucher_id = v_voucher_id and user_id = p_user_id
    ) then
        select balance into v_balance
          from public.wallets
         where user_id = p_user_id and wallet_type = p_wallet_type;

        return jsonb_build_object(
            'claimed', true,
            'already_claimed', true,
            'amount', 0,
            'balance', coalesce(v_balance, 0),
            'message', 'Anda sudah pernah mengklaim kode voucher ini sebelumnya'
        );
    end if;

    if not v_is_active then
        raise exception 'Kode voucher ini sudah tidak aktif' using errcode = 'P0001';
    end if;

    if v_expires_at is not null and v_expires_at < now() then
        raise exception 'Kode voucher ini sudah kadaluarsa' using errcode = 'P0001';
    end if;

    if v_max_uses is not null and v_used_count >= v_max_uses then
        raise exception 'Kuota untuk kode voucher ini sudah habis digunakan' using errcode = 'P0001';
    end if;

    -- 3e. Dedup per email. Email diambil dari auth.users, bukan dari klien.
    select lower(btrim(u.email)) into v_email
      from auth.users u
     where u.id = p_user_id;

    if v_email is not null and exists (
        select 1 from public.voucher_claims
         where voucher_id = v_voucher_id
           and lower(btrim(user_email)) = v_email
    ) then
        raise exception 'Email ini sudah pernah mengklaim kode voucher ini. Voucher hanya dapat diklaim satu kali per pengguna'
            using errcode = 'P0001';
    end if;

    -- 3f. Kredit token ke wallet program yang diminta.
    select id, balance into v_wallet_id, v_balance
      from public.wallets
     where user_id = p_user_id and wallet_type = p_wallet_type
     for update;

    if not found then
        insert into public.wallets (user_id, wallet_type, balance)
        values (p_user_id, p_wallet_type, 0)
        returning id, balance into v_wallet_id, v_balance;
    end if;

    v_new_balance := coalesce(v_balance, 0) + v_quota;

    update public.wallets
       set balance = v_new_balance,
           updated_at = now()
     where id = v_wallet_id;

    insert into public.wallet_transactions (
        wallet_id, type, amount, source_type, source_id, balance_after
    ) values (
        v_wallet_id, 'credit', v_quota, 'voucher', v_voucher_id, v_new_balance
    );

    insert into public.voucher_claims (voucher_id, user_id, user_email)
    values (v_voucher_id, p_user_id, v_email);

    update public.vouchers
       set used_count = used_count + 1,
           updated_at = now()
     where id = v_voucher_id;

    return jsonb_build_object(
        'claimed', true,
        'already_claimed', false,
        'amount', v_quota,
        'balance', v_new_balance,
        'message', 'Voucher berhasil diklaim'
    );
end;
$$;

comment on function public.claim_voucher(uuid, text, text) is
    'Klaim kode voucher dan kredit token ke wallet program yang diminta. '
    'Idempoten per user+voucher. Hanya boleh untuk diri sendiri (kecuali service_role).';

revoke all on function public.claim_voucher(uuid, text, text) from public;
revoke all on function public.claim_voucher(uuid, text, text) from anon;
grant execute on function public.claim_voucher(uuid, text, text) to authenticated;
grant execute on function public.claim_voucher(uuid, text, text) to service_role;

-- -----------------------------------------------------------------------------
-- 4. Pindahkan voucher & klaim lama
--    `wallet_type = null` -> boleh diklaim untuk program mana pun, sesuai
--    perilaku lama (satu kolam token).
-- -----------------------------------------------------------------------------
-- Dijalankan hanya bila `legacy_prod` ada. Staging tidak punya schema itu, dan
-- migration ini harus tetap berhasil di sana (skemanya identik; hanya datanya
-- yang berbeda).
do $$
begin
    if not exists (select 1 from pg_namespace where nspname = 'legacy_prod') then
        raise notice 'legacy_prod tidak ada — pemindahan voucher dilewati (environment tanpa arsip cutover)';
        return;
    end if;

    insert into public.vouchers (id, code, quota_amount, max_uses, used_count, expires_at, is_active, wallet_type, created_at, updated_at)
    select l.id, l.code, l.quota_amount, l.max_uses, coalesce(l.used_count, 0), l.expires_at,
           coalesce(l.is_active, false), null, l.created_at, l.updated_at
    from legacy_prod.vouchers l
    on conflict (code) do nothing;

    insert into public.voucher_claims (id, voucher_id, user_id, user_email, claimed_at)
    select c.id, c.voucher_id, c.user_id, c.user_email, c.claimed_at
    from legacy_prod.voucher_claims c
    where c.user_id is not null
      and exists (select 1 from public.vouchers v where v.id = c.voucher_id)
      and exists (select 1 from public.profiles p where p.id = c.user_id)
    on conflict (voucher_id, user_id) do nothing;
end $$;
