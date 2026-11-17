#!/usr/bin/env bash
# Jalankan gate staging lokal di dalam Docker (tanpa GitHub Actions).
#
# Pemakaian:
#   scripts/local-gates/docker-run.sh tka
#   scripts/local-gates/docker-run.sh cpns admin
#   scripts/local-gates/docker-run.sh all
#
# Env tambahan yang dihormati: SKIP_BUILD=1 (lewati `next build`), IMAGE=... , VOLUME=...
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

IMAGE="${IMAGE:-siap-tempur-local-gates}"
VOLUME="${VOLUME:-siap-tempur-gate-node-modules}"
GATES="${*:-tka}"

if [[ ! -f .env.local ]]; then
  echo "❌ .env.local tidak ditemukan (butuh NEXT_PUBLIC_SUPABASE_URL staging + service role)." >&2
  exit 1
fi

if ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
  echo "🐳 build image $IMAGE (sekali saja; berisi Chromium)…"
  docker build -f docker/local-gates.Dockerfile -t "$IMAGE" .
fi

# Catatan: node_modules disimpan di named volume agar tidak menimpa node_modules host
# (binary macOS tidak kompatibel dengan container Linux).
FORWARD_ENV=()
while IFS= read -r name; do
  [[ -n "$name" ]] && FORWARD_ENV+=(-e "$name")
done < <(grep -oE '^[A-Za-z_][A-Za-z0-9_]*' .env.local | sort -u)

echo "🐳 menjalankan gate: $GATES"
docker run --rm \
  -v "$REPO_ROOT":/work \
  -v "$VOLUME":/work/node_modules \
  -w /work \
  --env-file .env.local \
  "${FORWARD_ENV[@]}" \
  -e CI=true \
  -e E2E_DISABLE_AUTH_RATE_LIMIT=1 \
  -e SKIP_BUILD="${SKIP_BUILD:-0}" \
  -e PORT_HELPER="${PORT_HELPER:-54399}" \
  "$IMAGE" \
  bash -lc "npm install --no-audit --no-fund >/dev/null 2>&1 || npm install --no-audit --no-fund; node scripts/local-gates/run-gate.mjs $GATES"
