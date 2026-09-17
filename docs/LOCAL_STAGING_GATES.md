# Gate staging versi lokal (tanpa GitHub Actions)

Dokumen ini menjelaskan cara menjalankan **gate acceptance staging** SiapTempur di mesin lokal
atau di dalam Docker, sebagai pengganti `*-staging-e2e.yml` di GitHub Actions (mis. ketika menit
Actions dibatasi/billing akun bermasalah).

Status: dipakai sejak 2026-09-17. Hasil terakhir ada di `docs/STATUS.md`.

---

## 1. Ringkas

Tiga gate yang tersedia:

| Gate | Perintah | Isi |
|---|---|---|
| TKA | `node scripts/local-gates/run-gate.mjs tka` | 16 test: diagnostik, drill fokus, mini tryout, full tryout, remedial, monetisasi |
| CPNS | `node scripts/local-gates/run-gate.mjs cpns` | 4 test: full lifecycle, mini tryout, drill, state & charge |
| Admin | `GATE_BASE_URL=<preview> E2E_EXPECTED_HEAD_SHA=<sha> node scripts/local-gates/run-gate.mjs admin` | 6 test: workspace admin ber-autentikasi |

Semua gate:

1. membangun aplikasi dengan env staging,
2. menjalankan **emulator Edge Function** (`scripts/local-gates/ci-helper.mjs`) di
   `127.0.0.1:54399`,
3. menjalankan project Playwright yang sama seperti di CI,
4. membersihkan user `ci-*` di staging dan mengembalikan flag monetisasi ke OFF.

Port default sengaja **54399** (bukan 54321) agar tidak bentrok dengan `supabase start` lokal.

---

## 2. Prasyarat

- `.env.local` menunjuk **staging** (`lpgrivowdcepcxradavu`) dan berisi
  `SUPABASE_SERVICE_ROLE_KEY` (dipakai emulator untuk provisioning user uji).
- Node 24 + dependency repo (`npm install`).
- Untuk gate Admin: `VERCEL_AUTOMATION_BYPASS_SECRET` (sudah ada di `.env.local`) dan URL Preview
  untuk commit yang diuji.

---

## 3. Menjalankan

### Lokal (native)

```bash
# TKA (build + 16 test, ~8-10 menit)
node scripts/local-gates/run-gate.mjs tka

# CPNS
node scripts/local-gates/run-gate.mjs cpns

# Admin (butuh Preview + SHA)
GATE_BASE_URL="https://<preview>.vercel.app" \
E2E_EXPECTED_HEAD_SHA="$(git rev-parse HEAD)" \
node scripts/local-gates/run-gate.mjs admin

# semua gate berurutan
node scripts/local-gates/run-gate.mjs all

# hanya bersihkan sisa user ci-* & reset flag monetisasi
ONLY_CLEANUP=1 node scripts/local-gates/run-gate.mjs
```

Opsi env: `SKIP_BUILD=1`, `PORT_APP=3100`, `PORT_HELPER=54399`.

### Docker

```bash
scripts/local-gates/docker-run.sh tka
scripts/local-gates/docker-run.sh cpns admin
```

`docker-run.sh` membangun image `siap-tempur-local-gates` (Node 24 + Chromium) sekali, lalu
menjalankan gate di dalam container dengan repo di-mount. `node_modules` container disimpan di
named volume `siap-tempur-gate-node-modules` supaya **tidak** menimpa `node_modules` host
(binary macOS ≠ Linux).

---

## 4. Cara kerja emulator

Edge Function `ci-e2e-user`, `ci-e2e-cpns`, `ci-e2e-admin`, dan `ci-e2e-m4` diverifikasi dengan
GitHub OIDC sehingga tidak bisa dipanggil dari lokal. Emulator meniru endpoint dan aksi yang sama
memakai service-role key:

| Endpoint | Aksi |
|---|---|
| `ci-e2e-user` | `provision` (user + jalur TKA SMP aktif, atau role content), `cleanup` |
| `ci-e2e-cpns` | `provision` (user + jalur CPNS SKD aktif + wallet 3 token), `cleanup` |
| `ci-e2e-admin` | `provision` (user + role ADMIN), `cleanup` |
| `ci-e2e-m4` | `set_enforcement`, `grant_pass`, `clear_pass`, `consume_mini`, `seed_order`, `assign_admin`, `clear_m4`, `snapshot` |

Spec E2E memakai helper `tests/e2e/ci-helper.ts` untuk menentukan base URL:

- **CI**: `CI_E2E_HELPER_BASE_URL` tidak diset → memakai `${NEXT_PUBLIC_SUPABASE_URL}/functions/v1`
  (Edge Function asli + OIDC).
- **Lokal**: `CI_E2E_HELPER_BASE_URL=http://127.0.0.1:54399/functions/v1` + `E2E_GITHUB_OIDC_TOKEN`
  dummy → emulator.

`supabaseUrl` tetap menunjuk staging supaya penjaga `assertStagingUrl` di spec tetap berlaku.

---

## 5. Batasan & keamanan

- **Staging saja.** Emulator menolak jalan bila `NEXT_PUBLIC_SUPABASE_URL` bukan staging.
- **Lokal saja.** Emulator tidak memverifikasi OIDC dan memakai service-role key; jangan pernah
  diekspos ke jaringan publik atau dipakai di produksi.
- **Gate Admin tetap butuh Vercel Preview.** Spec-nya memverifikasi `deploymentCommitSha` sama
  dengan commit yang diuji, jadi arahkan `GATE_BASE_URL` ke Preview commit tersebut.
- Gate TKA sengaja berjalan **tanpa** service role asli (`SUPABASE_SERVICE_ROLE_KEY=ci-no-service-role`)
  seperti workflow aslinya, supaya jalur RLS/RPC tetap teruji. Halaman hasil sudah tahan terhadap
  kegagalan lookup XP (lihat design doc / `docs/STATUS.md`).
- Sisa user `ci-*` dan flag monetisasi selalu dibersihkan di akhir run.
