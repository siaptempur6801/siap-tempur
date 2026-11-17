create or replace function public.is_tka_smp_monetization_enforced()
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select coalesce((
    select ff.enabled
    from public.feature_flags ff
    where ff.key = 'tka.smp.monetization_enforcement'
  ), false);
$function$;

revoke all on function public.is_tka_smp_monetization_enforced() from public, anon;
grant execute on function public.is_tka_smp_monetization_enforced() to authenticated;
