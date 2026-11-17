do $$
declare
  v_product_id uuid;
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'transactions'
  ) then
    raise exception 'Refusing Schema V2 commerce QA seed on legacy/production-shaped database';
  end if;

  update public.products
  set status = 'active', updated_at = now()
  where code in ('CPNS_TOKEN_1', 'CPNS_TOKEN_5', 'CPNS_TOKEN_10');

  for v_product_id in
    select id from public.products where code in ('CPNS_TOKEN_1', 'CPNS_TOKEN_5', 'CPNS_TOKEN_10')
  loop
    delete from public.product_prices
    where product_id = v_product_id and lower(status) = 'active';
  end loop;

  insert into public.product_prices(product_id, currency, amount, starts_at, ends_at, status)
  select id, 'IDR',
    case code
      when 'CPNS_TOKEN_1' then 10000
      when 'CPNS_TOKEN_5' then 40000
      when 'CPNS_TOKEN_10' then 75000
    end,
    now() - interval '1 minute', null, 'active'
  from public.products
  where code in ('CPNS_TOKEN_1', 'CPNS_TOKEN_5', 'CPNS_TOKEN_10');

  insert into public.product_wallet_grants(product_id, wallet_type, amount, config)
  select id, 'exam_token',
    case code
      when 'CPNS_TOKEN_1' then 1
      when 'CPNS_TOKEN_5' then 5
      when 'CPNS_TOKEN_10' then 10
    end,
    '{}'::jsonb
  from public.products
  where code in ('CPNS_TOKEN_1', 'CPNS_TOKEN_5', 'CPNS_TOKEN_10')
  on conflict (product_id, wallet_type) do update set
    amount = excluded.amount,
    config = excluded.config;
end $$;
