#!/usr/bin/env bash
set -euo pipefail

# READ-ONLY staging exporter for the exact canonical runtime function definitions used by
# Schema V2 cutover rehearsal. This avoids relying on stale source fragments while still
# freezing a strict, checksummed staging artifact before any local destructive rehearsal.

EXPECTED_STAGING_REF="lpgrivowdcepcxradavu"
EXPECTED_FUNCTION_COUNT="80"
EXPECTED_FUNCTION_HASH="e147d38d3801ac4c02ad41e21c02fe2a"

if [[ -z "${STAGING_DB_URL:-}" ]]; then
  echo "ERROR: STAGING_DB_URL is required." >&2
  exit 1
fi
if [[ -z "${ARTIFACT_DIR:-}" ]]; then
  echo "ERROR: ARTIFACT_DIR is required." >&2
  exit 1
fi

case "$STAGING_DB_URL" in
  postgresql://*|postgres://*) ;;
  *) echo "ERROR: STAGING_DB_URL is not a PostgreSQL URI." >&2; exit 1 ;;
esac
case "$STAGING_DB_URL" in
  *127.0.0.1*|*localhost*) echo "ERROR: STAGING_DB_URL unexpectedly points to localhost." >&2; exit 1 ;;
esac
if [[ "$STAGING_DB_URL" != *"${EXPECTED_STAGING_REF}"* ]]; then
  echo "ERROR: STAGING_DB_URL does not contain expected project ref ${EXPECTED_STAGING_REF}." >&2
  exit 1
fi
if ! command -v psql >/dev/null 2>&1; then
  echo "ERROR: psql is required." >&2
  exit 1
fi
if [[ ! -d "$ARTIFACT_DIR" ]]; then
  echo "ERROR: artifact directory does not exist: $ARTIFACT_DIR" >&2
  exit 1
fi

umask 077
OUT_FILE="${ARTIFACT_DIR}/canonical_runtime_functions.sql"
GATE_FILE="${ARTIFACT_DIR}/canonical_runtime_functions_gate.txt"
TMP_FILE="${OUT_FILE}.tmp"

FILTER_SQL="
  n.nspname in ('public','app_private') and p.prokind in ('f','p')
  and not (n.nspname='app_private' and p.proname='validate_cpns_legacy_mapping_review')
  and not (n.nspname='public' and p.proname in (
    'get_cpns_legacy_import_summary',
    'import_reviewed_cpns_legacy_batch',
    'import_reviewed_cpns_legacy_question',
    'stage_cpns_legacy_question',
    'upsert_cpns_legacy_mapping_review'
  ))"

GATE_SQL="with funcs as (
 select n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) args,
        pg_get_functiondef(p.oid) def
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where ${FILTER_SQL}
)
select count(*)::text || '|' || md5(coalesce(string_agg(
  nspname||'.'||proname||'('||args||')|'||def,
  E'\\n' order by nspname,proname,args
),'')) from funcs;"

GATE="$(psql "$STAGING_DB_URL" -X -v ON_ERROR_STOP=1 -qAt \
  -c 'BEGIN TRANSACTION READ ONLY;' \
  -c "SET LOCAL statement_timeout = '120s';" \
  -c "$GATE_SQL" \
  -c 'ROLLBACK;' | grep -E '^[0-9]+\|' | tail -n 1)"

EXPECTED_GATE="${EXPECTED_FUNCTION_COUNT}|${EXPECTED_FUNCTION_HASH}"
if [[ "$GATE" != "$EXPECTED_GATE" ]]; then
  echo "ERROR: staging runtime function fingerprint drifted." >&2
  echo "expected: $EXPECTED_GATE" >&2
  echo "actual:   $GATE" >&2
  exit 1
fi
printf '%s\n' "$GATE" > "$GATE_FILE"

EXPORT_SQL="select rtrim(pg_get_functiondef(p.oid)) || E';\\n'
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where ${FILTER_SQL}
order by n.nspname,p.proname,pg_get_function_identity_arguments(p.oid);"

psql "$STAGING_DB_URL" -X -v ON_ERROR_STOP=1 -qAt \
  -c 'BEGIN TRANSACTION READ ONLY;' \
  -c "SET LOCAL statement_timeout = '120s';" \
  -c "$EXPORT_SQL" \
  -c 'ROLLBACK;' > "$TMP_FILE"

COUNT="$(grep -c '^CREATE OR REPLACE \(FUNCTION\|PROCEDURE\)' "$TMP_FILE" || true)"
if [[ "$COUNT" != "$EXPECTED_FUNCTION_COUNT" ]]; then
  rm -f "$TMP_FILE"
  echo "ERROR: exported runtime function definition count is ${COUNT}, expected ${EXPECTED_FUNCTION_COUNT}." >&2
  exit 1
fi

mv "$TMP_FILE" "$OUT_FILE"
chmod 600 "$OUT_FILE" "$GATE_FILE"

if command -v shasum >/dev/null 2>&1; then
  SHA="$(shasum -a 256 "$OUT_FILE" | awk '{print $1}')"
else
  SHA="$(sha256sum "$OUT_FILE" | awk '{print $1}')"
fi
printf 'canonical_runtime_functions_sha256=%s\n' "$SHA" >> "$GATE_FILE"

echo "PASS: canonical staging runtime functions frozen read-only."
echo "Function gate: $GATE"
echo "Output: $OUT_FILE"
