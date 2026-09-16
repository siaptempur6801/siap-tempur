# STATUS — Siap Tempur

> **Ini satu-satunya sumber kebenaran status project.**
> Terakhir diperbarui: **2026-09-16**
> Dokumen roadmap/checklist lama bersifat **historis** dan tidak boleh dijadikan acuan status — lihat [Peta dokumen](#peta-dokumen).

---

## 1. Produk

Platform tryout/latihan ujian berbasis web (B2C): **CPNS/SKD** dan **TKA** (jenjang sekolah).

Loop produk: **Latihan → ukur kemampuan → temukan kelemahan → perbaiki → ulangi.**

Stack: Next.js 16 (App Router) · TypeScript · Supabase (Auth + Postgres + RLS/RPC + Storage) · Midtrans · Vercel · Playwright + Vitest.

---

## 2. Environment

| Environment | Supabase project ref | Aplikasi | Catatan |
|---|---|---|---|
| Local | staging | `npm run dev` | `.env.local` menunjuk staging |
| Staging | `lpgrivowdcepcxradavu` | Vercel Preview | Sumber rehearse & E2E |
| Production | `llnttutwhtvxtdktiizo` | **domain publik SENGAJA TIDAK DIAKTIFKAN** | dark launch |

**Domain publik `siaptempur.id` sengaja tidak dibuka** karena project belum dinilai siap. DNS tetap mengarah ke Vercel, tetapi belum di-assign ke deployment yang hidup (saat ini 404).

> Status DB produksi (apakah Schema V2 sudah aktif) **belum diverifikasi** dari repo. Perlu pengecekan read-only di dashboard produksi — lihat [Bagian 7](#7-cara-verifikasi-cepat).

---

## 3. Status rilis

**Schema V2 Production Cutover: SELESAI 2026-09-01** (tag `production-v1-schema-v2-2026-09-01`).

- Runtime kanonik Schema V2 (98 tabel, RLS aktif di semua tabel) sudah menjadi `public` di produksi; skema lama diarsipkan ke `legacy_prod`.
- **Yang belum: eksposur publik.** Domain sengaja ditahan.
- Riwayat: `docs/PRODUCTION_CUTOVER_COMPLETION.md`, `docs/RELEASE_NOTES_2026-09-01_SCHEMA_V2.md`.

Cakupan Production V1: **CPNS/SKD + TKA SMP + Unified Admin + Commerce/Event**.
Di luar cakupan (ditunda): TKA SD, TKA SMA/SMK, B2B sekolah.

---

## 4. Milestone

| Milestone | Status |
|---|---|
| 1. Reviewer/Content Workspace + Unified Admin | ✅ selesai |
| 1.5 Admin UI/UX Hardening | ✅ selesai |
| 2. TKA SMP Mini + Core Product | ✅ selesai |
| 3. TKA SMP Learning Loop V1 | ✅ selesai |
| 4. TKA SMP Monetization | ✅ selesai (staging verified) — `docs/TKA_SMP_MONETIZATION_AUDIT.md` |
| 5. Schema V2 Production Cutover | ✅ cutover DB selesai; eksposur publik ditahan |
| 6. TKA SD hardening | ⏸ ditunda |
| 7. TKA SMA | ⏸ ditunda |
| 8. Platform expansion (B2B, notifikasi, analytics) | ⏸ ditunda |

---

## 5. Goal aktif

1. **Product Experience V1.1** — UI/UX, UX writing, copywriting, GTM (GitHub issue #21–#24).
   Backlog: `docs/PRODUCT_EXPERIENCE_V1_1_IMPLEMENTATION_BACKLOG.md`.
2. **Menutup blocker keamanan P0** sebelum domain dibuka (bagian 6).
3. **Merapikan maintainability**: satu sumber kebenaran status (dokumen ini), CI hijau, riwayat migrasi disamakan.

Goal berikutnya (belum aktif): **CPNS Instansi Managed Service** (B2B) — PRD di `docs/notes/prd-cpns-instansi-managed-service.md`.

---

## 6. Blocker aktif

### P0 — keamanan (kebocoran kunci jawaban)

Keduanya **terkonfirmasi AKTIF** di staging (schema dump read-only) **dan di produksi** (query read-only + uji eksploitasi 2026-09-16):

| # | Temuan | Status kode | Status DB |
|---|---|---|---|
| P0-1 | `public.get_content_question_detail` bisa dipanggil user login mana pun dan mengembalikan `is_correct`, `score`, `explanation` (guard memakai `status in ('approved','published')`) | ✅ diperbaiki | ✅ **staging 2026-09-16** · ✅ **produksi 2026-09-16** |
| P0-2 | `GRANT SELECT ON public.question_versions TO authenticated` + policy membuka snapshot jawaban soal approved/published | ✅ diperbaiki | ✅ **staging 2026-09-16** · ✅ **produksi 2026-09-16** |

**Bukti sebelum perbaikan di produksi (2026-09-16):** guard `VULNERABLE`, grant + policy ada; uji dengan identitas user biasa (transaksi di-rollback) mengembalikan `options`, `explanation`, dan **`is_correct` = true** → kunci jawaban benar-benar terbaca.

**Bukti sesudah perbaikan (staging & produksi):**

| Skenario | Hasil |
|---|---|
| User login biasa (tanpa permission) memanggil `get_content_question_detail` | ❌ `Question detail access denied` (benar) |
| User login biasa membaca `question_versions` | ❌ `permission denied for table question_versions` (benar) |
| User dengan `content.read/review/publish` memanggil RPC | ✅ tetap boleh (workspace review tidak rusak) — *diverifikasi di staging; produksi belum punya user ber-role* |
| Integritas data | ✅ tidak berubah (produksi: 428 profil, 1088 soal sebelum & sesudah) |

- Migration perbaikan: `supabase/migrations/20260916213000_*.sql`, `20260916213100_*.sql` — **sudah di-apply ke staging dan produksi**, tercatat di `supabase_migrations.schema_migrations` masing-masing.
- Regression test: `tests/unit/answer-key-access-contract.test.ts`
- Catatan: apply memakai `supabase db query --file` karena `supabase db push` tidak bisa jalan (riwayat migrasi tidak sinkron, bagian 8).

### P1 — operasional produksi (temuan 2026-09-16)

- ✅ **Admin produksi sudah ditetapkan (2026-09-16):** `SUPER_ADMIN` untuk `halimdirga8@gmail.com` (`d8c37906-29c8-4a47-8c10-ed2e19dc0de2`). Terverifikasi via `get_user_authorization` → 21 permission termasuk `admin.access`. Sebelumnya `public.user_roles` = 0 baris sehingga **tidak ada seorang pun** yang bisa mengakses `/admin`. *Perbaikan P0-1/P0-2 tidak menimbulkan masalah ini — guard baru hanya menegakkan apa yang seharusnya.*
- [ ] User konten (`CONTENT_EDITOR` / `CONTENT_REVIEWER`) di produksi belum ada — bisa ditetapkan oleh admin dari panel.
- ⚠️ **Flag `tka.smp.monetization_enforcement` = ON (rollout 100%, mode `enforced`) di produksi**, padahal `docs/TKA_SMP_MONETIZATION_AUDIT.md` menyatakan enforcement produksi masih NO-GO. Dampak: TKA SMP Full Tryout terkunci penuh tanpa Tempur Pass, Mini Tryout hanya 1 percobaan gratis. Perlu keputusan sebelum domain dibuka.
- ✅ **Diperbaiki (2026-09-16):** `updateEventCertificateName` (`app/actions/admin.ts`) dulu membaca kolom `profiles.role` yang **sudah tidak ada** di Schema V2 → query error tanpa dicek, sehingga aksi ini selalu `Unauthorized` bahkan untuk admin asli. Kini memakai `isAdmin()` (permission service). Regression test: `tests/unit/admin-authorization-contract.test.ts`.

### P0 — operasional

- CI di `main` sempat merah ±12 hari karena locator E2E basi. **Sudah diperbaiki & diverifikasi lokal** (24/24 test publik lolos); tinggal dipastikan hijau di GitHub setelah push.

### P1 — keamanan/kualitas

- ✅ **Timer ujian ditegakkan server-side (2026-09-16).** `AttemptAnswerService` menolak penyimpanan jawaban setelah `started_at + durationSeconds` (+ toleransi 30 detik) lewat kode error `ATTEMPT_TIME_EXPIRED`. Sebelumnya hanya timer browser. Attempt tanpa durasi (drill/latihan) tidak dibatasi. Test: `tests/unit/attempt-deadline.test.ts`.
- ✅ **`getResult` memeriksa `status === 'completed'` (2026-09-16)** — `src/services/practice-result.service.ts`. Sebelumnya fail-open (hanya bergantung pada halaman pemanggil).
- ✅ **`fulfill_paid_order` diverifikasi aman (2026-09-16):** ACL di staging **dan** produksi hanya `postgres` + `service_role`; `anon`, `authenticated`, dan `PUBLIC` **tidak** bisa execute. Cek internal `auth.role()` bersifat opsional (defense-in-depth) — belum ditambahkan karena menuntut penulisan ulang fungsi pembayaran ±220 baris dengan risiko regresi lebih besar daripada manfaatnya.
- ✅ **Validasi zod server-side di auth action (2026-09-16)** — `login`, `signup`, `forgotPassword`, `resetPassword`, `resendVerificationEmail`, `updatePassword`; cast `FormData` yang bisa bernilai `null` juga dihapus. Test: `tests/unit/auth-validation-contract.test.ts`.
- ✅ **Rate limit aplikasi di auth action (2026-09-16)** — `login` 10/5 menit per IP; `signup` 5/15 menit per IP; `forgotPassword` & `resendVerificationEmail` 10/15 menit per IP **dan** 3/15 menit per email (email di-hash, tidak disimpan mentah). Memakai `checkRateLimit` yang sudah ada (Upstash Redis, fallback in-memory, fail-open saat Redis mati). Test: `tests/unit/auth-rate-limit.test.ts`.
- ⚠️ **Aksi di luar kode:** set `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` di Vercel (staging & produksi). Tanpa itu limiter jatuh ke in-memory yang **per-instance** dan mudah ditembus di serverless.
- ⚠️ **Belum diverifikasi:** urutan header IP di `lib/request-ip.ts` (`x-vercel-forwarded-for` → `x-real-ip` → `x-forwarded-for`) belum diuji terhadap deployment Vercel nyata. Sampai terbukti, anggap ini pertahanan tambahan — rate limit Supabase Auth tetap jaring pengaman otoritatif.
- [ ] Belum ada regression test untuk replay webhook secara end-to-end (unit webhook sudah ada).

---

## 7. Gate membuka domain publik

Domain tidak boleh diaktifkan sebelum **semua** ini hijau:

- [x] P0-1 & P0-2 ditutup **dan diverifikasi di staging** (2026-09-16).
- [x] P0-1 & P0-2 ditutup **dan diverifikasi di produksi** (2026-09-16).
- [x] Status produksi diverifikasi (fungsi, grant, policy, feature flag) — 2026-09-16.
- [x] **Admin produksi ditetapkan** — `SUPER_ADMIN` untuk `halimdirga8@gmail.com` (2026-09-16).
- [x] **Keputusan flag monetisasi TKA SMP** — diputuskan tetap **ON** (2026-09-16).
- [ ] CI `main` hijau di GitHub.
- [x] Riwayat migrasi remote disamakan (baseline 2026-09-16, staging & produksi).
- [ ] Regression test kebocoran kunci jawaban berjalan di CI.
- [x] Enforcement timer ujian server-side (2026-09-16).
- [x] Critical user journey diverifikasi di browser: publik (30 test) + ber-auth (30 test: login → onboarding → dashboard, seluruh route CPNS/TKA).
- [ ] Rate limit efektif lintas instance: env Upstash terpasang di staging & produksi.
- [ ] Verifikasi header IP tepercaya di deployment nyata (`lib/request-ip.ts`).
- [ ] (Disarankan) Product Experience V1.1 selesai.

### Cara verifikasi cepat

Sudah ada di repo:

```bash
npm run lint && npm run typecheck && npx vitest run && npm run build
E2E_REMOTE_BASE_URL=1 BASE_URL=http://127.0.0.1:3100 npx playwright test --project=chromium-public
```

Cek DB (read-only, SQL Editor). Untuk `question_versions` hasilnya harus **0 baris**:

```sql
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'question_versions'
  and grantee in ('anon', 'authenticated');

select pg_get_functiondef(p.oid)
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'app_private' and p.proname = 'get_content_question_detail';
-- definisi tidak boleh mengandung: status in ('approved','published')
```

---

## 8. Kondisi teknis saat ini

| Area | Kondisi |
|---|---|
| Lint | ✅ **0 error, 0 warning** |
| Typecheck / Unit / Build | ✅ hijau (205 unit test, 45 file) |
| E2E publik (`chromium-public`) | ✅ 30/30 lolos (termasuk cek console browser) |
| E2E ber-auth (`chromium-authenticated`) | ✅ 30/30 lolos (login → onboarding → dashboard, 27 route CPNS/TKA) — opt-in, butuh kredensial staging |
| E2E staging ber-kredensial lain (TKA, content review, admin, CPNS) | butuh kredensial/OIDC; dijalankan lewat workflow khusus |
| CI | `ci.yml` = lint + typecheck + unit + audit + build + E2E. Workflow E2E staging lain menyala via `pull_request`/`workflow_dispatch` |
| **Riwayat migrasi remote** | ✅ **disamakan 2026-09-16** (staging & produksi → 155 baris = tepat daftar file repo). `supabase db push` kembali normal: *"Remote database is up to date."* Arsip sebelum baseline: `supabase/migration-history-archive/` |
| CSP | satu sumber: nonce + `strict-dynamic` di `proxy.ts` (CSP statis di `next.config.ts` sudah dihapus) |
| Feature flag | `tka.smp.monetization_enforcement` — state staging/produksi perlu dikonfirmasi |

---

## Peta dokumen

**Kanonik (pakai ini):**

| Dokumen | Isi |
|---|---|
| `docs/STATUS.md` | status terkini (dokumen ini) |
| `AGENTS.md` | aturan kerja untuk developer & AI |
| `docs/production-readiness.md` | checklist gate deploy |
| `docs/schema-v2-cutover-runbook.md` | runbook cutover |
| `docs/ADMIN_UI_UX_STANDARD.md` | standar UI admin |
| `docs/PRODUCT_EXPERIENCE_V1_1_IMPLEMENTATION_BACKLOG.md` | backlog goal aktif |
| `docs/TKA_SMP_MONETIZATION_AUDIT.md` | audit penutupan Milestone 4 |
| `supabase/migrations/README.md` | catatan migrasi |

**Historis (jangan dipakai sebagai status):**

`docs/EXECUTION_ROADMAP.md` · `docs/FEATURE_STATUS_CHECKLIST.md` · `docs/FEATURE_STATUS_CHECKLIST_M4_SYNC.md` · `docs/PRODUCTION_V1_SCOPE.md` · `docs/TKA_SMP_PRODUCTION_ROLLOUT.md` · `docs/PRODUCTION_CUTOVER_READINESS.md` · `docs/notes/*`

---

## Aturan

1. **Status hanya ditulis di dokumen ini.** Dokumen milestone bersifat append-only/historis.
2. Migration ke staging boleh dijalankan setelah project ref diverifikasi; **produksi wajib GO eksplisit**.
3. Jangan deploy, jangan ubah env produksi, jangan commit otomatis tanpa diminta.
4. Detail aturan kerja: `AGENTS.md`.
