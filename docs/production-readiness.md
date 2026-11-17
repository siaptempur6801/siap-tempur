# Production Readiness Checklist

This project should only be deployed from a clean branch after these gates pass.

## Required CI Gates

- `npm run lint`
- `npm run typecheck`
- `npm run test:unit`
- `npm run build`
- `npm run test:e2e`
- `npm audit --audit-level=moderate`

## Required Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MIDTRANS_SERVER_KEY`
- `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`
- `NEXT_PUBLIC_SITE_URL`

Required for effective distributed rate limiting (auth actions dan payment):

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Tanpa keduanya, rate limiter jatuh ke penyimpanan in-memory yang bersifat
per-instance, sehingga mudah ditembus pada deployment serverless multi-instance.

## Supabase Checks Before Deploy

- RLS is enabled on all user data tables.
- User-facing policies enforce `auth.uid()` ownership.
- Admin-only data is only reachable through server actions or route handlers with `isAdmin()`.
- Service-role usage is limited to server code.
- Payment RPCs are idempotent and covered by tests or manual verification.

### WAJIB: gate paritas skema staging ↔ produksi

```bash
node scripts/local-gates/run-gate.mjs parity
```

**Mengapa ini wajib, bukan opsional.** `supabase db push` **tidak dapat
dipercaya** sebagai bukti bahwa skema remote sesuai repo. Pada 2026-09-18
ditemukan produksi kehilangan **7 fungsi dan 2 tabel** sementara ledger migrasi
produksi menyatakan migrasi pembuatnya sudah `applied`; tidak ada satu pun
migration di repo yang menjatuhkan objek-objek itu. Akibatnya halaman
`/tka/[level]/focus` gagal dimuat di produksi.

Jalankan gate ini **setelah setiap `db push` ke produksi**. Gate gagal keras
(exit 1) bila ada selisih di luar daftar putih. Detail lengkap dan cara
menangani selisih yang disengaja:
[`docs/DB_PARITY_STAGING_PRODUCTION_2026-09-18.md`](DB_PARITY_STAGING_PRODUCTION_2026-09-18.md).

> Gate ini sengaja **tidak** ditaruh di `.github/workflows/ci.yml` karena CI
> standar tidak boleh memegang kredensial database yang mampu admin (lihat
> komentar di workflow tersebut). Ia dijalankan lokal atau sebagai langkah rilis
> manual.

## Release Rules

- Do not deploy with untracked generated artifacts in the branch.
- Do not deploy with local `.env*` files committed.
- Confirm Midtrans sandbox keys are not used in production.
- Confirm webhook URL points to the production deployment.
- Confirm rollback path is available before release.
- **Jalankan gate paritas skema** (`run-gate.mjs parity`) setelah setiap
  `db push` ke produksi, dan pastikan hijau sebelum deploy dianggap selesai.

