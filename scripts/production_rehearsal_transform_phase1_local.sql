\set ON_ERROR_STOP on

-- Production-clone rehearsal Phase 1 (LOCAL ONLY via guarded runner):
-- auth UUID placeholders -> canonical profiles -> program/track enrollment -> quota wallet.
-- Source: legacy_prod raw snapshot. Target: canonical public/auth schemas in Supabase Local.

BEGIN;

DO $$
DECLARE
  v_auth bigint;
  v_profiles bigint;
  v_programs bigint;
  v_quota_profiles bigint;
  v_quota_programs bigint;
  v_quota_mismatch bigint;
  v_runtime_attempts bigint;
  v_runtime_orders bigint;
  v_runtime_events bigint;
BEGIN
  IF to_regclass('legacy_prod.auth_users_identity') IS NULL
     OR to_regclass('legacy_prod.profiles') IS NULL
     OR to_regclass('legacy_prod.user_programs') IS NULL
     OR to_regclass('legacy_prod.programs') IS NULL THEN
    RAISE EXCEPTION 'legacy_prod snapshot is incomplete; load raw production snapshot first';
  END IF;

  SELECT count(*) INTO v_auth FROM legacy_prod.auth_users_identity;
  SELECT count(*) INTO v_profiles FROM legacy_prod.profiles;
  SELECT count(*) INTO v_programs FROM legacy_prod.user_programs;
  SELECT coalesce(sum(nullif(tryout_quota,'')::integer),0) INTO v_quota_profiles FROM legacy_prod.profiles;
  SELECT coalesce(sum(nullif(tryout_quota,'')::integer),0) INTO v_quota_programs FROM legacy_prod.user_programs;

  SELECT count(*) INTO v_quota_mismatch
  FROM legacy_prod.profiles p
  JOIN legacy_prod.user_programs up ON up.user_id = p.id
  JOIN legacy_prod.programs pr ON pr.id = up.program_id AND pr.slug = 'cpns'
  WHERE coalesce(nullif(p.tryout_quota,'')::integer,0) <> coalesce(nullif(up.tryout_quota,'')::integer,0);

  SELECT count(*) INTO v_runtime_attempts FROM public.exam_attempts;
  SELECT count(*) INTO v_runtime_orders FROM public.orders;
  SELECT count(*) INTO v_runtime_events FROM public.events;

  IF v_auth <> 426 OR v_profiles <> 426 OR v_programs <> 430 THEN
    RAISE EXCEPTION 'unexpected raw identity/enrollment baseline: auth=%, profiles=%, user_programs=%', v_auth, v_profiles, v_programs;
  END IF;
  IF v_quota_profiles <> 5090 OR v_quota_programs <> 5090 OR v_quota_mismatch <> 0 THEN
    RAISE EXCEPTION 'quota baseline mismatch: profile_sum=%, program_sum=%, per_user_mismatch=%', v_quota_profiles, v_quota_programs, v_quota_mismatch;
  END IF;
  IF v_runtime_attempts <> 0 OR v_runtime_orders <> 0 OR v_runtime_events <> 0 THEN
    RAISE EXCEPTION 'local canonical runtime is not clean: attempts=%, orders=%, events=%', v_runtime_attempts, v_runtime_orders, v_runtime_events;
  END IF;
END
$$;

-- Preserve production auth UUID relationships without importing credentials, email addresses,
-- password hashes, provider metadata, or tokens. Synthetic local-only identities cannot be used
-- as production credentials; they only satisfy UUID/FK rehearsal semantics.
INSERT INTO auth.users (
  id,
  email,
  aud,
  role,
  raw_app_meta_data,
  raw_user_meta_data,
  email_confirmed_at,
  created_at,
  updated_at
)
SELECT
  a.id::uuid,
  'legacy+' || a.id || '@local.invalid',
  'authenticated',
  'authenticated',
  '{"provider":"email","providers":["email"],"rehearsal_placeholder":true}'::jsonb,
  jsonb_build_object('full_name', coalesce(nullif(p.full_name,''), 'Legacy User'), 'rehearsal_placeholder', true),
  coalesce(nullif(a.created_at,'')::timestamptz, now()),
  coalesce(nullif(a.created_at,'')::timestamptz, now()),
  coalesce(nullif(a.created_at,'')::timestamptz, now())
FROM legacy_prod.auth_users_identity a
LEFT JOIN legacy_prod.profiles p ON p.id = a.id
ON CONFLICT (id) DO NOTHING;

-- The auth insert trigger creates skeletal profiles. Reconcile them to the production profile data.
INSERT INTO public.profiles (
  id, full_name, display_name, avatar_url, phone, status, onboarding_completed,
  created_at, updated_at, birth_date, gender, bio, education_level, target_instance
)
SELECT
  p.id::uuid,
  coalesce(nullif(p.full_name,''), 'Legacy User'),
  nullif(p.full_name,''),
  nullif(p.avatar_url,''),
  nullif(p.phone_number,''),
  'active',
  true,
  coalesce(nullif(p.created_at,'')::timestamptz, now()),
  coalesce(nullif(p.updated_at,'')::timestamptz, nullif(p.created_at,'')::timestamptz, now()),
  nullif(p.birth_date,'')::date,
  nullif(p.gender,''),
  nullif(p.bio,''),
  nullif(p.education_level,''),
  nullif(p.target_instance,'')
FROM legacy_prod.profiles p
JOIN legacy_prod.auth_users_identity a ON a.id = p.id
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  display_name = EXCLUDED.display_name,
  avatar_url = EXCLUDED.avatar_url,
  phone = EXCLUDED.phone,
  status = EXCLUDED.status,
  onboarding_completed = EXCLUDED.onboarding_completed,
  created_at = EXCLUDED.created_at,
  updated_at = EXCLUDED.updated_at,
  birth_date = EXCLUDED.birth_date,
  gender = EXCLUDED.gender,
  bio = EXCLUDED.bio,
  education_level = EXCLUDED.education_level,
  target_instance = EXCLUDED.target_instance;

DROP TABLE IF EXISTS legacy_prod.program_track_map;
CREATE TABLE legacy_prod.program_track_map (
  legacy_program_id uuid PRIMARY KEY,
  legacy_slug text NOT NULL UNIQUE,
  canonical_program_id uuid NOT NULL,
  canonical_track_id uuid NOT NULL
);

INSERT INTO legacy_prod.program_track_map (
  legacy_program_id, legacy_slug, canonical_program_id, canonical_track_id
)
SELECT
  lp.id::uuid,
  lp.slug,
  cp.id,
  ct.id
FROM legacy_prod.programs lp
JOIN public.programs cp
  ON cp.slug = CASE WHEN lp.slug = 'cpns' THEN 'cpns' ELSE 'tka' END
JOIN public.tracks ct
  ON ct.program_id = cp.id
 AND ct.slug = CASE
   WHEN lp.slug = 'cpns' THEN 'skd'
   WHEN lp.slug = 'tka-sd' THEN 'sd'
   WHEN lp.slug = 'tka-smp' THEN 'smp'
   WHEN lp.slug = 'tka-sma' THEN 'sma'
 END
WHERE lp.slug IN ('cpns','tka-sd','tka-smp','tka-sma');

DO $$
DECLARE v_count bigint;
BEGIN
  SELECT count(*) INTO v_count FROM legacy_prod.program_track_map;
  IF v_count <> 4 THEN
    RAISE EXCEPTION 'program/track map incomplete: expected 4, got %', v_count;
  END IF;
END
$$;

INSERT INTO public.user_tracks (
  user_id, track_id, status, target_year, started_at, completed_at, created_at, updated_at
)
SELECT
  up.user_id::uuid,
  m.canonical_track_id,
  'active',
  NULL,
  coalesce(nullif(up.onboarded_at,'')::timestamptz, nullif(up.joined_at,'')::timestamptz, now()),
  NULL,
  coalesce(nullif(up.created_at,'')::timestamptz, now()),
  coalesce(nullif(up.updated_at,'')::timestamptz, nullif(up.last_active_at,'')::timestamptz, now())
FROM legacy_prod.user_programs up
JOIN legacy_prod.program_track_map m ON m.legacy_program_id = up.program_id::uuid
ON CONFLICT (user_id, track_id) DO UPDATE SET
  status = EXCLUDED.status,
  target_year = EXCLUDED.target_year,
  started_at = EXCLUDED.started_at,
  completed_at = EXCLUDED.completed_at,
  created_at = EXCLUDED.created_at,
  updated_at = EXCLUDED.updated_at;

-- One canonical exam-token wallet per production user. CPNS is the only legacy program carrying quota.
INSERT INTO public.wallets (user_id, wallet_type, balance, updated_at)
SELECT
  p.id::uuid,
  'exam_token',
  coalesce(nullif(p.tryout_quota,'')::integer,0),
  coalesce(nullif(p.updated_at,'')::timestamptz, now())
FROM legacy_prod.profiles p
JOIN legacy_prod.auth_users_identity a ON a.id = p.id
ON CONFLICT (user_id, wallet_type) DO UPDATE SET
  balance = EXCLUDED.balance,
  updated_at = EXCLUDED.updated_at;

-- Legacy token ledger is empty in production. Represent the reconciled opening balance explicitly
-- in local rehearsal so wallet state is auditable without inventing historical transaction events.
DELETE FROM public.wallet_transactions
WHERE source_type = 'legacy_migration_opening_balance';

INSERT INTO public.wallet_transactions (
  wallet_id, type, amount, source_type, source_id, balance_after, created_at
)
SELECT
  w.id,
  'credit',
  w.balance,
  'legacy_migration_opening_balance',
  NULL,
  w.balance,
  coalesce(nullif(p.created_at,'')::timestamptz, now())
FROM public.wallets w
JOIN legacy_prod.profiles p ON p.id::uuid = w.user_id
WHERE w.wallet_type = 'exam_token'
  AND w.balance <> 0;

-- Phase 1 hard reconciliation gates.
DO $$
DECLARE
  v_legacy_auth_match bigint;
  v_profile_match bigint;
  v_tracks bigint;
  v_cpns bigint;
  v_sd bigint;
  v_smp bigint;
  v_sma bigint;
  v_wallets bigint;
  v_wallet_sum bigint;
  v_orphan_tracks bigint;
  v_orphan_wallets bigint;
BEGIN
  SELECT count(*) INTO v_legacy_auth_match
  FROM legacy_prod.auth_users_identity a JOIN auth.users u ON u.id=a.id::uuid;

  SELECT count(*) INTO v_profile_match
  FROM legacy_prod.profiles l JOIN public.profiles p ON p.id=l.id::uuid;

  SELECT count(*) INTO v_tracks
  FROM public.user_tracks ut
  JOIN legacy_prod.auth_users_identity a ON a.id::uuid=ut.user_id;

  SELECT count(*) INTO v_cpns
  FROM public.user_tracks ut JOIN public.tracks t ON t.id=ut.track_id
  JOIN legacy_prod.auth_users_identity a ON a.id::uuid=ut.user_id WHERE t.slug='skd';
  SELECT count(*) INTO v_sd
  FROM public.user_tracks ut JOIN public.tracks t ON t.id=ut.track_id
  JOIN legacy_prod.auth_users_identity a ON a.id::uuid=ut.user_id WHERE t.slug='sd';
  SELECT count(*) INTO v_smp
  FROM public.user_tracks ut JOIN public.tracks t ON t.id=ut.track_id
  JOIN legacy_prod.auth_users_identity a ON a.id::uuid=ut.user_id WHERE t.slug='smp';
  SELECT count(*) INTO v_sma
  FROM public.user_tracks ut JOIN public.tracks t ON t.id=ut.track_id
  JOIN legacy_prod.auth_users_identity a ON a.id::uuid=ut.user_id WHERE t.slug='sma';

  SELECT count(*), coalesce(sum(w.balance),0) INTO v_wallets, v_wallet_sum
  FROM public.wallets w JOIN legacy_prod.auth_users_identity a ON a.id::uuid=w.user_id
  WHERE w.wallet_type='exam_token';

  SELECT count(*) INTO v_orphan_tracks
  FROM public.user_tracks ut LEFT JOIN public.profiles p ON p.id=ut.user_id
  WHERE p.id IS NULL;
  SELECT count(*) INTO v_orphan_wallets
  FROM public.wallets w LEFT JOIN public.profiles p ON p.id=w.user_id
  WHERE p.id IS NULL;

  IF v_legacy_auth_match <> 426 OR v_profile_match <> 426 THEN
    RAISE EXCEPTION 'identity reconciliation failed: auth_match=%, profile_match=%', v_legacy_auth_match, v_profile_match;
  END IF;
  IF v_tracks <> 430 OR v_cpns <> 426 OR v_sd <> 2 OR v_smp <> 1 OR v_sma <> 1 THEN
    RAISE EXCEPTION 'track reconciliation failed: total=%, skd=%, sd=%, smp=%, sma=%', v_tracks, v_cpns, v_sd, v_smp, v_sma;
  END IF;
  IF v_wallets <> 426 OR v_wallet_sum <> 5090 THEN
    RAISE EXCEPTION 'wallet reconciliation failed: wallets=%, balance_sum=%', v_wallets, v_wallet_sum;
  END IF;
  IF v_orphan_tracks <> 0 OR v_orphan_wallets <> 0 THEN
    RAISE EXCEPTION 'referential reconciliation failed: orphan_tracks=%, orphan_wallets=%', v_orphan_tracks, v_orphan_wallets;
  END IF;
END
$$;

COMMIT;

SELECT
  (SELECT count(*) FROM legacy_prod.auth_users_identity a JOIN auth.users u ON u.id=a.id::uuid) AS legacy_auth_uuid_preserved,
  (SELECT count(*) FROM legacy_prod.profiles l JOIN public.profiles p ON p.id=l.id::uuid) AS legacy_profiles_preserved,
  (SELECT count(*) FROM public.user_tracks ut JOIN legacy_prod.auth_users_identity a ON a.id::uuid=ut.user_id) AS user_tracks,
  (SELECT count(*) FROM public.wallets w JOIN legacy_prod.auth_users_identity a ON a.id::uuid=w.user_id WHERE w.wallet_type='exam_token') AS wallets,
  (SELECT coalesce(sum(w.balance),0) FROM public.wallets w JOIN legacy_prod.auth_users_identity a ON a.id::uuid=w.user_id WHERE w.wallet_type='exam_token') AS wallet_balance_sum,
  (SELECT count(*) FROM public.wallet_transactions wt WHERE wt.source_type='legacy_migration_opening_balance') AS opening_balance_rows;

SELECT t.slug AS track_slug, count(*) AS users
FROM public.user_tracks ut
JOIN public.tracks t ON t.id=ut.track_id
JOIN legacy_prod.auth_users_identity a ON a.id::uuid=ut.user_id
GROUP BY t.slug
ORDER BY t.slug;
