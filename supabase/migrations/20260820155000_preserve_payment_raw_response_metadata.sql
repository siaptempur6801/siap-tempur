create or replace function public.fulfill_paid_order(
  p_order_id uuid,
  p_provider text,
  p_status text,
  p_provider_transaction_id text,
  p_payment_method text,
  p_amount numeric,
  p_raw_response jsonb
)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_order public.orders%rowtype;
  v_item record;
  v_grant record;
  v_feature record;
  v_event_product record;
  v_wallet_id uuid;
  v_balance integer;
  v_credit integer;
  v_paid_at timestamptz;
  v_registration_number text;
  v_success boolean := lower(p_status) in ('capture', 'settlement');
begin
  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  if p_amount is null or p_amount <> v_order.total_amount then
    raise exception 'PAYMENT_AMOUNT_MISMATCH';
  end if;

  insert into public.payments (
    order_id, provider, provider_transaction_id, payment_method,
    amount, status, paid_at, raw_response, created_at, updated_at
  ) values (
    v_order.id,
    lower(p_provider),
    nullif(p_provider_transaction_id, ''),
    nullif(p_payment_method, ''),
    p_amount,
    lower(p_status),
    case when v_success then coalesce(v_order.paid_at, now()) else null end,
    coalesce(p_raw_response, '{}'::jsonb),
    now(),
    now()
  )
  on conflict (order_id, provider) do update set
    provider_transaction_id = coalesce(excluded.provider_transaction_id, public.payments.provider_transaction_id),
    payment_method = coalesce(excluded.payment_method, public.payments.payment_method),
    amount = excluded.amount,
    status = case
      when lower(public.payments.status) in ('capture', 'settlement') then public.payments.status
      else excluded.status
    end,
    paid_at = case
      when lower(public.payments.status) in ('capture', 'settlement') then public.payments.paid_at
      when excluded.status in ('capture', 'settlement') then coalesce(public.payments.paid_at, excluded.paid_at, now())
      else public.payments.paid_at
    end,
    raw_response = coalesce(public.payments.raw_response, '{}'::jsonb) || coalesce(excluded.raw_response, '{}'::jsonb),
    updated_at = now();

  if not v_success then
    if lower(v_order.status) <> 'paid' then
      update public.orders
      set status = case lower(p_status)
        when 'pending' then 'pending'
        when 'expire' then 'expired'
        when 'cancel' then 'cancelled'
        when 'deny' then 'failed'
        else lower(p_status)
      end
      where id = v_order.id;
    end if;
    return;
  end if;

  v_paid_at := coalesce(v_order.paid_at, now());
  update public.orders
  set status = 'paid', paid_at = v_paid_at
  where id = v_order.id;

  for v_item in
    select oi.*, p.duration_days, p.product_type
    from public.order_items oi
    join public.products p on p.id = oi.product_id
    where oi.order_id = v_order.id
    order by oi.id
  loop
    for v_grant in
      select wallet_type, amount
      from public.product_wallet_grants
      where product_id = v_item.product_id
    loop
      insert into public.wallets(user_id, wallet_type, balance, updated_at)
      values (v_order.user_id, v_grant.wallet_type, 0, now())
      on conflict (user_id, wallet_type) do nothing;

      select id, balance into v_wallet_id, v_balance
      from public.wallets
      where user_id = v_order.user_id
        and wallet_type = v_grant.wallet_type
      for update;

      if not exists (
        select 1
        from public.wallet_transactions wt
        where wt.wallet_id = v_wallet_id
          and wt.source_type = 'order_item'
          and wt.source_id = v_item.id
          and wt.type = 'credit'
      ) then
        v_credit := v_grant.amount * v_item.quantity;
        update public.wallets
        set balance = balance + v_credit, updated_at = now()
        where id = v_wallet_id
        returning balance into v_balance;

        insert into public.wallet_transactions(
          wallet_id, type, amount, source_type, source_id, balance_after, created_at
        ) values (
          v_wallet_id, 'credit', v_credit, 'order_item', v_item.id, v_balance, now()
        );
      end if;
    end loop;

    for v_feature in
      select pf.feature_id, pf.limit_value
      from public.product_features pf
      where pf.product_id = v_item.product_id
    loop
      insert into public.entitlements(
        user_id, feature_id, source_type, source_id,
        starts_at, expires_at, usage_limit, usage_count, status, created_at
      ) values (
        v_order.user_id,
        v_feature.feature_id,
        'order_item',
        v_item.id,
        v_paid_at,
        case
          when v_item.duration_days is null then null
          else v_paid_at + make_interval(days => v_item.duration_days)
        end,
        v_feature.limit_value,
        0,
        'active',
        now()
      )
      on conflict (user_id, feature_id, source_type, source_id)
      where source_id is not null and source_type = 'order_item'
      do nothing;
    end loop;

    select ep.product_id, ep.event_id, ep.session_id, e.code
    into v_event_product
    from public.event_products ep
    join public.events e on e.id = ep.event_id
    where ep.product_id = v_item.product_id
      and lower(ep.status) = 'active'
    limit 1;

    if found then
      if v_event_product.session_id is null then
        raise exception 'EVENT_PRODUCT_SESSION_REQUIRED';
      end if;

      v_registration_number := 'EVT-' || v_event_product.code || '-' || upper(substr(md5(v_item.id::text), 1, 8));

      insert into public.event_registrations(
        event_id, session_id, user_id, order_id,
        registration_number, status, created_at
      ) values (
        v_event_product.event_id,
        v_event_product.session_id,
        v_order.user_id,
        v_order.id,
        v_registration_number,
        'registered',
        now()
      )
      on conflict (event_id, user_id) do update set
        session_id = coalesce(public.event_registrations.session_id, excluded.session_id),
        order_id = coalesce(public.event_registrations.order_id, excluded.order_id),
        status = case
          when lower(public.event_registrations.status) in ('started', 'completed') then public.event_registrations.status
          else 'registered'
        end;
    end if;
  end loop;
end;
$function$;
