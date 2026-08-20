-- Schema V2 wallet support.
-- One debit ledger entry per exam attempt; charge is allowed once access has
-- been granted (created/in_progress) and remains safe to retry on completion.

create unique index if not exists wallet_transactions_exam_attempt_debit_uq
on public.wallet_transactions (wallet_id, source_type, source_id, type)
where source_id is not null
  and source_type = 'exam_attempt'
  and type = 'debit';

create or replace function public.debit_exam_token_once(
    p_user_id uuid,
    p_attempt_id uuid
)
returns table (
    debited boolean,
    balance_after integer,
    amount integer
)
language plpgsql
security invoker
set search_path = public
as $$
declare
    v_wallet_id uuid;
    v_balance integer;
    v_token_cost integer;
    v_existing_balance integer;
begin
    select e.token_cost
      into v_token_cost
      from public.exam_attempts a
      join public.exams e on e.id = a.exam_id
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
       and w.wallet_type = 'exam_token'
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
$$;

revoke all on function public.debit_exam_token_once(uuid, uuid) from public;
revoke all on function public.debit_exam_token_once(uuid, uuid) from anon;
revoke all on function public.debit_exam_token_once(uuid, uuid) from authenticated;
grant execute on function public.debit_exam_token_once(uuid, uuid) to service_role;
