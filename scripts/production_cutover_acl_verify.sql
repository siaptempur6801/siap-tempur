-- Siap Tempur Schema V2 ACL verifier
-- READ ONLY. No DDL/DML is permitted in this file.
-- Verifies ACL details that are not covered by production_cutover_runtime_schema_verify.sql.
-- 1) Column-level grants: canonical target = 9 entries.
WITH column_acl AS (
  SELECT
    c.relname,
    a.attname,
    coalesce(r.rolname, 'PUBLIC') grantee,
    x.privilege_type,
    x.is_grantable
  FROM
    pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    CROSS JOIN LATERAL aclexplode(a.attacl) x
    LEFT JOIN pg_roles r ON r.oid = x.grantee
  WHERE
    n.nspname = 'public'
    AND c.relkind = 'r'
    AND a.attnum > 0
    AND NOT a.attisdropped
    AND a.attacl IS NOT NULL
),
actual AS (
  SELECT
    count(*)::bigint count,
    md5(coalesce(string_agg(relname || '|' || attname || '|' || grantee || '|' || privilege_type || '|' || is_grantable::text, E'\n' ORDER BY relname, attname, grantee, privilege_type, is_grantable), ''))
    hash
  FROM
    column_acl
)
SELECT
  9::bigint AS expected_count,
  count AS actual_count,
  '209cfe23d54fce5cd041b94209d596b6' AS expected_hash,
  hash AS actual_hash,
  (count = 9
    AND hash = '209cfe23d54fce5cd041b94209d596b6') AS gate_ok
FROM
  actual;

-- 2) postgres default privileges in public: canonical target = 24 entries.
WITH default_acl AS (
  SELECT
    coalesce(n.nspname, '<global>') schema_name,
    d.defaclobjtype::text defaclobjtype,
    coalesce(g.rolname, 'PUBLIC') grantee,
    x.privilege_type,
    x.is_grantable
  FROM
    pg_default_acl d
    JOIN pg_roles OWNER ON owner.oid = d.defaclrole
      AND owner.rolname = 'postgres'
    LEFT JOIN pg_namespace n ON n.oid = d.defaclnamespace
    CROSS JOIN LATERAL aclexplode(d.defaclacl) x
    LEFT JOIN pg_roles g ON g.oid = x.grantee
  WHERE
    n.nspname = 'public'
),
actual AS (
  SELECT
    count(*)::bigint count,
    md5(coalesce(string_agg(schema_name || '|' || defaclobjtype || '|' || grantee || '|' || privilege_type || '|' || is_grantable::text, E'\n' ORDER BY schema_name, defaclobjtype, grantee, privilege_type, is_grantable), ''))
    hash
  FROM
    default_acl
)
SELECT
  24::bigint AS expected_count,
  count AS actual_count,
  '9919ee686742866fd139b906c31c17a0' AS expected_hash,
  hash AS actual_hash,
  (count = 24
    AND hash = '9919ee686742866fd139b906c31c17a0') AS gate_ok
FROM
  actual;

-- 3) Sequence ownership must match canonical runtime.
SELECT
  coalesce(pg_get_serial_sequence('public.attempt_events', 'id') = 'public.attempt_events_id_seq', FALSE) AS attempt_events_sequence_owned,
  coalesce(pg_get_serial_sequence('public.audit_logs', 'id') = 'public.audit_logs_id_seq', FALSE) AS audit_logs_sequence_owned;
