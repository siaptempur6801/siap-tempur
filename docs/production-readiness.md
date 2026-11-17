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

Sumber kebenaran: `lib/env.ts`. Lingkungan ditentukan oleh `APP_ENV`
(atau `NEXT_PUBLIC_APP_ENV`); bila kosong, `VERCEL_ENV=production` → production
dan `VERCEL_ENV=preview` → staging.

| Variabel | Production | Staging/Preview | Catatan |
|---|---|---|---|
| `APP_ENV`, `NEXT_PUBLIC_APP_ENV` | `production` | `staging` | Set eksplisit; jangan andalkan fallback `VERCEL_ENV` |
| `NEXT_PUBLIC_SUPABASE_URL` | wajib | wajib | Staging diblokir memakai project ref production |
| `NEXT_PUBLIC_SUPABASE_EXPECTED_PROJECT_REF` | — | disarankan | Guard project ref staging |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | wajib | wajib | `NEXT_PUBLIC_SUPABASE_ANON_KEY` hanya fallback lama |
| `SUPABASE_SERVICE_ROLE_KEY` | wajib | wajib | Rahasia; server saja |
| `MIDTRANS_SERVER_KEY`, `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` | wajib | diabaikan | Kunci production |
| `MIDTRANS_SERVER_KEY_SANDBOX`, `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY_SANDBOX` | diabaikan | wajib | Kunci sandbox |
| `NEXT_PUBLIC_SITE_URL` | wajib | wajib | Dipakai sitemap, robots, CSRF origin, metadata |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | wajib | disarankan | Lihat catatan rate limit |
| `CRON_SECRET` | wajib | bila cron dijadwalkan | Kosong → `/api/cron/*` selalu 401 dan rekonsiliasi berhenti diam-diam |
| `CSP_REPORT_URI` | opsional | opsional | Endpoint laporan pelanggaran CSP |
| `HEALTH_CHECK_TOKEN` | disarankan | — | `Authorization: Bearer …` membuka detail `/api/health` (commit SHA, store rate limit) di production; tanpa token publik hanya melihat `status` |

**Rate limit.** Di production, limiter auth/payment bersifat **fail-closed**:
tanpa Upstash atau saat Upstash gagal, permintaan dianggap terkena limit
(`lib/api-utils.ts`). Artinya env Upstash yang hilang membuat login/daftar
ditolak, bukan sekadar tidak terlindungi. `/api/health` melaporkan
`rateLimitStore: "unconfigured"` dan status 503 untuk kondisi ini, tetapi tidak
melakukan ping ke Redis. Di luar production, limiter jatuh ke memori
per-instance.

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

## Operasional yang belum terdokumentasi (audit 2026-11-17)

Butir di bawah belum punya bukti di repo. Isi pemilik, lokasi, dan tanggal
verifikasi terakhir sebelum menandainya selesai; jangan centang berdasarkan
asumsi.

- [ ] **Backup database production**: tier Supabase, aktif/tidaknya PITR,
      periode retensi, dan tanggal uji restore terakhir ke project terpisah.
- [ ] **Rollback aplikasi**: deployment Vercel sebelumnya yang dipakai untuk
      "Instant Rollback", siapa yang berwenang, dan cara memastikan migration
      yang sudah ter-apply tetap kompatibel dengan kode lama.
- [ ] **Rollback database**: migration bersifat maju-saja. Untuk setiap
      migration yang mengubah data/ACL, catat SQL kompensasi atau prosedur
      restore sebelum apply.
- [ ] **Monitoring dan alert**: tujuan log (`lib/logger.ts`), alert untuk
      `/api/health` 503, kegagalan webhook Midtrans, kegagalan cron rekonsiliasi,
      dan pelanggaran CSP (`CSP_REPORT_URI`).
- [ ] **Jadwal cron**: `vercel.json` menjalankan rekonsiliasi pembayaran sekali
      sehari (`0 0 * * *`, UTC). Pembayaran yang webhook-nya hilang bisa tertunda
      hingga 24 jam; putuskan apakah itu dapat diterima.
- [ ] **Pemisahan staging/production**: env Vercel Preview menunjuk staging,
      Production menunjuk project production, dan Edge Function `ci-e2e-*` tidak
      ter-deploy di project production.
- [ ] **Kontak insiden** dan kanal eskalasi, termasuk kontak Midtrans dan
      Supabase.

