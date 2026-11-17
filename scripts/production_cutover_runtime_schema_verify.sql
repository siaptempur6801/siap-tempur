-- Siap Tempur Schema V2 canonical runtime verifier
-- READ ONLY. No DDL/DML is permitted in this file.
--
-- Purpose:
--   1) verify an isolated reconstructed bootstrap against canonical staging runtime state;
--   2) verify production after an explicitly-authorized cutover.
--
-- Migration-only CPNS staging tables/views/functions are intentionally excluded.
-- 1) Runtime object fingerprints.
WITH cols AS (
  SELECT
    c.relname,
    a.attnum,
    a.attname,
    pg_catalog.format_type(a.atttypid, a.atttypmod) data_type,
    a.attnotnull,
    coalesce(pg_get_expr(ad.adbin, ad.adrelid), '') default_expr,
    a.attidentity::text attidentity,
    a.attgenerated::text attgenerated
  FROM
    pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid
      AND a.attnum > 0
      AND NOT a.attisdropped
    LEFT JOIN pg_attrdef ad ON ad.adrelid = c.oid
      AND ad.adnum = a.attnum
  WHERE
    n.nspname = 'public'
    AND c.relkind IN ('r', 'p')
),
cons AS (
  SELECT
    c.relname,
    con.conname,
    pg_get_constraintdef(con.oid, TRUE) def
  FROM
    pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE
    n.nspname = 'public'
),
idx AS (
  SELECT
    c.relname,
    i.relname index_name,
    pg_get_indexdef(i.oid) def
  FROM
    pg_index x
    JOIN pg_class c ON c.oid = x.indrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_class i ON i.oid = x.indexrelid
  WHERE
    n.nspname = 'public'
),
funcs AS (
  SELECT
    n.nspname,
    p.proname,
    pg_get_function_identity_arguments(p.oid) args,
    pg_get_functiondef(p.oid) def
  FROM
    pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE
    n.nspname IN ('public', 'app_private')
    AND p.prokind IN ('f', 'p')
    AND NOT (n.nspname = 'app_private'
      AND p.proname = 'validate_cpns_legacy_mapping_review')
    AND NOT (n.nspname = 'public'
      AND p.proname IN ('get_cpns_legacy_import_summary', 'import_reviewed_cpns_legacy_batch', 'import_reviewed_cpns_legacy_question', 'stage_cpns_legacy_question', 'upsert_cpns_legacy_mapping_review'))
),
trgs AS (
  SELECT
    c.relname,
    t.tgname,
    pg_get_triggerdef(t.oid, TRUE) def
  FROM
    pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE
    n.nspname = 'public'
    AND NOT t.tgisinternal
),
pols AS (
  SELECT
    tablename,
    policyname,
    permissive,
    coalesce(array_to_string(roles, ','), '') roles,
    cmd,
    coalesce(qual, '') qual,coalesce(with_check,'') with_check
  FROM
    pg_policies
  WHERE
    schemaname = 'public'
),
seqs AS (
  SELECT
    sequencename,
    coalesce(start_value::text, '') || '|' || coalesce(min_value::text, '') || '|' || coalesce(max_value::text, '') || '|' || coalesce(increment_by::text, '') || '|' || coalesce(CYCLE::text, '') def
  FROM
    pg_sequences
  WHERE
    schemaname = 'public'
),
actual AS (
  SELECT
    'tables' category,
    (
      SELECT
        count(*)
      FROM
        pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE
        n.nspname = 'public'
        AND c.relkind IN ('r', 'p'))::bigint count,
      md5(coalesce((
          SELECT
            string_agg(c.relname, E'\n' ORDER BY c.relname)
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE
          n.nspname = 'public'
          AND c.relkind IN ('r', 'p')), ''))
      hash
    UNION ALL
    SELECT
      'columns',
      count(*)::bigint,
      md5(coalesce(string_agg(relname || '|' || attnum::text || '|' || attname || '|' || data_type || '|' || attnotnull::text || '|' || default_expr || '|' || attidentity || '|' || attgenerated, E'\n' ORDER BY relname, attnum), ''))
    FROM
      cols
    UNION ALL
    SELECT
      'constraints',
      count(*)::bigint,
      md5(coalesce(string_agg(relname || '|' || conname || '|' || def, E'\n' ORDER BY relname, conname), ''))
    FROM
      cons
    UNION ALL
    SELECT
      'indexes',
      count(*)::bigint,
      md5(coalesce(string_agg(relname || '|' || index_name || '|' || def, E'\n' ORDER BY relname, index_name), ''))
    FROM
      idx
    UNION ALL
    SELECT
      'runtime_functions',
      count(*)::bigint,
      md5(coalesce(string_agg(nspname || '.' || proname || '(' || args || ')|' || def, E'\n' ORDER BY nspname, proname, args), ''))
    FROM
      funcs
    UNION ALL
    SELECT
      'runtime_public_triggers',
      count(*)::bigint,
      md5(coalesce(string_agg(relname || '|' || tgname || '|' || def, E'\n' ORDER BY relname, tgname), ''))
    FROM
      trgs
    UNION ALL
    SELECT
      'policies',
      count(*)::bigint,
      md5(coalesce(string_agg(tablename || '|' || policyname || '|' || permissive || '|' || roles || '|' || cmd || '|' || qual || '|' || with_check, E'\n' ORDER BY tablename, policyname), ''))
    FROM
      pols
    UNION ALL
    SELECT
      'sequences',
      count(*)::bigint,
      md5(coalesce(string_agg(sequencename || '|' || def, E'\n' ORDER BY sequencename), ''))
    FROM
      seqs
),
expected (
  category, count, hash
) AS (
  VALUES ('tables', 98::bigint, '31c5755439cc95afaa6048926bb45f23'),
    ('columns', 823::bigint, '18bf18549161ffc7c28772fa6bd48771'),
    ('constraints', 369::bigint, '18ea88a6124dcaa216afa16e410cdce8'),
    ('indexes', 368::bigint, '1788349683b55f78fabdb8e986b60d52'),
    ('runtime_functions', 80::bigint, 'e147d38d3801ac4c02ad41e21c02fe2a'),
    ('runtime_public_triggers', 11::bigint, '96b6d77f0c85d8a977cb18d5e1b108bc'),
    ('policies', 95::bigint, '23530b7447a51944807e82e3231c3c68'),
    ('sequences', 2::bigint, 'ae1743f34f7a1648e378e6d346eef986'))
SELECT
  e.category,
  e.count expected_count,
  a.count actual_count,
  e.hash expected_hash,
  a.hash actual_hash,
  (e.count = a.count
    AND e.hash = a.hash) AS gate_ok
FROM
  expected e
  LEFT JOIN actual a USING (category)
ORDER BY
  e.category;

-- 2) Runtime ACL fingerprints.
WITH table_acl AS (
  SELECT
    n.nspname,
    c.relname,
    c.relkind::text relkind,
    coalesce(grantee.rolname, 'PUBLIC') grantee,
    x.privilege_type,
    x.is_grantable
  FROM
    pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    CROSS JOIN LATERAL aclexplode(coalesce(c.relacl, acldefault(
          CASE WHEN c.relkind = 'S' THEN
            'S'::"char"
          ELSE
            'r'::"char"
          END, c.relowner))) x
    LEFT JOIN pg_roles grantee ON grantee.oid = x.grantee
  WHERE
    n.nspname = 'public'
    AND c.relkind IN ('r', 'p', 'v', 'm', 'S')
),
function_acl AS (
  SELECT
    n.nspname,
    p.proname,
    pg_get_function_identity_arguments(p.oid) args,
    coalesce(grantee.rolname, 'PUBLIC') grantee,
    x.privilege_type,
    x.is_grantable
  FROM
    pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    CROSS JOIN LATERAL aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) x
    LEFT JOIN pg_roles grantee ON grantee.oid = x.grantee
  WHERE
    n.nspname IN ('public', 'app_private')
    AND p.prokind IN ('f', 'p')
    AND NOT (n.nspname = 'app_private'
      AND p.proname = 'validate_cpns_legacy_mapping_review')
    AND NOT (n.nspname = 'public'
      AND p.proname IN ('get_cpns_legacy_import_summary', 'import_reviewed_cpns_legacy_batch', 'import_reviewed_cpns_legacy_question', 'stage_cpns_legacy_question', 'upsert_cpns_legacy_mapping_review'))
),
schema_acl AS (
  SELECT
    n.nspname,
    coalesce(grantee.rolname, 'PUBLIC') grantee,
    x.privilege_type,
    x.is_grantable
  FROM
    pg_namespace n
    CROSS JOIN LATERAL aclexplode(coalesce(n.nspacl, acldefault('n', n.nspowner))) x
    LEFT JOIN pg_roles grantee ON grantee.oid = x.grantee
  WHERE
    n.nspname IN ('public', 'app_private')
),
actual AS (
  SELECT
    'runtime_function_acl' category,
    count(*)::bigint count,
    md5(coalesce(string_agg(nspname || '.' || proname || '(' || args || ')|' || grantee || '|' || privilege_type || '|' || is_grantable::text, E'\n' ORDER BY nspname, proname, args, grantee, privilege_type, is_grantable), ''))
    hash
  FROM
    function_acl
  UNION ALL
  SELECT
    'runtime_schema_acl',
    count(*)::bigint,
    md5(coalesce(string_agg(nspname || '|' || grantee || '|' || privilege_type || '|' || is_grantable::text, E'\n' ORDER BY nspname, grantee, privilege_type, is_grantable), ''))
  FROM
    schema_acl
  UNION ALL
  SELECT
    'runtime_table_acl',
    count(*)::bigint,
    md5(coalesce(string_agg(nspname || '.' || relname || '|' || relkind || '|' || grantee || '|' || privilege_type || '|' || is_grantable::text, E'\n' ORDER BY nspname, relname, grantee, privilege_type, is_grantable), ''))
  FROM
    table_acl
),
expected (
  category, count, hash
) AS (
  VALUES ('runtime_function_acl', 166::bigint, 'fbfcd289d78e77af89e5d9117e8af833'),
    ('runtime_schema_acl', 10::bigint, '28854a5ad42ca691a4c5700a9b8c3da7'),
    ('runtime_table_acl', 1659::bigint, 'c5fdcbcef6ef9ea81401b3b513c63d36'))
SELECT
  e.category,
  e.count expected_count,
  a.count actual_count,
  e.hash expected_hash,
  a.hash actual_hash,
  (e.count = a.count
    AND e.hash = a.hash) AS gate_ok
FROM
  expected e
  LEFT JOIN actual a USING (category)
ORDER BY
  e.category;

-- 3) RLS posture and auth trigger/handler.
SELECT
  (
    SELECT
      count(*)
    FROM
      pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE
      n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
      AND c.relrowsecurity) = 98 AS all_runtime_tables_rls_enabled,
  (
    SELECT
      count(*)
    FROM
      pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE
      n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
      AND c.relforcerowsecurity) = 0 AS no_force_rls_expected,
  coalesce((
    SELECT
      md5(pg_get_triggerdef(t.oid, TRUE)) = '786e53a33077b3a68f1ec248e238d18a' FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE
    NOT t.tgisinternal
    AND n.nspname = 'auth'
    AND c.relname = 'users'
    AND t.tgname = 'on_auth_user_created'), FALSE) AS auth_user_trigger_ok,
  coalesce((
    SELECT
      md5(pg_get_functiondef(p.oid)) = 'dbae3074708706cbe687389241c39a16' FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE
    n.nspname = 'public'
    AND p.proname = 'handle_new_user'
    AND pg_get_function_identity_arguments(p.oid) = ''), FALSE) AS canonical_handle_new_user_ok;
