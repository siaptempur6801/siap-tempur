with target(code, amount) as (
  values ('TKA_SMP_PASS_30'::text, 29000::numeric),
         ('TKA_SMP_PASS_90'::text, 69000::numeric)
), scoped as (
  select p.id, p.code, t.amount
  from public.products p
  join target t on t.code=p.code
  join public.programs pr on pr.id=p.program_id and pr.code='TKA'
  join public.tracks tr on tr.id=p.track_id and tr.program_id=pr.id and tr.code='SMP'
)
update public.products p
set status='ACTIVE', updated_at=now()
from scoped s
where p.id=s.id;

with target(code, amount) as (
  values ('TKA_SMP_PASS_30'::text, 29000::numeric),
         ('TKA_SMP_PASS_90'::text, 69000::numeric)
), scoped as (
  select p.id, p.code, t.amount
  from public.products p
  join target t on t.code=p.code
  join public.programs pr on pr.id=p.program_id and pr.code='TKA'
  join public.tracks tr on tr.id=p.track_id and tr.program_id=pr.id and tr.code='SMP'
)
update public.product_prices pp
set amount=s.amount, currency='IDR', status='ACTIVE'
from scoped s
where pp.product_id=s.id
  and lower(pp.status)='active'
  and pp.ends_at is null;

with target(code, amount) as (
  values ('TKA_SMP_PASS_30'::text, 29000::numeric),
         ('TKA_SMP_PASS_90'::text, 69000::numeric)
), scoped as (
  select p.id, p.code, t.amount
  from public.products p
  join target t on t.code=p.code
  join public.programs pr on pr.id=p.program_id and pr.code='TKA'
  join public.tracks tr on tr.id=p.track_id and tr.program_id=pr.id and tr.code='SMP'
)
insert into public.product_prices(product_id,currency,amount,starts_at,ends_at,status)
select s.id,'IDR',s.amount,now(),null,'ACTIVE'
from scoped s
where not exists (
  select 1 from public.product_prices pp
  where pp.product_id=s.id and lower(pp.status)='active' and pp.ends_at is null
);
