# Runbook — Rilis aplikasi dan migration (audit fase 1, B-01/B-02)

Keputusan pemilik 2026-11-17: dokumentasikan alurnya; pengaturan GitHub dan Vercel diterapkan
pemilik sendiri. Push ke `main` memicu deploy production Vercel secara otomatis
(STATUS §1), sehingga **merge = rilis**.

## Aturan

1. **Tidak ada push langsung ke `main`.** Semua perubahan lewat PR dengan CI hijau.
2. **Migration lebih dulu, kode belakangan.** Migration harus kompatibel-mundur
   (kode lama tetap jalan setelah migration diterapkan). Terapkan ke staging, verifikasi,
   terapkan ke production, baru merge PR aplikasi yang membutuhkannya.
3. **Satu migration, satu langkah.** Terapkan satu per satu, cek ledger dan postcondition setiap
   langkah (pola rilis 2026-10-07 di STATUS).
4. **Gate paritas** `node scripts/local-gates/run-gate.mjs parity` setelah migration production.

## Pengaturan sekali jalan (pemilik)

### GitHub — proteksi branch `main`

Settings → Branches (atau Rules → Rulesets) → aturan untuk `main`:

- Require a pull request before merging.
- Require status checks to pass → pilih **`CI / verify`** saja. Jangan wajibkan
  `Schema V2 CI / verify` atau workflow staging E2E: ketiganya memakai filter `paths`, jadi
  pada PR yang tidak menyentuh path tersebut check-nya tidak pernah muncul dan merge
  tertahan selamanya.
- Require branches to be up to date before merging.
- Block force pushes; jangan izinkan bypass kecuali darurat yang dicatat.

### Vercel — deploy hanya setelah CI hijau

Pilih salah satu:

- **Disarankan:** Project → Settings → Git → aktifkan pengaturan yang membuat deployment
  production menunggu GitHub checks (nama menu dapat berbeda per versi dashboard), atau
- Ignored Build Step yang membatalkan build production bila commit belum punya check sukses.

Dengan proteksi branch di atas, setiap commit di `main` sudah lolos CI, jadi Vercel cukup
men-deploy `main`.

### GitHub — secret untuk cron per jam

Settings → Secrets and variables → Actions → New repository secret `CRON_SECRET`
(nilai sama dengan env Vercel Production). Workflow `reconcile-payments-cron.yml` gagal dengan
pesan jelas bila secret belum diisi.

## Urutan rilis

1. Buka PR. Tunggu CI hijau dan tinjau diff migration.
2. Staging: terapkan migration baru satu per satu (`supabase db query --remote` atau SQL editor),
   catat versi ledger = nama file.
3. Jalankan smoke/E2E staging yang relevan.
4. Production: preflight read-only → terapkan migration satu per satu → cek ledger → gate paritas.
5. Merge PR → Vercel deploy otomatis.
6. Smoke production: `/api/health` (dengan `HEALTH_CHECK_TOKEN`), halaman publik, login, satu alur
   pembelian kecil bila rilis menyentuh pembayaran.
7. Catat hasilnya di `docs/STATUS.md`.

## Migration dari audit fase 1 (urutan wajib, sebelum merge branch audit)

| Urutan | File | Dipakai kode |
|---|---|---|
| 1 | `20261118090000_serialize_event_ranking_recalculation.sql` | tidak (perbaikan internal) |
| 2 | `20261118091000_leaderboard_direct_attempts_only.sql` | tidak (membangun ulang papan aktif) |
| 3 | `20261118092000_finalize_expired_attempts.sql` | ya — cron finalisasi |
| 4 | `20261118093000_reverse_paid_orders_all_products.sql` | ya — webhook refund, cron, admin |
| 5 | `20261118094000_consume_entitlement_for_attempt.sql` | ya — mulai ujian bila ada entitlement |

Semuanya kompatibel-mundur: kode `main` saat ini tetap berfungsi setelah kelimanya diterapkan
(`reverse_tka_token_order` dipertahankan sebagai alias). Jika kode branch audit ter-deploy lebih
dulu, refund webhook gagal 500 (Midtrans mengulang) dan langkah cron baru melapor error sampai
migration diterapkan.

## Rollback

- **Aplikasi:** Vercel → Deployments → deployment sebelumnya → Promote/Instant Rollback.
  Aman selama migration bersifat kompatibel-mundur (aturan 2).
- **Database:** migration maju-saja. Untuk lima migration di atas, rollback = terapkan ulang
  definisi fungsi sebelumnya dari migration asalnya:
  `recalculate_event_rankings` (`20260820131000`), `recalculate_leaderboard`/`rebuild_leaderboard`
  (`20260918140000`, lalu `rebuild_leaderboard` per papan aktif), `fulfill_paid_order` dan
  `reverse_tka_token_order` (`20261012183809`). Fungsi baru (`list_expired_in_progress_attempts`,
  `finalize_expired_sectioned_attempt`, `reverse_paid_order`, `consume_entitlement_for_attempt`)
  cukup di-`DROP` setelah kode yang memakainya di-rollback. Perubahan data dari refund/finalisasi
  yang sudah terjadi **tidak** dibatalkan oleh rollback fungsi.
- **Restore penuh:** PITR Supabase (belum diuji, lihat checklist `production-readiness.md`).

## Uji lokal migration (tanpa menyentuh staging/production)

Audit fase 1 memverifikasi migration di Postgres lokal dari image `supabase/postgres` yang sudah
ada di mesin pengembang. Catatan: berkas `scripts/cutover/bootstrap/*.sql` tidak dapat diputar ulang
apa adanya (pemisah `;` antar-fungsi hilang setelah diformat, dan urutan constraint saling
bergantung). Perlu diperbaiki sebelum dijadikan alat pemulihan (temuan B-14).
