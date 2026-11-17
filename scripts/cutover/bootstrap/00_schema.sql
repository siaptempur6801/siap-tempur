-- Canonical runtime schema boundary, frozen from staging lpgrivowdcepcxradavu.
-- DO NOT apply to production before explicit final GO.
CREATE SCHEMA app_private AUTHORIZATION postgres;

-- public schema ACL: canonical staging and current production already agree.
REVOKE ALL ON SCHEMA public FROM PUBLIC, anon, authenticated, service_role, postgres;

GRANT USAGE ON SCHEMA public TO PUBLIC, anon, authenticated, postgres, service_role;

-- Bootstrap-only build privilege. Required because the following source-controlled
-- fragments create runtime sequences/tables/functions in public as postgres.
-- 17_triggers.sql revokes this again before final ACL normalization/verification.
GRANT CREATE ON SCHEMA public TO postgres;

-- app_private is intentionally not exposed to anon/service_role at schema level.
REVOKE ALL ON SCHEMA app_private FROM PUBLIC, anon, authenticated, service_role;

GRANT USAGE ON SCHEMA app_private TO authenticated;
