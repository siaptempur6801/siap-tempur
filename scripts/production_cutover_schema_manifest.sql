-- Siap Tempur Schema V2 production cutover readiness
-- READ ONLY. This file must never contain INSERT/UPDATE/DELETE/DDL.
-- Run independently against canonical staging and legacy production.
-- Approved refs:
--   staging    lpgrivowdcepcxradavu
--   production llnttutwhtvxtdktiizo
-- 1) Global DDL fingerprints for public + app_private.
WITH cols AS (
  SELECT
    n.nspname AS schema_name,
    c.relname AS object_name,
    a.attnum,
    a.attname,
    pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
    a.attnotnull,
    coalesce(pg_get_expr(ad.adbin, ad.adrelid), '') AS default_expr,
    a.attidentity::text AS attidentity,
    a.attgenerated::text AS attgenerated
  FROM
    pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid
      AND a.attnum > 0
      AND NOT a.attisdropped
    LEFT JOIN pg_attrdef ad ON ad.adrelid = c.oid
      AND ad.adnum = a.attnum
  WHERE
    n.nspname IN ('public', 'app_private')
    AND c.relkind IN ('r', 'p')
),
cons AS (
  SELECT
    n.nspname AS schema_name,
    c.relname AS object_name,
    con.conname,
    pg_get_constraintdef(con.oid, TRUE) AS def
  FROM
    pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE
    n.nspname IN ('public', 'app_private')
),
idx AS (
  SELECT
    n.nspname AS schema_name,
    c.relname AS object_name,
    i.relname AS index_name,
    pg_get_indexdef(i.oid) AS def
  FROM
    pg_index x
    JOIN pg_class c ON c.oid = x.indrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_class i ON i.oid = x.indexrelid
  WHERE
    n.nspname IN ('public', 'app_private')
),
funcs AS (
  SELECT
    n.nspname AS schema_name,
    p.proname,
    pg_get_function_identity_arguments(p.oid) AS args,
    pg_get_functiondef(p.oid) AS def
  FROM
    pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE
    n.nspname IN ('public', 'app_private')
    AND p.prokind IN ('f', 'p')
),
trgs AS (
  SELECT
    n.nspname AS schema_name,
    c.relname AS object_name,
    t.tgname,
    pg_get_triggerdef(t.oid, TRUE) AS def
  FROM
    pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE
    n.nspname IN ('public', 'app_private')
    AND NOT t.tgisinternal
),
pols AS (
  SELECT
    schemaname AS schema_name,
    tablename AS object_name,
    policyname,
    permissive,
    coalesce(array_to_string(roles, ','), '') AS roles,
    cmd,
    coalesce(qual, '') as qual,coalesce(with_check,'') AS with_check
  FROM
    pg_policies
  WHERE
    schemaname IN ('public', 'app_private')
),
views AS (
  SELECT
    n.nspname AS schema_name,
    c.relname AS object_name,
    c.relkind::text AS relkind,
    pg_get_viewdef(c.oid, TRUE) AS def
  FROM
    pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE
    n.nspname IN ('public', 'app_private')
    AND c.relkind IN ('v', 'm')
),
seqs AS (
  SELECT
    schemaname AS schema_name,
    sequencename AS object_name,
    coalesce(start_value::text, '') || '|' || coalesce(min_value::text, '') || '|' || coalesce(max_value::text, '') || '|' || coalesce(increment_by::text, '') || '|' || coalesce(CYCLE::text, '') AS def
  FROM
    pg_sequences
  WHERE
    schemaname IN ('public', 'app_private')
),
ROWS AS (
  SELECT
    'columns' category,
    count(*)::bigint count,
    md5(coalesce(string_agg(schema_name || '.' || object_name || '|' || attnum::text || '|' || attname || '|' || data_type || '|' || attnotnull::text || '|' || default_expr || '|' || attidentity || '|' || attgenerated, E'\n' ORDER BY schema_name, object_name, attnum), ''))
    hash
  FROM
    cols
  UNION ALL
  SELECT
    'constraints',
    count(*)::bigint,
    md5(coalesce(string_agg(schema_name || '.' || object_name || '|' || conname || '|' || def, E'\n' ORDER BY schema_name, object_name, conname), ''))
  FROM
    cons
  UNION ALL
  SELECT
    'indexes',
    count(*)::bigint,
    md5(coalesce(string_agg(schema_name || '.' || object_name || '|' || index_name || '|' || def, E'\n' ORDER BY schema_name, object_name, index_name), ''))
  FROM
    idx
  UNION ALL
  SELECT
    'functions',
    count(*)::bigint,
    md5(coalesce(string_agg(schema_name || '.' || proname || '(' || args || ')|' || def, E'\n' ORDER BY schema_name, proname, args), ''))
  FROM
    funcs
  UNION ALL
  SELECT
    'triggers',
    count(*)::bigint,
    md5(coalesce(string_agg(schema_name || '.' || object_name || '|' || tgname || '|' || def, E'\n' ORDER BY schema_name, object_name, tgname), ''))
  FROM
    trgs
  UNION ALL
  SELECT
    'policies',
    count(*)::bigint,
    md5(coalesce(string_agg(schema_name || '.' || object_name || '|' || policyname || '|' || permissive || '|' || roles || '|' || cmd || '|' || qual || '|' || with_check, E'\n' ORDER BY schema_name, object_name, policyname), ''))
  FROM
    pols
  UNION ALL
  SELECT
    'views',
    count(*)::bigint,
    md5(coalesce(string_agg(schema_name || '.' || object_name || '|' || relkind || '|' || def, E'\n' ORDER BY schema_name, object_name), ''))
  FROM
    views
  UNION ALL
  SELECT
    'sequences',
    count(*)::bigint,
    md5(coalesce(string_agg(schema_name || '.' || object_name || '|' || def, E'\n' ORDER BY schema_name, object_name), ''))
  FROM
    seqs
)
SELECT
  category,
  count,
  hash
FROM
  ROWS
ORDER BY
  category;

-- 2) Per-table public schema signatures.
WITH table_cols AS (
  SELECT
    c.oid,
    c.relname,
    c.relrowsecurity,
    count(a.*)::int AS column_count,
    md5(string_agg(a.attnum::text || '|' || a.attname || '|' || pg_catalog.format_type(a.atttypid, a.atttypmod) || '|' || a.attnotnull::text || '|' || coalesce(pg_get_expr(ad.adbin, ad.adrelid), ''), E'\n' ORDER BY a.attnum)) AS column_hash
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
  GROUP BY
    c.oid,
    c.relname,
    c.relrowsecurity
),
con AS (
  SELECT
    c.oid,
    count(*)::int AS constraint_count,
    md5(string_agg(con.conname || '|' || pg_get_constraintdef(con.oid, TRUE), E'\n' ORDER BY con.conname)) AS constraint_hash
  FROM
    pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE
    n.nspname = 'public'
  GROUP BY
    c.oid
)
SELECT
  t.relname AS table_name,
  t.column_count,
  t.column_hash,
  coalesce(con.constraint_count, 0) AS constraint_count,
  coalesce(con.constraint_hash, md5('')) AS constraint_hash,
  t.relrowsecurity AS rls_enabled
FROM
  table_cols t
  LEFT JOIN con ON con.oid = t.oid
ORDER BY
  t.relname;
