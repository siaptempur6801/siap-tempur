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
- ✅ **Snap/pembayaran tidak lagi dimuat di semua halaman TKA (2026-09-16):** `app/tka/layout.tsx` dulu memuat skrip Midtrans Snap (beserta iframe popup pihak ketiga) di dashboard, sesi ujian, dan halaman hasil. Kini hanya `/tka/[level]/pass` yang memuatnya, dan URL sandbox yang di-hardcode sudah diganti `env.midtransSnapScriptUrl()`. Gate monetisasi TKA tetap bekerja: Full Tryout tanpa pass menampilkan "Butuh Tempur Pass".
- ⚠️ **Gap scope CPNS (temuan 2026-09-16):** flow "ulang soal salah"/remedial **tidak ada** untuk CPNS — hanya diimplementasikan untuk TKA SMP (`tka-remedial.ts`, `tka-wrong-questions.ts`; tidak dipakai di `app/cpns`). Halaman hasil CPNS hanya menyediakan "Latihan fokus", "Lihat semua hasil", dan pembahasan inline. Konsisten dengan `docs/FEATURE_STATUS_CHECKLIST.md` dan `docs/PRODUCTION_V1_SCOPE.md` (remedial CPNS di luar Production V1) → butuh keputusan produk, bukan bug.
- ⚠️ **Kesiapan konten CPNS (temuan 2026-09-16):** ini **gap publish, bukan gap konten**. Published: TWK 60, TIU **35**, TKP **45** (section butuh TWK 30, TIU 35, TKP 45 → **headroom TIU & TKP nol**). Draft tersedia: TWK **207**, TIU **113**, TKP **113**, semuanya sudah punya opsi + pembahasan tetapi **belum pernah direview** (kebijakan Production V1: soal unreviewed tidak boleh dipublikasikan otomatis). 6 dari 9 materi Latihan Fokus belum bisa dimulai (<30 soal). **Keputusan produk diperlukan:** terima headroom nol untuk acceptance pass pertama, atau jalankan review/publish atas draft yang ada.
- ✅ **Backfill snapshot versi CPNS (2026-09-16, staging + produksi):** 30 soal TWK `published` tidak punya baris `question_versions` sehingga kapasitas TWK ter-under-report (30 dari 60). Migration idempoten `20260823085200_cpns_skd_legacy_question_versions_v1.sql` dijalankan ulang di **staging** dan (dengan GO) di **produksi** → TWK 60/60 di keduanya; total `question_versions` produksi 552 → 582 (+30 tepat), jumlah soal tidak berubah.
- ✅ **Keputusan konten CPNS (2026-09-16): Opsi A** — headroom nol (TIU 35/35, TKP 45/45) diterima untuk acceptance pass pertama. Menambah kapasitas = menjalankan review/publish atas 433 draft yang sudah punya opsi+pembahasan (kerja konten-ops), bukan authoring; dilakukan sebelum ujian nyata bila diperlukan.
- ✅ **Env Upstash (2026-09-16):** kredensial valid (PING → PONG, INCR berhasil) dan **terverifikasi aktif di Vercel Production** — `/api/health` pada deployment `589b824` mengembalikan `rateLimitStore: "redis"` dengan `status: "ok"`. Rate limit kini lintas instance di produksi. Scope **Preview/staging belum terverifikasi** (belum ada deployment Preview untuk diuji); periksa centang scope Preview di Vercel atau jalankan gerbang staging E2E.
- ✅ **Flow CPNS terverifikasi end-to-end di browser (2026-09-16):** drill, mini tryout, dan full tryout (110 soal) — mulai → jawab → kumpulkan → halaman hasil dengan skor & pembahasan (full tryout termasuk breakdown TWK/TIU/TKP); 0 critical console error. **TKA SMP** juga: Mini Tryout → submit → hasil. RLS lintas-user diverifikasi (browser + database).
- ✅ **`/admin/assessment/exams` diperbaiki (2026-09-16):** halaman gagal render (jatuh ke error boundary) untuk admin mana pun karena URL PostgREST mencapai 22.594 karakter → `HeadersOverflowError (UND_ERR_HEADERS_OVERFLOW)`. Filter `.in()` besar kini di-batch lewat `lib/supabase-batch.ts`. Seluruh **9 route `/admin`** kini merender normal.
- ✅ **Validasi zod server-side di auth action (2026-09-16)** — `login`, `signup`, `forgotPassword`, `resetPassword`, `resendVerificationEmail`, `updatePassword`; cast `FormData` yang bisa bernilai `null` juga dihapus. Test: `tests/unit/auth-validation-contract.test.ts`.
- ✅ **Rate limit aplikasi di auth action (2026-09-16)** — `login` 10/5 menit per IP; `signup` 5/15 menit per IP; `forgotPassword` & `resendVerificationEmail` 10/15 menit per IP **dan** 3/15 menit per email (email di-hash, tidak disimpan mentah). Memakai `checkRateLimit` yang sudah ada (Upstash Redis, fallback in-memory, fail-open saat Redis mati). Test: `tests/unit/auth-rate-limit.test.ts`.
- ⚠️ **Aksi di luar kode:** set `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` di Vercel (staging & produksi). Tanpa itu limiter jatuh ke in-memory yang **per-instance** dan mudah ditembus di serverless.
- ✅ **Urutan header IP terverifikasi di produksi (2026-09-16):** `/api/health` kini melaporkan `clientIpSource` (nama header, bukan IP). Diuji dengan mengirim header palsu — `x-real-ip` palsu, `x-forwarded-for` palsu, bahkan `x-vercel-forwarded-for` palsu — sumbernya **tetap** `x-vercel-forwarded-for`, jadi header kiriman client tidak pernah menang. Catatan cakupan: yang terbukti adalah **prioritas nama header** di kode kita; jaminan bahwa Vercel menimpa *nilai* `x-vercel-forwarded-for` adalah kontrak platform Vercel, bukan sesuatu yang bisa dibuktikan dari repo ini. Rate limit Supabase Auth tetap jaring pengaman otoritatif.
- [ ] Belum ada regression test untuk replay webhook secara end-to-end (unit webhook sudah ada).

---

## 7. Gate membuka domain publik

Domain tidak boleh diaktifkan sebelum **semua** ini hijau:

- [x] P0-1 & P0-2 ditutup **dan diverifikasi di staging** (2026-09-16).
- [x] P0-1 & P0-2 ditutup **dan diverifikasi di produksi** (2026-09-16).
- [x] Status produksi diverifikasi (fungsi, grant, policy, feature flag) — 2026-09-16.
- [x] **Admin produksi ditetapkan** — `SUPER_ADMIN` untuk `halimdirga8@gmail.com` (2026-09-16).
- [x] **Keputusan flag monetisasi TKA SMP** — diputuskan tetap **ON** (2026-09-16).
- [x] CI `main` hijau di GitHub (2026-09-16) — 35 commit di-push, seluruh job lolos.
- [x] Riwayat migrasi remote disamakan (baseline 2026-09-16, staging & produksi).
- [ ] Regression test kebocoran kunci jawaban berjalan di CI.
- [x] Enforcement timer ujian server-side (2026-09-16).
- [x] Critical user journey diverifikasi di browser: publik (30 test) + ber-auth (30 test: login → onboarding → dashboard, seluruh route CPNS/TKA).
- [ ] Rate limit efektif lintas instance: env Upstash terpasang di staging & produksi.
- [x] Verifikasi header IP tepercaya di deployment nyata (2026-09-16) — header palsu tidak menang.
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
| Typecheck / Unit / Build | ✅ hijau (234 unit test, 47 file) |
| E2E publik (`chromium-public`) | ✅ 30/30 lolos (termasuk cek console browser) |
| E2E ber-auth (`chromium-authenticated`) | ✅ **62/62 lolos** (2026-09-17, dijalankan lokal di build terkini): login → onboarding → dashboard, 27 route CPNS/TKA sehat + 2 redirect sengaja, dan **32 cek overflow** (16 permukaan inti × mobile 390×844 & tablet 1024×768) tanpa critical console error |
| Gate staging lokal (pengganti GitHub Actions) | ✅ `node scripts/local-gates/run-gate.mjs tka\|cpns\|admin` atau `scripts/local-gates/docker-run.sh` — emulator Edge Function + service-role staging, tanpa OIDC. **Hasil `5646eda`: TKA 16/16, CPNS 4/4, Admin exit 0 (5 passed + 2 flaky)**. Detail: `docs/LOCAL_STAGING_GATES.md` |
| E2E staging ber-kredensial lain (TKA, content review, admin, CPNS) | dijalankan lewat workflow khusus berbasis GitHub OIDC. **Hasil Round 8:** CPNS Staging E2E ✅, Admin Workspace Staging E2E ✅ (keduanya di deployment Vercel **Preview** ber-env staging), TKA SMP Staging E2E diperbaiki bertahap (detail di `docs/agent-progress.md`) |
| CI | **hijau di GitHub** (`22057ac`, `34bb466`): CI **success** (lint, typecheck, unit, security audit, build, E2E) dan Schema V2 CI **success**; deployment produksi Vercel sukses (domain tetap ditahan) |
| **Riwayat migrasi remote** | ✅ **disamakan 2026-09-16** (staging & produksi → 155 baris = tepat daftar file repo). `supabase db push` kembali normal: *"Remote database is up to date."* Arsip sebelum baseline: `supabase/migration-history-archive/` |
| CSP | satu sumber: nonce + `strict-dynamic` di `proxy.ts` (CSP statis di `next.config.ts` sudah dihapus) |
| RLS lintas-user | ✅ diverifikasi 2026-09-16 di browser **dan** database (user lain → 0 baris; `attempt_questions`/`attempt_answers` tanpa SELECT untuk `authenticated`) |
| Feature flag | `tka.smp.monetization_enforcement` — **ON (100%, enforced)** di produksi (keputusan pengguna) |
| Konfirmasi sesi ujian | ✅ seragam: CPNS & seluruh klien TKA memakai modal (`components/ui/Modal` + `components/tka/TkaSectionConfirmModal.tsx`); tidak ada `window.confirm()` di alur ujian |
| Progres posisi soal TKA | ✅ dipersistensi per attempt+bagian (`lib/session-progress.ts`) — tidak lagi terlempar ke soal 1 saat jawaban tersimpan |
| Audit dead link internal | ✅ 90 route vs 75 target (`href` + `router.push`/`replace` + `redirect`) — **0 target tanpa route/aset**, termasuk aset `public/` |
| Higiene kode | ✅ 0 `TODO`/`FIXME`/`HACK`, 0 `console.log`/`debugger`, 0 mock/dummy pada `app/`, `components/`, `src/`, `lib/` |
| RLS (audit katalog + fungsional, staging 2026-09-17) | ✅ **semua tabel `public` ber-RLS**; `authenticated` tanpa SELECT di `attempt_questions`/`attempt_answers`/`question_versions`; `user_roles` tanpa policy (deny-all non-service); uji lintas-user: attempt/profil/wallet milik orang lain → **0 baris**, `attempt_answers` → *permission denied* |

### Perbaikan P1 2026-09-16 (Round 8)

**Posisi soal TKA terlempar ke soal 1 setiap jawaban tersimpan.** Server Action simpan jawaban membuat
Next.js me-render ulang RSC tree; prop `state.questions` datang dengan identitas baru sehingga
`useEffect` sinkronisasi di `TkaDiagnosticSessionClient` menjalankan `setCurrentIndex(0)`.
Terbukti di browser: pada Soal 12/12, satu klik opsi jawaban → 700 ms kemudian posisi menjadi
**Soal 1 dari 12**. Diperbaiki dengan mempersistensi posisi per attempt+bagian (pola yang sudah dipakai
`TkaFullExamSessionClient`) lewat helper bersama `lib/session-progress.ts`.
Regression test: `tests/unit/session-progress.test.ts`, `tests/unit/tka-section-confirm-contract.test.ts`.

**Halaman hasil TKA bisa terputus di tengah stream.** `gamificationService.getAttemptReward` dipanggil
tanpa penanganan error; lookup itu memakai klien privileged sedangkan workflow E2E staging sengaja
tidak memegang service role asli. Akibatnya render terputus dan panel "Fokus belajar berikutnya" tidak
pernah sampai ke browser (hanya sebagian halaman yang terlihat). Dibuktikan lokal dengan env identik CI:
`/result?completed=1` → panel 0; `/result` (lookup dilewati) → panel 1.
Kini lookup dibungkus `try/catch` + `logger.warn` seperti lookup opsional lain di halaman itu, sehingga
gangguan modul gamifikasi tidak lagi merusak halaman hasil ujian.

### Bug terbuka (ditemukan 2026-09-17)

**P1 — Event Tryout Akbar menunjuk tabel warisan `tryout_events`.** Tabel itu tidak ada di Schema V2
(staging hanya punya `public.events` dan `public.attempt_events`), dan bentuk `public.events` tidak
memuat field yang dipakai kode (`start_grace_minutes`, `duration_minutes`, `max_participants`,
`requires_code`, `is_paid`, `price`, `documentation_url`, `updated_at`). Dampak: CRUD event di admin
gagal, section event di landing `/cpns` kosong, cron auto-close hanya menghasilkan warning.
Perbaikan menyentuh skema → butuh keputusan (migrasi `events` atau tulis ulang fitur terhadap `events` V2).

### Blocker eksternal — GitHub Actions (2026-09-17)

Seluruh workflow GitHub Actions berhenti berjalan dengan anotasi resmi:

> "The job was not started because recent account payments have failed or your spending limit
> needs to be increased. Please check the 'Billing & plans' section in your settings"

- Dampak: CI, Schema V2 CI, dan gate staging TKA/CPNS/Admin tidak bisa dijalankan sampai billing
  GitHub diperbaiki. Job berhenti < 10 detik tanpa satu pun step berjalan (`steps: 0`).
- Status terakhir sebelum blokir: **CI + Schema V2 CI success** dan **CPNS + Admin Workspace
  Staging E2E success** pada commit `32767f7`; gate TKA terakhir hijau 16/16 pada `746484a`.
- Bukan bug kode dan bukan flake test — perlu tindakan pemilik akun di GitHub Billing.

### Design system Round 9 (2026-09-17)

Konsistensi UI disatukan di atas brand sheet resmi (`#0D2B45` ink · `#1976D2` blue · `#F9A825` amber ·
`#FDDCCA` peach · `#FFFFFF`), tipografi **Poppins**, dan maskot **Tama & Tara**.

| Area | Kondisi |
|---|---|
| Token warna | ✅ satu lapisan di `app/globals.css`: primitif brand + skala 50–950 (oklch, tangga lightness sama dengan Tailwind) + pemetaan palet Tailwind → brand di `@theme` (gray/slate→ink, blue/indigo/violet/purple/sky/cyan/teal/fuchsia→brand blue, amber/yellow/orange→brand amber, pink→peach, green=emerald, rose=red) |
| Spacing | ✅ 6.232 pemakaian hanya memakai skala Tailwind/doc (gap-2/3, px-4, p-4/5/6, mt-1/4, py-3); hanya **4 nilai arbitrer** (2 di antaranya `env(safe-area-inset-bottom)` yang memang diperlukan) |
| Shadow & radius | ✅ token terpusat: `.st-shadow-sm/md/lg` = 3/5/8px `var(--brand-ink)` (global, termasuk admin) dan skala `rounded-st-sm…2xl` (12/16/20/24/32px); **297 shadow arbitrer** (6 offset + hex warisan) dihapus |
| Warna arbitrer | ✅ 0 sisa: 10 varian off-white (`#fdfbf7`, `#fbfaf7`, …) → `var(--brand-paper)`; `#fff9c4`/`#fffdeb` → `var(--brand-amber-100)`; `#08172f` → `var(--brand-ink-950)`; shadow indigo → tint brand blue |
| Tone kategori | ✅ terpusat (doc §6.2): blue = diagnostik/aksi, amber = mini tryout/premium, peach = drill, ink = full tryout/event, emerald = selesai, red = gagal |
| Tipografi | ✅ **terverifikasi di browser**: 16 face Poppins loaded, `fonts.check('16px Poppins')` = true, computed body/h1 = `Poppins` (bug resolusi var `:root` ditemukan & diperbaiki — lihat design doc §3.1.1); Poppins (400–800) untuk display + body; Patrick Hand hanya aksen (`--font-script`); 47 file `font-handwriting` → `font-display` |
| Maskot | ✅ `components/brand/Mascot.tsx` (`<Mascot>` + `<MascotPair>`) dengan aturan per mode; terpasang di landing, login, 404, dashboard CPNS, empty state riwayat, hasil TKA & CPNS; **exam mode bebas maskot** |
| Dokumentasi | ✅ `docs/PRODUCT_DESIGN_SYSTEM_V1_1.md` §6.0–6.2 (token konkret, tipografi, aturan maskot, peta tone) |
| Fun & friendly (2026-09-17) | ✅ primitif playful `components/brand/playful.tsx` (`Sticker`, `WashiTape`, `Doodle`, `MascotBubble`) + `.animate-bob`/`.hover-wiggle`; diterapkan di landing (sticker, squiggle, bintang, gelembung Tama+Tara, maskot footer & CTA), login/register, dashboard CPNS & TKA, 404, dan error boundary. **Exam mode tetap tanpa ornamen**. Skala playfulness per mode: design doc §2.4–2.5 |

Verifikasi: E2E publik 30/30 · E2E ber-auth 62/62 (32 cek overflow mobile+tablet) · lint 0/0 ·
typecheck · 234 unit test · build hijau · screenshot landing/login/404/dashboard/riwayat/sesi ujian/hasil
di mobile & desktop (0 overflow, 0 page error).

### Temuan operasional Round 8

- **Gate CPNS/Admin butuh deployment Preview, bukan Production.** Push ke `main` membuat deployment
  Production yang memakai Supabase **produksi**, sehingga user staging disposabel ditolak
  (`Email atau password salah`). Solusi: PR → Vercel membuat deployment **Preview** ber-env staging;
  resolver `scripts/resolve_vercel_preview.mjs` memverifikasi `deploymentCommitSha === expectedSha`.
- **Upstash juga aktif di scope Preview** — `/api/health` pada deployment Preview mengembalikan
  `rateLimitStore: "redis"` dengan `deploymentEnvironment: "preview"` (item terbuka ini tertutup).
- **Gate TKA kini hermetis:** flag `tka.smp.monetization_enforcement` adalah state global staging;
  workflow me-resetnya ke OFF **sebelum** E2E agar sisa run gagal tidak meracuni run berikutnya.
- **Hygiene staging:** 17 user CI tertinggal (`ci-*`, sejak 2026-09-01) dan seluruh user disposabel
  `dsh-*` sudah dihapus; sisa 0.
- `content-review-staging-e2e.yml` belum bisa dijalankan: runner self-hosted macOS ARM64 (`192`) offline.

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

## Kebijakan monetisasi CPNS + TKA pada satu akun (2026-09-17)

**Keputusan produk (dipilih pemilik produk):** token **dipisah per program**, langganan **per program +
jenjang**, plus **bundle lintas jenjang TKA**; pass CPNS **diaktifkan**.

### Aturan yang berlaku

| Aspek | Aturan |
|---|---|
| Identitas | Satu akun untuk semua program; hak akses diikat ke program (+jenjang), bukan ke akun |
| Token | Saldo terpisah per program: `exam_token_cpns` dan `exam_token_tka` (`programs.token_wallet_type`) |
| Konsumsi | Pass/entitlement diperiksa lebih dulu → kalau tidak ada pass dan `token_cost > 0`, token dipotong → kalau token habis, tawarkan paket |
| Langganan | `CPNS_PASS_30/90` (ACTIVE, Rp39.000/Rp89.000) dan `TKA_{SD,SMP,SMA}_PASS_30/90` |
| Bundle | `TKA_PASS_ALL_30/90` (DRAFT, meng-grant 30 fitur TKA SD+SMP+SMA; harga DRAFT Rp79.000/Rp179.000) — diaktifkan setelah konten SD/SMA live |
| Fulfillment | `fulfill_paid_order` sudah membaca `wallet_type` dari `product_wallet_grants`, jadi kredit otomatis masuk ke wallet program yang benar |

### Perubahan yang diterapkan

- **Migrasi staging** (belum produksi):
  - `20260917090000_program_token_wallets_v1.sql` — `programs.token_wallet_type`, pemindahan saldo
    lama `exam_token` → `exam_token_cpns`, dan RPC `debit_exam_token_once` menjadi program-aware
    (tipe wallet diturunkan dari program exam; semantik lama dipertahankan: idempotensi per attempt,
    `token_cost = 0`, pesan error lama).
  - `20260917094500_monetization_policy_cpns_tka_v1.sql` — grant token CPNS → `exam_token_cpns`,
    pass CPNS ACTIVE + harga, exam CPNS tersambung ke fitur pass (`cpns.full_tryout.regular`,
    `cpns.mini_tryout.unlimited`, `cpns.drill.unlimited`), dan bundle TKA lintas jenjang (DRAFT).
- **Kode**:
  - `src/services/tempur-pass.service.ts` — helper scope-aware (`PassScope`, `hasActivePass`,
    `getActivePassScopes`, `passScopeForTkaLevel`). **Bug lama diperbaiki:** `hasActiveTempurPass()`
    selalu memeriksa fitur TKA SMP sehingga pass TKA SD/SMA dan pass CPNS tidak terdeteksi benar;
    kini setiap call site memakai scope eksplisit (dashboard CPNS → `cpns`, shell TKA → jenjang aktif,
    shell admin → "ada pass mana pun").
  - `src/services/exam-attempt.service.ts` — urutan akses menjadi **pass dulu, token sebagai
    fallback**: `required_feature_id` tanpa token tetap wajib pass (perilaku TKA), sedangkan exam
    ber-token boleh lanjut tanpa pass dan tokennya dipotong; pemegang pass **tidak** dipotong token
    (termasuk saat melanjutkan attempt yang sudah ada).
  - `src/services/wallet.service.ts` + `src/repositories/wallet.repository.ts` — saldo per program
    (`getBalanceForProgram`, `getTokenWalletTypeForProgram`).
  - `src/services/commerce.service.ts` + `src/services/admin-v2.service.ts` — tidak lagi hardcode
    `wallet_type = 'exam_token'`; grant token mengikuti program produk.
  - `components/profile/AccountProfilePage.tsx` — halaman profil membaca wallet sesuai konteks
    (CPNS vs TKA).
  - `scripts/local-gates/ci-helper.mjs` — emulator gate memberi saldo `exam_token_cpns`.

### Aktivasi jenjang SD & SMA (2026-09-17, lanjutan)

Pemilik produk memutuskan **langsung mengaktifkan TKA SD & SMA**:

- Produk: `TKA_SMA_PASS_30/90` → ACTIVE + harga Rp29.000/Rp69.000; bundle `TKA_PASS_ALL_30/90`
  → ACTIVE + harga Rp79.000/Rp179.000 (SD sudah ACTIVE sebelumnya).
- Aplikasi: `TKA_AVAILABLE_LEVELS` kini `['SD','SMP','SMA']` dan **16 guard hardcode `SMP`**
  diganti pengecekan `isTkaLevelAvailable(level)` (halaman pass, mini tryout, tryout, diagnostik,
  remedial, fokus, soal salah, riwayat, progress, sesi tryout, beli-token) sehingga SD & SMA
  memakai dashboard, latihan, dan halaman pass yang sama seperti SMP.
- Landing `/tka` kini menampilkan ketiga jenjang sebagai aktif (`Buka jenjang`), bukan "Segera hadir".
- Spec diperbarui mengikuti kebijakan baru: `tests/e2e/specs/1-public.spec.ts` (tidak ada lagi
  "Segera hadir"/"Belum tersedia") dan `tests/e2e/specs/8-tka-smp-mini.spec.ts` (anonim di `/tka/sd`
  dan `/tka/sma` diarahkan ke login), plus `tests/unit/tka-navigation.test.tsx`.

**Risiko yang masih terbuka:** track **SMA belum punya exam (0)** sehingga pembeli pass SMA baru
mendapat dashboard kosong (empty state jujur: "0 soal tersedia" + ajakan aktivasi jalur). Track SD
punya 6 exam. Sebelum production GO, konten SMA harus diisi atau produk SMA dikembalikan ke DRAFT.

### Sisa pekerjaan (belum dikerjakan)
- Belum ada produk token TKA (`TKA_TOKEN_*`) karena exam TKA `token_cost = 0`; wallet TKA sudah siap.
- Tampilan **dua saldo sekaligus** di satu layar (CPNS + TKA) belum dibuat; saat ini saldo mengikuti
  konteks halaman. Kandidat untuk halaman "Langganan & Token" tingkat akun.
- Produksi belum disentuh: migrasi hanya di staging, monetisasi produksi tetap menunggu Milestone 5.

## Audit UI/UX menyeluruh (2026-09-17)

Audit dijalankan dengan harness otomatis: 122 pemuatan halaman (20 rute publik × 3 viewport +
32 rute ber-autentikasi × 2 viewport, peran TKA/CPNS/Admin) yang memeriksa status HTTP, error
console, pelanggaran CSP, overflow horizontal, jumlah `<h1>`/landmark, tautan login yang bocor ke
pengguna login, nama tautan duplikat, dan target sentuh kecil.

**Diperbaiki (P1/P2):**

| Temuan | Dampak | Perbaikan |
|---|---|---|
| Pelanggaran CSP di `/syarat-ketentuan`, `/kebijakan-privasi`, `/kebijakan-pengembalian`, `/forgot-password`, `/auth/reset-password`, halaman 404 | Halaman statis memakai nonce hasil build, sehingga script diblokir CSP (hidrasi/interaksi rusak) | Semua halaman yang butuh script kini `force-dynamic`; rute statis tersisa hanya manifest/robots/sitemap |
| CSP `upgrade-insecure-requests` saat `next start` lokal | Browser meng-upgrade request http lokal ke https → `ERR_SSL_PROTOCOL_ERROR` di dev/E2E | Flag hanya dipasang untuk host non-loopback |
| Sidebar TKA muncul/hilang tidak konsisten saat pindah jenjang (SMP ↔ SD/SMA) | Permukaan marketing & aplikasi memakai segmen layout `/tka` yang sama, sehingga navigasi client-side memakai ulang layout yang sudah ter-mount → chrome salah | Tautan antar-permukaan memakai navigasi dokumen penuh lewat `components/tka/TkaSurfaceLink.tsx` (switcher jenjang, logo shell, CTA landing, kartu jenjang, tautan coming soon). Navigasi di dalam permukaan yang sama tetap `next/link` |
| Sesi tryout CPNS dirender di dalam sidebar | Soal tampil di kerangka dashboard, padahal layout sesi menyatakan "full-screen tanpa sidebar" | Layout dashboard melewati shell untuk `/cpns/dashboard/tryout/<sessionId>` (pola `x-pathname`, sama seperti perbaikan chrome TKA) |
| Dua landmark `<main>` di `/cpns/dashboard/pilih-jalur` | Struktur landmark ganda, membingungkan screen reader | `<main>` halaman → `<div>` (shell sudah menyediakan `<main>`) |
| Halaman legal tanpa landmark `<main>` | Navigasi screen reader tidak menemukan konten utama | Layout `(legal)` memakai `<main>` |
| Skrip Vercel Analytics dimuat di lokal | 404 + error MIME di console setiap halaman, mengotori audit/E2E | Dimuat hanya saat `VERCEL === '1'` |
| Tiga tautan "Buka peta Drill" bertujuan berbeda dengan nama sama di `/cpns` | Pelanggaran WCAG 2.4.4 (tujuan tautan tidak dapat dibedakan) | Diberi `aria-label` per mata pelajaran (TWK/TIU/TKP) |

**Tidak diubah (sengaja):**

- **Pelanggaran CSP di `/cpns/dashboard/*` dan `/tka/smp/profile`** berasal dari **iframe pihak ketiga
  Midtrans Snap**, bukan kode kita: listener `securitypolicyviolation` milik halaman mencatat 0
  pelanggaran, sedangkan console meneruskan pesan dari frame Snap. CSP kita sudah mengizinkan
  `app.midtrans.com` + nonce.
- **Nama tautan duplikat** mayoritas berasal dari chrome responsif (sidebar desktop + bottom nav
  mobile) yang salah satunya `display:none`, sehingga tidak ada di accessibility tree.
- `/admin/product` bukan rute yang ada — itu kesalahan daftar rute di harness, bukan tautan mati.
- Sisa P3: tabel admin memakai banyak tautan "Edit" per baris (lazim, konteks dari baris) dan
  `skdMap`/kartu fitur punya label berulang yang sudah diberi `aria-label`.

