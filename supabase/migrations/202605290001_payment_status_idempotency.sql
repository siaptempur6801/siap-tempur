-- Process Midtrans status updates atomically so quota is granted at most once.

create or replace function public.process_paid_transaction(
  p_order_id text,
  p_transaction_status transaction_status,
  p_increment_by int default 0
)
returns table (
  status transaction_status,
  quota_granted boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_transaction record;
  v_success_statuses transaction_status[] := array['capture'::transaction_status, 'settlement'::transaction_status];
  v_is_success boolean;
  v_already_success boolean;
  v_next_status transaction_status;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Not authorized';
  end if;

  if p_order_id is null or btrim(p_order_id) = '' or p_transaction_status is null then
    raise exception 'Invalid transaction status update';
  end if;

  select id, user_id, status
  into v_transaction
  from public.transactions
  where order_id = p_order_id
  for update;

  if not found then
    raise exception 'Transaction not found';
  end if;

  v_is_success := p_transaction_status = any(v_success_statuses);
  v_already_success := v_transaction.status = any(v_success_statuses);
  v_next_status := p_transaction_status;
  quota_granted := false;

  if v_is_success then
    if v_already_success then
      if v_transaction.status = 'settlement'::transaction_status then
        v_next_status := v_transaction.status;
      elsif p_transaction_status = 'settlement'::transaction_status then
        v_next_status := 'settlement'::transaction_status;
      else
        v_next_status := v_transaction.status;
      end if;
    elsif coalesce(p_increment_by, 0) > 0 then
      update public.profiles
      set tryout_quota = coalesce(tryout_quota, 0) + p_increment_by
      where id = v_transaction.user_id;

      if not found then
        raise exception 'Profile not found';
      end if;

      quota_granted := true;
    end if;
  elsif v_already_success then
    v_next_status := v_transaction.status;
  end if;

  update public.transactions
  set status = v_next_status,
      updated_at = now()
  where id = v_transaction.id;

  status := v_next_status;
  return next;
end;
$$;

revoke execute on function public.process_paid_transaction(text, transaction_status, int) from public, anon, authenticated;
grant execute on function public.process_paid_transaction(text, transaction_status, int) to service_role;
