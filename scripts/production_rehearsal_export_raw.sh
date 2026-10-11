#!/usr/bin/env bash
set -euo pipefail

EXPECTED_PROJECT_REF="llnttutwhtvxtdktiizo"

if [[ -z "${PROD_DB_URL:-}" ]]; then
  echo "ERROR: PROD_DB_URL is required."
  echo "Set it to the full production Postgres connection string, then rerun."
  exit 1
fi

# Require an actual PostgreSQL URI. A bare project ref/database name would make psql
# silently fall back to a local Unix socket, which is unsafe/confusing for rehearsal.
case "$PROD_DB_URL" in
  postgresql://* | postgres://*) ;;
  *)
    echo "ERROR: PROD_DB_URL is not a PostgreSQL connection URI."
    echo "Expected it to begin with postgresql:// or postgres://."
    echo "Copy the full connection string from Supabase Production > Connect."
    exit 1
    ;;
esac

# Guard against accidentally exporting from the wrong remote project.
if [[ "$PROD_DB_URL" != *"${EXPECTED_PROJECT_REF}"* ]]; then
  echo "ERROR: PROD_DB_URL does not contain expected production project ref ${EXPECTED_PROJECT_REF}."
  echo "Refusing to continue."
  exit 1
fi

# Explicitly refuse localhost targets for the production exporter.
case "$PROD_DB_URL" in
  *"127.0.0.1"* | *"localhost"*)
    echo "ERROR: PROD_DB_URL points to localhost. Refusing production export."
    exit 1
    ;;
esac

if ! command -v psql >/dev/null 2>&1; then
  echo "ERROR: psql is required."
  exit 1
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_DIR="${SNAPSHOT_DIR:-snapshots/production-raw-${STAMP}}"
PUBLIC_DIR="${OUT_DIR}/public"
mkdir -p "$PUBLIC_DIR"
chmod 700 "$OUT_DIR" "$PUBLIC_DIR"
umask 077

# Do not rely on PGOPTIONS/default_transaction_read_only for hosted poolers.
# Every production read is executed inside an explicit READ ONLY transaction.
PSQL=(psql "$PROD_DB_URL" -X -v ON_ERROR_STOP=1)

ro_scalar() {
  local sql="$1"
  "${PSQL[@]}" -qAt \
    -c 'BEGIN TRANSACTION READ ONLY;' \
    -c "SET LOCAL statement_timeout = '120s';" \
    -c "$sql" \
    -c 'ROLLBACK;'
}

ro_copy_query() {
  local sql="$1"
  local outfile="$2"
  "${PSQL[@]}" -q \
    -c 'BEGIN TRANSACTION READ ONLY;' \
    -c "SET LOCAL statement_timeout = '120s';" \
    -c "\\copy (${sql}) TO '${outfile}' WITH (FORMAT csv, HEADER true)" \
    -c 'ROLLBACK;'
}

ro_copy_table() {
  local table="$1"
  local outfile="$2"
  "${PSQL[@]}" -q \
    -c 'BEGIN TRANSACTION READ ONLY;' \
    -c "SET LOCAL statement_timeout = '120s';" \
    -c "\\copy public.\"${table}\" TO '${outfile}' WITH (FORMAT csv, HEADER true)" \
    -c 'ROLLBACK;'
}

READ_ONLY="$(ro_scalar 'show transaction_read_only')"
if [[ "$READ_ONLY" != "on" ]]; then
  echo "ERROR: explicit production transaction is not read-only. Refusing to export."
  exit 1
fi

echo "Production snapshot export"
echo "- output: $OUT_DIR"
echo "- transaction_read_only: $READ_ONLY"
echo "- production writes: blocked by explicit BEGIN TRANSACTION READ ONLY"

# Preserve only the auth identity keys required for UUID reconciliation.
# Credentials, email addresses, provider tokens, and auth metadata are deliberately NOT exported.
ro_copy_query \
  "select id, created_at from auth.users order by id" \
  "${OUT_DIR}/auth_users_identity.csv"

# Capture public-table column metadata so the local raw loader can create a faithful staging shape.
ro_copy_query \
  "select table_schema, table_name, ordinal_position, column_name, data_type, udt_schema, udt_name, is_nullable from information_schema.columns where table_schema='public' order by table_name, ordinal_position" \
  "${OUT_DIR}/public_columns.csv"

printf 'table_name,row_count\n' >"${OUT_DIR}/public_row_counts.csv"

# Export every production public BASE TABLE. This intentionally favors completeness over a hand-maintained table allowlist.
ro_scalar "select tablename from pg_catalog.pg_tables where schemaname='public' order by tablename" \
  | while IFS= read -r table; do
    if [[ ! "$table" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
      echo "ERROR: unexpected table name: $table"
      exit 1
    fi

    echo "Exporting public.${table} ..."
    ro_copy_table "$table" "${PUBLIC_DIR}/${table}.csv"
    count="$(ro_scalar "select count(*) from public.\"${table}\"")"
    printf '%s,%s\n' "$table" "$count" >>"${OUT_DIR}/public_row_counts.csv"
  done

# Count exported tables from the manifest (header excluded), compatible with macOS Bash 3.x.
TABLE_COUNT="$(tail -n +2 "${OUT_DIR}/public_row_counts.csv" | wc -l | tr -d ' ')"

# Re-run the committed non-PII baseline checks against the exact same source after export.
# The whole baseline file is also forced into an explicit READ ONLY transaction.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASELINE_SQL="${SCRIPT_DIR}/production_rehearsal_source_baseline.sql"
if [[ -f "$BASELINE_SQL" ]]; then
  "${PSQL[@]}" -q \
    -c 'BEGIN TRANSACTION READ ONLY;' \
    -c "SET LOCAL statement_timeout = '120s';" \
    -f "$BASELINE_SQL" \
    -c 'ROLLBACK;' \
    >"${OUT_DIR}/source_baseline.txt"
fi

cat >"${OUT_DIR}/README.txt" <<EOF
Siap Tempur production rehearsal raw snapshot
Created: $(date -u +%Y-%m-%dT%H:%M:%SZ)
Expected source project: ${EXPECTED_PROJECT_REF}
Read-only source transaction: ${READ_ONLY}

IMPORTANT:
- This directory can contain production user/business data from public tables.
- Keep it local only.
- Never commit, upload, paste, or share these CSV files.
- auth_users_identity.csv intentionally contains UUID + created_at only; no auth credentials/email/provider metadata are exported.
EOF

chmod -R go-rwx "$OUT_DIR"

echo
echo "Snapshot complete: $OUT_DIR"
echo "Public tables exported: $TABLE_COUNT"
echo "Next: load this snapshot into local legacy_prod staging tables, never into production."
