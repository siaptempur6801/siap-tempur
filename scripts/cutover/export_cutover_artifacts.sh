#!/usr/bin/env bash
set -euo pipefail

# READ-ONLY artifact exporter for Schema V2 cutover rehearsal.
# It captures:
#   1) the complete legacy production public schema (DDL only),
#   2) the existing guarded production raw-data snapshot,
#   3) only the canonical staging V1 catalog/content/config data required before Phase 1-3.
#
# This script NEVER writes to production or staging. Artifacts contain production/business data
# and must remain local/private. Do not commit or upload the output directory.

EXPECTED_PROD_REF="llnttutwhtvxtdktiizo"
EXPECTED_STAGING_REF="lpgrivowdcepcxradavu"

if [[ -z "${PROD_DB_URL:-}" || -z "${STAGING_DB_URL:-}" ]]; then
  echo "ERROR: PROD_DB_URL and STAGING_DB_URL are required." >&2
  exit 1
fi

validate_remote_url() {
  local label="$1"
  local url="$2"
  local expected_ref="$3"
  case "$url" in
    postgresql://*|postgres://*) ;;
    *) echo "ERROR: ${label} URL is not a PostgreSQL URI." >&2; exit 1 ;;
  esac
  case "$url" in
    *127.0.0.1*|*localhost*) echo "ERROR: ${label} URL unexpectedly points to localhost." >&2; exit 1 ;;
  esac
  if [[ "$url" != *"${expected_ref}"* ]]; then
    echo "ERROR: ${label} URL does not contain expected project ref ${expected_ref}." >&2
    exit 1
  fi
}

validate_remote_url "production" "$PROD_DB_URL" "$EXPECTED_PROD_REF"
validate_remote_url "staging" "$STAGING_DB_URL" "$EXPECTED_STAGING_REF"

for bin in psql pg_dump; do
  if ! command -v "$bin" >/dev/null 2>&1; then
    echo "ERROR: ${bin} is required." >&2
    exit 1
  fi
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_DIR="${CUTOVER_ARTIFACT_DIR:-${HOME}/Projects/siap-tempur-cutover-artifacts/${STAMP}}"
PROD_RAW_DIR="${OUT_DIR}/production_raw"
mkdir -p "$OUT_DIR"
chmod 700 "$OUT_DIR"
umask 077

PROD_PSQL=(psql "$PROD_DB_URL" -X -v ON_ERROR_STOP=1 -qAt)
STAGING_PSQL=(psql "$STAGING_DB_URL" -X -v ON_ERROR_STOP=1 -qAt)

ro_check() {
  local -n cmd_ref=$1
  local sql="$2"
  "${cmd_ref[@]}" \
    -c 'BEGIN TRANSACTION READ ONLY;' \
    -c "SET LOCAL statement_timeout = '120s';" \
    -c "$sql" \
    -c 'ROLLBACK;'
}

# macOS ships Bash 3.x, which does not support nameref. Re-run the two checks explicitly.
PROD_READ_ONLY="$("${PROD_PSQL[@]}" -c 'BEGIN TRANSACTION READ ONLY;' -c "SET LOCAL statement_timeout = '120s';" -c 'show transaction_read_only' -c 'ROLLBACK;' | tail -n 1)"
STAGING_READ_ONLY="$("${STAGING_PSQL[@]}" -c 'BEGIN TRANSACTION READ ONLY;' -c "SET LOCAL statement_timeout = '120s';" -c 'show transaction_read_only' -c 'ROLLBACK;' | tail -n 1)"
if [[ "$PROD_READ_ONLY" != "on" || "$STAGING_READ_ONLY" != "on" ]]; then
  echo "ERROR: explicit read-only transaction verification failed." >&2
  exit 1
fi

# Freeze the exact release-candidate catalog/content invariants before exporting data.
SEED_GATE_SQL="select
  (select count(*) from public.programs),
  (select count(*) from public.tracks),
  (select count(*) from public.subjects),
  (select count(*) from public.questions),
  (select count(*) from public.question_versions),
  (select count(*) from public.exams),
  (select count(*) from public.products),
  (select count(*) from public.questions where source_type='legacy_migration' and status='draft'),
  (select count(*) from public.question_versions qv join public.questions q on q.id=qv.question_id where q.source_type='legacy_migration' and q.status='draft'),
  (select count(*) from public.questions where question_code in ('TIU-000033','TIU-000064','TIU-000065','TWK-000385','TWK-000448','TWK-000461')),
  (select count(*) from (select author_id id from public.questions where author_id is not null union select reviewer_id from public.questions where reviewer_id is not null union select created_by from public.exams where created_by is not null union select changed_by from public.question_versions where changed_by is not null union select author_id from public.materials where author_id is not null union select reviewer_id from public.materials where reviewer_id is not null union select author_id from public.articles where author_id is not null union select updated_by from public.system_settings where updated_by is not null) r where id not in ('4cf7114c-7613-4676-9aa9-64793f855f04'::uuid,'93b4d35b-a1fb-4a16-9304-fef1116002cf'::uuid));"
SEED_GATE="$("${STAGING_PSQL[@]}" -F '|' -c 'BEGIN TRANSACTION READ ONLY;' -c "SET LOCAL statement_timeout = '120s';" -c "$SEED_GATE_SQL" -c 'ROLLBACK;' | grep -E '^[0-9]+\|' | tail -n 1)"
EXPECTED_SEED_GATE="2|4|32|1086|552|17|11|433|0|0|0"
if [[ "$SEED_GATE" != "$EXPECTED_SEED_GATE" ]]; then
  echo "ERROR: canonical staging seed gate drifted." >&2
  echo "expected: $EXPECTED_SEED_GATE" >&2
  echo "actual:   $SEED_GATE" >&2
  echo "Reconcile/re-freeze staging before cutover rehearsal." >&2
  exit 1
fi
printf '%s\n' "$SEED_GATE" > "${OUT_DIR}/canonical_seed_gate.txt"

# 1) Complete legacy production public DDL. pg_dump is a read-only client; PGOPTIONS adds a
# second guard so accidental statements in the session cannot mutate production.
echo "[1/3] Export production public schema (read-only) ..."
PGOPTIONS="-c default_transaction_read_only=on -c statement_timeout=120000" \
  pg_dump "$PROD_DB_URL" \
    --schema-only \
    --schema=public \
    --no-owner \
    --no-privileges \
    --format=plain \
    --file="${OUT_DIR}/production_public_schema.sql"

# 2) Existing production raw exporter already forces every source read into BEGIN READ ONLY.
echo "[2/3] Export production raw snapshot (read-only) ..."
PROD_DB_URL="$PROD_DB_URL" SNAPSHOT_DIR="$PROD_RAW_DIR" \
  bash "${REPO_ROOT}/scripts/production_rehearsal_export_raw.sh"

# 3) Canonical V1 seed. Deliberately excludes profiles/user state/attempts/orders/events and CI
# residue. Two fixed technical auth/profile actors are created by the LOCAL rehearsal/cutover
# runner before restoring this dump, satisfying author/reviewer/created_by FKs without importing
# any staging learner identity.
SEED_TABLES=(
  programs tracks subjects periods track_periods
  knowledge_nodes knowledge_node_paths
  exam_types exam_rules exam_blueprints exam_blueprint_rules exams exam_sections exam_question_items
  question_stimuli questions question_options question_explanations question_assets
  question_knowledge_nodes question_versions tags question_tags
  features feature_flags system_settings
  products product_prices product_features product_wallet_grants
  roles permissions role_permissions
  certificate_templates materials material_knowledge_nodes articles
)
PG_DUMP_TABLE_ARGS=()
for table in "${SEED_TABLES[@]}"; do
  PG_DUMP_TABLE_ARGS+=("--table=public.${table}")
done

echo "[3/3] Export canonical staging V1 seed (read-only) ..."
PGOPTIONS="-c default_transaction_read_only=on -c statement_timeout=120000" \
  pg_dump "$STAGING_DB_URL" \
    --data-only \
    --no-owner \
    --no-privileges \
    --format=plain \
    --serializable-deferrable \
    "${PG_DUMP_TABLE_ARGS[@]}" \
    --file="${OUT_DIR}/canonical_v1_seed.sql"

hash_file() {
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" | awk '{print $1}'
  else
    sha256sum "$1" | awk '{print $1}'
  fi
}

cat > "${OUT_DIR}/manifest.txt" <<EOF
created_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)
production_ref=${EXPECTED_PROD_REF}
staging_ref=${EXPECTED_STAGING_REF}
production_transaction_read_only=${PROD_READ_ONLY}
staging_transaction_read_only=${STAGING_READ_ONLY}
canonical_seed_gate=${SEED_GATE}
production_public_schema_sha256=$(hash_file "${OUT_DIR}/production_public_schema.sql")
canonical_v1_seed_sha256=$(hash_file "${OUT_DIR}/canonical_v1_seed.sql")
production_raw_tree=see production_raw/README.txt and source_baseline.txt
EOF
chmod -R go-rwx "$OUT_DIR"

echo
echo "PASS: cutover rehearsal artifacts exported without remote writes."
echo "Artifact directory: $OUT_DIR"
echo "Keep this directory local/private; it contains production business/user data."
