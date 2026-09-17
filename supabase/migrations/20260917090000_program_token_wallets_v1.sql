-- Program-scoped token wallets (CPNS vs TKA) pada satu akun.
--
-- Keputusan produk (2026-09-17): saldo token dipisah per program supaya pembukuan jelas dan
-- token CPNS tidak bisa dipakai untuk TKA. Satu akun tetap punya keduanya.
--
-- Yang dilakukan migrasi ini:
--   1. `programs.token_wallet_type` sebagai sumber pemetaan program → tipe wallet.
--   2. Pindahkan saldo lama bertipe 'exam_token' ke wallet program (CPNS, satu-satunya konsumen
--      token sebelum migrasi) — baris lama dipertahankan bernilai 0 agar riwayat transaksi utuh.
--   3. `debit_exam_token_once` menjadi program-aware (tipe wallet diturunkan dari program exam).
--      Signature & seluruh semantik lama dipertahankan: idempotensi per attempt, kuota 0 token,
--      dan pesan error WALLET_NOT_FOUND / INSUFFICIENT_TOKEN_BALANCE / ATTEMPT_NOT_CHARGEABLE.

-- 1. Pemetaan program → tipe wallet token
alter table public.programs
    add column if not exists token_wallet_type text;

update public.programs
   set token_wallet_type = 'exam_token_cpns'
 where code = 'CPNS'
   and token_wallet_type is distinct from 'exam_token_cpns';

update public.programs
   set token_wallet_type = 'exam_token_tka'
 where code = 'TKA'
   and token_wallet_type is distinct from 'exam_token_tka';

comment on column public.programs.token_wallet_type is
    'Tipe wallet token untuk program ini (mis. exam_token_cpns / exam_token_tka).';

-- 2. Migrasi saldo lama 'exam_token' → wallet program CPNS
insert into public.wallets (user_id, wallet_type, balance, updated_at)
select w.user_id, 'exam_token_cpns', w.balance, now()
  from public.wallets w
 where w.wallet_type = 'exam_token'
on conflict (user_id, wallet_type) do update
   set balance = public.wallets.balance + excluded.balance,
       updated_at = now();

update public.wallets
   set balance = 0,
       updated_at = now()
 where wallet_type = 'exam_token';

-- Indeks untuk pemeriksaan idempotensi debit per attempt.
create index if not exists wallet_transactions_attempt_debit_idx
    on public.wallet_transactions (wallet_id, source_id)
 where source_type = 'exam_attempt' and type = 'debit';

-- 3. RPC debit program-aware
create or replace function public.debit_exam_token_once(p_user_id uuid, p_attempt_id uuid)
returns table(debited boolean, balance_after integer, amount integer)
language plpgsql
set search_path to 'public'
as $function$
declare
    v_wallet_type text;
    v_wallet_id uuid;
    v_balance integer;
    v_token_cost integer;
    v_existing_balance integer;
begin
    select e.token_cost,
           coalesce(nullif(pr.token_wallet_type, ''), 'exam_token_cpns')
      into v_token_cost, v_wallet_type
      from public.exam_attempts a
      join public.exams e on e.id = a.exam_id
      left join public.programs pr on pr.id = e.program_id
     where a.id = p_attempt_id
       and a.user_id = p_user_id
       and lower(a.status) in ('created', 'in_progress', 'completed');

    if not found then
        raise exception 'ATTEMPT_NOT_CHARGEABLE'
            using errcode = 'P0001';
    end if;

    v_token_cost := coalesce(v_token_cost, 0);

    select w.id, w.balance
      into v_wallet_id, v_balance
      from public.wallets w
     where w.user_id = p_user_id
       and w.wallet_type = v_wallet_type
     for update;

    if not found then
        if v_token_cost = 0 then
            return query select false, 0, 0;
            return;
        end if;

        raise exception 'WALLET_NOT_FOUND'
            using errcode = 'P0001';
    end if;

    select wt.balance_after
      into v_existing_balance
      from public.wallet_transactions wt
     where wt.wallet_id = v_wallet_id
       and wt.source_type = 'exam_attempt'
       and wt.source_id = p_attempt_id
       and wt.type = 'debit'
     limit 1;

    if found then
        return query select false, v_existing_balance, v_token_cost;
        return;
    end if;

    if v_token_cost = 0 then
        return query select false, v_balance, 0;
        return;
    end if;

    if v_balance < v_token_cost then
        raise exception 'INSUFFICIENT_TOKEN_BALANCE'
            using errcode = 'P0001';
    end if;

    v_balance := v_balance - v_token_cost;

    update public.wallets
       set balance = v_balance,
           updated_at = now()
     where id = v_wallet_id;

    insert into public.wallet_transactions (
        wallet_id,
        type,
        amount,
        source_type,
        source_id,
        balance_after
    ) values (
        v_wallet_id,
        'debit',
        -v_token_cost,
        'exam_attempt',
        p_attempt_id,
        v_balance
    );

    return query select true, v_balance, v_token_cost;
end;
$function$;
