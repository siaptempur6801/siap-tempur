# Local gate runner untuk SiapTempur (pengganti GitHub Actions).
#
# Image ini berisi Node 24 + Chromium (Playwright) sehingga gate staging bisa dijalankan
# lokal tanpa GitHub Actions/billing.
#
# Build:
#   docker build -f docker/local-gates.Dockerfile -t siap-tempur-local-gates .
#
# Jalankan (lihat scripts/local-gates/docker-run.sh):
#   docker run --rm -v "$PWD":/work -v siap-tempur-gate-node-modules:/work/node_modules \
#     --env-file .env.local -w /work siap-tempur-local-gates \
#     sh -c "npm install --no-audit --no-fund && node scripts/local-gates/run-gate.mjs tka"
#
# Catatan: `node_modules` container disimpan di named volume supaya tidak menimpa
# node_modules host (binary macOS vs Linux berbeda).
FROM node:24-bookworm

ENV DEBIAN_FRONTEND=noninteractive \
    CI=1 \
    NEXT_TELEMETRY_DISABLED=1 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Dependensi browser + util dasar untuk Next.js build.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates curl git jq \
    && rm -rf /var/lib/apt/lists/*

# Chromium + dependensi sistemnya (sekali saja, dipakai semua gate).
RUN npx --yes playwright@1.60.0 install --with-deps chromium

WORKDIR /work
