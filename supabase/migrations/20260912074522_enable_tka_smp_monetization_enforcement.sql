-- Enforce the TKA SMP access contract now that the server and UI guards are ready.
-- Premium Full Tryout requires the active Tempur Pass entitlement. Freemium Mini
-- Tryout keeps its one free attempt and requires the pass after that quota.

insert into public.feature_flags(key, name, enabled, rollout_percentage, config)
values (
  'tka.smp.monetization_enforcement',
  'TKA SMP Monetization Enforcement',
  true,
  100,
  jsonb_build_object(
    'program', 'TKA',
    'track', 'SMP',
    'milestone', 4,
    'mode', 'enforced'
  )
)
on conflict (key) do update set
  name = excluded.name,
  enabled = true,
  rollout_percentage = 100,
  config = coalesce(public.feature_flags.config, '{}'::jsonb) || excluded.config;
